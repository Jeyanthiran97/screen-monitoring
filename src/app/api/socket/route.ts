// This route is used by Socket.IO client to connect
// NOTE: Vercel serverless functions don't support persistent WebSocket connections
// The custom server.ts file only works in local development or on platforms that support persistent servers
// For Vercel deployment, you MUST deploy Socket.IO separately (see VERCEL_SOCKET_IO.md)

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Check if we're on Vercel (serverless)
  const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
  
  if (isVercel) {
    return NextResponse.json(
      {
        error: 'Socket.IO server not available',
        message: 'Vercel serverless functions do not support persistent WebSocket connections. Please deploy Socket.IO separately or use a different hosting platform.',
        solution: 'See VERCEL_SOCKET_IO.md for deployment instructions',
      },
      { status: 503 }
    );
  }

  // For local development with custom server
  return NextResponse.json(
    { message: 'Socket.IO endpoint - use custom server.ts for local development' },
    { status: 200 }
  );
}

export async function POST(request: NextRequest) {
  return GET(request);
}

