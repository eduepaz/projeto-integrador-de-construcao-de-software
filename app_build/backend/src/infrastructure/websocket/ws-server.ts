import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

export interface WsMessage {
  type: string;
  payload: any;
  timestamp: string;
}

export class RealtimeWsGateway {
  private wss: WebSocketServer | null = null;
  private clients = new Set<WebSocket>();

  public initialize(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);
      console.log(`🔌 [WebSocket] Cliente conectado. Total ativos: ${this.clients.size}`);

      // Mensagem de boas-vindas
      ws.send(JSON.stringify({
        type: 'SYSTEM_CONNECTED',
        payload: { message: 'Conectado ao barramento em tempo real do PulsePass' },
        timestamp: new Date().toISOString()
      }));

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`🔌 [WebSocket] Cliente desconectado. Total ativos: ${this.clients.size}`);
      });

      ws.on('error', (err) => {
        console.error('Erro na conexão WebSocket:', err);
      });
    });
  }

  public broadcast(type: string, payload: any): void {
    const message: WsMessage = {
      type,
      payload,
      timestamp: new Date().toISOString(),
    };

    const data = JSON.stringify(message);

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  public getActiveClientsCount(): number {
    return this.clients.size;
  }
}

export const wsGateway = new RealtimeWsGateway();
