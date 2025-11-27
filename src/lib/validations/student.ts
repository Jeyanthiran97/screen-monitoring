import { z } from 'zod';

export const joinSessionSchema = z.object({
  studentName: z.string()
    .min(2, { message: 'Name must be at least 2 characters' })
    .max(50, { message: 'Name must be less than 50 characters' }),
});

export type JoinSessionInput = z.infer<typeof joinSessionSchema>;

