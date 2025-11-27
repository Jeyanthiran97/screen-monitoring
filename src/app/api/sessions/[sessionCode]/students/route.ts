import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Session from '@/models/Session';
import StudentSession from '@/models/StudentSession';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionCode: string } }
) {
  try {
    await connectDB();

    const session = await Session.findOne({ sessionCode: params.sessionCode });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const students = await StudentSession.find({
      sessionId: session._id,
      isActive: true,
    }).sort({ connectedAt: -1 });

    return NextResponse.json(
      {
        students: students.map((s) => ({
          id: s._id.toString(),
          studentName: s.studentName,
          socketId: s.socketId,
          connectedAt: s.connectedAt,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get students error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

