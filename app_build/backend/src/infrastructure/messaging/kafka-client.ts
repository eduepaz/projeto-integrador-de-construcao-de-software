import { Kafka, Producer, Consumer, logLevel } from 'kafkajs';
import crypto from 'crypto';
import { ENV } from '../../config/env.js';

process.env.KAFKAJS_NO_PARTITIONER_WARNING = '1';

export const TOPICS = {
  RESERVATIONS: 'reservations.events',
  ORDERS: 'orders.events',
  PAYMENTS: 'payments.events',
  TICKETS: 'tickets.events',
  TELEMETRY: 'telemetry.events',
} as const;

export interface CloudEvent<T = any> {
  specversion: '1.0';
  id: string;
  source: string;
  type: string;
  datacontenttype: 'application/json';
  time: string;
  correlation_id: string;
  data: T;
}

export type EventHandler<T = any> = (event: CloudEvent<T>) => Promise<void>;

export class EventBroker {
  private kafka: Kafka | null = null;
  private producer: Producer | null = null;
  private isConnected = false;
  private connectionAttempted = false;
  private localSubscribers = new Map<string, EventHandler[]>();

  constructor() {
    this.tryConnect();
  }

  private tryConnect() {
    if (this.connectionAttempted) return;
    this.connectionAttempted = true;

    try {
      this.kafka = new Kafka({
        clientId: ENV.KAFKA_CLIENT_ID,
        brokers: ENV.KAFKA_BROKERS,
        connectionTimeout: 1500,
        retry: { retries: 0 },
        logLevel: logLevel.NOTHING,
      });

      this.producer = this.kafka.producer({
        idempotent: true,
        maxInFlightRequests: 1,
      });

      this.producer.connect()
        .then(() => {
          this.isConnected = true;
          console.log('✅ [Kafka] Conectado ao cluster Apache Kafka com sucesso.');
        })
        .catch(() => {
          this.isConnected = false;
          console.warn('⚠️ [Kafka] Cluster Kafka indisponível. Utilizando EventBroker assíncrono in-memory.');
        });
    } catch {
      this.isConnected = false;
    }
  }

  public createCloudEvent<T>(type: string, data: T, correlationId?: string): CloudEvent<T> {
    return {
      specversion: '1.0',
      id: crypto.randomUUID(),
      source: '/pulsepass/backend',
      type,
      datacontenttype: 'application/json',
      time: new Date().toISOString(),
      correlation_id: correlationId || `corr-${crypto.randomUUID().slice(0, 8)}`,
      data,
    };
  }

  /**
   * Publica mensagem no Kafka com garantia acks=all (ou no broker in-memory)
   */
  public async publish<T>(topic: string, key: string, event: CloudEvent<T>): Promise<boolean> {
    const serialized = JSON.stringify(event);

    if (this.isConnected && this.producer) {
      try {
        await this.producer.send({
          topic,
          acks: -1, // acks=all
          messages: [{ key, value: serialized }],
        });
        return true;
      } catch (err) {
        console.error(`Falha ao despachar mensagem ao Kafka (${topic}):`, err);
      }
    }

    // Despacho no barramento local in-memory
    const subscribers = this.localSubscribers.get(topic) || [];
    for (const handler of subscribers) {
      setImmediate(() => handler(event).catch(console.error));
    }
    return true;
  }

  /**
   * Registra um handler consumidor para determinado tópico
   */
  public subscribe<T>(topic: string, handler: EventHandler<T>): void {
    const current = this.localSubscribers.get(topic) || [];
    current.push(handler as EventHandler);
    this.localSubscribers.set(topic, current);
  }
}

export const eventBroker = new EventBroker();
