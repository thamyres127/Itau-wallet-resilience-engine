# Itaú Wallet Resilience Engine | Pagamentos PF

Simulador interativo de arquitetura resiliente voltado para jornadas de Pagamentos Pessoa Física (PF), cobrindo pagamentos por aproximação (Cartão NFC e Pix), recuperação inteligente de agendamentos recorrentes, segurança preventiva e telemetria SQL unificada.

🔗 **Acesse o simulador ao vivo:** https://thamyres127.github.io/Itau-wallet-resilience-engine/

---

## 🎯 Problema Resolvido

Em operações de pagamentos digitais de alta criticidade, falhas pontuais de sincronização de tokens ou instabilidades momentâneas na liquidação podem gerar atrito na ponta e perda de conversão. Este projeto demonstra na prática como mitigar esses cenários com mecanismos automatizados de recuperação e proteção.

---

## ⚙️ Módulos e Funcionalidades

### Módulo 1 — Aproximação (NFC & Pix por Aproximação)
* **Auto-tokenização (Self-Healing):** Detecta dessincronização entre crédito/débito e provisiona um novo token criptográfico automaticamente na próxima tentativa, evitando recusa na maquininha (POS).
* **Validação Comportamental:** Aprovação sem fricção para compras rotineiras e acionamento de biometria facial para transações atípicas acima de R$ 1.000,00.

### Módulo 2 — Smart Retry & Segurança Ativa
* **Orquestrador Smart Retry:** Contorna oscilações momentâneas no SPI durante liquidações de Débito Automático e Pix Agendado, evitando atrasos e multas ao cliente.
* **Ativação Zero-Clique:** Gatilhos inteligentes de descoberta e provisionamento da carteira nativa após eventos recorrentes ou emissão de novo cartão múltiplo.
* **Trava de Pânico & Biometria:** Bloqueio preventivo imediato de tokens NFC e limites transacionais, com restauração condicionada à validação biométrica.

### Telemetria SQL Unificada
* Monitoramento contínuo em tempo real com cálculo de latência média (ms), índice de resiliência operacional e log estruturado de eventos transacionais.

---

## 🛠️ Tecnologias Utilizadas

* **Back-end & Regras de Negócio:** Java (`WalletResilienceEngine.java`)
* **Banco de Dados & Telemetria:** SQL (`schema_telemetria.sql` — compatível com PostgreSQL e SQLite)
* **Front-end & Orquestração Visual:** HTML5, CSS3 e JavaScript puro (ES6+) com motor de simulação em tempo real
