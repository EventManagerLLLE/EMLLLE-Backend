import { z } from 'zod';

export const userSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(3),
  firstName: z.string().min(3),
  lastName: z.string().min(3),
  hasPaidForEvent: z.boolean(),
});

export type User = z.infer<typeof userSchema>;
