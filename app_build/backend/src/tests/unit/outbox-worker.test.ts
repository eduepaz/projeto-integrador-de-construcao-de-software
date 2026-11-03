import { describe, it, expect } from 'vitest';
import { OutboxPublisherWorker } from '../../infrastructure/messaging/outbox-publisher.js';
import { EventBroker } from '../../infrastructure/messaging/kafka-client.js';
import { IDatabaseClient } from '../../infrastructure/database/db-client.js';

class MockDatabaseClient implements IDatabaseClient {
  public outboxRecords: any[] = [];

  async query<T = any>(text: string, params: any[] = []): Promise<{ rows: T[]; rowCount: number }> {
    const normalized = text.trim().toLowerCase();

    if (normalized.includes('select') && normalized.includes('from outbox_events') && normalized.includes('processed = false')) {
      const unprocessed = this.outboxRecords.filter(r => !r.processed);
      return { rows: unprocessed as any, rowCount: unprocessed.length };
    }

    if (normalized.startsWith('update outbox_events set processed = true')) {
      const id = params[0];
      const record = this.outboxRecords.find(r => r.id === id);
      if (record) {
        record.processed = true;
        record.processado_em = new Date();
      }
      return { rows: [], rowCount: record ? 1 : 0 };
    }

    return { rows: [], rowCount: 0 };
  }

  async transaction<T>(fn: (client: IDatabaseClient) => Promise<T>): Promise<T> {
    return await fn(this);
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }

  async close(): Promise<void> {}
}

describe('OutboxPublisherWorker (Transactional Outbox Pattern)', () => {
  it('deve buscar eventos pendentes, despachar para o broker e marcar como processado', async () => {
    const db = new MockDatabaseClient();
    const broker = new EventBroker();

    db.outboxRecords = [
      {
        id: 'outbox-1',
        aggregate_type: 'Order',
        aggregate_id: 'order-123',
        event_type: 'com.pulsepass.order.created',
        payload: { order_id: 'order-123', status: 'RESERVADO' },
        processed: false,
        criado_em: new Date(),
      },
      {
        id: 'outbox-2',
        aggregate_type: 'Payment',
        aggregate_id: 'payment-456',
        event_type: 'com.pulsepass.payment.approved',
        payload: { payment_id: 'payment-456', order_id: 'order-123' },
        processed: false,
        criado_em: new Date(),
      },
    ];

    const worker = new OutboxPublisherWorker(db, broker, 5000);

    const processedCount = await worker.processPendingEvents();
    expect(processedCount).toBe(2);

    expect(db.outboxRecords[0].processed).toBe(true);
    expect(db.outboxRecords[0].processado_em).toBeDefined();

    expect(db.outboxRecords[1].processed).toBe(true);
    expect(db.outboxRecords[1].processado_em).toBeDefined();
  });
});
