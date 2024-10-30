import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readJSONFile, writeJSONFile } from '../utils/fileUtils';
import { Event } from '../interfaces/eventsInterface';

const router = express.Router();
const filePath = 'events.json';

router.get('/api/events', async (req: Request, res: Response) => {
  const events: Event[] = await readJSONFile(filePath);
  res.send(events);
});
router.get('/api/events/:id', async (req: Request, res: Response) => {
  const events: Event[] = await readJSONFile(filePath);
  const event = events.find((e: Event) => e.id === req.params.id);
  if (!event) return res.status(404).send('Event not found');
  res.send(event);
});
router.post('/api/events', async (req: Request, res: Response) => {
  const events: Event[] = await readJSONFile(filePath);
  const newEvent: Event = { id: uuidv4(), ...req.body };
  events.push(newEvent);
  await writeJSONFile(filePath, events);
  res.status(201).send(newEvent);
});
router.patch('/api/events:id', async (req: Request, res: Response) => {
  let events: Event[] = await readJSONFile(filePath);
  const event = events.find((e: Event) => e.id === req.params.id);
  if (!event) return res.status(404).send('Event not found');
  Object.assign(event, req.body);
  await writeJSONFile(filePath, events);
  res.send(event);
});

router.delete('/api/events/:id', async (req: Request, res: Response) => {
  let events: Event[] = await readJSONFile(filePath);
  events = events.filter((e: Event) => e.id !== req.params.id);
  await writeJSONFile(filePath, events);
  res.status(204).send();
});
export default router;
