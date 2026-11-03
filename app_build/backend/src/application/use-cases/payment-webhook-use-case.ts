import crypto from 'crypto';
import { IDatabaseClient } from '../../infrastructure/database/db-client.js';
import { OrderStateMachine } from '../../domain/order/order-fsm.js';
import { wsGateway } from '../../infrastructure/websocket/ws-server.js';
import { TicketIssuanceUseCase } from './ticket-issuance-use-case.js';

export interface PaymentWebhookInput {
  orderId: string;
  gatewayTransactionId: string;
  metodoPagamento: 'PIX' | 'CARTAO_CREDITO';
  valor: number;
}

export class PaymentWebhookUseCase {
  constructor(
    private readonly db: IDatabaseClient,
    private readonly ticketIssuer: TicketIssuanceUseCase
  ) {}

  public async execute(input: PaymentWebhookInput): Promise<{ success: boolean; status: string; paymentId: string }> {
    const { rows: orders } = await this.db.query(
      'SELECT id, usuario_id, status, valor_total, expires_at FROM pedidos WHERE id = $1',
      [input.orderId]
    );

    if (!orders.length) {
      throw new Error(`Pedido com ID '${input.orderId}' não encontrado.`);
    }

    const order = orders[0];
    const fsm = new OrderStateMachine(order.status, new Date(order.expires_at));

    // Se já estiver pago, retorna idempotente
    if (fsm.status === 'PAGO') {
      return { success: true, status: 'PAGO', paymentId: 'ALREADY_PROCESSED' };
    }

    // Avança FSM para PAGO
    fsm.markAsPaid('Pagamento liquidado via webhook do gateway');

    const paymentId = crypto.randomUUID();

    await this.db.transaction(async (tx) => {
      // 1. Atualizar status do pedido
      await tx.query(
        'UPDATE pedidos SET status = $1, atualizado_em = NOW() WHERE id = $2',
        [fsm.status, input.orderId]
      );

      // 2. Registrar Pagamento
      await tx.query(
        `INSERT INTO pagamentos (id, pedido_id, gateway_transaction_id, metodo_pagamento, valor, status, processado_em)
         VALUES ($1, $2, $3, $4, $5, 'APROVADO', NOW())`,
        [paymentId, input.orderId, input.gatewayTransactionId, input.metodoPagamento, input.valor]
      );

      // 3. Persistir Evento PaymentApproved no Outbox
      const outboxId = crypto.randomUUID();
      const outboxPayload = {
        payment_id: paymentId,
        order_id: input.orderId,
        user_id: order.usuario_id,
        metodo_pagamento: input.metodoPagamento,
        valor: input.valor,
        gateway_transaction_id: input.gatewayTransactionId,
      };

      await tx.query(
        `INSERT INTO outbox_events (id, aggregate_type, aggregate_id, event_type, payload, processed, criado_em)
         VALUES ($1, $2, $3, $4, $5, FALSE, NOW())`,
        [outboxId, 'Payment', input.orderId, 'com.pulsepass.payment.approved', JSON.stringify(outboxPayload)]
      );
    });

    // Notificação em tempo real
    wsGateway.broadcast('PAYMENT_APPROVED', {
      orderId: input.orderId,
      paymentId,
      valor: input.valor,
    });

    // Emissão do Ingresso
    await this.ticketIssuer.issueTicketForOrder(input.orderId, order.usuario_id);

    return { success: true, status: fsm.status, paymentId };
  }
}
