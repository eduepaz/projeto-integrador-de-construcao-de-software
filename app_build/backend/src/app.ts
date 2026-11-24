import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { correlationIdMiddleware } from './application/middleware/correlation-id-middleware.js';
import { createApiRouter } from './interfaces/http/routes.js';
import { db } from './infrastructure/database/db-client.js';

export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(correlationIdMiddleware);

  // Healthcheck endpoint para Docker e Kubernetes
  app.get('/health', async (_req: Request, res: Response) => {
    const dbHealthy = await db.isHealthy();
    const status = dbHealthy ? 'healthy' : 'degraded';
    const httpStatus = dbHealthy ? 200 : 503;

    res.status(httpStatus).json({
      status,
      timestamp: new Date().toISOString(),
      service: 'pulsepass-backend',
      version: '2.0.0',
      checks: {
        database: dbHealthy ? 'up' : 'down',
      },
    });
  });

  // Prefixo de APIs v1
  app.use('/api/v1', createApiRouter());

  return app;
}
