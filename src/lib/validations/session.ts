import { z } from 'zod';

export const createSessionSchema = z.object({
  modeType: z.enum(['internet', 'lan'], {
    required_error: 'Please select a connection mode',
  }),
  shareType: z.enum(['full-screen', 'partial'], {
    required_error: 'Please select a screen sharing mode',
  }),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;

