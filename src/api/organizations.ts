import express from 'express';
import { Request, Response } from 'express';
import { readJSONFile, writeJSONFile } from '../utils/fileUtils';
import { Organization } from '../interfaces/interfaceOrganization';

const router = express.Router();
const filePath = 'organizations.json';

// get all information from organizations
router.get('/api/organizations', async (req: Request, res: Response) => {
  const organizations = await readJSONFile(filePath);
  res.send(organizations);
});

// get organization by ID
router.get('/api/organizations/:id', async (req: Request, res: Response) => {
  const organizations = await readJSONFile(filePath);
  const organization = organizations.find((o: Organization) => o.id === req.params.id);
  res.send(organization);
});

// create new organization
router.post('/api/organizations', async (req: Request, res: Response) => {
  const organizations = await readJSONFile(filePath);
  const newOrganization: Organization = req.body;
  organizations.push(newOrganization);
  await writeJSONFile(filePath, organizations);
  res.status(201).send(newOrganization);
});

// update organization
router.patch('/api/organizations/:id', async (req: Request, res: Response) => {
  let organizations = await readJSONFile(filePath);
  const organization = organizations.find((o: Organization) => o.id === req.params.id);
  if (!organization) return res.status(404).send('ojoj not found sorryyyyy');

  Object.assign(organization, req.body);
  await writeJSONFile(filePath, organizations);
  res.send(organization);
});

// delete organization
router.delete('/api/organizations/:id', async (req: Request, res: Response) => {
  let organizations = await readJSONFile(filePath);
  organizations = organizations.filter((o: Organization) => o.id !== req.params.id);
  await writeJSONFile(filePath, organizations);
  res.status(204).send();
});
