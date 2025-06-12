
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable } from '../db/schema';
import { type DeleteTaskInput, type Context } from '../schema';
import { deleteTask } from '../handlers/delete_task';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password'
};

const testTask = {
  title: 'Test Task',
  description: 'A task for testing deletion',
  priority: 'medium' as const,
  completed: false
};

describe('deleteTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a task successfully', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user = userResult[0];

    // Create task
    const taskResult = await db.insert(tasksTable)
      .values({
        ...testTask,
        user_id: user.id
      })
      .returning()
      .execute();
    const task = taskResult[0];

    const input: DeleteTaskInput = { id: task.id };
    const ctx: Context = { userId: user.id };

    const result = await deleteTask(input, ctx);

    expect(result.success).toBe(true);

    // Verify task was deleted from database
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, task.id))
      .execute();

    expect(tasks).toHaveLength(0);
  });

  it('should return false when task does not exist', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user = userResult[0];

    const input: DeleteTaskInput = { id: 999 }; // Non-existent task ID
    const ctx: Context = { userId: user.id };

    const result = await deleteTask(input, ctx);

    expect(result.success).toBe(false);
  });

  it('should return false when trying to delete another users task', async () => {
    // Create two users
    const user1Result = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user1 = user1Result[0];

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed_password2'
      })
      .returning()
      .execute();
    const user2 = user2Result[0];

    // Create task belonging to user1
    const taskResult = await db.insert(tasksTable)
      .values({
        ...testTask,
        user_id: user1.id
      })
      .returning()
      .execute();
    const task = taskResult[0];

    // Try to delete with user2's context
    const input: DeleteTaskInput = { id: task.id };
    const ctx: Context = { userId: user2.id };

    const result = await deleteTask(input, ctx);

    expect(result.success).toBe(false);

    // Verify task still exists in database
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, task.id))
      .execute();

    expect(tasks).toHaveLength(1);
  });

  it('should throw error when user is not authenticated', async () => {
    const input: DeleteTaskInput = { id: 1 };
    const ctx: Context = {}; // No userId

    await expect(deleteTask(input, ctx)).rejects.toThrow(/authentication required/i);
  });
});
