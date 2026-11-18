let tokenAtivo = true;
let totalTx = 2;
let autoCuraCount = 1;
let somaLatencia = 0.60;
let intervaloAuto = null;

function atualizarLabelCartao() {
    const mod = document.getElementById("modalidade").value;
    const label = document.getElementById("cardFuncLabel");
    label.textContent = mod === "PIX_APROXIMACAO"
        ? "Conta Corrente • Chave Pix"
        : "Conta Corrente • Múltiplo";
}

function simularFalhaSincronizacao() {
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
    const card = document.getElementById("walletCard");
    const modalidade = document.getElementById("modalidade").value;
    const valor = parseFloat(document.getElementById("valorTx").value) || 0;
    const banner = document.getElementById("statusBanner");
    const pill = document.getElementById("tokenStatusPill");
    const hash = document.getElementById("tokenHashDisplay");

    card.classList.remove("pulse");
    void card.offsetWidth;
    card.classList.add("pulse");

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
        decisao = "APROVADO";
        motivo = "Compra rotineira de baixo valor aprovada sem fricção.";
        classeBox = "telemetry-box approved";
        corTexto = "#00875A";
    } else if (valor > 1000.00) {
        decisao = "ANALISE_BIOMETRIA";
        motivo = "Valor atípico (> R$ 1.000,00). Biometria facial solicitada.";
        classeBox = "telemetry-box review";
        corTexto = "#B76E00";
    } else {
        decisao = "APROVADO";
        motivo = "Score comportamental validado dentro do perfil do cliente.";
        classeBox = "telemetry-box approved";
        corTexto = "#00875A";
    }

    const latencia = Math.max(0.24, (performance.now() - inicio)).toFixed(2);
    totalTx++;
    somaLatencia += parseFloat(latencia);

    banner.className = classeBox;
    banner.innerHTML = msgAutoCura + "<strong>Decisão (" + decisao + "):</strong> " + motivo + "<br><small>Latência: " + latencia + " ms</small>";

    document.getElementById("kpiLatencia").textContent = (somaLatencia / totalTx).toFixed(2) + " ms";
    document.getElementById("kpiTotal").textContent = totalTx;
    document.getElementById("kpiAutoFix").textContent = autoCuraCount;

    const logList = document.getElementById("logList");
    const item = document.createElement("div");
    item.className = "log-entry";
    item.innerHTML = "<span><strong>" + modalidade + "</strong> • R$ " + valor.toFixed(2).replace(".", ",") + "</span><span style='color:" + corTexto + "; font-weight:700;'>" + decisao + " (" + latencia + " ms)</span>";
    logList.insertBefore(item, logList.firstChild);
}

function dispararCenarioAleatorio() {
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
