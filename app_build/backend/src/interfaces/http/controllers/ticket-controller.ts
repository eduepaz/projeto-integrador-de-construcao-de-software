import { Request, Response } from 'express';
import { db } from '../../../infrastructure/database/db-client.js';
import { CheckinValidationUseCase } from '../../../application/use-cases/checkin-validation-use-case.js';

export class TicketController {
  private checkinUseCase = new CheckinValidationUseCase(db);

  public async getMyTickets(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id || '44444444-4444-4444-4444-444444444444';
    const { rows } = await db.query(
      `SELECT i.*, a.setor, a.linha, a.numero, e.titulo as evento_titulo
       FROM ingressos i
       LEFT JOIN assentos a ON a.id = i.assento_id
       LEFT JOIN sessoes s ON s.id = a.sessao_id
       LEFT JOIN eventos e ON e.id = s.evento_id
       WHERE i.usuario_id = $1`,
      [userId]
    );

    res.json({ data: rows });
  }

  public async getTicketById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { rows } = await db.query('SELECT * FROM ingressos WHERE id = $1', [id]);

    if (!rows.length) {
      res.status(404).json({ error: 'Ingresso não encontrado.' });
      return;
    }

    res.json({ data: rows[0] });
  }

  public async checkin(req: Request, res: Response): Promise<void> {
    const { qrCode, dispositivoId } = req.body;
    const operadorId = req.user?.id || '33333333-3333-3333-3333-333333333333';

    if (!qrCode) {
      res.status(400).json({ error: 'QR Code obrigatório para leitura de portaria.' });
      return;
    }

    const result = await this.checkinUseCase.execute({
      qrCode,
      operadorId,
      dispositivoId: dispositivoId || 'CATRACA_PORTAO_A_01',
    });

    const statusCode = result.sucesso ? 200 : 400;
    res.status(statusCode).json(result);
  }
}
