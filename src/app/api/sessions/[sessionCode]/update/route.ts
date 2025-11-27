import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Session from '@/models/Session';
import { requireAuth } from '@/lib/auth';
import { createSessionSchema } from '@/lib/validations/session';
import { z } from 'zod';
import mongoose from 'mongoose';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sessionCode: string }> | { sessionCode: string } }
) {
  try {
    const lecturer = await requireAuth('lecturer');
    const body = await request.json();
    const validatedData = createSessionSchema.parse(body);

    await connectDB();

    // Handle params as Promise (Next.js 16) or object
    const resolvedParams = params instanceof Promise ? await params : params;
    const sessionCode = resolvedParams.sessionCode;

    const session = await Session.findOne({ sessionCode, lecturerId: lecturer.id });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Update session fields
    session.modeType = validatedData.modeType;
    session.shareType = validatedData.shareType;
    session.expirationType = validatedData.expirationType;
    session.deviceLimit = validatedData.deviceLimit;

    if (validatedData.expirationType === 'date-duration' && validatedData.expirationDate) {
      session.expirationDate = new Date(validatedData.expirationDate);
    } else {
      session.expirationDate = undefined;
    }

    if (validatedData.expirationType === 'time-based' && validatedData.expirationTime) {
      session.expirationTime = validatedData.expirationTime;
    } else {
      session.expirationTime = undefined;
    }

    await session.save();

    return NextResponse.json(
      {
        message: 'Session updated successfully',
        session: {
          id: session._id.toString(),
          sessionCode: session.sessionCode,
          modeType: session.modeType,
          shareType: session.shareType,
          expirationType: session.expirationType,
          expirationDate: session.expirationDate,
          expirationTime: session.expirationTime,
          deviceLimit: session.deviceLimit,
          isActive: session.isActive,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        },
      },
      { status: 200 }
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

    console.error('Update session error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

