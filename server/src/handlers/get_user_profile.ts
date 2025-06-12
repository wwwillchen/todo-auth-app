
import { type User, type Context } from '../schema';

export declare function getUserProfile(ctx: Context): Promise<Omit<User, 'password_hash'>>;
