
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type AuthResponse } from '../schema';
import { eq } from 'drizzle-orm';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

// Simple JWT-like token generation using Node.js crypto
const generateToken = (payload: any): string => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payloadStr = Buffer.from(JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  })).toString('base64url');
  
  const secret = process.env['JWT_SECRET'] || 'default-secret';
  const signature = createHash('sha256')
    .update(`${header}.${payloadStr}.${secret}`)
    .digest('base64url');
  
  return `${header}.${payloadStr}.${signature}`;
};

// Simple password hashing using Node.js crypto
const hashPassword = (password: string, salt: string): string => {
  return createHash('sha256').update(password + salt).digest('hex');
};

const verifyPassword = (password: string, hash: string): boolean => {
  // Extract salt from stored hash (first 32 characters)
  const salt = hash.slice(0, 32);
  const storedHash = hash.slice(32);
  const computedHash = hashPassword(password, salt);
  
  // Use timing-safe comparison
  try {
    return timingSafeEqual(
      Buffer.from(storedHash, 'hex'),
      Buffer.from(computedHash, 'hex')
    );
  } catch {
    return false;
  }
};

export const login = async (input: LoginInput): Promise<AuthResponse> => {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = users[0];

    // Verify password
    const isValidPassword = verifyPassword(input.password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email
    });

    // Return user without password_hash and token
    return {
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      token
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};
