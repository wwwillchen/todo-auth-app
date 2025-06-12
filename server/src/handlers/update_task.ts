
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type UpdateTaskInput, type Task, type Context } from '../schema';
import { eq, and } from 'drizzle-orm';

export const updateTask = async (input: UpdateTaskInput, ctx: Context): Promise<Task> => {
  if (!ctx.userId) {
    throw new Error('Authentication required');
  }

  try {
    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.title !== undefined) {
      updateData.title = input.title;
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.completed !== undefined) {
      updateData.completed = input.completed;
    }
    if (input.priority !== undefined) {
      updateData.priority = input.priority;
    }
    if (input.due_date !== undefined) {
      updateData.due_date = input.due_date;
    }

    // Update task with user ownership check
    const result = await db.update(tasksTable)
      .set(updateData)
      .where(and(
        eq(tasksTable.id, input.id),
        eq(tasksTable.user_id, ctx.userId)
      ))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Task not found or access denied');
    }

    return result[0];
  } catch (error) {
    console.error('Task update failed:', error);
    throw error;
  }
};
