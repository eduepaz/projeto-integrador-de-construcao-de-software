# Pacote 2 Arquitetura e Infraestrutura de Desenvolvimento

**Projeto Integrador de Construção de Software 2026/2 — PUCRS, Escola Politécnica**
**Produto:** PulsePass, plataforma de bilhetagem, reserva e acesso para megaeventos
**Revisão:** 28/10/2026
**Status:** Arquitetura aprovada em 28/10/2026; entrega documental do Pacote 2

O Pacote 2 reúne as cinco descrições exigidas na página 4 do [enunciado da disciplina](../../Projeto_Final_Construcao_Software-2026-2.pdf). A [especificação técnica central](../../production_artifacts/Technical_Specification.md) contém os diagramas, decisões e critérios de aceitação. A stack e a arquitetura foram aprovadas pelo responsável em 28/10/2026; a implementação integrada e suas evidências pertencem ao checkpoint posterior.

## Entregáveis e roteiro de leitura

| Entregável do enunciado | Conteúdo e localização |
| :--- | :--- |
| Descrição da arquitetura C4 | [Seção 2](../../production_artifacts/Technical_Specification.md#2-arquitetura-de-software-no-modelo-c4): contexto, contêineres, componentes de Pedidos/Checkout e Catálogo/Inventário, FSM e saga |
| Modelo de Dados Conceitual | [Seção 3](../../production_artifacts/Technical_Specification.md#3-modelo-de-dados-conceitual-e-físico): DER, reservas, assentos e lotes gerais, propriedade dos dados e restrições físicas propostas |
| Estrutura de mensageria Kafka | [Seção 4](../../production_artifacts/Technical_Specification.md#4-estrutura-de-mensageria-e-streaming-com-apache-kafka): tópicos, contratos, chaves, Outbox, consumidores idempotentes, retentativas e replay |
| Pipeline esquemática de desenvolvimento | [Seção 5](../../production_artifacts/Technical_Specification.md#5-pipeline-de-desenvolvimento-e-automação-cicd): gatilhos GitHub Actions, estágios, cobertura e Testcontainers reais |
| Processo de GCS | [Seção 6](../../production_artifacts/Technical_Specification.md#6-processo-de-gerenciamento-da-configuração-de-software-gcs): Git/GitHub, branches, PRs, revisão, versionamento, baselines e registro do uso de IA |

Os requisitos obrigatórios e as escolhas da equipe estão separados na seção 1. A stack aprovada está na seção 7, o plano de infraestrutura na seção 8 e a matriz de conformidade na seção 9. O [Pacote 1](../pacote-1/Technical_Specification_Pacote_1.md) preserva a baseline anterior de processo, requisitos e prototipação.

## Decisões aprovadas

- **Stack:** React e TypeScript no frontend; Python 3.12 e FastAPI nos serviços, conforme escolha do responsável; Nginx na borda; Keycloak como provedor de identidade.
- **Inventário:** PostgreSQL é a autoridade de alocação e prazo. Redis mantém cache/sessões e pode otimizar admissão; a garantia de nenhuma venda duplicada não depende de um lock Redis isolado.
- **Reserva:** prazo imutável de 600 segundos, verificado no banco após a aquisição dos locks. Atraso de worker ou mensagem não amplia a validade.
- **Compra e emissão:** `PaymentApproved` registra aprovação financeira. O comando `InventoryConfirmRequested` obtém a decisão do Inventário. Somente `OrderPaid`, após `ReservationConfirmed`, autoriza ingressos. Aprovação tardia ou recusa definitiva exige compensação; resultado desconhecido exige reconciliação.
- **Dados:** cada serviço possui seu banco e credencial; não há FK nem escrita entre bancos. Reserva e itens representam tanto assentos numerados quanto quantidade de lote geral.
- **Kafka:** os cinco tópicos de eventos são mantidos, com `inventory.commands` para a saga. Reservas usam `reservation_id` como chave; o perfil local tem um broker e replicação 1, e o perfil resiliente projetado tem três brokers e replicação 3.
- **Confiabilidade:** todo produtor que altera domínio e publica evento utiliza Outbox local; deduplicação, efeitos e eventos de saída dos consumidores persistentes são gravados juntos. As notificações WebSocket são transitórias e recuperadas por consulta HTTP. Inbox de quarentena não equivale a processamento concluído.

## Aceite e continuidade

A arquitetura, a stack e o protocolo da compra foram aprovados. A matriz da seção 9 registra os critérios de aceite documental. A política de proteção de branches deve ser configurada e demonstrada no GitHub; sua descrição não comprova que esteja ativada.

O enunciado exige microsserviços, IdP, Kafka, idempotência, tratamento da escrita dupla, testes de domínio com cobertura mínima de 70%, Testcontainers reais e ambiente completo via Compose. Esses compromissos orientam a arquitetura. Os cinco entregáveis específicos deste pacote são documentais; o Compose executável, os serviços e os workflows deverão ser materializados e verificados nos pacotes seguintes.

O trabalho atual fica restrito ao Pacote 2. A implementação do Pacote 3 será realizada em outro momento, mediante nova solicitação explícita do responsável. Consulte o [guia de revisão do Pacote 2](../GUIA_PACOTE_2.md).
