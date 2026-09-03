import express, { Express } from 'express';
import { errorHandler } from './middlewares/errorHandler';
import { buildRouter, RouterDependencies } from './routes';

export function createApp(dependencies: RouterDependencies): Express {
  const app = express();
  app.use(express.json());
  app.use('/api', buildRouter(dependencies));
  app.use(errorHandler); // Siempre al final, después de todas las rutas.
  return app;
}