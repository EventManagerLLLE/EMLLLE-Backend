import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { readJSONFile, writeJSONFile } from '../utils/fileUtils';
import { userSchema, User } from '../schemas/userSchema';
import { authenticateToken } from '../app';

dotenv.config({ path: './src/.env' });
const router = express.Router();
const filePath = 'database/users.json';
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in the environment variables');
}

// Register a new user (public)
router.post('/register', async (req: Request, res: Response) => {
  const users: User[] = await readJSONFile(filePath);
  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  const newUser: User = { id: uuidv4(), ...req.body, password: hashedPassword };

  // Validate the new user data
  const parsedUser = userSchema.safeParse(newUser);
  if (!parsedUser.success) {
    return res.status(400).send(parsedUser.error.errors);
  }

  users.push(parsedUser.data);
  await writeJSONFile(filePath, users);
  res.status(201).send(parsedUser.data);
});

// Login a user (public)
router.post('/login', async (req: Request, res: Response) => {
  const users: User[] = await readJSONFile(filePath);
  const user = users.find((u) => u.username === req.body.username);
  if (!user) return res.status(404).send('User not found');

  const validPassword = await bcrypt.compare(req.body.password, user.password);
  if (!validPassword) return res.status(401).send('Invalid password');

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET as string, { expiresIn: '1h' });
  res.header('Authorization', `Bearer ${token}`);
  res.cookie('token', token, { httpOnly: true });
  res.json({ token });
});

// Get all users (protected)
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  const users: User[] = await readJSONFile(filePath);
  res.send(users);
});

// Get user by ID (protected)
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  const users: User[] = await readJSONFile(filePath);
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).send('User not found');
  res.send(user);
});

// Search user by username (protected)
router.get('/search/:username', authenticateToken, async (req: Request, res: Response) => {
  const users: User[] = await readJSONFile(filePath);
  const user = users.find((u) => u.username === req.params.username);
  if (!user) return res.status(404).send('User not found');
  res.send(user);
});

// Replace user by ID (protected)
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
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

// Update specific field of a user with specific ID (protected)
router.patch('/:id', authenticateToken, async (req: Request, res: Response) => {
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

// Delete user with specific ID (protected)
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  let users: User[] = await readJSONFile(filePath);
  users = users.filter((u) => u.id !== req.params.id);
  await writeJSONFile(filePath, users);
  res.status(204).send();
});

export default router;
