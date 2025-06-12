
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable } from '../db/schema';
import { type UpdateTaskInput, type Context } from '../schema';
import { updateTask } from '../handlers/update_task';
import { eq } from 'drizzle-orm';

describe('updateTask', () => {
  let testUserId: number;
  let testTaskId: number;
  let otherUserId: number;
  let otherTaskId: number;

  beforeEach(async () => {
    await createDB();

    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'test@example.com',
          password_hash: 'hashed_password'
        },
        {
          email: 'other@example.com',
          password_hash: 'hashed_password'
        }
      ])
      .returning()
      .execute();

    testUserId = users[0].id;
    otherUserId = users[1].id;

    // Create test tasks
    const tasks = await db.insert(tasksTable)
      .values([
        {
          user_id: testUserId,
          title: 'Test Task',
          description: 'Original description',
          completed: false,
          priority: 'medium',
          due_date: new Date('2024-12-31')
        },
        {
          user_id: otherUserId,
          title: 'Other User Task',
          description: 'Other description',
          completed: false,
          priority: 'low'
        }
      ])
      .returning()
      .execute();

    testTaskId = tasks[0].id;
    otherTaskId = tasks[1].id;
  });

  afterEach(resetDB);

  it('should update task title', async () => {
    const input: UpdateTaskInput = {
      id: testTaskId,
      title: 'Updated Task Title'
    };
    const ctx: Context = { userId: testUserId };

    const result = await updateTask(input, ctx);

    expect(result.id).toEqual(testTaskId);
    expect(result.title).toEqual('Updated Task Title');
    expect(result.description).toEqual('Original description'); // Unchanged
    expect(result.completed).toEqual(false); // Unchanged
    expect(result.priority).toEqual('medium'); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update task completion status', async () => {
    const input: UpdateTaskInput = {
      id: testTaskId,
      completed: true
    };
    const ctx: Context = { userId: testUserId };

    const result = await updateTask(input, ctx);

    expect(result.id).toEqual(testTaskId);
    expect(result.completed).toEqual(true);
    expect(result.title).toEqual('Test Task'); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields', async () => {
    const newDueDate = new Date('2025-01-15');
    const input: UpdateTaskInput = {
      id: testTaskId,
      title: 'Multi-field Update',
      priority: 'high',
      completed: true,
      due_date: newDueDate
    };
    const ctx: Context = { userId: testUserId };

    const result = await updateTask(input, ctx);

    expect(result.id).toEqual(testTaskId);
    expect(result.title).toEqual('Multi-field Update');
    expect(result.priority).toEqual('high');
    expect(result.completed).toEqual(true);
    expect(result.due_date).toEqual(newDueDate);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update description to null', async () => {
    const input: UpdateTaskInput = {
      id: testTaskId,
      description: null
    };
    const ctx: Context = { userId: testUserId };

    const result = await updateTask(input, ctx);

    expect(result.id).toEqual(testTaskId);
    expect(result.description).toBeNull();
    expect(result.title).toEqual('Test Task'); // Unchanged
  });

  it('should save updates to database', async () => {
    const input: UpdateTaskInput = {
      id: testTaskId,
      title: 'Database Update Test',
      completed: true
    };
    const ctx: Context = { userId: testUserId };

    await updateTask(input, ctx);

    // Verify in database
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, testTaskId))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toEqual('Database Update Test');
    expect(tasks[0].completed).toEqual(true);
    expect(tasks[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when user not authenticated', async () => {
    const input: UpdateTaskInput = {
      id: testTaskId,
      title: 'Should Fail'
    };
    const ctx: Context = {}; // No userId

    await expect(updateTask(input, ctx)).rejects.toThrow(/authentication required/i);
  });

  it('should throw error when task does not exist', async () => {
    const input: UpdateTaskInput = {
      id: 99999, // Non-existent task
      title: 'Should Fail'
    };
    const ctx: Context = { userId: testUserId };

    await expect(updateTask(input, ctx)).rejects.toThrow(/task not found or access denied/i);
  });

  it('should throw error when trying to update another users task', async () => {
    const input: UpdateTaskInput = {
      id: otherTaskId, // Task belongs to otherUserId
      title: 'Should Fail'
    };
    const ctx: Context = { userId: testUserId }; // Different user

    await expect(updateTask(input, ctx)).rejects.toThrow(/task not found or access denied/i);
  });

  it('should update due_date to null', async () => {
    const input: UpdateTaskInput = {
      id: testTaskId,
      due_date: null
    };
    const ctx: Context = { userId: testUserId };

    const result = await updateTask(input, ctx);

    expect(result.id).toEqual(testTaskId);
    expect(result.due_date).toBeNull();
    expect(result.title).toEqual('Test Task'); // Unchanged
  });
});
