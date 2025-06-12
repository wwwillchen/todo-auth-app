
import { type CreateTaskInput, type Task, type Context } from '../schema';

export declare function createTask(input: CreateTaskInput, ctx: Context): Promise<Task>;
