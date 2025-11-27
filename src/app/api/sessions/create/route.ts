import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Session from '@/models/Session';
import { requireAuth } from '@/lib/auth';
import { createSessionSchema } from '@/lib/validations/session';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const lecturer = await requireAuth('lecturer');
    const body = await request.json();
    const validatedData = createSessionSchema.parse(body);

    await connectDB();

    const session = new Session({
      lecturerId: lecturer.id,
      modeType: validatedData.modeType,
      shareType: validatedData.shareType,
    });

    await session.save();

    return NextResponse.json(
      {
        message: 'Session created successfully',
        session: {
          id: session._id.toString(),
          sessionCode: session.sessionCode,
          modeType: session.modeType,
          shareType: session.shareType,
          createdAt: session.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((err) => ({
        path: err.path,
        message: err.message,
      }));
      
      return NextResponse.json(
        { 
          error: 'Validation error', 
          details: formattedErrors 
        },
        { status: 400 }
      );
    }

    if (error.message === 'Unauthorized' || error.message === 'Forbidden' || error.message === 'Account not approved') {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error('Create session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

