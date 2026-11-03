import { Request, Response } from 'express';
import { db } from '../../../infrastructure/database/db-client.js';
import { redisClient } from '../../../infrastructure/cache/redis-client.js';
import { SeatLockManager } from '../../../domain/seat/seat-lock.js';
import { wsGateway } from '../../../infrastructure/websocket/ws-server.js';

export class CatalogController {
  private lockManager = new SeatLockManager(redisClient);

  public async getEvents(req: Request, res: Response): Promise<void> {
    const { rows } = await db.query('SELECT * FROM eventos WHERE status = $1', ['PUBLICADO']);
    res.json({ data: rows });
  }

  public async getSeats(req: Request, res: Response): Promise<void> {
    const { sessionId } = req.params;
    const { rows: seats } = await db.query(
      'SELECT id, sessao_id, setor, linha, numero, preco, status FROM assentos WHERE sessao_id = $1',
      [sessionId]
    );

    // Sobrescreve status com o estado em tempo real do Redis Lock
    const enrichedSeats = await Promise.all(
      seats.map(async (seat: any) => {
        const isLocked = await this.lockManager.isLocked(seat.id);
        const holder = isLocked ? await this.lockManager.getLockHolder(seat.id) : null;

        let dynamicStatus = seat.status;
        if (dynamicStatus === 'AVAILABLE' && isLocked) {
          dynamicStatus = 'HELD';
        }

        return {
          ...seat,
          status: dynamicStatus,
          isLocked,
          lockedBy: holder,
        };
      })
    );

    res.json({ data: enrichedSeats });
  }

  public async reserveSeat(req: Request, res: Response): Promise<void> {
    const { seatId } = req.body;
    const userId = req.user?.id || '44444444-4444-4444-4444-444444444444';

    if (!seatId) {
      res.status(400).json({ error: 'Parâmetro seatId é obrigatório.' });
      return;
    }

    // Tenta obter lock atômico de 10 min (600s) no Redis
    const locked = await this.lockManager.acquireLock(seatId, userId);

    if (!locked) {
      res.status(409).json({
        error: 'Conflito de Concorrência: Este assento acabou de ser selecionado por outro cliente.',
      });
      return;
    }

    // Notifica outros clientes via WebSocket
    wsGateway.broadcast('SEAT_LOCKED', {
      seatId,
      userId,
      expiresInSeconds: 600,
    });

    res.json({
      success: true,
      seatId,
      userId,
      expiresInSeconds: 600,
      message: 'Lock atômico adquirido com sucesso! Você tem 10 minutos para concluir o checkout.',
    });
  }

  public async releaseSeat(req: Request, res: Response): Promise<void> {
    const { seatId } = req.body;
    const userId = req.user?.id || '44444444-4444-4444-4444-444444444444';

    await this.lockManager.releaseLock(seatId, userId, true);

    wsGateway.broadcast('SEAT_RELEASED', { seatId });

    res.json({ success: true, message: 'Lock do assento liberado com sucesso.' });
  }
}
