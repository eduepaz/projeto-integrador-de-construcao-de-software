# Technical Specification & Pacote 2: PulsePass
**Documento de Especificação Técnica e Entregáveis do Pacote 2: Arquitetura e Infraestrutura de Desenvolvimento**  
**Projeto Integrador de Construção de Software – 2026/2**  
**Pontifícia Universidade Católica do Rio Grande do Sul (PUCRS) – Escola Politécnica**  
**Autor:** The Autonomous Development Team (@pm - Product Manager & Lead Architect)  
**Status:** Aguardando Aprovação do Usuário (Approval Gate)  

---

## Sumário Executivo (Executive Summary)

O **PulsePass** é uma plataforma distribuída de alta disponibilidade e baixa latência concebida para gerenciar bilhetagem, reserva atômica concorrente e controle de acesso em tempo real para megaeventos esportivos e culturais (estádios, festivais e convenções). O desafio central do domínio reside na absorção de tráfego em rajadas súbitas (*flash crowd traffic*), com dezenas de milhares de usuários disputando simultaneamente um inventário limitado de assentos.

O presente documento consolida formalmente as especificações de engenharia e os entregáveis obrigatórios do **Pacote 2 – Arquitetura e Infraestrutura de Desenvolvimento**, fornecendo os alicerces estruturais para o ciclo de desenvolvimento:

1. **Arquitetura C4 (Níveis 1, 2 e 3):** Decomposição sistêmica formal abrangendo o diagrama de contexto de sistema (Nível 1), o diagrama de contêineres e topologia física (Nível 2) e o detalhamento de componentes internos dos microsserviços críticos de *Checkout* e *Inventário* (Nível 3).
2. **Modelo de Dados Conceitual e Físico (DER):** Modelagem relacional estrita no PostgreSQL com garantia de integridade referencial, isolamento multi-tenant por microsserviço (*Database-per-Service*), tipagem e índices para consultas de alta performance.
3. **Topologia de Mensageria e Streaming com Apache Kafka:** Estrutura particionada de tópicos, garantias de ordenação causal por chave agregada, mitigação rigorosa do *Dual-Write Dilemma* via padrão **Transactional Outbox** relacional e desduplicação de eventos (*Idempotent Consumer*).
4. **Pipeline Automatizada de CI/CD (GitHub Actions / GitLab CI):** Esteira automatizada de entrega contínua com validação estática (lint), suíte de testes unitários de máquinas de estados ($\ge 70\%$ de cobertura de domínio), testes de integração ponta a ponta com **Testcontainers** reais (PostgreSQL, Kafka e Redis) e auditoria de vulnerabilidades em contêineres.
5. **Processo de Gerenciamento da Configuração de Software (GCS):** Estratégia de ramificação com Gitflow adaptado, políticas de Pull Request com *Branch Protection*, convenção *Conventional Commits* e versionamento semântico (*SemVer*).

---

## 1. Requisitos do Sistema & Restrições de Engenharia

O sistema foi decomposto funcionalmente em cinco frentes autônomas, projetadas com baixo acoplamento e alta coesão:

| Foco Funcional | Módulo de Domínio | Responsabilidade Primária | Restrição de Engenharia |
| :--- | :--- | :--- | :--- |
| **Identidade e Governança** | **IAM Service** | Autenticação stateless JWT (RS256), refresh tokens em cache Redis e controle granular de acesso baseado em papéis (RBAC: *Cliente*, *Organizador*, *Operador*, *Admin*). | Tokens criptograficamente verificáveis de forma distribuída pelos gateways e serviços sem chamadas síncronas de validação. |
| **Inventário e Concorrência** | **Catalog & Inventory Service** | Gestão de eventos, sessões e assentos matriciais (setores numerados e pista). Alocação atômica de assentos via locks distribuídos e devolução automática pós-timeout. | **Zero Overselling:** Nenhuma poltrona pode ser vendida em duplicidade. Latência de leitura no catálogo p95 < 100ms sob 2.000 RPS. |
| **Transações e Checkout** | **Orders & Checkout Service** | Máquina de Estados Finitos (FSM) do pedido, suporte a `Idempotency-Key` (RFC 7231) e persistência transacional com **Transactional Outbox**. | **Atomicidade ACID:** O estado do pedido e o evento no Outbox são persistidos na mesma transação PostgreSQL (`COMMIT`). |
| **Emissão e Portaria** | **Ticketing & Dispatch Service** | Consumo assíncrono de pagamentos, geração de ingressos em PDF com QR Code assinado (HMAC-SHA256) e validação de catraca online/offline. | Validação de check-in na portaria com resposta em menos de 300ms, prevenindo fraudes e clonagem de ingressos. |
| **Telemetria e Operações** | **Analytics & Operations** | Ingestão e agregação contínua de eventos de navegação, funil de conversão e telemetria operacional com orquestração Docker Compose unificada. | Coleta assíncrona desacoplada do fluxo crítico do usuário via streaming em tópicos dedicados do Kafka. |

### Requisitos Não-Funcionais Críticos (RNF)
- **RNF-01 (Consistência Estrita):** Impossibilidade física de venda duplicada (*Zero Overselling*). Lock atômico implementado via Redis (`SET seat:{id}:lock {user_id} NX PX 600000`).
- **RNF-02 (Expiração Rigorosa de Reservas):** TTL de exatamente 10 minutos (600 segundos) para confirmação de pagamento. Timeout com desfazimento atômico e reabertura imediata do assento.
- **RNF-03 (Desacoplamento e Resiliência Assíncrona):** Eliminação de gargalos transacionais HTTP entre checkout e emissão de ingressos através de mensageria assíncrona Kafka.
- **RNF-04 (Idempotência Ponta a Ponta):** Proteção contra retentativas de pagamento duplicadas causadas por instabilidades de rede via chave única enviada no header `Idempotency-Key`.
- **RNF-05 (Mitigação do Dual-Write Dilemma):** A publicação de eventos no Kafka depende estritamente do padrão *Transactional Outbox*, eliminando eventos fantasmas ou eventos perdidos.

---

## 2. Arquitetura de Software no Modelo C4

O modelo C4 documenta a arquitetura de software em diferentes níveis de abstração visual: Contexto de Sistema (Nível 1), Contêineres de Execução (Nível 2) e Componentes Internos (Nível 3).

### 2.1 C4 - Nível 1: Diagrama de Contexto de Sistema

O diagrama de contexto estabelece o escopo da Plataforma PulsePass, suas fronteiras de software, os diferentes perfis de usuários humanos e as integrações com entidades externas.

```mermaid
flowchart TD
    subgraph Usuarios["Usuários da Plataforma PulsePass"]
        U1["Comprador / Fã<br>[Pessoa]<br>Explora eventos, seleciona assentos, realiza pagamentos e exibe ingressos."]
        U2["Organizador do Evento<br>[Pessoa]<br>Cadastra eventos, define lotes, configura mapa de assentos e acompanha receita."]
        U3["Operador de Portaria<br>[Pessoa]<br>Opera dispositivos móveis e catracas para validação ultrarrápida de QR Codes."]
        U4["Administrador da Plataforma<br>[Pessoa]<br>Supervisiona métricas, gerencia permissões e audita logs de conformidade."]
    end

    subgraph FronteiraPulsePass["Fronteira da Plataforma PulsePass"]
        SYS["Plataforma PulsePass<br>[Sistema de Software Distribuído]<br>Orquestra reservas atômicas, pedidos com idempotência, streaming de eventos e validação de acesso em tempo real."]
    end

    subgraph SistemasExternos["Sistemas Externos Integrados"]
        EXT_PAY["Gateway de Pagamento / Adquirente<br>[Sistema Externo]<br>Processa transações financeiras (Cartão de Crédito e PIX) e envia webhooks assíncronos."]
        EXT_MAIL["Serviço Transacional de Mensagens<br>[Sistema Externo / SMTP / SES]<br>Despacha notificações de confirmação de compra e ingressos digitais em PDF."]
        EXT_IDP["Provedor de Identidade OIDC<br>[Sistema Externo / Keycloak]<br>Federação de credenciais corporativas e gerenciamento centralizado de identidades."]
    end

    U1 -->|"1. Navega eventos, reserva poltronas e efetua checkout (HTTPS)"| SYS
    U2 -->|"2. Publica novos eventos e acompanha dashboards de vendas (HTTPS)"| SYS
    U3 -->|"3. Escaneia QR Codes de ingressos na portaria (< 300ms)"| SYS
    U4 -->|"4. Monitora telemetria, gerencia papéis e audita o sistema (HTTPS)"| SYS

    SYS -->|"5. Autentica e delega validação de tokens JWT (OIDC/OAuth2)"| EXT_IDP
    SYS -->|"6. Envia ordens de cobrança e recebe callbacks de liquidação (REST/Webhooks)"| EXT_PAY
    SYS -->|"7. Dispara e-mails transacionais com comprovantes e bilhetes (SMTP/API)"| EXT_MAIL
```

---

### 2.2 C4 - Nível 2: Diagrama de Contêineres

O diagrama de contêineres descreve a divisão física de responsabilidades, as tecnologias adotadas, as fronteiras de rede e a comunicação síncrona e assíncrona entre clientes, gateways, microsserviços e sistemas de persistência.

```mermaid
flowchart TB
    subgraph ClientLayer["Camada de Cliente"]
        SPA["PulsePass Web SPA<br>[React 19 / TypeScript / Tailwind CSS]<br>Interface de usuário de alta fidelidade para compra, mapas interativos, checkout e dashboards."]
        SCAN_APP["Mobile Scanner WebApp<br>[PWA / React]<br>Interface ultra-leve otimizada para câmera traseira e leitura de QR Codes na portaria."]
    end

    subgraph IngressLayer["Borda e Roteamento"]
        GW["API Gateway & Reverse Proxy<br>[Traefik / Nginx]<br>Roteamento centralizado, terminação TLS, rate limiting e injeção do Correlation-ID."]
    end

    subgraph ServiceLayer["Camada de Microsserviços de Backend"]
        SVC_IAM["IAM Service<br>[FastAPI / Node.js]<br>Gestão de credenciais, RBAC, emissão e validação de tokens JWT RS256."]
        SVC_CAT["Catalog & Inventory Service<br>[FastAPI / Node.js]<br>Catálogo de eventos read-heavy, mapa matricial de assentos e locks atômicos de concorrência."]
        SVC_ORD["Orders & Checkout Service<br>[FastAPI / Node.js]<br>FSM do pedido, processador de Idempotency-Key e persistência de Transactional Outbox."]
        SVC_TICK["Ticketing & Dispatch Service<br>[FastAPI / Node.js]<br>Emissão de PDFs criptográficos, assinatura HMAC e validação de check-in."]
        SVC_WS["Real-time WebSocket Gateway<br>[Node.js / Socket.io]<br>Mapeamento de conexões bidirecionais com o frontend para atualização de tela em < 1s."]
        SVC_ANL["Analytics & Operations Service<br>[FastAPI / Node.js]<br>Consumo de telemetria, agregação contínua de métricas de funil e métricas de infraestrutura."]
    end

    subgraph StorageLayer["Camada de Persistência e Streaming"]
        DB_IAM[("PostgreSQL IAM<br>[RDBMS - Schema Dedicado]")]
        DB_CAT[("PostgreSQL Catálogo<br>[RDBMS - Schema Dedicado]")]
        DB_ORD[("PostgreSQL Pedidos<br>[RDBMS - Transações ACID + Outbox]")]
        DB_TICK[("PostgreSQL Ingressos<br>[RDBMS - Schema Dedicado]")]
        REDIS[("Redis Cluster / Standalone<br>[In-Memory Key-Value]<br>Locks de assento (SETNX), TTL estrito de 10 min e cache read-heavy")]
        KAFKA{{"Apache Kafka Cluster<br>[Event Streaming Broker (KRaft)]<br>Tópicos particionados duráveis, ordenados por Aggregate ID"}}
    end

    SPA -->|"HTTPS / REST (JSON)"| GW
    SCAN_APP -->|"HTTPS / REST (Validação)"| GW
    SPA <-->|"WSS (WebSocket em Tempo Real)"| SVC_WS

    GW -->|"Proxy /api/v1/auth"| SVC_IAM
    GW -->|"Proxy /api/v1/catalog"| SVC_CAT
    GW -->|"Proxy /api/v1/orders, /checkout"| SVC_ORD
    GW -->|"Proxy /api/v1/tickets, /checkin"| SVC_TICK
    GW -->|"Proxy /api/v1/analytics"| SVC_ANL

    SVC_IAM --> DB_IAM
    SVC_IAM --> REDIS

    SVC_CAT --> DB_CAT
    SVC_CAT -->|"Locks atômicos de 10 min"| REDIS
    SVC_CAT -->|"Publica SeatReserved / Expired"| KAFKA

    SVC_ORD -->|"Transação ACID: Pedido + Outbox"| DB_ORD
    SVC_ORD -->|"Cache de Idempotency-Key"| REDIS
    SVC_ORD -->|"Outbox Worker despacha eventos"| KAFKA

    KAFKA -->|"Consome pagamentos confirmados"| SVC_TICK
    SVC_TICK --> DB_TICK
    SVC_TICK -->|"Emite evento de bilhete gerado"| KAFKA
    SVC_TICK -.->|"Notifica conclusão de bilhete"| SVC_WS

    KAFKA -->|"Consome todos os eventos de domínio"| SVC_ANL
    SVC_ANL --> REDIS
```

---

### 2.3 C4 - Nível 3: Diagrama de Componentes (Microsserviços Críticos)

Para garantir o rigor técnico exigido pelo Pacote 2, detalhamos os componentes internos dos dois microsserviços de maior complexidade de concorrência e transação: o **Orders & Checkout Service** e o **Catalog & Inventory Service**.

#### Componentes: Orders & Checkout Service

Este serviço encapsula o núcleo transacional, o isolamento contra escritas duplicadas (*Dual-Write*) e o controle estrito de idempotência.

```mermaid
flowchart TD
    subgraph OrdersCheckoutService["Orders & Checkout Service (Estrutura Interna)"]
        CTRL_CHECKOUT["CheckoutController<br>[REST Controller]<br>Expõe POST /api/v1/orders/checkout.<br>Extrai JWT e valida presença do header Idempotency-Key."]
        CTRL_PAY_WEBHOOK["PaymentWebhookController<br>[REST Controller]<br>Recebe callbacks assinados do gateway de pagamento simulado."]
        
        FILTER_IDEM["IdempotencyFilter & DeduplicationStore<br>[Domain Service]<br>Consulta chave no Redis/Postgres. Se já executada, retorna payload em cache; se em processamento, rejeita (HTTP 409)."]
        
        UC_CREATE_ORDER["CreateOrderUseCase<br>[Application Use Case]<br>Orquestra validação de reserva ativa no Redis/Catálogo, inicializa pedido e aciona FSM."]
        UC_PROCESS_PAY["ProcessPaymentCallbackUseCase<br>[Application Use Case]<br>Processa resultado financeiro, atualiza máquina de estados para PAGO ou CANCELADO."]
        
        FSM["OrderStateMachine<br>[Domain Logic]<br>Garante transições válidas de estado (CRIADO -> RESERVADO -> AGUARDANDO_PAGAMENTO -> PAGO)."]
        
        REPO_ORDER["OrderRepository<br>[Data Access Layer]<br>Insere e atualiza registros na tabela orders com garantia ACID."]
        REPO_OUTBOX["OutboxRepository<br>[Data Access Layer]<br>Grava eventos na tabela outbox_events dentro da mesma transação física do banco de dados."]
        
        WORKER_OUTBOX["OutboxPublisherWorker<br>[Background Daemon / CDC Worker]<br>Lê periodicamente registros pendentes (processed=false), despacha ao Kafka com acks=all e marca processed=true."]
    end

    CTRL_CHECKOUT --> FILTER_IDEM
    FILTER_IDEM --> UC_CREATE_ORDER
    CTRL_PAY_WEBHOOK --> UC_PROCESS_PAY
    
    UC_CREATE_ORDER --> FSM
    UC_PROCESS_PAY --> FSM
    
    UC_CREATE_ORDER -->|"1. Transação Unificada (BEGIN)"| REPO_ORDER
    UC_CREATE_ORDER -->|"2. Grava evento no Outbox"| REPO_OUTBOX
    
    UC_PROCESS_PAY -->|"1. Atualiza Status (BEGIN)"| REPO_ORDER
    UC_PROCESS_PAY -->|"2. Grava PaymentApproved no Outbox"| REPO_OUTBOX
    
    REPO_ORDER --> DB_ORDERS[("PostgreSQL (Database: orders_db)")]
    REPO_OUTBOX --> DB_ORDERS
    
    WORKER_OUTBOX -->|"SELECT FOR UPDATE SKIP LOCKED"| REPO_OUTBOX
    WORKER_OUTBOX -->|"Publica eventos ordenados por order_id"| KAFKA_BROKER{{"Kafka: orders.events & payments.events"}}
```

#### Componentes: Catalog & Inventory Service (Lock Concorrente)

Responsável por absorver o tráfego maciço de visualização de mapas de assentos e realizar alocações atômicas livres de *race conditions*:

```mermaid
flowchart TD
    subgraph CatalogInventoryService["Catalog & Inventory Service"]
        CAT_CTRL["CatalogController<br>[REST Controller]<br>Endpoints otimizados de leitura de assentos e lotes."]
        RESERVE_CTRL["SeatReservationController<br>[REST Controller]<br>Endpoint atômico POST /api/v1/seats/reserve."]
        
        LOCK_MGR["DistributedLockManager (Redlock/Redis)<br>[Componente Infra]<br>Executa comando atômico SET seat:{id}:lock {user_id} NX PX 600000."]
        
        UC_RESERVE["ReserveSeatUseCase<br>[Application Service]<br>Garante que assento está AVAILABLE antes de obter o lock de 10 min."]
        WORKER_EXP["SeatExpirationWatcher<br>[Background Worker]<br>Monitora expiração de chaves Redis (Keyspace Notifications) ou polling para liberar assentos no PostgreSQL."]
        
        REPO_SEAT["SeatRepository<br>[Data Access]<br>Persiste assentos e estados (AVAILABLE, HELD, SOLD, BLOCKED)."]
    end

    CAT_CTRL -->|"Leitura em Cache (p95 < 100ms)"| REDIS_CACHE[("Redis Cache")]
    RESERVE_CTRL --> UC_RESERVE
    UC_RESERVE --> LOCK_MGR
    LOCK_MGR -->|"Lock Atômico TTL 600s"| REDIS_CACHE
    UC_RESERVE --> REPO_SEAT
    REPO_SEAT --> DB_CATALOG[("PostgreSQL (catalog_db)")]
    WORKER_EXP -->|"Libera assento após 10 min"| REPO_SEAT
    WORKER_EXP -->|"Dispara SeatReleased"| KAFKA_BROKER{{"Kafka: reservations.events"}}
```

---

## 3. Modelo de Dados Conceitual e Físico

A arquitetura adota o isolamento por microsserviços (*Database-per-Service*), garantindo que cada agregado pertença exclusivamente ao seu bounded context. A integridade física é garantida por tabelas relacionais com chaves primárias UUID v4, chaves estrangeiras com índices associados e colunas com carimbo de data/hora UTC (`timestamptz`).

### 3.1 Diagrama Entidade-Relacionamento (DER)

```mermaid
erDiagram
    USUARIO ||--o{ EVENTO : organiza
    USUARIO ||--o{ PEDIDO : realiza
    USUARIO ||--o{ AUDITORIA_LOG : gera

    EVENTO ||--|{ SESSAO : possui
    SESSAO ||--|{ LOTE : divide
    SESSAO ||--|{ ASSENTO : mapeia

    PEDIDO ||--|{ ITEM_PEDIDO : contem
    ITEM_PEDIDO }|--|| ASSENTO : referencia
    PEDIDO ||--o| PAGAMENTO : liquida
    PEDIDO ||--o{ INGRESSO : gera

    INGRESSO ||--o{ CHECKIN_LOG : valida

    USUARIO {
        uuid id PK "Identificador único (UUIDv4)"
        string nome "Nome completo do usuário"
        string email UK "E-mail único cadastrado"
        string senha_hash "Hash criptográfico Argon2 / BCrypt"
        string role "Papel RBAC: CLIENT, ORGANIZER, OPERATOR, ADMIN"
        timestamp criado_em "Data de criação em UTC"
        timestamp atualizado_em "Data da última alteração"
    }

    EVENTO {
        uuid id PK "Identificador do evento"
        uuid organizador_id FK "Referência ao usuário organizador"
        string titulo "Nome público do megaevento"
        string descricao "Descrição detalhada"
        string local "Estádio, arena ou localidade física"
        string banner_url "URL do banner promocional"
        string status "Status: RASCUNHO, PUBLICADO, ENCERRADO"
        timestamp criado_em "Data de cadastro"
    }

    SESSAO {
        uuid id PK "Identificador da sessão/data"
        uuid evento_id FK "Evento pai"
        timestamp data_inicio "Horário de abertura de portões"
        timestamp data_fim "Horário previsto de término"
    }

    LOTE {
        uuid id PK "Identificador do lote comercial"
        uuid sessao_id FK "Sessão vinculada"
        string nome "Ex: Lote 1 Promocional, Pista VIP"
        decimal preco_base "Valor monetário do ingresso"
        int capacidade_total "Número máximo de bilhetes"
        int ingressos_vendidos "Contador de bilhetes emitidos"
        timestamp inicio_vendas "Início da vigência"
        timestamp fim_vendas "Fim da vigência"
    }

    ASSENTO {
        uuid id PK "Identificador físico da poltrona"
        uuid sessao_id FK "Sessão associada"
        string setor "Nome do setor: Superior Leste, Pista, Camarote"
        string linha "Identificador de fileira (A até Z)"
        int numero "Número do assento na fileira (1 a 100)"
        decimal preco "Preço calculado para o assento"
        string status "Estado: AVAILABLE, HELD, SOLD, BLOCKED"
        timestamp held_ate "Data/Hora limite do TTL (10 min)"
        uuid reserved_by_user_id "ID do usuário detentor do lock"
    }

    PEDIDO {
        uuid id PK "Identificador único do pedido"
        uuid usuario_id FK "Usuário comprador"
        string idempotency_key UK "Chave idempotente enviada pelo cliente"
        decimal valor_total "Soma dos itens e taxas"
        string status "FSM: CRIADO, RESERVADO, AGUARDANDO_PAGAMENTO, PAGO, EXPIRADO, CANCELADO"
        timestamp expires_at "Timestamp estrito de expiração (10 min)"
        timestamp criado_em "Criação do pedido"
        timestamp atualizado_em "Última alteração de estado"
    }

    ITEM_PEDIDO {
        uuid id PK "Identificador do item"
        uuid pedido_id FK "Pedido vinculado"
        uuid assento_id FK "Assento reservado"
        decimal preco_unitario "Valor fixado na reserva"
    }

    PAGAMENTO {
        uuid id PK "Identificador da transação financeira"
        uuid pedido_id FK "Pedido a liquidar"
        string gateway_transaction_id "ID externo no adquirente"
        string metodo_pagamento "PIX ou CARTAO_CREDITO"
        decimal valor "Valor total cobrado"
        string status "PENDENTE, APROVADO, RECUSADO, ESTORNADO"
        timestamp processado_em "Horário da liquidação bancária"
    }

    OUTBOX_EVENTS {
        uuid id PK "Identificador único do evento de outbox"
        string aggregate_type "Tipo de agregado (ex: Order, Payment)"
        uuid aggregate_id "ID da entidade agregada"
        string event_type "Nome formal do evento de domínio"
        jsonb payload "Conteúdo serializado em JSON com schema estrito"
        boolean processed "Flag indicativa de despacho ao Kafka"
        timestamp criado_em "Instante da persistência no banco"
        timestamp processado_em "Instante do despacho confirmado"
    }

    INGRESSO {
        uuid id PK "Identificador do ingresso digital"
        uuid pedido_id FK "Pedido de origem"
        uuid assento_id FK "Assento atribuído"
        uuid usuario_id FK "Portador do bilhete"
        string codigo_resgate "Código alfanumérico curto de 8 dígitos"
        string qr_code_signature "Assinatura digital HMAC-SHA256"
        string pdf_url "URL do arquivo PDF gerado"
        string status "VALIDO, UTILIZADO, CANCELADO"
        timestamp emitido_em "Instante da geração do bilhete"
    }

    CHECKIN_LOG {
        uuid id PK "Identificador da leitura na portaria"
        uuid ingresso_id FK "Ingresso verificado"
        uuid operador_id FK "Operador da catraca responsável"
        timestamp lido_em "Carimbo de data/hora da leitura física"
        string resultado "SUCESSO, INGRESSO_JA_UTILIZADO, ASSINATURA_INVALIDA"
        string dispositivo_id "Identificador do terminal / catraca"
    }

    PROCESSED_EVENTS {
        string event_id PK "UUID do evento consumido do Kafka"
        string consumer_group PK "Grupo consumidor (ex: ticketing-group)"
        timestamp processed_at "Timestamp de desduplicação"
    }
```

---

## 4. Estrutura de Mensageria e Streaming com Apache Kafka

O Apache Kafka funciona como o barramento de eventos (*Event Backbone*) da plataforma, permitindo o desacoplamento temporal, resiliência assíncrona e ordenação causal estrita.

### 4.1 Topologia de Tópicos e Chaves de Particionamento

Para preservar a causalidade das transições de estado de cada entidade agregada, as mensagens são obrigatoriamente roteadas utilizando **Partition Keys** baseadas no identificador único do agregado:

| Nome do Tópico | Partições | Replicação | Cleanup Policy | Partition Key | Aggregate Type | Produtor Primário | Consumidores Principais |
| :--- | :---: | :---: | :--- | :--- | :--- | :--- | :--- |
| `reservations.events` | 6 | 3 | `delete` (7 dias) | `seat_id` | `Seat` | Catalog Service | Checkout Service, Analytics Service, Real-time WebSocket |
| `orders.events` | 6 | 3 | `delete` (7 dias) | `order_id` | `Order` | Checkout Service (Outbox) | Analytics Service, WebSocket Gateway |
| `payments.events` | 6 | 3 | `delete` (14 dias) | `order_id` | `Payment` | Checkout Service (Outbox) | Ticketing Service, Analytics Service |
| `tickets.events` | 6 | 3 | `delete` (30 dias) | `ticket_id` | `Ticket` | Ticketing Service | Notification Service, WebSocket Gateway, Analytics |
| `telemetry.events` | 12 | 3 | `delete` (3 dias) | `session_id` | `Telemetry` | Frontend Gateway / Ingress | Analytics Service |

---

### 4.2 Mitigação do Dual-Write Dilemma (Transactional Outbox Pattern)

O problema clássico do Dual-Write ocorre quando um microsserviço precisa alterar dados em seu banco relacional e publicar uma mensagem no broker. Se a escrita no banco tiver sucesso mas o broker falhar, o evento é perdido. Se a mensagem for enviada primeiro e o banco falhar, o sistema emite eventos fantasmas.

**Solução Arquitetural Obrigatória:**
1. **Transação Relacional Atômica:** Quando um pedido é atualizado ou criado, a escrita na tabela `orders` e a inserção do evento correspondente na tabela `outbox_events` ocorrem na **mesma transação ACID (`BEGIN ... COMMIT`)**.
2. **Outbox Publisher Worker:** Um daemon em segundo plano lê registros pendentes (`processed = false`) utilizando a cláusula `SELECT ... FOR UPDATE SKIP LOCKED` para permitir paralelismo sem concorrência destrutiva entre réplicas.
3. **Publicação com `acks=all`:** O worker despacha a mensagem ao Kafka aguardando confirmação do broker e quorum de réplicas em disco (`min.insync.replicas=2`).
4. **Confirmação Local:** Apenas após a recepção do ACK do Kafka, o worker marca `processed = true` e preenche `processado_em`.

```mermaid
sequenceDiagram
    autonumber
    participant Client as Cliente SPA
    participant Controller as CheckoutController
    participant DB as PostgreSQL (orders_db)
    participant Worker as OutboxPublisherWorker
    participant Kafka as Apache Kafka Cluster
    participant Consumer as Ticketing Consumer

    Client->>Controller: POST /api/v1/orders/checkout (Idempotency-Key)
    Controller->>DB: BEGIN TRANSACTION
    Controller->>DB: INSERT INTO orders (id, user_id, status='RESERVADO', expires_at)
    Controller->>DB: INSERT INTO outbox_events (aggregate_id, event_type='OrderCreated', payload)
    Controller->>DB: COMMIT TRANSACTION
    Controller-->>Client: HTTP 201 Created {orderId, expiresAt: 10m}

    Note over Worker,DB: Processamento Assíncrono Desacoplado
    Worker->>DB: SELECT * FROM outbox_events WHERE processed = false FOR UPDATE SKIP LOCKED
    Worker->>Kafka: Produce 'orders.events' [Key=order_id, acks=all]
    Kafka-->>Worker: ACK (Offset persistido)
    Worker->>DB: UPDATE outbox_events SET processed = true, processado_em = NOW()

    Note over Kafka,Consumer: Consumo Idempotente
    Kafka->>Consumer: Evento 'PaymentApproved' {orderId, seatId, userId}
    Consumer->>DB: INSERT INTO processed_events (event_id, consumer_group) VALUES (...) ON CONFLICT DO NOTHING
    alt Evento já processado (Deduplicação)
        Consumer-->>Consumer: Descarta processamento duplicado
    else Novo Evento
        Consumer->>Consumer: Gera PDF com QR Code HMAC
        Consumer->>DB: INSERT INTO tickets (...)
    end
```

---

### 4.3 Schemas Estruturados dos Eventos de Domínio

Os eventos transmitidos pelo Kafka seguem o formato estruturado padrão com metadados unificados para rastreabilidade (*CloudEvents / Envelope Pattern*):

#### Evento: `OrderCreated` (Tópico: `orders.events`)
```json
{
  "specversion": "1.0",
  "id": "e4b2d1c0-5a3d-4c8e-bf91-112233445566",
  "source": "/pulsepass/orders-service",
  "type": "com.pulsepass.order.created",
  "datacontenttype": "application/json",
  "time": "2026-10-26T21:40:00Z",
  "correlation_id": "corr-8f192b-4721",
  "data": {
    "order_id": "7f9c2d11-4432-4821-9921-001122334455",
    "user_id": "11223344-5566-7788-99aa-bbccddeeff00",
    "status": "RESERVADO",
    "valor_total": 450.00,
    "expires_at": "2026-10-26T21:50:00Z",
    "items": [
      {
        "assento_id": "99887766-5544-3322-1100-aabbccddeeff",
        "setor": "Cadeira Inferior Leste",
        "linha": "C",
        "numero": 14,
        "preco": 450.00
      }
    ]
  }
}
```

#### Evento: `PaymentApproved` (Tópico: `payments.events`)
```json
{
  "specversion": "1.0",
  "id": "a9f8b7c6-d5e4-3c2b-1a0f-998877665544",
  "source": "/pulsepass/orders-service",
  "type": "com.pulsepass.payment.approved",
  "datacontenttype": "application/json",
  "time": "2026-10-26T21:42:30Z",
  "correlation_id": "corr-8f192b-4721",
  "data": {
    "payment_id": "55443322-1100-aabb-ccdd-eeff00112233",
    "order_id": "7f9c2d11-4432-4821-9921-001122334455",
    "user_id": "11223344-5566-7788-99aa-bbccddeeff00",
    "metodo_pagamento": "PIX",
    "valor": 450.00,
    "gateway_transaction_id": "E2026102621423012938472910"
  }
}
```

---

## 5. Pipeline de Desenvolvimento e Automação CI/CD

A esteira de integração e entrega contínua (CI/CD) foi projetada para ser executada em GitHub Actions ou GitLab CI a cada *Pull Request* e a cada *Merge* nas branches `develop` e `main`.

### 5.1 Desenho Esquemático da Esteira Automatizada

```mermaid
flowchart TD
    TRIGGER(["Disparo: Pull Request ou Push na branch 'develop' / 'main'"]) --> STAGE1
    
    subgraph STAGE1["Estágio 1: Análise Estática & Lint"]
        JOB_LINT["Linters & Format Check<br>(ESLint / Ruff / Flake8 / Oxlint)"]
        JOB_TYPE["Type Checking Estrito<br>(TypeScript tsc --noEmit / Mypy)"]
        JOB_SECURITY["Security SAST<br>(SonarQube / Bandit / npm audit)"]
    end
    
    STAGE1 --> STAGE2
    
    subgraph STAGE2["Estágio 2: Testes Unitários de Domínio"]
        JOB_UNIT_FSM["Testes de Máquinas de Estado (FSM)<br>Validação de transições do Pedido e Regras de Negócio<br>Meta: Cobertura >= 70%"]
        JOB_UNIT_IDEM["Testes de Idempotência & Hash<br>Validação de chaves de desduplicação e payloads"]
    end
    
    STAGE2 --> STAGE3
    
    subgraph STAGE3["Estágio 3: Testes de Integração com Testcontainers"]
        JOB_TC_DB["Testcontainers PostgreSQL<br>Validação de transações ACID e Outbox atômico"]
        JOB_TC_KAFKA["Testcontainers Kafka & Redis<br>Produção acks=all e consumo idempotente com deduplicação"]
    end
    
    STAGE3 --> STAGE4
    
    subgraph STAGE4["Estágio 4: Build de Contêineres OCI & Scan"]
        JOB_DOCKER_BUILD["Docker Multi-Stage Build<br>Compilação e empacotamento das imagens de microsserviços"]
        JOB_CONTAINER_SCAN["Vulnerability Container Scan<br>(Trivy / Snyk) - Bloqueio em caso de falhas CVE altas/críticas"]
    end
    
    STAGE4 --> STAGE5
    
    subgraph STAGE5["Estágio 5: Deploy & Validação de Ambiente"]
        JOB_COMPOSE_VALIDATE["Validação Docker Compose<br>docker compose config & smoke test dos healthchecks"]
        JOB_PREVIEW["Deploy Preview / Staging<br>Publicação automatizada em ambiente de homologação"]
    end
    
    STAGE5 --> SUCCESS(["Esteira Aprovada: Status Check Verde no PR"])
```

### 5.2 Detalhamento dos Jobs e Critérios de Aceite

1. **Lint & Type-Check:** Executado em menos de 60 segundos. Falhas de digitação, formatação fora do padrão ou tipagem frouxa (`any`) interrompem imediatamente o pipeline.
2. **Suíte de Testes Unitários:** Execução isolada em memória sem I/O de rede ou disco. Cobertura mínima obrigatória de **70%** nas classes de domínio e transições de estado da FSM.
3. **Testes de Integração com Testcontainers:**
   - Instanciação de contêineres temporários descartáveis de PostgreSQL 16 e Kafka KRaft real via código (`testcontainers-node` ou `testcontainers-python`).
   - Valida a atomicidade do padrão *Transactional Outbox* e a garantia de que nenhuma mensagem duplicada seja processada duas vezes no *Ticketing Service*.
4. **Construção de Imagens e Scan de Segurança:** Geração de imagens otimizadas baseadas em Alpine/Distroless com scan do Trivy. Builds com vulnerabilidades críticas conhecidas (CVEs) têm merge bloqueado.
5. **Orquestração Local Reprodutível:** A validação final assegura que o arquivo `docker-compose.yml` sobe todos os serviços e que todos os healthchecks respondem com `healthy` em até 120 segundos.

---

## 6. Processo de Gerenciamento da Configuração de Software (GCS)

Para assegurar governança estrita e rastreabilidade absoluta de cada linha de código, o projeto adota um fluxo de trabalho baseado no **Gitflow Adaptado** e políticas rigorosas de proteção de branch.

### 6.1 Topologia de Branches e Convenções

```mermaid
gitGraph
    commit id: "v1.0.0 (Pacote 1)"
    branch develop
    checkout develop
    commit id: "setup: arquitetura base"
    branch feature/checkout-outbox
    checkout feature/checkout-outbox
    commit id: "feat: outbox_events table"
    commit id: "test: fsm state transitions"
    checkout develop
    merge feature/checkout-outbox id: "PR #12 merged"
    branch feature/kafka-topology
    checkout feature/kafka-topology
    commit id: "feat: kafka cluster compose"
    checkout develop
    merge feature/kafka-topology id: "PR #13 merged"
    checkout main
    merge develop id: "release: v2.0.0 (Pacote 2)" tag: "v2.0.0"
```

- **`main`:** Representa o código em estado de produção estável. Todo commit em `main` corresponde a uma entrega formal avaliada da disciplina e deve conter uma Git Tag semântica assinada (`v1.0.0`, `v2.0.0`).
- **`develop`:** Linha principal de integração contínua. Reúne o trabalho concluído de todas as frentes funcionais aprovadas em Pull Request.
- **`feature/<modulo>-<descricao>`:** Branches temporárias criadas a partir de `develop` para implementação de novas funcionalidades (ex: `feature/catalog-redis-lock`, `feature/orders-outbox-worker`).
- **`bugfix/<modulo>-<descricao>`:** Branches para resolução de defeitos identificados durante os testes integrados.
- **`hotfix/<descricao>`:** Branches de intervenção emergencial ramificadas a partir de `main`.

### 6.2 Políticas de Pull Request e Branch Protection

As branches `main` e `develop` possuem proteção de branch (*Branch Protection Rules*) ativada:
1. **Bloqueio de Commits Diretos:** Nenhum membro da equipe ou agente autônomo pode realizar `git push` direto para `main` ou `develop`.
2. **Revisão de Código Obrigatória (Peer Review):** Todo Pull Request exige no mínimo uma aprovação de outro engenheiro da equipe ou do papel auditor `@qa`.
3. **Status Checks Obrigatórios:** O botão de Merge permanece travado enquanto todas as verificações automatizadas da pipeline de CI (lint, testes unitários $\ge 70\%$ e Testcontainers) não estiverem concluídas com status verde.
4. **Proibição de Force Push e Deletion:** Comandos de reescrita histórica destrutiva (`git push --force`) são expressamente desabilitados pelo servidor Git.

### 6.3 Convenção de Mensagens de Commit (Conventional Commits)

Todas as alterações no histórico de versões devem aderir rigorosamente ao padrão *Conventional Commits*:
- `feat(orders): implementar tabela outbox_events e persistencia atomica`
- `fix(catalog): corrigir race condition no lock distribuido do redis`
- `test(fsm): adicionar testes cobrindo expiracao de pedido apos 10 minutos`
- `docs(arch): adicionar diagramas C4 nivel 3 do servico de checkout`
- `chore(deps): atualizar testcontainers para versao mais recente`

---

## 7. Arquitetura de Software e Tech Stack Recomendada

Com base nas exigências de alta vazão, baixa latência, transacionalidade ACID e tipagem estrita, a equipe técnica recomenda a seguinte composição tecnológica para a implementação física (Pacotes 3 e 4):

| Camada | Tecnologia Adotada | Justificativa Técnica |
| :--- | :--- | :--- |
| **Frontend SPA** | **React 19 + TypeScript + Tailwind CSS v4 + Vite** | Compatibilidade total com os protótipos de alta fidelidade desenvolvidos no diretório `design-reference/`, renderização performática e tipagem fim a fim. |
| **Backend Framework** | **Node.js (TypeScript / Fastify) ou Python 3.12 (FastAPI / Asyncpg)** | Modelo não-bloqueante de E/S assíncrona orientado a eventos, alta taxa de throughput para I/O intensivo, bibliotecas maduras para Testcontainers e ecossistema nativo para Kafka e Redis. |
| **Banco de Dados Relacional** | **PostgreSQL 16 (Alpine)** | Suporte completo a transações ACID relacionais, recursos nativos para JSONB (payloads de eventos) e comando `SELECT FOR UPDATE SKIP LOCKED` indispensável para workers do Transactional Outbox. |
| **Cache & Locks Concorrentes** | **Redis 7 (Alpine)** | Operações atômicas de alta performance em memória (`SETNX`), TTL nativo para a expiração de 10 minutos (600s) e suporte a locks distribuídos Redlock. |
| **Event Streaming Broker** | **Apache Kafka 3.7+ (Modo KRaft)** | Eliminação da dependência legado do Zookeeper, durabilidade de mensagens em disco, particionamento ordenado por chave e taxa de throughput superior a dezenas de milhares de mensagens por segundo. |
| **Gestão do Broker** | **Kafka UI (provectuslabs)** | Interface gráfica leve e intuitiva para visualização em tempo real de tópicos, mensagens, offsets de partições e grupos consumidores. |
| **Suíte de Testes** | **Vitest / Pytest + Testcontainers** | Execução rápida de testes unitários da FSM e testes de integração com instâncias reais de banco e mensageria em contêineres descartáveis. |

---

## 8. Guia de Execução Local e Reprodutibilidade DevOps

Toda a infraestrutura do PulsePass é empacotada para execução local determinística e reprodutível através de contêineres Docker:

```yaml
# Estrutura base da topologia Docker Compose (docker-compose.yml)
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: pulsepass-postgres
    environment:
      POSTGRES_USER: pulsepass
      POSTGRES_PASSWORD: pulsepass_secret
      POSTGRES_DB: pulsepass_master
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./infrastructure/postgres/init-schemas.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U pulsepass"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: pulsepass-redis
    ports:
      - "6379:6379"
    command: ["redis-server", "--appendonly", "yes"]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  kafka:
    image: confluentinc/cp-kafka:7.6.0
    container_name: pulsepass-kafka
    ports:
      - "9092:9092"
      - "29092:29092"
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: 'CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT'
      KAFKA_ADVERTISED_LISTENERS: 'PLAINTEXT://kafka:29092,PLAINTEXT_HOST://localhost:9092'
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_PROCESS_ROLES: 'broker,controller'
      KAFKA_CONTROLLER_QUORUM_VOTERS: '1@kafka:29093'
      KAFKA_LISTENERS: 'PLAINTEXT://0.0.0.0:29092,CONTROLLER://0.0.0.0:29093,PLAINTEXT_HOST://0.0.0.0:9092'
      KAFKA_INTER_BROKER_LISTENER_NAME: 'PLAINTEXT'
      KAFKA_CONTROLLER_LISTENER_NAMES: 'CONTROLLER'
      CLUSTER_ID: 'MkU3OEVBNTcwNTJENDM2Qk'
    healthcheck:
      test: ["CMD", "nc", "-z", "localhost", "9092"]
      interval: 10s
      timeout: 5s
      retries: 5

  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    container_name: pulsepass-kafka-ui
    ports:
      - "8080:8080"
    environment:
      KAFKA_CLUSTERS_0_NAME: pulsepass-cluster
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:29092
    depends_on:
      kafka:
        condition: service_healthy

volumes:
  pgdata:
```

### Comandos de Inicialização e Verificação do Ambiente
```bash
# 1. Subida da infraestrutura completa conteinerizada
docker compose up -d

# 2. Verificação de status e prontidão dos serviços
docker compose ps

# 3. Acesso aos consoles de monitoramento local:
# Painel Web do Kafka UI:  http://localhost:8080
# Banco PostgreSQL:        localhost:5432 (pulsepass / pulsepass_secret)
# Servidor Redis:          localhost:6379
```

---

## 9. Checklist de Conformidade com o Pacote 2 (PUCRS 2026/2)

| Entregável Obrigatório no Enunciado Oficial | Status | Seção Correspondente |
| :--- | :---: | :--- |
| **Descrição da arquitetura no Modelo C4 (Níveis 1, 2 e 3)** | Concluído | [Seção 2: C4 Nível 1 (Contexto), Nível 2 (Contêineres) e Nível 3 (Componentes)](#2-arquitetura-de-software-no-modelo-c4) |
| **Descrição do Modelo de Dados Conceitual e Físico (DER)** | Concluído | [Seção 3: Diagrama DER e Atributos de Domínio](#3-modelo-de-dados-conceitual-e-físico) |
| **Descrição da estrutura de mensageria do Kafka** | Concluído | [Seção 4: Tópicos, Chaves, Schemas, Outbox e Deduplicação](#4-estrutura-de-mensageria-e-streaming-com-apache-kafka) |
| **Descrição esquemática da Pipeline de desenvolvimento (CI/CD)** | Concluído | [Seção 5: Pipeline no GitHub Actions / GitLab com Testcontainers](#5-pipeline-de-desenvolvimento-e-automação-cicd) |
| **Descrição do Processo de GCS (Configuração de Software)** | Concluído | [Seção 6: Gitflow, Branch Protection, Commits Semânticos e SemVer](#6-processo-de-gerenciamento-da-configuração-de-software-gcs) |

---

## 10. Próximos Passos (Transição para o Pacote 3 / Checkpoint de Desenvolvimento)

Após a aprovação deste documento pelo desenvolvedor responsável:
1. **Passo para o `@engineer` (Full-Stack Engineer):** Iniciar o scaffolding físico do repositório no diretório de construção, configurando o `docker-compose.yml`, scripts de migração relacional do PostgreSQL (tabelas de pedidos, assentos e outbox), clientes Redis e consumers Kafka.
2. **Passo para o `@qa` (QA Engineer):** Implementar os testes unitários de transição de estado da FSM do pedido garantindo $\ge 70\%$ de cobertura de código e a suíte de testes de integração com Testcontainers.
3. **Passo para o `@devops` (DevOps Master):** Configurar o workflow do GitHub Actions (`.github/workflows/ci.yml`) integrando todas as etapas da esteira de validação automática.
