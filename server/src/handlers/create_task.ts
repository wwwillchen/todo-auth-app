
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type CreateTaskInput, type Task, type Context } from '../schema';

export const createTask = async (input: CreateTaskInput, ctx: Context): Promise<Task> => {
  if (!ctx.userId) {
    throw new Error('User not authenticated');
  }

  try {
    const result = await db.insert(tasksTable)
      .values({
        user_id: ctx.userId,
        title: input.title,
        description: input.description || null,
        priority: input.priority, // Has default 'medium' from Zod schema
        due_date: input.due_date || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Task creation failed:', error);
    throw error;
  }
};
