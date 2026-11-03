import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { parse } from 'yaml';

const SPEC_PATH = path.resolve(process.cwd(), 'docs', 'openapi.yaml');

export function buildApiDocsRouter(): Router {
  const spec = parse(fs.readFileSync(SPEC_PATH, 'utf8'));
  const router = Router();

  router.get('/openapi.json', (_req, res) => {
    res.json(spec);
  });
  router.use('/', swaggerUi.serve, swaggerUi.setup(spec));

  return router;
}