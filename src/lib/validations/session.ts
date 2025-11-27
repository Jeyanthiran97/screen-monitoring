import { z } from 'zod';

export const createSessionSchema = z.object({
  modeType: z.enum(['internet', 'lan'], {
    message: 'Please select a connection mode',
  }),
  shareType: z.enum(['full-screen', 'partial'], {
    message: 'Please select a screen sharing mode',
  }),
  expirationType: z.enum(['no-expiration', 'date-duration', 'time-based'], {
    message: 'Please select an expiration type',
  }),
  expirationDate: z.string().optional(),
  expirationTime: z.number().min(1, 'Time must be at least 1 minute').optional(),
  deviceLimit: z.number().min(1, 'Device limit must be at least 1').optional(),
}).refine((data) => {
  // If date-duration, expirationDate is required
  if (data.expirationType === 'date-duration') {
    return !!data.expirationDate;
  }
  return true;
}, {
  message: 'Expiration date is required for date duration',
  path: ['expirationDate'],
}).refine((data) => {
  // If time-based, expirationTime is required
  if (data.expirationType === 'time-based') {
    return !!data.expirationTime;
  }
  return true;
}, {
  message: 'Expiration time is required for time-based expiration',
  path: ['expirationTime'],
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;

