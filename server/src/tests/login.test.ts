
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { login } from '../handlers/login';
import { createHash, randomBytes } from 'crypto';

// Helper function to create password hash (matching the login handler logic)
const createPasswordHash = (password: string): string => {
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256').update(password + salt).digest('hex');
  return salt + hash; // Store salt + hash
};

// Helper function to verify token structure
const isValidTokenStructure = (token: string): boolean => {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  try {
    // Verify we can decode the header and payload
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    
    return header.alg === 'HS256' && 
           header.typ === 'JWT' &&
           typeof payload.userId === 'number' &&
           typeof payload.email === 'string' &&
           typeof payload.exp === 'number';
  } catch {
    return false;
  }
};

const testUser = {
  email: 'test@example.com',
  password: 'testpass123'
};

const testLoginInput: LoginInput = {
  email: 'test@example.com',
  password: 'testpass123'
};

describe('login', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should login with valid credentials', async () => {
    // Create test user
    const passwordHash = createPasswordHash(testUser.password);
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: passwordHash
      })
      .execute();

    const result = await login(testLoginInput);

    // Verify response structure
    expect(result.user).toBeDefined();
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');

    // Verify user data excludes password_hash
    expect(result.user.email).toEqual(testUser.email);
    expect(result.user.id).toBeDefined();
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);
    expect((result.user as any).password_hash).toBeUndefined();

    // Verify token is valid structure
    expect(isValidTokenStructure(result.token)).toBe(true);
    
    // Verify token payload
    const payload = JSON.parse(Buffer.from(result.token.split('.')[1], 'base64url').toString());
    expect(payload.userId).toEqual(result.user.id);
    expect(payload.email).toEqual(testUser.email);
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('should reject invalid email', async () => {
    // Create test user
    const passwordHash = createPasswordHash(testUser.password);
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: passwordHash
      })
      .execute();

    const invalidInput: LoginInput = {
      email: 'wrong@example.com',
      password: testUser.password
    };

    await expect(login(invalidInput)).rejects.toThrow(/invalid credentials/i);
  });

  it('should reject invalid password', async () => {
    // Create test user
    const passwordHash = createPasswordHash(testUser.password);
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: passwordHash
      })
      .execute();

    const invalidInput: LoginInput = {
      email: testUser.email,
      password: 'wrongpassword'
    };

    await expect(login(invalidInput)).rejects.toThrow(/invalid credentials/i);
  });

  it('should reject non-existent user', async () => {
    const invalidInput: LoginInput = {
      email: 'nonexistent@example.com',
      password: 'somepassword'
    };

    await expect(login(invalidInput)).rejects.toThrow(/invalid credentials/i);
  });
});
