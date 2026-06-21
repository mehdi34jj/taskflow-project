/* ══ API BASE — Flask runs on port 5000; Live Server uses other ports ══ */
const FLASK_ORIGIN = 'http://127.0.0.1:5000';
const API = window.location.port === '5000' ? '' : FLASK_ORIGIN;

function flaskUrl(path) {
  return window.location.port === '5000' ? path : FLASK_ORIGIN + path;
}

/* ══ STATUS MAP (API ↔ UI) ══ */
const STATUS_TO_UI = {
  'À faire': 'todo',
  'En cours': 'inprog',
  'Terminé': 'done',
};
const STATUS_TO_API = {
  todo: 'À faire',
  inprog: 'En cours',
  done: 'Terminé',
};

const BADGE_MAP = {
  'UI Design':   { bg:'#ede9ff', color:'#3525CD',  label:'UI Design'   },
  'Development': { bg:'#ecfdf5', color:'#065f46',  label:'Development' },
  'Research':    { bg:'#fff7ed', color:'#9a3412',  label:'Research'    },
  'Front End':   { bg:'#fdf4ff', color:'#7e22ce',  label:'Front End'   },
  'CodeArena':   { bg:'#fef3c7', color:'#b45309',  label:'CodeArena'   },
};

const MEMBER_AVATARS = {
  'Personne 1': 'seed=P1&backgroundColor=b6e3f4',
  'Personne 2': 'seed=P2&backgroundColor=ffd5dc',
  'Personne 3': 'seed=P3&backgroundColor=d1f4e0',
  'Personne 4': 'seed=P4&backgroundColor=ffdfbf',
};

let kanbanTasks = [];
let dashTasks = [];
let teamMembers = [];
let taskSearchQuery = '';
let activeMemberFilter = 'all';
let modalTargetStatus = 'todo';

const PAGES = ['dashboard','mytasks','calendar','members'];

/* ══ INIT ══ */
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initUserGreeting();
  initSearch();
  await loadTasksFromAPI();
  let startPage = 'dashboard';
  if (window.location.pathname.includes('/members')) startPage = 'members';
  else if (window.location.pathname.includes('/mytasks')) startPage = 'mytasks';
  goTo(startPage);
});

function initSearch() {
  const input = document.getElementById('task-search');
  if (!input) return;
  input.placeholder = 'Search task, code or members..';
  input.addEventListener('input', e => {
    taskSearchQuery = e.target.value.toLowerCase().trim();
    if (document.getElementById('page-mytasks').classList.contains('active')) renderKanban();
    if (document.getElementById('page-dashboard').classList.contains('active')) renderDash();
  });
}

function initUserGreeting() {
  const name = localStorage.getItem('username') || 'User';
  const el = document.getElementById('user-greeting');
  if (el) el.textContent = name.charAt(0).toUpperCase() + name.slice(1);
  const sidebarName = document.querySelector('.sidebar-user-name p.text-sm');
  if (sidebarName) sidebarName.textContent = name.charAt(0).toUpperCase() + name.slice(1);
}

/* ══ DARK MODE ══ */
function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
  updateThemeUI();
}

function toggleDarkMode() {
  document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  updateThemeUI();
}

function updateThemeUI() {
  const isDark = document.documentElement.classList.contains('dark');
  const sun = document.getElementById('theme-icon-sun');
  const moon = document.getElementById('theme-icon-moon');
  const label = document.getElementById('theme-label');
  if (sun) sun.classList.toggle('hidden', isDark);
  if (moon) moon.classList.toggle('hidden', !isDark);
  if (label) label.textContent = isDark ? 'Light Mode' : 'Dark Mode';
}

/* ══ API TASKS ══ */
async function loadTasksFromAPI() {
  try {
    const res = await fetch(`${API}/task`);
    const data = await res.json();
    teamMembers = data.members || [];

    kanbanTasks = (data.task || []).map(t => ({
      id: t.id,
      status: STATUS_TO_UI[t.status] || 'todo',
      tag: t.tag || 'Development',
      title: t.title,
      desc: t.desc || '',
      assigned_to: t.assigned_to || '',
      avatars: memberAvatars(t.assigned_to),
      info: t.info || '',
      infoIcon: t.infoIcon || '',
      urgent: !!t.urgent,
      live: !!t.live,
    }));

    dashTasks = (data.task || []).map(t => ({
      id: t.id,
      title: t.title,
      sub: t.assigned_to || 'Unassigned',
      time: '',
      cat: t.tag || 'Task',
      done: t.status === 'Terminé',
    }));

    populateMemberSelect();
    renderMemberFilters();
    updateStats();
  } catch (e) {
    console.error('Failed to load tasks:', e);
  }
}

function memberAvatars(name) {
  if (!name) return ['seed=unassigned&backgroundColor=e5e7eb'];
  return [MEMBER_AVATARS[name] || `seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4`];
}

function populateMemberSelect() {
  const sel = document.getElementById('m-member');
  if (!sel) return;
  sel.innerHTML = '<option value="">Select member…</option>' +
    teamMembers.map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join('');
}

function filterTasks(tasks, forKanban = false) {
  let result = tasks;
  if (forKanban && activeMemberFilter !== 'all') {
    result = result.filter(t => t.assigned_to === activeMemberFilter);
  }
  if (!taskSearchQuery) return result;
  return result.filter(t =>
    t.title.toLowerCase().includes(taskSearchQuery) ||
    (t.desc && t.desc.toLowerCase().includes(taskSearchQuery)) ||
    (t.assigned_to && t.assigned_to.toLowerCase().includes(taskSearchQuery)) ||
    (t.tag && t.tag.toLowerCase().includes(taskSearchQuery))
  );
}

function renderMemberFilters() {
  const el = document.getElementById('member-filters');
  if (!el) return;
  el.innerHTML =
    `<button type="button" onclick="setMemberFilter('all')" class="member-filter-btn${activeMemberFilter==='all'?' active':''}">All members</button>` +
    teamMembers.map(m =>
      `<button type="button" onclick='setMemberFilter(${JSON.stringify(m)})' class="member-filter-btn${activeMemberFilter===m?' active':''}">${esc(m)}</button>`
    ).join('');
}

function setMemberFilter(member) {
  activeMemberFilter = member;
  renderMemberFilters();
  renderKanban();
}

function updateStats() {
  const todo = kanbanTasks.filter(t => t.status === 'todo').length;
  const inprog = kanbanTasks.filter(t => t.status === 'inprog').length;
  const done = kanbanTasks.filter(t => t.status === 'done').length;
  const total = kanbanTasks.length;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('dash-task-count', todo + inprog);
  set('stat-completed', done);
  set('stat-inprog', inprog);
  set('stat-total', total);

  fetch(`${API}/questions`).then(r => r.json()).then(d => {
    set('stat-quiz', (d.questions || []).length);
  }).catch(() => {});
}

/* ══ PAGES ══ */
function goToCodeArena() {
  const username = localStorage.getItem('username');
  if (username) {
    sessionStorage.setItem('ca_user', JSON.stringify({
      name: username.charAt(0).toUpperCase() + username.slice(1),
      email: username + '@taskflow.com'
    }));
  }
  window.location.href = flaskUrl('/codearena/app');
}

function goTo(page) {
  PAGES.forEach(p => {
    const pg = document.getElementById('page-'+p);
    if (pg) pg.classList.remove('active');
    const sb = document.getElementById('nav-'+p);
    if (sb) sb.classList.remove('active');
    const bn = document.getElementById('bnav-'+p);
    if (bn) bn.classList.remove('active');
  });
  const target = document.getElementById('page-'+page);
  if (target) target.classList.add('active');
  const sb = document.getElementById('nav-'+page);
  if (sb) sb.classList.add('active');
  const bn = document.getElementById('bnav-'+page);
  if (bn) bn.classList.add('active');

  if (page === 'dashboard') renderDash();
  if (page === 'mytasks') { renderMemberFilters(); renderKanban(); }
  if (page === 'calendar') renderCal();
  closeSidebar();
}

function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-backdrop').style.display = 'block';
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-backdrop').style.display = 'none';
}

const DASH_BADGE = {
  Backend:  { bg:'#ede9fe', c:'#5b21b6' },
  Design:   { bg:'#ede9ff', c:'#5B4FE9' },
  Priority: { bg:'#fff3e0', c:'#c2410c' },
  Meeting:  { bg:'#f3f4f6', c:'#4b5563' },
  Task:     { bg:'#ede9ff', c:'#5B4FE9' },
  'UI Design':   { bg:'#ede9ff', c:'#5B4FE9' },
  'Development': { bg:'#ecfdf5', c:'#065f46' },
  'Research':    { bg:'#fff7ed', c:'#9a3412' },
  'Front End':   { bg:'#fdf4ff', c:'#7e22ce' },
  'CodeArena':   { bg:'#fef3c7', c:'#b45309' },
};

/* ══ DASHBOARD ══ */
function renderDash() {
  const list = document.getElementById('dash-task-list');
  if (!list) return;
  const pending = dashTasks.filter(t => !t.done);
  document.getElementById('dash-task-count').textContent = pending.length;
  if (dashTasks.length === 0) {
    list.innerHTML = `<div class="px-5 py-8 text-center text-gray-400 text-sm">No tasks yet. Click <strong>New Task</strong> to add one, or try <a href="#" onclick="goToCodeArena();return false;" class="text-brand-500 font-medium">CodeArena</a>.</div>`;
    return;
  }
  list.innerHTML = filterTasks(dashTasks).map(t => {
    const b = DASH_BADGE[t.cat] || DASH_BADGE.Task;
    return `<div class="flex items-center gap-3 px-4 md:px-5 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors">
      <div onclick="toggleDash(${t.id})" class="w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer flex-shrink-0 transition-all ${t.done?'bg-brand-500 border-brand-500':'border-gray-300'}">
        ${t.done?'<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>':''}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium truncate ${t.done?'line-through text-gray-400':'text-gray-900'}">${esc(t.title)}</p>
        <p class="text-[11px] text-gray-400">${esc(t.sub)}</p>
      </div>
      <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap hidden xs:inline-block" style="background:${b.bg};color:${b.c}">${esc(t.cat)}</span>
      <button onclick="deleteDash(${t.id})" class="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button>
    </div>`;
  }).join('');
}

async function toggleDash(id) {
  const t = dashTasks.find(x => x.id === id);
  if (!t) return;
  t.done = !t.done;
  const newStatus = t.done ? 'Terminé' : 'À faire';
  await fetch(`${API}/task/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus }),
  });
  const kt = kanbanTasks.find(x => x.id === id);
  if (kt) kt.status = t.done ? 'done' : 'todo';
  updateStats();
  renderDash();
}

async function deleteDash(id) {
  await fetch(`${API}/task/${id}`, { method: 'DELETE' });
  dashTasks = dashTasks.filter(x => x.id !== id);
  kanbanTasks = kanbanTasks.filter(x => x.id !== id);
  updateStats();
  renderDash();
}

/* ══ KANBAN ══ */
function renderKanban() {
  const filtered = filterTasks(kanbanTasks, true);
  ['todo','inprog','done'].forEach(s => {
    const items = filtered.filter(t => t.status === s);
    const countEl = document.getElementById('count-'+s);
    const colEl = document.getElementById('col-'+s);
    if (countEl) countEl.textContent = items.length;
    if (colEl) {
      colEl.innerHTML = items.length
        ? items.map(renderKCard).join('')
        : `<p class="text-center text-gray-400 text-xs py-6">No tasks in this column</p>`;
    }
  });
}

function renderKCard(t) {
  const tag = BADGE_MAP[t.tag] || { bg:'#f3f4f6', color:'#4b5563', label:t.tag };
  const isDone = t.status === 'done';
  const avHtml = t.avatars.map((a,i)=>`<img src="https://api.dicebear.com/7.x/avataaars/svg?${a}" class="w-6 h-6 rounded-full border-2 border-white${i?' -ml-2':''}" alt="${esc(t.assigned_to)}" title="${esc(t.assigned_to)}">`).join('');
  const infoHtml = t.infoIcon==='clock'
    ? `<div class="flex items-center gap-1 text-[11px] text-gray-400"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${esc(t.info)}</div>`
    : t.infoIcon==='chat'
    ? `<div class="flex items-center gap-1 text-[11px] text-gray-400"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>${esc(t.info)}</div>`
    : t.infoIcon==='mic'
    ? `<div class="flex items-center gap-1 text-[11px] text-gray-400"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>${esc(t.info)}</div>` : '';
  const liveBadge = t.live ? `<span class="flex items-center gap-1 text-[10px] font-bold text-red-500"><span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>LIVE</span>` : '';
  const urgentBadge = t.urgent ? `<div class="flex items-center gap-1 text-[11px] font-bold text-amber-500"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>URGENT</div>` : '';
  const progBar = t.live ? `<div class="mt-2 mb-1 h-1 bg-gray-100 rounded-full overflow-hidden"><div class="h-full bg-brand-400 rounded-full" style="width:65%"></div></div>` : '';
  const memberLabel = t.assigned_to ? `<p class="text-[10px] text-brand-500 font-semibold mb-1">${esc(t.assigned_to)}</p>` : '';

  return `<div class="kcard group">
    <div class="flex items-center justify-between mb-2">
      <span class="kcard-tag" style="background:${tag.bg};color:${tag.color}">${esc(tag.label)}</span>
      <div class="flex items-center gap-2">
        ${liveBadge}
        <button onclick="deleteKTask(${t.id})" class="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button>
      </div>
    </div>
    ${memberLabel}
    <p class="font-bold text-gray-900 text-sm leading-snug mb-1 ${isDone?'line-through text-gray-400':''}">${esc(t.title)}</p>
    ${t.desc?`<p class="text-[12px] text-gray-400 leading-relaxed mb-2">${esc(t.desc)}</p>`:''}
    ${progBar}
    <div class="flex items-center justify-between mt-2">
      <div class="flex items-center">${avHtml}</div>
      <div class="flex items-center gap-2">${urgentBadge}${infoHtml}</div>
    </div>
  </div>`;
}

async function changeTaskStatus(id, uiStatus) {
  const apiStatus = STATUS_TO_API[uiStatus];
  await fetch(`${API}/task/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: apiStatus }),
  });
  const kt = kanbanTasks.find(x => x.id === id);
  if (kt) kt.status = uiStatus;
  const dt = dashTasks.find(x => x.id === id);
  if (dt) dt.done = uiStatus === 'done';
  updateStats();
  renderKanban();
  if (document.getElementById('page-dashboard').classList.contains('active')) renderDash();
}

async function deleteKTask(id) {
  await fetch(`${API}/task/${id}`, { method: 'DELETE' });
  kanbanTasks = kanbanTasks.filter(t => t.id !== id);
  dashTasks = dashTasks.filter(t => t.id !== id);
  updateStats();
  renderKanban();
}

/* ══ CALENDAR ══ */
let calYear = 2026, calMonth = 5;
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const CAL_EVENTS = {
  '2026-5-2':  [{ label:'API Review',  bg:'#ede9ff', c:'#5B4FE9' }],
  '2026-5-11': [{ label:'Sprint Demo', bg:'#e0f7fa', c:'#00838f' },{ label:'Design Sync', bg:'#ede9ff', c:'#5B4FE9' }],
};

function renderCal() {
  document.getElementById('cal-month-label').textContent = MONTH_NAMES[calMonth]+' '+calYear;
  const grid = document.getElementById('cal-grid');
  const first = new Date(calYear,calMonth,1).getDay();
  const offset = first===0?6:first-1;
  const dim = new Date(calYear,calMonth+1,0).getDate();
  const prev = new Date(calYear,calMonth,0).getDate();
  const total = Math.ceil((offset+dim)/7)*7;
  let html='', day=1, nd=1;
  for(let i=0;i<total;i++){
    if(i<offset){ html+=`<div class="cal-day other">${prev-offset+i+1}</div>`; }
    else if(day<=dim){
      const key=`${calYear}-${calMonth}-${day}`;
      const evs=CAL_EVENTS[key]||[];
      const isSel=(calYear===2026&&calMonth===5&&day===11);
      const isTod=(calYear===2026&&calMonth===5&&day===8);
      let cls='cal-day';
      if(isTod) cls+=' today';
      if(isSel) cls+=' !bg-brand-50';
      const border = isSel?'style="outline:2px solid #7c6ff7;outline-offset:-2px;"':'';
      const dayNum = isSel?`<span class="font-bold text-brand-500">${day}</span>`:`<span>${day}</span>`;
      const evHtml=evs.map(e=>`<div class="cal-event" style="background:${e.bg};color:${e.c}">${e.label}</div>`).join('');
      html+=`<div class="${cls}" ${border}>${dayNum}${evHtml}</div>`;
      day++;
    } else { html+=`<div class="cal-day other">${nd++}</div>`; }
  }
  grid.innerHTML=html;
}
function calPrev(){calMonth--;if(calMonth<0){calMonth=11;calYear--;}renderCal();}
function calNext(){calMonth++;if(calMonth>11){calMonth=0;calYear++;}renderCal();}

/* ══ MODAL ══ */
function openTaskModal(status='todo'){
  modalTargetStatus=status;
  document.getElementById('m-title').value='';
  document.getElementById('m-desc').value='';
  document.getElementById('m-status').value=status;
  const m=document.getElementById('task-modal'),b=document.getElementById('task-modal-box');
  m.classList.remove('opacity-0','pointer-events-none');m.classList.add('opacity-100');
  b.classList.remove('translate-y-3','opacity-0');b.classList.add('translate-y-0','opacity-100');
  setTimeout(()=>document.getElementById('m-title').focus(),120);
}
function closeTaskModal(){
  const m=document.getElementById('task-modal'),b=document.getElementById('task-modal-box');
  m.classList.remove('opacity-100');m.classList.add('opacity-0');
  b.classList.remove('translate-y-0','opacity-100');b.classList.add('translate-y-3','opacity-0');
  setTimeout(()=>m.classList.add('pointer-events-none'),200);
}
function handleModalBd(e){if(e.target.id==='task-modal')closeTaskModal();}

async function saveNewTask(){
  const title=document.getElementById('m-title').value.trim();
  if(!title){document.getElementById('m-title').focus();return;}
  const status=document.getElementById('m-status').value;
  const desc=document.getElementById('m-desc').value.trim();
  const tag=document.getElementById('m-tag').value;
  const assigned_to=document.getElementById('m-member').value;

  const res = await fetch(`${API}/task`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      desc,
      tag,
      assigned_to,
      status: STATUS_TO_API[status],
    }),
  });
  if (!res.ok) return;

  await loadTasksFromAPI();
  closeTaskModal();
  renderKanban();
  renderDash();
}

function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeTaskModal();});
