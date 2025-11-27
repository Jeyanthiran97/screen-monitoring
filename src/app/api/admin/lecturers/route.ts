import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const user = await requireAuth('admin');
    await connectDB();

    const lecturers = await User.find({ role: 'lecturer' })
      .select('-password')
      .sort({ createdAt: -1 });

    return NextResponse.json({ lecturers }, { status: 200 });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error('Get lecturers error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

