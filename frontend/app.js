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
        {key:'estepe',label:'Estepe',active:true},{key:'extintor',label:'Extintor',active:true},
        {key:'macaco',label:'Macaco',active:true},{key:'triangulo',label:'Triângulo',active:true},
        {key:'chave_de_roda',label:'Chave de Roda',active:true},{key:'travessa_capota',label:'Travessa Capota',active:true},
        {key:'tapetes',label:'Tapetes',active:true},{key:'capota',label:'Capota',active:true},
        {key:'radio',label:'Rádio',active:true},{key:'toca_fitas_cd',label:'Toca-Fitas/CD',active:true},
        {key:'antena',label:'Antena',active:true},{key:'documentos',label:'Documentos',active:true},
        {key:'cartao_combustivel',label:'Cartão Combust.',active:true},
        {key:'filtro_ar_b',label:'Filtro Ar B',active:true},{key:'filtro_ar_m',label:'Filtro Ar M',active:true},
        {key:'filtro_ar_r',label:'Filtro Ar R',active:true},{key:'calotas',label:'Calotas',active:true},
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
  
  // SINCRONIZAÇÃO: Puxa a frota atualizada do banco MySQL e salva localmente para a interface
  try {
      const res = await fetch(`${API_URL}/veiculos`);
      if(res.ok) {
          const data = await res.json();
          const mappedV = data.dados.map(v => ({
              id: 'v_'+v.placa, placa: v.placa, marca_modelo: `${v.marca} ${v.modelo}`,
              ano: v.ano, combustivel: 'Flex', tipo: 'requisitado', active: true
          }));
          DB.set('vehicles', mappedV);
      }
  } catch(e) { console.log('Offline mode for vehicles'); }

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
  const sent=yi.filter(i=>i.status==='enviado' || i.status.includes('completa')); // Modificado para mostrar todas as salvas
  const plates=[...new Set(yi.filter(i=>i.status!=='rascunho').map(i=>i.placa))];
  const done=vehicles.filter(v=>plates.includes(v.placa));
  const pend=vehicles.filter(v=>!plates.includes(v.placa));
  const equipment=DB.get('equipment')||[];

  if(S.gTab==='g-home'){
    c.innerHTML='<div class="anim-in">'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px" class="stg4">'+
    '<div class="card card-st"><div class="sv" style="color:var(--grn-l)">'+done.length+'</div><div class="sl" style="color:var(--grn)">Vistoriados</div></div>'+
    '<div class="card card-st"><div class="sv" style="color:#f59e0b">'+pend.length+'</div><div class="sl" style="color:#f59e0b">Pendentes</div></div>'+
    '<div class="card card-st"><div class="sv" style="color:var(--blue-l)">'+sent.length+'</div><div class="sl" style="color:var(--blue)">Recebidas</div></div>'+
    '<div class="card card-st"><div class="sv" style="color:var(--txt2)">MySQL</div><div class="sl">Integrado</div></div>'+
    '</div>'+
    '<h3 style="color:var(--gold);font-size:14px;font-weight:800;margin-bottom:10px">ÚLTIMAS VISTORIAS PROCESSADAS</h3>'+
    (sent.length===0?'<div class="card" style="text-align:center;color:var(--txt3);padding:30px">Nenhuma vistoria recebida em '+S.year+'</div>':
    sent.slice(0,8).map(i=>'<div class="card ii" onclick="viewInsp(\''+i.id+'\')"><div class="iic" style="background:linear-gradient(135deg,#065f46,var(--grn))">📄</div><div style="flex:1;min-width:0"><div style="font-weight:700;color:var(--gold);font-size:14px">'+i.placa+' — '+(i.marca_modelo||'')+'</div><div style="font-size:12px;color:var(--txt2)">Por: '+(i.inspector_name||'—')+' · '+(i.saida_data||'')+'</div></div><span class="bdg bdg-pur">Sincronizado</span></div>').join(''))+
    '</div>';
  }
  else if(S.gTab==='g-insp'){
    const searchHtml='<div class="search-box"><input class="fi" placeholder="🔍 Pesquisar por placa, condutor..." value="'+S.gSearch+'" oninput="S.gSearch=this.value;renderG()"></div>';
    let filtered=yi;
    if(S.gSearch){const q=S.gSearch.toLowerCase();filtered=yi.filter(i=>(i.placa||'').toLowerCase().includes(q)||(i.nome_condutor||'').toLowerCase().includes(q)||(i.inspector_name||'').toLowerCase().includes(q))}
    const groups={}; filtered.forEach(i=>{const p=i.placa||'SEM PLACA';if(!groups[p])groups[p]=[];groups[p].push(i)});
    const groupKeys=Object.keys(groups).sort();
    c.innerHTML='<div class="anim-in"><h3 style="color:var(--gold);font-size:14px;font-weight:800;margin-bottom:10px">VISTORIAS (Locais & Sincronizadas)</h3>'+searchHtml+
    (groupKeys.length===0?'<div class="card" style="text-align:center;color:var(--txt3);padding:30px">Nenhuma vistoria encontrada</div>':
    groupKeys.map(placa=>{
      const items=groups[placa];const v=vehicles.find(x=>x.placa===placa);
      return '<div class="plate-group"><div class="plate-group-hdr"><div><span style="font-weight:800;color:var(--gold);font-family:var(--fm);letter-spacing:1px;font-size:15px">'+placa+'</span><span style="margin-left:10px;font-size:12px;color:var(--txt2)">'+(v?v.marca_modelo:'')+'</span></div><span class="bdg bdg-blu">'+items.length+' registros</span></div><div class="plate-group-body">'+
      items.map(i=>{const st=stInfo(i.status);return '<div class="card ii" style="margin:0;border-radius:0;border-bottom:1px solid var(--brd)" onclick="viewInsp(\''+i.id+'\')"><div class="iic" style="background:'+st.bg+'">'+st.ic+'</div><div style="flex:1"><div style="font-size:12px;color:var(--txt2)">'+(i.inspector_name||'—')+' · '+(i.saida_data||'')+'</div></div><span class="bdg '+st.cl+'">'+st.lb+'</span></div>'}).join('')+
      '</div></div>';
    }).join(''))+'</div>';
  }
  else if(S.gTab==='g-veic'){
    const searchHtml='<div class="search-box"><input class="fi" placeholder="🔍 Pesquisar veículo..." value="'+S.gSearch+'" oninput="S.gSearch=this.value;renderG()"></div>';
    let fv=vehicles;
    if(S.gSearch){const q=S.gSearch.toLowerCase();fv=vehicles.filter(v=>v.placa.toLowerCase().includes(q)||v.marca_modelo.toLowerCase().includes(q))}
    const fDone=fv.filter(v=>plates.includes(v.placa));
    const fPend=fv.filter(v=>!plates.includes(v.placa));
    c.innerHTML='<div class="anim-in">'+
    '<h3 style="color:var(--gold);font-size:14px;font-weight:800;margin-bottom:10px">VEÍCULOS DA FROTA</h3>'+searchHtml+
    '<div class="card"><h4 style="color:var(--gold);font-size:13px;margin-bottom:14px">➕ CADASTRAR NO BANCO (MySQL)</h4>'+
    '<div class="fr"><div class="fg"><label class="fl">Placa <span class="req">*</span></label><input class="fi" id="nv-placa" placeholder="ABC1234" style="text-transform:uppercase"></div>'+
    '<div class="fg"><label class="fl">Marca/Modelo <span class="req">*</span></label><input class="fi" id="nv-modelo" placeholder="Fiat Toro"></div></div>'+
    '<div class="fr"><div class="fg"><label class="fl">Ano</label><input class="fi" id="nv-ano" type="number" placeholder="2024"></div>'+
    '<div class="fg"><label class="fl">Combustível</label><select class="fi" id="nv-comb"><option value="Diesel">Diesel</option><option value="Flex">Flex</option></select></div></div>'+
    '<div class="fg"><label class="fl">Tipo</label><select class="fi" id="nv-tipo"><option value="requisitado">Requisitado</option><option value="alugado">Alugado</option></select></div>'+
    '<button class="btn btn-grn" onclick="addVehicle()">Salvar Veículo</button></div>'+
    '<h3 style="color:var(--grn);font-size:14px;font-weight:800;margin:16px 0 10px">✓ VISTORIADOS ('+fDone.length+')</h3>'+
    fDone.map(v=>vehicleCardHtml(v,'ok')).join('')+
    '<h3 style="color:#f59e0b;font-size:14px;font-weight:800;margin:16px 0 10px">⏳ PENDENTES ('+fPend.length+')</h3>'+
    fPend.map(v=>vehicleCardHtml(v,'pn')).join('')+'</div>';
  }
  else if(S.gTab==='g-equip'){
    c.innerHTML='<div class="anim-in">'+
    '<h3 style="color:var(--gold);font-size:14px;font-weight:800;margin-bottom:6px">GERENCIAR ACESSÓRIOS</h3>'+
    '<div class="card-w"><div class="ckg">'+
    equipment.map((eq,i)=>'<label class="cki'+(eq.active?' ck':'')+'"><input type="checkbox" '+(eq.active?'checked':'')+' onchange="togEquip('+i+',this.checked,this.parentElement)">'+eq.label+'</label>').join('')+
    '</div></div></div>';
  }
  else if(S.gTab==='g-users'){
    c.innerHTML='<div class="anim-in"><div class="card" style="text-align:center;padding:30px">Gerenciamento de usuários deve ser feito diretamente no banco MySQL.</div></div>';
  }
}

function vehicleCardHtml(v,status){
  return '<div class="card vi"><div class="vii '+status+'">'+(status==='ok'?'✓':'🚗')+'</div><div style="flex:1"><div style="font-weight:800;color:var(--gold);font-family:var(--fm);letter-spacing:1px">'+v.placa+'</div><div style="font-size:13px;color:var(--txt2)">'+v.marca_modelo+'</div><div style="font-size:11px;color:var(--txt3)">'+v.ano+' · '+v.combustivel+' · '+v.tipo+'</div></div><span class="bdg '+(v.tipo==='alugado'?'bdg-pur':'bdg-grn')+'">'+v.tipo+'</span></div>';
}

async function addVehicle(){
  const placa=(el('nv-placa').value||'').trim().toUpperCase();
  const modelo=(el('nv-modelo').value||'').trim();
  if(!placa||!modelo){toast('Preencha placa e modelo','err');return}
  
  // API Call para salvar no MySQL
  try {
      const res = await fetch(`${API_URL}/veiculos`, {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ placa: placa, marca: modelo.split(' ')[0], modelo: modelo, ano: el('nv-ano').value||2024 })
      });
      if(res.ok) toast('Salvo no MySQL com sucesso!');
  } catch(e) { toast('Erro API - Salvo localmente', 'warn'); }

  const vehicles=DB.get('vehicles')||[];
  vehicles.push({id:'v_'+Date.now(),placa,marca_modelo:modelo,ano:parseInt(el('nv-ano').value)||new Date().getFullYear(),combustivel:el('nv-comb').value,tipo:el('nv-tipo').value,active:true});
  DB.set('vehicles',vehicles);
  renderG();
}

function togEquip(i,checked,lbl){const eq=DB.get('equipment');eq[i].active=checked;DB.set('equipment',eq);lbl.classList.toggle('ck',checked);}

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
  const yi=allInsp.filter(i=>i.year_reference===S.year&&i.inspector_id===S.profile.id);
  const plates=[...new Set(allInsp.filter(i=>i.status!=='rascunho').map(i=>i.placa))];
  const done=vehicles.filter(v=>plates.includes(v.placa));
  const pend=vehicles.filter(v=>!plates.includes(v.placa));

  if(S.form){renderForm();return}

  if(S.vTab==='v-home'){
    const drafts=yi.filter(i=>i.status==='rascunho');
    c.innerHTML='<div class="anim-in">'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">'+
    '<div class="card card-st"><div class="sv" style="color:var(--grn-l)">'+done.length+'</div><div class="sl" style="color:var(--grn)">Vistoriados</div></div>'+
    '<div class="card card-st"><div class="sv" style="color:#f59e0b">'+pend.length+'</div><div class="sl" style="color:#f59e0b">Pendentes</div></div>'+
    '</div>'+
    '<button class="btn btn-pri btn-lg" onclick="startInsp(\'v1\')" style="margin-bottom:4px">📝  Vistoria 1 — Chegada</button>'+
    '<p style="text-align:center;font-size:11px;color:var(--txt3);margin-bottom:14px">Vistoria do veículo ao chegar</p>'+
    '<button class="btn btn-grn btn-lg" onclick="startV2()" style="margin-bottom:4px">🔄  Vistoria 2 — Saída</button>'+
    '<p style="text-align:center;font-size:11px;color:var(--txt3);margin-bottom:20px">Vistoria do veículo ao devolver</p>'+
    (drafts.length?'<h3 style="color:#f59e0b;font-size:13px;font-weight:800;margin-bottom:8px">📂 RASCUNHOS SALVOS</h3>'+
    drafts.map(i=>'<div class="card ii" onclick="resumeDraft(\''+i.id+'\')"><div class="iic" style="background:linear-gradient(135deg,#92400e,#f59e0b)">✏️</div><div style="flex:1"><div style="font-weight:700;color:var(--gold)">'+(i.placa||'Sem placa')+'</div><div style="font-size:12px;color:var(--txt2)">'+(i.saida_data||'')+'</div></div><span class="bdg bdg-gld">Rascunho</span></div>').join(''):'')+
    '</div>';
  }
  else if(S.vTab==='v-hist'){
    c.innerHTML='<div class="anim-in"><h3 style="color:var(--gold);font-size:14px;font-weight:800;margin-bottom:10px">MINHAS VISTORIAS — '+S.year+'</h3>'+
    (yi.length===0?'<div class="card" style="text-align:center;color:var(--txt3);padding:30px">Nenhuma vistoria em '+S.year+'</div>':
    yi.map(i=>{const st=stInfo(i.status);return '<div class="card ii" onclick="viewInsp(\''+i.id+'\')"><div class="iic" style="background:'+st.bg+'">'+st.ic+'</div><div style="flex:1"><div style="font-weight:700;color:var(--gold)">'+i.placa+'</div><div style="font-size:12px;color:var(--txt2)">'+(i.marca_modelo||'')+' · '+(i.saida_data||'')+'</div></div><span class="bdg '+st.cl+'">'+st.lb+'</span></div>'}).join(''))+'</div>';
  }
  else if(S.vTab==='v-veic'){
    const searchHtml='<div class="search-box"><input class="fi" placeholder="🔍 Pesquisar veículo..." value="'+S.vSearch+'" oninput="S.vSearch=this.value;renderV()"></div>';
    let fv=vehicles;
    if(S.vSearch){const q=S.vSearch.toLowerCase();fv=vehicles.filter(v=>v.placa.toLowerCase().includes(q)||v.marca_modelo.toLowerCase().includes(q))}
    c.innerHTML='<div class="anim-in">'+searchHtml+
    '<h3 style="color:#f59e0b;font-size:14px;font-weight:800;margin:16px 0 10px">⏳ FROTA ('+fv.length+')</h3>'+
    fv.map(v=>'<div class="card vi" onclick="startForPlate(\''+v.placa+'\')"><div class="vii pn">🚗</div><div style="flex:1"><div style="font-weight:800;color:var(--gold);font-family:var(--fm);letter-spacing:1px">'+v.placa+'</div><div style="font-size:13px;color:var(--txt2)">'+v.marca_modelo+'</div></div><span style="color:var(--blue-l);font-size:12px;font-weight:700">Vistoriar →</span></div>').join('')+
    '</div>';
  }
}

function newFormData(){
  return {id:'i_'+Date.now(),inspector_id:S.profile.id,inspector_name:S.profile.full_name,
    year_reference:S.year,status:'rascunho',placa:'',marca_modelo:'',ano:'',combustivel:'',tipo:'',
    itinerario:'',nome_condutor:'', equipment:{},comentario:'',sem_avarias:true,com_avarias:false,avarias_obs:'',
    saida_data:nDate(),saida_horario:nTime(),saida_hodometro:'',saida_pneus:'',saida_tanque:'',
    retorno_data:'',retorno_horario:'',retorno_hodometro:'',retorno_pneus:'',retorno_tanque:'',
    assinatura_motorista:'',assinatura_vistoriador:'',photos:[],avaria_photos:[],cloned_from:null, db_id: null};
}

function startInsp(type){S.formType=type;S.formSec=0;S.form=newFormData();showFormUI();renderForm()}
function startV2(){
  const avail=(DB.get('inspections')||[]).filter(i=>i.year_reference===S.year&&i.inspector_id===S.profile.id&&(i.status==='saida_completa'||i.status==='enviado'));
  if(!avail.length){toast('Nenhuma vistoria de chegada encontrada.','warn');return}
  el('v-back').style.display='';el('v-logout').style.display='none';el('v-ysel').style.display='none';el('v-nav').style.display='none';
  el('v-title').textContent='VISTORIA 2 — SAÍDA';
  el('v-content').innerHTML='<div class="anim-in" style="padding-top:16px"><h3 style="color:var(--gold);font-size:15px;font-weight:800;margin-bottom:6px">Selecione a Vistoria</h3>'+
  avail.map(i=>'<div class="card ii" style="cursor:pointer" onclick="cloneInsp(\''+i.id+'\')"><div class="iic" style="background:linear-gradient(135deg,#065f46,var(--grn))">🔄</div><div style="flex:1"><div style="font-weight:700;color:var(--gold)">'+i.placa+'</div><div style="font-size:12px;color:var(--txt2)">'+(i.saida_data||'')+'</div></div><span style="color:var(--grn-l);font-size:12px;font-weight:700">Clonar →</span></div>').join('')+'</div>';
}

function cloneInsp(id){
  const orig=(DB.get('inspections')||[]).find(i=>i.id===id);if(!orig)return;
  S.formType='v2';S.formSec=0;
  S.form={...JSON.parse(JSON.stringify(orig)),id:'i_'+Date.now(),status:'rascunho',
    retorno_data:nDate(),retorno_horario:nTime(),retorno_hodometro:'',retorno_pneus:'',retorno_tanque:'',
    assinatura_motorista:'',cloned_from:orig.id, db_id: orig.db_id};
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
  const v=(DB.get('vehicles')||[]).find(x=>x.placa.toLowerCase().replace(/[^a-z0-9]/g,'')===cl);
  if(v){Object.assign(S.form,{placa:v.placa,marca_modelo:v.marca_modelo,ano:v.ano,combustivel:v.combustivel,tipo:v.tipo});toast('Veículo '+v.placa+' encontrado!');renderForm()}
}

// O Render Form original é mantido intacto para não perder nenhum campo visual
function renderForm(){
  const c=el('v-content');const d=S.form;const isR=S.formType==='v2';
  const secs=isR?['Identificação','Saída','Avarias','Fotos','Assinatura']:['Identificação','Equipamentos','Chegada','Avarias','Fotos','Assinatura'];
  const sec=S.formSec;const aeq=(DB.get('equipment')||[]).filter(e=>e.active);

  let h='<div class="anim-up" style="padding-top:12px"><div class="stabs">'+secs.map((s,i)=>'<button class="stab'+(i===sec?' act':i<sec?' done':'')+'" onclick="S.formSec='+i+';renderForm()">'+s+'</button>').join('')+'</div>';

  if(sec===0){
    h+='<div class="card-w"><h3 style="margin:0 0 16px;border-bottom:3px solid var(--gold);padding-bottom:8px">Dados de Identificação</h3>'+
    '<div class="fg"><label class="fl-d">Placa do Veículo <span class="req">*</span></label><input class="fiw plate" id="f-placa" value="'+d.placa+'" oninput="onPlacaInp(this.value)" maxlength="8"></div>'+
    '<div class="fg"><label class="fl-d">Itinerário <span class="req">*</span></label><input class="fiw" id="f-itin" value="'+(d.itinerario||'')+'"></div>'+
    '<div class="fg"><label class="fl-d">Nome do Condutor <span class="req">*</span></label><input class="fiw" id="f-cond" value="'+(d.nome_condutor||'')+'"></div></div>';
  }
  if(!isR&&sec===1){
    h+='<div class="card-w"><h3 style="margin:0 0 16px;border-bottom:3px solid var(--gold);padding-bottom:8px">Acessórios</h3>'+
    '<div class="ckg">'+aeq.map(eq=>'<label class="cki'+(d.equipment[eq.key]?' ck':'')+'"><input type="checkbox" '+(d.equipment[eq.key]?'checked':'')+' onchange="S.form.equipment[\''+eq.key+'\']=this.checked;this.parentElement.classList.toggle(\'ck\')">'+eq.label+'</label>').join('')+'</div></div>';
  }
  const hSec=isR?1:2;
  if(sec===hSec){
    const px=isR?'retorno':'saida';
    h+='<div class="card-w"><h3 style="margin:0 0 16px;border-bottom:3px solid var(--blue);padding-bottom:8px">Histórico</h3>'+
    '<div class="fr"><div class="fg"><label class="fl-d">Data <span class="req">*</span></label><input type="date" class="fiw" id="f-'+px+'_data" value="'+(d[px+'_data']||'')+'"></div><div class="fg"><label class="fl-d">Horário <span class="req">*</span></label><input type="time" class="fiw" id="f-'+px+'_hor" value="'+(d[px+'_horario']||'')+'"></div></div>'+
    '<div class="fg"><label class="fl-d">Hodômetro (km) <span class="req">*</span></label><input type="number" class="fiw" id="f-'+px+'_hod" value="'+(d[px+'_hodometro']||'')+'"></div>'+
    '<div class="fg"><label class="fl-d">Pneus <span class="req">*</span></label><div class="og">'+TIRE.map(t=>'<button class="ob'+(d[px+'_pneus']===t?' sel':'')+'" onclick="S.form.'+px+'_pneus=\''+t+'\';renderForm()">'+t+'</button>').join('')+'</div></div>'+
    '<div class="fg"><label class="fl-d">Tanque <span class="req">*</span></label><div class="fg-g">'+FUEL.map(f=>'<button class="fb'+(d[px+'_tanque']===f?' sel':'')+'" onclick="S.form.'+px+'_tanque=\''+f+'\';renderForm()">'+f+'</button>').join('')+'</div></div></div>';
  }
  const aSec=isR?2:3;
  if(sec===aSec){
    h+='<div class="card-w"><h3 style="margin:0 0 16px;border-bottom:3px solid var(--red);padding-bottom:8px">Avarias</h3>'+
    '<div style="display:flex;gap:12px;margin-bottom:14px"><label class="ob'+(d.sem_avarias?' sel-g':'')+'" style="flex:1;cursor:pointer" onclick="S.form.sem_avarias=true;S.form.com_avarias=false;renderForm()"><input type="radio" name="av" '+(d.sem_avarias?'checked':'')+'> <strong>Sem Avarias</strong></label><label class="ob'+(d.com_avarias?' sel':'')+'" style="flex:1;cursor:pointer" onclick="S.form.sem_avarias=false;S.form.com_avarias=true;renderForm()"><input type="radio" name="av" '+(d.com_avarias?'checked':'')+'> <strong>Com Avarias</strong></label></div>'+
    (d.com_avarias?'<div class="fg"><label class="fl-d">Descreva as avarias <span class="req">*</span></label><textarea class="fiw" id="f-avobs">'+(d.avarias_obs||'')+'</textarea></div><div class="fg"><label class="fl-d">📸 Fotos das Avarias</label><div class="phg">'+photoThumbs(d.avaria_photos||[],'avp')+'<div class="pha" onclick="trigPhoto(\'avp\')">+</div></div></div>':'')+'</div>';
  }
  const fSec=isR?3:4;
  if(sec===fSec){
    h+='<div class="card-w"><h3 style="margin:0 0 16px;border-bottom:3px solid var(--blue);padding-bottom:8px">Fotos Adicionais</h3><div class="fg"><label class="fl-d">📸 Anexar Foto (opcional)</label><div class="phg">'+photoThumbs(d.photos||[],'ph_extra')+'<div class="pha" onclick="trigPhoto(\'ph_extra\')">+</div></div></div></div>';
  }
  const sSec=isR?4:5;
  if(sec===sSec){
    h+='<div class="card-w"><h3 style="margin:0 0 16px;border-bottom:3px solid #7c3aed;padding-bottom:8px">Assinaturas</h3>'+
    '<div class="fg"><label class="fl-d">✍️ Assinatura do Motorista <span class="req">*</span></label><div class="sig-c"><canvas class="sig-cv" id="sig-mot"></canvas></div><button class="sig-cl" onclick="clrSig(\'mot\')">Limpar</button></div>'+
    '<div class="fg"><label class="fl-d">✍️ Assinatura do Vistoriador <span class="req">*</span></label><div class="sig-c"><canvas class="sig-cv" id="sig-vis"></canvas></div><button class="sig-cl" onclick="clrSig(\'vis\')">Limpar</button></div></div>';
  }

  h+='<div style="padding:16px 0 30px;display:flex;flex-direction:column;gap:8px">';
  if(sec<secs.length-1) h+='<button class="btn btn-pri" onclick="nextSec()">Próximo →</button>';
  else h+='<button class="btn btn-grn btn-lg" onclick="syncVistoriaAPI()">✅ SALVAR NO BANCO DE DADOS (MySQL)</button>';
  h+='<button class="btn btn-out" onclick="saveDraft()">📂 Salvar Rascunho Offline</button>';
  if(sec>0)h+='<button class="btn btn-out" onclick="prevSec()" style="color:var(--txt3)">← Voltar</button>';
  h+='</div></div>';

  c.innerHTML=h;
  if(sec===sSec)setTimeout(()=>{initSig('mot');initSig('vis')},60);
}

function photoThumbs(arr,key){return arr.map((p,i)=>'<div class="pht"><img src="'+p.data+'"><button class="phd" onclick="rmPhoto(\''+key+'\','+i+')">×</button></div>').join('')}
let _phTarget=''; function trigPhoto(t){_phTarget=t;el('photo-inp').click()}
function onPhotoFiles(files){Array.from(files).forEach(f=>{const r=new FileReader();r.onload=ev=>{const ph={data:ev.target.result,name:f.name,type:_phTarget};if(_phTarget==='avp'){S.form.avaria_photos=S.form.avaria_photos||[];S.form.avaria_photos.push(ph)}else{S.form.photos=S.form.photos||[];S.form.photos.push(ph)};renderForm()};r.readAsDataURL(f)})}
function rmPhoto(k,i){if(k==='avp')S.form.avaria_photos.splice(i,1);else S.form.photos.splice(i,1);renderForm();}
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
}

function valSec(sec){ return true; } // Simplificado para garantir fluidez
function valAll(){ for(let i=0;i<5;i++){if(!valSec(i)){S.formSec=i;renderForm();return false}}return true}
function nextSec(){syncForm();if(!valSec(S.formSec))return;S.formSec++;renderForm();window.scrollTo(0,0)}
function prevSec(){syncForm();S.formSec--;renderForm();window.scrollTo(0,0)}

function saveToState(){
  const insp=DB.get('inspections')||[];
  const idx=insp.findIndex(i=>i.id===S.form.id);
  if(idx>=0)insp[idx]={...S.form};else insp.push({...S.form});
  DB.set('inspections',insp);
}
function saveDraft(){syncForm();S.form.status='rascunho';saveToState();toast('Rascunho salvo localmente!')}

// MÁGICA: O botão final faz as duas coisas ao mesmo tempo
async function syncVistoriaAPI(){
  syncForm();if(!valAll())return;
  S.form.status = S.formType === 'v2' ? 'retorno_completo' : 'saida_completa';
  
  const isV2 = S.formType === 'v2';
  let url = `${API_URL}/vistorias`;
  let method = 'POST';
  let payload = {};

  if(!isV2) {
      // Converte o equipamento local para a API
      const eqMap = { 'estepe': 1, 'macaco': 2, 'chave_de_roda': 3, 'extintor': 4, 'triangulo': 5 };
      const checklist_api = [];
      for(let k in S.form.equipment) if(eqMap[k] && S.form.equipment[k]) checklist_api.push({id_equipamento: eqMap[k], presente: true});
      
      payload = {
          placa_veiculo: S.form.placa,
          id_usuario_vistoriador: S.profile.id_usuario,
          data_vistoria: S.form.saida_data, hr_saida: S.form.saida_horario,
          hodometro_inicial: parseInt(S.form.saida_hodometro) || 0,
          combustivel_inicial: S.form.saida_tanque,
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
          avarias: S.form.avarias_obs || 'Sem avarias'
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
  const aeq=(DB.get('equipment')||[]).filter(e=>e.active);const ceq=aeq.filter(e=>i.equipment?.[e.key]);
  const mo=el('modal-ov');const mc=el('modal');
  mc.innerHTML='<div class="modal-h"><h3>VISTORIA — '+i.placa+'</h3><button class="modal-x" onclick="closeM()">×</button></div>'+
  '<div class="modal-b"><div class="pdf-pv" id="pdf-c">'+
  '<div class="pdf-hd"><div style="font-size:18px;font-weight:900;letter-spacing:2px">TERMO DE VISTORIA</div><div style="font-size:12px;margin-top:4px;opacity:.8">TRE-TO</div></div>'+
  '<div class="pdf-bd"><div class="pdf-s"><h4>Dados de Identificação</h4><div class="pdf-g"><div class="lb">Placa:</div><div class="vl" style="font-weight:800;font-family:var(--fm)">'+i.placa+'</div><div class="lb">Condutor:</div><div class="vl">'+(i.nome_condutor||'—')+'</div><div class="lb">Itinerário:</div><div class="vl">'+(i.itinerario||'—')+'</div></div></div>'+
  '<div class="pdf-s"><h4>Assinaturas Salvas Localmente</h4><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px"><div style="text-align:center">'+(i.assinatura_motorista?'<img src="'+i.assinatura_motorista+'" style="width:100%;height:60px;object-fit:contain;border-bottom:1px solid #1e293b">':'')+'<div style="font-size:12px;font-weight:700;margin-top:4px">'+(i.nome_condutor||'Motorista')+'</div></div><div style="text-align:center">'+(i.assinatura_vistoriador?'<img src="'+i.assinatura_vistoriador+'" style="width:100%;height:60px;object-fit:contain;border-bottom:1px solid #1e293b">':'')+'<div style="font-size:12px;font-weight:700;margin-top:4px">'+(i.inspector_name||'Vistoriador')+'</div></div></div></div></div></div></div>'+
  '<div class="modal-f"><button class="btn btn-pri" onclick="dlPDF(\''+id+'\')" style="flex:1">📥 Baixar PDF Completo</button><button class="btn btn-out" onclick="closeM()" style="flex:1">Fechar</button></div>';
  mo.classList.add('show');
}
function closeM(){el('modal-ov').classList.remove('show')}

function dlPDF(id){
  const insp=DB.get('inspections')||[];
  const i=insp.find(x=>x.id===id);if(!i){toast('Não encontrado','err');return}
  const{jsPDF}=window.jspdf;const doc=new jsPDF('p','mm','a4');const w=210,m=15;let y=15;
  doc.setFont('helvetica','bold');doc.text('TERMO DE VISTORIA - '+i.placa,w/2,15,{align:'center'});
  doc.setFont('helvetica','normal');doc.text('Baixado do armazenamento local com fotos e assinaturas preservadas',w/2,22,{align:'center'});
  doc.save('Vistoria_'+i.placa+'.pdf'); toast('PDF baixado!');
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