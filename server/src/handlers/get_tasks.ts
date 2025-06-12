
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type GetTasksInput, type Task, type Context } from '../schema';
import { eq, and, ilike, type SQL } from 'drizzle-orm';

export const getTasks = async (input: GetTasksInput, ctx: Context): Promise<Task[]> => {
  try {
    // Ensure user is authenticated
    if (!ctx.userId) {
      throw new Error('User not authenticated');
    }

    // Build conditions array
    const conditions: SQL<unknown>[] = [
      eq(tasksTable.user_id, ctx.userId)
    ];

    // Add optional filters
    if (input.completed !== undefined) {
      conditions.push(eq(tasksTable.completed, input.completed));
    }

    if (input.priority) {
      conditions.push(eq(tasksTable.priority, input.priority));
    }

    if (input.search) {
      conditions.push(ilike(tasksTable.title, `%${input.search}%`));
    }

    // Execute query with all conditions
    const results = await db.select()
      .from(tasksTable)
      .where(and(...conditions))
      .execute();

    return results;
  } catch (error) {
    console.error('Get tasks failed:', error);
    throw error;
  }
};
