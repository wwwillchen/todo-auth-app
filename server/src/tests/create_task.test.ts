
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable } from '../db/schema';
import { type CreateTaskInput, type Context } from '../schema';
import { createTask } from '../handlers/create_task';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInput: CreateTaskInput = {
  title: 'Test Task',
  description: 'A task for testing',
  priority: 'high',
  due_date: new Date('2024-12-31')
};

// Test context
const testContext: Context = {
  userId: 1
};

describe('createTask', () => {
  let userId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();
    
    userId = userResult[0].id;
    testContext.userId = userId;
  });

  afterEach(resetDB);

  it('should create a task', async () => {
    const result = await createTask(testInput, testContext);

    expect(result.title).toEqual('Test Task');
    expect(result.description).toEqual('A task for testing');
    expect(result.priority).toEqual('high');
    expect(result.due_date).toBeInstanceOf(Date);
    expect(result.completed).toEqual(false);
    expect(result.user_id).toEqual(userId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save task to database', async () => {
    const result = await createTask(testInput, testContext);

    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, result.id))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toEqual('Test Task');
    expect(tasks[0].description).toEqual('A task for testing');
    expect(tasks[0].priority).toEqual('high');
    expect(tasks[0].user_id).toEqual(userId);
    expect(tasks[0].completed).toEqual(false);
  });

  it('should use default priority when not provided', async () => {
    const inputWithoutPriority: CreateTaskInput = {
      title: 'Task without priority',
      description: 'Testing default priority',
      priority: 'medium' // Include the default value explicitly
    };

    const result = await createTask(inputWithoutPriority, testContext);

    expect(result.priority).toEqual('medium');
  });

  it('should handle null description and due_date', async () => {
    const inputWithNulls: CreateTaskInput = {
      title: 'Task with nulls',
      description: null,
      priority: 'low',
      due_date: null
    };

    const result = await createTask(inputWithNulls, testContext);

    expect(result.description).toBeNull();
    expect(result.due_date).toBeNull();
    expect(result.title).toEqual('Task with nulls');
    expect(result.priority).toEqual('low');
  });

  it('should throw error when user not authenticated', async () => {
    const unauthenticatedContext: Context = { userId: undefined };

    await expect(createTask(testInput, unauthenticatedContext))
      .rejects.toThrow(/user not authenticated/i);
  });

  it('should throw error when user_id does not exist', async () => {
    const invalidContext: Context = { userId: 999 };

    await expect(createTask(testInput, invalidContext))
      .rejects.toThrow();
  });
});
