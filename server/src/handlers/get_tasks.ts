
import { type GetTasksInput, type Task, type Context } from '../schema';

export declare function getTasks(input: GetTasksInput, ctx: Context): Promise<Task[]>;
