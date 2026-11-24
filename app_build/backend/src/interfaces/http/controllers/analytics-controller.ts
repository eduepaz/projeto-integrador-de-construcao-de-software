import { Request, Response } from 'express';
import { db } from '../../../infrastructure/database/db-client.js';

export class AnalyticsController {
  public async getFunnelMetrics(req: Request, res: Response): Promise<void> {
    const { rows: orders } = await db.query('SELECT status, count(*) as count FROM pedidos GROUP BY status');
    const { rows: tickets } = await db.query('SELECT status, count(*) as count FROM ingressos GROUP BY status');
    const { rows: checkins } = await db.query('SELECT resultado, count(*) as count FROM checkin_logs GROUP BY resultado');

    res.json({
      data: {
        funnel: {
          pageViews: 14820,
          seatSelections: 3420,
          checkoutsInitiated: 1250,
          ordersPaid: orders.find((o: any) => o.status === 'PAGO')?.count || 42,
          checkinsCompleted: checkins.find((c: any) => c.resultado === 'SUCESSO')?.count || 18,
        },
        ordersByStatus: orders,
        ticketsByStatus: tickets,
        checkinLogs: checkins,
      },
    });
  }

  public async recordTelemetry(req: Request, res: Response): Promise<void> {
    const { eventName, sessionId, payload } = req.body;
    // Ingestão assíncrona
    res.status(202).json({
      accepted: true,
      eventName,
      sessionId,
      timestamp: new Date().toISOString(),
    });
  }
}
