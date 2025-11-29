import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/server/mongodb';
import * as crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Verify password
function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    console.log('=== USER LOGIN ===');
    console.log('Email:', email);

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    try {
      const usersCollection = await getCollection('users');

      // Find user
      const user = await usersCollection.findOne({ email: email.toLowerCase() });
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Invalid email or password' },
          { status: 401 }
        );
      }

      // Verify password
      if (!verifyPassword(password, user.password)) {
        return NextResponse.json(
          { success: false, error: 'Invalid email or password' },
          { status: 401 }
        );
      }

      // Generate new session token
      const token = crypto.randomBytes(32).toString('hex');
      
      await usersCollection.updateOne(
        { _id: user._id },
        { 
          $set: { 
            sessionToken: token, 
            tokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            lastActive: new Date(),
          } 
        }
      );

      console.log('✅ User logged in:', email);

      return NextResponse.json({
        success: true,
        token,
        user: {
          email: user.email,
          username: user.username,
          reputationScore: user.reputationScore,
          reputationLevel: user.reputationLevel,
        },
      });
    } catch (dbError: any) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { success: false, error: 'Login failed. Please try again.' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('=== LOGIN ERROR ===');
    console.error(error);
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

