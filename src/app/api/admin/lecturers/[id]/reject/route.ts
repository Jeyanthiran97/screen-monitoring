import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { requireAuth } from '@/lib/auth';
import mongoose from 'mongoose';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const admin = await requireAuth('admin');
    await connectDB();

    // Handle params as Promise (Next.js 16) or object
    const resolvedParams = params instanceof Promise ? await params : params;
    const lecturerId = resolvedParams.id;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(lecturerId)) {
      return NextResponse.json(
        { error: 'Invalid lecturer ID format' },
        { status: 400 }
      );
    }

    const lecturer = await User.findById(lecturerId);

    if (!lecturer) {
      return NextResponse.json(
        { error: 'Lecturer not found' },
        { status: 404 }
      );
    }

    if (lecturer.role !== 'lecturer') {
      return NextResponse.json(
        { error: 'User is not a lecturer' },
        { status: 400 }
      );
    }

    lecturer.isApproved = false;
    await lecturer.save();

    return NextResponse.json(
      {
        message: 'Lecturer rejected',
        lecturer: {
          id: lecturer._id.toString(),
          email: lecturer.email,
          name: lecturer.name,
          isApproved: lecturer.isApproved,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error('Reject lecturer error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

