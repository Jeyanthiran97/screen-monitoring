import { cookies } from 'next/headers';
import { verifyToken, JWTPayload } from './jwt';
import User from '@/models/User';
import connectDB from './mongodb';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isApproved: boolean;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return null;
    }

    const payload = verifyToken(token);
    await connectDB();

    const user = await User.findById(payload.userId).select('+password');
    
    if (!user) {
      return null;
    }

    // Check if lecturer is approved
    if (user.role === 'lecturer' && !user.isApproved) {
      return null;
    }

    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      isApproved: user.isApproved,
    };
  } catch (error) {
    return null;
  }
}

export async function requireAuth(requiredRole?: 'admin' | 'lecturer'): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  if (requiredRole && user.role !== requiredRole) {
    throw new Error('Forbidden');
  }

  if (requiredRole === 'lecturer' && !user.isApproved) {
    throw new Error('Account not approved');
  }

  return user;
}

