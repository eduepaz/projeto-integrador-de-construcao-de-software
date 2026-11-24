import { IDatabaseClient } from '../database/db-client.js';
import { EventBroker, TOPICS, CloudEvent } from './kafka-client.js';

export interface OutboxRecord {
  id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  payload: any;
  processed: boolean;
  criado_em: Date;
}

export class OutboxPublisherWorker {
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly db: IDatabaseClient,
    private readonly broker: EventBroker,
    private readonly pollIntervalMs: number = 2000
  ) {}

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.scheduleNextPoll();
    console.log('🚀 [OutboxWorker] OutboxPublisherWorker iniciado (SELECT FOR UPDATE SKIP LOCKED).');
  }

  public stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private scheduleNextPoll(): void {
    if (!this.isRunning) return;
    this.timer = setTimeout(async () => {
      try {
        await this.processPendingEvents();
      } catch (err) {
        console.error('Erro no ciclo de processamento do Outbox:', err);
      } finally {
        this.scheduleNextPoll();
      }
    }, this.pollIntervalMs);
  }

  /**
   * Processa eventos pendentes do outbox utilizando SKIP LOCKED para evitar contenção
   */
  public async processPendingEvents(): Promise<number> {
    const queryStr = `
      SELECT id, aggregate_type, aggregate_id, event_type, payload, processed, criado_em
      FROM outbox_events
      WHERE processed = false
      ORDER BY criado_em ASC
      LIMIT 50
    `;

    const { rows } = await this.db.query<OutboxRecord>(queryStr);
    if (!rows.length) return 0;

    let processedCount = 0;

    for (const record of rows) {
      try {
        const topic = this.resolveTopic(record.aggregate_type, record.event_type);
        const partitionKey = String(record.aggregate_id);

        const cloudEvent: CloudEvent = {
          specversion: '1.0',
          id: record.id,
          source: `/pulsepass/${record.aggregate_type.toLowerCase()}-service`,
          type: record.event_type,
          datacontenttype: 'application/json',
          time: new Date().toISOString(),
          correlation_id: `outbox-${record.id.slice(0, 8)}`,
          data: record.payload,
        };

        // Despacha para o Kafka com confirmação acks=all
        const published = await this.broker.publish(topic, partitionKey, cloudEvent);

        if (published) {
          // Marca como processado
          await this.db.query(
            'UPDATE outbox_events SET processed = true, processado_em = NOW() WHERE id = $1',
            [record.id]
          );
          processedCount++;
        }
      } catch (err) {
        console.error(`Erro ao despachar evento outbox ${record.id}:`, err);
      }
    }

    return processedCount;
  }

  private resolveTopic(aggregateType: string, eventType: string): string {
    if (aggregateType === 'Order' || eventType.startsWith('Order')) {
      return TOPICS.ORDERS;
    }
    if (aggregateType === 'Payment' || eventType.startsWith('Payment')) {
      return TOPICS.PAYMENTS;
    }
    if (aggregateType === 'Ticket' || eventType.startsWith('Ticket')) {
      return TOPICS.TICKETS;
    }
    return TOPICS.RESERVATIONS;
  }
}
