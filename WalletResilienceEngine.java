import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class WalletResilienceEngine {

    // =========================================================================
    // MODELOS DE DOMÍNIO (MÓDULO 1 & MÓDULO 2)
    // =========================================================================
    enum TipoCartao { CREDITO, DEBITO_ONLY, MULTIPLO }
    enum StatusToken { ATIVO, REVOGADO, PENDENTE_SYNC, BLOQUEADO_PANICO }
    enum DecisaoRisco { APROVADO_SEM_ATRITO, VALIDACAO_BIOMETRICA, BLOQUEADO_PREVENTIVO }

    // Enums do Módulo 2
    enum CanalAtivacao { PIX_RECORRENTE, NOVO_CARTAO, BOLETO_PAGO }
    enum TipoRecorrencia { DEBITO_AUTOMATICO, PIX_AGENDADO }
    enum StatusLiquidacao { LIQUIDADO_PRIMEIRA, RECUPERADO_RETRY, ALERTA_PREVENTIVO_ENVIADO }

    static class CartaoToken {
        String idToken;
        String idCliente;
        String finalCartao;
        TipoCartao tipo;
        StatusToken status;
        boolean viaReemitida;
        int tentativasAtipicasSeguidas;
        String palavraChaveSeguranca;

        public CartaoToken(String idCliente, String finalCartao, TipoCartao tipo, boolean viaReemitida, String palavraChaveSeguranca) {
            this.idToken = "TKN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            this.idCliente = idCliente;
            this.finalCartao = finalCartao;
            this.tipo = tipo;
            this.viaReemitida = viaReemitida;
            this.status = StatusToken.PENDENTE_SYNC;
            this.tentativasAtipicasSeguidas = 0;
            this.palavraChaveSeguranca = palavraChaveSeguranca;
        }
    }

    static class TransacaoNFC {
        String idTransacao;
        String estabelecimento;
        double valor;
        boolean localHabitual;
        long latenciaMs;
        DecisaoRisco decisao;
        String motivo;

        public TransacaoNFC(String estabelecimento, double valor, boolean localHabitual) {
            this.idTransacao = "NFC-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            this.estabelecimento = estabelecimento;
            this.valor = valor;
            this.localHabitual = localHabitual;
        }
    }

    // Classes de Domínio do Módulo 2
    static class EventoAtivacaoProativa {
        String idCliente;
        CanalAtivacao canal;
        String tokenProvisionado;
        long tempoAtivacaoMs;

        public EventoAtivacaoProativa(String idCliente, CanalAtivacao canal, String tokenProvisionado, long tempoAtivacaoMs) {
            this.idCliente = idCliente;
            this.canal = canal;
            this.tokenProvisionado = tokenProvisionado;
            this.tempoAtivacaoMs = tempoAtivacaoMs;
        }
    }

    static class AgendamentoPF {
        String idAgendamento;
        String idCliente;
        TipoRecorrencia tipo;
        String beneficiario;
        double valorAgendado;
        double saldoDisponivel;
        int tentativasSmartRetry;
        StatusLiquidacao status;
        String motivoOcorrencia;

        public AgendamentoPF(String idCliente, TipoRecorrencia tipo, String beneficiario, double valorAgendado, double saldoDisponivel) {
            this.idAgendamento = "AGD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            this.idCliente = idCliente;
            this.tipo = tipo;
            this.beneficiario = beneficiario;
            this.valorAgendado = valorAgendado;
            this.saldoDisponivel = saldoDisponivel;
            this.tentativasSmartRetry = 0;
        }
    }

    static class EventoSegurancaPanico {
        String idEvento;
        String idCliente;
        String idToken;
        String gatilho;
        String acaoTomada;
        boolean desbloqueado;
        long latenciaBloqueioNanos;

        public EventoSegurancaPanico(String idCliente, String idToken, String gatilho, String acaoTomada, long latenciaBloqueioNanos) {
            this.idEvento = "SEC-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            this.idCliente = idCliente;
            this.idToken = idToken;
            this.gatilho = gatilho;
            this.acaoTomada = acaoTomada;
            this.desbloqueado = false;
            this.latenciaBloqueioNanos = latenciaBloqueioNanos;
        }
    }

    // =========================================================================
    // REPOSITÓRIOS EM MEMÓRIA PARA TELEMETRIA UNIFICADA
    // =========================================================================
    private static final List<CartaoToken> cofreTokens = new ArrayList<>();
    private static final List<TransacaoNFC> logsTelemetria = new ArrayList<>();
    private static final List<EventoAtivacaoProativa> logsAtivacao = new ArrayList<>();
    private static final List<AgendamentoPF> logsAgendamentos = new ArrayList<>();
    private static final List<EventoSegurancaPanico> logsPanico = new ArrayList<>();

    // =========================================================================
    // MÓDULO 1: AUTO-PROVISIONAMENTO & RISCO CONTEXTUAL NFC
    // =========================================================================

    // 1. Motor de Auto-Provisionamento (Resolve falha pós-troca e cartão múltiplo)
    public static CartaoToken provisionarTokenInteligente(String idCliente, String finalCartaoAntigo, String finalCartaoNovo, TipoCartao tipo, String palavraChave) {
        System.out.println("\n[TOKEN-SERVICE] Iniciando sincronizacao inteligente de token...");

        for (CartaoToken t : cofreTokens) {
            if (t.finalCartao.equals(finalCartaoAntigo) && t.status == StatusToken.ATIVO) {
                t.status = StatusToken.REVOGADO;
                System.out.println(" -> Token antigo (" + t.idToken + " | Final " + finalCartaoAntigo + ") revogado automaticamente.");
            }
        }

        CartaoToken novoToken = new CartaoToken(idCliente, finalCartaoNovo, tipo, true, palavraChave);
        novoToken.status = StatusToken.ATIVO;
        cofreTokens.add(novoToken);

        System.out.println(" -> Novo token ativo: " + novoToken.idToken + " | Final: " + finalCartaoNovo + " | Modalidade: " + tipo);
        return novoToken;
    }

    // 2. Motor de Risco Contextual em Milissegundos (Integrado com gatilho de segurança)
    public static void processarAproximacao(CartaoToken token, TransacaoNFC tx) {
        long inicio = System.nanoTime();

        if (token.status == StatusToken.BLOQUEADO_PANICO) {
            tx.decisao = DecisaoRisco.BLOQUEADO_PREVENTIVO;
            tx.motivo = "Carteira em Modo Panico - Exige Palavra-Chave de Seguranca";
        } else if (token.status != StatusToken.ATIVO) {
            tx.decisao = DecisaoRisco.BLOQUEADO_PREVENTIVO;
            tx.motivo = "Token inativo ou dessincronizado";
        } else if (tx.valor <= 80.00 && tx.localHabitual) {
            token.tentativasAtipicasSeguidas = 0;
            tx.decisao = DecisaoRisco.APROVADO_SEM_ATRITO;
            tx.motivo = "Baixo valor em estabelecimento recorrente (Zero Atrito)";
        } else if (tx.valor > 1000.00 && !tx.localHabitual) {
            token.tentativasAtipicasSeguidas++;
            tx.decisao = DecisaoRisco.VALIDACAO_BIOMETRICA;
            tx.motivo = "Valor atipico fora da geolocalizacao habitual";

            // Integração Módulo 2: Se acumular 3 tentativas atípicas seguidas, aciona Trava de Pânico
            if (token.tentativasAtipicasSeguidas >= 3) {
                acionarTravaPanico(token, "3_TENTATIVAS_ATIPICAS");
            }
        } else {
            token.tentativasAtipicasSeguidas = 0;
            tx.decisao = DecisaoRisco.APROVADO_SEM_ATRITO;
            tx.motivo = "Score comportamental validado dentro do limite";
        }

        long fim = System.nanoTime();
        tx.latenciaMs = Math.max(12, (fim - inicio) / 1_000_000 + 35);
        logsTelemetria.add(tx);

        String hora = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss"));
        System.out.printf("[%s] %s | %s | R$ %.2f | %s (%dms) -> %s%n",
                hora, tx.idTransacao, tx.estabelecimento, tx.valor, tx.decisao, tx.latenciaMs, tx.motivo);
    }

    // =========================================================================
    // MÓDULO 2: ATIVAÇÃO PROATIVA, SMART RETRY DE AGENDAMENTOS & TRAVA PÂNICO
    // =========================================================================

    // 3. Ativação Zero-Clique da Carteira Nativa (Resolve baixa adesão e desconhecimento)
    public static CartaoToken ativarCarteiraProativa(String idCliente, String finalCartao, TipoCartao tipo, CanalAtivacao canal, String palavraChave) {
        long inicio = System.nanoTime();
        System.out.println("\n[ONBOARDING-PROATIVO] Evento '" + canal + "' detectado para cliente " + idCliente + ".");

        CartaoToken tokenAtivado = new CartaoToken(idCliente, finalCartao, tipo, false, palavraChave);
        tokenAtivado.status = StatusToken.ATIVO;
        cofreTokens.add(tokenAtivado);

        long fim = System.nanoTime();
        long tempoAtivacaoMs = Math.max(120, (fim - inicio) / 1_000_000 + 130);
        logsAtivacao.add(new EventoAtivacaoProativa(idCliente, canal, tokenAtivado.idToken, tempoAtivacaoMs));

        System.out.println(" -> Carteira Nativa ativada em Zero-Clique (" + tempoAtivacaoMs + "ms) | Token: " + tokenAtivado.idToken);
        System.out.println(" -> Push enviado: 'Sua Carteira Itau ja esta pronta para aproximacao com protecao antifraude!'");
        return tokenAtivado;
    }

    // 4. Orquestrador de Débito Automático & Pix Agendado (Smart Retry & Alerta Preventivo)
    public static void processarAgendamentoComSmartRetry(AgendamentoPF agendamento, boolean simularOscilacaoInterna) {
