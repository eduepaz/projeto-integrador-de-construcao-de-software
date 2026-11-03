import { Request, Response } from 'express';
import { db } from '../../../infrastructure/database/db-client.js';
import { CheckoutUseCase } from '../../../application/use-cases/checkout-use-case.js';
import { PaymentWebhookUseCase } from '../../../application/use-cases/payment-webhook-use-case.js';
import { TicketIssuanceUseCase } from '../../../application/use-cases/ticket-issuance-use-case.js';

export class CheckoutController {
  private checkoutUseCase = new CheckoutUseCase(db);
  private ticketIssuer = new TicketIssuanceUseCase(db);
  private paymentWebhookUseCase = new PaymentWebhookUseCase(db, this.ticketIssuer);

  public async checkout(req: Request, res: Response): Promise<void> {
    const idempotencyKey = req.headers['idempotency-key'] as string;
    const userId = req.user?.id || '44444444-4444-4444-4444-444444444444';
    const { items } = req.body;

    try {
      const result = await this.checkoutUseCase.execute({
        userId,
        idempotencyKey,
        items,
      });

      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Falha ao processar checkout.' });
    }
  }

  public async getOrder(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { rows } = await db.query('SELECT * FROM pedidos WHERE id = $1', [id]);

    if (!rows.length) {
      res.status(404).json({ error: 'Pedido não encontrado.' });
      return;
    }

    res.json({ data: rows[0] });
  }

  public async paymentWebhook(req: Request, res: Response): Promise<void> {
    const { orderId, gatewayTransactionId, metodoPagamento, valor } = req.body;

    try {
      const result = await this.paymentWebhookUseCase.execute({
        orderId,
        gatewayTransactionId: gatewayTransactionId || `GW-${Date.now()}`,
        metodoPagamento: metodoPagamento || 'PIX',
        valor: Number(valor) || 350.00,
      });

      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Falha ao processar liquidação.' });
    }
  }
}
