
import { initTRPC, TRPCError } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { 
  registerInputSchema, 
  loginInputSchema, 
  createTaskInputSchema, 
  updateTaskInputSchema, 
  deleteTaskInputSchema, 
  getTasksInputSchema,
  type Context 
} from './schema';
import { register } from './handlers/register';
import { login } from './handlers/login';
import { createTask } from './handlers/create_task';
import { getTasks } from './handlers/get_tasks';
import { updateTask } from './handlers/update_task';
import { deleteTask } from './handlers/delete_task';
import { getUserProfile } from './handlers/get_user_profile';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

// Simple token verification function (replace with proper JWT implementation)
function verifyToken(token: string): { userId: number } | null {
  try {
    // This is a simplified implementation - in production, use proper JWT
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    if (decoded && typeof decoded.userId === 'number') {
      return { userId: decoded.userId };
    }
  } catch (error) {
    // Invalid token
  }
  return null;
}

// Middleware for authenticated routes
const authenticatedProcedure = publicProcedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }
  return next({
    ctx: {
      userId: ctx.userId,
    },
  });
});

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Auth routes
  register: publicProcedure
    .input(registerInputSchema)
    .mutation(({ input }) => register(input)),

  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => login(input)),

  // User routes
  getUserProfile: authenticatedProcedure
    .query(({ ctx }) => getUserProfile(ctx)),

  // Task routes
  createTask: authenticatedProcedure
    .input(createTaskInputSchema)
    .mutation(({ input, ctx }) => createTask(input, ctx)),

  getTasks: authenticatedProcedure
    .input(getTasksInputSchema)
    .query(({ input, ctx }) => getTasks(input, ctx)),

  updateTask: authenticatedProcedure
    .input(updateTaskInputSchema)
    .mutation(({ input, ctx }) => updateTask(input, ctx)),

  deleteTask: authenticatedProcedure
    .input(deleteTaskInputSchema)
    .mutation(({ input, ctx }) => deleteTask(input, ctx)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext({ req }) {
      const authHeader = req.headers.authorization;
      let userId: number | undefined;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = verifyToken(token);
        if (decoded) {
          userId = decoded.userId;
        }
      }

      return { userId };
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
