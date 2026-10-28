# Guia de consulta e revisão do Pacote 2

O Pacote 2 do PulsePass trata de **Arquitetura e Infraestrutura de Desenvolvimento**. O objetivo atual é consolidar os cinco entregáveis documentais do enunciado. A arquitetura e a stack foram aprovadas pelo responsável em 28/10/2026; a implementação do Pacote 3 será realizada em outro momento.

## 1 Abrir a documentação principal

Comece pelo [índice do Pacote 2](pacote-2/README.md) e depois abra a [especificação técnica central](../production_artifacts/Technical_Specification.md). A especificação concentra os diagramas Mermaid, os contratos de mensagens e as decisões que orientarão o desenvolvimento futuro.

O [enunciado](../Projeto_Final_Construcao_Software-2026-2.pdf), página 4, lista os entregáveis desta etapa. A [baseline do Pacote 1](pacote-1/Technical_Specification_Pacote_1.md) preserva os requisitos e a proposta inicial do produto.

## 2 Conferir os cinco entregáveis

| Entregável | Onde consultar | O que revisar |
| :--- | :--- | :--- |
| Arquitetura C4 | [Seção 2](../production_artifacts/Technical_Specification.md#2-arquitetura-de-software-no-modelo-c4) | Contexto, contêineres, componentes de Checkout e Inventário, tecnologias e protocolos |
| Modelo de Dados Conceitual | [Seção 3](../production_artifacts/Technical_Specification.md#3-modelo-de-dados-conceitual-e-físico) | Entidades, relações, reservas, assentos, lotes de capacidade geral e propriedade dos dados |
| Mensageria Kafka | [Seção 4](../production_artifacts/Technical_Specification.md#4-estrutura-de-mensageria-e-streaming-com-apache-kafka) | Tópicos, chaves, produtores, consumidores, contratos, Outbox, deduplicação e recuperação |
| Pipeline esquemática | [Seção 5](../production_artifacts/Technical_Specification.md#5-pipeline-de-desenvolvimento-e-automação-cicd) | Gatilhos, estágios, testes previstos, cobertura de domínio e critérios de integração |
| Processo de GCS | [Seção 6](../production_artifacts/Technical_Specification.md#6-processo-de-gerenciamento-da-configuração-de-software-gcs) | Branches, revisão por PR, commits, versionamento, baselines e rastreabilidade do uso de IA |

## 3 Visualizar os diagramas

Abra os arquivos em um visualizador Markdown que ofereça suporte a Mermaid. O texto entre as marcações `mermaid` é a fonte do diagrama. Os diagramas representam a arquitetura projetada.

O protótipo em `design-reference/` é uma referência visual preservada da etapa anterior. A consulta dos documentos do Pacote 2 não exige iniciar backend, Kafka ou banco de dados.

## 4 Verificar a coerência das decisões

- Keycloak é o emissor dos tokens; o IAM integra os perfis e a sessão de renovação.
- PostgreSQL é a autoridade de inventário e prazo; Redis não decide sozinho uma venda.
- A reserva temporária possui prazo imutável de 600 segundos.
- Aprovação financeira e confirmação de inventário são decisões distintas. Somente `OrderPaid` autoriza a emissão do ingresso.
- Cada serviço possui seus dados e registra alterações e eventos de saída na mesma transação local.
- Os tópicos, nomes de eventos, chaves e campos dos contratos devem ser consistentes com os diagramas e o modelo de dados.
- O ambiente local com um broker e o perfil resiliente com três brokers possuem configurações próprias.
- Proteções de branch e resultados de testes exigirão evidências quando forem configurados e executados.

## 5 Conferir a entrega documental

A seção 9 da especificação relaciona cada exigência ao conteúdo correspondente. Antes da entrega, confira se os cinco tópicos estão legíveis, se os links funcionam e se os diagramas e exemplos usam os mesmos nomes e responsabilidades.

A seção 7 registra a stack aprovada e a seção 8 descreve a infraestrutura planejada. Comandos, arquivos de aplicação, migrações e workflows citados como destinos futuros serão materializados na implementação posterior.

A aprovação desta documentação não inicia automaticamente o Pacote 3. O desenvolvimento ficará aguardando nova solicitação do responsável.
