# Socket.IO Server for Screen Monitoring

This is a separate Socket.IO server that needs to be deployed independently from your Next.js app on Vercel.

## Why Separate Server?

Vercel's serverless functions **do not support persistent WebSocket connections**. Socket.IO requires a persistent server process, so it must be deployed separately.

## Quick Start

### 1. Copy Your Models

Copy these files from the main project:
- `src/models/Session.ts`
- `src/models/StudentSession.ts`
- `src/lib/mongodb.ts` (or adapt the connection logic)

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Environment Variables

Create a `.env` file:

```env
MONGODB_URI=your_mongodb_connection_string
ALLOWED_ORIGIN=https://screen-linker.vercel.app
PORT=3001
```

### 4. Deploy to Railway (Recommended)

1. Go to [Railway](https://railway.app)
2. Create a new project
3. Connect your GitHub repository
4. Select this `socket-server-example` folder
5. Add environment variables
6. Deploy!

### 5. Update Vercel Environment Variable

In your Vercel project settings:
- Add/Update `NEXT_PUBLIC_SOCKET_URL` to your Railway server URL
- Example: `https://your-socket-server.railway.app`

## Alternative Platforms

### Render

1. Create a new Web Service
2. Connect your repository
3. Set root directory to `socket-server-example`
4. Build command: `npm install && npm run build`
5. Start command: `npm start`

### Fly.io

```bash
fly launch
fly secrets set MONGODB_URI=your_uri
fly secrets set ALLOWED_ORIGIN=https://your-app.vercel.app
fly deploy
```

### DigitalOcean App Platform

1. Create new app
2. Connect repository
3. Set root directory to `socket-server-example`
4. Add environment variables
5. Deploy

## Testing Locally

```bash
npm run dev
```

The server will run on `http://localhost:3001`

Update your local `.env`:
```
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

## Important Notes

- This server needs access to the same MongoDB database
- Copy your Mongoose models to this project
- The socket logic should match `src/lib/socket-server.ts` from the main project
- Keep the server running 24/7 (most platforms have free tiers)

