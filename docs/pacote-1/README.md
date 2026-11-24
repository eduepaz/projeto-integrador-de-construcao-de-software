# Pacote 1 – Processo de Desenvolvimento e Requisitos
**Projeto Integrador de Construção de Software – 2026/2**  
**PUCRS – Escola Politécnica**  
**Plataforma PulsePass: Bilhetagem, Reserva e Acesso para Megaeventos**  

Este diretório contém a documentação integral dos entregáveis correspondentes ao **Pacote 1**, em conformidade com o enunciado oficial da disciplina:

---

## Estrutura dos Entregáveis do Pacote 1

O documento mestre detalhado com todas as especificações formais, diagramas Mermaid, wireframes estruturais e critérios de aceite está arquivado em:
👉 **[`docs/pacote-1/Technical_Specification_Pacote_1.md`](Technical_Specification_Pacote_1.md)** (cópia de arquivo do Pacote 1)
e serviu de base para a evolução técnica no documento central de especificações.

Abaixo está o índice temático de cada um dos cinco tópicos exigidos no Pacote 1:

### 1. Processo de Desenvolvimento Suportado por IA
- **Ciclo de Desenvolvimento Autônomo:** Fluxo de quatro fases integrando os agentes `@pm` (Product Manager), `@engineer` (Full-Stack Engineer), `@qa` (Quality Assurance) e `@devops` (DevOps Master).
- **Approval Gate:** Etapa de validação humana obrigatória para aprovação da arquitetura antes do início da codificação.
- **Ferramental & Protocolos:** Uso de Antigravity AI, Claude, Figma Make para prototipação e geração de design reference em React 19 + TypeScript + Tailwind CSS v4, e linters automatizados.
- **Rastreabilidade e Governança:** Detalhamento na **[Seção 1 da Especificação](../../production_artifacts/Technical_Specification.md#1-descrição-do-processo-de-desenvolvimento-suportado-por-ia)**.

### 2. Documento de Visão do Produto
- **Declaração de Posicionamento:** Solução corporativa para megaeventos capaz de absorver tráfego em rajada (*flash crowd*) eliminando sobre-venda (*Zero Overselling*) e garantindo liberação atômica em 10 minutos.
- **Diferenciais Competitivos:** Desacoplamento via Apache Kafka, mitigação do *Dual-Write Dilemma* via *Transactional Outbox*, e ingressos digitais com QR Code criptograficamente assinado.
- **Personas e Stakeholders:**
  - *Alice Silva* (Compradora / Fã de Megaeventos)
  - *Marcos Valente* (Organizador do Evento)
  - *Rafael Souza* (Operador de Portaria / Catraca)
  - *Juliana Mendes* (Administradora da Plataforma)
- **Detalhamento:** **[Seção 2 da Especificação](../../production_artifacts/Technical_Specification.md#2-documento-de-visão-do-produto)**.

### 3. Backlog com Story Mapping
- **Espinha Dorsal (Backbone):** Mapeamento do ciclo de vida: Identidade -> Catálogo -> Reserva (10 min) -> Checkout -> Emissão -> Portaria -> Gestão -> Telemetria.
- **Épicos & Histórias com Critérios Gherkin (Dado-Quando-Então):**
  - **Épico 1:** Identidade, Autenticação e Governança (IAM - JWT Stateless + RBAC).
  - **Épico 2:** Catálogo de Eventos e Alta Taxa de Leitura (Cache Redis de baixa latência).
  - **Épico 3:** Mapa de Assentos, Alocação Concorrente e Expiração Estrita (TTL 10 min).
  - **Épico 4:** Checkout Resiliente, Idempotência e Transações (Idempotency-Key + Outbox).
  - **Épico 5:** Emissão de Ingressos, PDF, QR Code Criptografado e Notificações WebSocket.
  - **Épico 6:** Operação de Portaria e Validação de Acesso (Check-in < 300ms).
  - **Épico 7:** Gestão do Organizador (Cadastro de eventos, lotes, assentos e relatórios).
  - **Épico 8:** Telemetria, Analytics e Operações da Plataforma (Dashboard em tempo real).
- **Detalhamento:** **[Seção 3 da Especificação](../../production_artifacts/Technical_Specification.md#3-backlog-de-produto-e-story-mapping)**.

### 4. Requisitos Não-Funcionais (RNF)
- **RNF-01 (Consistência):** Zero Overselling com locks atômicos distribuídos.
- **RNF-02 (Desempenho e Vazão):** Catálogo p95 < 100ms; checkout p95 < 500ms sob 2.000 RPS.
- **RNF-03 (Resiliência):** Streaming assíncrono via Kafka com retenção e isolamento de falhas.
- **RNF-04 (Idempotência):** Suporte nativo a `Idempotency-Key` (janela 24h) e consumidores idempotentes.
- **RNF-05 (Tempo Real):** TTL estrito de 600 segundos para devolução de assentos não pagos.
- **RNF-06 (Segurança):** JWT RS256, controle de acesso RBAC e QR Code com HMAC-SHA256.
- **RNF-07 (Observabilidade):** Correlation-ID transversal e rastreabilidade ponta a ponta.
- **RNF-08 (Reprodutibilidade):** Orquestração completa local em `docker compose up -d`.
- **Detalhamento:** **[Seção 4 da Especificação](../../production_artifacts/Technical_Specification.md#4-requisitos-não-funcionais-rnf)**.

### 5. Mockups e Mapa de Navegação do Front-End
- **Design de Referência:** Implementação funcional com 24 telas navegáveis em React 19 + TypeScript + Tailwind CSS no diretório [`design-reference/`](../../design-reference/).
- **Mapa de Navegação Completo:** Fluxos interconectados do Comprador, Organizador, Operador de Portaria e Administrador.
- **Wireframes Estruturais Detalhados:**
  - Catálogo de Eventos (`/events`)
  - Mapa Matricial de Assentos (A-F, 1-18) com Cores de Status (`/seats`)
  - Reserva Temporária com Contador Regressivo de 10 minutos (`/reservation`)
  - Checkout Seguro com Envio de `Idempotency-Key` (`/checkout`)
  - Ingresso Digital com QR Code Criptografado (`/ticket`)
  - Scanner de Alta Velocidade do Operador de Portaria (`/operator`)
- **Detalhamento:** **[Seção 5 da Especificação](../../production_artifacts/Technical_Specification.md#5-mockups-e-mapa-de-navegação-do-front-end)**.
