import { IDatabaseClient } from '../database/db-client.js';

export class IdempotentConsumer {
  constructor(private readonly db: IDatabaseClient) {}

  /**
   * Tenta registrar o evento como processado. Retorna true se for um evento novo,
   * ou false se já tiver sido processado anteriormente (duplicado descartado).
   */
  public async tryProcessEvent(eventId: string, consumerGroup: string): Promise<boolean> {
    try {
      const result = await this.db.query(
        `INSERT INTO processed_events (event_id, consumer_group, processed_at)
         VALUES ($1, $2, NOW())`,
        [eventId, consumerGroup]
      );
      return result.rowCount > 0;
    } catch (err: any) {
      // Violação de chave primária duplicada (Postgres code 23505)
      if (err.code === '23505' || err.message?.includes('duplicate key')) {
        return false;
      }
      return false;
    }
  }
}
