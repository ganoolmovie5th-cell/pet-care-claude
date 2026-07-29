import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
    user?: { uid: string };
  }
}
