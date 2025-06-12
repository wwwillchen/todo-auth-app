
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User, type Context } from '../schema';
import { eq } from 'drizzle-orm';

export const getUserProfile = async (ctx: Context): Promise<Omit<User, 'password_hash'>> => {
  if (!ctx.userId) {
    throw new Error('User ID is required');
  }

  try {
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, ctx.userId))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];
    
    // Return user without password_hash
    const { password_hash, ...userProfile } = user;
    return userProfile;
  } catch (error) {
    console.error('Get user profile failed:', error);
    throw error;
  }
};
