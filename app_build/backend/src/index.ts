import http from 'http';
import { createApp } from './app.js';
import { ENV } from './config/env.js';
import { wsGateway } from './infrastructure/websocket/ws-server.js';
import { OutboxPublisherWorker } from './infrastructure/messaging/outbox-publisher.js';
import { db } from './infrastructure/database/db-client.js';
import { eventBroker } from './infrastructure/messaging/kafka-client.js';

const app = createApp();
const server = http.createServer(app);

// Inicializa o Gateway WebSocket para telemetria e updates de assentos
wsGateway.initialize(server);

// Inicializa o Outbox Publisher Worker em segundo plano (SELECT FOR UPDATE SKIP LOCKED)
const outboxWorker = new OutboxPublisherWorker(db, eventBroker, 2000);
outboxWorker.start();

const PORT = ENV.PORT;

server.listen(PORT, () => {
  console.log(`
=====================================================
🚀 PulsePass Backend v2.0.0 Online!
📍 API HTTP:        http://localhost:${PORT}/api/v1
🔍 Healthcheck:     http://localhost:${PORT}/health
🔌 WebSocket Gateway: ws://localhost:${PORT}/ws
📦 Modo de Execução: ${ENV.NODE_ENV}
=====================================================
  `);
});

process.on('SIGTERM', async () => {
  console.log('Finalizando serviços com segurança (SIGTERM)...');
  outboxWorker.stop();
  await db.close();
  server.close(() => process.exit(0));
});

process.on('SIGINT', async () => {
  console.log('Finalizando serviços com segurança (SIGINT)...');
  outboxWorker.stop();
  await db.close();
  server.close(() => process.exit(0));
});
