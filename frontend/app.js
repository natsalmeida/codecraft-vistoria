// ============================================================
// CodeCraft Vistoria v4.0 — Integração Flask + MySQL
// ============================================================

const API_URL = "http://127.0.0.1:5000/api";

// STATE do Sistema
const S = {
    profile: null,
    year: new Date().getFullYear(),
    gTab: 'g-home',
    vTab: 'v-home',
    form: null,
    formType: null,
    formSec: 0,
    gSearch: '',
    vSearch: '',
    vehicles: [], // Agora vem do Banco de Dados
    inspections: [] // Agora vem do Banco de Dados
};

const FUEL = ['V', '¼', '½', '¾', 'C'];
const TIRE = ['Bom', 'Meia Vida', 'Ruim'];

// HELPERS DE INTERFACE
const el = id => document.getElementById(id);
const qa = s => document.querySelectorAll(s);
function showScr(id) { qa('.screen').forEach(s => s.classList.remove('active')); el('scr-' + id).classList.add('active') }
function toast(msg, type = 'ok') { const t = el('toast'); t.textContent = msg; t.className = 'toast toast-' + type + ' show'; setTimeout(() => t.classList.remove('show'), 3000) }
function nDate() { return new Date().toISOString().split('T')[0] }
function nTime() { return new Date().toTimeString().slice(0, 5) }
function updYear() { qa('.yv').forEach(e => e.textContent = S.year) }

// ============================================================
// AUTH - CONEXÃO COM O BACKEND
// ============================================================
async function doLogin() {
    const login = el('inp-email').value.trim();
    const senha = el('inp-pass').value;
    const errEl = el('login-err');

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, senha })
        });

        const data = await response.json();

        if (response.ok) {
            errEl.style.display = 'none';
            S.profile = data.usuario;
            enterApp();
        } else {
            // AQUI ESTÁ O SEGREDO: Vamos mostrar o erro real que vem do Python
            errEl.textContent = `Erro ${response.status}: ${data.erro || 'Credenciais inválidas'}`;
            errEl.style.display = 'block';
        }
    } catch (error) {
        errEl.textContent = 'O Servidor Flask está desligado!';
        errEl.style.display = 'block';
    }
}

function doLogout() { S.profile = null; S.form = null; showScr('login'); el('login-err').style.display = 'none' }

async function enterApp() {
    const logo = el('logo-img').src;
    if (S.profile.perfil === 'Gestor') {
        el('g-name').textContent = S.profile.nome;
        el('g-logo').src = logo;
        showScr('gestor');
        updYear();
        await carregarDadosGestor();
    } else {
        el('v-name').textContent = S.profile.nome;
        el('v-logo').src = logo;
        showScr('vist');
        updYear();
        await carregarVeiculos();
    }
}

// ============================================================
// CARREGAMENTO DE DADOS (FETCH)
// ============================================================
async function carregarVeiculos() {
    try {
        const res = await fetch(`${API_URL}/veiculos`);
        const data = await res.json();
        if (data.status === "sucesso") {
            S.vehicles = data.dados;
            if (S.profile.perfil === 'Gestor') renderG(); else renderV();
        }
    } catch (e) { toast("Erro ao conectar com API de veículos", "err"); }
}

async function carregarDadosGestor() {
    await carregarVeiculos();
    try {
        const res = await fetch(`${API_URL}/vistorias`);
        const data = await res.json();
        if (data.status === "sucesso") S.inspections = data.dados;
        renderG();
    } catch (e) { console.error(e); }
}

// ============================================================
// GESTOR - LÓGICA DE INTERFACE
// ============================================================
function setGTab(t) { S.gTab = t; S.gSearch = ''; qa('#g-nav .ni').forEach(n => { n.classList.toggle('act', n.dataset.t === t) }); renderG() }

function renderG() {
    const c = el('g-content');
    if (S.gTab === 'g-home') {
        c.innerHTML = `<div class="card card-st">
            <div class="sv">${S.vehicles.length}</div>
            <div class="sl">Veículos na Frota</div>
            <p style="margin-top:10px; color:var(--txt2)">Dados vindos do MySQL</p>
        </div>`;
    } else if (S.gTab === 'g-veic') {
        c.innerHTML = `
            <div class="card">
                <h3>Veículos no Banco de Dados</h3>
                ${S.vehicles.map(v => `
                    <div class="card ii">
                        <div class="iic" style="background:var(--blue)">🚗</div>
                        <div style="flex:1">
                            <div style="font-weight:700">${v.placa}</div>
                            <div style="font-size:12px">${v.marca} ${v.modelo}</div>
                        </div>
                    </div>
                `).join('')}
            </div>`;
    }
}

// ============================================================
// VISTORIADOR - LÓGICA DE VISTORIA
// ============================================================
function setVTab(t) {
    S.vTab = t; S.form = null;
    qa('#v-nav .ni').forEach(n => n.classList.toggle('act', n.dataset.t === t));
    el('v-back').style.display = 'none'; el('v-logout').style.display = '';
    renderV();
}

function vHome() { setVTab('v-home') }

function renderV() {
    const c = el('v-content');
    if (S.vTab === 'v-home') {
        c.innerHTML = `
            <button class="btn btn-pri btn-lg" onclick="abrirFormVistoria()">📝 Iniciar Nova Vistoria</button>
        `;
    } else if (S.vTab === 'v-veic') {
        c.innerHTML = `<h3>Frota Disponível</h3>` + 
        S.vehicles.map(v => `<div class="card ii"><b>${v.placa}</b> - ${v.modelo}</div>`).join('');
    }
}

function abrirFormVistoria() {
    S.form = { placa_veiculo: '', hodometro_inicial: '', combustivel_inicial: 'V' };
    const c = el('v-content');
    el('v-back').style.display = 'block';
    c.innerHTML = `
        <div class="card-w">
            <h3 style="color:#000">Nova Vistoria (Saída)</h3>
            <div class="fg">
                <label class="fl-d">Placa</label>
                <input class="fiw" id="f-placa" placeholder="ABC1234">
            </div>
            <div class="fg">
                <label class="fl-d">Hodômetro Inicial</label>
                <input class="fiw" type="number" id="f-hodo">
            </div>
            <button class="btn btn-grn" onclick="enviarVistoria()">Salvar no Banco</button>
        </div>
    `;
}

async function enviarVistoria() {
    const p = el('f-placa').value;
    const h = el('f-hodo').value;

    const payload = {
        placa_veiculo: p,
        id_usuario_vistoriador: S.profile.id_usuario,
        data_vistoria: nDate(),
        hr_saida: nTime(),
        hodometro_inicial: h,
        combustivel_inicial: 'Cheio'
    };

    try {
        const res = await fetch(`${API_URL}/vistorias`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            toast("Vistoria salva no MySQL!");
            vHome();
        } else {
            toast("Erro ao salvar", "err");
        }
    } catch (e) { toast("Erro de conexão", "err"); }
}

// EVENTOS INICIAIS
document.addEventListener('DOMContentLoaded', function () {
    el('login-btn').addEventListener('click', doLogin);
    el('v-back').addEventListener('click', vHome);
    qa('#g-nav .ni').forEach(b => b.addEventListener('click', function () { setGTab(this.dataset.t) }));
    qa('#v-nav .ni').forEach(b => b.addEventListener('click', function () { setVTab(this.dataset.t) }));
});