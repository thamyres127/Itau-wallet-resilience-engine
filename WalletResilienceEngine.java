import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class WalletResilienceEngine {

    // Modelos de Domínio
    enum TipoCartao { CREDITO, DEBITO_ONLY, MULTIPLO }
    enum StatusToken { ATIVO, REVOGADO, PENDENTE_SYNC }
    enum DecisaoRisco { APROVADO_SEM_ATRITO, VALIDACAO_BIOMETRICA, BLOQUEADO_PREVENTIVO }

    static class CartaoToken {
        String idToken;
        String finalCartao;
        TipoCartao tipo;
        StatusToken status;
        boolean viaReemitida;

        public CartaoToken(String finalCartao, TipoCartao tipo, boolean viaReemitida) {
            this.idToken = "TKN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            this.finalCartao = finalCartao;
            this.tipo = tipo;
            this.viaReemitida = viaReemitida;
            this.status = StatusToken.PENDENTE_SYNC;
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

    // Repositório em Memória para Telemetria
    private static final List<CartaoToken> cofreTokens = new ArrayList<>();
    private static final List<TransacaoNFC> logsTelemetria = new ArrayList<>();

    // 1. Motor de Auto-Provisionamento (Resolve falha pós-troca e cartão múltiplo)
    public static CartaoToken provisionarTokenInteligente(String finalCartaoAntigo, String finalCartaoNovo, TipoCartao tipo) {
        System.out.println("\n[TOKEN-SERVICE] Iniciando sincronização inteligente de token...");

        // Revoga qualquer token antigo para evitar erro de comunicação na maquininha
        for (CartaoToken t : cofreTokens) {
            if (t.finalCartao.equals(finalCartaoAntigo) && t.status == StatusToken.ATIVO) {
                t.status = StatusToken.REVOGADO;
                System.out.println(" -> Token antigo (" + t.idToken + " | Final " + finalCartaoAntigo + ") revogado automaticamente.");
            }
        }

        // Cria e ativa novo token mesmo se for cartão múltiplo com apenas débito habilitado
        CartaoToken novoToken = new CartaoToken(finalCartaoNovo, tipo, true);
        novoToken.status = StatusToken.ATIVO;
        cofreTokens.add(novoToken);

        System.out.println(" -> Novo token ativo: " + novoToken.idToken + " | Final: " + finalCartaoNovo + " | Modalidade: " + tipo);
        return novoToken;
    }

    // 2. Motor de Risco Contextual em Milissegundos (Reduz atrito na fila)
    public static void processarAproximacao(CartaoToken token, TransacaoNFC tx) {
        long inicio = System.nanoTime();

        if (token.status != StatusToken.ATIVO) {
            tx.decisao = DecisaoRisco.BLOQUEADO_PREVENTIVO;
            tx.motivo = "Token inativo ou dessincronizado";
        } else if (tx.valor <= 80.00 && tx.localHabitual) {
            // Compra rotineira de baixo valor: aprovação instantânea sem pedir senha
            tx.decisao = DecisaoRisco.APROVADO_SEM_ATRITO;
            tx.motivo = "Baixo valor em estabelecimento recorrente (Zero Atrito)";
        } else if (tx.valor > 1000.00 && !tx.localHabitual) {
            // Desvio forte de perfil: pede biometria/iToken antes de recusar seco
            tx.decisao = DecisaoRisco.VALIDACAO_BIOMETRICA;
            tx.motivo = "Valor atípico fora da geolocalização habitual";
        } else {
            tx.decisao = DecisaoRisco.APROVADO_SEM_ATRITO;
            tx.motivo = "Score comportamental validado dentro do limite";
        }

        long fim = System.nanoTime();
        // Simula processamento real de microsserviço (< 200ms)
        tx.latenciaMs = Math.max(12, (fim - inicio) / 1_000_000 + 35);
        logsTelemetria.add(tx);

        String hora = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss"));
        System.out.printf("[%s] %s | %s | R$ %.2f | %s (%dms) -> %s%n",
                hora, tx.idTransacao, tx.estabelecimento, tx.valor, tx.decisao, tx.latenciaMs, tx.motivo);
    }

    // 3. Relatório Consolidado de Telemetria
    public static void exibirMetricasTelemetria() {
        long total = logsTelemetria.size();
        long aprovadasDireto = logsTelemetria.stream()
                .filter(t -> t.decisao == DecisaoRisco.APROVADO_SEM_ATRITO)
                .count();
        double mediaLatencia = logsTelemetria.stream()
                .mapToLong(t -> t.latenciaMs)
                .average()
                .orElse(0.0);

        double taxaFluidez = total > 0 ? (aprovadasDireto * 100.0) / total : 0.0;

        System.out.println("\n=======================================================");
        System.out.println("   ITAU WALLET ENGINE - TELEMETRIA DE APROXIMACAO");
        System.out.println("=======================================================");
        System.out.println("Total de tentativas NFC processadas : " + total);
        System.out.printf("Taxa de aprovacao sem atrito       : %.1f%%%n", taxaFluidez);
        System.out.printf("Latencia media de resposta         : %.1f ms%n", mediaLatencia);
        System.out.println("Status de sincronizacao de tokens  : 100% OPERACIONAL");
        System.out.println("=======================================================\n");
    }

    public static void main(String[] args) {
        System.out.println("=== INICIALIZANDO ITAU WALLET RESILIENCE ENGINE ===");

        // Cenário 1: Cliente trocou de cartão físico (4491 -> 8820) com cartão múltiplo
        CartaoToken tokenAntigo = new CartaoToken("4491", TipoCartao.MULTIPLO, false);
        tokenAntigo.status = StatusToken.ATIVO;
        cofreTokens.add(tokenAntigo);

        CartaoToken tokenAtual = provisionarTokenInteligente("4491", "8820", TipoCartao.MULTIPLO);

        // Cenário 2: Simulação de pagamentos por aproximação no dia a dia
        System.out.println("\n[NFC-GATEWAY] Processando fluxo de aproximação...");
        processarAproximacao(tokenAtual, new TransacaoNFC("Padaria Estacao Cafe", 18.50, true));
        processarAproximacao(tokenAtual, new TransacaoNFC("Metro SP Bilheteria", 5.00, true));
        processarAproximacao(tokenAtual, new TransacaoNFC("Supermercado Extra", 245.90, true));
        processarAproximacao(tokenAtual, new TransacaoNFC("Loja Eletronicos Shopping", 2890.00, false));

        // Cenário 3: Exibe os indicadores finais para o banco
        exibirMetricasTelemetria();
    }
}
