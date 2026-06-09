// ==========================================
// CENTRAL DE ESTADOS (BASE DE DADOS LOCAL)
// ==========================================
const CoreEngine = {
    db: {
        initialBalance: 0, // Novo campo para persistir o saldo
        budgetCeiling: 2500,
        transactions: [],
        goals: [],
        bills: []
    },

    init() {
        const localData = localStorage.getItem('jarvis_mobile_db');
        if (localData) {
            this.db = JSON.parse(localData);
            // Migração: se o campo não existir em saves antigos, inicia em 0
            if (this.db.initialBalance === undefined) this.db.initialBalance = 0;
            if (!this.db.bills) this.db.bills = [];
        } else {
            this.db = {
                initialBalance: 0,
                budgetCeiling: 2500,
                transactions: [],
                goals: [{ id: 1, name: "Upgrade Setup (RTX 5060)", target: 3500, current: 1200 }],
                bills: []
            };
            this.save();
        }
    },

    save() {
        localStorage.setItem('jarvis_mobile_db', JSON.stringify(this.db));
        this.renderAll();
    },

    reset() {
        if(confirm("Deseja expurgar todos os registros do banco local?")) {
            localStorage.removeItem('jarvis_mobile_db');
            this.init();
            ViewRouter.navigate("overview");
        }
    },

    renderAll() {
        renderOverviewMetrics();
        renderLedgerList();
        renderGoalsLayout();
        renderBillsLayout();
    }
};

// ==========================================
// RENDERIZADOR DE MÉTRICAS (ATUALIZADO)
// ==========================================
function renderOverviewMetrics() {
    let income = 0;
    let expense = 0;

    CoreEngine.db.transactions.forEach(tx => {
        if (tx.type === 'income') income += tx.amount;
        if (tx.type === 'expense') expense += tx.amount;
    });

    // CÁLCULO CORRIGIDO: Saldo = Inicial + Entradas - Saídas
    // Isso garante que o valor inicial (que você salvou) sempre seja somado
    const netBalance = CoreEngine.db.initialBalance + income - expense;
    const ceiling = CoreEngine.db.budgetCeiling;

    document.getElementById("net-balance-value").innerText = `R$ ${netBalance.toFixed(2).replace('.', ',')}`;
    // ... (restante da função permanece igual)
}


    // CÁLCULO CORRIGIDO: Saldo Inicial + Entradas - Saídas
    const netBalance = CoreEngine.db.initialBalance + income - expense;
    const ceiling = CoreEngine.db.budgetCeiling;

    document.getElementById("net-balance-value").innerText = `R$ ${netBalance.toFixed(2).replace('.', ',')}`;
    document.getElementById("income-total-value").innerText = `R$ ${income.toFixed(2).replace('.', ',')}`;
    document.getElementById("expense-total-value").innerText = `R$ ${expense.toFixed(2).replace('.', ',')}`;
    document.getElementById("ceiling-numeric-display").innerText = `R$ ${ceiling.toFixed(2).replace('.', ',')}`;

    const balanceCard = document.getElementById("balance-card");
    if(balanceCard) {
        if (netBalance < 0) balanceCard.classList.add("alert-overt");
        else balanceCard.classList.remove("alert-overt");
    }

    const fillIndicator = document.getElementById("budget-fill-indicator");
    const statusPill = document.getElementById("budget-status-pill");
    const narrativeText = document.getElementById("budget-narrative-text");

    let percentage = ceiling > 0 ? (expense / ceiling) * 100 : 0;
    if (percentage > 100) percentage = 100;

    if (fillIndicator) {
        fillIndicator.style.width = `${percentage}%`;
        if (percentage >= 90) {
            fillIndicator.classList.add("danger");
            if (statusPill) { statusPill.className = "status-pill status-danger"; statusPill.innerText = "CRÍTICO"; }
            if (narrativeText) narrativeText.innerText = "Teto quase atingido";
        } else {
            fillIndicator.classList.remove("danger");
            if (statusPill) { statusPill.className = "status-pill status-healthy"; statusPill.innerText = "OK"; }
            if (narrativeText) narrativeText.innerText = "Sincronizado";
        }
    }

    const baseCalculo = income > 0 ? income : 0;
    document.getElementById("matrix-p1").innerText = `R$ ${(baseCalculo * 0.5).toFixed(2).replace('.', ',')}`;
    document.getElementById("matrix-p2").innerText = `R$ ${(baseCalculo * 0.3).toFixed(2).replace('.', ',')}`;
    document.getElementById("matrix-p3").innerText = `R$ ${(baseCalculo * 0.2).toFixed(2).replace('.', ',')}`;

    document.getElementById("mv-fill-1").style.width = income > 0 ? '50%' : '0%';
    document.getElementById("mv-fill-2").style.width = income > 0 ? '30%' : '0%';
    document.getElementById("mv-fill-3").style.width = income > 0 ? '20%' : '0%';
}

// Nova função utilitária para chamar quando você atualizar o valor do saldo no HTML
function updateInitialBalance(val) {
    CoreEngine.db.initialBalance = parseFloat(val) || 0;
    CoreEngine.save();
}

// ==========================================
// ARQUITETURA DE ROTEAMENTO (VIEW ROUTER)
// ==========================================
const ViewRouter = {
    init() {
        const navButtons = {
            overview: document.getElementById("btn-menu-overview"),
            jarvis: document.getElementById("btn-menu-jarvis"),
            goals: document.getElementById("btn-menu-goals")
        };

        if (navButtons.overview) navButtons.overview.addEventListener("click", () => this.navigate("overview"));
        if (navButtons.jarvis) navButtons.jarvis.addEventListener("click", () => this.navigate("jarvis"));
        if (navButtons.goals) navButtons.goals.addEventListener("click", () => this.navigate("goals"));

        this.navigate("overview");
    },

    navigate(key) {
        const views = { 
            overview: document.getElementById("view-overview"), 
            jarvis: document.getElementById("view-jarvis"),
            goals: document.getElementById("view-goals") 
        };
        
        const links = { 
            overview: document.getElementById("btn-menu-overview"), 
            jarvis: document.getElementById("btn-menu-jarvis"),
            goals: document.getElementById("btn-menu-goals") 
        };

        Object.keys(views).forEach(vKey => {
            if (views[vKey] && links[vKey]) {
                if (vKey === key) {
                    views[vKey].classList.add("active-view");
                    links[vKey].classList.add("active");
                } else {
                    views[vKey].classList.remove("active-view");
                    links[vKey].classList.remove("active");
                }
            }
        });

        if (key === "goals") renderGoalsLayout();
        if (key === "overview") {
            renderLedgerList();
            renderBillsLayout();
        }
        
        const mainViewport = document.querySelector('.main-viewport');
        if (mainViewport) mainViewport.scrollTop = 0;
    }
};

// ==========================================
// RENDERIZADORES E PROCESSADORES LÓGICOS
// ==========================================
let currentLedgerFilter = "all";

function renderOverviewMetrics() {
    let income = 0;
    let expense = 0;

    CoreEngine.db.transactions.forEach(tx => {
        if (tx.type === 'income') income += tx.amount;
        if (tx.type === 'expense') expense += tx.amount;
    });

    const netBalance = income - expense;
    const ceiling = CoreEngine.db.budgetCeiling;

    document.getElementById("net-balance-value").innerText = `R$ ${netBalance.toFixed(2).replace('.', ',')}`;
    document.getElementById("income-total-value").innerText = `R$ ${income.toFixed(2).replace('.', ',')}`;
    document.getElementById("expense-total-value").innerText = `R$ ${expense.toFixed(2).replace('.', ',')}`;
    document.getElementById("ceiling-numeric-display").innerText = `R$ ${ceiling.toFixed(2).replace('.', ',')}`;

    const balanceCard = document.getElementById("balance-card");
    if(balanceCard) {
        if (netBalance < 0) balanceCard.classList.add("alert-overt");
        else balanceCard.classList.remove("alert-overt");
    }

    const fillIndicator = document.getElementById("budget-fill-indicator");
    const statusPill = document.getElementById("budget-status-pill");
    const narrativeText = document.getElementById("budget-narrative-text");

    let percentage = ceiling > 0 ? (expense / ceiling) * 100 : 0;
    if (percentage > 100) percentage = 100;

    if (fillIndicator) {
        fillIndicator.style.width = `${percentage}%`;
        if (percentage >= 90) {
            fillIndicator.classList.add("danger");
            if (statusPill) { statusPill.className = "status-pill status-danger"; statusPill.innerText = "CRÍTICO"; }
            if (narrativeText) narrativeText.innerText = "Teto quase atingido";
        } else {
            fillIndicator.classList.remove("danger");
            if (statusPill) { statusPill.className = "status-pill status-healthy"; statusPill.innerText = "OK"; }
            if (narrativeText) narrativeText.innerText = "Sincronizado";
        }
    }

    const baseCalculo = income > 0 ? income : 0;
    document.getElementById("matrix-p1").innerText = `R$ ${(baseCalculo * 0.5).toFixed(2).replace('.', ',')}`;
    document.getElementById("matrix-p2").innerText = `R$ ${(baseCalculo * 0.3).toFixed(2).replace('.', ',')}`;
    document.getElementById("matrix-p3").innerText = `R$ ${(baseCalculo * 0.2).toFixed(2).replace('.', ',')}`;

    document.getElementById("mv-fill-1").style.width = income > 0 ? '50%' : '0%';
    document.getElementById("mv-fill-2").style.width = income > 0 ? '30%' : '0%';
    document.getElementById("mv-fill-3").style.width = income > 0 ? '20%' : '0%';
}

function renderLedgerList() {
    const listContainer = document.getElementById("ledger-dynamic-list");
    if (!listContainer) return;
    
    listContainer.innerHTML = "";

    const filteredTransactions = CoreEngine.db.transactions.filter(tx => {
        if (currentLedgerFilter === "all") return true;
        return tx.category.toLowerCase().startsWith(currentLedgerFilter.toLowerCase());
    });

    if (filteredTransactions.length === 0) {
        listContainer.innerHTML = `<li style="text-align:center;font-size:0.8rem;color:var(--zinc-600);padding:1rem;">Nenhum registro nesta categoria.</li>`;
        setupFilterClickListeners();
        return;
    }

    [...filteredTransactions].reverse().forEach(tx => {
        const li = document.createElement("li");
        li.className = "ledger-item";
        
        const isIncome = tx.type === 'income';
        const sign = isIncome ? "+" : "-";
        const classColor = isIncome ? "income-class" : "";

        li.innerHTML = `
            <div class="ledger-meta-block">
                <div class="ledger-avatar-icon">
                    <i data-lucide="${isIncome ? 'arrow-down-left' : 'arrow-up-right'}"></i>
                </div>
                <div class="ledger-text-info">
                    <span class="ledger-text-title">${tx.title}</span>
                    <span class="ledger-text-sub">${tx.category}</span>
                </div>
            </div>
            <div class="ledger-action-side">
                <span class="ledger-amount-label ${classColor} font-mono">${sign}R$ ${tx.amount.toFixed(2).replace('.', ',')}</span>
                <button class="btn-ledger-delete" onclick="deleteTransaction(${tx.id})">
                    <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
                </button>
            </div>
        `;
        listContainer.appendChild(li);
    });
    
    if(typeof lucide !== 'undefined') lucide.createIcons();
    setupFilterClickListeners(); 
}

function setupFilterClickListeners() {
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.replaceWith(chip.cloneNode(true));
    });

    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', function() {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            currentLedgerFilter = this.getAttribute('data-filter');
            renderLedgerList();
        });
    });
}

function renderGoalsLayout() {
    const container = document.getElementById("goals-main-viewport");
    const badgeCount = document.getElementById("sidebar-goals-count");
    if (!container) return;

    container.innerHTML = "";
    if(badgeCount) badgeCount.innerText = CoreEngine.db.goals.length;

    if (CoreEngine.db.goals.length === 0) {
        container.innerHTML = `<p style="text-align:center;font-size:0.8rem;color:var(--zinc-600);padding:1rem;">Sem alvos estratégicos mapeados.</p>`;
        return;
    }

    CoreEngine.db.goals.forEach(goal => {
        let p = (goal.current / goal.target) * 100;
        if (p > 100) p = 100;

        const remaining = goal.target - goal.current;

        const div = document.createElement("div");
        div.className = "goal-track-card";
        div.style.cssText = "margin-bottom: 1rem; position: relative;";
        
        div.innerHTML = `
            <button class="btn-ledger-delete" onclick="deleteGoal(${goal.id})" style="position: absolute; top: 10px; right: 10px; background: transparent; border: none; cursor: pointer; color: var(--zinc-500);">
                <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
            </button>

            <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:0.5rem; padding-right: 24px;">
                <span style="font-weight:600; color:#fff;">${goal.name}</span>
                <span class="font-mono" style="color:var(--jarvis-cyan);">${p.toFixed(0)}%</span>
            </div>
            <div class="progress-track-bar" style="height:4px; margin-bottom:0.5rem;">
                <div class="progress-fill-bar" style="width: ${p}%; background:var(--jarvis-cyan);"></div>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:0.7rem; color:var(--zinc-500);">
                <span>Faltam: R$ ${remaining > 0 ? remaining.toFixed(2).replace('.', ',') : '0,00'}</span>
                <span>Alvo: R$ ${goal.target.toFixed(2).replace('.', ',')}</span>
            </div>

            <div class="goal-simulator-box" style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px dashed rgba(255,255,255,0.05);">
                <div style="display:flex; justify-content:space-between; font-size:0.65rem; color:var(--zinc-400)">
                    <span>Simular Aporte Mensal:</span>
                    <span class="font-mono text-cyan" id="sim-val-${goal.id}">R$ 100</span>
                </div>
                <input type="range" min="20" max="1000" step="10" value="100" class="sim-range" id="sim-range-${goal.id}" oninput="runGoalSimulation(${goal.id}, ${remaining})">
                <span class="sim-result" id="sim-res-${goal.id}">Tempo estimado: ${remaining > 0 ? Math.ceil(remaining / 100) : 0} meses</span>
            </div>
        `;
        container.appendChild(div);
    });

    if(typeof lucide !== 'undefined') lucide.createIcons();
}

function runGoalSimulation(id, remaining) {
    const range = document.getElementById(`sim-range-${id}`);
    const displayVal = document.getElementById(`sim-val-${id}`);
    const displayResult = document.getElementById(`sim-res-${id}`);
    
    if(!range || !displayVal || !displayResult) return;
    
    const aporte = parseFloat(range.value);
    displayVal.innerText = `R$ ${aporte}`;
    
    if (remaining <= 0) {
        displayResult.innerText = `Alvo já atingido!`;
        return;
    }
    
    const meses = Math.ceil(remaining / aporte);
    displayResult.innerText = `Tempo estimado: ${meses} meses de aporte contínuo`;
}

function deleteGoal(id) {
    if(confirm("Deseja remover esta meta estratégica?")) {
        CoreEngine.db.goals = CoreEngine.db.goals.filter(goal => goal.id !== id);
        CoreEngine.save();
    }
}

// ==========================================
// MÓDULO GESTOR DE COMPROMISSOS E ASSINATURAS
// ==========================================
function playJarvisNotificationSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, ctx.currentTime); 
        gain1.gain.setValueAtTime(0.08, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start();
        osc1.stop(ctx.currentTime + 0.1);

        setTimeout(() => {
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(1200, ctx.currentTime); 
            gain2.gain.setValueAtTime(0.08, ctx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start();
            osc2.stop(ctx.currentTime + 0.15);
        }, 80);
    } catch (e) {
        console.log("AudioContext bloqueado ou não suportado.");
    }
}

function renderBillsLayout() {
    const listContainer = document.getElementById("bills-dynamic-list");
    const notificationZone = document.getElementById("bill-notifications-zone");
    const pendingBadge = document.getElementById("pending-bills-badge");
    
    if (!CoreEngine.db.bills) CoreEngine.db.bills = [];
    if (!listContainer || !notificationZone) return;

    listContainer.innerHTML = "";
    notificationZone.innerHTML = "";

    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    
    let countPendentes = 0;
    let emitirSom = false;

    if (CoreEngine.db.bills.length === 0) {
        listContainer.innerHTML = `<li style="text-align:center;font-size:0.75rem;color:var(--zinc-600);padding:0.5rem;">Nenhum compromisso agendado.</li>`;
        if (pendingBadge) pendingBadge.innerText = "0 Pendentes";
        return;
    }

    CoreEngine.db.bills.forEach(bill => {
        const dataVencimento = new Date(bill.dueDate + "T00:00:00");
        dataVencimento.setHours(0,0,0,0);

        const diffTime = dataVencimento - hoje;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let statusClass = "bill-status-pending";
        let statusText = "Pendente";

        if (bill.paid) {
            statusClass = "bill-status-paid";
            statusText = `Pago em ${bill.payDate}`;
        } else {
            countPendentes++;
            if (diffDays < 0) {
                statusClass = "bill-status-overdue";
                statusText = "Atrasado";
            } else if (diffDays === 0) {
                statusText = "Vence Hoje";
            } else if (diffDays <= 3) {
                statusText = `Vence em ${diffDays} dias`;
            }
        }

        if (!bill.paid && diffDays <= 3) {
            emitirSom = true;
            let iconMap = { Luz: 'zap', Água: 'droplet', Internet: 'wifi', Assinatura: 'play', Cartão: 'credit-card', Parcelado: 'layers' };
            let currentIcon = iconMap[bill.type] || 'file-text';

            const notifCard = document.createElement("div");
            notifCard.className = `bill-notification-card type-${bill.type.toLowerCase()}`;
            notifCard.innerHTML = `
                <div class="bill-notif-icon">
                    <i data-lucide="${currentIcon}" style="width:16px; height:16px;"></i>
                </div>
                <div class="bill-notif-text">
                    <span class="bill-notif-title">${bill.title}</span>
                    <span class="bill-notif-sub">Valor: R$ ${bill.amount.toFixed(2).replace('.', ',')} | Vencimento: ${bill.dueDate.split('-').reverse().join('/')}</span>
                </div>
                <span class="bill-status-badge ${statusClass}">${statusText.toUpperCase()}</span>
            `;
            notificationZone.appendChild(notifCard);
        }

        const li = document.createElement("li");
        li.className = "ledger-item";
        li.innerHTML = `
            <div class="ledger-meta-block">
                <div class="ledger-text-info" style="margin-left:0;">
                    <span class="ledger-text-title">${bill.title} <small style="color:var(--zinc-500);font-size:0.65rem;">(${bill.type})</small></span>
                    <span class="ledger-text-sub">Vence em: ${bill.dueDate.split('-').reverse().join('/')}</span>
                </div>
            </div>
            <div class="ledger-action-side">
                <span class="ledger-amount-label font-mono" style="font-size:0.75rem; color:#fff;">R$ ${bill.amount.toFixed(2).replace('.', ',')}</span>
                
                ${!bill.paid ? 
                    `<button class="filter-chip" style="padding:0.2rem 0.5rem; background:rgba(6,182,212,0.1); border-color:var(--jarvis-cyan); color:var(--jarvis-cyan);" onclick="markBillAsPaid(${bill.id})">Pagar</button>` : 
                    `<i data-lucide="check-circle-2" style="color:#10b981; width:16px; height:16px;"></i>`
                }
                
                <button class="btn-ledger-delete" onclick="deleteBill(${bill.id})">
                    <i data-lucide="trash-2" style="width:13px;height:13px;"></i>
                </button>
            </div>
        `;
        listContainer.appendChild(li);
    });

    if (pendingBadge) pendingBadge.innerText = `${countPendentes} Pendentes`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    if (emitirSom) playJarvisNotificationSound();
}

document.getElementById("bill-dispatcher-form")?.addEventListener("submit", function(e) {
    e.preventDefault();
    const title = document.getElementById("form-bill-title").value;
    const amount = parseFloat(document.getElementById("form-bill-amount").value);
    const type = document.getElementById("form-bill-type").value;
    const dueDate = document.getElementById("form-bill-due").value;

    const newBill = { id: Date.now(), title, amount, type, dueDate, paid: false, payDate: null };
    CoreEngine.db.bills.push(newBill);
    CoreEngine.save();
    this.reset();
});

function markBillAsPaid(id) {
    const hoje = new Date();
    const dataFormatada = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;
    
    CoreEngine.db.bills = CoreEngine.db.bills.map(bill => {
        if(bill.id === id) {
            bill.paid = true;
            bill.payDate = dataFormatada;
            
            if(confirm(`Deseja abater automaticamente o valor de R$ ${bill.amount.toFixed(2).replace('.', ',')} como uma SAÍDA na aba Visão Geral?`)) {
                CoreEngine.db.transactions.push({
                    id: Date.now(),
                    title: `[Pago] ${bill.title}`,
                    amount: bill.amount,
                    type: 'expense',
                    category: bill.type === 'Assinatura' ? 'Lazer' : (['Luz', 'Água', 'Internet'].includes(bill.type) ? 'Infra' : 'Outros')
                });
            }
        }
        return bill;
    });
    CoreEngine.save();
}

// CORREÇÃO LOGICA: deleteBill
function deleteBill(id) {
    if(confirm("Deseja deletar este agendamento?")) {
        CoreEngine.db.bills = CoreEngine.db.bills.filter(bill => bill.id !== id);
        CoreEngine.save();
    }
}

// ==========================================
// CAPTURA E PROCESSAMENTO DE FORMULÁRIOS
// ==========================================
document.getElementById("transaction-dispatcher-form")?.addEventListener("submit", function(e) {
    e.preventDefault();
    const title = document.getElementById("form-tx-title").value;
    const amount = parseFloat(document.getElementById("form-tx-amount").value);
    const type = document.getElementById("form-tx-type").value;
    const category = document.getElementById("form-tx-category").value;

    const newTx = { id: Date.now(), title, amount, type, category };
    CoreEngine.db.transactions.push(newTx);
    CoreEngine.save();
    this.reset();
});

document.getElementById("form-standalone-goal")?.addEventListener("submit", function(e) {
    e.preventDefault();
    const name = document.getElementById("new-goal-name").value;
    const target = parseFloat(document.getElementById("new-goal-target").value);
    const current = parseFloat(document.getElementById("new-goal-current").value) || 0;

    const newGoal = { id: Date.now(), name, target, current };
    CoreEngine.db.goals.push(newGoal);
    CoreEngine.save();
    this.reset();
});

function deleteTransaction(id) {
    CoreEngine.db.transactions = CoreEngine.db.transactions.filter(tx => tx.id !== id);
    CoreEngine.save();
}

// ==========================================
// CENTRAL DE MODAL E PARÂMETROS
// ==========================================
const BudgetModal = {
    overlay: document.getElementById("modal-budget-root"),
    input: document.getElementById("modal-budget-input-field"),

    open() {
        if(this.input) this.input.value = CoreEngine.db.budgetCeiling;
        if(this.overlay) this.overlay.classList.add("open");
    },
    close() {
        if(this.overlay) this.overlay.classList.remove("open");
    },
    confirm() {
        const val = parseFloat(this.input.value);
        if(!isNaN(val) && val >= 0) {
            CoreEngine.db.budgetCeiling = val;
            CoreEngine.save();
            this.close();
        }
    }
};

document.getElementById("btn-trigger-budget-modal")?.addEventListener("click", () => BudgetModal.open());
document.getElementById("btn-cancel-budget-modal")?.addEventListener("click", () => BudgetModal.close());
document.getElementById("btn-confirm-budget-modal")?.addEventListener("click", () => BudgetModal.confirm());
document.getElementById("btn-global-reset")?.addEventListener("click", () => CoreEngine.reset());

// ==========================================
// CONFIGURAÇÕES GLOBAIS E INTEGRACAO GEMINI
// ==========================================
const GEMINI_CONFIG = {
    apiKey: localStorage.getItem("gemini_api_key") || "",
    model: "gemini-2.5-flash"
};

// Instrução do Sistema para blindar o comportamento do Jarvis
 const JARVIS_SYSTEM_INSTRUCTION = `
Você é Jarvis, assistente financeiro pessoal e estratégico do Alexandre.

Seu objetivo principal é ajudar Alexandre a construir patrimônio, atingir metas, evitar desperdícios e tomar decisões financeiras inteligentes.

Sempre trate o usuário como Alexandre.

====================================
PRIORIDADE 1 - REGISTRO DE TRANSAÇÕES
====================================

Quando Alexandre informar um ganho, gasto, pagamento, recebimento ou movimentação financeira, retorne APENAS JSON puro:

{"action":"transaction","title":"Descrição","amount":50.00,"type":"expense","category":"Lazer"}

Categorias aceitas:
- Alimentação
- Transporte
- Saúde
- Lazer
- Infra
- Outros

Tipos:
- expense
- income

Nunca escreva explicações junto ao JSON.

====================================
PRIORIDADE 2 - ANÁLISE FINANCEIRA
====================================

Quando Alexandre pedir análises financeiras:

- Calcule receitas totais.
- Calcule despesas totais.
- Calcule saldo líquido.
- Calcule lucro ou prejuízo.
- Identifique categorias com maior gasto.
- Mostre tendências.
- Compare meses anteriores.
- Mostre oportunidades de economia.

Formato:

📊 Resumo
💰 Receitas
💸 Despesas
📈 Saldo
⚠️ Alertas
🎯 Recomendações

====================================
PRIORIDADE 3 - CONSULTOR DE COMPRAS
====================================

Quando Alexandre perguntar sobre comprar algo:

Analise:

1. Valor da compra.
2. Impacto nas metas.
3. Impacto no orçamento mensal.
4. Forma de pagamento.
5. Juros envolvidos.
6. Custo de oportunidade.

Retorne:

✅ Compra recomendada

ou

⚠️ Melhor aguardar

Justifique objetivamente.

====================================
PRIORIDADE 4 - INVESTIMENTOS
====================================

Ao avaliar investimentos:

- Analise risco.
- Liquidez.
- Rentabilidade.
- Prazo.
- Perfil financeiro.

Mostre vantagens e riscos.

Nunca incentive investimentos sem explicar os riscos.

====================================
PRIORIDADE 5 - METAS
====================================

Sempre considere as metas cadastradas.

Ao detectar sobra financeira:

- Sugira aporte.
- Informe quanto falta.
- Estime prazo de conclusão.

====================================
PRIORIDADE 6 - MONITORAMENTO MENSAL
====================================

Ao final de cada mês gere:

📊 RELATÓRIO MENSAL

- Receitas
- Despesas
- Saldo
- Lucro/Prejuízo
- Economia gerada
- Evolução patrimonial

Nota financeira:

A = Excelente
B = Boa
C = Regular
D = Ruim

Explique como melhorar.

====================================
PRIORIDADE 7 - ALERTAS INTELIGENTES
====================================

Detecte automaticamente:

- Gastos acima da média.
- Gastos repetitivos.
- Assinaturas esquecidas.
- Parcelamentos excessivos.
- Endividamento crescente.

Forneça alertas curtos e objetivos.

====================================
PRIORIDADE 8 - POSTURA
====================================

Seja:

- Direto.
- Estratégico.
- Analítico.
- Profissional.

Não faça rodeios.

Seu papel é agir como CFO pessoal do Alexandre, ajudando-o a tomar as melhores decisões financeiras possíveis.

====================================
PRIORIDADE 9 - AVALIAÇÃO DE COMPRAS
====================================

Quando Alexandre perguntar se pode comprar algo, consumir algo ou realizar um gasto:

Exemplos:
- Posso comprar uma pizza?
- Posso pedir um lanche?
- Posso comprar esse celular?
- Posso assinar esse serviço?
- Vale a pena eu gastar R$ 80 hoje?

NUNCA responda apenas com opinião.

Analise:

1. Saldo disponível.
2. Despesas já registradas.
3. Receitas do mês.
4. Metas financeiras.
5. Contas futuras.
6. Orçamento restante.
7. Frequência desse tipo de gasto.

Classifique a compra:

🟢 LIBERADA
🟡 ACEITÁVEL COM MODERAÇÃO
🔴 NÃO RECOMENDADA

Explique objetivamente o motivo.

Se a compra comprometer menos de 5% do saldo livre do mês:
🟢 LIBERADA

Se comprometer entre 5% e 15%:
🟡 ACEITÁVEL COM MODERAÇÃO

Se comprometer mais de 15%:
🔴 NÃO RECOMENDADA

Sempre sugira alternativas quando necessário.
`;

let JARVIS_ACTIVATED = !!localStorage.getItem("gemini_api_key");

// ==========================================
// SIMULADOR CORE DO JARVIS (INTEGRADO COM GEMINI)
// ==========================================
const JarvisChat = {
    input: document.getElementById("jarvis-user-input"),
    btn: document.getElementById("jarvis-send-btn"),
    log: document.getElementById("assistant-chat-log"),

    checkActivation() {
        if (!JARVIS_ACTIVATED) {
            this.appendBubble(
                "🔐 Informe o código inicial para ativar o Jarvis.",
                "bubble-ai"
            );
        } else {
            this.sendGreeting();
        }
    },

    sendGreeting() {
        const hora = new Date().getHours();
        let saudacao = "Olá";

        if (hora >= 5 && hora < 12) {
            saudacao = "Bom dia";
        } else if (hora >= 12 && hora < 18) {
            saudacao = "Boa tarde";
        } else {
            saudacao = "Boa noite";
        }

        this.appendBubble(
            `${saudacao}, Alexandre. Jarvis online e operacional. Como posso ajudá-lo neste momento?`,
            "bubble-ai"
        );
    },

    init() {
        this.checkActivation();

        if (this.btn && this.input) {
            this.btn.addEventListener("click", () => this.send());
            this.input.addEventListener("keypress", (e) => {
                if (e.key === "Enter") this.send();
            });
        }

        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    },

    async send() {
        const text = this.input.value.trim();
        if (!text) return;

        // ==========================
        // ATIVAÇÃO INICIAL DO JARVIS
        // ==========================
        if (!JARVIS_ACTIVATED) {
            const apiKey = text;
            this.appendBubble("Ativando núcleo Gemini...", "bubble-ai");

            try {
                const test = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
                );

                if (!test.ok) {
                    this.appendBubble(
                        "❌ Código inicial inválido. Verifique a Key API do Gemini.",
                        "bubble-ai"
                    );
                    this.input.value = "";
                    return;
                }

                GEMINI_CONFIG.apiKey = apiKey;
                localStorage.setItem("gemini_api_key", apiKey);
                JARVIS_ACTIVATED = true;

                this.appendBubble(
                    "✅ Núcleo Gemini ativado com sucesso.",
                    "bubble-ai"
                );
                this.sendGreeting();

            } catch (err) {
                this.appendBubble(
                    "❌ Falha ao validar a Key API.",
                    "bubble-ai"
                );
                console.error(err);
            }

            this.input.value = "";
            return;
        }

        this.appendBubble(text, "bubble-user");
        this.input.value = "";

        HardwareHapticFeedback.triggerClick();

        const thinkingBubble = this.appendBubble(
            "Jarvis está processando...",
            "bubble-ai"
        );

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_CONFIG.model}:generateContent?key=${GEMINI_CONFIG.apiKey}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: text }]
                        }],
                        systemInstruction: {
                            parts: [{ text: JARVIS_SYSTEM_INSTRUCTION }]
                        }
                    })
                }
            );

            const data = await response.json();
            thinkingBubble.remove();

            if (data.candidates && data.candidates[0].content.parts[0].text) {
                let replyText = data.candidates[0].content.parts[0].text.trim();
                
                // BLINDAGEM CONTRA BLOCOS DE MARKDOWN DO GEMINI:
                let cleanText = replyText.replace(/```json|```/g, "").trim();

                if (cleanText.startsWith("{") && cleanText.endsWith("}")) {
                    try {
                        const command = JSON.parse(cleanText);

                        if (command.action === "transaction") {
                            CoreEngine.db.transactions.push({
                                id: Date.now(),
                                title: command.title,
                                amount: command.amount,
                                type: command.type,
                                category: command.category
                            });

                            CoreEngine.save();
                            HardwareHapticFeedback.triggerSuccess();

                            HardwareNotificationEngine.send(
                                "Transação Computada",
                                `${command.title} de R$ ${command.amount.toFixed(2)} foi processado via comando de voz.`
                            );

                            this.appendBubble(
                                `Diretriz executada, Alexandre. Adicionei "${command.title}" no valor de R$ ${command.amount.toFixed(2)} em seu registro local de ${command.category}.`,
                                "bubble-ai"
                            );
                        }

                    } catch (jsonErr) {
                        this.appendBubble(replyText, "bubble-ai");
                    }
                } else {
                    this.appendBubble(replyText, "bubble-ai");
                    HardwareHapticFeedback.triggerLight();
                }

            } else {
                this.appendBubble(
                    "Desculpe Alexandre, houve uma falha de conexão com os meus servidores neurais.",
                    "bubble-ai"
                );
                HardwareHapticFeedback.triggerError();
            }

        } catch (error) {
            if (thinkingBubble) thinkingBubble.remove();
            this.appendBubble(
                "Erro de comunicação com o Jarvis Core API. Verifique sua Key.",
                "bubble-ai"
            );
            HardwareHapticFeedback.triggerError();
            console.error(error);
        }
    },

    appendBubble(text, className) {
        if (!this.log) return null;

        const bubble = document.createElement("div");
        bubble.className = `chat-bubble ${className}`;
        bubble.innerText = text;

        this.log.appendChild(bubble);
        this.log.scrollTop = this.log.scrollHeight;

        return bubble;
    }
};

// ==========================================
// MÓDULO WEB SPEECH API (MICROFONE DO JARVIS)
// ==========================================
const JarvisVoiceEngine = {
    recognition: null,
    isListening: false,

    init() {
        const voiceBtn = document.getElementById("jarvis-voice-btn");
        if (!voiceBtn) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            voiceBtn.style.display = "none";
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'pt-BR';
        this.recognition.continuous = false;
        this.recognition.interimResults = false;

        voiceBtn.addEventListener("click", () => {
            if (this.isListening) {
                this.stop();
            } else {
                this.start();
            }
        });

        this.recognition.onstart = () => {
            this.isListening = true;
            voiceBtn.classList.add("listening");
            HardwareHapticFeedback.triggerLight(); // Vibração indicando que o microfone abriu
        };

        this.recognition.onend = () => {
            this.isListening = false;
            voiceBtn.classList.remove("listening");
        };

        this.recognition.onerror = () => { this.stop(); };

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const userInput = document.getElementById("jarvis-user-input");
            if (userInput) {
                userInput.value = transcript;
                JarvisChat.send(); // Envia automaticamente para o Gemini processar a voz
            }
        };
    },

    start() { if(this.recognition) this.recognition.start(); },
    stop() { if(this.recognition) this.recognition.stop(); }
};

// ==========================================
// NOVAS WEB APIs: VIBRAÇÃO HÁPTICA & NOTIFICAÇÕES
// ==========================================

// Central de Controle de Motores Vibratórios (Vibration API)
const HardwareHapticFeedback = {
    triggerClick() {
        if ("vibrate" in navigator) navigator.vibrate(15); // Um toque seco de 15ms
    },
    triggerLight() {
        if ("vibrate" in navigator) navigator.vibrate(30); // Um toque sutil de 30ms
    },
    triggerSuccess() {
        if ("vibrate" in navigator) navigator.vibrate([40, 30, 40]); // Bipe duplo físico (Sucesso)
    },
    triggerError() {
        if ("vibrate" in navigator) navigator.vibrate([100, 50, 100, 50, 100]); // Vibração em rajada de erro
    }
};

// Central de Disparo de Notificações Push Locais (Notifications API)
const HardwareNotificationEngine = {
    send(title, message) {
        if (!("Notification" in window)) return;
        
        if (Notification.permission === "granted") {
            new Notification(title, {
                body: message,
                icon: "https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/cpu.png" // Ícone genérico para a notificação
            });
        }
    }
};

// ==========================================
// ESTRUTURA DE INICIALIZAÇÃO SÍNCRONA
// ==========================================
window.onload = () => {
    CoreEngine.init();
    ViewRouter.init();
    JarvisChat.init();
    JarvisVoiceEngine.init();
    renderBillsLayout();
    
    // CHAMADA DA NOVA SAUDAÇÃO DINÂMICA
    updateDynamicGreeting(); 
    
    if(typeof lucide !== 'undefined') lucide.createIcons();
};

function updateDynamicGreeting() {
    const greetingElement = document.getElementById("dynamic-greeting");
    if (!greetingElement) return;

    const hora = new Date().getHours();
    let saudacao = "";

    if (hora >= 5 && hora < 12) {
        saudacao = "Bom dia, Alexandre";
    } else if (hora >= 12 && hora < 18) {
        saudacao = "Boa tarde, Alexandre";
    } else {
        saudacao = "Boa noite, Alexandre";
    }
    greetingElement.innerText = saudacao;
}
function updateInitialBalance(novoValor) {
    CoreEngine.db.initialBalance = parseFloat(novoValor) || 0;
    CoreEngine.save(); // Isso salva no localStorage
}
