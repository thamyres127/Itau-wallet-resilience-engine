-- ==============================================================================
-- PROJETO: Itaú Wallet Resilience Engine
-- ARQUIVO: schema_telemetria.sql
-- OBJETIVO: Persistência de tokens NFC/Pix, auditoria de risco e telemetria
-- ==============================================================================

-- 1. Limpeza preventiva para permitir reexecução limpa nos testes
DROP TABLE IF EXISTS log_transacoes_nfc;
DROP TABLE IF EXISTS cofre_tokens;

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

-- 4. Índices para garantir alta performance na leitura de telemetria
CREATE INDEX idx_status_token ON cofre_tokens(status_token);
CREATE INDEX idx_decisao_risco ON log_transacoes_nfc(decisao_risco);

-- ==============================================================================
-- MASSA DE DADOS PARA SIMULAÇÃO DE CENÁRIOS REAIS DA CARTEIRA
-- ==============================================================================

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

-- ==============================================================================
-- QUERIES DE TELEMETRIA E AUDITORIA (VISÃO DE ENGENHARIA DE DADOS)
-- ==============================================================================

-- Query 1: Diagnóstico de falhas de sincronização e tokens revogados por cliente
SELECT 
    id_cliente,
    final_cartao,
    funcao_cartao,
    status_token,
    tentativas_sincronizacao
FROM cofre_tokens
WHERE status_token IN ('REVOGADO', 'FALHA_SINCRONIZACAO')
ORDER BY tentativas_sincronizacao DESC;

-- Query 2: KPIs de Resiliência (Taxa de Aprovação e Latência Média em Milissegundos)
SELECT 
    modalidade,
    decisao_risco,
    COUNT(*) AS total_transacoes,
    ROUND(AVG(valor), 2) AS ticket_medio,
    ROUND(AVG(latencia_nanos) / 1000000.0, 3) AS latencia_media_ms
FROM log_transacoes_nfc
GROUP BY modalidade, decisao_risco
ORDER BY total_transacoes DESC;
