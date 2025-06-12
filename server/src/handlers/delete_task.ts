
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type DeleteTaskInput, type Context } from '../schema';
import { eq, and } from 'drizzle-orm';

export const deleteTask = async (input: DeleteTaskInput, ctx: Context): Promise<{ success: boolean }> => {
  try {
    if (!ctx.userId) {
      throw new Error('Authentication required');
    }

    // Delete the task only if it belongs to the authenticated user
    const result = await db.delete(tasksTable)
      .where(and(
        eq(tasksTable.id, input.id),
        eq(tasksTable.user_id, ctx.userId)
      ))
      .returning()
      .execute();

    // Return success based on whether a task was actually deleted
    return { success: result.length > 0 };
  } catch (error) {
    console.error('Task deletion failed:', error);
    throw error;
  }
};
