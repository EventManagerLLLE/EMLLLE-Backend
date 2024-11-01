import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readJSONFile, writeJSONFile } from '../utils/fileUtils';
import { authenticateToken } from '../app';
import { Organization, organizationSchema } from '../schemas/organisationSchema';
import { User } from '../schemas/userSchema';
import { decode, JwtPayload } from 'jsonwebtoken';

const router = express.Router();
const filePath = 'database/organizations.json';

// Get all organizations
router.get('', async (req: Request, res: Response) => {
  const organizations = await readJSONFile(filePath);
  res.send(organizations);
});

// Get organization by ID
router.get(':id', async (req: Request, res: Response) => {
  const organizations = await readJSONFile(filePath);
  const organization = organizations.find((o: Organization) => o.id === req.params.id);
  if (!organization) return res.status(404).send('Organization not found');
  res.send(organization);
});

// Create new organization (protected)
router.post('', authenticateToken, async (req: Request, res: Response) => {
  const organizationReq = organizationSchema.parse(req.body);
  const token = req.header('Authorization')!.split(' ')[1];
  const user = decode(token) as JwtPayload;
  const organizations = await readJSONFile(filePath);
  const newOrganization: Organization = { id: uuidv4(), ...organizationReq, userId: user.id };

  // Validate the new organization data
  const parsedOrganization = organizationSchema.safeParse(newOrganization);
  if (!parsedOrganization.success) {
    return res.status(400).send(parsedOrganization.error.errors);
  }

  organizations.push(parsedOrganization.data);
  await writeJSONFile(filePath, organizations);
  res.status(201).send(parsedOrganization.data);
});

// Update organization (protected)
router.patch(':id', authenticateToken, async (req: Request, res: Response) => {
  const token = req.header('Authorization')!.split(' ')[1];
  const user = decode(token) as JwtPayload;
  let organizations = await readJSONFile(filePath);
  const organizationIndex = organizations.findIndex(
    (o: Organization) => o.id === req.params.id && o.userId === user.id
  );
  if (!organizationIndex || organizationIndex === -1) return res.status(404).send('Organization not found');

  organizations[organizationIndex].name = req.body.name;

  await writeJSONFile(filePath, organizations);
  res.send(organizations[organizationIndex]);
});

// Delete organization (protected)
router.delete(':id', authenticateToken, async (req: Request, res: Response) => {
  let organizations = await readJSONFile(filePath);
  organizations = organizations.filter((o: Organization) => o.id !== req.params.id);
  await writeJSONFile(filePath, organizations);
  res.status(204).send();
});

export default router;
