
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable } from '../db/schema';
import { type GetTasksInput, type Context } from '../schema';
import { getTasks } from '../handlers/get_tasks';

// Test data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password'
};

const testTasks = [
  {
    title: 'Complete project',
    description: 'Finish the task management system',
    completed: false,
    priority: 'high' as const,
    due_date: new Date('2024-12-31')
  },
  {
    title: 'Review code',
    description: 'Review pull requests',
    completed: true,
    priority: 'medium' as const,
    due_date: null
  },
  {
    title: 'Write tests',
    description: null,
    completed: false,
    priority: 'low' as const,
    due_date: new Date('2024-12-15')
  }
];

describe('getTasks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get all tasks for authenticated user', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create tasks
    await db.insert(tasksTable)
      .values(testTasks.map(task => ({ ...task, user_id: userId })))
      .execute();

    const input: GetTasksInput = {};
    const ctx: Context = { userId };

    const result = await getTasks(input, ctx);

    expect(result).toHaveLength(3);
    expect(result[0].title).toEqual('Complete project');
    expect(result[1].title).toEqual('Review code');
    expect(result[2].title).toEqual('Write tests');
  });

  it('should filter tasks by completed status', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create tasks
    await db.insert(tasksTable)
      .values(testTasks.map(task => ({ ...task, user_id: userId })))
      .execute();

    const input: GetTasksInput = { completed: true };
    const ctx: Context = { userId };

    const result = await getTasks(input, ctx);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Review code');
    expect(result[0].completed).toBe(true);
  });

  it('should filter tasks by priority', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create tasks
    await db.insert(tasksTable)
      .values(testTasks.map(task => ({ ...task, user_id: userId })))
      .execute();

    const input: GetTasksInput = { priority: 'high' };
    const ctx: Context = { userId };

    const result = await getTasks(input, ctx);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Complete project');
    expect(result[0].priority).toEqual('high');
  });

  it('should search tasks by title', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create tasks
    await db.insert(tasksTable)
      .values(testTasks.map(task => ({ ...task, user_id: userId })))
      .execute();

    const input: GetTasksInput = { search: 'code' };
    const ctx: Context = { userId };

    const result = await getTasks(input, ctx);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Review code');
  });

  it('should combine multiple filters', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create tasks
    await db.insert(tasksTable)
      .values(testTasks.map(task => ({ ...task, user_id: userId })))
      .execute();

    const input: GetTasksInput = { 
      completed: false, 
      priority: 'high' 
    };
    const ctx: Context = { userId };

    const result = await getTasks(input, ctx);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Complete project');
    expect(result[0].completed).toBe(false);
    expect(result[0].priority).toEqual('high');
  });

  it('should return empty array when no tasks match filters', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create tasks
    await db.insert(tasksTable)
      .values(testTasks.map(task => ({ ...task, user_id: userId })))
      .execute();

    const input: GetTasksInput = { search: 'nonexistent' };
    const ctx: Context = { userId };

    const result = await getTasks(input, ctx);

    expect(result).toHaveLength(0);
  });

  it('should only return tasks for authenticated user', async () => {
    // Create two users
    const user1Result = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user1Id = user1Result[0].id;

    const user2Result = await db.insert(usersTable)
      .values({ email: 'user2@example.com', password_hash: 'hash2' })
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    // Create tasks for both users
    await db.insert(tasksTable)
      .values([
        { ...testTasks[0], user_id: user1Id },
        { ...testTasks[1], user_id: user2Id }
      ])
      .execute();

    const input: GetTasksInput = {};
    const ctx: Context = { userId: user1Id };

    const result = await getTasks(input, ctx);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Complete project');
  });

  it('should throw error when user not authenticated', async () => {
    const input: GetTasksInput = {};
    const ctx: Context = {}; // No userId

    await expect(getTasks(input, ctx)).rejects.toThrow(/not authenticated/i);
  });
});
