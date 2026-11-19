let tokenAtivo = true;
let travaPanicoAtiva = false;
let totalTx = 1;
let autoCuraCount = 1;
let somaLatencia = 142;
let intervaloAuto = null;

function trocarAbaManual(idAba, botaoClicado) {
    pausarStream();
    document.querySelectorAll(".tab-content").forEach(aba => aba.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));

    const abaAlvo = document.getElementById(idAba);
    if (abaAlvo) abaAlvo.classList.add("active");
    if (botaoClicado) botaoClicado.classList.add("active");
}

function selecionarAbaAutomatica(idAba, idBotao) {
    document.querySelectorAll(".tab-content").forEach(aba => aba.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));

    const abaAlvo = document.getElementById(idAba);
    const btnAlvo = document.getElementById(idBotao);
    if (abaAlvo) abaAlvo.classList.add("active");
    if (btnAlvo) btnAlvo.classList.add("active");
}

function atualizarLabelCartao() {
    const mod = document.getElementById("modalidade").value;
    const label = document.getElementById("cardFuncLabel");
    label.textContent = mod === "PIX_APROXIMACAO"
        ? "Conta Corrente • Chave Pix"
        : "Conta Corrente • Múltiplo";
}

function pulsarCartao() {
    const card = document.getElementById("walletCard");
    if (!card) return;
    card.classList.remove("pulse");
    void card.offsetWidth;
    card.classList.add("pulse");
}

function atualizarKpisUnificados() {
    const latMedia = Math.round(somaLatencia / totalTx);
    document.getElementById("metricLatencia").textContent = latMedia + " ms";
    document.getElementById("metricResiliencia").textContent = travaPanicoAtiva ? "BLOQUEADO" : "100%";
    document.getElementById("metricTxCount").textContent = totalTx;
}

function adicionarLogUnificado(tag, descricao, statusTexto, corTexto) {
    const logList = document.getElementById("logList");
    const item = document.createElement("div");
    item.className = "log-entry";
    item.innerHTML = "<span><strong>" + tag + "</strong> • " + descricao + "</span><strong style='color:" + corTexto + ";'>" + statusTexto + "</strong>";
    logList.insertBefore(item, logList.firstChild);
    if (logList.children.length > 15) {
        logList.removeChild(logList.lastChild);
    }
}

function simularFalhaSincronizacao() {
    if (travaPanicoAtiva) return;
    tokenAtivo = false;
    const pill = document.getElementById("tokenStatusPill");
    const hash = document.getElementById("tokenHashDisplay");
    const banner = document.getElementById("statusBanner");

    pill.textContent = "FALHA SYNC";
    pill.classList.add("error");
    hash.textContent = "Token: tk_a98f...dcba (Inválido)";
    banner.className = "telemetry-box blocked";
    banner.innerHTML = "<strong>Alerta de Carteira:</strong> Dessincronização detectada. Auto-tokenização engatilhada.";
}

function processarAproximacao() {
    const modalidade = document.getElementById("modalidade").value;
    const valor = parseFloat(document.getElementById("valorTx").value) || 0;
    const banner = document.getElementById("statusBanner");
    const pill = document.getElementById("tokenStatusPill");
    const hash = document.getElementById("tokenHashDisplay");

    pulsarCartao();
    const latencia = Math.floor(Math.random() * 45) + 115;
    totalTx++;
    somaLatencia += latencia;

    if (travaPanicoAtiva) {
        banner.className = "telemetry-box blocked";
        banner.innerHTML = "<strong>BLOQUEADO (Trava Pânico):</strong> Operação suspensa por segurança.";
        adicionarLogUnificado(modalidade, "R$ " + valor.toFixed(2).replace(".", ","), "BLOQUEADO", "#DE350B");
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
        msgAutoCura = "🔄 <strong>Auto-tokenização executada:</strong> Novo token provisionado em " + latencia + "ms.<br>";
    }

    let decisao = "APROVADO";
    let motivo = "Transação validada dentro do perfil PF.";
    let classeBox = "telemetry-box approved";
    let corTexto = "#00875A";

    if (valor > 1000.00) {
        decisao = "BIOMETRIA";
        motivo = "Valor acima de R$ 1.000,00. Biometria facial validada.";
        classeBox = "telemetry-box review";
        corTexto = "#B76E00";
    }

    banner.className = classeBox;
    banner.innerHTML = msgAutoCura + "<strong>Decisão (" + decisao + "):</strong> " + motivo;
    atualizarKpisUnificados();
    adicionarLogUnificado(modalidade, "R$ " + valor.toFixed(2).replace(".", ","), decisao, corTexto);
}
function simularAgendamento(comOscilacaoSpi) {
    const tipo = document.getElementById("tipoRecorrencia").value;
    const valor = parseFloat(document.getElementById("valorAgendado").value) || 0;
    const banner = document.getElementById("statusBanner");
    const nomeConta = tipo === "DEBITO_AUTOMATICO" ? "Débito Automático" : "Pix Agendado";

    totalTx++;
    somaLatencia += 138;

    if (comOscilacaoSpi) {
        banner.className = "telemetry-box approved";
        banner.innerHTML = "<strong>Smart Retry Ativado:</strong> Oscilação SPI contornada. " + nomeConta + " de R$ " + valor.toFixed(2).replace(".", ",") + " liquidado sem multa.";
        adicionarLogUnificado("SMART_RETRY", nomeConta + " R$ " + valor.toFixed(2).replace(".", ","), "RECUPERADO", "#00875A");
    } else {
        banner.className = "telemetry-box approved";
        banner.innerHTML = "<strong>Liquidação Concluída:</strong> " + nomeConta + " de R$ " + valor.toFixed(2).replace(".", ",") + " processado com sucesso.";
        adicionarLogUnificado("AGENDA_PF", nomeConta + " R$ " + valor.toFixed(2).replace(".", ","), "LIQUIDADO", "#00875A");
    }
    atualizarKpisUnificados();
}

function ativarCarteiraZeroClique() {
    const canal = document.getElementById("canalAtivacao").value;
    const banner = document.getElementById("statusBanner");
    totalTx++;
    somaLatencia += 110;

    banner.className = "telemetry-box approved";
    banner.innerHTML = "<strong>Carteira Nativa Ativada:</strong> Provisionamento Zero-Clique concluído via gatilho (" + canal + ").";
    adicionarLogUnificado("ZERO_CLIQUE", canal, "ATIVO", "#003399");
    atualizarKpisUnificados();
}

function acionarModoPanico() {
    travaPanicoAtiva = true;
    const pill = document.getElementById("tokenStatusPill");
    const banner = document.getElementById("statusBanner");

    pill.textContent = "TRAVA PÂNICO";
    pill.classList.add("error");
    banner.className = "telemetry-box blocked";
    banner.innerHTML = "<strong>Trava de Pânico Acionada:</strong> Tokens NFC e limites Pix bloqueados preventivamente.";
    totalTx++;
    adicionarLogUnificado("SEGURANCA", "Trava de Pânico Ativada", "BLOQUEADO", "#DE350B");
    atualizarKpisUnificados();
}

function desbloquearCarteira() {
    travaPanicoAtiva = false;
    tokenAtivo = true;
    const pill = document.getElementById("tokenStatusPill");
    const banner = document.getElementById("statusBanner");

    pill.textContent = "TOKEN ATIVO";
    pill.classList.remove("error");
    banner.className = "telemetry-box approved";
    banner.innerHTML = "<strong>Biometria Confirmada:</strong> Carteira PF e tokens NFC restaurados com segurança.";
    totalTx++;
    adicionarLogUnificado("SEGURANCA", "Biometria Facial Validada", "RESTAURADO", "#00875A");
    atualizarKpisUnificados();
}

function dispararCenarioAleatorio() {
    if (travaPanicoAtiva) return;

    const passo = Math.floor(Math.random() * 4);

    if (passo === 0) {
        selecionarAbaAutomatica("abaNfc", "btnTabNfc");
        document.getElementById("modalidade").value = "NFC_CARTAO";
        document.getElementById("valorTx").value = "42.90";
        atualizarLabelCartao();
        processarAproximacao();
    } else if (passo === 1) {
        selecionarAbaAutomatica("abaNfc", "btnTabNfc");
        document.getElementById("modalidade").value = "PIX_APROXIMACAO";
        document.getElementById("valorTx").value = "89.00";
        atualizarLabelCartao();
        simularFalhaSincronizacao();
        setTimeout(processarAproximacao, 800);
    } else if (passo === 2) {
        selecionarAbaAutomatica("abaAgenda", "btnTabAgenda");
        simularAgendamento(true);
    } else {
        selecionarAbaAutomatica("abaSeguranca", "btnTabSeguranca");
        ativarCarteiraZeroClique();
    }
}

function pausarStream() {
    const btn = document.getElementById("btnAuto");
    if (intervaloAuto) {
        clearInterval(intervaloAuto);
        intervaloAuto = null;
        if (btn) {
            btn.textContent = "▶ Ativar Piloto Automático (Ao Vivo)";
            btn.classList.remove("active");
        }
    }
}

function alternarDisparoAutomatico() {
    const btn = document.getElementById("btnAuto");
    if (intervaloAuto) {
        pausarStream();
    } else {
        if (btn) {
            btn.textContent = "⏹ Parar Piloto Automático (Ao Vivo)";
            btn.classList.add("active");
        }
        dispararCenarioAleatorio();
        intervaloAuto = setInterval(dispararCenarioAleatorio, 3000);
    }
}

window.addEventListener("DOMContentLoaded", function() {
    setTimeout(dispararCenarioAleatorio, 600);
    intervaloAuto = setInterval(dispararCenarioAleatorio, 3000);
});
