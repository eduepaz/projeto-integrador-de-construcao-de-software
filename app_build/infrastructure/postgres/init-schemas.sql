-- PulsePass Master Database Initialization Script
-- Pacote 2: Modelagem de Dados Conceitual e Física (PostgreSQL 16)
-- Pontifícia Universidade Católica do Rio Grande do Sul (PUCRS)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tabela: USUARIOS
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('CLIENT', 'ORGANIZER', 'OPERATOR', 'ADMIN')),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabela: EVENTOS
CREATE TABLE IF NOT EXISTS eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizador_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    local VARCHAR(255) NOT NULL,
    banner_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'PUBLICADO' CHECK (status IN ('RASCUNHO', 'PUBLICADO', 'ENCERRADO')),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabela: SESSOES
CREATE TABLE IF NOT EXISTS sessoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evento_id UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    data_inicio TIMESTAMPTZ NOT NULL,
    data_fim TIMESTAMPTZ NOT NULL
);

-- 4. Tabela: LOTES
CREATE TABLE IF NOT EXISTS lotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sessao_id UUID NOT NULL REFERENCES sessoes(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    preco_base DECIMAL(10, 2) NOT NULL CHECK (preco_base >= 0),
    capacidade_total INT NOT NULL CHECK (capacidade_total > 0),
    ingressos_vendidos INT NOT NULL DEFAULT 0 CHECK (ingressos_vendidos >= 0),
    inicio_vendas TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fim_vendas TIMESTAMPTZ NOT NULL
);

-- 5. Tabela: ASSENTOS (Matricial & Concorrência)
CREATE TABLE IF NOT EXISTS assentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sessao_id UUID NOT NULL REFERENCES sessoes(id) ON DELETE CASCADE,
    setor VARCHAR(100) NOT NULL,
    linha VARCHAR(10) NOT NULL,
    numero INT NOT NULL,
    preco DECIMAL(10, 2) NOT NULL CHECK (preco >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'HELD', 'SOLD', 'BLOCKED')),
    held_ate TIMESTAMPTZ,
    reserved_by_user_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    CONSTRAINT uq_sessao_assento UNIQUE (sessao_id, setor, linha, numero)
);

-- 6. Tabela: PEDIDOS (FSM & Idempotência)
CREATE TABLE IF NOT EXISTS pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    valor_total DECIMAL(10, 2) NOT NULL CHECK (valor_total >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'CRIADO' CHECK (status IN ('CRIADO', 'RESERVADO', 'AGUARDANDO_PAGAMENTO', 'PAGO', 'EXPIRADO', 'CANCELADO')),
    expires_at TIMESTAMPTZ NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Tabela: ITENS_PEDIDO
CREATE TABLE IF NOT EXISTS itens_pedido (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    assento_id UUID NOT NULL REFERENCES assentos(id) ON DELETE RESTRICT,
    preco_unitario DECIMAL(10, 2) NOT NULL CHECK (preco_unitario >= 0)
);

-- 8. Tabela: PAGAMENTOS
CREATE TABLE IF NOT EXISTS pagamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE RESTRICT,
    gateway_transaction_id VARCHAR(255),
    metodo_pagamento VARCHAR(50) NOT NULL CHECK (metodo_pagamento IN ('PIX', 'CARTAO_CREDITO')),
    valor DECIMAL(10, 2) NOT NULL CHECK (valor >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'APROVADO', 'RECUSADO', 'ESTORNADO')),
    processado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Tabela: OUTBOX_EVENTS (Mitigação do Dual-Write Dilemma)
CREATE TABLE IF NOT EXISTS outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processado_em TIMESTAMPTZ
);

-- 10. Tabela: INGRESSOS (Emissão & QR Code HMAC)
CREATE TABLE IF NOT EXISTS ingressos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE RESTRICT,
    assento_id UUID NOT NULL REFERENCES assentos(id) ON DELETE RESTRICT,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    codigo_resgate VARCHAR(20) UNIQUE NOT NULL,
    qr_code_signature VARCHAR(255) NOT NULL,
    pdf_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'VALIDO' CHECK (status IN ('VALIDO', 'UTILIZADO', 'CANCELADO')),
    emitido_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Tabela: CHECKIN_LOGS (Validação de Portaria)
CREATE TABLE IF NOT EXISTS checkin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ingresso_id UUID NOT NULL REFERENCES ingressos(id) ON DELETE CASCADE,
    operador_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    lido_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resultado VARCHAR(100) NOT NULL CHECK (resultado IN ('SUCESSO', 'INGRESSO_JA_UTILIZADO', 'ASSINATURA_INVALIDA', 'INGRESSO_CANCELADO')),
    dispositivo_id VARCHAR(100) NOT NULL
);

-- 12. Tabela: PROCESSED_EVENTS (Idempotent Consumer Deduplication)
CREATE TABLE IF NOT EXISTS processed_events (
    event_id VARCHAR(255) NOT NULL,
    consumer_group VARCHAR(100) NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (event_id, consumer_group)
);

-- ÍNDICES DE ALTA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_assentos_sessao ON assentos(sessao_id);
CREATE INDEX IF NOT EXISTS idx_assentos_status ON assentos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_usuario ON pedidos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
CREATE INDEX IF NOT EXISTS idx_outbox_unprocessed ON outbox_events(criado_em) WHERE processed = FALSE;
CREATE INDEX IF NOT EXISTS idx_ingressos_usuario ON ingressos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_ingressos_codigo ON ingressos(codigo_resgate);
CREATE INDEX IF NOT EXISTS idx_checkin_ingresso ON checkin_logs(ingresso_id);

-- SEED INICIAL DE DADOS PARA DEMONSTRAÇÃO
INSERT INTO usuarios (id, nome, email, senha_hash, role) VALUES
('11111111-1111-1111-1111-111111111111', 'Admin PulsePass', 'admin@pulsepass.com', '$2b$10$wN1QyZ/oIq6uD8kXyT1kVeLp9eK4cM3gN2qR8sT1uV0wXyZ123456', 'ADMIN'),
('22222222-2222-2222-2222-222222222222', 'Organizador Arena', 'organizador@arenapoa.com.br', '$2b$10$wN1QyZ/oIq6uD8kXyT1kVeLp9eK4cM3gN2qR8sT1uV0wXyZ123456', 'ORGANIZER'),
('33333333-3333-3333-3333-333333333333', 'Operador Portaria 1', 'portaria@arenapoa.com.br', '$2b$10$wN1QyZ/oIq6uD8kXyT1kVeLp9eK4cM3gN2qR8sT1uV0wXyZ123456', 'OPERATOR'),
('44444444-4444-4444-4444-444444444444', 'Lucas Oliveira (Cliente)', 'lucas@cliente.com', '$2b$10$wN1QyZ/oIq6uD8kXyT1kVeLp9eK4cM3gN2qR8sT1uV0wXyZ123456', 'CLIENT')
ON CONFLICT (email) DO NOTHING;

INSERT INTO eventos (id, organizador_id, titulo, descricao, local, banner_url, status) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Final Libertadores 2026: Grêmio vs Flamengo', 'A grande decisão do continente ao vivo no estádio mais moderno do sul do Brasil.', 'Arena do Grêmio - Porto Alegre, RS', 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2', 'PUBLICADO'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Festival Pulse Sound 2026', 'Dois dias de música eletrônica, rock alternativo e experiências imersivas.', 'Estádio Beira-Rio - Porto Alegre, RS', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745', 'PUBLICADO')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sessoes (id, evento_id, data_inicio, data_fim) VALUES
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NOW() + INTERVAL '10 days', NOW() + INTERVAL '10 days' + INTERVAL '3 hours'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NOW() + INTERVAL '20 days', NOW() + INTERVAL '20 days' + INTERVAL '8 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lotes (id, sessao_id, nome, preco_base, capacidade_total, ingressos_vendidos, fim_vendas) VALUES
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Lote 1 - Cadeira Inferior', 350.00, 5000, 120, NOW() + INTERVAL '9 days'),
('ffffffff-ffff-ffff-ffff-ffffffffffff', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Lote 1 - Camarote VIP', 850.00, 500, 45, NOW() + INTERVAL '9 days')
ON CONFLICT (id) DO NOTHING;

-- Geração de Matriz de Assentos para a Sessão 1
DO $$
DECLARE
    setores TEXT[] := ARRAY['Cadeira Inferior Leste', 'Cadeira Inferior Oeste', 'Camarote Central'];
    setor_item TEXT;
    linhas TEXT[] := ARRAY['A', 'B', 'C', 'D'];
    linha_item TEXT;
    num_item INT;
    seat_price DECIMAL;
BEGIN
    FOREACH setor_item IN ARRAY setores LOOP
        IF setor_item = 'Camarote Central' THEN
            seat_price := 850.00;
        ELSE
            seat_price := 350.00;
        END IF;

        FOREACH linha_item IN ARRAY linhas LOOP
            FOR num_item IN 1..10 LOOP
                INSERT INTO assentos (sessao_id, setor, linha, numero, preco, status)
                VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', setor_item, linha_item, num_item, seat_price, 'AVAILABLE')
                ON CONFLICT (sessao_id, setor, linha, numero) DO NOTHING;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;
