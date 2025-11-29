import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/server/mongodb';
import * as crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Hash password with bcrypt alternative (crypto)
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, username } = await request.json();

    console.log('=== USER REGISTRATION ===');
    console.log('Email:', email);
    console.log('Username:', username);

    // Validation
    if (!email || !password || !username) {
      return NextResponse.json(
        { success: false, error: 'Email, password, and username are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        { success: false, error: 'Username must be at least 3 characters' },
        { status: 400 }
      );
    }

    try {
      const usersCollection = await getCollection('users');

      // Check if email already exists
      const existingEmail = await usersCollection.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        return NextResponse.json(
          { success: false, error: 'Email already registered' },
          { status: 400 }
        );
      }

      // Check if username already exists
      const existingUsername = await usersCollection.findOne({ username: username.toLowerCase() });
      if (existingUsername) {
        return NextResponse.json(
          { success: false, error: 'Username already taken' },
          { status: 400 }
        );
      }

      // Create user
      const hashedPassword = hashPassword(password);
      
      const result = await usersCollection.insertOne({
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        password: hashedPassword,
        reputationScore: 0,
        reputationLevel: 'NEWCOMER',
        reportsSubmitted: 0,
        reportsVerified: 0,
        badges: [],
        createdAt: new Date(),
        lastActive: new Date(),
      });

      // Generate session token
      const token = crypto.randomBytes(32).toString('hex');
      
      // Save session (could use separate sessions collection)
      await usersCollection.updateOne(
        { _id: result.insertedId },
        { $set: { sessionToken: token, tokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } }
      );

      console.log('✅ User registered:', email);

      return NextResponse.json({
        success: true,
        token,
        user: {
          email: email.toLowerCase(),
          username: username.toLowerCase(),
          reputationScore: 0,
        },
      });
    } catch (dbError: any) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { success: false, error: 'Registration failed. Please try again.' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('=== REGISTRATION ERROR ===');
    console.error(error);
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

