const API_BASE = '/api/v1';

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface ApiSeat {
  id: string;
  sessao_id: string;
  setor: string;
  linha: string;
  numero: number;
  preco: number;
  status: 'AVAILABLE' | 'HELD' | 'SOLD' | 'BLOCKED';
  isLocked?: boolean;
  lockedBy?: string | null;
}

export interface ApiEvent {
  id: string;
  organizador_id: string;
  titulo: string;
  descricao: string;
  local: string;
  banner_url: string;
  status: string;
}

export const api = {
  async getEvents(): Promise<ApiEvent[]> {
    const res = await fetch(`${API_BASE}/catalog/events`);
    const json = await res.json();
    return json.data || [];
  },

  async getSeats(sessionId: string): Promise<ApiSeat[]> {
    const res = await fetch(`${API_BASE}/catalog/sessions/${sessionId}/seats`);
    const json = await res.json();
    return json.data || [];
  },

  async reserveSeat(seatId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/seats/reserve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seatId }),
    });
    return await res.json();
  },

  async releaseSeat(seatId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/seats/release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seatId }),
    });
    return await res.json();
  },

  async checkout(items: any[], idempotencyKey?: string): Promise<any> {
    const key = idempotencyKey || generateUUID();
    const res = await fetch(`${API_BASE}/orders/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': key,
      },
      body: JSON.stringify({ items }),
    });
    return await res.json();
  },

  async simulatePayment(orderId: string, valor: number, metodo: 'PIX' | 'CARTAO_CREDITO' = 'PIX'): Promise<any> {
    const res = await fetch(`${API_BASE}/payments/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        valor,
        metodoPagamento: metodo,
        gatewayTransactionId: `GW-${Date.now()}`,
      }),
    });
    return await res.json();
  },

  async getMyTickets(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/tickets`);
    const json = await res.json();
    return json.data || [];
  },

  async checkin(qrCode: string, dispositivoId: string = 'TERMINAL_PORTAO_1'): Promise<any> {
    const res = await fetch(`${API_BASE}/tickets/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrCode, dispositivoId }),
    });
    return await res.json();
  },

  async getAnalytics(): Promise<any> {
    const res = await fetch(`${API_BASE}/analytics/funnel`);
    const json = await res.json();
    return json.data || null;
  },
};
