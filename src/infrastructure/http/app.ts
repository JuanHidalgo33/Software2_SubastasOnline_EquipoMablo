import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { config } from '../config';
import { errorHandler } from './middlewares/errorHandler';
import { buildRouter, RouterDependencies } from './routes';

export function createApp(dependencies: RouterDependencies): Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin }));
  app.use(
    rateLimit({
      windowMs: config.rateLimitWindowMs,
      limit: config.rateLimitMax,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests, please try again later.' },
    }),
  );
  app.use(express.json());

  app.use('/api', buildRouter(dependencies));

  app.use(errorHandler); 
  return app;
}