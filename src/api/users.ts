import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readJSONFile, writeJSONFile } from '../utils/fileUtils';
import { User } from '../interfaces/interfaceUser';

const router = express.Router();
const filePath = 'users.json';

// gets all users information
router.get('/api/users', async (req: Request, res: Response) => {
  const users: User[] = await readJSONFile(filePath);
  res.send(users);
});

// gets user by ID
router.get('/api/users/:id', async (req: Request, res: Response) => {
  const users: User[] = await readJSONFile(filePath);
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).send('User not found');
  res.send(user);
});

// creates new user
router.post('/api/users', async (req: Request, res: Response) => {
  const users: User[] = await readJSONFile(filePath);
  const newUser: User = { id: uuidv4(), ...req.body };
  users.push(newUser);
  await writeJSONFile(filePath, users);
  res.status(201).send(newUser);
});

// replaces user by ID
router.put('/api/users/:id', async (req: Request, res: Response) => {
  let users: User[] = await readJSONFile(filePath);
  const userIndex = users.findIndex((u) => u.id === req.params.id);
  if (userIndex === -1) return res.status(404).send('User not found');

  users[userIndex] = { id: req.params.id, ...req.body };
  await writeJSONFile(filePath, users);
  res.send(users[userIndex]);
});

// updates specific field of a user with specific ID
router.patch('/api/users/:id', async (req: Request, res: Response) => {
  let users: User[] = await readJSONFile(filePath);
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).send('User not found');

  Object.assign(user, req.body);
  await writeJSONFile(filePath, users);
  res.send(user);
});

// Delete user with specific ID
router.delete('/api/users/:id', async (req: Request, res: Response) => {
  let users: User[] = await readJSONFile(filePath);
  users = users.filter((u) => u.id !== req.params.id);
  await writeJSONFile(filePath, users);
  res.status(204).send();
});

export default router;
