
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type Context } from '../schema';
import { getUserProfile } from '../handlers/get_user_profile';

describe('getUserProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user profile without password_hash', async () => {
    // Create test user
    const testUser = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const userId = testUser[0].id;
    const ctx: Context = { userId };

    const result = await getUserProfile(ctx);

    // Verify user profile data
    expect(result.id).toEqual(userId);
    expect(result.email).toEqual('test@example.com');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Verify password_hash is not included
    expect('password_hash' in result).toBe(false);
  });

  it('should throw error when userId is not provided', async () => {
    const ctx: Context = {};

    await expect(getUserProfile(ctx)).rejects.toThrow(/User ID is required/i);
  });

  it('should throw error when user does not exist', async () => {
    const ctx: Context = { userId: 999 };

    await expect(getUserProfile(ctx)).rejects.toThrow(/User not found/i);
  });

  it('should return correct user when multiple users exist', async () => {
    // Create multiple test users
    const user1 = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hash1'
      })
      .returning()
      .execute();

    const user2 = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hash2'
      })
      .returning()
      .execute();

    // Request profile for user2
    const ctx: Context = { userId: user2[0].id };
    const result = await getUserProfile(ctx);

    // Verify we get the correct user
    expect(result.id).toEqual(user2[0].id);
    expect(result.email).toEqual('user2@example.com');
    expect('password_hash' in result).toBe(false);
  });
});
