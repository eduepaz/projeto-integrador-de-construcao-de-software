import pg from 'pg';
import { ENV } from '../../config/env.js';

export interface IDatabaseClient {
  query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }>;
  transaction<T>(fn: (client: IDatabaseClient) => Promise<T>): Promise<T>;
  isHealthy(): Promise<boolean>;
  close(): Promise<void>;
}

// Implementação em memória para resiliência local quando PostgreSQL não estiver em execução
class InMemoryDatabaseClient implements IDatabaseClient {
  private users = new Map<string, any>();
  private events = new Map<string, any>();
  private sessions = new Map<string, any>();
  private lots = new Map<string, any>();
  private seats = new Map<string, any>();
  private orders = new Map<string, any>();
  private orderItems = new Map<string, any>();
  private payments = new Map<string, any>();
  private outboxEvents = new Map<string, any>();
  private tickets = new Map<string, any>();
  private checkinLogs = new Map<string, any>();
  private processedEvents = new Set<string>();

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    const adminId = '11111111-1111-1111-1111-111111111111';
    const orgId = '22222222-2222-2222-2222-222222222222';
    const opId = '33333333-3333-3333-3333-333333333333';
    const clientId = '44444444-4444-4444-4444-444444444444';

    this.users.set(adminId, { id: adminId, nome: 'Admin PulsePass', email: 'admin@pulsepass.com', role: 'ADMIN' });
    this.users.set(orgId, { id: orgId, nome: 'Organizador Arena', email: 'organizador@arenapoa.com.br', role: 'ORGANIZER' });
    this.users.set(opId, { id: opId, nome: 'Operador Portaria 1', email: 'portaria@arenapoa.com.br', role: 'OPERATOR' });
    this.users.set(clientId, { id: clientId, nome: 'Lucas Oliveira', email: 'lucas@cliente.com', role: 'CLIENT' });

    const eventId1 = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const eventId2 = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

    this.events.set(eventId1, {
      id: eventId1,
      organizador_id: orgId,
      titulo: 'Final Libertadores 2026: Grêmio vs Flamengo',
      descricao: 'A grande decisão do continente ao vivo no estádio mais moderno do sul do Brasil.',
      local: 'Arena do Grêmio - Porto Alegre, RS',
      banner_url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2',
      status: 'PUBLICADO',
      criado_em: new Date(),
    });

    this.events.set(eventId2, {
      id: eventId2,
      organizador_id: orgId,
      titulo: 'Festival Pulse Sound 2026',
      descricao: 'Dois dias de música eletrônica, rock alternativo e experiências imersivas.',
      local: 'Estádio Beira-Rio - Porto Alegre, RS',
      banner_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745',
      status: 'PUBLICADO',
      criado_em: new Date(),
    });

    const sessionId1 = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    this.sessions.set(sessionId1, {
      id: sessionId1,
      evento_id: eventId1,
      data_inicio: new Date(Date.now() + 10 * 86400000),
      data_fim: new Date(Date.now() + 10 * 86400000 + 3 * 3600000),
    });

    const lotId1 = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
    this.lots.set(lotId1, {
      id: lotId1,
      sessao_id: sessionId1,
      nome: 'Lote 1 - Cadeira Inferior',
      preco_base: 350.00,
      capacidade_total: 5000,
      ingressos_vendidos: 120,
    });

    // Seed de Assentos
    const setores = ['Cadeira Inferior Leste', 'Cadeira Inferior Oeste', 'Camarote Central'];
    const linhas = ['A', 'B', 'C', 'D'];
    let seatIndex = 1;

    for (const setor of setores) {
      const preco = setor === 'Camarote Central' ? 850.00 : 350.00;
      for (const linha of linhas) {
        for (let num = 1; num <= 10; num++) {
          const seatId = `seat-${seatIndex++}`;
          this.seats.set(seatId, {
            id: seatId,
            sessao_id: sessionId1,
            setor,
            linha,
            numero: num,
            preco,
            status: 'AVAILABLE',
            held_ate: null,
            reserved_by_user_id: null,
          });
        }
      }
    }
  }

  async query<T = any>(text: string, params: any[] = []): Promise<{ rows: T[]; rowCount: number }> {
    const normalized = text.trim().toLowerCase();

    // Healthcheck
    if (normalized.includes('select 1')) {
      return { rows: [{ result: 1 } as any], rowCount: 1 };
    }

    // Listar Eventos
    if (normalized.startsWith('select') && normalized.includes('from eventos')) {
      return { rows: Array.from(this.events.values()) as any, rowCount: this.events.size };
    }

    // Listar Assentos da Sessão
    if (normalized.startsWith('select') && normalized.includes('from assentos')) {
      const sessionId = params[0];
      const result = Array.from(this.seats.values()).filter(
        s => !sessionId || s.sessao_id === sessionId
      );
      return { rows: result as any, rowCount: result.length };
    }

    // Buscar Pedido por ID
    if (normalized.startsWith('select') && normalized.includes('from pedidos') && normalized.includes('id =')) {
      const orderId = params[0];
      const order = this.orders.get(orderId);
      return { rows: order ? [order as any] : [], rowCount: order ? 1 : 0 };
    }

    // Buscar Pedido por Idempotency Key
    if (normalized.startsWith('select') && normalized.includes('from pedidos') && normalized.includes('idempotency_key =')) {
      const key = params[0];
      const order = Array.from(this.orders.values()).find(o => o.idempotency_key === key);
      return { rows: order ? [order as any] : [], rowCount: order ? 1 : 0 };
    }

    // Inserir Pedido
    if (normalized.startsWith('insert into pedidos')) {
      const [id, userId, idempotencyKey, valorTotal, status, expiresAt] = params;
      const order = {
        id,
        usuario_id: userId,
        idempotency_key: idempotencyKey,
        valor_total: valorTotal,
        status,
        expires_at: expiresAt,
        criado_em: new Date(),
        atualizado_em: new Date(),
      };
      this.orders.set(id, order);
      return { rows: [order as any], rowCount: 1 };
    }

    // Inserir Item do Pedido
    if (normalized.startsWith('insert into itens_pedido')) {
      const [id, pedidoId, assentoId, precoUnitario] = params;
      const item = { id, pedido_id: pedidoId, assento_id: assentoId, preco_unitario: precoUnitario };
      this.orderItems.set(id, item);
      return { rows: [item as any], rowCount: 1 };
    }

    // Buscar Itens do Pedido
    if (normalized.startsWith('select') && normalized.includes('from itens_pedido') && normalized.includes('pedido_id =')) {
      const orderId = params[0];
      const items = Array.from(this.orderItems.values()).filter(i => i.pedido_id === orderId);
      return { rows: items as any, rowCount: items.length };
    }

    // Inserir no Outbox
    if (normalized.startsWith('insert into outbox_events')) {
      const [id, aggregateType, aggregateId, eventType, payload] = params;
      const event = {
        id,
        aggregate_type: aggregateType,
        aggregate_id: aggregateId,
        event_type: eventType,
        payload: typeof payload === 'string' ? JSON.parse(payload) : payload,
        processed: false,
        criado_em: new Date(),
        processado_em: null,
      };
      this.outboxEvents.set(id, event);
      return { rows: [event as any], rowCount: 1 };
    }

    // Polling do Outbox Worker
    if (normalized.startsWith('select') && normalized.includes('from outbox_events') && normalized.includes('processed = false')) {
      const unprocessed = Array.from(this.outboxEvents.values()).filter(e => !e.processed);
      return { rows: unprocessed as any, rowCount: unprocessed.length };
    }

    // Atualizar Outbox para Processado
    if (normalized.startsWith('update outbox_events set processed = true')) {
      const id = params[0];
      const event = this.outboxEvents.get(id);
      if (event) {
        event.processed = true;
        event.processado_em = new Date();
      }
      return { rows: [], rowCount: event ? 1 : 0 };
    }

    // Atualizar Status do Pedido
    if (normalized.startsWith('update pedidos set status =')) {
      const [status, id] = params;
      const order = this.orders.get(id);
      if (order) {
        order.status = status;
        order.atualizado_em = new Date();
      }
      return { rows: order ? [order as any] : [], rowCount: order ? 1 : 0 };
    }

    // Inserir Ingresso
    if (normalized.startsWith('insert into ingressos')) {
      const [id, pedidoId, assentoId, userId, codigoResgate, qrCodeSig, pdfUrl, status] = params;
      const ticket = {
        id,
        pedido_id: pedidoId,
        assento_id: assentoId,
        usuario_id: userId,
        codigo_resgate: codigoResgate,
        qr_code_signature: qrCodeSig,
        pdf_url: pdfUrl,
        status: status || 'VALIDO',
        emitido_em: new Date(),
      };
      this.tickets.set(id, ticket);
      return { rows: [ticket as any], rowCount: 1 };
    }

    // Buscar Ingressos do Usuário
    if (normalized.startsWith('select') && normalized.includes('from ingressos') && normalized.includes('usuario_id =')) {
      const userId = params[0];
      const userTickets = Array.from(this.tickets.values()).filter(t => t.usuario_id === userId);
      return { rows: userTickets as any, rowCount: userTickets.length };
    }

    // Buscar Ingressos por Pedido
    if (normalized.startsWith('select') && normalized.includes('from ingressos') && normalized.includes('pedido_id =')) {
      const orderId = params[0];
      const orderTickets = Array.from(this.tickets.values()).filter(t => t.pedido_id === orderId);
      return { rows: orderTickets as any, rowCount: orderTickets.length };
    }

    // Buscar Ingresso por ID ou Código
    if (normalized.startsWith('select') && normalized.includes('from ingressos')) {
      const val = params[0];
      const ticket = Array.from(this.tickets.values()).find(t => t.id === val || t.codigo_resgate === val);
      return { rows: ticket ? [ticket as any] : [], rowCount: ticket ? 1 : 0 };
    }

    // Atualizar Ingresso para UTILIZADO
    if (normalized.startsWith('update ingressos set status =')) {
      const [status, id] = params;
      const ticket = this.tickets.get(id);
      if (ticket) ticket.status = status;
      return { rows: ticket ? [ticket as any] : [], rowCount: ticket ? 1 : 0 };
    }

    // Inserir Check-in Log
    if (normalized.startsWith('insert into checkin_logs')) {
      const [id, ingressoId, operadorId, resultado, dispositivoId] = params;
      const log = { id, ingresso_id: ingressoId, operador_id: operadorId, resultado, dispositivo_id: dispositivoId, lido_em: new Date() };
      this.checkinLogs.set(id, log);
      return { rows: [log as any], rowCount: 1 };
    }

    // Processed Events (Deduplicação Idempotente)
    if (normalized.startsWith('insert into processed_events')) {
      const [eventId, group] = params;
      const key = `${eventId}:${group}`;
      if (this.processedEvents.has(key)) {
        return { rows: [], rowCount: 0 };
      }
      this.processedEvents.add(key);
      return { rows: [{ event_id: eventId, consumer_group: group } as any], rowCount: 1 };
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

export class PostgresDatabaseClient implements IDatabaseClient {
  private pool: pg.Pool;

  constructor() {
    this.pool = new pg.Pool({
      connectionString: ENV.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
    const res = await this.pool.query(text, params);
    return { rows: res.rows, rowCount: res.rowCount ?? 0 };
  }

  async transaction<T>(fn: (client: IDatabaseClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const wrappedClient: IDatabaseClient = {
        query: async (text, params) => {
          const res = await client.query(text, params);
          return { rows: res.rows as any, rowCount: res.rowCount ?? 0 };
        },
        transaction: () => { throw new Error('Nested transactions not supported'); },
        isHealthy: async () => true,
        close: async () => {},
      };
      const result = await fn(wrappedClient);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const res = await this.pool.query('SELECT 1 as healthy');
      return res.rowCount !== null && res.rowCount > 0;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Cria cliente resiliente que tenta PostgreSQL e comuta transparentemente para InMemory se o banco não estiver acessível
class ResilientDatabaseClient implements IDatabaseClient {
  private pgClient = new PostgresDatabaseClient();
  private inMemoryClient = new InMemoryDatabaseClient();
  private useInMemory = false;
  private verified = false;

  private async getActiveClient(): Promise<IDatabaseClient> {
    if (!this.verified) {
      const pgHealthy = await this.pgClient.isHealthy();
      this.useInMemory = !pgHealthy;
      this.verified = true;
      if (this.useInMemory) {
        console.warn('⚠️ [Database] PostgreSQL inacessível na URL configurada. Ativando repositório in-memory para desenvolvimento ágil.');
      } else {
        console.log('✅ [Database] Conectado ao PostgreSQL com sucesso.');
      }
    }
    return this.useInMemory ? this.inMemoryClient : this.pgClient;
  }

  async query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
    const client = await this.getActiveClient();
    return await client.query<T>(text, params);
  }

  async transaction<T>(fn: (client: IDatabaseClient) => Promise<T>): Promise<T> {
    const client = await this.getActiveClient();
    return await client.transaction(fn);
  }

  async isHealthy(): Promise<boolean> {
    const client = await this.getActiveClient();
    return await client.isHealthy();
  }

  async close(): Promise<void> {
    await this.pgClient.close();
  }
}

export const db: IDatabaseClient = new ResilientDatabaseClient();
