import { state, courseById, taskById, logStudy } from '../store.js';
import { icon, esc, toast, taskRow } from '../ui.js';
import { startOfDay, addDays, fmtDay, cap } from '../shared/time.js';
import { testLocal } from '../push.js';

const MODES = { focus: { label: 'Enfoque', min: 25 }, short: { label: 'Pausa 5', min: 5 }, long: { label: 'Pausa 15', min: 15 } };
const KEY = 'appsito-timer';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } };
const store = (t) => { try { localStorage.setItem(KEY, JSON.stringify(t)); } catch { /* */ } };

function timer() {
  return load() || { mode: 'focus', running: false, endAt: 0, left: MODES.focus.min * 60000, courseId: '' };
}
function remaining(t) { return t.running ? Math.max(0, t.endAt - Date.now()) : t.left; }
const mmss = (ms) => { const s = Math.ceil(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

let interval = null;

function finish(t) {
  const mins = MODES[t.mode].min;
  if (t.mode === 'focus') {
    logStudy(t.courseId, mins);
    const c = courseById(t.courseId);
    testLocal('¡Sesión terminada!', `${mins} min de ${c ? c.name : 'estudio'}. Toma una pausa.`).catch(() => {});
    toast(`¡${mins} minutos de estudio registrados!`);
  } else {
    testLocal('Pausa terminada', 'A seguir estudiando 💪').catch(() => {});
  }
  const next = t.mode === 'focus' ? 'short' : 'focus';
  store({ ...t, mode: next, running: false, endAt: 0, left: MODES[next].min * 60000 });
}

export default {
  persist: true,
  render() {
    let t = timer();
    if (t.running && remaining(t) === 0) { finish(t); t = timer(); }
    const left = remaining(t);
    const total = MODES[t.mode].min * 60000;
    const pct = Math.round(((total - left) / total) * 100);
    const now = Date.now();
    const today0 = startOfDay(now);

    // Minutos de estudio de los últimos 7 días
    const since = addDays(today0, -6);
    const recent = state.study.filter((s) => s.at >= since);
    const todayMin = recent.filter((s) => s.at >= today0).reduce((a, s) => a + s.minutes, 0);
    const byCourse = {};
    recent.forEach((s) => { byCourse[s.courseId] = (byCourse[s.courseId] || 0) + s.minutes; });
    const max = Math.max(1, ...Object.values(byCourse));
    const weekMin = Object.values(byCourse).reduce((a, b) => a + b, 0);
    const hm = (m) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? (m % 60) + ' min' : ''}` : `${m} min`);

    // Planes de repaso
    const reviews = state.tasks.filter((x) => x.type === 'repaso' && x.due >= today0).sort((a, b) => a.due - b.due);
    const groups = {};
    reviews.forEach((r) => { (groups[r.parentId || 'x'] ||= []).push(r); });

    return `<div class="page">
      <div class="page-head"><div><p class="over">Hoy: ${hm(todayMin)} · semana: ${hm(weekMin)}</p><h1>Estudio</h1></div></div>

      <div class="card pad" style="display:flex;flex-direction:column;align-items:center;gap:14px">
        <div class="seg" style="width:100%">${Object.entries(MODES).map(([k, m]) => `<button class="${t.mode === k ? 'on' : ''}" data-action="mode" data-id="${k}" ${t.running ? 'disabled' : ''}>${m.label}</button>`).join('')}</div>
        <div class="timer-ring" id="ring" style="background:conic-gradient(#0757B8 0, #2EA9F2 ${pct}%, var(--soft) ${pct}% 100%)">
          <div><b id="clock">${mmss(left)}</b><span class="small muted" style="font-weight:700">${t.running ? (t.mode === 'focus' ? 'Enfocado' : 'En pausa') : 'Listo'}</span></div>
        </div>
        <div class="field" style="width:100%">
          <label for="st-course">¿Qué estudias?</label>
          <select id="st-course" class="input" ${t.running ? 'disabled' : ''}>
            <option value="">General</option>
            ${state.courses.map((c) => `<option value="${c.id}" ${t.courseId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="grid2" style="width:100%;grid-template-columns:2fr 1fr">
          <button class="btn btn-primary" data-action="startstop">${t.running ? 'Pausar' : left < total ? 'Continuar' : 'Empezar'}</button>
          <button class="btn" data-action="reset">Reiniciar</button>
        </div>
        <span class="small muted" style="text-align:center">Mantén Appsito abierto mientras estudias: el aviso de fin de sesión se muestra en este dispositivo.</span>
      </div>

      <div class="section">
        <div class="row-head"><h2>Planes de repaso</h2><a href="#/tarea/nueva?tipo=examen">+ Examen</a></div>
        ${Object.keys(groups).length ? Object.entries(groups).map(([pid, list]) => {
          const exam = taskById(pid);
          return `<div class="list">
            <div class="item"><span class="grow"><span class="title">${exam ? esc(exam.title) : 'Repaso'}</span><span class="sub">${exam ? `Examen: ${cap(fmtDay(exam.due))}` : ''}</span></span><span class="badge b-ex">${list.filter((x) => x.done).length}/${list.length}</span></div>
            ${list.map((r) => taskRow(r, { now })).join('')}
          </div>`;
        }).join('') : '<div class="list"><div class="empty">Cuando agendes un examen con "Crear plan de repaso", aquí verás tus sesiones.</div></div>'}
      </div>

      <div class="section">
        <h2 style="font-size:17px;font-weight:800">Últimos 7 días por curso</h2>
        <div class="card pad bars">
          ${Object.keys(byCourse).length ? Object.entries(byCourse).sort((a, b) => b[1] - a[1]).map(([cid, m]) => {
            const c = courseById(cid);
            return `<div class="bar"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c ? c.short || c.name : 'General')}</span><span class="track"><i style="width:${(m / max) * 100}%;background:${c ? c.color : '#64748B'}"></i></span><span style="text-align:right">${hm(m)}</span></div>`;
          }).join('') : '<div class="empty" style="padding:8px">Aún no registras sesiones esta semana.</div>'}
        </div>
      </div>
    </div>`;
  },
  mount(root, params, rerender) {
    clearInterval(interval);
    root.querySelector('#st-course')?.addEventListener('change', (e) => { store({ ...timer(), courseId: e.target.value }); });
    const t = timer();
    if (!t.running) return;
    interval = setInterval(() => {
      const cur = timer();
      const left = remaining(cur);
      const clock = root.querySelector('#clock');
      if (!clock) { clearInterval(interval); return; }
      clock.textContent = mmss(left);
      const total = MODES[cur.mode].min * 60000;
      const pct = Math.round(((total - left) / total) * 100);
      root.querySelector('#ring').style.background = `conic-gradient(#0757B8 0, #2EA9F2 ${pct}%, var(--soft) ${pct}% 100%)`;
      if (left === 0) { clearInterval(interval); finish(cur); rerender(); }
    }, 1000);
  },
  unmount() { clearInterval(interval); },
  onAction(action, el, rerender) {
    const t = timer();
    if (action === 'mode') { store({ ...t, mode: el.dataset.id, running: false, left: MODES[el.dataset.id].min * 60000 }); rerender(); return true; }
    if (action === 'startstop') {
      if (t.running) store({ ...t, running: false, left: remaining(t) });
      else store({ ...t, running: true, endAt: Date.now() + t.left });
      if (!t.running && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission();
      rerender(); return true;
    }
    if (action === 'reset') { store({ ...t, running: false, endAt: 0, left: MODES[t.mode].min * 60000 }); rerender(); return true; }
    return false;
  },
};
