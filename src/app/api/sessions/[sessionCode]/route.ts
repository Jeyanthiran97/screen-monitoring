import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Session from '@/models/Session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionCode: string }> | { sessionCode: string } }
) {
  try {
    await connectDB();

    // Handle params as Promise (Next.js 16) or object
    const resolvedParams = params instanceof Promise ? await params : params;
    const session = await Session.findOne({ sessionCode: resolvedParams.sessionCode });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ session }, { status: 200 });
  } catch (error) {
    console.error('Get session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

