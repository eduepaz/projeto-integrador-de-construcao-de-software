# Pacote 2 – Arquitetura e Infraestrutura de Desenvolvimento
**Projeto Integrador de Construção de Software – 2026/2**  
**PUCRS – Escola Politécnica**  
**Plataforma PulsePass: Bilhetagem, Reserva e Acesso para Megaeventos**  

Este diretório contém o índice temático e o registro dos entregáveis correspondentes ao **Pacote 2**, em estrita conformidade com o enunciado oficial da disciplina:

---

## Estrutura dos Entregáveis do Pacote 2

A especificação técnica integral, diagramas C4 (Níveis 1, 2 e 3), modelagem de dados relacional (DER), topologia e schemas do Kafka, desenho esquemático da pipeline CI/CD e processo de GCS estão detalhados em:

👉 **[`production_artifacts/Technical_Specification.md`](../../production_artifacts/Technical_Specification.md)**

Abaixo está o sumário temático de cada um dos cinco tópicos obrigatórios exigidos no Pacote 2:

### 1. Descrição da Arquitetura no Modelo C4
- **C4 Nível 1 – Diagrama de Contexto de Sistema:** Fronteiras da plataforma PulsePass, 4 personas de usuários (Comprador, Organizador, Operador de Portaria e Administrador) e sistemas externos integrados (Gateway de Pagamentos, Serviço de Mensageria/E-mails e Provedor OIDC/Keycloak).
- **C4 Nível 2 – Diagrama de Contêineres:** Topologia física de microsserviços segregados (`iam-service`, `catalog-service`, `orders-service`, `ticketing-service`, `websocket-service`, `analytics-service`), SPA PulsePass Web, API Gateway / Reverse Proxy, bancos de dados PostgreSQL com schemas dedicados por serviço, Redis para locks de concorrência e TTL de 10 min, e cluster Apache Kafka (KRaft).
- **C4 Nível 3 – Diagrama de Componentes:** Detalhamento arquitetural interno do **Orders & Checkout Service** (Controllers, Filtro de Idempotência, Use Cases, FSM de Pedidos, Repositórios ACID e Worker do Transactional Outbox) e do **Catalog & Inventory Service** (Distributed Lock Manager Redlock/Redis e Worker de Expiração).
- **Detalhamento:** **[Seção 2 da Especificação Técnica](../../production_artifacts/Technical_Specification.md#2-arquitetura-de-software-no-modelo-c4)**.

### 2. Modelo de Dados Conceitual e Físico
- **Diagrama Entidade-Relacionamento (DER):** Modelagem completa em Mermaid cobrindo as tabelas `usuarios`, `eventos`, `sessoes`, `lotes`, `assentos`, `pedidos`, `itens_pedido`, `pagamentos`, `outbox_events`, `ingressos`, `checkin_logs` e `processed_events`.
- **Integridade Referencial e Tipagem Estrita:** Uso de UUIDs v4, carimbos `timestamptz` UTC, chaves estrangeiras indexadas, restrições de unicidade (`UNIQUE(idempotency_key)`) e payload JSONB para eventos de domínio.
- **Detalhamento:** **[Seção 3 da Especificação Técnica](../../production_artifacts/Technical_Specification.md#3-modelo-de-dados-conceitual-e-físico)**.

### 3. Estrutura de Mensageria e Streaming com Apache Kafka
- **Topologia de Tópicos e Partições:** Definição dos tópicos centrais (`reservations.events`, `orders.events`, `payments.events`, `tickets.events`, `telemetry.events`), fatores de partição (6 a 12 partições), retenção e chaves de particionamento baseadas em chaves de agregados (`order_id`, `seat_id`, `ticket_id`).
- **Mitigação do Dual-Write Dilemma:** Aplicação mandatória do padrão **Transactional Outbox**, onde a alteração de estado do pedido e o registro na tabela `outbox_events` ocorrem na mesma transação ACID no PostgreSQL, sendo despachados pelo worker assíncrono com `acks=all`.
- **Consumo Idempotente:** Mecanismo de desduplicação através da tabela relacional `processed_events`.
- **Schemas Estruturados:** Definição com payloads JSON baseados no padrão CloudEvents.
- **Detalhamento:** **[Seção 4 da Especificação Técnica](../../production_artifacts/Technical_Specification.md#4-estrutura-de-mensageria-e-streaming-com-apache-kafka)**.

### 4. Descrição Esquemática da Pipeline de Desenvolvimento (CI/CD)
- **Fluxo Automatizado (GitHub Actions / GitLab CI):** Esteira dividida em 5 estágios:
  1. *Lint, Formatação e Type-Checking* (ESLint / Ruff / TypeScript strict).
  2. *Testes Unitários de Domínio* (Máquina de estados FSM do pedido com cobertura $\ge 70\%$).
  3. *Testes de Integração com Testcontainers* (Subida real de PostgreSQL, Kafka e Redis em contêineres temporários de teste).
  4. *Build de Contêineres OCI e Scan de Segurança* (Multi-stage build e verificação de CVEs com Trivy).
  5. *Validação de Ambiente e Deploy Preview* (Validação do `docker-compose.yml` e healthchecks).
- **Detalhamento:** **[Seção 5 da Especificação Técnica](../../production_artifacts/Technical_Specification.md#5-pipeline-de-desenvolvimento-e-automação-cicd)**.

### 5. Processo de Gerenciamento da Configuração de Software (GCS)
- **Estratégia de Ramificação (Gitflow Adaptado):** Branches estruturadas (`main`, `develop`, `feature/*`, `bugfix/*`, `hotfix/*`).
- **Políticas de Pull Request e Branch Protection:** Bloqueio de commits diretos nas branches protegidas, revisão de código (Peer Review) obrigatória e bloqueio de merge sem aprovação dos testes automatizados.
- **Padrão de Commits e Versionamento:** Adesão integral ao *Conventional Commits* e *Semantic Versioning 2.0.0* (SemVer).
- **Detalhamento:** **[Seção 6 da Especificação Técnica](../../production_artifacts/Technical_Specification.md#6-processo-de-gerenciamento-da-configuração-de-software-gcs)**.
