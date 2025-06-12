
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterInput } from '../schema';
import { register } from '../handlers/register';
import { eq } from 'drizzle-orm';

const testInput: RegisterInput = {
  email: 'test@example.com',
  password: 'password123'
};

describe('register', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should register a new user', async () => {
    const result = await register(testInput);

    // Verify user object structure
    expect(result.user.email).toEqual('test@example.com');
    expect(result.user.id).toBeDefined();
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');

    // Verify password_hash is not included in response
    expect((result.user as any).password_hash).toBeUndefined();
  });

  it('should save user to database with hashed password', async () => {
    const result = await register(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.user.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];
    expect(savedUser.email).toEqual('test@example.com');
    expect(savedUser.password_hash).toBeDefined();
    expect(savedUser.password_hash).not.toEqual('password123'); // Should be hashed
    expect(savedUser.password_hash.length).toBeGreaterThan(10); // Hashed password should be longer
    expect(savedUser.created_at).toBeInstanceOf(Date);
    expect(savedUser.updated_at).toBeInstanceOf(Date);
  });

  it('should reject duplicate email addresses', async () => {
    // Register first user
    await register(testInput);

    // Try to register with same email
    await expect(register(testInput)).rejects.toThrow(/already exists/i);
  });

  it('should generate valid authentication token', async () => {
    const result = await register(testInput);

    // Token should be a base64 encoded string
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
    expect(result.token.length).toBeGreaterThan(0);

    // Should be able to decode the token
    const decoded = atob(result.token);
    expect(decoded).toContain(result.user.id.toString());
    expect(decoded).toContain(result.user.email);
  });

  it('should handle password hashing correctly', async () => {
    const result = await register(testInput);

    // Get the saved user from database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, testInput.email))
      .execute();

    const savedUser = users[0];

    // Verify password was hashed using Bun's password verification
    const isValid = await Bun.password.verify(testInput.password, savedUser.password_hash);
    expect(isValid).toBe(true);

    // Verify wrong password fails
    const isInvalid = await Bun.password.verify('wrongpassword', savedUser.password_hash);
    expect(isInvalid).toBe(false);
  });
});
