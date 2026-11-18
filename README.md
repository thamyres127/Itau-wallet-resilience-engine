# 🧡 Itaú Wallet Resilience Engine — Auto-Tokenização & Telemetria NFC/Pix

Protótipo de engenharia voltado para **Pagamentos Pessoa Física (PF)** e carteiras digitais (**NFC e Pix por Aproximação**), focado em resiliência transacional, auto-cura de tokens e observabilidade de baixa latência.

🔗 **[Acessar Simulador Interativo ao Vivo (GitHub Pages)](https://github.io)**

---

## 🎯 Função do Projeto e Problema Resolvido

A principal função deste motor é garantir **continuidade e segurança nas transações por aproximação (POS)**, eliminando falhas comuns na jornada do cliente em carteiras digitais:

* **Auto-Cura de Tokens (*Self-Healing*):** Identifica automaticamente quando um cartão múltiplo (crédito/débito) sofre dessincronização ou revogação, invalidando o token antigo e provisionando um novo token ativo em tempo real.
* **Decisão de Risco Contextual em Sub-milissegundo:** Avalia o valor e o comportamento da compra na maquininha, liberando compras rotineiras sem fricção e acionando validação biométrica para valores atípicos (`> R$ 1.000,00`).
* **Auditoria e Telemetria de Dados:** Registra cada tentativa de aproximação, motivo da decisão e tempo exato de resposta para monitoramento contínuo da saúde da carteira.

---

## 🏗️ Arquitetura e Estrutura dos Arquivos

* **`WalletResilienceEngine.java`:** Motor principal responsável pela lógica de provisionamento de tokens, regras de risco contextual e medição de latência em nanossegundos via `System.nanoTime()`.
* **`schema_telemetria.sql`:** Script relacional contendo as tabelas `cofre_tokens` e `log_transacoes_nfc`, índices de performance, massa de dados para testes e queries analíticas de diagnóstico.
* **`index.html`:** Interface responsiva construída com a identidade visual de Pagamentos PF, exibindo o status do cartão digital, alertas do motor e indicadores de telemetria.
* **`app.js`:** Controlador de eventos e motor de **Disparo Automático (*Stream*)**, responsável por simular cenários reais de pagamento, provocar falhas de sincronização e atualizar os KPIs na tela em tempo real.

---

## 📦 Dependências e Stack Tecnológica

O projeto foi desenhado para operar com **zero bibliotecas externas pesadas**, priorizando velocidade de execução, portabilidade e baixa latência:

* **Linguagem Back-end:** Java Standard Edition (`JDK 17+`) utilizando apenas APIs nativas (`java.time`, `java.util`).
* **Banco de Dados:** SQL Padrão (compatível com **SQLite**, **MySQL** e **PostgreSQL** sem necessidade de extensões).
* **Front-end & Simulação:** HTML5, CSS3 (Flexbox/Grid) e JavaScript ES6+ (`Vanilla JS` com `Performance API` nativa para medição de tempo).
* **Hospedagem:** GitHub Pages.

---

## 🚀 Como Executar

1. **Simulador Web:** Acesse diretamente pelo link do [GitHub Pages](https://github.io) e clique em **"Ativar Disparo Automático (Stream)"** para acompanhar o motor operando em tempo real.
2. **Motor Java:** Compile e execute no terminal com `javac WalletResilienceEngine.java && java WalletResilienceEngine`.
3. **Banco de Dados:** Execute o arquivo `schema_telemetria.sql` em qualquer editor SQLite ou SQL para gerar as tabelas e visualizar os relatórios de latência.

---

Desenvolvido por **Thamyres Micaele** — Engenharia de Dados & Infraestrutura de Pagamentos.
