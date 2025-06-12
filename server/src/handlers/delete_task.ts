
import { type DeleteTaskInput, type Context } from '../schema';

export declare function deleteTask(input: DeleteTaskInput, ctx: Context): Promise<{ success: boolean }>;
