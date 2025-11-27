# Socket.IO Deployment on Vercel

## ⚠️ Important: Vercel Serverless Limitation

**Vercel's serverless functions do NOT support persistent WebSocket connections.** The custom `server.ts` file that runs Socket.IO will **NOT work** on Vercel's serverless platform.

## Solutions

### Option 1: Separate Socket.IO Server (Recommended)

Deploy your Socket.IO server separately on a platform that supports persistent connections:

**Recommended Platforms:**
- **Railway** (https://railway.app) - Easy deployment, free tier available
- **Render** (https://render.com) - Free tier available
- **Fly.io** (https://fly.io) - Good performance
- **DigitalOcean App Platform** - Simple deployment
- **Heroku** - Traditional option

**Steps:**
1. Create a separate repository or folder for your Socket.IO server
2. Deploy it to one of the platforms above
3. Update `NEXT_PUBLIC_SOCKET_URL` in Vercel to point to your Socket.IO server URL
4. Keep your Next.js app on Vercel

**Example Socket.IO Server (separate deployment):**
```typescript
// socket-server/index.ts
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGIN || '*',
    credentials: true,
  },
  path: '/socket.io',
});

// Your socket logic here
io.on('connection', (socket) => {
  // ... your socket handlers
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});
```

### Option 2: Use Polling Transport (Current Implementation)

The current code uses **polling-only transport** which works better with serverless, but:
- ❌ Higher latency
- ❌ More server requests
- ❌ May still have issues with long-polling on Vercel
- ✅ Works without separate server

**Current Status:** The code is configured to use polling-only transport. This should work better, but may still have limitations.

### Option 3: Alternative Real-time Solutions

Consider using serverless-compatible real-time services:
- **Pusher** (https://pusher.com)
- **Ably** (https://ably.com)
- **Supabase Realtime** (https://supabase.com)
- **Firebase Realtime Database**

## Current Configuration

The application is currently configured to:
- Use **polling-only** transport (no WebSocket upgrade)
- Have better reconnection logic
- Work with Vercel's limitations (as much as possible)

## Testing

After deploying:
1. Check browser console for connection errors
2. Verify Socket.IO connects using polling (check Network tab)
3. Test student join functionality
4. Monitor for connection drops

## If Issues Persist

If you continue to see connection errors:
1. **Deploy Socket.IO separately** (Option 1 - Recommended)
2. Update `NEXT_PUBLIC_SOCKET_URL` environment variable
3. Redeploy your Next.js app

## Local Development

For local development, the `server.ts` file works fine. The custom server runs on your local machine and supports both WebSocket and polling transports.

