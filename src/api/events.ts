import express, { Request, Response } from 'express';
import { decode, JwtPayload } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../app';
import { Organization } from '../interfaces/interfaceOrganization';
import {
  EditEvent,
  EditEventParticipant,
  editEventParticipantSchema,
  editEventSchema,
  Event,
  eventSchema,
  Participant,
} from '../schemas/eventSchema';
import { readJSONFile, writeJSONFile } from '../utils/fileUtils';

const router = express.Router();
const eventsFilePath = 'database/events.json';
const organizationsFilePath = 'database/organizations.json';

// Get all events
router.get('', async (req: Request, res: Response) => {
  const user = decodeToken(req);

  const events: Event[] = await readJSONFile(eventsFilePath);

  const filteredEvents = events.map((e: Event) => {
    if (user && e.organizerId === user.id) return e;

    if (
      // If there is no user signed in and event registration is req or req approval
      (!user && e.registrationOptions.isRegistrationRequired) ||
      (!user && e.registrationOptions.requiresApproval) ||
      (!user && e.isPublic === false)
    ) {
      return { ...e, organizationId: undefined, participants: undefined };
    }

    if (!e.isPublic && user) {
      const isParticipant = e.participants?.find((p) => p.id === user.id);
      if (e.registrationOptions.isRegistrationRequired && isParticipant) {
        if (
          (e.registrationOptions.requiresApproval && isParticipant.isApproved) ||
          e.registrationOptions.requiresApproval === false
        ) {
          return e;
        }
        return { ...e, participants: undefined };
      }
      return { ...e, organizationId: undefined, participants: undefined };
    }
    if (e.isPublic) return e;
  });

  res.send(filteredEvents);
});

// Get event by ID
router.get(':id', async (req: Request, res: Response) => {
  const events = await readJSONFile(eventsFilePath);
  const event = events.find((e: Event) => e.id === req.params.id);
  if (!event) return res.status(404).send('Event not found');
  res.send(event);
});

// Create new event (protected)
router.post('', authenticateToken, async (req: Request, res: Response) => {
  const eventReq = zodParser<Event>(eventSchema, req.body);
  if (!eventReq.success) {
    return res.status(400).send(eventReq.error!.errors);
  }

  const token = req.header('Authorization')!.split(' ')[1];
  const user = decode(token) as JwtPayload;
  const organizations = await readJSONFile(organizationsFilePath);
  const userOrganization = organizations.find((o: Organization) => o.userId === user.id);
  if (!userOrganization) return res.status(403).send('Access Denied: User does not have an organization');

  const events = await readJSONFile(eventsFilePath);
  const newEvent: Event = {
    id: uuidv4(),
    ...eventReq.data!,
    organizerId: user.id,
    organizationId: userOrganization.id,
  };

  // Validate the new event data
  const parsedEvent = eventSchema.safeParse(newEvent);
  if (!parsedEvent.success) {
    return res.status(400).send(parsedEvent.error.errors);
  }

  events.push(parsedEvent.data);
  await writeJSONFile(eventsFilePath, events);
  res.status(201).send(parsedEvent.data);
});

// Update event (protected)
router.patch(':id', authenticateToken, async (req: Request, res: Response) => {
  const user = decodeToken(req);
  const editEvent = zodParser<EditEvent>(editEventSchema, req.body);

  let events: Event[] = await readJSONFile(eventsFilePath);
  const eventIndex = events.findIndex((e: Event) => e.id === req.params.id && e.organizerId === user!.id);

  if (!eventIndex || eventIndex === -1) return res.status(404).send('Event not found');

  events[eventIndex] = { ...events[eventIndex], ...editEvent.data };

  await writeJSONFile(eventsFilePath, events);
  res.send(eventIndex);
});

// Always fetch all participants, and always send all participants
router.patch(':id/participants', authenticateToken, async (req: Request, res: Response) => {
  const user = decodeToken(req);
  const editEventParticipants = zodParser<EditEventParticipant>(editEventParticipantSchema, req.body);

  let events = await readJSONFile(eventsFilePath);
  const eventIndex = events.findIndex((e: Event) => e.id === req.params.id && e.organizerId === user!.id);
  if (!eventIndex || eventIndex === -1) return res.status(404).send('Event not found');

  events[eventIndex] = { ...events[eventIndex], ...editEventParticipants.data };

  await writeJSONFile(eventsFilePath, events);
  res.send(eventIndex);
});

// Delete event (protected)
router.delete(':id', authenticateToken, async (req: Request, res: Response) => {
  const user = decodeToken(req);

  let events: Event[] = await readJSONFile(eventsFilePath);
  const eventIndex = events.findIndex((e: Event) => e.id === req.params.id && e.organizerId === user!.id);
  if (eventIndex !== -1) {
    events.splice(eventIndex, 1); // Remove 1 item at eventIndex
    await writeJSONFile(eventsFilePath, events);
    res.status(204).send();
  } else {
    res.status(404).send('Event not found');
  }
});

// Create new event (protected)
router.post(':id/request-participation', authenticateToken, async (req: Request, res: Response) => {
  const user = decodeToken(req);
  const events: Event[] = await readJSONFile(eventsFilePath);

  const userData: User = await readJSONFile('database/users.json');
  const eventIdex = events.findIndex((e: Event) => e.id === req.params.id);

  if (eventIdex === -1) return res.status(404).send('Event not found');

  const participant: Participant = {
    id: userData!.id!,
    firstName: userData.firstName,
    lastName: userData.lastName,
    hasPaid: false,
    isApproved: false,
    registrationDate: new Date(),
  };

  events[eventIdex].participants
    ? events[eventIdex].participants.push(participant)
    : (events[eventIdex].participants = [participant]);

  // Validate the new event data

  const parsedEvent = eventSchema.safeParse(events[eventIdex]);
  if (!parsedEvent.success) {
    return res.status(400).send(parsedEvent.error.errors);
  }

  events.push(parsedEvent.data);
  await writeJSONFile(eventsFilePath, events);
  res.status(201).send(parsedEvent.data);
});

import { ZodError, ZodSchema } from 'zod';
import { User } from '../schemas/userSchema';

const zodParser = <T>(schema: ZodSchema<T>, payload: unknown): { success: boolean; data?: T; error?: ZodError<T> } => {
  try {
    const data = schema.parse(payload);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error };
    }
    throw error; // Re-throw unexpected errors
  }
};

const decodeToken = (req: Request): JwtPayload | undefined => {
  const token = req.header('Authorization')!.split(' ')[1];
  return decode(token) == null ? undefined : (decode(token) as JwtPayload);
};

export default router;