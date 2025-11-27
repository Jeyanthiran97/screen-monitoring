import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Session from '@/models/Session';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const lecturer = await requireAuth('lecturer');
    await connectDB();

    const sessions = await Session.find({ lecturerId: lecturer.id })
      .sort({ createdAt: -1 })
      .limit(10);

    return NextResponse.json({ sessions }, { status: 200 });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden' || error.message === 'Account not approved') {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error('Get sessions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

