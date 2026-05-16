// ============================================================
// CodeCraft Vistoria v6.0 — Arquitetura Híbrida (Local + MySQL)
// ============================================================

const API_URL = "http://127.0.0.1:5000/api";

// DB LOCAL — Mantido para armazenar fotos, assinaturas e PDFs localmente
const DB={
  get(k){try{return JSON.parse(localStorage.getItem('cc_'+k))}catch(e){return null}},
  set(k,v){localStorage.setItem('cc_'+k,JSON.stringify(v))},
  init(){
    if(!this.get('inspections')) this.set('inspections',[]);
   if(!this.get('equipment')){
      this.set('equipment',[
        {key:'estepe',label:'Estepe',active:true},
        {key:'macaco',label:'Macaco',active:true},
        {key:'chave_de_roda',label:'Chave de Roda',active:true},
        {key:'extintor',label:'Extintor',active:true},
        {key:'triangulo',label:'Triângulo',active:true},
        {key:'calotas',label:'Calotas',active:true},
        {key:'tapetes',label:'Tapetes',active:true},
        {key:'radio',label:'Rádio',active:true},
        {key:'documentos',label:'Documentos',active:true},
        {key:'travessa_capota',label:'Travessa Capota',active:true},
        {key:'capota',label:'Capota',active:true},
        {key:'antena',label:'Antena',active:true},
        {key:'cartao_combustivel',label:'Cartão Combust.',active:true}
      ]);
    }
  }
};

DB.init();

// STATE
const S={
  profile:null,year:new Date().getFullYear(),
  gTab:'g-home',vTab:'v-home',
  form:null,formType:null,formSec:0,
  gSearch:'',vSearch:'',
};

const FUEL=['V','¼','½','¾','C'];
const TIRE=['Bom','Meia Vida','Ruim'];

// HELPERS
const el=id=>document.getElementById(id);
const qa=s=>document.querySelectorAll(s);
function showScr(id){qa('.screen').forEach(s=>s.classList.remove('active'));el('scr-'+id).classList.add('active')}
function toast(msg,type='ok'){const t=el('toast');t.textContent=msg;t.className='toast toast-'+type+' show';setTimeout(()=>t.classList.remove('show'),3000)}
function nDate(){return new Date().toISOString().split('T')[0]}
function nTime(){return new Date().toTimeString().slice(0,5)}
function updYear(){qa('.yv').forEach(e=>e.textContent=S.year)}
function persist(){DB.set('inspections',DB.get('inspections'));}
function formatarDataTela(dStr){
  if(!dStr) return '—';
  let d = dStr;
  if(d.length > 10 && (d.includes('GMT') || d.includes('T'))) {
    try { d = new Date(d).toISOString().split('T')[0]; } catch(e){}
  }
  const p = d.split('-');
  return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : d;
}

function stInfo(s){
  const m={rascunho:{bg:'linear-gradient(135deg,#92400e,#f59e0b)',ic:'✏️',lb:'Rascunho',cl:'bdg-gld'},
    saida_completa:{bg:'linear-gradient(135deg,#1e40af,#3b82f6)',ic:'📝',lb:'Chegada OK',cl:'bdg-blu'},
    retorno_completo:{bg:'linear-gradient(135deg,#065f46,#10b981)',ic:'✅',lb:'Saída OK',cl:'bdg-grn'},
    enviado:{bg:'linear-gradient(135deg,#6b21a8,#a855f7)',ic:'📄',lb:'Enviado',cl:'bdg-pur'}};
  return m[s]||m.rascunho;
}

// ============================================================
// AUTH & INTEGRAÇÃO API (Login via MySQL)
// ============================================================
async function doLogin(){
  const login = el('inp-email').value.trim();
  const senha = el('inp-pass').value;
  const errEl = el('login-err');
  
  if(!login||!senha){errEl.textContent='Preencha e-mail e senha';errEl.style.display='block';return}

  try {
      const res = await fetch(`${API_URL}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ login, senha })
      });
      const data = await res.json();
      
      if(res.ok) {
          // Mapeia o usuário do MySQL para a estrutura visual
          S.profile = {
              id: data.usuario.id_usuario,
              id_usuario: data.usuario.id_usuario,
              full_name: data.usuario.nome,
              role: data.usuario.perfil.toLowerCase(),
              email: login,
              matricula: 'BD-00' + data.usuario.id_usuario
          };
          errEl.style.display='none';
          enterApp();
      } else {
          errEl.textContent = data.erro || 'Credenciais inválidas';
          errEl.style.display='block';
      }
  } catch(e) {
      errEl.textContent = 'Servidor Offline! Verifique o terminal Python.';
      errEl.style.display='block';
  }
}

function doLogout(){S.profile=null;S.form=null;showScr('login');el('login-err').style.display='none'}

async function enterApp(){
  const logo=el('logo-img').src;
  
  // SINCRONIZAÇÃO 1: Veículos
  try {
      const res = await fetch(`${API_URL}/veiculos`);
      if(res.ok) {
          const data = await res.json();
          const mappedV = data.dados.map(v => ({
              id: 'v_'+v.placa, placa: v.placa, marca_modelo: `${v.marca} ${v.modelo}`,
              ano: v.ano, condutor: v.condutor, rota: v.rota, orgao_origem: v.orgao_origem,
              combustivel: v.combustivel, tipo: v.tipo, 
              cadastrado_por: v.cadastrado_por,
              municipio: v.municipio, // <-- O SEGREDO ESTAVA AQUI! Faltava puxar do banco.
              active: true
          }));
          DB.set('vehicles', mappedV);
      }
  } catch(e) { console.log('Offline mode for vehicles'); }

  // SINCRONIZAÇÃO 2: Usuários
  try {
      const resU = await fetch(`${API_URL}/usuarios`);
      if(resU.ok) {
          const dataU = await resU.json();
          const mappedU = dataU.dados.map(u => ({
              id: u.id_usuario, full_name: u.nome, email: u.login,
              role: u.perfil.toLowerCase(), active: true
          }));
          DB.set('users', mappedU);
      }
  } catch(e) { console.log('Offline mode for users'); }

  // SINCRONIZAÇÃO NOVA: Equipamentos (Vêm 100% do Banco de Dados)
  try {
      const resE = await fetch(`${API_URL}/equipamentos`);
      if(resE.ok) {
          const dataE = await resE.json();
          const mappedE = dataE.dados.map(e => ({
              id: e.id_equipamento, // Guarda o ID real do banco
              key: e.nome_equipamento.toLowerCase().replace(/\s+/g,'_'),
              label: e.nome_equipamento,
              active: true
          }));
          DB.set('equipment', mappedE);
      }
  } catch(e) { console.log('Offline mode for equipment'); }
  
  // SINCRONIZAÇÃO 3: Vistorias 
  try {
      const resI = await fetch(`${API_URL}/vistorias`);
      if(resI.ok) {
          const dataI = await resI.json();
          const mappedI = [];
          
          dataI.dados.forEach(i => {
              // 1. Cria SEMPRE o card da Vistoria 1 (Chegada)
              mappedI.push({
                  id: 'db_' + i.id_vistoria + '_c',
                  db_id: i.id_vistoria,
                  placa: i.placa_veiculo,
                  inspector_id: i.id_usuario_vistoriador, 
                  inspector_name: i.vistoriador,
                  saida_data: i.data_vistoria,
                  
                  // DADOS EXTRAS PUXADOS DO BANCO PARA APARECER NA VISTORIA 2:
                  saida_horario: i.hr_saida,
                  saida_hodometro: i.hodometro_inicial,
                  saida_tanque: i.combustivel_inicial,
                  nome_condutor: i.condutor,
                  itinerario: i.rota,
                  equipment: {}, 

                  status: 'saida_completa',
                  mysql_status: i.status, 
                  year_reference: new Date(i.data_vistoria).getFullYear() || S.year
              });

              // 2. Se a vistoria foi Fechada, cria TAMBÉM o card da Vistoria 2 (Saída)
              if (i.status === 'Fechada') {
                  mappedI.push({
                      id: 'db_' + i.id_vistoria + '_s',
                      db_id: i.id_vistoria + 0.5, 
                      placa: i.placa_veiculo,
                                            
                      inspector_id: i.id_usuario_fechamento || i.id_usuario_vistoriador, 
                      inspector_name: i.vistoriador_fechamento || i.vistoriador, 
                      
                      saida_data: i.data_vistoria, 
                                            
                      saida_horario: i.hr_saida,
                      saida_hodometro: i.hodometro_inicial,
                      saida_tanque: i.combustivel_inicial,
                      nome_condutor: i.condutor,
                      itinerario: i.rota,
                      equipment: {},

                      status: 'retorno_completo',
                      mysql_status: i.status, 
                      year_reference: new Date(i.data_vistoria).getFullYear() || S.year
                  });
              }
          });
          
          const localDrafts = (DB.get('inspections')||[]).filter(x => x.status === 'rascunho');
          DB.set('inspections', [...localDrafts, ...mappedI]);
      }
  } catch(e) { console.log('Offline mode for vistorias'); }

  if(S.profile.role==='gestor'){
    el('g-name').textContent=S.profile.full_name;
    el('g-logo').src=logo;
    showScr('gestor');updYear();renderG();
  } else {
    el('v-name').textContent=S.profile.full_name;
    el('v-logo').src=logo;
    showScr('vist');updYear();renderV();
  }
}

function chgYear(d){S.year+=d;updYear();if(S.profile?.role==='gestor')renderG();else renderV()}

// ============================================================
// GESTOR
// ============================================================
function setGTab(t){S.gTab=t;S.gSearch='';qa('#g-nav .ni').forEach(n=>{n.classList.toggle('act',n.dataset.t===t)});renderG()}

function renderG(){
  const c=el('g-content');
  const vehicles=DB.get('vehicles')||[];
  const insp=DB.get('inspections')||[];
  const yi=insp.filter(i=>i.year_reference===S.year);

  const sent=yi.filter(i=> i.status !== 'rascunho'); 
  
  const equipment=DB.get('equipment')||[];
  const users=DB.get('users')||[];

  // ==========================================
  // LÓGICA DE ESTATÍSTICAS (GESTOR)
  // ==========================================
  const totalFrota = vehicles.length;
  let pendentesCount = 0;
  
  // Arrays para separar os veículos na aba de Veículos
  const vPendentes = [];
  const vFechados = [];

  vehicles.forEach(v => {
      // Busca todas as vistorias salvas para este veículo
      const vistoriasVeiculo = yi.filter(i => i.placa === v.placa && i.status !== 'rascunho');
      let isPendente = false;
      
      if (vistoriasVeiculo.length === 0) {
          isPendente = true; // Nunca vistoriado
      } else {
          // Procura se tem uma Vistoria 1 (Chegada) sem a Vistoria 2 (Saída)
          const openV1 = vistoriasVeiculo.some(v1 =>
              !v1.cloned_from &&
              !vistoriasVeiculo.some(v2 => v2.cloned_from === v1.id)
          );
          if (openV1) isPendente = true; // Tem chegada, mas falta saída
      }
      
      if (isPendente) {
          pendentesCount++;
          vPendentes.push(v);
      } else {
          vFechados.push(v);
      }
  });
  // ==========================================

  if(S.gTab==='g-home'){
    c.innerHTML='<div class="anim-in">'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px" class="stg4">'+
    '<div class="card card-st"><div class="sv" style="color:var(--grn-l)">'+totalFrota+'</div><div class="sl" style="color:var(--grn)">Frota Total</div></div>'+
    '<div class="card card-st"><div class="sv" style="color:#f59e0b">'+pendentesCount+'</div><div class="sl" style="color:#f59e0b">Pendentes</div></div>'+
    '<div class="card card-st"><div class="sv" style="color:var(--blue-l)">'+sent.length+'</div><div class="sl" style="color:var(--blue)">Recebidas</div></div>'+
    '<div class="card card-st"><div class="sv" style="color:var(--txt2)">MySQL</div><div class="sl">Integrado</div></div>'+
    '</div>'+
    '<h3 style="color:var(--gold);font-size:14px;font-weight:800;margin-bottom:10px">ÚLTIMAS VISTORIAS PROCESSADAS</h3>'+
    (sent.length===0?'<div class="card" style="text-align:center;color:var(--txt3);padding:30px">Nenhuma vistoria recebida em '+S.year+'</div>':    
    sent.slice(0,8).map(i=>'<div class="card ii" onclick="viewInsp(\''+i.id+'\')"><div class="iic" style="background:linear-gradient(135deg,#065f46,var(--grn))">📄</div><div style="flex:1;min-width:0"><div style="font-weight:700;color:var(--gold);font-size:14px">'+i.placa+' — '+(i.marca_modelo||'')+'</div><div style="font-size:12px;color:var(--txt2)">Por: '+(i.inspector_name||'—')+' · '+formatarDataTela(i.saida_data)+'</div></div><span class="bdg bdg-pur">Sincronizado</span></div>').join(''))+
    '</div>';
  }
  else if(S.gTab==='g-insp'){
    // Inicializa as variáveis de filtro caso ainda não existam
    S.gFilterStatus = S.gFilterStatus || '';
    S.gFilterCity = S.gFilterCity || '';

    // Cria a barra superior com Pesquisa, Filtro de Status e Filtro de Município
    const filterHtml='<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">'+
      '<div class="search-box" style="flex:1;min-width:250px;margin-bottom:0">'+
        '<input class="fi" placeholder="🔍 Pesquisar por placa, condutor..." value="'+S.gSearch+'" oninput="S.gSearch=this.value;renderG()">'+
      '</div>'+
      '<select class="fi" style="width:auto;flex-shrink:0" onchange="S.gFilterStatus=this.value;renderG()">'+
        '<option value="" '+(!S.gFilterStatus?'selected':'')+'>Status: Todos</option>'+
        '<option value="fechado" '+(S.gFilterStatus==='fechado'?'selected':'')+'>✅ Vistoriados (Fechados)</option>'+
        '<option value="pendente" '+(S.gFilterStatus==='pendente'?'selected':'')+'>⏳ Não Vistoriados (Pendentes)</option>'+
      '</select>'+
      '<select class="fi" style="width:auto;flex-shrink:0" onchange="S.gFilterCity=this.value;renderG()">'+
        '<option value="" '+(!S.gFilterCity?'selected':'')+'>Município: Todos</option>'+
        '<option value="Ponte Alta do Tocantins" '+(S.gFilterCity==='Ponte Alta do Tocantins'?'selected':'')+'>Ponte Alta do Tocantins</option>'+
        '<option value="Mateiros" '+(S.gFilterCity==='Mateiros'?'selected':'')+'>Mateiros</option>'+
        '<option value="Pindorama" '+(S.gFilterCity==='Pindorama'?'selected':'')+'>Pindorama</option>'+
      '</select>'+
    '</div>';

    const groups = {}; 
    
    // 1. Agrupa todas as vistorias existentes por placa
    yi.forEach(i => {
        const p = i.placa || 'SEM PLACA';
        if(!groups[p]) groups[p] = [];
        groups[p].push(i);
    });

    // 2. O SEGREDO AQUI: Inclui todos os veículos da frota! Se não tiver vistoria, fica com uma lista vazia.
    vehicles.forEach(v => {
        if(!groups[v.placa]) groups[v.placa] = [];
    });

    let groupKeys = Object.keys(groups);

    // 3. Aplica os filtros sobre a lista consolidada
    if(S.gSearch){
        const q = S.gSearch.toLowerCase();
        groupKeys = groupKeys.filter(p => {
            const v = vehicles.find(x => x.placa === p);
            const matchVeiculo = v && (v.placa.toLowerCase().includes(q) || v.marca_modelo.toLowerCase().includes(q) || (v.condutor||'').toLowerCase().includes(q));
            const matchVistoria = groups[p].some(i => (i.nome_condutor||'').toLowerCase().includes(q) || (i.inspector_name||'').toLowerCase().includes(q));
            return matchVeiculo || matchVistoria;
        });
    }
    
    if(S.gFilterCity){
        // Normaliza o filtro: minúsculo e sem espaços nas pontas
        const fc = S.gFilterCity.toLowerCase().trim();
        
        groupKeys = groupKeys.filter(p => {
            const v = vehicles.find(x => x.placa === p);
            
            // Pega o município do veículo ou da primeira vistoria do grupo
            let munRaw = '';
            if (v && v.municipio) {
                munRaw = v.municipio;
            } else if (groups[p] && groups[p][0] && groups[p][0].municipio) {
                munRaw = groups[p][0].municipio;
            }
            
            // Normaliza o dado do banco para comparar
            const munDoc = String(munRaw).toLowerCase().trim();
            
            // Log para você ver no console o que está acontecendo (F12)
            if(munDoc === fc) console.log("Correspondência encontrada para placa:", p);
            
            return munDoc === fc;
        });
    }

    if(S.gFilterStatus === 'fechado'){
        groupKeys = groupKeys.filter(p => {
            const vist = groups[p];
            if(vist.length === 0) return false; 
            const hasOpen = vist.some(i => i.mysql_status === 'Aberta' || (i.status === 'saida_completa' && !i.mysql_status && !vist.some(v2 => v2.cloned_from === i.id)));
            return !hasOpen; 
        });
    } else if (S.gFilterStatus === 'pendente') {
        groupKeys = groupKeys.filter(p => {
            const vist = groups[p];
            if(vist.length === 0) return true; 
            const hasOpen = vist.some(i => i.mysql_status === 'Aberta' || (i.status === 'saida_completa' && !i.mysql_status && !vist.some(v2 => v2.cloned_from === i.id)));
            return hasOpen; 
        });
    }
    
    groupKeys.sort();
    
    // 4. Monta a lista na tela
    c.innerHTML='<div class="anim-in"><h3 style="color:var(--gold);font-size:14px;font-weight:800;margin-bottom:10px">VISTORIAS (Locais & Sincronizadas)</h3>'+filterHtml+
    (groupKeys.length===0?'<div class="card" style="text-align:center;color:var(--txt3);padding:30px">Nenhum registro encontrado com estes filtros</div>':
    groupKeys.map(placa=>{
      const items=groups[placa];const v=vehicles.find(x=>x.placa===placa);
      return '<div class="plate-group"><div class="plate-group-hdr"><div><span style="font-weight:800;color:var(--gold);font-family:var(--fm);letter-spacing:1px;font-size:15px">'+placa+'</span><span style="margin-left:10px;font-size:12px;color:var(--txt2)">'+(v?v.marca_modelo:'')+'</span></div><span class="bdg bdg-blu">'+items.length+' registros</span></div><div class="plate-group-body">'+
      (items.length === 0 ? '<div style="padding:14px;font-size:12px;color:#f59e0b;font-weight:700">⏳ Veículo na frota, mas ainda não vistoriado.</div>' : 
      items.map(i=>{
          const st=stInfo(i.status);
          return '<div class="card ii" style="margin:0;border-radius:0;border-bottom:1px solid var(--brd)" onclick="viewInsp(\''+i.id+'\')"><div class="iic" style="background:'+st.bg+'">'+st.ic+'</div><div style="flex:1"><div style="font-size:12px;color:var(--txt2)">'+(i.inspector_name||'—')+' · '+formatarDataTela(i.saida_data)+' — 📍 '+(i.itinerario||'Sem rota')+'</div></div><span class="bdg '+st.cl+'">'+st.lb+'</span></div>'
      }).join(''))+
      '</div></div>';
    }).join(''))+'</div>';
  }
  else if(S.gTab==='g-veic'){
    // Inicializa a variável do filtro caso não exista
    S.gVeicCity = S.gVeicCity || '';

    // Cria a barra superior com Pesquisa em texto e o Dropdown de Município
    const searchHtml='<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">'+
      '<div class="search-box" style="flex:1;min-width:250px;margin-bottom:0">'+
        '<input class="fi" placeholder="🔍 Pesquisar veículo..." value="'+S.gSearch+'" oninput="S.gSearch=this.value;renderG()">'+
      '</div>'+
      '<select class="fi" style="width:auto;flex-shrink:0" onchange="S.gVeicCity=this.value;renderG()">'+
        '<option value="" '+(!S.gVeicCity?'selected':'')+'>Município: Todos</option>'+
        '<option value="Ponte Alta do Tocantins" '+(S.gVeicCity==='Ponte Alta do Tocantins'?'selected':'')+'>Ponte Alta do Tocantins</option>'+
        '<option value="Mateiros" '+(S.gVeicCity==='Mateiros'?'selected':'')+'>Mateiros</option>'+
        '<option value="Pindorama" '+(S.gVeicCity==='Pindorama'?'selected':'')+'>Pindorama</option>'+
      '</select>'+
    '</div>';
    
    // Filtramos as listas vPendentes e vFechados (que já foram calculadas no início da renderG)
    let fPend = [...vPendentes];
    let fFechados = [...vFechados];
    
    // Filtro 1: Texto (Pesquisa normal)
    if(S.gSearch){
        const q = S.gSearch.toLowerCase().trim();
        fPend = fPend.filter(v => v.placa.toLowerCase().includes(q) || v.marca_modelo.toLowerCase().includes(q) || (v.condutor||'').toLowerCase().includes(q));
        fFechados = fFechados.filter(v => v.placa.toLowerCase().includes(q) || v.marca_modelo.toLowerCase().includes(q) || (v.condutor||'').toLowerCase().includes(q));
    }

   // Filtro 2: Município (Versão Ultra-Segura)
    if(S.gVeicCity){
        const fc = S.gVeicCity.toLowerCase().trim();
        
        fPend = fPend.filter(v => {
            const vMun = String(v.municipio || '').toLowerCase().trim();
            return vMun === fc;
        });
        
        fFechados = fFechados.filter(v => {
            const vMun = String(v.municipio || '').toLowerCase().trim();
            return vMun === fc;
        });
        
        console.log("Filtrando por:", fc, "Resultados:", fPend.length + fFechados.length);
    }

    c.innerHTML='<div class="anim-in">'+
    '<h3 style="color:var(--gold);font-size:14px;font-weight:800;margin-bottom:10px">VEÍCULOS DA FROTA</h3>'+searchHtml+
    '<div class="card"><h4 style="color:var(--gold);font-size:13px;margin-bottom:14px">➕ CADASTRAR NO BANCO (MySQL)</h4>'+
    '<div class="fr"><div class="fg"><label class="fl">Placa <span class="req">*</span></label><input class="fi" id="nv-placa" placeholder="ABC1234" style="text-transform:uppercase"></div>'+
    '<div class="fg"><label class="fl">Marca/Modelo <span class="req">*</span></label><input class="fi" id="nv-modelo" placeholder="Ex: Fiat Toro"></div></div>'+
    
    '<div class="fg"><label class="fl">Condutor Responsável</label><input class="fi" id="nv-condutor" placeholder="Nome do motorista"></div>'+
    '<div class="fr"><div class="fg"><label class="fl">Rota/Destino</label><input class="fi" id="nv-rota" placeholder="Ex: Interior / Palmas"></div>'+
    '<div class="fg"><label class="fl">Órgão de Origem</label><input class="fi" id="nv-orgao" placeholder="Ex: TRE-TO"></div></div>'+

    '<div class="fr"><div class="fg"><label class="fl">Ano</label><input class="fi" id="nv-ano" type="number" placeholder="2024"></div>'+
    '<div class="fg"><label class="fl">Combustível</label><select class="fi" id="nv-comb"><option value="Flex">Flex</option><option value="Gasolina">Gasolina</option><option value="Diesel">Diesel</option><option value="Etanol">Etanol</option></select></div></div>'+ // ADICIONADO
    '<div class="fr">'+
    '<div class="fg"><label class="fl">Tipo</label><select class="fi" id="nv-tipo"><option value="requisitado">Requisitado</option><option value="alugado">Alugado</option></select></div>'+
    '<div class="fg"><label class="fl">Município</label><select class="fi" id="nv-mun"><option value="Ponte Alta do Tocantins">Ponte Alta do Tocantins</option><option value="Mateiros">Mateiros</option><option value="Pindorama">Pindorama</option></select></div>'+
    '</div>'+
    '<button class="btn btn-grn" onclick="addVehicle()">Salvar Veículo</button></div>'+
    
    '<h3 style="color:var(--grn);font-size:14px;font-weight:800;margin:16px 0 10px">✓ CICLO FECHADO ('+fFechados.length+')</h3>'+
    fFechados.map(v=>vehicleCardHtml(v,'ok')).join('')+
    '<h3 style="color:#f59e0b;font-size:14px;font-weight:800;margin:16px 0 10px">⏳ PENDENTES ('+fPend.length+')</h3>'+
    fPend.map(v=>vehicleCardHtml(v,'pn')).join('')+'</div>';
  }
  else if(S.gTab==='g-equip'){
    c.innerHTML='<div class="anim-in">'+
    '<h3 style="color:var(--gold);font-size:14px;font-weight:800;margin-bottom:6px">GERENCIAR ACESSÓRIOS</h3>'+
    '<div class="card-w"><div class="ckg">'+
    equipment.map((eq,i)=>'<div style="display:flex;gap:4px">'+
      '<label class="cki'+(eq.active?' ck':'')+'" style="flex:1;margin:0"><input type="checkbox" '+(eq.active?'checked':'')+' onchange="togEquip('+i+',this.checked,this.parentElement)">'+eq.label+'</label>'+
      '<button class="btn btn-out" style="padding:0 10px; border-color:var(--red); color:var(--red); width:auto; border-radius:8px" onclick="delEquip('+i+')">🗑️</button>'+
    '</div>').join('')+
    '</div><div style="margin-top:16px;display:flex;gap:8px"><input class="fiw" id="neq-inp" placeholder="Nome do novo acessório..." style="flex:1"><button class="btn btn-grn btn-sm" onclick="addEquip()" style="width:auto;padding:8px 16px">+ Adicionar</button></div></div></div>';
  }
  else if(S.gTab==='g-users'){
    c.innerHTML='<div class="anim-in">'+
    '<h3 style="color:var(--gold);font-size:14px;font-weight:800;margin-bottom:12px">GERENCIAR USUÁRIOS</h3>'+
    '<div class="card"><h4 style="color:var(--gold);font-size:13px;margin-bottom:14px">➕ CADASTRAR NOVO USUÁRIO</h4>'+
    '<div class="fg"><label class="fl">Nome Completo <span class="req">*</span></label><input class="fi" id="nu-name" placeholder="Nome completo"></div>'+
    '<div class="fg"><label class="fl">E-mail <span class="req">*</span></label><input class="fi" id="nu-email" type="email" placeholder="email@tre-to.jus.br"></div>'+
    '<div class="fr"><div class="fg"><label class="fl">Perfil</label><select class="fi" id="nu-role"><option value="vistoriador">Vistoriador</option><option value="gestor">Gestor</option></select></div>'+
    '<div class="fg"><label class="fl">Senha <span class="req">*</span></label><input class="fi" id="nu-pass" type="password" placeholder="Senha de acesso"></div></div>'+
    '<button class="btn btn-grn" onclick="createUser()">Cadastrar Usuário</button></div>'+
    '<h4 style="color:var(--txt2);font-size:13px;font-weight:800;margin:16px 0 10px">USUÁRIOS CADASTRADOS</h4>'+
    users.map(u=>'<div class="card" style="display:flex;align-items:center;gap:12px;padding:14px;position:relative;padding-bottom:50px">'+
    '<div style="width:42px;height:42px;border-radius:50%;background:'+(u.role==='gestor'||u.role==='Gestor'?'linear-gradient(135deg,var(--gold),var(--gold-d))':'linear-gradient(135deg,var(--blue),var(--blue-d))')+';display:flex;align-items:center;justify-content:center;font-size:16px;color:'+(u.role==='gestor'||u.role==='Gestor'?'#0b1120':'#fff')+';font-weight:900;flex-shrink:0">'+(u.full_name?.charAt(0)||'?')+'</div>'+
    '<div style="flex:1"><div style="font-weight:700;font-size:14px">'+(u.full_name||'—')+'</div><div style="font-size:12px;color:var(--txt3)">'+(u.email||'—')+'</div></div>'+
    '<span class="bdg '+(u.role==='gestor'||u.role==='Gestor'?'bdg-gld':'bdg-blu')+'" style="position:absolute;top:14px;right:14px">'+(u.role||'').toLowerCase()+'</span>'+
    '<div style="position:absolute;right:14px;bottom:12px;display:flex;gap:8px">'+
      '<button class="btn btn-out btn-sm" style="padding:4px 10px;font-size:12px;width:auto;min-height:0" onclick="editUser(\''+u.id+'\')">✏️ Editar</button>'+
      '<button class="btn btn-out btn-sm" style="padding:4px 10px;font-size:12px;width:auto;min-height:0;color:var(--red);border-color:var(--red)" onclick="delUser(\''+u.id+'\')">🗑️ Excluir</button>'+
    '</div></div>').join('')+
    '</div>';
  }
}

// ==========================================
// RENDERIZAÇÃO E GESTÃO DE VEÍCULOS (CRUD COMPLETO)
// ==========================================

// 1. Desenha o Card do veículo com os botões de Editar e Excluir
function vehicleCardHtml(v,status){
  const criador = v.cadastrado_por ? v.cadastrado_por.charAt(0).toUpperCase() + v.cadastrado_por.slice(1) : '';
  return '<div class="card vi" style="position:relative; padding-bottom:40px"><div class="vii '+status+'">'+(status==='ok'?'✓':'🚗')+'</div><div style="flex:1"><div style="font-weight:800;color:var(--gold);font-family:var(--fm);letter-spacing:1px">'+v.placa+'</div><div style="font-size:13px;color:var(--txt2)">'+v.marca_modelo+'</div><div style="font-size:11px;color:var(--txt3)">'+v.ano+' · '+v.combustivel+' · '+v.tipo+(criador ? ' · 👤 '+criador : '')+'</div></div><span class="bdg '+(v.tipo==='alugado'?'bdg-pur':'bdg-grn')+'" style="position:absolute; top:14px; right:14px;">'+v.tipo+'</span>'+
  '<div style="position:absolute;right:14px;bottom:12px;display:flex;gap:8px">'+
  '<button class="btn btn-out btn-sm" style="padding:4px 10px;font-size:12px;width:auto;min-height:0" onclick="editVehicle(\''+v.id+'\')">✏️ Editar</button>'+
  '<button class="btn btn-out btn-sm" style="padding:4px 10px;font-size:12px;width:auto;min-height:0;color:var(--red);border-color:var(--red)" onclick="delVehicle(\''+v.id+'\')">🗑️ Excluir</button>'+
  '</div></div>';
}

// 2. Função de CRIAR veículo 
async function addVehicle(){
  const placa=(el('nv-placa').value||'').trim().toUpperCase();
  const marca_modelo=(el('nv-modelo').value||'').trim();
  const condutor=(el('nv-condutor').value||'').trim();
  const rota=(el('nv-rota').value||'').trim();
  const orgao=(el('nv-orgao').value||'').trim();
  const ano=el('nv-ano').value||new Date().getFullYear();
  const comb=el('nv-comb').value; 
  const tipo=el('nv-tipo').value;
  const mun = el('nv-mun').value;
  
  if(!placa||!marca_modelo){toast('Preencha placa e marca/modelo','err');return}
  
  // ==========================================
  // BLOQUEIO DE PLACA DUPLICADA
  // ==========================================
  const vehicles=DB.get('vehicles')||[];
  const placaExiste = vehicles.find(v => v.placa === placa);
  
  if(placaExiste) {
      toast('⚠️ Esta placa já está cadastrada no sistema!', 'err');
      return; // Para a execução e não deixa salvar
  }
  // ==========================================
  
  try {
      const res = await fetch(`${API_URL}/veiculos`, {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ 
              placa: placa, 
              marca: marca_modelo.split(' ')[0], 
              modelo: marca_modelo.split(' ').slice(1).join(' ') || 'Modelo', 
              ano: ano,
              condutor: condutor,
              rota: rota,
              orgao_origem: orgao,
              combustivel: comb, 
              tipo: tipo,
              cadastrado_por: S.profile.role,
              municipio: mun          
          })
      });

      if(res.ok) toast('Salvo no MySQL com sucesso!');
  } catch(e) { toast('Erro API - Salvo localmente', 'warn'); }
  
  // Atualiza o cache local (DB LOCAL)
  vehicles.push({
      id: 'v_' + Date.now(),
      placa: placa, 
      marca_modelo: marca_modelo, 
      ano: parseInt(ano) || new Date().getFullYear(),
      combustivel: comb, 
      orgao_origem: orgao,
      condutor: condutor, 
      rota: rota,        
      tipo: tipo,
      cadastrado_por: S.profile.role,
      municipio: mun, 
      active: true
  });
  
  DB.set('vehicles',vehicles);
  
  // Limpa os campos após salvar
  el('nv-placa').value = '';
  el('nv-modelo').value = '';
  el('nv-condutor').value = '';
  el('nv-rota').value = '';
  el('nv-orgao').value = '';
  
  renderG();
}

// 3. Função de EXCLUIR veículo
async function delVehicle(id){
  if(!confirm('⚠️ Tem certeza que deseja apagar este veículo da frota?\n\nSe ele já possuir vistorias atreladas, o banco de dados bloqueará a exclusão.')) return;
  
  const vehicles = DB.get('vehicles') || [];
  const vIdx = vehicles.findIndex(v => v.id === id);
  if(vIdx < 0) return;
  const v = vehicles[vIdx];
  
  try {
      const res = await fetch(`${API_URL}/veiculos/${v.placa}`, { method: 'DELETE' });
      if(!res.ok) {
          toast('O MySQL bloqueou: Veículo já possui vistorias.', 'err');
          return; 
      }
      toast('Veículo excluído com sucesso do MySQL!', 'ok');
  } catch(e) { toast('Modo offline: Excluído apenas localmente', 'warn'); }

  vehicles.splice(vIdx, 1);
  DB.set('vehicles', vehicles);
  renderG();
}

// 4. Função de ABRIR A TELA DE EDITAR
function editVehicle(id){
  const vehicles = DB.get('vehicles') || [];
  const v = vehicles.find(x => x.id === id);
  if(!v) return;

  const mo = el('modal-ov');
  const mc = el('modal');
  
  let marca = '', modelo = '';
  if(v.marca_modelo) {
      const parts = v.marca_modelo.split(' ');
      marca = parts[0];
      modelo = parts.slice(1).join(' ');
  }

  mc.innerHTML='<div class="modal-h"><h3>✏️ EDITAR VEÍCULO</h3><button class="modal-x" onclick="closeM()">×</button></div>'+
  '<div class="modal-b" style="padding:20px">'+
    '<div class="fg"><label class="fl-d">Placa (Inalterável)</label><input class="fiw" value="'+v.placa+'" disabled style="opacity:0.6;background:#f1f5f9;cursor:not-allowed;font-weight:bold;color:#475569"></div>'+
    '<div class="fr"><div class="fg"><label class="fl-d">Marca <span class="req">*</span></label><input class="fiw" id="ev-marca" value="'+(marca||'')+'"></div>'+
    '<div class="fg"><label class="fl-d">Modelo <span class="req">*</span></label><input class="fiw" id="ev-modelo" value="'+(modelo||'')+'"></div></div>'+
    '<div class="fr"><div class="fg"><label class="fl-d">Ano</label><input type="number" class="fiw" id="ev-ano" value="'+(v.ano||'')+'"></div>'+
    '<div class="fg"><label class="fl-d">Combustível</label><select class="fiw" id="ev-comb"><option value="Flex" '+(v.combustivel==='Flex'?'selected':'')+'>Flex</option><option value="Gasolina" '+(v.combustivel==='Gasolina'?'selected':'')+'>Gasolina</option><option value="Etanol" '+(v.combustivel==='Etanol'?'selected':'')+'>Etanol</option><option value="Diesel" '+(v.combustivel==='Diesel'?'selected':'')+'>Diesel</option></select></div></div>'+
    '<div class="fr">'+
      '<div class="fg"><label class="fl-d">Tipo</label><select class="fiw" id="ev-tipo"><option value="requisitado" '+(v.tipo==='requisitado'?'selected':'')+'>Requisitado</option><option value="alugado" '+(v.tipo==='alugado'?'selected':'')+'>Alugado</option></select></div>'+
      '<div class="fg"><label class="fl-d">Município</label><select class="fiw" id="ev-mun"><option value="Ponte Alta do Tocantins" '+(v.municipio==='Ponte Alta do Tocantins'?'selected':'')+'>Ponte Alta do Tocantins</option><option value="Mateiros" '+(v.municipio==='Mateiros'?'selected':'')+'>Mateiros</option><option value="Pindorama" '+(v.municipio==='Pindorama'?'selected':'')+'>Pindorama</option></select></div>'+
    '</div>'+
    '<div class="fg"><label class="fl-d">Órgão de Origem</label><input class="fiw" id="ev-orgao" value="'+(v.orgao_origem||'')+'"></div>'+
  '</div>'+
  '<div class="modal-f"><button class="btn btn-grn" onclick="saveEditVehicle(\''+v.id+'\')" style="flex:1">💾 Salvar Alterações</button><button class="btn btn-out" onclick="closeM()" style="flex:1">Cancelar</button></div>';
  
  mo.classList.add('show');
}

// 5. Função de SALVAR A EDIÇÃO
async function saveEditVehicle(id){
  const vehicles = DB.get('vehicles') || [];
  const vIdx = vehicles.findIndex(x => x.id === id);
  if(vIdx < 0) return;
  
  const v = vehicles[vIdx];
  const marca = el('ev-marca').value.trim();
  const modelo = el('ev-modelo').value.trim();
  const ano = parseInt(el('ev-ano').value) || 2024;
  const comb = el('ev-comb').value;
  const tipo = el('ev-tipo').value;
  const orgao = el('ev-orgao').value.trim();
  const mun = el('ev-mun').value;
  const marca_modelo_concat = marca + ' ' + modelo;

  if(!marca || !modelo) { toast('Marca e Modelo são obrigatórios', 'err'); return; }

  try {
      const res = await fetch(`${API_URL}/veiculos/${v.placa}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ 
              marca: marca, 
              modelo: modelo, 
              ano: ano, 
              orgao_origem: orgao,
              combustivel: comb,   
              tipo: tipo,
              cadastrado_por: v.cadastrado_por,
              municipio: mun           
          })
      });
      if(res.ok) toast('Atualizado com sucesso no MySQL!', 'ok');
      else toast('Falha ao atualizar no banco de dados', 'err');
  } catch(e) { toast('Modo Offline: Atualizado localmente', 'warn'); }

  vehicles[vIdx] = { ...v, marca_modelo: marca_modelo_concat, ano: ano, combustivel: comb, tipo: tipo, orgao_origem: orgao, cadastrado_por: v.cadastrado_por, municipio: mun };
  DB.set('vehicles', vehicles);
  
  closeM();
  renderG();
}

function togEquip(i,checked,lbl){const eq=DB.get('equipment');eq[i].active=checked;DB.set('equipment',eq);lbl.classList.toggle('ck',checked);}

async function addEquip(){
  const inp=el('neq-inp');const name=inp.value.trim();
  if(!name){toast('Digite o nome','err');return}
  
  // 1. Tenta salvar o novo acessório direto no MySQL
  try {
      const res = await fetch(`${API_URL}/equipamentos`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ nome_equipamento: name })
      });
      if(res.ok) toast('Acessório sincronizado com o MySQL!', 'ok');
  } catch(e) { 
      toast('Modo Offline: Salvo apenas localmente', 'warn'); 
  }

  // 2. Salva na tela e no cache local
  const eq=DB.get('equipment')||[];
  eq.push({key:name.toLowerCase().replace(/\s+/g,'_'),label:name,active:true});
  DB.set('equipment',eq);
  inp.value='';
  renderG();
}

// Função para EXCLUIR um acessório do Banco e da Tela
async function delEquip(index){
  if(!confirm('⚠️ Tem certeza que deseja excluir este acessório DEFINITIVAMENTE do banco de dados?')) return;
  
  const eq = DB.get('equipment') || [];
  const item = eq[index]; // Pega o item que clicamos
  
  // Tenta apagar no MySQL (se ele tiver um ID do banco)
  if(item.id) {
      try {
          const res = await fetch(`${API_URL}/equipamentos/${item.id}`, { method: 'DELETE' });
          if(!res.ok) {
              toast('Erro ao excluir no banco de dados', 'err');
              return;
          }
      } catch(e) { 
          toast('Modo Offline: Não foi possível apagar no servidor agora.', 'warn');
      }
  }

  // Remove o item da lista local e atualiza a tela
  eq.splice(index, 1); 
  DB.set('equipment', eq); 
  renderG(); 
  toast('Acessório removido com sucesso!', 'ok');
}

async function createUser(){
  const name=el('nu-name').value.trim();
  const email=el('nu-email').value.trim();
  const role=el('nu-role').value;
  const pass=el('nu-pass').value;
  
  if(!name||!email||!pass){
      toast('Preencha nome, email e senha','err');
      return;
  }
  
  const users=DB.get('users')||[];
  if(users.find(u=>u.email.toLowerCase()===email.toLowerCase())){
      toast('E-mail já cadastrado localmente','err');
      return;
  }

  let userId = 'u' + Date.now();

  try {
      const res = await fetch(`${API_URL}/usuarios`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
              nome: name,
              login: email, 
              perfil: role === 'gestor' ? 'Gestor' : 'Vistoriador',
              senha: pass
          })
      });
      
      if(res.ok) {
          const data = await res.json();          
          if(data.id) userId = data.id; 
          toast('Usuário salvo no MySQL com sucesso!');
      } else {
          const data = await res.json();
          toast('Erro no banco: ' + (data.erro || 'Falha ao salvar'), 'err');
          return; 
      }
  } catch(e) { toast('Modo Offline: Salvo apenas localmente', 'warn'); }
  
  users.push({id: userId, full_name:name, email, role, pass, active:true});
  DB.set('users',users);
  
  el('nu-name').value = '';
  el('nu-email').value = '';
  el('nu-pass').value = '';
  renderG();
}

/// ==========================================
// GESTÃO DE USUÁRIOS (EDITAR E EXCLUIR)
// ==========================================

async function delUser(id){
  if(!confirm('⚠️ Tem certeza que deseja excluir este usuário?')) return;
  
  const users = DB.get('users') || [];  
  const uIdx = users.findIndex(u => String(u.id) === String(id)); 
  if(uIdx < 0) return;
  
  try {
      const res = await fetch(`${API_URL}/usuarios/${id}`, { method: 'DELETE' });
      if(res.ok) toast('Usuário removido com sucesso!');
  } catch(e) { toast('Modo Offline: Removido localmente', 'warn'); }

  users.splice(uIdx, 1);
  DB.set('users', users);
  renderG();
}

function editUser(id){
  const users = DB.get('users') || [];  
  const u = users.find(x => String(x.id) === String(id)); 
  if(!u) return;

  const mo = el('modal-ov');
  const mc = el('modal');

  mc.innerHTML='<div class="modal-h"><h3>✏️ EDITAR USUÁRIO</h3><button class="modal-x" onclick="closeM()">×</button></div>'+
  '<div class="modal-b" style="padding:20px">'+
    '<div class="fg"><label class="fl-d">Nome Completo <span class="req">*</span></label><input class="fiw" id="eu-name" value="'+(u.full_name||'')+'"></div>'+
    '<div class="fg"><label class="fl-d">E-mail <span class="req">*</span></label><input class="fiw" id="eu-email" value="'+(u.email||'')+'"></div>'+
    '<div class="fr"><div class="fg"><label class="fl-d">Perfil</label><select class="fiw" id="eu-role">'+
      '<option value="vistoriador" '+(u.role==='vistoriador'?'selected':'')+'>Vistoriador</option>'+
      '<option value="gestor" '+(u.role==='gestor'?'selected':'')+'>Gestor</option>'+
    '</select></div>'+
    '<div class="fg"><label class="fl-d">Nova Senha</label><input type="password" class="fiw" id="eu-pass" placeholder="(Em branco = manter)"></div></div>'+
  '</div>'+
  '<div class="modal-f"><button class="btn btn-grn" onclick="saveEditUser(\''+u.id+'\')" style="flex:1">💾 Salvar Alterações</button><button class="btn btn-out" onclick="closeM()" style="flex:1">Cancelar</button></div>';
  
  mo.classList.add('show');
}

async function saveEditUser(id){
  const users = DB.get('users') || [];
  const uIdx = users.findIndex(x => String(x.id) === String(id)); 
  if(uIdx < 0) return;

  const name = el('eu-name').value.trim();
  const email = el('eu-email').value.trim();
  const role = el('eu-role').value;
  const pass = el('eu-pass').value;

  if(!name || !email) { toast('Nome e E-mail são obrigatórios', 'err'); return; }

  try {
      const res = await fetch(`${API_URL}/usuarios/${id}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
              nome: name,
              login: email,
              perfil: role === 'gestor' ? 'Gestor' : 'Vistoriador',
              senha: pass
          })
      });
      
      if(res.ok) {
          toast('Atualizado no MySQL com sucesso!', 'ok');
      } else {
          const data = await res.json();
          toast('Erro no banco: ' + (data.erro || 'Falha ao atualizar'), 'err');
          return; 
      }
  } catch(e) { toast('Modo Offline: Atualizado apenas localmente', 'warn'); }

  users[uIdx].full_name = name;
  users[uIdx].email = email;
  users[uIdx].role = role;
  if(pass) users[uIdx].pass = pass;
  
  DB.set('users', users);
  closeM();
  renderG();
}

// ============================================================
// VISTORIADOR
// ============================================================
function setVTab(t){
  S.vTab=t;S.form=null;S.formType=null;S.vSearch='';
  qa('#v-nav .ni').forEach(n=>n.classList.toggle('act',n.dataset.t===t));
  el('v-back').style.display='none';el('v-logout').style.display='';
  el('v-ysel').style.display='';el('v-nav').style.display='';
  el('v-title').textContent='CODECRAFT VISTORIA';
  renderV();
}
function vHome(){setVTab('v-home')}

function renderV(){
  const c=el('v-content');
  const vehicles=DB.get('vehicles')||[];
  const allInsp=DB.get('inspections')||[];
    
  const yi=allInsp.filter(i=>i.year_reference===S.year);

 // ==========================================
  // LÓGICA DE ESTATÍSTICAS GLOBALIZADA 
  // ==========================================
  const totalFrota = vehicles.length;
  let pendentesCount = 0;

  vehicles.forEach(v => {
      // Busca todas as vistorias salvas para este veículo no ano atual (yi)
      const vistoriasVeiculo = yi.filter(i => i.placa === v.placa && i.status !== 'rascunho');
      let isPendente = false;

      if (vistoriasVeiculo.length === 0) {
          isPendente = true; // Nunca vistoriado no ano
      } else {
          // Procura se tem uma Vistoria 1 (Chegada) sem a Vistoria 2 (Saída)
          const openV1 = vistoriasVeiculo.some(v1 =>
              !v1.cloned_from &&
              !vistoriasVeiculo.some(v2 => v2.cloned_from === v1.id)
          );
          if (openV1) isPendente = true; // Tem chegada, mas falta saída
      }

      if (isPendente) {
          pendentesCount++;
      }
  });
  // ==========================================

  if(S.form){renderForm();return}


  if(S.vTab==='v-home'){
    const drafts=yi.filter(i=>i.status==='rascunho');
    c.innerHTML='<div class="anim-in">'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">'+    
    '<div class="card card-st"><div class="sv" style="color:var(--grn-l)">'+totalFrota+'</div><div class="sl" style="color:var(--grn)">Frota Total</div></div>'+
    '<div class="card card-st"><div class="sv" style="color:#f59e0b">'+pendentesCount+'</div><div class="sl" style="color:#f59e0b">Pendentes</div></div>'+
    '</div>'+
    '<button class="btn btn-pri btn-lg" onclick="startInsp(\'v1\')" style="margin-bottom:4px">📝  Vistoria 1 — Chegada</button>'+
    '<p style="text-align:center;font-size:11px;color:var(--txt3);margin-bottom:14px">Vistoria do veículo ao chegar</p>'+
    '<button class="btn btn-grn btn-lg" onclick="startV2()" style="margin-bottom:4px">🔄  Vistoria 2 — Saída</button>'+
    '<p style="text-align:center;font-size:11px;color:var(--txt3);margin-bottom:20px">Vistoria do veículo ao devolver</p>'+  
    (drafts.length?'<h3 style="color:#f59e0b;font-size:13px;font-weight:800;margin-bottom:8px">📂 RASCUNHOS SALVOS</h3>'+
    drafts.map(i=>'<div class="card ii" onclick="resumeDraft(\''+i.id+'\')"><div class="iic" style="background:linear-gradient(135deg,#92400e,#f59e0b)">✏️</div><div style="flex:1"><div style="font-weight:700;color:var(--gold)">'+(i.placa||'Sem placa')+'</div><div style="font-size:12px;color:var(--txt2)">'+formatarDataTela(i.saida_data)+'</div></div><span class="bdg bdg-gld">Rascunho</span></div>').join(''):'')+
    '</div>';
  }
  else if(S.vTab==='v-hist'){    
    const groups = {};
    yi.forEach(i => {
      const p = i.placa || 'SEM PLACA';
      if (!groups[p]) groups[p] = [];
      groups[p].push(i);
    });
    const groupKeys = Object.keys(groups).sort();

    c.innerHTML = '<div class="anim-in"><h3 style="color:var(--gold);font-size:14px;font-weight:800;margin-bottom:10px">HISTÓRICO GERAL — ' + S.year + '</h3>' +
    (groupKeys.length === 0 ? '<div class="card" style="text-align:center;color:var(--txt3);padding:30px">Nenhuma vistoria em ' + S.year + '</div>' :
    groupKeys.map(placa => {
      const items = groups[placa];
      const veic = vehicles.find(v => v.placa === placa);
      
      return '<div class="plate-group">' +
        '<div class="plate-group-hdr">' +
          '<div>' +
            '<span style="font-weight:800;color:var(--gold);font-family:var(--fm);letter-spacing:1px;font-size:15px">' + placa + '</span>' +
            '<span style="margin-left:10px;font-size:12px;color:var(--txt2)">' + (veic ? veic.marca_modelo : '') + '</span>' +
          '</div>' +
          '<span class="bdg bdg-blu">' + items.length + ' registro(s)</span>' +
        '</div>' +
        '<div class="plate-group-body">' +
          items.map(i => {
            const st = stInfo(i.status);
            return '<div class="card ii" style="margin:0;border-radius:0;border-bottom:1px solid var(--brd)" onclick="viewInsp(\'' + i.id + '\')">' +
              '<div class="iic" style="background:' + st.bg + '">' + st.ic + '</div>' +
              '<div style="flex:1">' +                
                '<div style="font-size:12px;color:var(--txt2)">' + (i.inspector_name || '—') + ' · ' + formatarDataTela(i.saida_data) + ' às ' + (i.saida_horario || '') + '</div>' +
              '</div>' +
              '<span class="bdg ' + st.cl + '">' + st.lb + '</span>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>';
    }).join('')) + '</div>';
  }
  else if(S.vTab==='v-veic'){
    const searchHtml='<div class="search-box"><input class="fi" placeholder="🔍 Pesquisar veículo..." value="'+S.vSearch+'" oninput="S.vSearch=this.value;renderV()"></div>';
    let fv=vehicles;
    if(S.vSearch){const q=S.vSearch.toLowerCase();fv=vehicles.filter(v=>v.placa.toLowerCase().includes(q)||v.marca_modelo.toLowerCase().includes(q))}
    c.innerHTML='<div class="anim-in">'+searchHtml+
    '<h3 style="color:#f59e0b;font-size:14px;font-weight:800;margin:16px 0 10px">⏳ FROTA ('+fv.length+')</h3>'+
    fv.map(v=>{
      const criador = v.cadastrado_por ? v.cadastrado_por.charAt(0).toUpperCase() + v.cadastrado_por.slice(1) : '';
      return '<div class="card vi" onclick="startForPlate(\''+v.placa+'\')"><div class="vii pn">🚗</div><div style="flex:1"><div style="font-weight:800;color:var(--gold);font-family:var(--fm);letter-spacing:1px">'+v.placa+'</div><div style="font-size:13px;color:var(--txt2)">'+v.marca_modelo+'</div>' + (criador ? '<div style="font-size:11px;color:var(--txt3);margin-top:2px">👤 Cadastrado por: '+criador+'</div>' : '') + '</div><span style="color:var(--blue-l);font-size:12px;font-weight:700">Vistoriar →</span></div>'
    }).join('')+
    '</div>';
  }
}

function newFormData(){
  return {id:'i_'+Date.now(),inspector_id:S.profile.id,inspector_name:S.profile.full_name,
    year_reference:S.year,status:'rascunho',placa:'',marca_modelo:'',ano:'',combustivel:'',tipo:'',
    itinerario:'',nome_condutor:'', equipment:{},comentario:'',sem_avarias:true,com_avarias:false,avarias_obs:'',
    saida_data:nDate(),saida_horario:nTime(),saida_hodometro:'',saida_pneus:'',saida_tanque:'',
    retorno_data:'',retorno_horario:'',retorno_hodometro:'',retorno_pneus:'',retorno_tanque:'',
    assinatura_motorista:'', assinatura_vistoriador:'',photos:[],photos_saida:[],avaria_photos:[],avaria_photos_saida:[],cloned_from:null, db_id: null};
}

function startInsp(type){S.formType=type;S.formSec=0;S.form=newFormData();showFormUI();renderForm()}
function startV2(){
  const allInsp = DB.get('inspections') || [];
  
  const avail = allInsp.filter(i => 
      i.year_reference === S.year && 
      (i.status === 'saida_completa' || i.mysql_status === 'Aberta' || i.status === 'enviado') &&
      !i.cloned_from && 
      !allInsp.some(v2 => v2.cloned_from === i.id) 
  );

  if(!avail.length){
      toast('Nenhuma vistoria de chegada aguardando saída no momento.', 'warn');
      return;
  }

  el('v-back').style.display='';el('v-logout').style.display='none';el('v-ysel').style.display='none';el('v-nav').style.display='none';
  el('v-title').textContent='VISTORIA 2 — SAÍDA';
  
  el('v-content').innerHTML='<div class="anim-in" style="padding-top:16px"><h3 style="color:var(--gold);font-size:15px;font-weight:800;margin-bottom:6px">Selecione a Vistoria</h3>'+
  avail.map(i=> {      
      let dataFormatada = i.saida_data || '';
      if(dataFormatada.length > 10 && dataFormatada.includes('GMT')) {
          const d = new Date(dataFormatada);
          dataFormatada = d.toISOString().split('T')[0];
      }
      
      return '<div class="card ii" style="cursor:pointer" onclick="cloneInsp(\''+i.id+'\')"><div class="iic" style="background:linear-gradient(135deg,#065f46,var(--grn))">🔄</div><div style="flex:1"><div style="font-weight:700;color:var(--gold)">'+i.placa+'</div><div style="font-size:12px;color:var(--txt2)">Data: '+dataFormatada+'</div></div><span style="color:var(--grn-l);font-size:12px;font-weight:700">Importar →</span></div>'
  }).join('')+'</div>';
}

function cloneInsp(id){
  const orig=(DB.get('inspections')||[]).find(i=>i.id===id);if(!orig)return;
  S.formType='v2';S.formSec=0;
  S.form={
    ...JSON.parse(JSON.stringify(orig)),
    id:'i_'+Date.now(),
    status:'rascunho',
    retorno_data:nDate(),
    retorno_horario:nTime(),
    retorno_hodometro:'',
    retorno_pneus:'',
    retorno_tanque:'',
    assinatura_motorista:'',
       
    assinatura_vistoriador: '', 
    inspector_id: S.profile.id_usuario, 
    inspector_name: S.profile.full_name, 
    photos_saida: [],
    avaria_photos_saida: [], 
    cloned_from:orig.id,
    
    cloned_from:orig.id, 
    db_id: orig.db_id
  };
  showFormUI();renderForm();
}

function startForPlate(p){startInsp('v1');S.form.placa=p;lookupPlate(p);renderForm()}
function resumeDraft(id){const i=(DB.get('inspections')||[]).find(x=>x.id===id);if(!i)return;S.form=JSON.parse(JSON.stringify(i));S.formType=i.cloned_from?'v2':'v1';S.formSec=0;showFormUI();renderForm()}

function showFormUI(){
  el('v-back').style.display='';el('v-logout').style.display='none';
  el('v-ysel').style.display='none';el('v-nav').style.display='none';
  el('v-title').textContent=S.formType==='v2'?'VISTORIA 2 — SAÍDA':'VISTORIA 1 — CHEGADA';
}

function lookupPlate(p){
  const cl=p.toLowerCase().replace(/[^a-z0-9]/g,'');
  if (cl.length < 7) return; 

  // ==========================================
  // BLOQUEIOS: CHEGADA DUPLICADA E CICLO FECHADO
  // ==========================================
  if (S.formType === 'v1') {
      const allInsp = DB.get('inspections') || [];
      
      // 1. NOVO: Bloqueia se o veículo já tiver um ciclo fechado (Saída realizada)
      const closedCycle = allInsp.find(i =>
          i.placa && i.placa.toLowerCase().replace(/[^a-z0-9]/g,'') === cl &&
          i.status === 'retorno_completo'
      );

      if (closedCycle) {
          toast('⚠️ Este veículo já concluiu o ciclo de vistoria (Chegada e Saída)!', 'err');
          S.form.placa = ''; 
          S.form.isNewVehicle = false; 
          renderForm();
          return; 
      }
            
      // 2. MANTÉM: Bloqueia se já tiver uma Chegada em aberto
      const openV1 = allInsp.find(i =>
          i.placa && i.placa.toLowerCase().replace(/[^a-z0-9]/g,'') === cl &&
          !i.cloned_from && 
          !allInsp.some(v2 => v2.cloned_from === i.id || (v2.placa === i.placa && v2.status === 'retorno_completo')) 
      );
      
      if (openV1 && openV1.id !== S.form.id) {
          toast('⚠️ Veículo já possui uma Chegada em aberto! Faça a Saída primeiro.', 'err');
          S.form.placa = ''; 
          S.form.isNewVehicle = false; 
          renderForm();
          return; 
      }
  }
  // ==========================================

  const v=(DB.get('vehicles')||[]).find(x=>x.placa.toLowerCase().replace(/[^a-z0-9]/g,'')===cl);
  if(v){
    S.form.isNewVehicle = false;
    Object.assign(S.form,{placa:v.placa,marca_modelo:v.marca_modelo,ano:v.ano,combustivel:v.combustivel,tipo:v.tipo, municipio:v.municipio}); // 
            
    if(v.condutor && !S.form.nome_condutor) S.form.nome_condutor = v.condutor;
    if(v.rota && !S.form.itinerario) S.form.itinerario = v.rota;
        
    toast('Veículo '+v.placa+' encontrado!');
    renderForm();
  } else {   
    if(S.form.lastCheckedPlate !== cl) {
        S.form.lastCheckedPlate = cl; 
        if(confirm("Placa não encontrada no banco de dados. Deseja cadastrar o veículo agora?")) {
            S.form.isNewVehicle = true;
            S.form.marca = '';
            S.form.modelo = '';
            S.form.ano = new Date().getFullYear();
            S.form.combustivel = 'Flex';
            renderForm(); 
        } else {
            S.form.isNewVehicle = false;
        }
    }
  }
}

function renderForm(){
  const c=el('v-content');const d=S.form;const isR=S.formType==='v2';
    
  const secs=['Identificação','Equipamentos',isR?'Saída':'Chegada','Avarias','Fotos','Assinatura'];
  const sec=S.formSec;
  const aeq=(DB.get('equipment')||[]).filter(e=>e.active);

  let h='<div class="anim-up" style="padding-top:12px"><div class="stabs">'+secs.map((s,i)=>'<button class="stab'+(i===sec?' act':i<sec?' done':'')+'" onclick="S.formSec='+i+';renderForm()">'+s+'</button>').join('')+'</div>';

  /// SEÇÃO 0: Identificação
  if(sec===0){
    h+='<div class="card-w"><h3 style="margin:0 0 16px;border-bottom:3px solid var(--gold);padding-bottom:8px">Dados de Identificação</h3>'+
    '<div class="fg"><label class="fl-d">Placa do Veículo <span class="req">*</span></label><input class="fiw plate" id="f-placa" value="'+d.placa+'" oninput="onPlacaInp(this.value)" maxlength="8"></div>';
    
    if(d.isNewVehicle) {
        h+='<div style="background:#fffbeb;border:1px solid #f59e0b;padding:12px;border-radius:8px;margin-bottom:16px;">'+
           '<h4 style="color:#b45309;margin-bottom:10px;font-size:13px;font-weight:800;">🚗 CADASTRAR VEÍCULO</h4>'+
           '<div class="fr"><div class="fg"><label class="fl-d">Marca <span class="req">*</span></label><input class="fiw" id="f-nv-marca" placeholder="Ex: Fiat" value="'+(d.marca||'')+'"></div>'+
           '<div class="fg"><label class="fl-d">Modelo <span class="req">*</span></label><input class="fiw" id="f-nv-modelo" placeholder="Ex: Toro" value="'+(d.modelo||'')+'"></div></div>'+
           '<div class="fr"><div class="fg"><label class="fl-d">Ano</label><input class="fiw" type="number" id="f-nv-ano" value="'+(d.ano||'')+'"></div>'+
           '<div class="fg"><label class="fl-d">Combustível</label><select class="fiw" id="f-nv-comb"><option value="Flex" '+(d.combustivel==='Flex'?'selected':'')+'>Flex</option><option value="Gasolina" '+(d.combustivel==='Gasolina'?'selected':'')+'>Gasolina</option><option value="Etanol" '+(d.combustivel==='Etanol'?'selected':'')+'>Etanol</option><option value="Diesel" '+(d.combustivel==='Diesel'?'selected':'')+'>Diesel</option></select></div></div>'+
           '<div class="fr" style="margin-top:10px"><div class="fg"><label class="fl-d">Tipo</label><select class="fiw" id="f-nv-tipo"><option value="requisitado" '+(d.tipo==='requisitado'?'selected':'')+'>Requisitado</option><option value="alugado" '+(d.tipo==='alugado'?'selected':'')+'>Alugado</option></select></div>'+
           '<div class="fg"><label class="fl-d">Município</label><select class="fiw" id="f-nv-mun"><option value="Ponte Alta do Tocantins" '+(d.municipio==='Ponte Alta do Tocantins'?'selected':'')+'>Ponte Alta do Tocantins</option><option value="Mateiros" '+(d.municipio==='Mateiros'?'selected':'')+'>Mateiros</option><option value="Pindorama" '+(d.municipio==='Pindorama'?'selected':'')+'>Pindorama</option></select></div></div>'+
           '<div class="fg" style="margin-bottom:10px"><label class="fl-d">Órgão de Origem <span class="req">*</span></label><input class="fiw" id="f-nv-orgao" placeholder="Ex: Cartório da 26ª ZE" value="'+(d.orgao_origem||'')+'"></div>'+
           '</div>';
    } else if (d.marca_modelo && d.placa.length >= 7) {        
        h+='<div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:12px;border-radius:8px;margin-bottom:16px;">'+
           '<h4 style="color:#166534;margin-bottom:8px;font-size:13px;font-weight:800;">✅ VEÍCULO ENCONTRADO</h4>'+
           '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:13px;color:#15803d;">'+
           '<div><strong>Marca/Modelo:</strong> '+(d.marca_modelo||'—')+'</div>'+
           '<div><strong>Ano:</strong> '+(d.ano||'—')+'</div>'+
           '<div><strong>Combustível:</strong> '+(d.combustivel||'—')+'</div>'+
           '<div><strong>Tipo:</strong> '+(d.tipo||'—')+'</div>'+
           '</div></div>';
    }

    h+='<div class="fg"><label class="fl-d">Itinerário <span class="req">*</span></label><input class="fiw" id="f-itin" value="'+(d.itinerario||'')+'"></div>'+
    '<div class="fg"><label class="fl-d">Nome do Condutor <span class="req">*</span></label><input class="fiw" id="f-cond" value="'+(d.nome_condutor||'')+'"></div></div>';
  }

  // SEÇÃO 1: Equipamentos 
  if(sec===1){
     h+='<div class="card-w"><h3 style="margin:0 0 16px;font-size:16px;font-weight:900;color:#0f172a;border-bottom:3px solid var(--gold);padding-bottom:8px">Acessórios e Equipamentos</h3>'+
    '<div class="ckg" style="align-items: center;">'+aeq.map(eq=>{
        let chk = '<label class="cki'+(d.equipment[eq.key]?' ck':'')+'"><input type="checkbox" '+(d.equipment[eq.key]?'checked':'')+' onchange="S.form.equipment[\''+eq.key+'\']=this.checked; renderForm()">'+eq.label+'</label>';
        if(eq.key === 'calotas' && d.equipment['calotas']) {
            chk += '<input type="number" class="fi" style="width: 70px; margin-left: -4px; margin-right: 10px; padding: 6px; text-align: center;" placeholder="Qtd" value="'+(d.equipment['calotas_qtd']||'')+'" oninput="S.form.equipment[\'calotas_qtd\']=this.value">';
        }
        return chk;
    }).join('')+'</div>'+
    '<div class="fg" style="margin-top:14px"><label class="fl-d">Comentário</label><textarea class="fiw" id="f-comment" placeholder="Observações sobre os equipamentos...">'+(d.comentario||'')+'</textarea></div></div>';
  }

 // SEÇÃO 2: Histórico (Chegada ou Saída)
  if(sec===2){
     const px=isR?'retorno':'saida';
     const tl=isR?'Histórico — Saída (Devolução)':'Histórico — Chegada';
     const bc=isR?'var(--grn)':'var(--blue)';
     
    h+='<div class="card-w"><h3 style="margin:0 0 16px;font-size:16px;font-weight:900;color:#0f172a;border-bottom:3px solid '+bc+';padding-bottom:8px">'+tl+'</h3>';
        
    if(isR && d.cloned_from) {
        h += `<div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; padding:14px; margin-bottom:18px; font-size:13px; color:#1e40af; line-height:1.6">
                <div style="font-weight:800; margin-bottom:4px; display:flex; align-items:center; gap:5px">🔄 DADOS IMPORTADOS DA CHEGADA:</div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                    <div><strong>📅 Data:</strong> ${d.saida_data} às ${d.saida_horario}</div>
                    <div><strong>🚀 Hodômetro:</strong> ${d.saida_hodometro || '—'} km</div>
                    <div><strong>🛞 Pneus:</strong> ${d.saida_pneus || 'Não inf.'}</div>
                    <div><strong>⛽ Tanque:</strong> ${d.saida_tanque || 'Não inf.'}</div>
                </div>
              </div>`;
    }

    h+='<div class="fr"><div class="fg"><label class="fl-d">Data <span class="req">*</span></label><input type="date" class="fiw" id="f-'+px+'_data" value="'+(d[px+'_data']||'')+'"></div>'+
    '<div class="fg"><label class="fl-d">Horário <span class="req">*</span></label><input type="time" class="fiw" id="f-'+px+'_hor" value="'+(d[px+'_horario']||'')+'"></div></div>'+
    '<div class="fg"><label class="fl-d">Hodômetro (km) <span class="req">*</span></label><input type="number" class="fiw" style="font-size:22px;font-weight:800;font-family:var(--fm)" id="f-'+px+'_hod" placeholder="00000" value="'+(d[px+'_hodometro']||'')+'"></div>'+
    '<div class="fg"><label class="fl-d">Condição dos Pneus <span class="req">*</span></label><div class="og">'+TIRE.map(t=>'<button class="ob'+(d[px+'_pneus']===t?' sel':'')+'" onclick="syncForm(); S.form.'+px+'_pneus=\''+t+'\';renderForm()">'+t+'</button>').join('')+'</div></div>'+
    '<div class="fg"><label class="fl-d">Nível do Tanque <span class="req">*</span></label><div class="fg-g">'+FUEL.map(f=>'<button class="fb'+(d[px+'_tanque']===f?' sel':'')+'" onclick="syncForm(); S.form.'+px+'_tanque=\''+f+'\';renderForm()">'+f+'</button>').join('')+'</div></div></div>';
  }

  // SEÇÃO 3: Avarias
  if(sec===3){
    h+='<div class="card-w"><h3 style="margin:0 0 16px;border-bottom:3px solid var(--red);padding-bottom:8px">Avarias</h3>';

    if(isR && d.cloned_from && d.avaria_photos && d.avaria_photos.length > 0) {
        h += `<div style="background:#fef2f2; border:1px solid #fca5a5; border-radius:10px; padding:14px; margin-bottom:18px;">
                <div style="font-weight:800; font-size:13px; color:#991b1b; margin-bottom:10px;">📸 FOTOS DAS AVARIAS DA CHEGADA:</div>
                <div class="phg">${photoThumbs(d.avaria_photos, 'avp_chk')}</div>
              </div>`;
    }

    const phTarget = isR ? d.avaria_photos_saida||[] : d.avaria_photos||[];
    h+='<div style="display:flex;gap:12px;margin-bottom:14px"><label class="ob'+(d.sem_avarias?' sel-g':'')+'" style="flex:1;cursor:pointer" onclick="syncForm(); S.form.sem_avarias=true;S.form.com_avarias=false;renderForm()"><input type="radio" name="av" '+(d.sem_avarias?'checked':'')+'> <strong>Sem Avarias</strong></label><label class="ob'+(d.com_avarias?' sel':'')+'" style="flex:1;cursor:pointer" onclick="syncForm(); S.form.sem_avarias=false;S.form.com_avarias=true;renderForm()"><input type="radio" name="av" '+(d.com_avarias?'checked':'')+'> <strong>Com Avarias</strong></label></div>'+
    (d.com_avarias?'<div class="fg"><label class="fl-d">Descreva as avarias <span class="req">*</span></label><textarea class="fiw" id="f-avobs">'+(d.avarias_obs||'')+'</textarea></div><div class="fg"><label class="fl-d">📸 Fotos das Avarias '+(isR?'(Saída)':'')+'</label><div class="phg">'+photoThumbs(phTarget,'avp')+'<div class="pha" onclick="trigPhoto(\'avp\')">+</div></div></div>':'')+'</div>';
  }
  // SEÇÃO 4: Fotos
  if(sec===4){
    const pts=[{k:'frente',l:'Frente'},{k:'traseira',l:'Traseira'},{k:'lat_esq',l:'Lateral Esquerda'},{k:'lat_dir',l:'Lateral Direita'},{k:'painel',l:'Painel'}];
    h+='<div class="card-w"><h3 style="margin:0 0 16px;font-size:16px;font-weight:900;color:#0f172a;border-bottom:3px solid var(--blue);padding-bottom:8px">Registro Fotográfico</h3>';

    // Exibe as fotos da chegada como "Apenas Leitura"
    if(isR && d.cloned_from && d.photos && d.photos.length > 0) {
        h += `<div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; padding:14px; margin-bottom:18px;">
                <div style="font-weight:800; font-size:13px; color:#1e40af; margin-bottom:10px;">📸 FOTOS DA CHEGADA:</div>
                <div class="phg">${photoThumbs(d.photos, 'ph_chk')}</div>
              </div>`;
    }

    const phTarget = isR ? (d.photos_saida||[]) : (d.photos||[]);
    h+='<p class="phh" style="margin-bottom:16px;font-size:12px;color:#b45309;background:#fffbeb;padding:8px;border-radius:4px;border:1px solid #fde68a">⚠️ <strong>Atenção:</strong> É obrigatório anexar pelo menos 1 foto em cada um dos 5 ângulos abaixo para prosseguir com a '+(isR?'Saída':'Chegada')+'.</p>'+
    pts.map(pt=>'<div class="fg"><label class="fl-d">📸 '+pt.l+' '+(isR?'(Nova Foto)':'')+' <span class="req">*</span></label><div class="phg">'+photoThumbs(phTarget.filter(p=>p.type==='ph_'+pt.k),'ph_'+pt.k)+'<div class="pha" onclick="trigPhoto(\'ph_'+pt.k+'\')">+</div></div></div>').join('')+'</div>';
  }
  // SEÇÃO 5: Assinatura
  if(sec===5){
    // 1. Prepara os dados para o resumo dependendo se é V1 ou V2
    const px = isR ? 'retorno' : 'saida';
    const hodo = d[px+'_hodometro'] || '—';
    const tanque = d[px+'_tanque'] || '—';
    const pneus = d[px+'_pneus'] || '—';
    const avariasText = d.com_avarias ? (d.avarias_obs || 'Com avarias não descritas') : 'Sem avarias';
    
    // Filtra e lista apenas os equipamentos que foram marcados com (X)
    const eqList = aeq.filter(eq => d.equipment && d.equipment[eq.key]).map(eq => {
        return (eq.key === 'calotas' && d.equipment['calotas_qtd']) ? `Calotas (${d.equipment['calotas_qtd']})` : eq.label;
    }).join(', ') || 'Nenhum equipamento marcado';

    // 2. Desenha a tela
    h+='<div class="card-w"><h3 style="margin:0 0 16px;font-size:16px;font-weight:900;color:#0f172a;border-bottom:3px solid #7c3aed;padding-bottom:8px">Conferência e Assinaturas</h3>'+
    
    // --- QUADRO DE RESUMO PARA O MOTORISTA ---
    '<div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:14px; margin-bottom:18px; font-size:13px; color:#334155; line-height:1.6;">'+
      '<h4 style="margin:0 0 10px 0; color:#0f172a; font-size:14px; border-bottom:1px solid #e2e8f0; padding-bottom:6px;">📄 Resumo para o Motorista</h4>'+
      '<div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">'+
        '<div><strong>🚗 Veículo:</strong> '+d.placa+'</div>'+
        '<div><strong>🚀 Hodômetro:</strong> '+hodo+' km</div>'+
        '<div><strong>⛽ Tanque:</strong> '+tanque+'</div>'+
        '<div><strong>🛞 Pneus:</strong> '+pneus+'</div>'+
        '<div style="grid-column: span 2;"><strong>⚠️ Avarias:</strong> '+avariasText+'</div>'+
        '<div style="grid-column: span 2;"><strong>🎒 Equipamentos a bordo:</strong> '+eqList+'</div>'+
      '</div>'+
    '</div>'+
    // -----------------------------------------------

    '<div style="background:#f1f5f9;border-radius:10px;padding:12px;margin-bottom:16px;font-size:13px;color:#475569"><strong>Vistoriador Responsável:</strong> '+S.profile.full_name+'</div>'+
    '<div class="fg"><label class="fl-d">✍️ Assinatura do Motorista <span class="req">*</span></label><div class="sig-c"><canvas class="sig-cv" id="sig-mot"></canvas>'+(d.assinatura_motorista?'':'<div class="sig-ph">✍️ Assine aqui</div>')+'</div><div class="sig-nm">'+(d.nome_condutor||'Condutor')+'</div><button class="sig-cl" onclick="clrSig(\'mot\')">Limpar</button></div>'+
    '<div class="fg"><label class="fl-d">✍️ Assinatura do Vistoriador <span class="req">*</span></label><div class="sig-c"><canvas class="sig-cv" id="sig-vis"></canvas>'+(d.assinatura_vistoriador?'':'<div class="sig-ph">✍️ Assine aqui</div>')+'</div><div class="sig-nm">'+S.profile.full_name+'</div><button class="sig-cl" onclick="clrSig(\'vis\')">Limpar</button></div></div>';
  }

  // BOTÕES INFERIORES E FECHAMENTO DA FUNÇÃO renderForm
  h+='<div style="padding:16px 0 30px;display:flex;flex-direction:column;gap:8px">';
  if(sec<secs.length-1) h+='<button class="btn btn-pri" onclick="nextSec()">Próximo →</button>';
  else h+='<button class="btn btn-grn btn-lg" onclick="syncVistoriaAPI()">✅ SALVAR NO BANCO DE DADOS (MySQL)</button>';
  h+='<button class="btn btn-out" onclick="saveDraft()">📂 Salvar Rascunho Offline</button>';
  if(sec>0)h+='<button class="btn btn-out" onclick="prevSec()" style="color:var(--txt3)">← Voltar</button>';
  h+='</div></div>';

  c.innerHTML=h;
  if(sec===5)setTimeout(()=>{initSig('mot');initSig('vis')},60);
} 

function photoThumbs(arr,key){return arr.map((p,i)=>'<div class="pht"><img src="'+p.data+'"><button class="phd" onclick="rmPhoto(\''+key+'\','+i+')">×</button></div>').join('')}
let _phTarget=''; 
function trigPhoto(t){ syncForm(); _phTarget=t; el('photo-inp').click() }
function onPhotoFiles(files){
  Array.from(files).forEach(f=>{
    const r=new FileReader();
    r.onload=ev=>{
      const img = new Image();
      img.onload = () => {
        // Comprime a foto para caber no banco de dados e no PDF
        const cv = document.createElement('canvas');
        const MAX_W = 800, MAX_H = 800;
        let w = img.width, h = img.height;
        if(w > h) { if(w > MAX_W) { h *= MAX_W/w; w = MAX_W; } } 
        else { if(h > MAX_H) { w *= MAX_H/h; h = MAX_H; } }
        cv.width = w; cv.height = h;
        const ctx = cv.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        
        // Salva em formato leve (JPEG com 60% de qualidade)
        const dataUrl = cv.toDataURL('image/jpeg', 0.6);
        
        const ph={data:dataUrl, name:f.name, type:_phTarget};
        if(_phTarget==='avp'){
            if(S.formType === 'v2') {
                S.form.avaria_photos_saida=S.form.avaria_photos_saida||[];
                S.form.avaria_photos_saida.push(ph);
            } else {
                S.form.avaria_photos=S.form.avaria_photos||[];
                S.form.avaria_photos.push(ph);
            }
        } else {
            // SEPARA AS FOTOS GERAIS DA SAÍDA E DA CHEGADA
            if(S.formType === 'v2') {
                S.form.photos_saida=S.form.photos_saida||[];
                S.form.photos_saida.push(ph);
            } else {
                S.form.photos=S.form.photos||[];
                S.form.photos.push(ph);
            }
        }
        renderForm();
      };
      img.src = ev.target.result;
    };
    r.readAsDataURL(f);
  });
}
function rmPhoto(k,i){
  syncForm(); 
  if(k==='avp') {
      if(S.formType === 'v2') S.form.avaria_photos_saida.splice(i,1);
      else S.form.avaria_photos.splice(i,1);
  } else {
      if(S.formType === 'v2') S.form.photos_saida.splice(i,1);
      else S.form.photos.splice(i,1);
  }
  renderForm();
}
function onPlacaInp(v){S.form.placa=v.toUpperCase();if(v.replace(/[^a-zA-Z0-9]/g,'').length>=7)lookupPlate(v)}

// SIGNATURE CORE
const SIG={};
function initSig(n){
  const cv=el('sig-'+n);if(!cv)return;const rc=cv.getBoundingClientRect();
  cv.width=rc.width*2;cv.height=rc.height*2;
  const ctx=cv.getContext('2d');ctx.scale(2,2);ctx.lineCap='round';ctx.lineWidth=2;ctx.strokeStyle='#1a237e';
  SIG[n]={d:false,ctx,cv,w:rc.width,h:rc.height};
  const ex=n==='mot'?S.form.assinatura_motorista:S.form.assinatura_vistoriador;
  if(ex){const img=new Image();img.onload=()=>ctx.drawImage(img,0,0,rc.width,rc.height);img.src=ex}
  const gp=e=>{const r=cv.getBoundingClientRect();const t=e.touches?e.touches[0]:e;return{x:t.clientX-r.left,y:t.clientY-r.top}};
  const st=e=>{e.preventDefault();SIG[n].d=true;const p=gp(e);ctx.beginPath();ctx.moveTo(p.x,p.y)};
  const mv=e=>{if(!SIG[n].d)return;e.preventDefault();const p=gp(e);ctx.lineTo(p.x,p.y);ctx.stroke()};
  const en=()=>{if(!SIG[n].d)return;SIG[n].d=false;const k=n==='mot'?'assinatura_motorista':'assinatura_vistoriador';S.form[k]=cv.toDataURL();};
  cv.onmousedown=st;cv.onmousemove=mv;cv.onmouseup=en;cv.onmouseleave=en;
  cv.addEventListener('touchstart',st,{passive:false});cv.addEventListener('touchmove',mv,{passive:false});cv.addEventListener('touchend',en);
}
function clrSig(n){const s=SIG[n];if(!s)return;s.ctx.clearRect(0,0,s.w,s.h);const k=n==='mot'?'assinatura_motorista':'assinatura_vistoriador';S.form[k]='';renderForm()}

// VALIDATION & SYNC API
function syncForm(){
  const d=S.form;const g=id=>{const e=el(id);return e?e.value:undefined};
  if(g('f-placa')!==undefined)d.placa=g('f-placa').toUpperCase();
  if(g('f-itin')!==undefined)d.itinerario=g('f-itin');
  if(g('f-cond')!==undefined)d.nome_condutor=g('f-cond');
  if(g('f-avobs')!==undefined)d.avarias_obs=g('f-avobs');
  const isR=S.formType==='v2';const px=isR?'retorno':'saida';
  if(g('f-'+px+'_data')!==undefined)d[px+'_data']=g('f-'+px+'_data');
  if(g('f-'+px+'_hor')!==undefined)d[px+'_horario']=g('f-'+px+'_hor');
  if(g('f-'+px+'_hod')!==undefined)d[px+'_hodometro']=g('f-'+px+'_hod');

  if(d.isNewVehicle) {
     if(g('f-nv-marca')!==undefined) d.marca=g('f-nv-marca');
     if(g('f-nv-modelo')!==undefined) d.modelo=g('f-nv-modelo');
     if(g('f-nv-ano')!==undefined) d.ano=g('f-nv-ano');
     if(g('f-nv-comb')!==undefined) d.combustivel=g('f-nv-comb');
     if(g('f-nv-tipo')!==undefined) d.tipo=g('f-nv-tipo'); 
     if(g('f-nv-orgao')!==undefined) d.orgao_origem=g('f-nv-orgao'); 
     if(g('f-nv-mun')!==undefined) d.municipio=g('f-nv-mun');
  }
}

function valSec(sec){ 
    // Bloqueio das Fotos
    if(sec===4) {
        const pts = ['ph_frente','ph_traseira','ph_lat_esq','ph_lat_dir','ph_painel'];
        // Verifica o array correto dependendo se é V1 ou V2
        const uploadedTypes = (S.formType === 'v2' ? (S.form.photos_saida||[]) : (S.form.photos||[])).map(p => p.type);
        for(let pt of pts) {
            if(!uploadedTypes.includes(pt)) {
                toast('Falta anexar a foto: ' + pt.replace('ph_','').replace('_',' ').toUpperCase(), 'err');
                return false;
            }
        }
    }
    // Bloqueio extra: Obriga a digitar o defeito se marcar "Com Avarias"
    if(sec===3 && S.form.com_avarias && (!S.form.avarias_obs || S.form.avarias_obs.trim()==='')) {
        toast('Você marcou "Com Avarias". É obrigatório descrevê-las no campo de texto.', 'err');
        return false;
    }
    return true; 
}
function valAll(){ for(let i=0;i<5;i++){if(!valSec(i)){S.formSec=i;renderForm();return false}}return true}
async function nextSec(){
  syncForm();
  
  if(S.formSec === 0 && S.form.isNewVehicle) {
      if(!S.form.marca || !S.form.modelo || !S.form.orgao_origem) {
          toast('Preencha marca, modelo e órgão de origem', 'err');
          return;
      }
      const vehicles = DB.get('vehicles') || [];
      const exists = vehicles.find(v => v.placa === S.form.placa);
      
      if(!exists) {
          const marca_modelo_concat = S.form.marca + ' ' + S.form.modelo;
          S.form.marca_modelo = marca_modelo_concat;
                    
          vehicles.push({
              id: 'v_' + Date.now(),
              placa: S.form.placa,
              marca_modelo: marca_modelo_concat,
              ano: parseInt(S.form.ano) || new Date().getFullYear(),
              combustivel: S.form.combustivel,
              orgao_origem: S.form.orgao_origem, 
              tipo: S.form.tipo || 'requisitado',
              cadastrado_por: S.profile.role, 
              municipio: S.form.municipio,
              active: true
          });
          DB.set('vehicles', vehicles);
          
          try {
              const resV = await fetch(`${API_URL}/veiculos`, {
                  method: 'POST', headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify({ 
                      placa: S.form.placa, 
                      marca: S.form.marca, 
                      modelo: S.form.modelo, 
                      ano: S.form.ano,
                      orgao_origem: S.form.orgao_origem,
                      condutor: S.form.nome_condutor,  
                      rota: S.form.itinerario,
                      combustivel: S.form.combustivel, 
                      tipo: S.form.tipo || 'requisitado', 
                      cadastrado_por: S.profile.role,
                      municipio: S.form.municipio
                  })
              });
              if(!resV.ok) {
                  toast('Erro ao pré-cadastrar o veículo no banco de dados', 'err');
              }
          } catch(e) { 
              console.log('Modo offline - veículo salvo apenas localmente'); 
          }
      }
  }

  if(!valSec(S.formSec))return;
  S.formSec++;
  renderForm();
  window.scrollTo(0,0);
}
function prevSec(){syncForm();S.formSec--;renderForm();window.scrollTo(0,0)}

function saveToState(){
  const insp=DB.get('inspections')||[];
  const idx=insp.findIndex(i=>i.id===S.form.id);
  if(idx>=0)insp[idx]={...S.form};else insp.push({...S.form});
  DB.set('inspections',insp);
}
function saveDraft(){syncForm();S.form.status='rascunho';saveToState();toast('Rascunho salvo localmente!')}

async function syncVistoriaAPI(){
  syncForm();if(!valAll())return;
  S.form.status = S.formType === 'v2' ? 'retorno_completo' : 'saida_completa';
  
  const isV2 = S.formType === 'v2';
  let url = `${API_URL}/vistorias`;
  let method = 'POST';
  let payload = {};

  if(!isV2) {      
      const localEquips = DB.get('equipment') || [];
      const eqMap = {};
            
      localEquips.forEach((item, index) => {
          eqMap[item.key] = index + 1;
      });
      
      const checklist_api = [];
      
      for(let k in S.form.equipment) {
          if(eqMap[k] && S.form.equipment[k]) {
              let item_api = { id_equipamento: eqMap[k], presente: true };
                            
              if(k === 'calotas' && S.form.equipment['calotas_qtd']) {
                  item_api.quantidade = parseInt(S.form.equipment['calotas_qtd']) || 0;
              }
              
              checklist_api.push(item_api);
          }
      }
      
      payload = {
          placa_veiculo: S.form.placa,
          id_usuario_vistoriador: S.profile.id_usuario,
          data_vistoria: S.form.saida_data, 
          hr_saida: S.form.saida_horario,
          hodometro_inicial: parseInt(S.form.saida_hodometro) || 0,
          combustivel_inicial: S.form.saida_tanque,
          condutor: S.form.nome_condutor, 
          rota: S.form.itinerario,        
          checklist: checklist_api
      };
  } else {
          if(!S.form.db_id) {
              toast('Rascunho salvo offline (Vistoria 1 não sincronizada)', 'warn');
              saveToState(); vHome(); return;
          }
          url = `${API_URL}/vistorias/${S.form.db_id}/fechar`;
          method = 'PUT';
          payload = {
              hr_retorno: S.form.retorno_horario,
              hodometro_final: parseInt(S.form.retorno_hodometro) || 0,
              combustivel_final: S.form.retorno_tanque,
              avarias: S.form.avarias_obs || 'Sem avarias',
              id_usuario_fechamento: S.profile.id_usuario 
          };
      }

  // 1. Envia o núcleo da informação para o MySQL
  try {
      const res = await fetch(url, { method, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
      const data = await res.json();
      if(res.ok) {
          if(!isV2) S.form.db_id = data.id_vistoria; // Guarda a ID gerada no banco!
          toast('Integrado com sucesso no MySQL!', 'ok');
      } else {
          toast('Erro na integração: ' + data.erro, 'err');
      }
  } catch(e) { toast('Modo Offline: Salvo apenas localmente.', 'warn'); }

  // 2. Salva TODOS os detalhes visuais (Fotos, Assinaturas) localmente para gerar o PDF
  saveToState();
  vHome();
}

// ============================================================
// PDF e Visualização Histórica (Mantido 100%)
// ============================================================
function viewInsp(id){
  const insp=DB.get('inspections')||[];
  const i=insp.find(x=>x.id===id);if(!i)return;
  
  // Busca o veículo para garantir que temos o município
  const veicInfo = (DB.get('vehicles')||[]).find(x=>x.placa===i.placa);
  const munInfo = i.municipio || (veicInfo ? veicInfo.municipio : '—');
  
  const aeq=(DB.get('equipment')||[]).filter(e=>e.active);const ceq=aeq.filter(e=>i.equipment?.[e.key]);
  const mo=el('modal-ov');const mc=el('modal');
  mc.innerHTML='<div class="modal-h"><h3>VISTORIA — '+i.placa+'</h3><button class="modal-x" onclick="closeM()">×</button></div>'+
  '<div class="modal-b"><div class="pdf-pv" id="pdf-c">'+
  '<div class="pdf-hd"><div style="font-size:18px;font-weight:900;letter-spacing:2px">TERMO DE VISTORIA</div><div style="font-size:12px;margin-top:4px;opacity:.8">TRE-TO</div></div>'+
  '<div class="pdf-bd"><div class="pdf-s"><h4>Dados de Identificação</h4><div class="pdf-g"><div class="lb">Placa:</div><div class="vl" style="font-weight:800;font-family:var(--fm)">'+i.placa+'</div><div class="lb">Condutor:</div><div class="vl">'+(i.nome_condutor||'—')+'</div><div class="lb">Itinerário:</div><div class="vl">'+(i.itinerario||'—')+'</div><div class="lb">Município:</div><div class="vl">'+munInfo+'</div></div></div>'+
  '<div class="pdf-s"><h4>Assinaturas Salvas Localmente</h4><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px"><div style="text-align:center">'+(i.assinatura_motorista?'<img src="'+i.assinatura_motorista+'" style="width:100%;height:60px;object-fit:contain;border-bottom:1px solid #1e293b">':'')+'<div style="font-size:12px;font-weight:700;margin-top:4px">'+(i.nome_condutor||'Motorista')+'</div></div><div style="text-align:center">'+(i.assinatura_vistoriador?'<img src="'+i.assinatura_vistoriador+'" style="width:100%;height:60px;object-fit:contain;border-bottom:1px solid #1e293b">':'')+'<div style="font-size:12px;font-weight:700;margin-top:4px">'+(i.inspector_name||'Vistoriador')+'</div></div></div></div></div></div></div>'+
  '<div class="modal-f"><button class="btn btn-pri" onclick="dlPDF(\''+id+'\')" style="flex:1">📥 Baixar PDF Completo</button><button class="btn btn-out" onclick="closeM()" style="flex:1">Fechar</button></div>';
  mo.classList.add('show');
}
function closeM(){el('modal-ov').classList.remove('show')}

function dlPDF(id){
  const insp = DB.get('inspections') || [];
  const i = insp.find(x => x.id === id);
  if(!i){ toast('Não encontrado', 'err'); return; }
  
  const {jsPDF} = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  const w = 210, m = 15; 
  let y = 15;
  
  const addH = (title) => {
    doc.setFillColor(230, 230, 230); // Cinza claro
    doc.rect(m, y, w - m*2, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(title, m + 2, y + 4.5);
    y += 10;
  };
  
  const addTxt = (label, val, x1, x2) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(label, x1, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(val || '—'), x2, y);
  };

  // 1. Cabeçalho Principal 
  doc.setFont('helvetica', 'bold'); 
  doc.setFontSize(14);
  doc.text('TERMO DE VISTORIA DE VEÍCULO', w/2, y, {align: 'center'}); y += 6;
  
  doc.setFontSize(10);
  doc.text('TRE-TO Tribunal Regional Eleitoral do Tocantins', w/2, y, {align: 'center'}); y += 5;
  
  doc.setFont('helvetica', 'normal'); 
  doc.setFontSize(9);
  doc.text('Seção de Segurança e Transporte - COSEG/SADOR/TRE-TO', w/2, y, {align: 'center'}); y += 10;

  // 2. Vistoriador
  doc.setFont('helvetica', 'bold');
  doc.text('VISTORIADOR: ', m, y);
  doc.setFont('helvetica', 'normal');
  doc.text(i.inspector_name || '—', m + 28, y); y += 8;

  // 3. Dados de Identificação
  const veicInfo = (DB.get('vehicles') || []).find(x => x.placa === i.placa);
  const munInfo = i.municipio || (veicInfo ? veicInfo.municipio : '—');

  addH('DADOS DE IDENTIFICAÇÃO');
  addTxt('Placa:', i.placa, m, m + 12); 
  addTxt('Marca/Modelo:', i.marca_modelo, 80, 105); y += 6;
  
  addTxt('Ano:', i.ano, m, m + 10); 
  addTxt('Combustível:', i.combustivel, 80, 102); 
  addTxt('Tipo:', i.tipo, 140, 150); y += 6;
  
  addTxt('Condutor:', i.nome_condutor, m, m + 16); 
  addTxt('Itinerário:', i.itinerario, 80, 97); 
  addTxt('Município:', munInfo, 140, 160); y += 10;

  // 4. Acessórios e Equipamentos (Grade)
  addH('ACESSÓRIOS E EQUIPAMENTOS');
  const eqMap = DB.get('equipment') || [];
  let eqX = m, eqY = y;
  doc.setFontSize(9);
  
  eqMap.forEach((eq) => {
     if(!eq.active) return; 
     const isPresent = i.equipment && i.equipment[eq.key];
     let valStr = isPresent ? '[ X ]' : '[   ]';
          
     if(isPresent && eq.key === 'calotas' && i.equipment.calotas_qtd) {
         valStr = `[ X ] (${i.equipment.calotas_qtd})`;
     }
     
     doc.setFont('helvetica', isPresent ? 'bold' : 'normal');
     doc.text(`${valStr} ${eq.label}`, eqX, eqY);
     
     eqX += 45;
     if(eqX > 180) { eqX = m; eqY += 6; } // Quebra a linha a cada 4 itens
  });
  y = eqY + (eqX === m ? 4 : 10);

  // 5. Histórico (Tabela Comparativa)
  addH('HISTÓRICO');
  doc.setFont('helvetica', 'bold');
  doc.text('CHEGADA', 60, y); 
  doc.text('SAÍDA', 120, y); y += 6;
  
  // Checa se já tem dados de saída (se foi importado ou se é vistoria 2 fechada)
  const temSaida = !!(i.cloned_from || (i.retorno_data && i.retorno_data.trim() !== ''));
  
  // Função auxiliar para formatar data (YYYY-MM-DD para DD-MM-AAAA)
  const fmtDt = (d) => { 
     if(!d) return '—'; 
     const p = d.split('-'); 
     return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : d; 
  };

  doc.setFont('helvetica', 'bold');
  doc.text('Data:', m, y); doc.setFont('helvetica', 'normal');
  doc.text(fmtDt(i.saida_data), 60, y); 
  doc.text(temSaida ? fmtDt(i.retorno_data) : '—', 120, y); y += 6;
  
  doc.setFont('helvetica', 'bold');
  doc.text('Horário:', m, y); doc.setFont('helvetica', 'normal');
  doc.text(i.saida_horario || '—', 60, y); 
  doc.text(temSaida ? (i.retorno_horario || '—') : '—', 120, y); y += 6;
  
  doc.setFont('helvetica', 'bold');
  doc.text('Hodômetro:', m, y); doc.setFont('helvetica', 'normal');
  doc.text((i.saida_hodometro ? i.saida_hodometro + ' km' : '—'), 60, y); 
  doc.text(temSaida ? (i.retorno_hodometro ? i.retorno_hodometro + ' km' : '—') : '—', 120, y); y += 6;
  
  doc.setFont('helvetica', 'bold');
  doc.text('Pneus:', m, y); doc.setFont('helvetica', 'normal');
  doc.text(i.saida_pneus || '—', 60, y); 
  doc.text(temSaida ? (i.retorno_pneus || '—') : '—', 120, y); y += 6;
  
  doc.setFont('helvetica', 'bold');
  doc.text('Tanque:', m, y); doc.setFont('helvetica', 'normal');
  doc.text(i.saida_tanque || '—', 60, y); 
  doc.text(temSaida ? (i.retorno_tanque || '—') : '—', 120, y); y += 10;

  // Renderiza as fotos das Avarias no PDF
  let fotosAvariasTodas = [];
  if(i.avaria_photos) fotosAvariasTodas = fotosAvariasTodas.concat(i.avaria_photos.map(p => ({...p, legend: 'Chegada'})));
  if(i.avaria_photos_saida) fotosAvariasTodas = fotosAvariasTodas.concat(i.avaria_photos_saida.map(p => ({...p, legend: 'Saída'})));

  if(fotosAvariasTodas.length > 0) {
      if(y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(10); doc.setFont('helvetica', 'bold');
      doc.text('Fotos das Avarias:', m, y); y += 5;
      let px = m;
      fotosAvariasTodas.forEach(ph => {
          if(px > 150) { px = m; y += 45; } 
          if(y > 250) { doc.addPage(); y = 20; px = m; } 
          try { doc.addImage(ph.data, 'JPEG', px, y, 55, 40); } catch(e){}
          doc.setFontSize(8); doc.setFont('helvetica', 'normal');
          doc.text(ph.legend, px + 27, y + 43, {align: 'center'});
          px += 60;
      });
      y += 48;
  }

  // Renderiza o Registro Fotográfico Obrigatório
  let fotosGeraisTodas = [];
  if(i.photos) fotosGeraisTodas = fotosGeraisTodas.concat(i.photos.map(p => ({...p, legend: 'Chegada'})));
  if(i.photos_saida) fotosGeraisTodas = fotosGeraisTodas.concat(i.photos_saida.map(p => ({...p, legend: 'Saída'})));

  if(fotosGeraisTodas.length > 0) {
      if(y > 240) { doc.addPage(); y = 20; }
      addH('REGISTRO FOTOGRÁFICO');
      let px = m;
      fotosGeraisTodas.forEach(ph => {
          if(px > 150) { px = m; y += 45; }
          if(y > 250) { doc.addPage(); y = 20; px = m; }
          try { doc.addImage(ph.data, 'JPEG', px, y, 55, 40); } catch(e){}
          
          doc.setFontSize(8); doc.setFont('helvetica', 'normal');
          const angulo = ph.type.replace('ph_', '').toUpperCase().replace('_', ' ');
          doc.text(`${angulo} (${ph.legend})`, px + 27, y + 43, {align: 'center'});
          
          px += 60;
      });
      y += 48;
  }

  // 7. Assinaturas
  if(y > 230) { doc.addPage(); y = 20; } 
  addH('ASSINATURAS');
  y += 15;
  
  // --- Assinatura do Condutor ---
  if(i.assinatura_motorista) {
      try { doc.addImage(i.assinatura_motorista, 'PNG', m+10, y, 50, 20); } catch(e){}
  }
  doc.line(m+5, y+22, m+75, y+22);
  doc.setFont('helvetica', 'bold'); 
  doc.text(i.nome_condutor || 'Condutor', m+40, y+27, {align: 'center'});
  doc.setFont('helvetica', 'normal'); 
  doc.text('Recebedor do Veículo', m+40, y+32, {align: 'center'});

  // --- Assinatura do Vistoriador ---
  if(i.assinatura_vistoriador) {
      try { doc.addImage(i.assinatura_vistoriador, 'PNG', 110, y, 50, 20); } catch(e){}
  }
  doc.line(105, y+22, 175, y+22);
  doc.setFont('helvetica', 'bold'); 
  doc.text(i.inspector_name || 'Vistoriador', 140, y+27, {align: 'center'});
  doc.setFont('helvetica', 'normal'); 
  doc.text('Vistoriador', 140, y+32, {align: 'center'});

  // 8. Rodapé Oficial
  y += 45;
  doc.setFontSize(8);
  doc.text('Seção de Segurança e Transportes COSEG/SADOR/TRE-TO', w/2, y, {align: 'center'});

  // Gerar e Salvar Documento
  doc.save(`Vistoria_${i.placa}.pdf`);
  toast('PDF gerado e baixado!');
}

document.addEventListener('DOMContentLoaded',function(){
  el('login-btn').addEventListener('click',doLogin);
  el('inp-pass').addEventListener('keydown',function(e){if(e.key==='Enter')doLogin()});
  el('pw-tog').addEventListener('click',function(){const inp=el('inp-pass');if(inp.type==='password'){inp.type='text';this.textContent='🙈'}else{inp.type='password';this.textContent='👁️'}});
  el('g-logout').addEventListener('click',doLogout); el('v-logout').addEventListener('click',doLogout); el('v-back').addEventListener('click',vHome);
  qa('#g-nav .ni').forEach(b=>b.addEventListener('click',function(){setGTab(this.dataset.t)}));
  qa('#v-nav .ni').forEach(b=>b.addEventListener('click',function(){setVTab(this.dataset.t)}));
  el('photo-inp').addEventListener('change',function(){onPhotoFiles(this.files);this.value=''});
  el('modal-ov').addEventListener('click',function(e){if(e.target===this)closeM()});
  updYear();
});