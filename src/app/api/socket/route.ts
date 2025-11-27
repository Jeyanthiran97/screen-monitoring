// This route is used by Socket.IO client to connect
// The actual Socket.IO server is initialized in server.ts
export async function GET() {
  return new Response('Socket.IO endpoint', { status: 200 });
}

