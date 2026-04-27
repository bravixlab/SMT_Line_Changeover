/* ===== APP SCRIPTS ===== */
// ============================================================
// supabase-config.js — Credenciais do Supabase
// ============================================================

const SUPABASE_URL      = 'https://vsgygpijfvodacrbzohb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzZ3lncGlqZnZvZGFjcmJ6b2hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMzg2MDUsImV4cCI6MjA4NzgxNDYwNX0.Y--tQngPeHR86RxEKESRahwIlhdxCAkH70YkvTUZ68E';

const _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 10 } }
});

_sb.from('rooms').select('count', { count: 'exact', head: true }).then(({ error }) => {
  if (error) console.error('❌ Supabase erro:', error.message);
  else console.log('✅ Supabase conectado!');
});

window.db = _sb;

// ============================================================
// js/utils.js — Utilitários globais
// ============================================================

/* ---------- Toast ----------------------------------------- */
function showToast(msg, type = 'info', duration = 3500) {
  const icons = { success:'✅', error:'❌', info:'ℹ️', warning:'⚠️' };
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = `toast ${type === 'error' ? 'error' : type === 'success' ? 'success' : 'info'}`;
  t.innerHTML = `<span>${icons[type] || icons.info}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transform='translateX(20px)'; t.style.transition='all 0.3s'; setTimeout(()=>t.remove(), 300); }, duration);
}

/* ---------- Modais ---------------------------------------- */
function openModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.add('open'); }
}
function closeModal(id) {
  const m = id ? document.getElementById(id) : document.querySelector('.modal-overlay.open');
  if (m) m.classList.remove('open');
}
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) closeModal();
});

/* ---------- Formatação ------------------------------------ */
function fmtMs(ms) {
  if (!ms || ms < 0) return '—';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m ${s % 60}s`;
}

// Formata ms mostrando sempre horas completas: "2h 15m 30s" ou "45m 20s"
function fmtMsLong(ms) {
  if (!ms || ms < 0) return '—';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day:'2-digit', month:'2-digit', year:'numeric',
    hour:'2-digit', minute:'2-digit'
  });
}

function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
}

/* ---------- Gerador de ID de sala ------------------------- */
const SAFE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function genRoomId(len = 4) {
  let id = '';
  for (let i = 0; i < len; i++) id += SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)];
  return id;
}

/* ---------- Cópia para clipboard -------------------------- */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(`ID "${text}" copiado!`, 'success');
  } catch {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showToast(`ID "${text}" copiado!`, 'success');
  }
}

/* ---------- Timer ----------------------------------------- */
class StopwatchTimer {
  constructor(onTick) {
    this._start = null;
    this._elapsed = 0;
    this._interval = null;
    this._onTick = onTick || (() => {});
  }
  start() {
    this._start = Date.now() - this._elapsed;
    this._interval = setInterval(() => {
      this._elapsed = Date.now() - this._start;
      this._onTick(this._elapsed);
    }, 500);
  }
  pause() {
    clearInterval(this._interval);
    this._interval = null;
    this._elapsed = Date.now() - this._start;
  }
  reset() {
    this.pause();
    this._elapsed = 0;
    this._start = null;
    this._onTick(0);
  }
  get elapsed() { return this._elapsed; }
  static format(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    return `${String(h).padStart(2,'0')}:${String(m%60).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  }
}

/* ---------- LocalStorage helpers -------------------------- */
const Store = {
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch{} },
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch{ return null; } },
  del(k) { try { localStorage.removeItem(k); } catch{} }
};
const Session = {
  set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch{} },
  get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch{ return null; } },
  del(k) { try { sessionStorage.removeItem(k); } catch{} }
};

/* ---------- Admin session --------------------------------- */
// Sessão da LIDERANÇA: localStorage com TTL 8h — persiste entre abas e dispositivos
const ADMIN_SESSION_KEY = 'co_admin';
const ADMIN_SESSION_TTL = 8 * 60 * 60 * 1000; // 8h

function saveAdminSession() {
  Store.set(ADMIN_SESSION_KEY, { ts: Date.now(), role: 'leader' });
}
function checkAdminSession() {
  const s = Store.get(ADMIN_SESSION_KEY);
  if (!s) return false;
  // Garante que é sessão de liderança (não operador)
  if (s.role && s.role !== 'leader') return false;
  return (Date.now() - s.ts) < ADMIN_SESSION_TTL;
}
function clearAdminSession() { Store.del(ADMIN_SESSION_KEY); }

/* ---------- Operator session ------------------------------ */
// Sessão do OPERADOR: sessionStorage (por aba) + localStorage para retomada
// O operador NUNCA tem acesso ao dashboard admin
const OP_ROOM_KEY   = 'co_op_room';
const OP_RESUME_KEY = 'co_op_resume'; // para retomada em outro dispositivo (só room + matricula)

function saveOpRoom(room) {
  Session.set(OP_ROOM_KEY, room);
  // Salva também no localStorage para retomada em outro dispositivo
  // mas com role=operator para impedir acesso ao admin
  Store.set(OP_RESUME_KEY, {
    room_code: room?.room_code || '',
    matricula: Store.get('op_matricula') || '',
    role: 'operator',
    ts: Date.now()
  });
}
function getOpRoom() {
  // Primeiro tenta sessionStorage (aba atual)
  const fromSession = Session.get(OP_ROOM_KEY);
  if (fromSession) return fromSession;
  return null; // Não restaura auto do localStorage — operador precisa logar de novo
}
function clearOpRoom() {
  Session.del(OP_ROOM_KEY);
  Store.del(OP_RESUME_KEY);
}

// Verifica se o usuário atual é operador (impede acesso ao admin)
function isOperatorSession() {
  const resume = Store.get(OP_RESUME_KEY);
  return resume?.role === 'operator';
}

/* ---------- Changeover state ------------------------------ */
const CO_STATE_KEY = 'co_state';
function saveCoState(s) { Store.set(CO_STATE_KEY, s); }
function getCoState()   { return Store.get(CO_STATE_KEY); }
function clearCoState() { Store.del(CO_STATE_KEY); }

/* ---------- Formata ms no padrão HH:MM:SS (para gráficos) -- */
function fmtHHMMSS(ms) {
  if (!ms || ms < 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

/* ---------- Formata minutos decimais no padrão HH:MM:SS ---- */
function fmtMinToHHMMSS(minutes) {
  if (!minutes || minutes < 0) return '00:00:00';
  const totalSec = Math.round(minutes * 60);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// admin.js v5.0 — Dashboard Avançado + Matriz + Filtros Data

let adminRooms    = [];
let chartMain     = null;
let chartMachine  = null;
let chartModel    = null;
let chartTrend    = null;
let realtimeSub   = null;
let pendingRoomId = '';
let _trendDays    = 7;
let _allSessions  = [];

// Targets por estação (minutos) — ajustável
const STATION_TARGETS = {
  'Printer':                       10,
  'SPI':                           8,
  'Desalimentação Pick & Place':   12,
  'Alimentação Pick & Place':      12,
  'Reflow':                        8,
  'AOI':                           15,
  'Router':                        6,
  'Ajuste de Linha':               20,
  'Validação nos Testes':          20,
  'Qualidade':                     10,
  'Wave Solder':                   5,
  'Check de Ferramental':          15
};

const STATION_ORDER = Object.keys(STATION_TARGETS);

/* ============================================================
   INIT
============================================================ */
async function initAdmin() {
  pendingRoomId = genRoomId();
  renderNewRoomId();
  setupMobileMenu();
  setupFilter();
  // Popula data padrão: hoje
  const today = new Date().toISOString().slice(0,10);
  const from  = document.getElementById('filter-date-from');
  const to    = document.getElementById('filter-date-to');
  if (from && !from.value) {
    // padrão: últimos 30 dias
    const d30 = new Date(); d30.setDate(d30.getDate()-30);
    from.value = d30.toISOString().slice(0,10);
  }
  if (to && !to.value) to.value = today;

  await Promise.all([loadAdminStats(), loadAdminRooms(), loadRecentSessions()]);
  subscribeRealtime();
}

/* ============================================================
   MOBILE MENU
============================================================ */
function setupMobileMenu() {
  const btn = document.getElementById('btn-hamburger');
  const sb  = document.getElementById('sidebar');
  const ov  = document.getElementById('sidebar-overlay');
  if (!btn || !sb || !ov) return;
  const newBtn = btn.cloneNode(true); btn.parentNode.replaceChild(newBtn, btn);
  const newOv  = ov.cloneNode(true);  ov.parentNode.replaceChild(newOv, ov);
  newBtn.addEventListener('click', () => { sb.classList.toggle('open'); newOv.classList.toggle('open'); });
  newOv.addEventListener('click',  () => { sb.classList.remove('open'); newOv.classList.remove('open'); });
}

/* ============================================================
   FILTRO GLOBAL
============================================================ */
function setupFilter() {
  const sel = document.getElementById('filter-room-global');
  if (!sel) return;
  const newSel = sel.cloneNode(true);
  sel.parentNode.replaceChild(newSel, sel);
  newSel.addEventListener('change', applyGlobalFilters);
}

function applyGlobalFilters() {
  const active = document.querySelector('.section.active');
  if (active?.id === 'sec-records') loadRecords();
  else loadAdminStats();
}

function clearDashDateFilter() {
  const f = document.getElementById('dash-date-from');
  const t = document.getElementById('dash-date-to');
  if (f) f.value = '';
  if (t) t.value = '';
  loadAdminStats();
}
function setDashDateToday() {
  const d = new Date().toISOString().slice(0,10);
  const f = document.getElementById('dash-date-from');
  const t = document.getElementById('dash-date-to');
  if (f) f.value = d;
  if (t) t.value = d;
  loadAdminStats();
}
function setDashDate7d() {
  const to   = new Date(); to.setHours(23,59,59);
  const from = new Date(); from.setDate(from.getDate() - 6); from.setHours(0,0,0,0);
  const f = document.getElementById('dash-date-from');
  const t = document.getElementById('dash-date-to');
  if (f) f.value = from.toISOString().slice(0,10);
  if (t) t.value = to.toISOString().slice(0,10);
  loadAdminStats();
}
function setDashDate30d() {
  const to   = new Date(); to.setHours(23,59,59);
  const from = new Date(); from.setDate(from.getDate() - 29); from.setHours(0,0,0,0);
  const f = document.getElementById('dash-date-from');
  const t = document.getElementById('dash-date-to');
  if (f) f.value = from.toISOString().slice(0,10);
  if (t) t.value = to.toISOString().slice(0,10);
  loadAdminStats();
}

// Popula o filtro de modelos na topbar com base nas sessões carregadas
function populateModelFilter(sessions) {
  const sel = document.getElementById('filter-model-global');
  if (!sel) return;
  const current = sel.value;
  const models = [...new Set((sessions || _allSessions || [])
    .map(s => s.product || s.rooms?.sku).filter(Boolean))].sort();
  sel.innerHTML = '<option value="">Todos os modelos</option>' +
    models.map(m => `<option value="${m}" ${m===current?'selected':''}>${m}</option>`).join('');
}

/* ============================================================
   NAVEGAÇÃO
============================================================ */
function navTo(sec) {
  document.querySelectorAll('.nav-item').forEach(el =>
    el.classList.toggle('active', el.dataset.sec === sec));
  document.querySelectorAll('.section').forEach(el =>
    el.classList.toggle('active', el.id === 'sec-' + sec));
  // Sincroniza mobile bottom nav
  document.querySelectorAll('.mbn-item').forEach(el =>
    el.classList.toggle('active', el.dataset.sec === sec));

  const titles = { dashboard:'Dashboard', rooms:'Linhas SMT', records:'Registros',
                   alerts:'Alertas', compare:'Comparação de Modelos', matriz:'Matriz CO',
                   settings:'Configurações' };
  const tEl = document.getElementById('topbar-title');
  if (tEl) tEl.textContent = titles[sec] || '';

  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('open');

  if (sec === 'dashboard') { loadAdminStats(); loadRecentSessions(); }
  if (sec === 'rooms')     loadAdminRooms();
  if (sec === 'records')   { populateRecordFilters(); loadRecords(); }
  if (sec === 'alerts')    loadAlerts();
  if (sec === 'compare')   initCompare();
  if (sec === 'matriz')    initMatriz();
  if (sec === 'settings')  loadSettings();
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ============================================================
   LOAD STATS — hub principal
============================================================ */
async function loadAdminStats() {
  const roomFilter  = document.getElementById('filter-room-global')?.value  || '';
  const modelFilter = document.getElementById('filter-model-global')?.value || '';
  const dateFrom    = document.getElementById('dash-date-from')?.value || '';
  const dateTo      = document.getElementById('dash-date-to')?.value   || '';
  const today = new Date(); today.setHours(0,0,0,0);

  try {
    let q = db.from('changeover_sessions')
      .select('*,rooms(name,room_code,alert_limit_minutes)');
    if (roomFilter)  q = q.eq('room_id', roomFilter);
    if (modelFilter) q = q.eq('product', modelFilter);
    if (dateFrom) q = q.gte('created_at', new Date(dateFrom + 'T00:00:00').toISOString());
    if (dateTo)   q = q.lte('created_at', new Date(dateTo   + 'T23:59:59').toISOString());
    const { data: sessions, error } = await q;
    if (error) { console.warn('[stats]', error); return; }

    _allSessions = sessions || [];
    populateModelFilter(_allSessions);
    const completed = _allSessions.filter(s => s.status === 'completed' && s.total_duration_ms);
    const active    = _allSessions.filter(s => s.status === 'in_progress');
    const todaySess = _allSessions.filter(s => new Date(s.created_at) >= today);

    const overLimit = completed.filter(s => {
      const limMs = (s.rooms?.alert_limit_minutes || 300) * 60000;
      return s.total_duration_ms > limMs;
    });
    const alertSess = active.filter(s => {
      const limMs = (s.rooms?.alert_limit_minutes || 300) * 60000;
      return (Date.now() - new Date(s.start_time).getTime()) > limMs;
    });

    // Changeoveres hoje = rooms únicas com sessão hoje (1 por ID/linha)
    const todayUniqueRooms = new Set(todaySess.map(s => s.room_id).filter(Boolean));
    setText('stat-today', todayUniqueRooms.size || '0');
    setText('stat-active', active.length || '0');
    const avgMs = completed.length
      ? completed.reduce((a,s) => a + s.total_duration_ms, 0) / completed.length : 0;
    setText('stat-avg', avgMs > 0 ? fmtHHMMSS(avgMs) : '—');
    setText('stat-alerts', alertSess.length || '0');

    // Tempo total de machine_times
    await loadTotalMachineTime(completed.map(s => s.id));

    // Conformidade
    const conformPct = completed.length
      ? Math.round(((completed.length - overLimit.length) / completed.length) * 100) : null;
    const conformEl = document.getElementById('stat-conform');
    if (conformEl) {
      conformEl.textContent = conformPct != null ? conformPct + '%' : '—';
      conformEl.style.color = conformPct >= 80 ? '#22c55e' : conformPct >= 60 ? '#fb923c' : '#ef4444';
    }

    // Alerts badge (sidebar + mobile nav)
    const nb = document.getElementById('nav-alerts-badge');
    if (nb) { nb.textContent = alertSess.length || ''; nb.style.display = alertSess.length ? '' : 'none'; }
    const mbnb = document.getElementById('mbn-alerts-badge');
    if (mbnb) { mbnb.textContent = alertSess.length || ''; mbnb.style.display = alertSess.length ? '' : 'none'; }

    // Lead Time
    calcLeadTime(_allSessions);

    // Gráficos
    loadChartMain(_allSessions);
    loadChartModel(_allSessions);
    loadTrendChart(_trendDays);
    loadTechTable(completed);
    loadMachineData(completed.map(s => s.id));
    updateStatSubLabels();
    // Atualiza painel de sessões ativas no dashboard
    renderActiveSessions(active);

  } catch(e) { console.warn('[loadAdminStats]', e); }
}

/* ============================================================
   TEMPO TOTAL (machine_times)
============================================================ */
async function loadTotalMachineTime(sessionIds) {
  if (!sessionIds.length) { setText('stat-total-accum','—'); return; }
  try {
    const { data, error } = await db.from('machine_times')
      .select('duration_ms').in('session_id', sessionIds.slice(0,200));
    if (!error && data) {
      const total = data.reduce((a,m) => a + (m.duration_ms||0), 0);
      setText('stat-total-accum', total > 0 ? fmtHHMMSS(total) : '—');
    }
  } catch(e) { console.warn('[totalMachine]', e); }
}

/* ============================================================
   HELPER: meta da linha em ms
============================================================ */
function getMetaMs() {
  const sel    = document.getElementById('filter-room-global');
  const roomId = sel?.value || '';
  if (roomId) {
    const room = adminRooms.find(r => r.id === roomId);
    if (room?.alert_limit_minutes) return room.alert_limit_minutes * 60000;
  }
  if (adminRooms.length) {
    const avg = adminRooms.reduce((a,r) => a + (r.alert_limit_minutes || 300), 0) / adminRooms.length;
    return Math.round(avg) * 60000;
  }
  return 5 * 60 * 60000;
}

/* ============================================================
   KPI PERFORMANCE REAL — Fórmula: (Real ÷ Meta) × 100
   < 100% = melhor que a meta | > 100% = acima da meta (problema)
============================================================ */
function calcPerformanceKPI(avgMs, metaMs, count, partialCount, completeCount) {
  const perfEl  = document.getElementById('stat-performance');
  const badgeEl = document.getElementById('perf-badge');
  const labelEl = document.getElementById('perf-label');
  const cardEl  = document.getElementById('kpi-perf-card');
  if (!avgMs || !perfEl) return;

  const metaMin = Math.round(metaMs / 60000);
  // FÓRMULA CORRETA: quanto do tempo permitido foi utilizado
  const pct = Math.round((avgMs / metaMs) * 100);
  perfEl.textContent = pct + '%';

  let color, bg, text;
  if      (pct < 85)  { color='#22c55e'; bg='rgba(34,197,94,0.2)';  text='🟢 Excelente'; }
  else if (pct <= 100) { color='#fb923c'; bg='rgba(251,146,60,0.2)'; text='🟡 Na Meta'; }
  else                { color='#ef4444'; bg='rgba(239,68,68,0.2)';  text='🔴 Acima da Meta'; }

  perfEl.style.color = color;
  if (badgeEl) { badgeEl.textContent = text; badgeEl.style.background = bg; badgeEl.style.color = color; }

  const h = Math.floor(metaMin/60), m = metaMin%60;
  const metaStr = h > 0 ? `${h}h${m?m+'m':''}` : `${m}m`;
  let sub = `Real: ${fmtHHMMSS(avgMs)} · Meta: ${metaStr}`;
  if (partialCount > 0) sub += ` · ⚠️ ${partialCount} parcial${partialCount>1?'is':''}`;
  if (completeCount !== undefined) sub += ` (${completeCount} completa${completeCount!==1?'s':''})`;
  if (labelEl) labelEl.textContent = sub;
  if (cardEl)  cardEl.style.borderColor = color.replace(')',',0.5)').replace('rgb','rgba');
}

/* ============================================================
   MACHINE DATA → Gargalo + Gráfico + Performance KPI + Matriz
============================================================ */
async function loadMachineData(sessionIds) {
  let machineTimes = [];
  if (sessionIds.length > 0) {
    try {
      const { data } = await db.from('machine_times')
        .select('machine_name,duration_ms,session_id')
        .in('session_id', sessionIds.slice(0,200));
      if (data) machineTimes = data;
    } catch(e) { console.warn('[machineData]', e); }
  }

  // Agrupa por máquina
  const byMachine = {};
  STATION_ORDER.forEach(n => { byMachine[n] = []; });
  machineTimes.forEach(mt => {
    if (byMachine[mt.machine_name] !== undefined)
      byMachine[mt.machine_name].push(mt.duration_ms || 0);
  });

  // avgMin por estação
  const avgMin = STATION_ORDER.map(n => {
    const times = byMachine[n];
    if (!times.length) return 0;
    return Math.round(times.reduce((a,b)=>a+b,0) / times.length / 60000 * 100) / 100;
  });
  const totalAvg = avgMin.reduce((a,b) => a+b, 0);

  // Gargalo
  let maxIdx = 0, maxVal = 0;
  avgMin.forEach((v,i) => { if (v > maxVal) { maxVal = v; maxIdx = i; } });
  const pctGargalo = totalAvg > 0 ? Math.round((avgMin[maxIdx] / totalAvg) * 100) : 0;
  setText('stat-gargalo-name', maxVal > 0 ? STATION_ORDER[maxIdx] : '—');
  setText('stat-gargalo-pct',  maxVal > 0
    ? `${fmtMinToHHMMSS(avgMin[maxIdx])} · ${pctGargalo}% do tempo total` : 'Sem dados');

  // Performance Real — usa total_duration_ms das sessões (Lead Time real: fim − início)
  // Representa o tempo TOTAL do changeover no relógio, não apenas tempo ativo nas estações
  {
    const completed = _allSessions.filter(s => s.status === 'completed' && s.total_duration_ms);
    const partial   = _allSessions.filter(s => s.status === 'in_progress');
    const base      = completed.length > 0 ? completed : _allSessions.filter(s => s.total_duration_ms);
    if (base.length > 0) {
      const realAvgMs = base.reduce((a,s) => a + (s.total_duration_ms||0), 0) / base.length;
      calcPerformanceKPI(realAvgMs, getMetaMs(), base.length, partial.length, completed.length);
    }
  }

  // Gráfico atividades
  const SHORT = ['Printer','SPI','Desalim.\nP&P','Alim.\nP&P','Reflow','AOI','Router',
                 'Ajuste\nLinha','Valid.\nTestes','Qualidade','Wave\nSolder','Ferramental'];
  loadChartMachineData(avgMin, SHORT, STATION_ORDER, totalAvg);

  // Matriz (na seção records)
  buildMatrixTable(byMachine, avgMin);
}

/* ============================================================
   GRÁFICO: LINHA VS LIMITE — tipo linha + pontos com HH:MM:SS
============================================================ */
function loadChartMain(sessions) {
  const byRoom = {};
  sessions.forEach(s => {
    if (!s.total_duration_ms) return;
    const name = s.rooms?.name || 'Desconhecida';
    const lim  = s.rooms?.alert_limit_minutes || 300;
    if (!byRoom[name]) byRoom[name] = { ms:[], lim };
    byRoom[name].ms.push(s.total_duration_ms);
  });

  const labels   = Object.keys(byRoom).slice(0,10);
  const avgMs    = labels.map(l => Math.round(byRoom[l].ms.reduce((a,b)=>a+b,0) / byRoom[l].ms.length));
  const limMs    = labels.map(l => byRoom[l].lim * 60000);

  const ctx = document.getElementById('chart-main')?.getContext('2d');
  if (!ctx) return;
  if (chartMain) chartMain.destroy();

  // Plugin: mostra HH:MM:SS em cima de cada ponto da linha real
  const labelPlugin = {
    id: 'lineLabels',
    afterDatasetsDraw(chart) {
      const ds0 = chart.getDatasetMeta(0); // barras
      const { ctx } = chart;
      ctx.save();
      ds0.data.forEach((bar, i) => {
        const val = avgMs[i];
        if (!val) return;
        ctx.fillStyle   = '#ffffff';
        ctx.font        = 'bold 10px Arial';
        ctx.textAlign   = 'center';
        ctx.fillText(fmtHHMMSS(val), bar.x, bar.y - 6);
      });
      ctx.restore();
    }
  };

  chartMain = new Chart(ctx, {
    type:'bar',
    plugins:[labelPlugin],
    data:{
      labels,
      datasets:[
        { label:'Média real', data: avgMs,
          backgroundColor:'rgba(0,212,255,0.35)', borderColor:'rgba(0,212,255,1)',
          borderWidth:2, borderRadius:5 },
        { label:'Limite', data: limMs, type:'line',
          borderColor:'rgba(255,80,80,1)', borderWidth:2, borderDash:[6,3],
          pointRadius:5, pointBackgroundColor:'rgba(255,80,80,1)', fill:false }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      layout:{ padding:{ top:16, right:12, bottom:8, left:8 } },
      plugins:{
        legend:{ display:false },
        title:{ display:false },
        tooltip:{ callbacks:{
          label: c => {
            const ms = c.raw;
            return c.dataset.label + ': ' + fmtHHMMSS(ms);
          }
        }}
      },
      scales:{
        x:{ grid:{color:'rgba(255,255,255,0.05)'}, ticks:{color:'#d0dff0',font:{size:11}} },
        y:{ beginAtZero:true, grid:{color:'rgba(255,255,255,0.05)'},
          ticks:{ color:'#d0dff0', font:{size:10}, callback: v => fmtHHMMSS(v) },
          title:{display:true,text:'HH:MM:SS',color:'rgba(255,255,255,0.5)',font:{size:9}} }
      }
    }
  });
}

/* ============================================================
   GRÁFICO: ATIVIDADE SMT — HH:MM:SS + gargalo destacado
============================================================ */
function loadChartMachineData(avgMin, shortLabels, fullLabels, totalAvg) {
  const PALETTE = [
    'rgba(0,212,255,0.85)','rgba(99,102,241,0.85)','rgba(34,197,94,0.85)',
    'rgba(251,146,60,0.85)','rgba(239,68,68,0.85)','rgba(168,85,247,0.85)',
    'rgba(20,184,166,0.85)','rgba(251,191,36,0.85)','rgba(236,72,153,0.85)',
    'rgba(14,165,233,0.85)','rgba(132,204,22,0.85)','rgba(244,114,182,0.85)'
  ];
  const maxVal     = Math.max(...avgMin);
  const borderColors = avgMin.map((v,i) => v===maxVal && v>0 ? 'rgba(255,80,80,1)' : PALETTE[i].replace('0.85','1'));
  const borderWidths = avgMin.map(v => v===maxVal && v>0 ? 3 : 1);
  // Converte min → ms para display
  const avgMs = avgMin.map(v => Math.round(v * 60000));
  // Targets em ms
  const targetMs = fullLabels.map(n => (STATION_TARGETS[n] || 10) * 60000);

  const datalabelPlugin = {
    id:'datalabels2',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      ctx.save();
      chart.getDatasetMeta(0).data.forEach((bar, i) => {
        if (!avgMin[i]) return;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(fmtMinToHHMMSS(avgMin[i]), bar.x, bar.y - 5);
      });
      ctx.restore();
    }
  };

  const ctx = document.getElementById('chart-machine')?.getContext('2d');
  if (!ctx) return;
  if (chartMachine) chartMachine.destroy();

  chartMachine = new Chart(ctx, {
    type:'bar',
    plugins:[datalabelPlugin],
    data:{
      labels: shortLabels,
      datasets:[
        { label:'Tempo real', data:avgMs,
          backgroundColor:PALETTE, borderColor:borderColors,
          borderWidth:borderWidths, borderRadius:4, minBarLength:2 }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      layout:{ padding:{ top:28, right:16, bottom:8, left:8 } },
      plugins:{
        legend:{ display:false },
        title:{ display:false },
        tooltip:{ callbacks:{
          title: items => fullLabels[items[0].dataIndex],
          label: c => {
            const ms = c.raw;
            const pct = totalAvg > 0 ? Math.round((avgMin[c.dataIndex]/totalAvg)*100) : 0;
            return [`Real: ${fmtHHMMSS(ms)}`, `% do total: ${pct}%`];
          }
        }}
      },
      scales:{
        x:{ grid:{color:'rgba(255,255,255,0.04)'},
          ticks:{color:'#d0dff0',font:{size:9},maxRotation:35,minRotation:25} },
        y:{ beginAtZero:true, grid:{color:'rgba(255,255,255,0.04)'},
          ticks:{ color:'#d0dff0', font:{size:9}, callback: v => fmtHHMMSS(v) },
          title:{display:true,text:'HH:MM:SS',color:'rgba(255,255,255,0.4)',font:{size:9}} }
      }
    }
  });
}

/* ============================================================
   GRÁFICO: MODELOS — usa product (= SKU da room) da sessão
============================================================ */
function loadChartModel(sessions) {
  const counts = {};
  sessions.forEach(s => {
    // product já é preenchido com room.sku pelo operator ao criar sessão
    const label = s.product || s.rooms?.sku || null;
    if (label) counts[label] = (counts[label]||0)+1;
  });
  const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const COLORS = ['rgba(0,212,255,0.85)','rgba(251,146,60,0.85)','rgba(34,197,94,0.85)',
    'rgba(168,85,247,0.85)','rgba(236,72,153,0.85)','rgba(20,184,166,0.85)',
    'rgba(251,191,36,0.85)','rgba(239,68,68,0.85)'];
  const ctx = document.getElementById('chart-model')?.getContext('2d');
  if (!ctx) return;
  if (chartModel) chartModel.destroy();
  if (!sorted.length) {
    chartModel = new Chart(ctx, {
      type:'doughnut', data:{ labels:['Sem dados'], datasets:[{ data:[1], backgroundColor:['rgba(255,255,255,0.1)'] }] },
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{labels:{color:'#ffffff'}}, title:{display:true,text:'Modelos / Produtos',color:'#ffffff'} } }
    }); return;
  }
  chartModel = new Chart(ctx, {
    type:'doughnut',
    data:{
      labels:sorted.map(x => x[0].length>14 ? x[0].slice(0,14)+'…' : x[0]),
      datasets:[{ data:sorted.map(x=>x[1]), backgroundColor:COLORS, borderWidth:2, borderColor:'rgba(0,0,0,0.3)' }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{ position:'right', labels:{color:'#ffffff',font:{size:11},boxWidth:14,padding:8} },
        title:{ display:true, text:'Modelos / Produtos (SKU)', color:'#ffffff', font:{size:13,weight:'bold'} },
        tooltip:{ callbacks:{ label: c => {
          const tot = c.dataset.data.reduce((a,b)=>a+(b||0),0);
          return `${c.label}: ${c.raw} CO (${Math.round(c.raw/tot*100)}%)`;
        }}}
      }
    }
  });
}

/* ============================================================
   GRÁFICO: TENDÊNCIA 7/30 dias — HH:MM:SS nos eixos
============================================================ */
function setTrendPeriod(days) {
  _trendDays = days;
  ['7','30'].forEach(d => {
    const b = document.getElementById('btn-trend-'+d);
    if (b) { b.style.background = d==days ? 'rgba(0,212,255,0.2)' : '';
             b.style.borderColor = d==days ? 'rgba(0,212,255,0.5)' : ''; }
  });
  loadTrendChart(days);
}

function loadTrendChart(days) {
  const ctx = document.getElementById('chart-trend')?.getContext('2d');
  if (!ctx) return;

  const completed = _allSessions.filter(s => s.status==='completed' && s.total_duration_ms);
  const now = Date.now();
  const cutoff = now - days * 24 * 3600000;
  const recent = completed.filter(s => new Date(s.end_time || s.created_at).getTime() > cutoff);

  const byDay = {};
  for (let i=days-1; i>=0; i--) {
    const d = new Date(now - i*24*3600000);
    byDay[d.toLocaleDateString('pt-BR',{month:'2-digit',day:'2-digit'})] = [];
  }
  recent.forEach(s => {
    const key = new Date(s.end_time||s.created_at)
      .toLocaleDateString('pt-BR',{month:'2-digit',day:'2-digit'});
    if (byDay[key]!==undefined) byDay[key].push(s.total_duration_ms);
  });

  const labels = Object.keys(byDay);
  const data   = labels.map(k => {
    const arr = byDay[k];
    return arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : null;
  });

  const withData = data.filter(v=>v!==null);
  let deltaHtml = '';
  if (withData.length >= 2) {
    const diff  = withData[withData.length-1] - withData[0];
    const icon  = diff < 0 ? '↓ Melhorando' : diff > 0 ? '↑ Piorando' : '→ Estável';
    const color = diff < 0 ? '#22c55e' : diff > 0 ? '#ef4444' : '#fb923c';
    deltaHtml = `<span style="color:${color};font-weight:700">${icon} ${fmtHHMMSS(Math.abs(diff))} nos últimos ${days} dias</span>`;
  } else { deltaHtml = '<span style="color:var(--muted)">Dados insuficientes</span>'; }
  const el = document.getElementById('trend-delta');
  if (el) el.innerHTML = deltaHtml;

  const metaMs = getMetaMs();
  if (chartTrend) chartTrend.destroy();
  chartTrend = new Chart(ctx, {
    type:'line',
    data:{
      labels,
      datasets:[
        { label:'Média do dia', data,
          borderColor:'rgba(0,212,255,1)', backgroundColor:'rgba(0,212,255,0.08)',
          borderWidth:2, pointRadius:5,
          pointBackgroundColor: data.map(v=>v===null?'transparent':'rgba(0,212,255,1)'),
          tension:0.35, fill:true, spanGaps:true },
        { label:'Limite', data:labels.map(()=>metaMs),
          borderColor:'rgba(255,80,80,0.7)', borderWidth:1.5, borderDash:[6,3],
          pointRadius:0, fill:false }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      layout:{ padding:{ top:8, right:12, bottom:4, left:8 } },
      plugins:{
        legend:{ display:false },
        tooltip:{ callbacks:{
          label: c => c.raw===null ? 'Sem dados' : c.dataset.label+': '+fmtHHMMSS(c.raw)
        }}
      },
      scales:{
        x:{ grid:{color:'rgba(255,255,255,0.05)'}, ticks:{color:'#d0dff0',font:{size:10},maxRotation:45} },
        y:{ beginAtZero:false, grid:{color:'rgba(255,255,255,0.05)'},
          ticks:{ color:'#d0dff0', font:{size:10}, callback: v => fmtHHMMSS(v) },
          title:{display:true,text:'HH:MM:SS',color:'rgba(255,255,255,0.4)',font:{size:9}} }
      }
    }
  });
}

/* ============================================================
   PERFORMANCE POR TÉCNICO
============================================================ */
function loadTechTable(completed) {
  const tbody = document.getElementById('tech-tbody');
  if (!tbody) return;
  const byTech = {};
  completed.forEach(s => {
    const t     = s.tech_name || 'Desconhecido';
    const limMs = (s.rooms?.alert_limit_minutes||300) * 60000;
    if (!byTech[t]) byTech[t] = { ms:[], over:0 };
    byTech[t].ms.push(s.total_duration_ms);
    if (s.total_duration_ms > limMs) byTech[t].over++;
  });
  if (!Object.keys(byTech).length) {
    tbody.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:16px">Sem dados.</td></tr>'; return;
  }
  const ranked = Object.entries(byTech).map(([name,d]) => {
    const avg    = d.ms.reduce((a,b)=>a+b,0) / d.ms.length;
    const pctMeta = Math.round((d.ms.length-d.over)/d.ms.length*100);
    const perf   = Math.round((avg / getMetaMs()) * 100);
    return { name, count:d.ms.length, avg, pctMeta, over:d.over, perf };
  }).sort((a,b)=>a.perf-b.perf);  // menor % = melhor

  tbody.innerHTML = ranked.map((r,i) => {
    const c = r.perf<85?'#22c55e':r.perf<=100?'#fb923c':'#ef4444';
    const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)+'º';
    return `<tr>
      <td style="text-align:center;font-weight:700">${medal}</td>
      <td style="color:#ffffff;font-weight:600">${r.name}</td>
      <td style="text-align:center;color:#a8b8d0">${r.count}</td>
      <td style="color:#d0dff0;font-family:monospace">${fmtHHMMSS(r.avg)}</td>
      <td style="text-align:center;color:${r.pctMeta>=80?'#22c55e':'#fb923c'}">${r.pctMeta}%</td>
      <td style="font-weight:700;color:${c}">${r.perf<85?'🟢':r.perf<=100?'🟡':'🔴'} ${r.perf}%</td>
    </tr>`;
  }).join('');
}

/* ============================================================
   MATRIZ PERFORMANCE POR ESTAÇÃO
============================================================ */
function buildMatrixTable(byMachine, avgMin) {
  const tbody = document.getElementById('matrix-tbody');
  if (!tbody) return;
  if (!avgMin.some(v=>v>0)) {
    tbody.innerHTML='<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:20px">Sem dados de atividades.</td></tr>'; return;
  }
  tbody.innerHTML = STATION_ORDER.map((name, i) => {
    const avg    = avgMin[i];
    const target = STATION_TARGETS[name] || 10;
    const perf   = avg > 0 ? Math.round((avg / target) * 100) : null;
    const color  = !perf ? '#a8b8d0' : perf<85 ? '#22c55e' : perf<=100 ? '#fb923c' : '#ef4444';
    const dot    = !perf ? '' : perf<85 ? '🟢' : perf<=100 ? '🟡' : '🔴';
    const bar = perf ? `<div style="background:${color};height:5px;border-radius:3px;width:${Math.min(perf,200)/2}%;margin-top:3px;opacity:0.6"></div>` : '';
    return `<tr>
      <td style="color:#ffffff;font-weight:600">${name}</td>
      <td style="font-family:monospace;color:${avg>0?'#d0dff0':'var(--muted)'}">${avg>0?fmtMinToHHMMSS(avg):'—'}</td>
      <td style="font-family:monospace;color:#a8c8f0">${fmtMinToHHMMSS(target)}</td>
      <td>
        <span style="font-weight:700;color:${color}">${dot} ${perf!=null?perf+'%':'—'}</span>
        ${bar}
      </td>
    </tr>`;
  }).join('');
}

/* ============================================================
   RECENT SESSIONS
============================================================ */
async function loadRecentSessions() {
  try {
    const { data, error } = await db.from('changeover_sessions')
      .select('*,rooms(name,room_code,alert_limit_minutes)')
      .order('created_at',{ascending:false}).limit(10);

    const tbody = document.getElementById('recent-tbody');
    if (!tbody) return;
    if (error||!data?.length) {
      tbody.innerHTML=`<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:24px">${error?'❌ '+error.message:'Nenhum registro.'}</td></tr>`;
      return;
    }

    const sessIds = data.map(s=>s.id).filter(Boolean);
    let mtMap = {};
    try {
      const { data:mt } = await db.from('machine_times')
        .select('session_id,machine_name,duration_ms,observation').in('session_id',sessIds);
      (mt||[]).forEach(m => {
        if (!mtMap[m.session_id]) mtMap[m.session_id]=[];
        mtMap[m.session_id].push(m);
      });
    } catch(e) {}

    tbody.innerHTML = data.map((s,idx) => {
      const limMs  = (s.rooms?.alert_limit_minutes||300)*60000;
      const over   = s.total_duration_ms && s.total_duration_ms > limMs;
      const status = s.status==='completed'
        ? `<span class="badge ${over?'badge-red':'badge-green'}">${over?'⚠️ Acima':'✅ OK'}</span>`
        : '<span class="badge badge-blue">▶ Andamento</span>';
      const mts = mtMap[s.id]||[];
      const obsItems = mts.filter(m=>m.observation?.trim())
        .map(m=>`<div style="margin:3px 0"><span style="color:var(--accent);font-weight:600">${m.machine_name}:</span> <span style="color:#d0dff0">${m.observation}</span></div>`).join('');
      const obsHtml = obsItems
        ? `<button onclick="toggleObs(${idx})" style="background:none;border:1px solid rgba(0,212,255,0.35);color:var(--accent);padding:3px 10px;border-radius:4px;cursor:pointer;font-size:11px">📝 Ver</button>
           <div id="obs-${idx}" style="display:none;background:rgba(0,0,0,0.3);border-radius:6px;padding:8px;margin-top:4px;font-size:12px">${obsItems}</div>`
        : '<span style="color:var(--muted);font-size:12px">—</span>';

      const limStr = (() => {
        const m = s.rooms?.alert_limit_minutes||300;
        return fmtHHMMSS(m*60000);
      })();

      const endStr = s.end_time
        ? new Date(s.end_time).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})
        : (s.status==='in_progress' ? '<span style="color:#22c55e;font-size:11px">● Ativo</span>' : '—');
      return `<tr>
        <td><span style="font-family:monospace;font-weight:700;color:var(--accent)">${s.rooms?.room_code||'—'}</span></td>
        <td>${s.rooms?.name||'—'}</td>
        <td style="color:#ffffff">${s.tech_name||'—'}</td>
        <td style="font-size:11px">${fmtDate(s.created_at)}</td>
        <td style="font-size:11px;color:#a8b8d0">${endStr}</td>
        <td style="font-family:monospace;${over?'color:#ef4444;font-weight:700':''}">${s.total_duration_ms?fmtHHMMSS(s.total_duration_ms):'—'}</td>
        <td style="font-family:monospace">${limStr}</td>
        <td>${status}</td>
        <td>${obsHtml}</td>
      </tr>`;
    }).join('');
  } catch(e) { console.warn('[recentSessions]',e); }
}

function toggleObs(idx) {
  const el = document.getElementById('obs-'+idx);
  if (el) el.style.display = el.style.display==='none'?'block':'none';
}

/* ============================================================
   REGISTROS — filtros completos + data
============================================================ */
async function populateRecordFilters() {
  // Popula técnicos e produtos a partir das sessões
  try {
    const { data } = await db.from('changeover_sessions')
      .select('tech_name,product').not('status','eq','unknown');
    const techs = [...new Set((data||[]).map(s=>s.tech_name).filter(Boolean))].sort();
    const prods = [...new Set((data||[]).map(s=>s.product).filter(Boolean))].sort();

    const techSel = document.getElementById('filter-rec-tech');
    if (techSel) {
      techSel.innerHTML = '<option value="">Todos</option>' +
        techs.map(t=>`<option value="${t}">${t}</option>`).join('');
    }
    const prodSel = document.getElementById('filter-rec-product');
    if (prodSel) {
      prodSel.innerHTML = '<option value="">Todos</option>' +
        prods.map(p=>`<option value="${p}">${p}</option>`).join('');
    }

    // Salas
    const roomSel = document.getElementById('filter-rec-room');
    if (roomSel) {
      roomSel.innerHTML = '<option value="">Todas</option>' +
        adminRooms.map(r=>`<option value="${r.id}">${r.room_code} — ${r.name}</option>`).join('');
    }
  } catch(e) {}
}

async function loadRecords() {
  const from    = document.getElementById('filter-date-from')?.value || '';
  const to      = document.getElementById('filter-date-to')?.value || '';
  const room    = document.getElementById('filter-rec-room')?.value || document.getElementById('filter-room-global')?.value || '';
  const tech    = document.getElementById('filter-rec-tech')?.value || '';
  const shift   = document.getElementById('filter-shift')?.value || '';
  const product = document.getElementById('filter-rec-product')?.value || '';
  const type    = document.getElementById('filter-rec-type')?.value || '';
  const status  = document.getElementById('filter-rec-status')?.value || '';

  const tbody = document.getElementById('records-tbody');
  const countEl = document.getElementById('records-count');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="13" style="text-align:center;color:var(--accent);padding:24px">&#x23F3; Carregando...</td></tr>`;

  try {
    // ── 1. Busca sessões com filtros ────────────────────────────────────────
    let q = db.from('changeover_sessions')
      .select('*,rooms(name,room_code,alert_limit_minutes)')
      .order('created_at', {ascending: false}).limit(200);

    if (from)    q = q.gte('created_at', from + 'T00:00:00');
    if (to)      q = q.lte('created_at', to   + 'T23:59:59');
    if (room)    q = q.eq('room_id', room);
    if (tech)    q = q.eq('tech_name', tech);
    if (shift)   q = q.eq('shift', shift);
    if (product) q = q.eq('product', product);
    if (type)    q = q.eq('changeover_type', type);
    if (status)  q = q.eq('status', status);
    const modelGlobal = document.getElementById('filter-model-global')?.value || '';
    if (modelGlobal) q = q.eq('product', modelGlobal);

    const { data: sessions, error } = await q;

    if (error || !sessions?.length) {
      tbody.innerHTML = `<tr><td colspan="13" style="text-align:center;color:var(--muted);padding:24px">${error ? '❌ ' + error.message : 'Nenhum registro encontrado.'}</td></tr>`;
      if (countEl) countEl.textContent = '0 registros';
      buildMatrixTable({}, STATION_ORDER.map(() => 0));
      return;
    }

    // ── 2. Busca machine_times de todas as sessões ──────────────────────────
    const sessIds = sessions.map(s => s.id).filter(Boolean);
    let allMTs = [];
    try {
      const { data: mts } = await db.from('machine_times')
        .select('*')
        .in('session_id', sessIds)
        .order('created_at', {ascending: true});
      if (mts) allMTs = mts;
    } catch(e) {}

    // ── 3. Agrupa machine_times por sessão ──────────────────────────────────
    const mtsBySess = {};
    sessions.forEach(s => { mtsBySess[s.id] = []; });
    allMTs.forEach(mt => {
      if (mtsBySess[mt.session_id]) mtsBySess[mt.session_id].push(mt);
    });

    // ── 4. Atualiza matriz de performance (mantém compatibilidade) ──────────
    const byMachineFiltered = {};
    STATION_ORDER.forEach(n => { byMachineFiltered[n] = []; });
    allMTs.forEach(mt => {
      if (byMachineFiltered[mt.machine_name] !== undefined && mt.duration_ms)
        byMachineFiltered[mt.machine_name].push(mt.duration_ms);
    });
    const avgMinF = STATION_ORDER.map(n => {
      const t = byMachineFiltered[n];
      return t.length ? Math.round(t.reduce((a, b) => a + b, 0) / t.length / 60000 * 100) / 100 : 0;
    });
    buildMatrixTable(byMachineFiltered, avgMinF);

    // ── 5. Expande: 1 linha por machine_time (ou 1 linha "Aguardando" se sem atividades) ──
    const rows = []; // { session, mt }
    sessions.forEach(s => {
      const mts = mtsBySess[s.id] || [];
      if (mts.length === 0) {
        rows.push({ s, mt: null }); // sessão iniciada sem atividades ainda
      } else {
        mts.forEach(mt => rows.push({ s, mt }));
      }
    });

    if (countEl) {
      const ativos = rows.filter(r => r.mt && !r.mt.end_time).length;
      countEl.textContent = rows.length + ' atividade' + (rows.length !== 1 ? 's' : '') +
        (ativos > 0 ? ` (${ativos} ativas)` : '');
    }

    // ── 6. Renderiza linhas ─────────────────────────────────────────────────
    const fmtT = iso => iso ? new Date(iso).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : '—';
    const fmtD = iso => iso ? new Date(iso).toLocaleDateString('pt-BR') : '—';

    tbody.innerHTML = rows.map(({ s, mt }) => {
      const sessActive    = s.status === 'in_progress';
      const mtRunning     = mt && !mt.end_time && sessActive; // atividade em andamento
      const mtDone        = mt && !!mt.end_time;             // atividade concluída
      const aguardando    = !mt;                              // sessão sem atividades

      // Badge de status da linha
      let statusBadge;
      if (aguardando) {
        statusBadge = `<span class="badge" style="background:rgba(148,163,184,0.15);color:#94a3b8;border:1px solid rgba(148,163,184,0.3)">⏳ Aguardando</span>`;
      } else if (mtRunning) {
        statusBadge = `<span class="badge badge-blue">▶ Ativo</span>`;
      } else if (mtDone) {
        statusBadge = `<span class="badge badge-green" style="font-size:10px">✅ Concluído</span>`;
      } else {
        statusBadge = `<span class="badge" style="background:rgba(148,163,184,0.15);color:#94a3b8">—</span>`;
      }

      // Nome da atividade
      const atividadeNome = mt
        ? (mtRunning
            ? `<span style="color:#00d4ff;font-weight:700">▶ ${mt.machine_name}</span>`
            : `<span style="color:#a8b8d0">✔ ${mt.machine_name}</span>`)
        : `<span style="color:#64748b;font-style:italic">Aguardando início</span>`;

      // Cronômetro: para atividade ativa usa start_time do machine_time
      let duracaoHtml;
      if (mtRunning && mt.start_time) {
        const startMs = new Date(mt.start_time).getTime();
        duracaoHtml = `<span class="live-timer" data-start="${startMs}" style="font-family:monospace;font-size:12px;color:#00d4ff;font-weight:700;background:rgba(0,212,255,0.08);padding:2px 7px;border-radius:10px">⏱ 00:00:00</span>`;
      } else if (mtDone && mt.duration_ms) {
        duracaoHtml = `<span style="font-family:monospace;font-size:12px;color:#a8b8d0">${fmtHHMMSS(mt.duration_ms)}</span>`;
      } else if (mtDone && mt.start_time && mt.end_time) {
        const calc = new Date(mt.end_time).getTime() - new Date(mt.start_time).getTime();
        duracaoHtml = `<span style="font-family:monospace;font-size:12px;color:#a8b8d0">${fmtHHMMSS(calc > 0 ? calc : 0)}</span>`;
      } else {
        duracaoHtml = '—';
      }

      // Cor de fundo: destaque para linha ativa
      const rowBg = mtRunning ? 'background:rgba(0,212,255,0.04)' : '';

      // Matrícula = identificador do técnico
      const matricula = s.tech_matricula || '——';

      // Ações: Stop só na sessão ativa; Delete para a sessão toda
      const stopBtn = sessActive && !mt?.end_time && mt
        ? `<button onclick="leaderStopSession('${s.id}','${(s.tech_name||'').replace(/'/g,'')}')" style="background:rgba(255,170,0,0.15);border:1px solid rgba(255,170,0,0.5);color:#ffaa00;padding:3px 9px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700" title="Para esta sessão">⏹</button>`
        : '';
      const delBtn = `<button onclick="leaderDeleteSession('${s.id}','${(s.tech_name||'').replace(/'/g,'')}','${matricula}')" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.4);color:#f87171;padding:3px 7px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700" title="Excluir sessão">🗑</button>`;

      return `<tr style="${rowBg}">
        <td><span style="font-family:monospace;font-weight:700;color:var(--accent);font-size:11px">${matricula}</span></td>
        <td style="color:#ffffff;font-size:12px">${s.tech_name || '—'}</td>
        <td style="font-size:11px;color:#a8b8d0">${fmtD(s.created_at)}</td>
        <td style="min-width:160px">${atividadeNome}</td>
        <td style="font-family:monospace;font-size:11px;color:#90b8ff">${fmtT(mt?.start_time)}</td>
        <td style="font-family:monospace;font-size:11px;color:#a8b8d0">${fmtT(mt?.end_time)}</td>
        <td>${duracaoHtml}</td>
        <td style="font-size:11px">${s.rooms?.name || '—'}</td>
        <td style="font-size:11px">${s.shift || '—'}</td>
        <td style="font-size:11px;color:var(--accent)">${s.product || '—'}</td>
        <td style="font-size:10px;color:#a8b8d0">${s.changeover_type || '—'}</td>
        <td>${statusBadge}</td>
        <td><div style="display:flex;gap:3px">${stopBtn}${delBtn}</div></td>
      </tr>`;
    }).join('');

    // ── 7. Live timer: atualiza cronômetros de atividades ativas ─────────────
    clearInterval(window._liveTimerInterval);
    window._liveTimerInterval = setInterval(() => {
      document.querySelectorAll('.live-timer').forEach(el => {
        const start = parseInt(el.dataset.start, 10);
        if (!start) return;
        const ms = Date.now() - start;
        el.textContent = '⏱ ' + fmtHHMMSS(ms);
        el.style.color = ms > 18000000 ? '#ef4444' : '#00d4ff';
      });
    }, 1000);

  } catch(e) { console.warn('[loadRecords]', e); }
}


/* ============================================================
   LIDERANÇA: STOP e DELETE de sessão com auditoria
============================================================ */
async function leaderStopSession(sessionId, techName) {
  const leaderName = document.getElementById('user-name-display')?.textContent || 'Liderança';
  const confirm_msg = `⏹ Parar o changeover de "${techName}"?\n\nIsso será registrado como parado pela liderança.`;
  if (!confirm(confirm_msg)) return;

  try {
    const now = new Date().toISOString();
    const { error } = await db.from('changeover_sessions').update({
      status: 'stopped_by_leader',
      end_time: now,
      total_duration_ms: null, // não contabiliza como CO completo
      // Salva auditoria no campo sector (reutilizado como log de ação)
      sector: `PARADO PELA LIDERANÇA: ${leaderName} em ${new Date().toLocaleString('pt-BR')}`
    }).eq('id', sessionId);

    if (error) { showToast('❌ Erro ao parar: ' + error.message, 'error'); return; }

    showToast(`⏹ Changeover de ${techName} parado pela liderança.`, 'warning', 5000);
    loadRecords();
    loadAdminStats();
  } catch(e) { showToast('❌ Erro de conexão.', 'error'); }
}

async function leaderDeleteSession(sessionId, techName, chId) {
  const leaderName = document.getElementById('user-name-display')?.textContent || 'Liderança';
  const confirm_msg = `🗑 Excluir o changeover ${chId} de "${techName}"?\n\n⚠️ Esta ação não pode ser desfeita.\nSerá registrado que ${leaderName} excluiu este registro.`;
  if (!confirm(confirm_msg)) return;

  try {
    // 1. Salva log de auditoria antes de excluir
    await db.from('changeover_sessions').update({
      sector: `EXCLUÍDO PELA LIDERANÇA: ${leaderName} em ${new Date().toLocaleString('pt-BR')} | Status anterior: ${chId}`,
      status: 'deleted_by_leader'
    }).eq('id', sessionId);

    // 2. Aguarda 500ms para garantir o update
    await new Promise(r => setTimeout(r, 500));

    // 3. Exclui machine_times vinculadas
    await db.from('machine_times').delete().eq('session_id', sessionId);

    // 4. Exclui a sessão
    const { error } = await db.from('changeover_sessions').delete().eq('id', sessionId);

    if (error) { showToast('❌ Erro ao excluir: ' + error.message, 'error'); return; }

    showToast(`🗑 Changeover ${chId} excluído por ${leaderName}.`, 'success', 5000);
    loadRecords();
    loadAdminStats();
  } catch(e) { showToast('❌ Erro de conexão.', 'error'); }
}

function clearRecordFilters() {
  ['filter-date-from','filter-date-to','filter-rec-room','filter-rec-tech',
   'filter-shift','filter-rec-product','filter-rec-type','filter-rec-status'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  loadRecords();
}

/* ============================================================
   ROOMS
============================================================ */
async function loadAdminRooms() {
  try {
    const { data, error } = await db.from('rooms').select('*').order('created_at',{ascending:false});
    if (!error) adminRooms = data||[];
  } catch(e) {}

  const sel = document.getElementById('filter-room-global');
  if (sel) {
    const cur = sel.value;
    sel.innerHTML = '<option value="">Todas as linhas</option>';
    adminRooms.forEach(r => {
      sel.innerHTML += `<option value="${r.id}">${r.room_code} — ${r.name}</option>`;
    });
    if (cur) sel.value = cur;
  }
  renderRooms();
  // atualiza filtro de sala nos registros
  const roomSel = document.getElementById('filter-rec-room');
  if (roomSel) {
    const cur2 = roomSel.value;
    roomSel.innerHTML = '<option value="">Todas</option>' +
      adminRooms.map(r=>`<option value="${r.id}">${r.room_code} — ${r.name}</option>`).join('');
    if (cur2) roomSel.value = cur2;
  }
}


/* ============================================================
   PAINEL SESSÕES ATIVAS — Dashboard (só IDs em andamento)
============================================================ */
function renderActiveSessions(activeSessions) {
  const el = document.getElementById('active-sessions-panel');
  if (!el) return;
  if (!activeSessions.length) {
    el.innerHTML = `<div style="color:var(--muted);font-size:13px;text-align:center;padding:32px 16px;width:100%">
      <div style="font-size:32px;margin-bottom:8px;opacity:0.3">⚡</div>
      Nenhum changeover em andamento agora.
    </div>`;
    return;
  }
  el.innerHTML = activeSessions.map(s => {
    const startMs = s.start_time ? new Date(s.start_time).getTime() : Date.now();
    const elapsed = Date.now() - startMs;
    const limMs   = (s.rooms?.alert_limit_minutes||300)*60000;
    const over    = elapsed > limMs;
    const pct     = Math.min(Math.round(elapsed / limMs * 100), 100);
    const overClass = over ? 'over-limit' : '';
    return `
      <div class="session-live-card ${overClass}">
        <span class="slc-badge-active">${over ? '⚠ ALERTA' : '● ATIVO'}</span>
        <div class="slc-line-code">${s.rooms?.room_code||'—'}</div>
        <div class="slc-tech">👤 ${s.tech_name||'—'}</div>
        <div class="slc-meta">
          🏭 ${s.rooms?.name||'—'} &nbsp;·&nbsp; 🕐 ${s.shift||'—'} &nbsp;·&nbsp; 📦 ${s.product||'—'}
        </div>
        <div class="slc-timer" data-start="${startMs}">${fmtHHMMSS(elapsed)}</div>
        <div class="slc-limit">Limite: ${fmtHHMMSS(limMs)} &nbsp;|&nbsp; ${pct}% utilizado</div>
        <div class="slc-progress"><div class="slc-progress-bar" style="width:${pct}%"></div></div>
      </div>`;
  }).join('');

  // Live timers nos cards de sessão ativa
  clearInterval(window._sessionTimerInterval);
  window._sessionTimerInterval = setInterval(() => {
    document.querySelectorAll('.slc-timer[data-start]').forEach(el => {
      const start = parseInt(el.dataset.start, 10);
      if (!start) return;
      el.textContent = fmtHHMMSS(Date.now() - start);
    });
  }, 1000);
}

function mbnSetActive(sec) {
  document.querySelectorAll('.mbn-item').forEach(el =>
    el.classList.toggle('active', el.dataset.sec === sec));
}

/* ============================================================
   LIDERANÇA: STOP e DELETE de sessão com auditoria
============================================================ */
async function leaderStopSession(sessionId, techName) {
  const leaderName = document.getElementById('admin-name-display')?.textContent
    || localStorage.getItem('adminName') || 'Liderança';
  if (!confirm(`⏹ Parar o changeover de "${techName}"?\n\nIsso será registrado como interrompido pela liderança.`)) return;
  try {
    const now = new Date().toISOString();
    const { error } = await db.from('changeover_sessions').update({
      status: 'stopped_by_leader',
      end_time: now,
      sector: `INTERROMPIDO PELA LIDERANÇA: ${leaderName} | ${new Date().toLocaleString('pt-BR')}`
    }).eq('id', sessionId);
    if (error) { showToast('❌ Erro ao parar: ' + error.message, 'error'); return; }
    showToast(`⏹ Changeover de ${techName} interrompido por ${leaderName}.`, 'warning', 5000);
    loadRecords(); loadAdminStats();
  } catch(e) { showToast('❌ Erro de conexão.', 'error'); }
}

async function leaderDeleteSession(sessionId, techName, chId) {
  const leaderName = document.getElementById('admin-name-display')?.textContent
    || localStorage.getItem('adminName') || 'Liderança';
  const auditLog = `EXCLUÍDO POR LIDERANÇA: ${leaderName} | ${new Date().toLocaleString('pt-BR')}`;
  if (!confirm(`🗑 Excluir ${chId} de "${techName}"?\n\n⚠️ Ação irreversível.\nAuditoria: ${leaderName}`)) return;
  try {
    // Grava auditoria antes de excluir
    await db.from('changeover_sessions').update({ sector: auditLog, status: 'deleted_by_leader' }).eq('id', sessionId);
    await new Promise(r => setTimeout(r, 400));
    await db.from('machine_times').delete().eq('session_id', sessionId);
    const { error } = await db.from('changeover_sessions').delete().eq('id', sessionId);
    if (error) { showToast('❌ Erro ao excluir: ' + error.message, 'error'); return; }
    showToast(`🗑 ${chId} excluído por ${leaderName}.`, 'success', 5000);
    loadRecords(); loadAdminStats();
  } catch(e) { showToast('❌ Erro de conexão.', 'error'); }
}

function renderRooms() {
  const el = document.getElementById('rooms-grid');
  if (!el) return;

  // Aplica filtros de data e status
  const fromVal  = document.getElementById('filter-rooms-from')?.value || '';
  const toVal    = document.getElementById('filter-rooms-to')?.value   || '';
  const statusV  = document.getElementById('filter-rooms-status')?.value || '';
  const fromTs   = fromVal ? new Date(fromVal + 'T00:00:00').getTime() : 0;
  const toTs     = toVal   ? new Date(toVal   + 'T23:59:59').getTime() : Infinity;

  const filtered = adminRooms.filter(r => {
    const created = r.created_at ? new Date(r.created_at).getTime() : 0;
    if (fromVal && created < fromTs) return false;
    if (toVal   && created > toTs)   return false;
    if (statusV === 'active'   && !r.is_active) return false;
    if (statusV === 'inactive' &&  r.is_active) return false;
    return true;
  });

  if (!filtered.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🚪</div><div class="empty-text">${adminRooms.length ? 'Nenhuma linha encontrada com esses filtros.' : 'Nenhuma linha criada.'}</div></div>`;
    return;
  }

  const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('pt-BR', {day:'2-digit',month:'2-digit',year:'numeric'}) : '—';

  el.innerHTML = filtered.map(r => `
    <div class="room-card ${r.is_active?'':'inactive'}">
      <div class="room-code-badge">${r.room_code}</div>
      <div class="room-name">${r.name}</div>
      ${r.sku ? `<div style="font-size:12px;color:var(--accent);font-weight:600;margin-bottom:6px">📦 ${r.sku}</div>` : ''}
      <div class="room-meta">
        ${r.line  ? `<span>📍 ${r.line}</span>`  : ''}
        ${r.shift ? `<span>🕐 ${r.shift}</span>` : ''}
        <span>⏱ Limite: <strong>${r.alert_limit_minutes||300} min</strong></span>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:10px;display:flex;align-items:center;gap:5px">
        📅 Criado em: <span style="color:var(--muted2);font-weight:600">${fmtDate(r.created_at)}</span>
      </div>
      <div style="margin-bottom:12px">
        ${r.is_active ? '<span class="badge badge-green">● Ativa</span>' : '<span class="badge badge-red">● Inativa</span>'}
      </div>
      <div class="room-actions">
        <button class="btn btn-ghost btn-sm" onclick="copyToClipboard('${r.room_code}')">📋 Copiar ID</button>
        <button class="btn btn-ghost btn-sm" onclick="toggleRoom('${r.id}',${!r.is_active})">${r.is_active?'⏸ Desativar':'▶ Ativar'}</button>
        <button class="btn btn-danger btn-sm" onclick="confirmDeleteRoom('${r.id}','${r.name}')">🗑</button>
      </div>
    </div>`).join('');
}

function clearRoomsFilter() {
  ['filter-rooms-from','filter-rooms-to'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  const st = document.getElementById('filter-rooms-status'); if(st) st.value='';
  renderRooms();
}

async function toggleRoom(id, active) {
  const { error } = await db.from('rooms').update({is_active:active}).eq('id',id);
  if (error) { showToast('Erro ao alterar.','error'); return; }
  loadAdminRooms();
}

// ── FIX 5: Deletar room NÃO apaga os dados históricos ──
// Apenas desativa a room e remove o cadastro de rooms
// Os dados das sessões continuam com room_id (FK sem cascade delete)
async function confirmDeleteRoom(id, name) {
  if (!confirm(`Desativar e remover o cadastro da linha "${name}"?\n\n⚠️ Os dados de changeover registrados serão mantidos no dashboard.\nApenas o cadastro da linha será removido.`)) return;
  // Primeiro desativa para garantir
  await db.from('rooms').update({is_active:false}).eq('id',id);
  // Depois deleta só o cadastro (os changeover_sessions mantêm room_id como orphan)
  const { error } = await db.from('rooms').delete().eq('id',id);
  if (error) { showToast('Erro ao remover: '+error.message,'error'); return; }
  showToast('✅ Linha removida. Histórico preservado no dashboard.','success',5000);
  loadAdminRooms();
  loadAdminStats(); // recarrega sem filtro da linha deletada
}

/* ============================================================
   CRIAR ROOM
============================================================ */
function openCreateRoom() {
  pendingRoomId = genRoomId(); renderNewRoomId();
  const nameEl = document.getElementById('nr-name'); if(nameEl) nameEl.value='';
  ['nr-sku','nr-line','nr-leader-name','nr-leader-matricula'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  const sh=document.getElementById('nr-shift'); if(sh) sh.value='';
  const lm=document.getElementById('nr-limit'); if(lm) lm.value='300';
  const pv=document.getElementById('limit-preview'); if(pv) pv.textContent='⏱ Padrão: 300 min = 5 horas';
  openModal('modal-new-room');
}
function renderNewRoomId() { const el=document.getElementById('new-room-id-display'); if(el) el.textContent=pendingRoomId; }
function regenerateId() { pendingRoomId=genRoomId(); renderNewRoomId(); showToast('Novo ID gerado!','info'); }

async function createRoom() {
  const nameEl  = document.getElementById('nr-name');
  const name    = nameEl?.value || '';
  const sku     = document.getElementById('nr-sku')?.value.trim()||'';
  const line    = document.getElementById('nr-line')?.value.trim()||'';
  const shift   = document.getElementById('nr-shift')?.value||'';
  const limit   = parseInt(document.getElementById('nr-limit')?.value)||300;
  const leaderName = document.getElementById('nr-leader-name')?.value.trim()||'';
  const matricula  = document.getElementById('nr-leader-matricula')?.value.trim()||'';

  if (!name)       { showToast('Selecione uma linha.','error'); return; }
  if (!sku)        { showToast('Informe o SKU / Modelo do produto.','error'); return; }
  if (!leaderName) { showToast('Informe o nome da líder.','error'); return; }
  if (!/^\d{6}$/.test(matricula)) { showToast('Matrícula deve ter exatamente 6 dígitos numéricos.','error'); return; }

  const btn=document.getElementById('btn-create-room');
  if(btn){btn.disabled=true;btn.innerHTML='<span class="spinner"></span> Criando...';}
  try {
    const { data, error } = await db.from('rooms').insert({
      room_code:pendingRoomId, name, sku:sku||null, line:line||null, shift:shift||null,
      password:'', alert_limit_minutes:limit, is_active:true,
      leader_name: leaderName, leader_matricula: matricula
    }).select().single();
    if (error) {
      if (error.code==='23505'){pendingRoomId=genRoomId();renderNewRoomId();showToast('ID duplicado — tente novamente.','error');}
      else showToast('❌ Erro: '+error.message,'error',7000);
    } else {
      closeModal('modal-new-room');
      showToast(`✅ Linha criada! ID: ${data.room_code} · SKU: ${sku}`,'success',5000);
      loadAdminRooms();
    }
  } catch(e){showToast('❌ Erro de rede.','error',7000);}
  if(btn){btn.disabled=false;btn.innerHTML='Criar Linha';}
}

/* ============================================================
   ALERTAS
============================================================ */
async function loadAlerts() {
  try {
    const { data } = await db.from('changeover_sessions')
      .select('*,rooms(name,room_code,alert_limit_minutes)').eq('status','in_progress');
    const el = document.getElementById('alerts-list');
    if (!el) return;
    const now = Date.now();
    const critical = (data||[]).filter(s => {
      const limMs = (s.rooms?.alert_limit_minutes||300)*60000;
      return (now - new Date(s.start_time).getTime()) > limMs;
    });
    if (!critical.length) {
      el.innerHTML=`<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-text">Nenhum alerta crítico.</div></div>`;
      return;
    }
    el.innerHTML = critical.map(s => {
      const elapsed = now - new Date(s.start_time).getTime();
      return `<div class="alert-item">
        <div class="alert-icon">🚨</div>
        <div class="alert-info">
          <div class="alert-title">${s.rooms?.name||'—'} — ${s.tech_name}</div>
          <div class="alert-sub">Iniciado: ${fmtDate(s.start_time)}</div>
        </div>
        <div class="alert-time" style="color:#ef4444;font-weight:700;font-family:monospace">${fmtHHMMSS(elapsed)}</div>
      </div>`;
    }).join('');
  } catch(e) { console.warn('[loadAlerts]',e); }
}

/* ============================================================
   REALTIME
============================================================ */
function subscribeRealtime() {
  if (realtimeSub) { try { db.removeChannel(realtimeSub); } catch(e){} }
  realtimeSub = db.channel('admin-v5')
    .on('postgres_changes',{event:'*',schema:'public',table:'changeover_sessions'}, () => {
      loadAdminStats(); loadRecentSessions();
      const active = document.querySelector('.section.active');
      if (active?.id==='sec-records') loadRecords();
      if (active?.id==='sec-alerts')  loadAlerts();
    })
    .on('postgres_changes',{event:'*',schema:'public',table:'machine_times'}, () => {
      const active = document.querySelector('.section.active');
      if (active?.id==='sec-records') loadRecords();
    })
    .subscribe();
}

/* ============================================================
   EXPORT EXCEL
============================================================ */
async function exportExcel() {
  try {
    showToast('Gerando Excel...', 'info', 2000);
    const { data: sessions, error } = await db.from('changeover_sessions')
      .select('*,rooms(name,room_code,alert_limit_minutes)')
      .order('created_at', {ascending: false}).limit(500);
    if (error || !sessions?.length) { showToast('Nenhum dado para exportar.', 'error'); return; }

    // Busca machine_times para detalhar por atividade
    const sessIds = sessions.map(s => s.id);
    const { data: allMTs } = await db.from('machine_times')
      .select('*').in('session_id', sessIds).order('created_at', {ascending: true});

    const mtsBySess = {};
    sessions.forEach(s => { mtsBySess[s.id] = []; });
    (allMTs || []).forEach(mt => { if (mtsBySess[mt.session_id]) mtsBySess[mt.session_id].push(mt); });

    const fmtT = iso => iso ? new Date(iso).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) : '';
    const fmtD = iso => iso ? new Date(iso).toLocaleDateString('pt-BR') : '';

    const rows = [];
    sessions.forEach(s => {
      const mts = mtsBySess[s.id] || [];
      if (mts.length === 0) {
        rows.push({
          'Matrícula': s.tech_matricula || '',
          'Técnico': s.tech_name || '',
          'Data': fmtD(s.created_at),
          'Atividade': 'Aguardando início',
          'Início': '',
          'Fim': '',
          'Duração': '',
          'Linha': s.rooms?.name || '',
          'Turno': s.shift || '',
          'Produto': s.product || '',
          'Tipo': s.changeover_type || '',
          'Status': s.status || ''
        });
      } else {
        mts.forEach(mt => {
          let dur = '';
          if (mt.duration_ms) dur = fmtHHMMSS(mt.duration_ms);
          else if (mt.start_time && mt.end_time) {
            const d = new Date(mt.end_time).getTime() - new Date(mt.start_time).getTime();
            if (d > 0) dur = fmtHHMMSS(d);
          }
          rows.push({
            'Matrícula': s.tech_matricula || '',
            'Técnico': s.tech_name || '',
            'Data': fmtD(s.created_at),
            'Atividade': mt.machine_name || '',
            'Início': fmtT(mt.start_time),
            'Fim': fmtT(mt.end_time),
            'Duração': dur,
            'Linha': s.rooms?.name || '',
            'Turno': s.shift || '',
            'Produto': s.product || '',
            'Tipo': s.changeover_type || '',
            'Status': mt.end_time ? 'Concluído' : (s.status === 'in_progress' ? 'Ativo' : s.status)
          });
        });
      }
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [10,18,10,22,8,8,10,14,8,14,14,12].map(w => ({wch: w}));
    XLSX.utils.book_append_sheet(wb, ws, 'Atividades CO');
    XLSX.writeFile(wb, 'Changeover_SMT_' + new Date().toISOString().slice(0, 10) + '.xlsx');
    showToast('Excel exportado!', 'success');
  } catch(e) { showToast('Erro ao exportar.', 'error'); console.warn('[exportExcel]', e); }
}

function setLimit(val) {
  const el = document.getElementById('nr-limit');
  const pv = document.getElementById('limit-preview');
  if (el) el.value = val;
  if (pv) {
    const h = Math.floor(val/60), m = val%60;
    pv.textContent = `⏱ ${val} min = ${h>0?h+'h ':''}${m>0?m+'min':''}`;
  }
}

/* ============================================================
   PONTO 5 FIX — Conformidade e Média: usa meta da linha selecionada
   (chamado dentro loadAdminStats já corrigido no corpo principal,
    mas garante que stat-sub "Vs limite Xh" e "Sessões dentro do limite Xh" 
    mostrem o valor correto da linha filtrada)
============================================================ */
function updateStatSubLabels() {
  const metaMs  = getMetaMs();
  const metaMin = Math.round(metaMs / 60000);
  const h = Math.floor(metaMin / 60);
  const m = metaMin % 60;
  const metaLabel = h > 0 ? (m > 0 ? `${h}h ${m}min` : `${h}h`) : `${m}min`;

  // Card Média: "Vs limite Xh"
  const avgSub = document.querySelector('#stat-avg')?.closest('.stat-card')?.querySelector('.stat-sub');
  if (avgSub) avgSub.textContent = `Vs limite ${metaLabel}`;

  // Card Conformidade: "Sessões dentro do limite Xh"
  const conformSub = document.getElementById('conform-sub');
  if (conformSub) conformSub.textContent = `Sessões dentro do limite de ${metaLabel}`;
}

/* ============================================================
   COMPARAÇÃO DE MODELOS
============================================================ */
let chartCmpTrend    = null;
let chartCmpActivity = null;

async function initCompare() {
  // Popula selects
  try {
    const { data } = await db.from('changeover_sessions')
      .select('product').not('product','is',null);
    const prods = [...new Set((data||[]).map(s=>s.product).filter(Boolean))].sort();
    const sel = document.getElementById('cmp-product');
    if (sel) {
      sel.innerHTML = '<option value="">Selecione um modelo...</option>' +
        prods.map(p => `<option value="${p}">${p}</option>`).join('');
    }
    // Linhas
    const roomSel = document.getElementById('cmp-room');
    if (roomSel) {
      roomSel.innerHTML = '<option value="">Todas as linhas</option>' +
        adminRooms.map(r => `<option value="${r.id}">${r.room_code} — ${r.name}</option>`).join('');
    }
  } catch(e) { console.warn('[initCompare]', e); }
}

async function loadCompare() {
  const product = document.getElementById('cmp-product')?.value || '';
  const roomId  = document.getElementById('cmp-room')?.value || '';
  const period  = parseInt(document.getElementById('cmp-period')?.value || '30');

  const emptyEl   = document.getElementById('cmp-empty');
  const resultsEl = document.getElementById('cmp-results');

  if (!product) {
    if (emptyEl)   emptyEl.style.display   = 'block';
    if (resultsEl) resultsEl.style.display = 'none';
    return;
  }

  if (emptyEl)   emptyEl.style.display   = 'none';
  if (resultsEl) resultsEl.style.display = 'block';

  try {
    let q = db.from('changeover_sessions')
      .select('*,rooms(name,room_code,alert_limit_minutes)')
      .eq('product', product)
      .eq('status', 'completed')
      .not('total_duration_ms', 'is', null)
      .order('created_at', { ascending: true });

    if (roomId)  q = q.eq('room_id', roomId);
    if (period > 0) {
      const cutoff = new Date(Date.now() - period * 24 * 3600000).toISOString();
      q = q.gte('created_at', cutoff);
    }

    const { data: sessions, error } = await q;
    if (error || !sessions?.length) {
      if (resultsEl) resultsEl.innerHTML =
        '<div style="text-align:center;padding:40px;color:var(--muted)">Nenhum changeover concluído encontrado para este modelo.</div>';
      return;
    }

    // Busca machine_times de todas as sessões
    const ids = sessions.map(s => s.id);
    let mtData = [];
    try {
      const { data: mt } = await db.from('machine_times')
        .select('session_id,machine_name,duration_ms')
        .in('session_id', ids);
      if (mt) mtData = mt;
    } catch(e) {}

    // Agrupa machine_times por sessão
    const mtBySess = {};
    mtData.forEach(mt => {
      if (!mtBySess[mt.session_id]) mtBySess[mt.session_id] = {};
      if (!mtBySess[mt.session_id][mt.machine_name]) mtBySess[mt.session_id][mt.machine_name] = 0;
      mtBySess[mt.session_id][mt.machine_name] += (mt.duration_ms || 0);
    });

    // Identifica melhor (menor tempo total) e último
    const bestSess = [...sessions].sort((a,b) => a.total_duration_ms - b.total_duration_ms)[0];
    const lastSess = sessions[sessions.length - 1];
    const firstSess= sessions[0];

    const modelNameEl = document.getElementById('cmp-model-name');
    if (modelNameEl) modelNameEl.textContent = product;

    // ── KPIs ──
    renderCmpKpis(sessions, bestSess, lastSess);

    // ── Gráfico evolução (linha do tempo) ──
    renderCmpTrendChart(sessions);

    // ── Melhor vs Último info ──
    renderCmpBestInfo(bestSess, lastSess, firstSess, sessions.length);

    // ── Gráfico atividades: último vs melhor ──
    renderCmpActivityChart(mtBySess, lastSess, bestSess);

    // ── Tabela histórico ──
    renderCmpTable(sessions, bestSess);

  } catch(e) { console.warn('[loadCompare]', e); }
}

function renderCmpKpis(sessions, bestSess, lastSess) {
  const el = document.getElementById('cmp-kpis');
  if (!el) return;
  const total  = sessions.length;
  const avgMs  = sessions.reduce((a,s)=>a+(s.total_duration_ms||0),0) / total;
  const bestMs = bestSess.total_duration_ms;
  const lastMs = lastSess.total_duration_ms;
  const trend  = total > 1 ? lastMs - sessions[sessions.length-2].total_duration_ms : 0;
  const trendIcon = trend < 0 ? '📉 Melhorou' : trend > 0 ? '📈 Piorou' : '→ Estável';
  const trendColor= trend < 0 ? '#22c55e' : trend > 0 ? '#ef4444' : '#fb923c';

  el.innerHTML = `
    <div class="stat-card" style="background:rgba(0,212,255,0.08);border-color:rgba(0,212,255,0.2)">
      <div class="stat-label" style="color:#a8c8f0">Changeoveres</div>
      <div class="stat-val" style="font-size:28px;color:var(--accent)">${total}</div>
      <div class="stat-sub">No período</div>
    </div>
    <div class="stat-card" style="background:rgba(34,197,94,0.08);border-color:rgba(34,197,94,0.2)">
      <div class="stat-label" style="color:#a8d8a8">🏆 Melhor Tempo</div>
      <div class="stat-val" style="font-size:22px;color:#22c55e">${fmtHHMMSS(bestMs)}</div>
      <div class="stat-sub" style="color:#80c080">${fmtDate(bestSess.created_at).slice(0,10)}</div>
    </div>
    <div class="stat-card" style="background:rgba(99,102,241,0.08);border-color:rgba(99,102,241,0.2)">
      <div class="stat-label" style="color:#c4b5fd">📊 Média</div>
      <div class="stat-val" style="font-size:22px;color:#a78bfa">${fmtHHMMSS(avgMs)}</div>
      <div class="stat-sub">Todos os changeovers</div>
    </div>
    <div class="stat-card" style="background:rgba(251,146,60,0.08);border-color:rgba(251,146,60,0.2)">
      <div class="stat-label" style="color:#fed7aa">⚡ vs Anterior</div>
      <div class="stat-val" style="font-size:18px;color:${trendColor}">${trendIcon}</div>
      <div class="stat-sub" style="font-family:monospace">${Math.abs(trend)?fmtHHMMSS(Math.abs(trend)):''}</div>
    </div>`;
}

function renderCmpTrendChart(sessions) {
  const ctx = document.getElementById('chart-cmp-trend')?.getContext('2d');
  if (!ctx) return;
  if (chartCmpTrend) chartCmpTrend.destroy();

  const labels = sessions.map((s,i) => {
    const d = new Date(s.created_at);
    return `#${i+1} ${d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}`;
  });
  const data = sessions.map(s => s.total_duration_ms);
  const bestMs = Math.min(...data);

  // Calcula delta
  const deltaEl = document.getElementById('cmp-trend-delta');
  if (deltaEl && data.length >= 2) {
    const diff  = data[data.length-1] - data[0];
    const pct   = Math.round(Math.abs(diff) / data[0] * 100);
    const icon  = diff < 0 ? '↓' : diff > 0 ? '↑' : '→';
    const color = diff < 0 ? '#22c55e' : diff > 0 ? '#ef4444' : '#fb923c';
    const label = diff < 0 ? 'melhora' : diff > 0 ? 'piora' : 'sem variação';
    deltaEl.innerHTML = `<span style="color:${color};font-weight:700">${icon} ${fmtHHMMSS(Math.abs(diff))} de ${label} (${pct}%) do 1º ao último</span>`;
  } else if (deltaEl) deltaEl.innerHTML = '';

  chartCmpTrend = new Chart(ctx, {
    type:'line',
    data:{
      labels,
      datasets:[
        { label:'Duração total', data,
          borderColor:'rgba(0,212,255,1)', backgroundColor:'rgba(0,212,255,0.07)',
          borderWidth:2.5, pointRadius:6,
          pointBackgroundColor: data.map(v => v===bestMs?'rgba(34,197,94,1)':'rgba(0,212,255,1)'),
          pointRadius: data.map(v => v===bestMs?10:5),
          tension:0.3, fill:true },
        { label:'Melhor', data:sessions.map(()=>bestMs),
          borderColor:'rgba(34,197,94,0.5)', borderWidth:1.5, borderDash:[5,5],
          pointRadius:0, fill:false }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{ labels:{color:'#ffffff',font:{size:11}} },
        tooltip:{ callbacks:{
          label: c => c.dataset.label+': '+fmtHHMMSS(c.raw),
          afterLabel: c => {
            if (c.datasetIndex !== 0) return;
            const s = sessions[c.dataIndex];
            return `Técnico: ${s.tech_name||'—'}   Linha: ${s.rooms?.name||'—'}`;
          }
        }}
      },
      scales:{
        x:{ grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#d0dff0',font:{size:10},maxRotation:45} },
        y:{ beginAtZero:false, grid:{color:'rgba(255,255,255,0.04)'},
          ticks:{ color:'#d0dff0', font:{size:10}, callback: v => fmtHHMMSS(v) } }
      }
    }
  });
}

function renderCmpBestInfo(bestSess, lastSess, firstSess, total) {
  const el = document.getElementById('cmp-best-info');
  if (!el) return;
  const diff  = lastSess.total_duration_ms - bestSess.total_duration_ms;
  const pct   = Math.round(Math.abs(diff) / bestSess.total_duration_ms * 100);
  const isBestLast = bestSess.id === lastSess.id;
  const firstLast  = lastSess.total_duration_ms - firstSess.total_duration_ms;

  el.innerHTML = `
    <div style="margin-bottom:12px;padding:10px;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);border-radius:8px">
      <div style="color:#22c55e;font-weight:700;font-size:11px;margin-bottom:4px">🏆 MELHOR TEMPO</div>
      <div style="font-family:monospace;font-size:18px;font-weight:700;color:#22c55e">${fmtHHMMSS(bestSess.total_duration_ms)}</div>
      <div style="color:var(--muted);font-size:11px">${fmtDate(bestSess.created_at)} · ${bestSess.tech_name||'—'}</div>
    </div>
    <div style="margin-bottom:12px;padding:10px;background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.2);border-radius:8px">
      <div style="color:var(--accent);font-weight:700;font-size:11px;margin-bottom:4px">⏱ ÚLTIMO CHANGEOVER</div>
      <div style="font-family:monospace;font-size:18px;font-weight:700;color:var(--accent)">${fmtHHMMSS(lastSess.total_duration_ms)}</div>
      <div style="color:var(--muted);font-size:11px">${fmtDate(lastSess.created_at)} · ${lastSess.tech_name||'—'}</div>
    </div>
    <div style="padding:10px;background:rgba(255,255,255,0.04);border-radius:8px">
      ${isBestLast
        ? '<div style="color:#22c55e;font-weight:700">✅ O último foi o MELHOR de todos!</div>'
        : `<div style="color:${diff>0?'#ef4444':'#22c55e'};font-weight:700">${diff>0?'⚠️ Ainda '+pct+'% acima do melhor':'✅ Dentro do melhor histórico'}</div>
           <div style="font-family:monospace;font-size:12px;color:var(--muted);margin-top:4px">Diferença: ${fmtHHMMSS(Math.abs(diff))}</div>`
      }
      <div style="color:var(--muted);font-size:11px;margin-top:6px">${total} changeovers registrados</div>
      ${firstLast!==0?`<div style="color:${firstLast<0?'#22c55e':'#fb923c'};font-size:11px;margin-top:4px">vs 1º: ${firstLast<0?'↓ Melhorou':'↑ Piorou'} ${fmtHHMMSS(Math.abs(firstLast))}</div>`:''}
    </div>`;
}

function renderCmpActivityChart(mtBySess, lastSess, bestSess) {
  const ctx = document.getElementById('chart-cmp-activity')?.getContext('2d');
  if (!ctx) return;
  if (chartCmpActivity) chartCmpActivity.destroy();

  const lastMT = mtBySess[lastSess.id]  || {};
  const bestMT = mtBySess[bestSess.id]  || {};

  const labels = STATION_ORDER;
  const lastData = STATION_ORDER.map(n => Math.round((lastMT[n]||0)));
  const bestData = STATION_ORDER.map(n => Math.round((bestMT[n]||0)));

  const shortLabels = ['Printer','SPI','Desalim.\nP&P','Alim.\nP&P','Reflow',
                       'AOI','Router','Valid.\nTestes','Qualidade','Wave\nSolder','Ferramental'];

  chartCmpActivity = new Chart(ctx, {
    type:'bar',
    data:{
      labels: shortLabels,
      datasets:[
        { label:'⏱ Último Changeover', data:lastData,
          backgroundColor:'rgba(0,212,255,0.7)', borderColor:'rgba(0,212,255,1)',
          borderWidth:1.5, borderRadius:4 },
        { label:'🏆 Melhor Histórico', data:bestData,
          backgroundColor:'rgba(34,197,94,0.5)', borderColor:'rgba(34,197,94,1)',
          borderWidth:1.5, borderRadius:4 }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{ labels:{color:'#ffffff',font:{size:12}} },
        tooltip:{ callbacks:{
          title: items => labels[items[0].dataIndex],
          label: c => {
            const v = c.raw;
            if (!v) return c.dataset.label + ': —';
            const diff = lastData[c.dataIndex] - bestData[c.dataIndex];
            const pct  = bestData[c.dataIndex] > 0 ? Math.round(diff/bestData[c.dataIndex]*100) : 0;
            return [
              c.dataset.label + ': ' + fmtHHMMSS(v),
              c.datasetIndex===0 && diff!==0 ? (diff>0?`↑ ${pct}% acima do melhor`:`↓ ${Math.abs(pct)}% abaixo do melhor`) : ''
            ].filter(Boolean);
          }
        }}
      },
      scales:{
        x:{ grid:{color:'rgba(255,255,255,0.04)'},
          ticks:{color:'#d0dff0',font:{size:10},maxRotation:35} },
        y:{ beginAtZero:true, grid:{color:'rgba(255,255,255,0.04)'},
          ticks:{ color:'#d0dff0', font:{size:10}, callback: v => fmtHHMMSS(v) } }
      }
    }
  });
}

function renderCmpTable(sessions, bestSess) {
  const tbody = document.getElementById('cmp-tbody');
  if (!tbody) return;
  const sortedDesc = [...sessions].reverse();
  tbody.innerHTML = sortedDesc.map((s,i) => {
    const idx      = sortedDesc.length - i;
    const isBest   = s.id === bestSess.id;
    const diffBest = s.total_duration_ms - bestSess.total_duration_ms;
    const prev     = i < sortedDesc.length-1 ? sortedDesc[i+1] : null;
    const diffPrev = prev ? s.total_duration_ms - prev.total_duration_ms : null;
    const dateStr  = new Date(s.created_at).toLocaleDateString('pt-BR');
    return `<tr>
      <td style="font-weight:700;color:${isBest?'#22c55e':'var(--muted)'}">${isBest?'🏆':idx+'º'}</td>
      <td style="font-size:11px">${dateStr}</td>
      <td>${s.tech_name||'—'}</td>
      <td>${s.rooms?.name||'—'}</td>
      <td style="font-family:monospace;font-weight:700;color:${isBest?'#22c55e':'#ffffff'}">${fmtHHMMSS(s.total_duration_ms)}</td>
      <td style="font-family:monospace;color:${diffBest===0?'#22c55e':diffBest>0?'#ef4444':'#22c55e'};font-size:11px">
        ${isBest?'—':diffBest>0?'+'+fmtHHMMSS(diffBest):'-'+fmtHHMMSS(Math.abs(diffBest))}</td>
      <td style="font-family:monospace;color:${diffPrev===null?'var(--muted)':diffPrev<0?'#22c55e':diffPrev>0?'#ef4444':'#fb923c'};font-size:11px">
        ${diffPrev===null?'—':diffPrev<0?'↓ '+fmtHHMMSS(Math.abs(diffPrev)):diffPrev>0?'↑ '+fmtHHMMSS(diffPrev):'='}
      </td>
      <td>${isBest?'<span class="badge badge-green">🏆 Melhor</span>':diffPrev!==null&&diffPrev<0?'<span class="badge badge-green">↓ Melhorou</span>':diffPrev!==null&&diffPrev>0?'<span class="badge badge-red">↑ Piorou</span>':'<span class="badge" style="background:rgba(255,200,0,0.1);color:#fb923c;border-color:rgba(255,200,0,0.2)">→ Igual</span>'}</td>
    </tr>`;
  }).join('');
}

/* ============================================================
   SETTINGS — Carrega targets do banco
============================================================ */
async function loadSettings() {
  const el = document.getElementById('targets-list');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;color:var(--muted);padding:16px">Carregando...</div>';
  try {
    const { data } = await db.from('station_targets')
      .select('*').order('display_order', { ascending: true });
    if (!data?.length) {
      el.innerHTML = '<div style="color:var(--muted);font-size:12px">Tabela station_targets não encontrada. Execute o SQL do database.sql no Supabase.</div>';
      return;
    }
    el.innerHTML = data.map(t => {
      const ms = t.target_ms || 600000;
      const h  = Math.floor(ms/3600000);
      const m  = Math.floor((ms%3600000)/60000);
      const s  = Math.floor((ms%60000)/1000);
      return `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
        <div style="flex:1;font-size:13px;color:#ffffff;font-weight:600">${t.station_name}</div>
        <input type="number" data-id="${t.id}" data-field="h"
          value="${h}" min="0" max="5"
          style="width:48px;text-align:center;font-family:monospace"
          class="field-input target-h" title="Horas">
        <span style="color:var(--muted)">h</span>
        <input type="number" data-id="${t.id}" data-field="m"
          value="${m}" min="0" max="59"
          style="width:48px;text-align:center;font-family:monospace"
          class="field-input target-m" title="Minutos">
        <span style="color:var(--muted)">m</span>
        <input type="number" data-id="${t.id}" data-field="s"
          value="${s}" min="0" max="59"
          style="width:48px;text-align:center;font-family:monospace"
          class="field-input target-s" title="Segundos">
        <span style="color:var(--muted)">s</span>
      </div>`;
    }).join('');
  } catch(e) { el.innerHTML = '<div style="color:#ef4444;font-size:12px">Erro: ' + e.message + '</div>'; }
}

async function saveTargets() {
  const rows = document.querySelectorAll('#targets-list [data-id]');
  const ids  = [...new Set([...rows].map(r => r.dataset.id))];
  let saved = 0;
  for (const id of ids) {
    const h = parseInt(document.querySelector(`[data-id="${id}"][data-field="h"]`)?.value || 0);
    const m = parseInt(document.querySelector(`[data-id="${id}"][data-field="m"]`)?.value || 0);
    const s = parseInt(document.querySelector(`[data-id="${id}"][data-field="s"]`)?.value || 0);
    const ms = (h*3600 + m*60 + s) * 1000;
    if (ms > 0) {
      await db.from('station_targets').update({ target_ms: ms, updated_at: new Date().toISOString() }).eq('id', id);
      saved++;
    }
  }
  showToast(`✅ ${saved} targets salvos!`, 'success');
  // Recarrega STATION_TARGETS em memória
  await reloadStationTargets();
}

async function reloadStationTargets() {
  try {
    const { data } = await db.from('station_targets')
      .select('station_name,target_ms').order('display_order');
    if (data) {
      data.forEach(t => { STATION_TARGETS[t.station_name] = Math.round(t.target_ms / 60000); });
    }
  } catch(e) {}
}

/* ============================================================
   LEAD TIME — calcula usando as 3 fases quando disponíveis
   Fórmula: setup_start → validation_end (ou end_time)
============================================================ */
function calcLeadTime(sessions) {
  const completed = sessions.filter(s => s.status === 'completed' && s.start_time && s.end_time);
  if (!completed.length) { setText('stat-leadtime', '—'); return; }

  // Calcula lead time de cada sessão: preferência setup_start→validation_end, senão start→end
  const ltValues = completed.map(s => {
    const start = s.setup_start ? new Date(s.setup_start).getTime() : new Date(s.start_time).getTime();
    const end   = s.validation_end ? new Date(s.validation_end).getTime() : new Date(s.end_time).getTime();
    return end - start;
  }).filter(v => v > 0);

  if (!ltValues.length) { setText('stat-leadtime', '—'); return; }
  const avg = ltValues.reduce((a,b)=>a+b,0) / ltValues.length;
  setText('stat-leadtime', fmtHHMMSS(Math.round(avg)));
  setText('stat-leadtime-sub', `Baseado em ${ltValues.length} CO concluído${ltValues.length!==1?'s':''}`);
}

async function openLeadTimeDetail() {
  openModal('modal-leadtime-detail');
  const tbody = document.getElementById('lt-tbody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:20px">Carregando...</td></tr>';

  try {
    const roomFilter = document.getElementById('filter-room-global')?.value || '';
    let q = db.from('changeover_sessions')
      .select('*,rooms(name,room_code,alert_limit_minutes,sku)')
      .eq('status','completed').not('end_time','is',null)
      .order('created_at',{ascending:false}).limit(100);
    if (roomFilter) q = q.eq('room_id', roomFilter);
    const { data } = await q;
    if (!data?.length) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:20px">Nenhum dado.</td></tr>';
      return;
    }

    const fmtHHMM = ms => {
      if (!ms || ms <= 0) return '—';
      const h = Math.floor(ms/3600000), m = Math.floor((ms%3600000)/60000);
      return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    };
    const fmtT = ts => ts ? new Date(ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) : '—';

    const ltArr = data.filter(s=>s.start_time&&s.end_time).map(s => {
      const start = s.setup_start ? new Date(s.setup_start).getTime() : new Date(s.start_time).getTime();
      const end   = s.validation_end ? new Date(s.validation_end).getTime() : new Date(s.end_time).getTime();
      return { ...s, lt: end - start };
    });

    const avg   = ltArr.reduce((a,b)=>a+b.lt,0)/ltArr.length;
    const best  = Math.min(...ltArr.map(s=>s.lt));
    const worst = Math.max(...ltArr.map(s=>s.lt));
    const ltAvg=document.getElementById('lt-avg'); if(ltAvg) ltAvg.textContent=fmtHHMMSS(avg);
    const ltBst=document.getElementById('lt-best'); if(ltBst) ltBst.textContent=fmtHHMMSS(best);
    const ltWst=document.getElementById('lt-worst'); if(ltWst) ltWst.textContent=fmtHHMMSS(worst);

    // Update table header to show 3 phases
    const thead = document.querySelector('#modal-leadtime-detail table thead tr');
    if (thead) thead.innerHTML = '<th>Data</th><th>Linha</th><th>Produto</th><th>Setup</th><th>Ajuste</th><th>Validação</th><th>Lead Time</th><th>Target</th><th>Status</th>';

    if (tbody) {
      tbody.innerHTML = ltArr.map(s => {
        const limMs = (s.rooms?.alert_limit_minutes||300)*60000;
        const over  = s.lt > limMs;
        return `<tr>
          <td style="font-size:11px">${new Date(s.created_at).toLocaleDateString('pt-BR')}</td>
          <td>${s.rooms?.name||'—'}</td>
          <td style="color:var(--accent);font-size:11px">${s.product||s.rooms?.sku||'—'}</td>
          <td style="font-family:monospace;color:#90b8ff">${fmtHHMM(s.setup_total_ms)}</td>
          <td style="font-family:monospace;color:#c090ff">${fmtHHMM(s.adjustment_total_ms)}</td>
          <td style="font-family:monospace;color:#ff9080">${fmtHHMM(s.validation_total_ms)}</td>
          <td style="font-family:monospace;font-weight:700;color:${over?'#ef4444':'#22c55e'}">${fmtHHMMSS(s.lt)}</td>
          <td style="font-family:monospace">${fmtHHMMSS(limMs)}</td>
          <td style="font-size:11px;color:${over?'#ef4444':'#22c55e'}">${over?'⚠️ Acima':'✅ OK'}</td>
        </tr>`;
      }).join('');
    }
  } catch(e) { console.warn('[leadtime]', e); }
}

/* ============================================================
   RESUME SESSION — retomar acompanhamento em outro dispositivo
============================================================ */
async function resumeSession() {
  const code       = (document.getElementById('resume-room-code')?.value||'').trim().toUpperCase();
  const matricula  = (document.getElementById('resume-matricula')?.value||'').trim();
  const errEl      = document.getElementById('resume-error');
  const btn        = document.getElementById('btn-resume-session');

  const showErr = (msg) => { if(errEl){errEl.textContent=msg;errEl.style.display='block';} };
  if(errEl) errEl.style.display='none';

  if (code.length < 4)         { showErr('ID deve ter pelo menos 4 caracteres.'); return; }
  if (!/^\d{6}$/.test(matricula)) { showErr('Matrícula deve ter exatamente 6 dígitos numéricos.'); return; }

  if(btn){btn.disabled=true;btn.innerHTML='<span class="spinner"></span> Verificando...';}

  try {
    // Busca a sala pelo código e verifica se a matrícula bate
    const { data: room, error: roomErr } = await db.from('rooms')
      .select('*').eq('room_code', code).eq('is_active', true).single();

    if (roomErr || !room) { showErr('ID não encontrado ou linha inativa.'); if(btn){btn.disabled=false;btn.innerHTML='▶ Retomar';} return; }

    // Verifica se a matrícula corresponde à que criou a room
    if (room.leader_matricula && room.leader_matricula !== matricula) {
      showErr('Matrícula não corresponde ao cadastro desta linha.');
      if(btn){btn.disabled=false;btn.innerHTML='▶ Retomar';} return;
    }

    // Verifica se há sessão em andamento
    const { data: sess } = await db.from('changeover_sessions')
      .select('*').eq('room_id', room.id).eq('status','in_progress')
      .order('created_at',{ascending:false}).limit(1).single();

    closeModal('modal-resume-session');
    // Loga como admin e abre o dashboard filtrado para esta linha
    saveAdminSession();
    showView('admin');
    initAdmin();
    if (sess) {
      showToast(`✅ Sessão ativa encontrada na linha ${room.name}. Acompanhando...`, 'success', 5000);
    } else {
      showToast(`ℹ️ Nenhuma sessão ativa na linha ${room.name} no momento.`, 'info', 4000);
    }
    // Filtra automaticamente para a linha em questão
    setTimeout(() => {
      const sel = document.getElementById('filter-room-global');
      if (sel) { sel.value = room.id; loadAdminStats(); loadRecentSessions(); }
    }, 800);

  } catch(e) {
    showErr('Erro de conexão. Tente novamente.');
  }
  if(btn){btn.disabled=false;btn.innerHTML='▶ Retomar';}
}

/* ============================================================
   MATRIZ CO — Aba estilo planilha Excel
============================================================ */
function initMatriz() {
  // Popula filtro de sala
  const sel = document.getElementById('mz-room');
  if (sel) {
    const cur = sel.value;
    sel.innerHTML = '<option value="">Todas as linhas</option>' +
      adminRooms.map(r=>`<option value="${r.id}">${r.room_code} — ${r.name}</option>`).join('');
    if (cur) sel.value = cur;
  }
  // Data padrão: últimos 30 dias
  const today = new Date().toISOString().slice(0,10);
  const d30 = new Date(); d30.setDate(d30.getDate()-30);
  const fromEl = document.getElementById('mz-date-from');
  const toEl   = document.getElementById('mz-date-to');
  if (fromEl && !fromEl.value) fromEl.value = d30.toISOString().slice(0,10);
  if (toEl   && !toEl.value)   toEl.value   = today;
  loadMatriz();
}

async function loadMatriz() {
  const tbody  = document.getElementById('mz-tbody');
  const sumDiv = document.getElementById('mz-summary');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="16" style="text-align:center;color:var(--accent);padding:30px;background:#0d1525">&#x23F3; Carregando dados...</td></tr>';

  const fromDate = document.getElementById('mz-date-from')?.value || '';
  const toDate   = document.getElementById('mz-date-to')?.value || '';
  const roomId   = document.getElementById('mz-room')?.value || '';

  try {
    // Busca TODAS as sessoes (sem filtro de status) para nao perder dados historicos
    let q = db.from('changeover_sessions')
      .select('*,rooms(name,room_code,alert_limit_minutes,sku,leader_name)')
      .order('start_time', {ascending:true, nullsFirst:false});

    if (roomId) q = q.eq('room_id', roomId);
    // Usa created_at para o filtro (sempre preenchido)
    if (fromDate) q = q.gte('created_at', fromDate + 'T00:00:00');
    if (toDate)   q = q.lte('created_at', toDate   + 'T23:59:59');

    const { data, error } = await q.limit(500);

    if (error) {
      console.error('[loadMatriz] error:', error);
      tbody.innerHTML = `<tr><td colspan="16" style="text-align:center;color:#ef4444;padding:40px;background:#0d1525">&#x274C; Erro: ${error.message}</td></tr>`;
      if (sumDiv) sumDiv.style.display = 'none';
      return;
    }

    if (!data?.length) {
      // Diagnosico: mostra ultimas sessoes do banco independente de periodo
      const { data: allData } = await db.from('changeover_sessions')
        .select('id,status,start_time,created_at,room_id')
        .order('created_at',{ascending:false}).limit(5);

      const diagMsg = allData?.length
        ? `Nenhum dado no per&#237;odo. &#218;ltimas sess&#245;es: <em>${allData.map(s=>s.status+' &mdash; '+(s.created_at||'?').slice(0,10)).join(' | ')}</em>`
        : 'Nenhuma sess&#227;o encontrada no banco de dados.';

      tbody.innerHTML = `<tr><td colspan="16" style="text-align:center;color:var(--muted);padding:40px;background:#0d1525;font-size:13px">${diagMsg}</td></tr>`;
      if (sumDiv) sumDiv.style.display = 'none';
      return;
    }

    const fmtHHMM = ms => {
      if (!ms || ms <= 0) return '&mdash;';
      const absMs = Math.abs(ms);
      const h = Math.floor(absMs/3600000);
      const m = Math.floor((absMs%3600000)/60000);
      // Sempre HH:MM — arredonda para cima se tiver segundos sobrando
      const mRounded = Math.round(absMs/60000); // total em minutos
      const hh = Math.floor(mRounded/60);
      const mm = mRounded % 60;
      return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
    };
    const fmtTime = ts => ts ? new Date(ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) : '&mdash;';
    const fmtDateBR = ts => {
      if (!ts) return '&mdash;';
      return new Date(ts).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit'});
    };

        // ── Para sessões sem dados de fase, busca nos machine_times ──────────
    const sessionIds = data.map(s => s.id);
    let mtBySession = {};
    if (sessionIds.length > 0) {
      try {
        const { data: mtData } = await db.from('machine_times')
          .select('session_id,machine_name,start_time,end_time,duration_ms')
          .in('session_id', sessionIds);
        if (mtData) {
          mtData.forEach(mt => {
            if (!mtBySession[mt.session_id]) mtBySession[mt.session_id] = [];
            mtBySession[mt.session_id].push(mt);
          });
        }
      } catch(e) { console.warn('[loadMatriz] machine_times fetch:', e); }
    }

    // Helper: extrai start/end de uma atividade específica
    const getMT = (sessId, machineName) => {
      const times = mtBySession[sessId] || [];
      return times.find(mt => mt.machine_name === machineName) || null;
    };

    let onTime = 0, delay = 0, totalCoMs = 0;

    // ── AGRUPAMENTO: cada room_id vira UMA linha na Matriz CO ────────────
    // Extrai fases de cada sessão individualmente
    const sessPhases = data.map(s => {
      const mtDesalim = getMT(s.id, 'Desalimentação Pick & Place');
      const mtAlim    = getMT(s.id, 'Alimentação Pick & Place');
      const mtAjuste  = getMT(s.id, 'Ajuste de Linha');
      const mtValid   = getMT(s.id, 'Validação nos Testes');

      const setupStart = s.setup_start  || mtDesalim?.start_time || null;
      const setupEnd   = s.setup_end    || mtAlim?.end_time       || null;
      const adjStart   = s.adjustment_start   || mtAjuste?.start_time || null;
      const adjEnd     = s.adjustment_end     || mtAjuste?.end_time   || null;
      const valStart   = s.validation_start   || mtValid?.start_time || null;
      const valEnd     = s.validation_end     || mtValid?.end_time   || null;
      return { s, setupStart, setupEnd, adjStart, adjEnd, valStart, valEnd };
    });

    // Agrupa por room_id: pega o primeiro valor não-nulo de cada fase
    const grouped = {};
    const groupOrder = [];
    sessPhases.forEach(({ s, setupStart, setupEnd, adjStart, adjEnd, valStart, valEnd }) => {
      const key = s.room_id || s.id; // cada room_id = 1 linha
      if (!grouped[key]) {
        groupOrder.push(key);
        grouped[key] = {
          s, // sessão base (meta, nome da linha, etc.)
          setupStart: null, setupEnd: null,
          adjStart: null, adjEnd: null,
          valStart: null, valEnd: null
        };
      }
      const g = grouped[key];
      // Pega o primeiro timestamp não-nulo de cada campo
      if (!g.setupStart && setupStart) g.setupStart = setupStart;
      if (!g.setupEnd   && setupEnd)   g.setupEnd   = setupEnd;
      if (!g.adjStart   && adjStart)   g.adjStart   = adjStart;
      if (!g.adjEnd     && adjEnd)     g.adjEnd     = adjEnd;
      if (!g.valStart   && valStart)   g.valStart   = valStart;
      if (!g.valEnd     && valEnd)     g.valEnd     = valEnd;
    });

    tbody.innerHTML = groupOrder.map((key, rowIdx) => {
      const { s, setupStart, setupEnd, adjStart, adjEnd, valStart, valEnd } = grouped[key];

      // Totais de cada fase
      const calcMs = (start, end) => {
        if (!start || !end) return null;
        // Trunca para minutos — garante que o cálculo bate com o display HH:MM
        // Ex: 10:30:45 → 10:32:15 exibe como 10:30 → 10:32 = 2min (não 1min30s)
        const d1 = new Date(start);
        const d2 = new Date(end);
        d1.setSeconds(0, 0);
        d2.setSeconds(0, 0);
        const diff = d2.getTime() - d1.getTime();
        const c = diff >= 0 ? diff : diff + 86400000;
        return c > 0 ? c : null;
      };
      const setupTotalMs = calcMs(setupStart, setupEnd);
      const adjTotalMs   = calcMs(adjStart, adjEnd);
      const valTotalMs   = calcMs(valStart, valEnd);

      const limMs = (s.rooms?.alert_limit_minutes||300)*60000;

      // CO Total = Validation End − Setup Start
      // ── CO Total = Val. End − Setup Start (fórmula correta do changeover)
      // setupStart e valEnd são do grupo fundido (todos os machine_times da room_id)
      let coTotal = 0;
      if (setupStart && valEnd) {
        // Fórmula principal: fim da Validação − início da Desalimentação
        const tStart = new Date(setupStart).getTime();
        const tEnd   = new Date(valEnd).getTime();
        const diffMs = tEnd - tStart;
        // Suporte a virada de meia-noite
        coTotal = diffMs >= 0 ? diffMs : diffMs + 86400000;
        if (coTotal < 0) coTotal = 0;
      } else if (setupStart && adjEnd) {
        // Fallback: se não tem validação, usa fim do Adjustment
        const tStart = new Date(setupStart).getTime();
        const tEnd   = new Date(adjEnd).getTime();
        const diffMs = tEnd - tStart;
        coTotal = diffMs >= 0 ? diffMs : diffMs + 86400000;
        if (coTotal < 0) coTotal = 0;
      } else if (s.total_duration_ms) {
        coTotal = s.total_duration_ms;
      } else if (s.start_time && s.end_time) {
        coTotal = new Date(s.end_time).getTime() - new Date(s.start_time).getTime();
      }

      const gainLoss = coTotal > 0 ? limMs - coTotal : null;
      const isDelay  = coTotal > 0 && coTotal > limMs;
      if (coTotal > 0) {
        if (isDelay) delay++; else onTime++;
        totalCoMs += coTotal;
      }

      // Gain/Loss: Target - CO Total em formato HH:MM
      // Positivo = abaixo do target (ganho), Negativo = acima do target (perda)
      const fmtGainHHMM = (ms) => {
        const totalMin = Math.round(Math.abs(ms) / 60000);
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
      };
      const gainStr = gainLoss !== null
        ? (gainLoss > 0
            ? `<span style="color:#22c55e;font-weight:700">+${fmtGainHHMM(gainLoss)}</span>`
            : gainLoss < 0
              ? `<span style="color:#ef4444;font-weight:700">-${fmtGainHHMM(gainLoss)}</span>`
              : `<span style="color:#fb923c;font-weight:700">00:00</span>`)
        : '—';

      const statusBg = isDelay ? 'rgba(239,68,68,0.06)' : (rowIdx%2===0 ? '#0d1525' : '#0f1830');
      const product  = s.product || s.rooms?.sku || '—';
      const customer = s.rooms?.leader_name || '—';

      return `<tr style="background:${statusBg}">
        <td style="border:1px solid #1a2a3a;padding:5px 8px;white-space:nowrap;color:#a8b8d0;font-size:11px">${fmtDateBR(s.created_at)}</td>
        <td style="border:1px solid #1a2a3a;padding:5px 8px;font-weight:600;color:#d0dff0">${s.rooms?.name||'—'}</td>
        <td style="border:1px solid #1a2a3a;padding:5px 8px;color:#a8b8d0;font-size:11px">${customer}</td>
        <td style="border:1px solid #1a2a3a;padding:5px 8px;color:var(--accent);font-weight:600;font-size:11px">${product}</td>
        <!-- SMT LINE PREP -->
        <td style="border:1px solid #1a3a7a;padding:5px 8px;font-family:monospace;color:#90b8ff;background:rgba(0,40,100,0.15)">${fmtTime(setupStart)}</td>
        <td style="border:1px solid #1a3a7a;padding:5px 8px;font-family:monospace;color:#90b8ff;background:rgba(0,40,100,0.15)">${fmtTime(setupEnd)}</td>
        <td style="border:1px solid #1a3a7a;padding:5px 8px;font-family:monospace;color:#b8d8ff;font-weight:700;background:rgba(0,40,100,0.2)">${fmtHHMM(setupTotalMs)}</td>
        <!-- ADJUSTMENT -->
        <td style="border:1px solid #5a2a8a;padding:5px 8px;font-family:monospace;color:#c090ff;background:rgba(60,20,100,0.15)">${fmtTime(adjStart)}</td>
        <td style="border:1px solid #5a2a8a;padding:5px 8px;font-family:monospace;color:#c090ff;background:rgba(60,20,100,0.15)">${fmtTime(adjEnd)}</td>
        <td style="border:1px solid #5a2a8a;padding:5px 8px;font-family:monospace;color:#d8b8ff;font-weight:700;background:rgba(60,20,100,0.2)">${fmtHHMM(adjTotalMs)}</td>
        <!-- VALIDATION -->
        <td style="border:1px solid #7a2a1a;padding:5px 8px;font-family:monospace;color:#ff9080;background:rgba(100,20,10,0.15)">${fmtTime(valStart)}</td>
        <td style="border:1px solid #7a2a1a;padding:5px 8px;font-family:monospace;color:#ff9080;background:rgba(100,20,10,0.15)">${fmtTime(valEnd)}</td>
        <td style="border:1px solid #7a2a1a;padding:5px 8px;font-family:monospace;color:#ffb8a8;font-weight:700;background:rgba(100,20,10,0.2)">${fmtHHMM(valTotalMs)}</td>
        <!-- RESULT -->
        <td style="border:1px solid #6a1a1a;padding:5px 8px;font-family:monospace;font-weight:700;color:${isDelay?'#ef4444':'#22c55e'};background:rgba(80,0,0,0.15)">${fmtHHMM(coTotal)}</td>
        <td style="border:1px solid #6a1a1a;padding:5px 8px;font-family:monospace;color:#d0dff0;background:rgba(80,0,0,0.1)">${fmtHHMM(limMs)}</td>
        <td style="border:1px solid #6a1a1a;padding:5px 8px;text-align:center;background:rgba(80,0,0,0.1)">${gainStr}</td>
      </tr>`;
    }).join('');

    // Summary — usa apenas sessões com CO Total calculado (onTime + delay)
    if (sumDiv) {
      const totalCalc = onTime + delay; // sessões que têm tempo real calculado
      const pctOnTime = totalCalc > 0 ? Math.round(onTime / totalCalc * 100) : 0;
      const pctDelay  = totalCalc > 0 ? Math.round(delay  / totalCalc * 100) : 0;
      sumDiv.style.display = '';
      setText('mz-total-co', totalCalc);
      setText('mz-on-time', onTime + (onTime > 0 ? ' (' + pctOnTime + '%)' : ''));
      setText('mz-delay',   delay  + (delay  > 0 ? ' (' + pctDelay  + '%)' : ''));
      const avgCoMs = totalCalc > 0 ? totalCoMs / totalCalc : 0;
      setText('mz-avg-co', fmtHHMM(avgCoMs));
    }

  } catch(e) { console.warn('[loadMatriz]', e); }
}

function exportMatrizExcel() {
  if (typeof XLSX === 'undefined') { showToast('XLSX não carregado.','error'); return; }
  const table = document.getElementById('mz-table');
  if (!table) return;
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.table_to_sheet(table);
  // Largura colunas
  ws['!cols'] = [8,8,12,14,8,8,8,8,8,8,8,8,8,8,8,8].map(w=>({wch:w}));
  XLSX.utils.book_append_sheet(wb, ws, 'Matriz CO');
  XLSX.writeFile(wb, `MatrizCO_${new Date().toISOString().slice(0,10)}.xlsx`);
  showToast('✅ Excel exportado!','success');
}

// operator.js v5.0 — 3 Fases CO + SKU automático + Ajuste de Linha

let opRoom         = null;
let coSession      = null;
let machines       = [];
let machineIdx     = -1;
let totalTimer     = null;
let machineClocks  = {};

// Atividades SMT com "Ajuste de Linha" no lugar correto
const MACHINES_SMT = [
  'Printer',
  'SPI',
  'Desalimentação Pick & Place',
  'Alimentação Pick & Place',
  'Reflow',
  'AOI',
  'Router',
  'Ajuste de Linha',
  'Validação nos Testes',
  'Qualidade',
  'Wave Solder',
  'Check de Ferramental'
];

// Atividades que marcam timestamps especiais das fases
const SETUP_START_ACTIVITY   = 'Desalimentação Pick & Place'; // início SMT LINE PREP
const SETUP_END_ACTIVITY     = 'Alimentação Pick & Place';    // fim SMT LINE PREP
const ADJUSTMENT_ACTIVITY    = 'Ajuste de Linha';             // fase ADJUSTMENT
const VALIDATION_ACTIVITY    = 'Validação nos Testes';        // fase VALIDATION

/* -------- Init -------------------------------------------- */
/* ============================================================
   RESTAURAR SESSÃO DO BANCO (multi-dispositivo)
   Chamado quando operador acessa em outro device com sessão ativa
============================================================ */
async function initOperatorFromDB(room, session) {
  opRoom = room;
  setText('op-room-badge', opRoom.room_code);
  setText('op-line-name',  opRoom.name);

  // Mostra tela de carregamento enquanto sincroniza com o banco
  showOpScreen('s-machines');
  const grid = document.getElementById('machines-grid');
  if (grid) grid.innerHTML = '<div style="text-align:center;padding:40px;color:var(--accent)">&#x23F3; Sincronizando sessão...</div>';

  coSession = { id: session.id };

  // Busca machine_times desta sessão para saber o que já foi feito
  let completedMachines = {};
  try {
    const { data: mts } = await db.from('machine_times')
      .select('*')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true });

    (mts || []).forEach(mt => {
      completedMachines[mt.machine_name] = {
        done: !!mt.completed,
        ms:   mt.duration_ms || 0,
        obs:  mt.observation || '',
        startTime: mt.start_time,
        endTime:   mt.end_time
      };
    });
  } catch(e) { console.warn('[initOperatorFromDB] machine_times:', e); }

  // Reconstrói array de máquinas com dados do banco
  machines = MACHINES_SMT.map(n => {
    const mt = completedMachines[n];
    if (mt) return { name: n, done: mt.done, ms: mt.ms, obs: mt.obs };
    return { name: n, done: false, ms: 0, obs: '' };
  });

  // Encontra qual máquina está ativa agora (última iniciada mas não concluída)
  machineIdx = -1;
  machineClocks = {};
  try {
    const { data: activeMT } = await db.from('machine_times')
      .select('*')
      .eq('session_id', session.id)
      .is('end_time', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let resolvedMT = activeMT;

    // Se banco não tem machine_time ativa, tenta recuperar do backup local (rede falhou antes)
    if (!resolvedMT) {
      const pending = Store.get('co_pending_machine');
      if (pending && pending.session_id === session.id) {
        console.log('[sync] Recuperando machine_time do backup local:', pending.machine_name);
        try {
          const { data: reinserted } = await db.from('machine_times').insert({
            session_id:   pending.session_id,
            machine_id:   String(pending.machine_idx),
            machine_name: pending.machine_name,
            start_time:   pending.start_time,
            end_time:     null,
            duration_ms:  null,
            observation:  '',
            completed:    false
          }).select().single();
          if (reinserted) {
            resolvedMT = reinserted;
            Store.del('co_pending_machine');
            showToast('✅ Atividade recuperada com sucesso!', 'success', 3000);
          }
        } catch(e2) { console.warn('[sync] Falha ao recuperar backup:', e2); }
      }
    }

    if (resolvedMT) {
      const idx = MACHINES_SMT.indexOf(resolvedMT.machine_name);
      if (idx >= 0) {
        machineIdx = idx;
        const startedAt = new Date(resolvedMT.start_time).getTime();
        if (startedAt && startedAt > 1000000000000) {
          machineClocks[idx] = {
            startedAt,
            accMs: 0,
            startIso: resolvedMT.start_time
          };
          console.log('[sync] Máquina ativa:', resolvedMT.machine_name,
            '→ rodando há', Math.round((Date.now()-startedAt)/1000)+'s');
        } else {
          machineClocks[idx] = { startedAt: Date.now(), accMs: 0, startIso: new Date().toISOString() };
          console.warn('[initOperatorFromDB] start_time inválido:', resolvedMT.start_time);
        }
      }
    }
  } catch(e) { console.warn('[initOperatorFromDB] active machine_time:', e); }

  // Timer global: usa start_time da SESSÃO (não reseta!)
  const sessionStart = new Date(session.start_time).getTime();
  // Garante que o start_time é válido e não é epoch zero (null convertido)
  const validStart = (sessionStart && sessionStart > 1000000000000) ? sessionStart : Date.now();
  Store.set('co_total_start', validStart);
  console.log('[sync] Timer global: iniciou em', new Date(validStart).toLocaleTimeString(), '→ elapsed', Math.round((Date.now()-validStart)/1000)+'s');

  // Preenche campos de info
  const techEl = document.getElementById('inp-tech-name');
  if (techEl) techEl.value = session.tech_name || '';
  const shEl = document.getElementById('inp-shift');
  if (shEl) shEl.value = session.shift || '';
  const prodEl = document.getElementById('inp-product');
  if (prodEl) {
    prodEl.value = session.product || opRoom.sku || '';
    prodEl.readOnly = true;
    prodEl.style.opacity = '0.7';
  }

  // Salva estado local para continuidade na mesma aba
  saveCurrentState();
  resumeTotalTimer(validStart);  // passa o startTs do banco diretamente
  renderMachineGrid();

  const done = machines.filter(m => m.done).length;
  updateProgress(5 + Math.round((done / machines.length) * 90));

  // Se havia máquina ativa → abre cronômetro direto (não fica na lista "aguardando")
  if (machineIdx >= 0 && machineClocks[machineIdx]?.startedAt) {
    const activeName = MACHINES_SMT[machineIdx] || '';
    showToast('✅ Sessão sincronizada! ' + activeName + ' em andamento.', 'success', 5000);

    // Mostra tela do cronômetro com o tempo correto já rodando
    const timerNameEl = document.getElementById('timer-machine-name');
    if (timerNameEl) timerNameEl.textContent = activeName;

    const obsEl = document.getElementById('inp-obs');
    if (obsEl) { obsEl.value = machines[machineIdx].obs || ''; updateObsCount(); }

    // Inicia loop do cronômetro da máquina
    clearInterval(window._machineTimerInterval);
    window._machineTimerInterval = setInterval(() => {
      const el = document.getElementById('timer-display');
      if (el) el.textContent = StopwatchTimer.format(getMachineElapsed(machineIdx));
    }, 500);
    const el = document.getElementById('timer-display');
    if (el) el.textContent = StopwatchTimer.format(getMachineElapsed(machineIdx));

    showOpScreen('s-timer');
  } else {
    showOpScreen('s-machines');
    showToast('✅ Sessão sincronizada! Continuando de onde parou.', 'success', 4000);
  }
}

async function initOperator() {
  opRoom = getOpRoom();
  if (!opRoom) { showView('login-op'); return; }
  setText('op-room-badge', opRoom.room_code);
  setText('op-line-name',  opRoom.name);

  // Tenta buscar sessão ativa no banco ANTES de usar estado local
  // Isso garante sync entre dispositivos (celular abre o que o PC iniciou)
  const matricula = Store.get('op_matricula') || '';
  if (matricula && opRoom.id) {
    try {
      // Busca por matrícula primeiro
      let { data: activeSess } = await db.from('changeover_sessions')
        .select('*')
        .eq('room_id', opRoom.id)
        .eq('tech_matricula', matricula)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeSess) {
        console.log('[initOperator] Sessão ativa encontrada no banco, sincronizando...');
        await initOperatorFromDB(opRoom, activeSess);
        return;
      }
    } catch(e) {
      console.warn('[initOperator] Erro ao buscar sessão ativa:', e);
    }
  }

  // Sem sessão no banco: verifica se há sessão local pendente para sincronizar
  const pendingSess = Store.get('co_pending_session');
  const matriculaLocal = Store.get('op_matricula') || '';
  if (pendingSess && pendingSess.room_id === opRoom.id &&
      pendingSess.tech_matricula === matriculaLocal) {
    try {
      const { room_code, _savedAt, ...payload } = pendingSess;
      const { data: synced } = await db.from('changeover_sessions')
        .insert(payload).select().single();
      if (synced) {
        Store.del('co_pending_session');
        console.log('[initOperator] Sessão local sincronizada:', synced.id);
        await initOperatorFromDB(opRoom, synced);
        return;
      }
    } catch(e) { console.warn('[initOperator] Falha ao sincronizar sessão local:', e); }
  }

  // Restaura estado local (mesmo dispositivo, aba que fechou ou recarregou)
  const saved = getCoState();
  if (saved && saved.roomCode === opRoom.room_code) {
    restoreState(saved);
    // Se a sessão salva é local, tenta sincronizar em background
    if (saved.sessionId?.startsWith('local_')) {
      trySyncLocalSession().catch(() => {});
    }
    return;
  }

  // Novo changeover
  machines      = MACHINES_SMT.map(n => ({ name:n, done:false, ms:0, obs:'' }));
  machineIdx    = -1;
  machineClocks = {};
  coSession     = null;

  const h = new Date().getHours();
  const shiftEl = document.getElementById('inp-shift');
  if (shiftEl) {
    if      (h >= 6  && h < 14) shiftEl.value = 'Manhã';
    else if (h >= 14 && h < 22) shiftEl.value = 'Tarde';
    else                        shiftEl.value = 'Noite';
  }

  const prodEl = document.getElementById('inp-product');
  if (prodEl) {
    prodEl.value = opRoom.sku || '';
    prodEl.readOnly = !!opRoom.sku;
    if (opRoom.sku) prodEl.style.opacity = '0.7';
  }

  showOpScreen('s-info');
  updateProgress(0);
}

/* -------- Telas ------------------------------------------- */
function showOpScreen(id) {
  document.querySelectorAll('.op-screen').forEach(s =>
    s.classList.toggle('active', s.id === id));
}
function updateProgress(pct) {
  const bar = document.getElementById('op-progress-bar');
  if (bar) bar.style.width = pct + '%';
}

/* -------- Timer Global ------------------------------------ */
function startTotalTimer() {
  clearInterval(totalTimer); totalTimer = null;
  const startTs = Store.get('co_total_start') || Date.now();
  Store.set('co_total_start', startTs);
  totalTimer = setInterval(() => {
    const el = document.getElementById('total-elapsed');
    if (el) el.textContent = StopwatchTimer.format(Date.now() - startTs);
  }, 500);
}
function resumeTotalTimer(forcedStartTs) {
  // forcedStartTs: quando vem do banco (sync entre dispositivos), ignora localStorage
  clearInterval(totalTimer); totalTimer = null;
  const startTs = forcedStartTs || Store.get('co_total_start') || Date.now();
  Store.set('co_total_start', startTs);
  totalTimer = setInterval(() => {
    const el = document.getElementById('total-elapsed');
    if (el) el.textContent = StopwatchTimer.format(Date.now() - startTs);
  }, 500);
}
function getTotalElapsed() {
  const startTs = Store.get('co_total_start');
  return startTs ? Date.now() - startTs : 0;
}

/* -------- Tempo atual de uma máquina ---------------------- */
function getMachineElapsed(idx) {
  const clk = machineClocks[idx];
  if (!clk) return machines[idx]?.ms || 0;
  if (clk.startedAt) return (Date.now() - clk.startedAt) + clk.accMs;
  return clk.accMs;
}

/* -------- Tela 1: Dados ----------------------------------- */
async function startChangeover() {
  const techName  = document.getElementById('inp-tech-name').value.trim();
  const shift     = document.getElementById('inp-shift').value;
  const product   = document.getElementById('inp-product').value.trim() || opRoom.sku || '';
  const coType    = document.getElementById('inp-co-type').value;
  const matricula = Store.get('op_matricula') || '';

  if (!techName || !shift) {
    showToast('Preencha todos os campos obrigatórios.', 'error'); return;
  }

  // Desativa botão para evitar duplo-clique
  const btnStart = document.getElementById('btn-start-co');
  if (btnStart) { btnStart.disabled = true; btnStart.textContent = 'Criando sessão...'; }

  Store.set('co_total_start', Date.now());
  startTotalTimer();

  // AGUARDA a sessão ser criada antes de mostrar a grid
  // Isso garante que coSession.id seja o ID real do banco antes de qualquer machine_time
  await createSession({ techName, shift, product, coType, matricula });

  if (btnStart) { btnStart.disabled = false; btnStart.textContent = 'Iniciar Changeover'; }

  renderMachineGrid();
  showOpScreen('s-machines');
  updateProgress(5);
}

async function createSession(info) {
  const now = new Date().toISOString();

  const payload = {
    room_id:         opRoom.id,
    tech_name:       info.techName,
    tech_matricula:  info.matricula || null,
    sector:          opRoom.name,
    shift:           info.shift,
    product:         info.product,
    changeover_type: info.coType,
    start_time:      now,
    status:          'in_progress'
  };

  // Salva no localStorage ANTES de tentar o banco (backup de recuperação)
  Store.set('co_pending_session', {
    ...payload,
    room_code: opRoom.room_code,
    _savedAt: Date.now()
  });

  // Tenta inserir no banco com até 3 tentativas
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { data, error } = await db.from('changeover_sessions')
        .insert(payload).select().single();
      if (!error && data) {
        coSession = data;
        Store.del('co_pending_session'); // banco confirmou → limpa backup
        console.log('[session] Criada no banco:', coSession.id);
        saveCurrentState();
        return;
      }
      if (error) console.warn(`[session] Tentativa ${attempt} falhou:`, error.message);
    } catch(e) {
      console.warn(`[session] Tentativa ${attempt} erro:`, e);
    }
    if (attempt < 3) await new Promise(r => setTimeout(r, 800 * attempt));
  }

  // Todas as tentativas falharam — sessão fica local por ora
  coSession = { id: 'local_' + Date.now(), ...payload };
  showToast('⚠️ Sem conexão — cronômetro iniciado localmente. Será sincronizado automaticamente.', 'warning', 7000);
  saveCurrentState();
}

/* -------- Sincroniza sessão local com o banco (se necessário) -------- */
async function trySyncLocalSession() {
  if (!coSession?.id?.startsWith('local_')) return false; // já é real

  const pending = Store.get('co_pending_session');
  if (!pending) return false;

  try {
    const { room_code, _savedAt, ...payload } = pending;
    const { data, error } = await db.from('changeover_sessions')
      .insert(payload).select().single();

    if (!error && data) {
      const oldLocalId = coSession.id;
      coSession = data;
      Store.del('co_pending_session');

      // Atualiza o backup de machine_time pendente se tiver o ID local antigo
      const pm = Store.get('co_pending_machine');
      if (pm && pm.session_id === oldLocalId) {
        pm.session_id = data.id;
        Store.set('co_pending_machine', pm);
      }

      console.log('[sync] Sessão local sincronizada:', data.id);
      saveCurrentState();
      return true;
    }
  } catch(e) {
    console.warn('[sync] Falha ao sincronizar sessão local:', e);
  }
  return false;
}

/* -------- Tela 2: Grid de Máquinas ----------------------- */
function renderMachineGrid() {
  const grid = document.getElementById('machines-grid');
  if (!grid) return;

  const done  = machines.filter(m => m.done).length;
  const total = machines.length;
  setText('machines-done-count',  done);
  setText('machines-total-count', total);

  const btnFin = document.getElementById('btn-finish-all');
  if (btnFin) btnFin.style.display = done > 0 ? 'block' : 'none';

  // Cores especiais por tipo de atividade
  const phaseColor = name => {
    if (name === ADJUSTMENT_ACTIVITY)  return 'rgba(251,146,60,0.15)';
    if (name === VALIDATION_ACTIVITY)  return 'rgba(168,85,247,0.15)';
    if ([SETUP_START_ACTIVITY, SETUP_END_ACTIVITY].includes(name)) return 'rgba(0,212,255,0.08)';
    return '';
  };

  grid.innerHTML = machines.map((m, i) => {
    const elapsed   = getMachineElapsed(i);
    const isRunning = machineClocks[i]?.startedAt != null && !m.done;
    const isDone    = m.done;
    let statusClass = '', statusText = 'Aguardando', timeHtml = '';
    if (isDone) {
      statusClass = 'done'; statusText = '✅ Concluída';
      timeHtml = `<div class="machine-time">${fmtMs(m.ms)}</div>`;
    } else if (isRunning || elapsed > 0) {
      statusClass = isRunning ? 'running' : 'paused-running';
      statusText  = isRunning ? '▶ Em andamento' : '⏸ Pausado';
      timeHtml    = `<div class="machine-time" id="mt-${i}">${StopwatchTimer.format(elapsed)}</div>`;
    }
    const bg = phaseColor(m.name);
    const bgStyle = bg ? `style="background:${bg}"` : '';
    return `
      <div class="machine-card ${statusClass}" id="mc-${i}" onclick="selectMachine(${i})" ${bgStyle}>
        <div class="machine-check">✓</div>
        <div class="machine-name">${m.name}</div>
        <div class="machine-status">${statusText}</div>
        ${timeHtml}
      </div>`;
  }).join('');

  clearInterval(window._gridRefresh);
  const anyRunning = machines.some((m,i) => !m.done && machineClocks[i]?.startedAt);
  if (anyRunning) {
    window._gridRefresh = setInterval(() => {
      machines.forEach((m, i) => {
        if (!m.done && machineClocks[i]?.startedAt) {
          const el = document.getElementById(`mt-${i}`);
          if (el) el.textContent = StopwatchTimer.format(getMachineElapsed(i));
        }
      });
    }, 1000);
  }
}

/* -------- Seleciona Máquina ------------------------------- */
async function selectMachine(idx) {
  if (machines[idx].done) {
    showToast(`✅ ${machines[idx].name}: ${fmtMs(machines[idx].ms)}`, 'success');
    return;
  }
  clearInterval(window._gridRefresh);
  machineIdx = idx;

  const isFirstStart = !machineClocks[idx];
  const isResume     = machineClocks[idx] && !machineClocks[idx].startedAt;

  if (isFirstStart) {
    const nowTs = new Date().toISOString();
    machineClocks[idx] = { startedAt: Date.now(), accMs: 0, startIso: nowTs };

    // Se sessão ainda é local, tenta sincronizar com o banco antes de salvar machine_time
    if (coSession?.id?.startsWith('local_')) {
      await trySyncLocalSession();
    }

    // ── Salva backup local ANTES de tentar o banco (garante recuperação se rede falhar)
    if (coSession?.id && !coSession.id.startsWith('local_')) {
      Store.set('co_pending_machine', {
        session_id:   coSession.id,
        machine_idx:  idx,
        machine_name: machines[idx].name,
        start_time:   nowTs
      });

      // ── Grava machine_times no banco IMEDIATAMENTE (end_time=null)
      db.from('machine_times').insert({
        session_id:   coSession.id,
        machine_id:   String(idx),
        machine_name: machines[idx].name,
        start_time:   nowTs,
        end_time:     null,
        duration_ms:  null,
        observation:  '',
        completed:    false
      }).then(({ error }) => {
        if (error) {
          console.warn('[machine_times start]', error);
          showToast('⚠️ Conexão instável — atividade salva localmente.', 'warning', 5000);
        } else {
          Store.del('co_pending_machine'); // banco confirmou, limpa backup
          console.log('[sync] machine_time criado no banco:', machines[idx].name);
        }
      });
    }

    // ── Marcar fases especiais na sessão ──
    if (coSession?.id) {
      if (machines[idx].name === SETUP_START_ACTIVITY)
        db.from('changeover_sessions').update({ setup_start: nowTs }).eq('id', coSession.id).then(() => {});
      if (machines[idx].name === ADJUSTMENT_ACTIVITY)
        db.from('changeover_sessions').update({ adjustment_start: nowTs }).eq('id', coSession.id).then(() => {});
      if (machines[idx].name === VALIDATION_ACTIVITY)
        db.from('changeover_sessions').update({ validation_start: nowTs }).eq('id', coSession.id).then(() => {});
    }

  } else if (isResume) {
    // Retomada após voltar à lista sem concluir — sem re-inserir no banco
    machineClocks[idx].startedAt = Date.now();
  }

  document.getElementById('timer-machine-name').textContent = machines[idx].name;

  // Limpa timer anterior e reinicia com o tempo acumulado
  clearInterval(window._machineTimerInterval);
  window._machineTimerInterval = setInterval(() => {
    const el = document.getElementById('timer-display');
    if (el) el.textContent = StopwatchTimer.format(getMachineElapsed(idx));
  }, 500);

  const el = document.getElementById('timer-display');
  if (el) el.textContent = StopwatchTimer.format(getMachineElapsed(idx));

  const obsEl = document.getElementById('inp-obs');
  if (obsEl) { obsEl.value = machines[idx].obs || ''; updateObsCount(); }

  showOpScreen('s-timer');
}

/* -------- Voltar à lista ---------------------------------- */
function backToMachines() {
  clearInterval(window._machineTimerInterval);
  renderMachineGrid();
  showOpScreen('s-machines');
  machineIdx = -1;
}

/* -------- Concluir Máquina -------------------------------- */
async function finishMachine() {
  if (machineIdx < 0) return;
  const idx     = machineIdx;
  const elapsed = getMachineElapsed(idx);

  // Para o clock desta máquina
  if (machineClocks[idx]) machineClocks[idx].startedAt = null;

  const obs = document.getElementById('inp-obs')?.value || '';
  machines[idx] = { ...machines[idx], done:true, ms:elapsed, obs };

  clearInterval(window._machineTimerInterval);

  const nowTs = new Date().toISOString();
  const machineName = machines[idx].name;

  // ── Marcar setup_end (Alimentação P&P) ──
  if (machineName === SETUP_END_ACTIVITY && coSession?.id) {
    const sid = coSession.id;
    db.from('changeover_sessions').select('setup_start').eq('id', sid).single().then(({data}) => {
      const setupMs = data?.setup_start ? Date.now() - new Date(data.setup_start).getTime() : null;
      db.from('changeover_sessions').update({
        setup_end: nowTs,
        setup_total_ms: setupMs
      }).eq('id', sid).then(() => {});
    });
  }

  // ── Marcar adjustment_end (Ajuste de Linha) ──
  if (machineName === ADJUSTMENT_ACTIVITY && coSession?.id) {
    const sid = coSession.id;
    db.from('changeover_sessions').select('adjustment_start').eq('id', sid).single().then(({data}) => {
      const adjMs = data?.adjustment_start ? Date.now() - new Date(data.adjustment_start).getTime() : null;
      db.from('changeover_sessions').update({
        adjustment_end: nowTs,
        adjustment_total_ms: adjMs
      }).eq('id', sid).then(() => {});
    });
  }

  // ── Marcar validation_end (Validação nos Testes) ──
  if (machineName === VALIDATION_ACTIVITY && coSession?.id) {
    const sid = coSession.id;
    db.from('changeover_sessions').select('validation_start').eq('id', sid).single().then(({data}) => {
      const valMs = data?.validation_start ? Date.now() - new Date(data.validation_start).getTime() : null;
      db.from('changeover_sessions').update({
        validation_end: nowTs,
        validation_total_ms: valMs
      }).eq('id', sid).then(() => {});
    });
  }

  // Salva machine_time no banco
  // UPDATE no registro aberto (criado pelo selectMachine) → mantém start_time real
  // Fallback INSERT se não existia (sessão offline/antiga)
  if (coSession?.id && !coSession.id.startsWith('local_')) {
    try {
      const startIso = machineClocks[idx]?.startIso
        || new Date(Date.now() - elapsed).toISOString();

      const { data: updated } = await db.from('machine_times')
        .update({ end_time: nowTs, duration_ms: elapsed, observation: obs, completed: true })
        .eq('session_id', coSession.id)
        .eq('machine_name', machineName)
        .is('end_time', null)
        .select();

      if (!updated?.length) {
        await db.from('machine_times').insert({
          session_id: coSession.id, machine_id: String(idx),
          machine_name: machineName, start_time: startIso,
          end_time: nowTs, duration_ms: elapsed, observation: obs, completed: true
        });
      }
    } catch(e) { console.warn('[machine_time save]', e); }
  }

  machineIdx = -1;
  saveCurrentState();
  renderMachineGrid();
  showOpScreen('s-machines');
  updateProgress(5 + Math.round((machines.filter(m=>m.done).length / machines.length) * 90));
  showToast(`✅ ${machineName} concluída: ${fmtMs(elapsed)}`, 'success');
}

/* -------- Finalizar Changeover ---------------------------- */
async function finishAllChangeover() {
  clearInterval(window._gridRefresh);
  clearInterval(window._machineTimerInterval);
  clearInterval(totalTimer); totalTimer = null;

  const totalMs   = getTotalElapsed();
  const limit     = (opRoom.alert_limit_minutes || 300) * 60000;
  const techName  = document.getElementById('inp-tech-name')?.value || '—';
  const product   = document.getElementById('inp-product')?.value || opRoom.sku || '—';
  const nowTs     = new Date().toISOString();

  // Se sessão ainda é local, tenta sincronizar antes de finalizar
  if (coSession?.id?.startsWith('local_')) {
    await trySyncLocalSession();
  }

  // Atualiza sessão no banco com retry
  let dbFinished = false;
  if (coSession?.id && !coSession.id.startsWith('local_')) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { error } = await db.from('changeover_sessions').update({
          end_time:          nowTs,
          total_duration_ms: totalMs,
          status:            'completed'
        }).eq('id', coSession.id);
        if (!error) { dbFinished = true; break; }
      } catch(e) { console.warn(`[finish session] tentativa ${attempt}:`, e); }
      if (attempt < 3) await new Promise(r => setTimeout(r, 800));
    }
    if (!dbFinished) {
      showToast('⚠️ Erro ao salvar finalização no banco. Dados preservados localmente.', 'warning', 8000);
    }
  }

  // Só limpa estado local se banco confirmou (ou sessão nunca foi para o banco)
  if (dbFinished || coSession?.id?.startsWith('local_')) {
    clearCoState();
    Store.del('co_total_start');
    Store.del('co_pending_session');
    Store.del('co_pending_machine');
  }

  // Preenche relatório
  setText('rep-duration', fmtMs(totalMs));
  setText('rep-machines', `${machines.filter(m=>m.done).length}/${machines.length}`);
  setText('rep-tech',     techName);
  setText('rep-line',     opRoom.room_code + ' — ' + opRoom.name);
  setText('rep-date',     fmtDate(nowTs));
  setText('rep-limit',    fmtMs(limit));
  setText('rep-product',  product);

  const overtime = document.getElementById('rep-overtime');
  if (overtime) {
    overtime.style.display = totalMs > limit ? 'block' : 'none';
    if (totalMs > limit) overtime.textContent = `⚠️ Acima do limite! Excedeu ${fmtMs(totalMs - limit)}`;
  }

  const tb = document.getElementById('rep-machines-table');
  if (tb) {
    tb.innerHTML = machines.filter(m => m.done).map(m => `
      <tr>
        <td>${m.name}</td>
        <td style="font-family:monospace;font-weight:700;color:var(--accent)">${fmtMs(m.ms)}</td>
        <td style="color:var(--muted);font-size:12px">${m.obs||'—'}</td>
      </tr>`).join('');
  }

  // Cards das 3 fases
  renderPhaseCards();

  showOpScreen('s-report');
  updateProgress(100);
  loadBeforeAfter(totalMs);
}

/* -------- Cards 3 Fases ----------------------------------- */
async function renderPhaseCards() {
  const wrapper = document.getElementById('phase-cards-wrapper');
  if (!wrapper || !coSession?.id || coSession.id.startsWith('local_')) return;

  try {
    const { data: sess } = await db.from('changeover_sessions')
      .select('setup_start,setup_end,setup_total_ms,adjustment_start,adjustment_end,adjustment_total_ms,validation_start,validation_end,validation_total_ms')
      .eq('id', coSession.id).single();

    if (!sess) return;

    const fmtTime = ts => ts ? new Date(ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) : '—';
    const fmtDiff = ms => ms ? fmtHHMM(ms) : '—';

    function phaseCard(icon, title, color, start, end, totalMs) {
      return `
        <div style="background:rgba(${color},0.08);border:1px solid rgba(${color},0.25);border-radius:12px;padding:14px">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:rgba(${color},0.9);margin-bottom:10px">${icon} ${title}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center">
            <div>
              <div style="font-size:10px;color:var(--muted);margin-bottom:2px">Início</div>
              <div style="font-family:monospace;font-size:14px;font-weight:700;color:rgba(${color},1)">${fmtTime(start)}</div>
            </div>
            <div>
              <div style="font-size:10px;color:var(--muted);margin-bottom:2px">Fim</div>
              <div style="font-family:monospace;font-size:14px;font-weight:700;color:rgba(${color},1)">${fmtTime(end)}</div>
            </div>
            <div>
              <div style="font-size:10px;color:var(--muted);margin-bottom:2px">Total</div>
              <div style="font-family:monospace;font-size:16px;font-weight:700;color:rgba(${color},1)">${fmtDiff(totalMs)}</div>
            </div>
          </div>
        </div>`;
    }

    wrapper.innerHTML =
      phaseCard('🔵', 'SMT Line Preparation', '0,212,255', sess.setup_start, sess.setup_end, sess.setup_total_ms) +
      phaseCard('🟠', 'Adjustment', '251,146,60', sess.adjustment_start, sess.adjustment_end, sess.adjustment_total_ms) +
      phaseCard('🟣', 'Process Validation & Release', '168,85,247', sess.validation_start, sess.validation_end, sess.validation_total_ms);

  } catch(e) { console.warn('[phaseCards]', e); }
}

// Formata ms em HH:MM (sem segundos — estilo planilha)
function fmtHHMM(ms) {
  if (!ms || ms <= 0) return '—';
  // Arredonda para o minuto mais próximo (consistente com display HH:MM)
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

/* -------- PDF --------------------------------------------- */
async function generatePDF() {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit:'mm', format:'a4' });
    const W=210, M=18; let y=M;
    doc.setFillColor(6,10,18); doc.rect(0,0,W,40,'F');
    doc.setTextColor(0,212,255); doc.setFontSize(22); doc.setFont('helvetica','bold');
    doc.text('CHANGEOVER SMT',M,18);
    doc.setTextColor(200,200,200); doc.setFontSize(10); doc.setFont('helvetica','normal');
    doc.text('Relatorio de Changeover',M,26);
    doc.text('Linha: '+opRoom.room_code+' - '+opRoom.name,M,32);
    y=50;
    const techName=document.getElementById('inp-tech-name')?.value||'—';
    const product=document.getElementById('inp-product')?.value||opRoom.sku||'—';
    const limit=(opRoom.alert_limit_minutes||300)*60000;
    [['Tecnico',techName],['Produto/SKU',product],['Data/Hora',fmtDate(new Date().toISOString())],
     ['Duracao Total',document.getElementById('rep-duration')?.textContent||'—'],
     ['Limite',fmtMs(limit)],
     ['Atividades',document.getElementById('rep-machines')?.textContent||'—']
    ].forEach(([k,v])=>{
      doc.setFont('helvetica','bold'); doc.setTextColor(100,130,163); doc.text(k+':',M,y);
      doc.setFont('helvetica','normal'); doc.setTextColor(30,30,30); doc.text(v,60,y); y+=8;
    });
    y+=4;
    doc.setFillColor(220,235,255); doc.rect(M,y,W-M*2,8,'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(50,50,50);
    doc.text('Atividade',M+2,y+5.5); doc.text('Duracao',120,y+5.5); doc.text('Observacao',150,y+5.5);
    y+=10;
    machines.filter(m=>m.done).forEach((m,i)=>{
      if(i%2===0){doc.setFillColor(245,248,255); doc.rect(M,y-0.5,W-M*2,8,'F');}
      doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(30,30,30);
      doc.text(m.name.slice(0,35),M+2,y+5);
      doc.text(fmtMs(m.ms),120,y+5);
      doc.text((m.obs||'—').slice(0,35),150,y+5); y+=8;
    });
    doc.setFontSize(8); doc.setTextColor(150,150,150);
    doc.text('Changeover SMT v5.0',M,285);
    doc.save('Changeover_'+opRoom.room_code+'_'+new Date().toISOString().slice(0,10)+'.pdf');
    showToast('PDF gerado!','success');
  } catch(e) { showToast('Erro ao gerar PDF.','error'); }
}

/* -------- WhatsApp ---------------------------------------- */
function shareWhatsApp() {
  const dur   = document.getElementById('rep-duration')?.textContent||'—';
  const tech  = document.getElementById('inp-tech-name')?.value||'—';
  const sku   = opRoom.sku || document.getElementById('inp-product')?.value || '—';
  const done  = machines.filter(m=>m.done).length;
  const msg   = '✅ *Changeover Concluído*\n🏭 Linha: '+opRoom.room_code+' — '+opRoom.name+'\n📦 Produto: '+sku+'\n👤 Técnico: '+tech+'\n⏱ Duração: '+dur+'\n✔️ Atividades: '+done+'/'+machines.length+'\n📅 '+fmtDate(new Date().toISOString())+'\n\n_Enviado via Changeover SMT_';
  window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank');
}

/* -------- Novo Changeover --------------------------------- */
function newChangeover() {
  clearInterval(window._gridRefresh);
  clearInterval(window._machineTimerInterval);
  clearInterval(totalTimer); totalTimer = null;
  machines      = MACHINES_SMT.map(n=>({name:n,done:false,ms:0,obs:''}));
  machineIdx    = -1;
  machineClocks = {};
  coSession     = null;
  Store.del('co_total_start');
  clearCoState();

  const techEl = document.getElementById('inp-tech-name');
  if (techEl) techEl.value = '';

  // Repõe o SKU automático
  const prodEl = document.getElementById('inp-product');
  if (prodEl) {
    prodEl.value = opRoom.sku || '';
    prodEl.readOnly = !!opRoom.sku;
    prodEl.style.opacity = opRoom.sku ? '0.7' : '1';
  }

  // Repõe turno
  const h = new Date().getHours();
  const shiftEl = document.getElementById('inp-shift');
  if (shiftEl) {
    if      (h >= 6  && h < 14) shiftEl.value = 'Manhã';
    else if (h >= 14 && h < 22) shiftEl.value = 'Tarde';
    else                        shiftEl.value = 'Noite';
  }

  showOpScreen('s-info');
  updateProgress(0);
  setText('total-elapsed','00:00:00');
}

/* -------- Salvar/Restaurar estado ------------------------- */
function saveCurrentState() {
  if (!opRoom) return;
  saveCoState({
    roomCode:  opRoom.room_code,
    machines:  machines,
    clocks:    machineClocks,
    machineIdx,
    sessionId: coSession?.id,
    techName:  document.getElementById('inp-tech-name')?.value||'',
    shift:     document.getElementById('inp-shift')?.value||'',
    product:   document.getElementById('inp-product')?.value || opRoom.sku || ''
  });
}

function restoreState(saved) {
  machines      = saved.machines || MACHINES_SMT.map(n=>({name:n,done:false,ms:0,obs:''}));
  machineClocks = saved.clocks   || {};
  machineIdx    = saved.machineIdx ?? -1;
  if (saved.sessionId) coSession = { id: saved.sessionId };
  // Zera startedAt dos clocks para evitar tempo errado após restauração (serão recalculados pelo banco)
  if (machineIdx >= 0 && machineClocks[machineIdx]) {
    machineClocks[machineIdx].startedAt = Date.now() - (machineClocks[machineIdx].accMs || 0);
  }

  const techEl = document.getElementById('inp-tech-name');
  if (techEl && saved.techName) techEl.value = saved.techName;

  const shEl = document.getElementById('inp-shift');
  if (shEl && saved.shift) shEl.value = saved.shift;

  const prodEl = document.getElementById('inp-product');
  if (prodEl) {
    prodEl.value    = saved.product || opRoom.sku || '';
    prodEl.readOnly = !!opRoom.sku;
    prodEl.style.opacity = opRoom.sku ? '0.7' : '1';
  }

  resumeTotalTimer();
  renderMachineGrid();
  showOpScreen('s-machines');
  const done = machines.filter(m=>m.done).length;
  updateProgress(5 + Math.round((done/machines.length)*90));
  showToast('Sessão restaurada!','info');
}

function updateObsCount() {
  const inp = document.getElementById('inp-obs');
  const cnt = document.getElementById('inp-obs-count');
  if (inp && cnt) cnt.textContent = inp.value.length+'/400';
}

/* -------- Before / After ---------------------------------- */
async function loadBeforeAfter(currentMs) {
  const wrapper = document.getElementById('before-after-wrapper');
  const content = document.getElementById('before-after-content');
  if (!wrapper || !content) return;

  const product = document.getElementById('inp-product')?.value || opRoom.sku || '';
  if (!product || !opRoom?.id) return;

  try {
    const { data } = await db.from('changeover_sessions')
      .select('total_duration_ms,created_at,tech_name,status')
      .eq('room_id', opRoom.id)
      .eq('product', product)
      .eq('status', 'completed')
      .not('total_duration_ms','is',null)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!data?.length) {
      content.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:8px">Nenhum histórico anterior para este produto nesta linha.</div>';
      wrapper.style.display = 'block';
      return;
    }

    const prev     = data[0];
    const best     = [...data].sort((a,b)=>a.total_duration_ms-b.total_duration_ms)[0];
    const avg      = data.reduce((a,b)=>a+(b.total_duration_ms||0),0)/data.length;
    const diffPrev = currentMs - prev.total_duration_ms;
    const diffBest = currentMs - best.total_duration_ms;
    const colorPrev = diffPrev < 0 ? '#22c55e' : diffPrev > 0 ? '#ef4444' : '#fb923c';
    const colorBest = diffBest <= 0 ? '#22c55e' : '#ef4444';

    content.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px">
        <div style="background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.15);border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--muted);margin-bottom:2px">Agora</div>
          <div style="font-family:monospace;font-weight:700;color:var(--accent);font-size:15px">${fmtMs(currentMs)}</div>
        </div>
        <div style="background:rgba(251,146,60,0.08);border:1px solid rgba(251,146,60,0.15);border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--muted);margin-bottom:2px">Anterior</div>
          <div style="font-family:monospace;font-weight:700;color:#fb923c;font-size:15px">${fmtMs(prev.total_duration_ms)}</div>
          <div style="font-size:10px;color:${colorPrev};margin-top:2px">${diffPrev<0?'↓ '+fmtMs(Math.abs(diffPrev))+' melhor':diffPrev>0?'↑ '+fmtMs(diffPrev)+' pior':'= Igual'}</div>
        </div>
        <div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.15);border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--muted);margin-bottom:2px">🏆 Melhor</div>
          <div style="font-family:monospace;font-weight:700;color:#22c55e;font-size:15px">${fmtMs(best.total_duration_ms)}</div>
          <div style="font-size:10px;color:${colorBest};margin-top:2px">${diffBest<=0?'✅ Novo recorde!':'↑ '+fmtMs(diffBest)+' acima'}</div>
        </div>
      </div>
      <div style="font-size:11px;color:var(--muted)">📊 Média: <strong style="color:#d0dff0">${fmtMs(avg)}</strong> · ${data.length} changeover${data.length!==1?'s':''} do produto <strong style="color:var(--accent)">${product}</strong></div>`;
    wrapper.style.display = 'block';
  } catch(e) { console.warn('[before-after]', e); }
}

// app.js v3.4 — Roteador principal CORRIGIDO

/* ============================================================
   SHOW VIEW — única função de navegação entre views
============================================================ */
function showView(name) {
  document.querySelectorAll('.view').forEach(v => {
    v.classList.toggle('active', v.id === 'view-' + name);
  });
}

/* ============================================================
   INIT — roda quando DOM está pronto
============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  // Liderança tem prioridade máxima: sessão admin válida → entra no dashboard
  if (checkAdminSession()) {
    showView('admin');
    initAdmin();
    return;
  }

  // Operador com sessão ativa → retoma tela do operador
  if (isOperatorSession()) {
    const opRoom = getOpRoom();
    if (opRoom) {
      showView('op');
      initOperator();
      return;
    }
    showView('login-op');
    return;
  }

  // Operador sem sessão de role mas com sala salva na aba → continua
  const opRoom = getOpRoom();
  if (opRoom) {
    showView('op');
    initOperator();
    return;
  }

  // Caso padrão → splash
  showView('splash');
}

/* ============================================================
   SPLASH
============================================================ */
function goToAdminLogin()    { showView('login-admin'); }
function goToOperatorLogin() { showView('login-op'); }

/* ============================================================
   LOGIN ADMIN
============================================================ */
const ADMIN_USER = 'Liderança';
const ADMIN_PASS = '@admin';

function loginAdmin() {
  const user = (document.getElementById('adm-user')?.value || '').trim();
  const pass  =  document.getElementById('adm-pass')?.value || '';

  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    saveAdminSession();
    showView('admin');
    initAdmin();
  } else {
    showToast('Usuário ou senha incorretos.', 'error');
    const passEl = document.getElementById('adm-pass');
    if (passEl) passEl.value = '';
  }
}

// Enter no campo de login
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('adm-pass')?.addEventListener('keyup', e => {
    if (e.key === 'Enter') loginAdmin();
  });
  document.getElementById('adm-user')?.addEventListener('keyup', e => {
    if (e.key === 'Enter') loginAdmin();
  });
  // Matrícula: apenas dígitos
  ['nr-leader-matricula','resume-matricula'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', function() {
      this.value = this.value.replace(/\D/g,'').slice(0,6);
    });
  });
  // Resume modal: uppercase room code
  document.getElementById('resume-room-code')?.addEventListener('input', function() {
    this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
  });
});

/* ============================================================
   LOGOUT ADMIN — limpa sessão e força splash
============================================================ */
function adminLogout() {
  // Para realtime se existir
  if (typeof realtimeSub !== 'undefined' && realtimeSub) {
    try { db.removeChannel(realtimeSub); } catch(e) {}
    realtimeSub = null;
  }
  // Limpa sessão do localStorage
  clearAdminSession();
  // Força exibição da splash — SEM chamar initApp (que iria re-checar sessão)
  showView('splash');
}

/* ============================================================
   LOGIN OPERADOR
============================================================ */
let _pendingRoom = null;

// Enter no input de ID
document.addEventListener('DOMContentLoaded', () => {
  const inp = document.getElementById('op-room-input');
  if (inp) {
    inp.addEventListener('input', () => {
      inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    });
    inp.addEventListener('keyup', e => {
      if (e.key === 'Enter') loginOperator();
    });
  }
});

async function loginOperator() {
  const raw        = document.getElementById('op-room-input')?.value || '';
  const matricula  = document.getElementById('op-matricula-input')?.value.trim() || '';
  const code       = raw.trim().toUpperCase();

  if (code.length < 4) {
    showToast('ID deve ter pelo menos 4 caracteres.', 'error');
    return;
  }
  if (matricula.length !== 6 || !/^[0-9]{6}$/.test(matricula)) {
    showToast('Informe sua matrícula de 6 dígitos.', 'error');
    document.getElementById('op-matricula-input')?.focus();
    return;
  }

  // Salva matrícula para uso posterior (Store usa JSON.stringify internamente)
  Store.set('op_matricula', matricula);

  const btn = document.getElementById('btn-op-enter');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Verificando...'; }

  let room    = null;
  let erroMsg = '';

  try {
    // 1) Busca a room pelo código
    const { data: roomData, error: roomErr } = await db.from('rooms')
      .select('*')
      .eq('room_code', code)
      .eq('is_active', true)
      .single();

    if (roomErr) {
      erroMsg = roomErr.code === 'PGRST116'
        ? 'ID não encontrado ou linha inativa.'
        : 'Erro de conexão: ' + roomErr.message;
    } else {
      room = roomData;
    }
  } catch (e) {
    erroMsg = 'Sem conexão com o servidor.';
    console.error('[loginOperator]', e);
  }

  if (btn) { btn.disabled = false; btn.innerHTML = '▶ Entrar no Changeover'; }

  if (!room) {
    showToast(erroMsg || 'ID inválido ou linha inativa.', 'error', 5000);
    return;
  }

  // 2) Verifica se já existe sessão ATIVA desta matrícula nesta room
  //    Busca por tech_matricula OU pela sessão mais recente in_progress desta room
  try {
    // Primeiro: busca exata por matrícula
    let activeSess = null;

    const { data: byMatricula } = await db.from('changeover_sessions')
      .select('*')
      .eq('room_id', room.id)
      .eq('tech_matricula', matricula)
      .eq('status', 'in_progress')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (byMatricula) {
      activeSess = byMatricula;
      console.log('[sync] Sessão encontrada por matrícula:', activeSess.id);
    }

    if (activeSess) {
      saveOpRoom(room);
      showView('op');
      await initOperatorFromDB(room, activeSess);
      return;
    }
  } catch(e) {
    console.warn('[loginOperator] check active session:', e);
  }

  // 3) Sem sessão no banco — verifica se há sessão local pendente para este técnico/linha
  const pendingSess = Store.get('co_pending_session');
  if (pendingSess && pendingSess.tech_matricula === matricula && pendingSess.room_id === room.id) {
    console.log('[loginOperator] Sessão local pendente encontrada, tentando sincronizar...');
    try {
      const { room_code, _savedAt, ...payload } = pendingSess;
      const { data: synced } = await db.from('changeover_sessions')
        .insert(payload).select().single();
      if (synced) {
        Store.del('co_pending_session');
        console.log('[loginOperator] Sessão local sincronizada:', synced.id);
        saveOpRoom(room);
        showView('op');
        await initOperatorFromDB(room, synced);
        return;
      }
    } catch(e) { console.warn('[loginOperator] Falha ao sincronizar sessão local:', e); }
  }

  // 4) Nenhuma sessão encontrada → novo changeover
  saveOpRoom(room);
  showView('op');
  initOperator();
}

/* ============================================================
   MODAL DE CONFIRMAÇÃO DA LINHA
============================================================ */
function showConfirmLineModal(room) {
  const limit    = room.alert_limit_minutes || 300;
  const horas    = Math.floor(limit / 60);
  const mins     = limit % 60;
  const limitStr = horas > 0
    ? horas + 'h' + (mins > 0 ? ' ' + mins + 'min' : '')
    : limit + ' min';

  const shift = room.shift ? ' · Turno: ' + room.shift : '';
  const line  = room.line  ? 'Setor: ' + room.line + shift : shift.replace(' · ', '');

  const elCode = document.getElementById('confirm-room-code');
  const elName = document.getElementById('confirm-room-name');
  const elInfo = document.getElementById('confirm-room-info');

  if (elCode) elCode.textContent = room.room_code;
  if (elName) elName.textContent = room.name;
  if (elInfo) elInfo.innerHTML =
    (line ? line + '<br>' : '') +
    '<span style="color:var(--accent)">⏱ Tempo limite: <strong>' + limitStr + '</strong></span>';

  openModal('modal-confirm-line');
}

function confirmEnterLine() {
  if (!_pendingRoom) return;
  closeModal('modal-confirm-line');
  saveOpRoom(_pendingRoom);
  _pendingRoom = null;
  showView('op');
  initOperator();
}

/* ============================================================
   LOGOUT OPERADOR
============================================================ */
function opLogout() {
  if (!confirm('Sair? O progresso foi salvo e pode continuar depois.')) return;
  clearOpRoom();
  clearCoState();
  try { Store.del('co_total_start'); } catch(e) {}
  showView('splash');
}

/* ============================================================
   UTILITÁRIOS
============================================================ */
function setLimit(val) {
  const inp  = document.getElementById('nr-limit');
  const prev = document.getElementById('limit-preview');
  if (inp) inp.value = val;
  if (prev) {
    const h = Math.floor(val / 60), m = val % 60;
    prev.textContent = '⏱ ' + val + ' min = ' + (h > 0 ? h + 'h' + (m > 0 ? ' ' + m + 'min' : '') : m + ' min');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('nr-limit')?.addEventListener('input', function () {
    const val  = parseInt(this.value) || 0;
    const prev = document.getElementById('limit-preview');
    if (prev && val > 0) {
      const h = Math.floor(val / 60), m = val % 60;
      prev.textContent = '⏱ ' + val + ' min = ' + (h > 0 ? h + 'h' + (m > 0 ? ' ' + m + 'min' : '') : m + ' min');
    }
  });
});

/* ============================================================
   SIDEBAR TOGGLE
============================================================ */
let _sidebarOpen = true;

/* ============================================================
   SIDEBAR MINI TOGGLE — igual ao padrão InspiniaUI/Bootstrap
   Aberto (248px): logo + texto nos itens
   Mini  ( 60px): só ícones + botão ☰ centralizado
============================================================ */
function toggleSidebar() {
  const sidebar   = document.getElementById('sidebar');
  const main      = document.querySelector('.admin-main');
  const overlay   = document.getElementById('sidebar-overlay');
  const brandFull = document.getElementById('brand-full');
  const brandMini = document.getElementById('brand-mini');
  if (!sidebar) return;

  const isMobile = window.innerWidth < 768;

  if (isMobile) {
    // ── MOBILE: abre/fecha com slide por cima do conteúdo ──
    const isOpen = sidebar.classList.contains('open');
    if (isOpen) {
      sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('open');
    } else {
      // Garante que está sem mini para mostrar ícones + texto
      sidebar.classList.remove('mini');
      if (brandFull) brandFull.style.display = 'flex';
      if (brandMini) brandMini.style.display = 'none';
      sidebar.classList.add('open');
      if (overlay) overlay.classList.add('open');
    }
    return; // não altera marginLeft nem estado mini
  }

  // ── DESKTOP: comportamento original mini/full ──
  _sidebarOpen = !_sidebarOpen;

  if (_sidebarOpen) {
    sidebar.classList.remove('mini');
    if (main) main.classList.remove('mini');
    if (brandFull) brandFull.style.display = 'flex';
    if (brandMini) brandMini.style.display = 'none';
    try { localStorage.setItem('sidebar_open', '1'); } catch(e) {}
  } else {
    sidebar.classList.add('mini');
    if (main) main.classList.add('mini');
    if (brandFull) brandFull.style.display = 'none';
    if (brandMini) brandMini.style.display = 'flex';
    try { localStorage.setItem('sidebar_open', '0'); } catch(e) {}
  }
}

// Restaurar estado ao carregar
document.addEventListener('DOMContentLoaded', () => {
  try {
    const saved = localStorage.getItem('sidebar_open');
    if (saved === '0') {
      _sidebarOpen = true; // toggleSidebar vai inverter
      toggleSidebar();
    }
  } catch(e) {}
});
// ============================================================
// MOBILE HOOK — detecta tela pequena e adapta o layout
// ============================================================
const MOBILE_BREAKPOINT = 768;

function useIsMobile() {
  return window.innerWidth < MOBILE_BREAKPOINT;
}

function applyMobileLayout() {
  const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
  const sidebar  = document.getElementById('sidebar');
  const main     = document.querySelector('.admin-main');
  const overlay  = document.getElementById('sidebar-overlay');

  if (isMobile) {
    // Remove mini no mobile — sidebar mostra ícones + texto quando aberta
    if (sidebar) {
      sidebar.classList.remove('mini');
      if (!sidebar.classList.contains('open')) {
        sidebar.style.transform = 'translateX(-100%)';
      }
    }
    if (main) main.style.marginLeft = '0';
    document.querySelectorAll('.btn-label').forEach(el => el.style.display = 'none');
  } else {
    // Desktop: restaura transform e labels
    if (sidebar) sidebar.style.transform = '';
    // Fecha overlay se estava aberto
    if (overlay) overlay.classList.remove('open');
    if (sidebar) sidebar.classList.remove('open');
    document.querySelectorAll('.btn-label').forEach(el => el.style.display = '');
  }
}

// Executa ao carregar e ao redimensionar
window.addEventListener('resize', applyMobileLayout);
document.addEventListener('DOMContentLoaded', applyMobileLayout);

// Media query listener (equivalente ao useEffect do React)
(function initMobileWatcher() {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  const onChange = () => applyMobileLayout();
  if (mql.addEventListener) {
    mql.addEventListener('change', onChange);
  } else {
    mql.addListener(onChange); // fallback browsers antigos
  }
})();
