import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readJSONFile, writeJSONFile } from '../utils/fileUtils';
import { userSchema, User } from '../schemas/userSchema';

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

// search user by username
router.get('/api/users/search/:username', async (req: Request, res: Response) => {
  const users: User[] = await readJSONFile(filePath);
  const user = users.find((u) => u.username === req.params.username);
  if (!user) return res.status(404).send('User not found');
  res.send(user);
});

// creates new user
router.post('/api/users', async (req: Request, res: Response) => {
  const users: User[] = await readJSONFile(filePath);
  const newUser: User = { id: uuidv4(), ...req.body };

  // Validate the new user data
  const parsedUser = userSchema.safeParse(newUser);
  if (!parsedUser.success) {
    return res.status(400).send(parsedUser.error.errors);
  }

  users.push(parsedUser.data);
  await writeJSONFile(filePath, users);
  res.status(201).send(parsedUser.data);
});

// replaces user by ID
router.put('/api/users/:id', async (req: Request, res: Response) => {
  let users: User[] = await readJSONFile(filePath);
  const userIndex = users.findIndex((u) => u.id === req.params.id);
  if (userIndex === -1) return res.status(404).send('User not found');

  const updatedUser: User = { id: req.params.id, ...req.body };

  // Validate the updated user data
  const parsedUser = userSchema.safeParse(updatedUser);
  if (!parsedUser.success) {
    return res.status(400).send(parsedUser.error.errors);
  }

  users[userIndex] = parsedUser.data;
  await writeJSONFile(filePath, users);
  res.send(parsedUser.data);
});

// updates specific field of a user with specific ID
router.patch('/api/users/:id', async (req: Request, res: Response) => {
  let users: User[] = await readJSONFile(filePath);
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).send('User not found');

  const updatedUser = { ...user, ...req.body };

  // Validate the updated user data
  const parsedUser = userSchema.safeParse(updatedUser);
  if (!parsedUser.success) {
    return res.status(400).send(parsedUser.error.errors);
  }

  Object.assign(user, parsedUser.data);
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
