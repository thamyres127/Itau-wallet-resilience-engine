// ==============================================================================
// PROJETO: Itaú Wallet Resilience Engine (Módulos 1 & 2 - Pagamentos PF)
// ARQUIVO: app.js
// OBJETIVO: Orquestração visual de auto-tokenização NFC, Smart Retry de
//           agendamentos, ativação zero-clique e trava de pânico
// ==============================================================================

let tokenAtivo = true;
let travaPanicoAtiva = false;
let tentativasAtipicas = 0;
const PALAVRA_CHAVE_SEGURANCA = "ORQUIDEA2026";
const SALDO_SIMULADO = 500.00;

let totalTx = 3;
let autoCuraCount = 1;
let ativacoesZeroCliqueCount = 1;
let multasSalvasTotal = 285.40;
let travasPanicoCount = 0;
let somaLatencia = 0.90;
let intervaloAuto = null;

// 1. Navegação entre as Abas Estilo Aplicativo
function trocarAba(idAba, botaoClicado) {
    document.querySelectorAll(".tab-content").forEach(aba => aba.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));

    const abaAlvo = document.getElementById(idAba);
    if (abaAlvo) abaAlvo.classList.add("active");
    if (botaoClicado) botaoClicado.classList.add("active");
}

// 2. Atualização Visual do Cartão Digital
function atualizarLabelCartao() {
    const mod = document.getElementById("modalidade").value;
    const label = document.getElementById("cardFuncLabel");
    label.textContent = mod === "PIX_APROXIMACAO"
        ? "Conta Corrente • Chave Pix"
        : "Conta Corrente • Múltiplo";
}

function pulsarCartao() {
    const card = document.getElementById("walletCard");
    card.classList.remove("pulse");
    void card.offsetWidth;
    card.classList.add("pulse");
}

function atualizarKpisUnificados() {
    document.getElementById("kpiLatencia").textContent = (somaLatencia / totalTx).toFixed(2) + " ms";
    document.getElementById("kpiTotal").textContent = totalTx;
    document.getElementById("kpiAutoFix").textContent = autoCuraCount;
    document.getElementById("kpiAtivacoes").textContent = ativacoesZeroCliqueCount;
    document.getElementById("kpiMultasSalvas").textContent = "R$ " + Math.round(multasSalvasTotal);
    document.getElementById("kpiPanico").textContent = travasPanicoCount;
}

function adicionarLogUnificado(tag, descricao, statusTexto, corTexto) {
    const logList = document.getElementById("logList");
    const item = document.createElement("div");
    item.className = "log-entry";
    item.innerHTML = "<span><strong>" + tag + "</strong> • " + descricao + "</span><span style='color:" + corTexto + "; font-weight:700;'>" + statusTexto + "</span>";
    logList.insertBefore(item, logList.firstChild);
}

// ==============================================================================
// MÓDULO 1: SIMULADOR DE MAQUININHA (NFC & PIX APROXIMAÇÃO)
// ==============================================================================

function simularFalhaSincronizacao() {
    if (travaPanicoAtiva) {
        const banner = document.getElementById("statusBanner");
        banner.className = "telemetry-box blocked";
        banner.innerHTML = "<strong>Carteira Bloqueada:</strong> Valide a Palavra-Chave na aba '3. Segurança & App' antes de operar.";
        return;
    }

    tokenAtivo = false;
    const pill = document.getElementById("tokenStatusPill");
    const hash = document.getElementById("tokenHashDisplay");
    const banner = document.getElementById("statusBanner");

    pill.textContent = "FALHA SYNC";
    pill.classList.add("error");
    hash.textContent = "Token: tk_a98f...dcba (Inválido)";
    banner.className = "telemetry-box blocked";
    banner.innerHTML = "<strong>Alerta de Carteira:</strong> Dessincronização entre crédito/débito detectada. Na próxima aproximação, o motor fará a auto-tokenização.";
}

function processarAproximacao() {
    const inicio = performance.now();
    const modalidade = document.getElementById("modalidade").value;
    const valor = parseFloat(document.getElementById("valorTx").value) || 0;
    const banner = document.getElementById("statusBanner");
    const pill = document.getElementById("tokenStatusPill");
    const hash = document.getElementById("tokenHashDisplay");

    pulsarCartao();

    const latencia = Math.max(0.24, (performance.now() - inicio)).toFixed(2);
    totalTx++;
    somaLatencia += parseFloat(latencia);

    // Bloqueio imediato se a Trava de Pânico estiver acionada
    if (travaPanicoAtiva) {
        banner.className = "telemetry-box blocked";
        banner.innerHTML = "<strong>BLOQUEADO (Trava Pânico):</strong> Aproximação suspensa por segurança. Acesse a aba '3. Segurança & App' e informe a palavra-chave.<br><small>Latência: " + latencia + " ms</small>";
        adicionarLogUnificado(modalidade, "R$ " + valor.toFixed(2).replace(".", ","), "BLOQUEADO (" + latencia + " ms)", "#DE350B");
        atualizarKpisUnificados();
        return;
    }

    let msgAutoCura = "";

    if (!tokenAtivo) {
        tokenAtivo = true;
        autoCuraCount++;
        const novoCodigo = Math.random().toString(16).substring(2, 6);
        pill.textContent = "TOKEN ATIVO";
        pill.classList.remove("error");
        hash.textContent = "Token: tk_" + novoCodigo + "...9f2a";
        msgAutoCura = "🔄 <strong>Auto-tokenização executada:</strong> Token antigo revogado e novo provisionado.<br>";
    }

    let decisao = "";
    let motivo = "";
    let classeBox = "";
    let corTexto = "";

    if (valor <= 0) {
        decisao = "BLOQUEADO";
        motivo = "Valor inválido na maquininha.";
        classeBox = "telemetry-box blocked";
        corTexto = "#DE350B";
    } else if (valor <= 80.00) {
        tentativasAtipicas = 0;
        decisao = "APROVADO";
        motivo = "Compra rotineira de baixo valor aprovada sem fricção.";
        classeBox = "telemetry-box approved";
        corTexto = "#00875A";
    } else if (valor > 1000.00) {
        tentativasAtipicas++;
        if (tentativasAtipicas >= 3) {
            acionarTravaPanico("3 tentativas atípicas seguidas acima de R$ 1.000,00");
            return;
        }
        decisao = "ANALISE_BIOMETRIA";
        motivo = "Valor atípico (> R$ 1.000,00). Biometria facial solicitada (" + tentativasAtipicas + "/3 alertas).";
        classeBox = "telemetry-box review";
        corTexto = "#B76E00";
    } else {
        tentativasAtipicas = 0;
        decisao = "APROVADO";
        motivo = "Score comportamental validado dentro do perfil do cliente.";
        classeBox = "telemetry-box approved";
        corTexto = "#00875A";
    }

    banner.className = classeBox;
    banner.innerHTML = msgAutoCura + "<strong>Decisão (" + decisao + "):</strong> " + motivo + "<br><small>Latência: " + latencia + " ms</small>";

    atualizarKpisUnificados();
    adicionarLogUnificado(modalidade, "R$ " + valor.toFixed(2).replace(".", ","), decisao + " (" + latencia + " ms)", corTexto);
}

function dispararCenarioAleatorio() {
    if (travaPanicoAtiva) {
        alternarDisparoAutomatico();
        return;
    }

    const cenarios = [
        { mod: "NFC_CARTAO", val: 32.90, falha: false },
        { mod: "PIX_APROXIMACAO", val: 75.00, falha: true },
        { mod: "NFC_CARTAO", val: 1450.00, falha: false },
        { mod: "PIX_APROXIMACAO", val: 18.50, falha: false },
        { mod: "NFC_CARTAO", val: 240.00, falha: true }
    ];
    const sorteado = cenarios[Math.floor(Math.random() * cenarios.length)];
    document.getElementById("modalidade").value = sorteado.mod;
    document.getElementById("valorTx").value = sorteado.val.toFixed(2);
    atualizarLabelCartao();

    if (sorteado.falha) {
        simularFalhaSincronizacao();
        setTimeout(processarAproximacao, 700);
    } else {
        processarAproximacao();
    }
}

function alternarDisparoAutomatico() {
    const btn = document.getElementById("btnAuto");
    if (intervaloAuto) {
        clearInterval(intervaloAuto);
        intervaloAuto = null;
        btn.textContent = "▶ Ativar Disparo Automático (Stream)";
        btn.classList.remove("active");
    } else {
        btn.textContent = "⏹ Parar Disparo Automático";
        btn.classList.add("active");
        dispararCenarioAleatorio();
        intervaloAuto = setInterval(dispararCenarioAleatorio, 2500);
    }
}

// ==============================================================================
// MÓDULO 2A: ORQUESTRADOR DE DÉBITO AUTOMÁTICO & PIX AGENDADO (SMART RETRY)
// ==============================================================================

function simularAgendamento(comOscilacaoSpi) {
    const tipo = document.getElementById("tipoRecorrencia").value;
    const valor = parseFloat(document.getElementById("valorAgendado").value) || 0;
    const banner = document.getElementById("statusBanner");
    const nomeConta = tipo === "DEBITO_AUTOMATICO" ? "Enel Energia SP" : "Pix Agendado";

    if (valor <= 0) {
        banner.className = "telemetry-box blocked";
        banner.innerHTML = "<strong>Valor Inválido:</strong> Informe um valor maior que zero para o agendamento.";
        return;
    }

    totalTx++;
    somaLatencia += 0.35;

    if (valor > SALDO_SIMULADO) {
        banner.className = "telemetry-box review";
        banner.innerHTML = "<strong>Alerta Preventivo Enviado:</strong> Saldo simulado (R$ " + SALDO_SIMULADO.toFixed(2).replace(".", ",") + ") insuficiente para " + nomeConta + " (R$ " + valor.toFixed(2).replace(".", ",") + "). Push enviado 4h antes do fechamento.";
        adicionarLogUnificado("AGENDA_PF", nomeConta + " (R$ " + valor.toFixed(2).replace(".", ",") + ")", "ALERTA SALDO", "#B76E00");
        atualizarKpisUnificados();
        return;
    }

    if (comOscilacaoSpi) {
        multasSalvasTotal += valor;
        banner.className = "telemetry-box approved";
