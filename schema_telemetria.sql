-- ==============================================================================
-- PROJETO: Itaú Wallet Resilience Engine (Módulos 1 & 2 - Pagamentos PF)
-- ARQUIVO: schema_telemetria.sql
-- OBJETIVO: Persistência de tokens NFC/Pix, auditoria de risco, ativação proativa
--           da carteira nativa, smart retry de agendamentos e trava de pânico
-- ==============================================================================

-- 1. Limpeza preventiva para permitir reexecução limpa nos testes
DROP TABLE IF EXISTS auditoria_trava_panico;
DROP TABLE IF EXISTS agenda_pagamentos_resiliente;
DROP TABLE IF EXISTS ativacao_proativa_carteira;
DROP TABLE IF EXISTS log_transacoes_nfc;
DROP TABLE IF EXISTS cofre_tokens;

-- ==============================================================================
-- MÓDULO 1: COFRE DE TOKENS E TELEMETRIA DE APROXIMAÇÃO (BASE ORIGINAL)
-- ==============================================================================

-- 2. Tabela de Cofre de Tokens (Provisionamento e Auto-sincronização)
CREATE TABLE cofre_tokens (
    id_token INTEGER PRIMARY KEY AUTOINCREMENT,
    id_cliente VARCHAR(36) NOT NULL,
    final_cartao CHAR(4) NOT NULL,
    funcao_cartao VARCHAR(20) NOT NULL, -- 'CREDITO', 'DEBITO', 'MULTIPLO'
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    status_token VARCHAR(30) NOT NULL, -- 'ATIVO', 'REVOGADO', 'FALHA_SINCRONIZACAO'
    tentativas_sincronizacao INT DEFAULT 0,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela de Log e Telemetria de Transações por Aproximação
CREATE TABLE log_transacoes_nfc (
    id_transacao INTEGER PRIMARY KEY AUTOINCREMENT,
    id_token INT NOT NULL,
    modalidade VARCHAR(20) NOT NULL, -- 'NFC_CARTAO', 'PIX_APROXIMACAO'
    valor DECIMAL(10, 2) NOT NULL,
    decisao_risco VARCHAR(30) NOT NULL, -- 'APROVADO', 'BLOQUEADO', 'ANALISE_BIOMETRIA'
    motivo_decisao VARCHAR(150) NOT NULL,
    latencia_nanos BIGINT NOT NULL, -- Tempo capturado via System.nanoTime() no Java
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_token) REFERENCES cofre_tokens(id_token)
);

-- ==============================================================================
-- MÓDULO 2: ATIVAÇÃO PROATIVA, SMART RETRY DE AGENDAMENTOS E TRAVA DE PÂNICO
-- ==============================================================================

-- 4. Tabela de Descoberta e Ativação Zero-Clique da Carteira Nativa
CREATE TABLE ativacao_proativa_carteira (
    id_ativacao INTEGER PRIMARY KEY AUTOINCREMENT,
    id_cliente VARCHAR(36) NOT NULL,
    canal_origem VARCHAR(30) NOT NULL, -- 'PIX_RECORRENTE', 'NOVO_CARTAO', 'BOLETO_PAGO'
    status_adesao VARCHAR(30) NOT NULL, -- 'CONVIDADO', 'ATIVADO_ZERO_CLIQUE', 'IGNORADO'
    token_provisionado VARCHAR(64),
    tempo_ativacao_ms INT NOT NULL,
    data_evento TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabela de Orquestração de Débito Automático e Pix Agendado (Smart Retry)
CREATE TABLE agenda_pagamentos_resiliente (
    id_agendamento INTEGER PRIMARY KEY AUTOINCREMENT,
    id_cliente VARCHAR(36) NOT NULL,
    tipo_recorrencia VARCHAR(25) NOT NULL, -- 'DEBITO_AUTOMATICO', 'PIX_AGENDADO'
    beneficiario VARCHAR(80) NOT NULL,
    valor_agendado DECIMAL(10, 2) NOT NULL,
    saldo_disponivel_momento DECIMAL(10, 2) NOT NULL,
    tentativas_smart_retry INT DEFAULT 0,
    status_liquidacao VARCHAR(35) NOT NULL, -- 'LIQUIDADO_PRIMEIRA', 'RECUPERADO_RETRY', 'ALERTA_PREVENTIVO_ENVIADO'
    motivo_ocorrencia VARCHAR(150) NOT NULL,
    data_vencimento DATE NOT NULL,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabela de Trava de Pânico e Segurança na Rua (Anti-Roubo Instantâneo)
CREATE TABLE auditoria_trava_panico (
    id_evento_seguranca INTEGER PRIMARY KEY AUTOINCREMENT,
    id_cliente VARCHAR(36) NOT NULL,
    id_token INT NOT NULL,
    gatilho_acionamento VARCHAR(40) NOT NULL, -- '3_TENTATIVAS_ATIPICAS', 'BOTAO_EMERGENCIA_APP', 'FORA_PERIMETRO_SEGURO'
    acao_tomada VARCHAR(40) NOT NULL, -- 'TOKEN_REVOGADO_IMEDIATO', 'AGUARDANDO_PALAVRA_CHAVE', 'DESBLOQUEADO_COM_SUCESSO'
    palavra_chave_validada BOOLEAN DEFAULT FALSE,
    latencia_bloqueio_nanos BIGINT NOT NULL,
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_token) REFERENCES cofre_tokens(id_token)
);

-- 7. Índices para garantir alta performance na leitura de telemetria (Módulos 1 e 2)
CREATE INDEX idx_status_token ON cofre_tokens(status_token);
CREATE INDEX idx_decisao_risco ON log_transacoes_nfc(decisao_risco);
CREATE INDEX idx_status_adesao ON ativacao_proativa_carteira(status_adesao);
CREATE INDEX idx_status_liquidacao ON agenda_pagamentos_resiliente(status_liquidacao);
CREATE INDEX idx_acao_panico ON auditoria_trava_panico(acao_tomada);

-- ==============================================================================
-- MASSA DE DADOS PARA SIMULAÇÃO DE CENÁRIOS REAIS DA CARTEIRA (MÓDULOS 1 E 2)
-- ==============================================================================

-- Dados Módulo 1
INSERT INTO cofre_tokens (id_cliente, final_cartao, funcao_cartao, token_hash, status_token, tentativas_sincronizacao)
VALUES 
('CLI-9981', '4512', 'MULTIPLO', 'tk_a98f7d6e5c4b3a210987654321fedcba', 'REVOGADO', 3),
('CLI-9981', '4512', 'MULTIPLO', 'tk_b12c3d4e5f6a7b8c9d0e1f2a3b4c5d6e', 'ATIVO', 0),
('CLI-7742', '8890', 'DEBITO', 'tk_99887766554433221100aabbccddeeff', 'FALHA_SINCRONIZACAO', 2),
('CLI-5510', '1029', 'CREDITO', 'tk_11223344556677889900ffeeddccbbaa', 'ATIVO', 0);

INSERT INTO log_transacoes_nfc (id_token, modalidade, valor, decisao_risco, motivo_decisao, latencia_nanos)
VALUES 
(1, 'NFC_CARTAO', 45.50, 'BLOQUEADO', 'Token inativo ou desatualizado na troca de funcao', 420500),
(2, 'NFC_CARTAO', 45.50, 'APROVADO', 'Baixo valor e perfil rotineiro apos auto-tokenizacao', 310200),
(2, 'PIX_APROXIMACAO', 1450.00, 'ANALISE_BIOMETRIA', 'Valor atipico acima de R$ 1000.00 - Desvio de perfil', 580900),
(3, 'NFC_CARTAO', 22.00, 'BLOQUEADO', 'Falha critica de sincronizacao de debito na carteira', 610000),
(4, 'PIX_APROXIMACAO', 68.90, 'APROVADO', 'Score comportamental validado dentro do limite', 295400);

-- Dados Módulo 2: Ativação Proativa da Carteira Nativa
INSERT INTO ativacao_proativa_carteira (id_cliente, canal_origem, status_adesao, token_provisionado, tempo_ativacao_ms)
VALUES
('CLI-3301', 'NOVO_CARTAO', 'ATIVADO_ZERO_CLIQUE', 'tk_c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9', 145),
('CLI-4412', 'PIX_RECORRENTE', 'ATIVADO_ZERO_CLIQUE', 'tk_f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4', 132),
('CLI-8820', 'BOLETO_PAGO', 'CONVIDADO', NULL, 89);

-- Dados Módulo 2: Smart Retry em Débito Automático e Pix Agendado
INSERT INTO agenda_pagamentos_resiliente (id_cliente, tipo_recorrencia, beneficiario, valor_agendado, saldo_disponivel_momento, tentativas_smart_retry, status_liquidacao, motivo_ocorrencia, data_vencimento)
VALUES
('CLI-9981', 'DEBITO_AUTOMATICO', 'Enel Energia SP', 285.40, 1500.00, 2, 'RECUPERADO_RETRY', 'Oscilacao interna na janela das 06h; liquidado na 2a tentativa sem juros', '2026-11-19'),
('CLI-7742', 'PIX_AGENDADO', 'Condominio Residencial', 650.00, 2100.00, 3, 'RECUPERADO_RETRY', 'Timeout SPI na abertura; recuperado automaticamente antes do fechamento', '2026-11-19'),
('CLI-5510', 'DEBITO_AUTOMATICO', 'Sabesp Agua', 112.90, 80.00, 3, 'ALERTA_PREVENTIVO_ENVIADO', 'Saldo insuficiente detectado; notificacao push enviada 4h antes do corte', '2026-11-19');

-- Dados Módulo 2: Trava de Pânico e Segurança na Rua
INSERT INTO auditoria_trava_panico (id_cliente, id_token, gatilho_acionamento, acao_tomada, palavra_chave_validada, latencia_bloqueio_nanos)
VALUES
('CLI-9981', 2, '3_TENTATIVAS_ATIPICAS', 'TOKEN_REVOGADO_IMEDIATO', FALSE, 185000),
('CLI-5510', 4, 'BOTAO_EMERGENCIA_APP', 'DESBLOQUEADO_COM_SUCESSO', TRUE, 210400);

-- ==============================================================================
-- QUERIES DE TELEMETRIA E AUDITORIA (VISÃO DE ENGENHARIA DE DADOS - MÓDULOS 1 & 2)
-- ==============================================================================

-- Query 1: Diagnóstico de falhas de sincronização e tokens revogados por cliente (Módulo 1)
SELECT 
    id_cliente,
    final_cartao,
    funcao_cartao,
    status_token,
    tentativas_sincronizacao
FROM cofre_tokens
WHERE status_token IN ('REVOGADO', 'FALHA_SINCRONIZACAO')
ORDER BY tentativas_sincronizacao DESC;

-- Query 2: KPIs de Resiliência NFC/Pix (Taxa de Aprovação e Latência Média em ms) (Módulo 1)
SELECT 
    modalidade,
    decisao_risco,
    COUNT(*) AS total_transacoes,
    ROUND(AVG(valor), 2) AS ticket_medio,
    ROUND(AVG(latencia_nanos) / 1000000.0, 3) AS latencia_media_ms
FROM log_transacoes_nfc
GROUP BY modalidade, decisao_risco
ORDER BY total_transacoes DESC;

-- Query 3: Conversão e Velocidade de Ativação Zero-Clique da Carteira Nativa (Módulo 2)
SELECT 
    canal_origem,
    status_adesao,
    COUNT(*) AS total_clientes,
    ROUND(AVG(tempo_ativacao_ms), 2) AS tempo_medio_ativacao_ms
FROM ativacao_proativa_carteira
GROUP BY canal_origem, status_adesao
ORDER BY total_clientes DESC;

-- Query 4: Eficiência do Smart Retry em Agendamentos e Valor Salvo de Multas (Módulo 2)
SELECT 
    tipo_recorrencia,
    status_liquidacao,
    COUNT(*) AS total_agendamentos,
    SUM(valor_agendado) AS volume_financeiro_protegido,
    ROUND(AVG(tentativas_smart_retry), 1) AS media_retentativas
FROM agenda_pagamentos_resiliente
GROUP BY tipo_recorrencia, status_liquidacao
ORDER BY volume_financeiro_protegido DESC;

-- Query 5: Auditoria de Segurança na Rua e Tempo de Resposta da Trava de Pânico (Módulo 2)
SELECT 
    gatilho_acionamento,
    acao_tomada,
    COUNT(*) AS total_ocorrencias,
    ROUND(AVG(latencia_bloqueio_nanos) / 1000000.0, 3) AS latencia_bloqueio_ms
FROM auditoria_trava_panico
GROUP BY gatilho_acionamento, acao_tomada;
