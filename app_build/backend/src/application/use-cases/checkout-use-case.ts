import crypto from 'crypto';
import { IDatabaseClient } from '../../infrastructure/database/db-client.js';
import { OrderStateMachine } from '../../domain/order/order-fsm.js';
import { wsGateway } from '../../infrastructure/websocket/ws-server.js';

export interface CheckoutInput {
  userId: string;
  idempotencyKey: string;
  items: Array<{
    seatId: string;
    preco: number;
    setor: string;
    linha: string;
    numero: number;
  }>;
}

export interface CheckoutOutput {
  orderId: string;
  userId: string;
  valorTotal: number;
  status: string;
  expiresAt: string;
  itemsCount: number;
  message: string;
}

export class CheckoutUseCase {
  constructor(private readonly db: IDatabaseClient) {}

  public async execute(input: CheckoutInput): Promise<CheckoutOutput> {
    if (!input.items || input.items.length === 0) {
      throw new Error('Nenhum assento selecionado para o pedido.');
    }

    // Verifica se já existe pedido para esta chave de idempotência
    const { rows: existingOrder } = await this.db.query(
      'SELECT id, usuario_id, idempotency_key, valor_total, status, expires_at FROM pedidos WHERE idempotency_key = $1',
      [input.idempotencyKey]
    );

    if (existingOrder.length > 0) {
      const ord = existingOrder[0];
      return {
        orderId: ord.id,
        userId: ord.usuario_id,
        valorTotal: Number(ord.valor_total),
        status: ord.status,
        expiresAt: new Date(ord.expires_at).toISOString(),
        itemsCount: input.items.length,
        message: 'Pedido recuperado com sucesso via Idempotency-Key.',
      };
    }

    const orderId = crypto.randomUUID();
    const fsm = new OrderStateMachine('RESERVADO');
    const valorTotal = input.items.reduce((acc, curr) => acc + Number(curr.preco), 0);
    const expiresAt = fsm.expiresAt;

    // Execução da Transação ACID unificada (Pedido + Itens + Outbox)
    await this.db.transaction(async (tx) => {
      // 1. Criação do Pedido
      await tx.query(
        `INSERT INTO pedidos (id, usuario_id, idempotency_key, valor_total, status, expires_at, criado_em, atualizado_em)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [orderId, input.userId, input.idempotencyKey, valorTotal, fsm.status, expiresAt]
      );

      // 2. Inserção dos Itens do Pedido
      for (const item of input.items) {
        const itemId = crypto.randomUUID();
        await tx.query(
          `INSERT INTO itens_pedido (id, pedido_id, assento_id, preco_unitario)
           VALUES ($1, $2, $3, $4)`,
          [itemId, orderId, item.seatId, item.preco]
        );
      }

      // 3. Persistência Atômica do Evento no Transactional Outbox
      const outboxId = crypto.randomUUID();
      const outboxPayload = {
        order_id: orderId,
        user_id: input.userId,
        status: fsm.status,
        valor_total: valorTotal,
        expires_at: expiresAt.toISOString(),
        items: input.items,
      };

      await tx.query(
        `INSERT INTO outbox_events (id, aggregate_type, aggregate_id, event_type, payload, processed, criado_em)
         VALUES ($1, $2, $3, $4, $5, FALSE, NOW())`,
        [outboxId, 'Order', orderId, 'com.pulsepass.order.created', JSON.stringify(outboxPayload)]
      );
    });

    // Notificação em tempo real via WebSocket
    wsGateway.broadcast('ORDER_CREATED', {
      orderId,
      userId: input.userId,
      status: fsm.status,
      expiresAt: expiresAt.toISOString(),
    });

    return {
      orderId,
      userId: input.userId,
      valorTotal,
      status: fsm.status,
      expiresAt: expiresAt.toISOString(),
      itemsCount: input.items.length,
      message: 'Reserva e pedido criados com sucesso. Expiração estrita em 10 minutos.',
    };
  }
}
