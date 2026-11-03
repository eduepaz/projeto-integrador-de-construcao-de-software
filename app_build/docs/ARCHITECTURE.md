# PulsePass Architecture & Implementation Guide (Pacote 2)

## 1. Visão Geral da Arquitetura
A plataforma PulsePass foi implementada para garantir **Zero Overselling**, **Atomicidade ACID** nas transações de compra e **Eliminação do Dual-Write Dilemma** via **Transactional Outbox**.

### Componentes Principais (`app_build/backend/src/`):
- **Domain Layer (`domain/`)**:
  - `OrderStateMachine`: Máquina de Estados Finitos com transições rigorosas (`CRIADO` -> `RESERVADO` -> `AGUARDANDO_PAGAMENTO` -> `PAGO` / `EXPIRADO` / `CANCELADO`).
  - `SeatLockManager`: Locks atômicos distribuídos no Redis com comando `SET seat:{id}:lock {user_id} NX PX 600000` (TTL 10 minutos).
  - `HmacSigner`: Assinatura criptográfica HMAC-SHA256 de bilhetes digitais com QR Code e validação em menos de 300ms.
- **Infrastructure Layer (`infrastructure/`)**:
  - `PostgresPool`: Pool relacional com suporte à cláusula `SELECT FOR UPDATE SKIP LOCKED` e transações unificadas.
  - `RedisClient`: Conexão com Redis e suporte a fallback em memória para execução local imediata.
  - `KafkaBroker`: Publicação com garantia `acks=all` e tópicos particionados por agregado.
  - `OutboxPublisherWorker`: Daemon assíncrono que lê a tabela `outbox_events` e publica no Kafka com confirmação.
  - `IdempotentConsumer`: Controle de desduplicação persistente via tabela `processed_events`.
  - `WebSocketServer`: Transmissão bidirecional de eventos para interface web.
- **Application & HTTP (`application/` & `interfaces/`)**:
  - `CheckoutController` & `CreateOrderUseCase`: Suporte ao header `Idempotency-Key` (RFC 7231).
  - `PaymentWebhookController`: Liquidação de pagamentos e acionamento de emissão de ingressos.
  - `CheckinController`: Validação de catraca para operadores com verificação de uso único.

## 2. Inicialização Rápida

### Modo Local (Desenvolvimento Nativo)
```bash
cd app_build
npm install
npm run dev
```

### Modo Conteinerizado Completo (Docker Compose)
```bash
cd app_build
docker compose up -d --build
```
- Frontend SPA: http://localhost:5173
- Backend REST / WS: http://localhost:3000
- Kafka UI: http://localhost:8080
- PostgreSQL: localhost:5432
- Redis: localhost:6379
