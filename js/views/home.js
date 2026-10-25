import { state, courseById } from '../store.js';
import { icon, esc, WAVES, taskRow, greetingName } from '../ui.js';
import { fmtDayLong, fmtTime, countdown, cap, startOfDay, addDays, DAY } from '../shared/time.js';
import { pushStatus } from '../push.js';

let filter = 'todos';
const FILTERS = [
  ['todos', 'Todos'], ['examen', 'Exámenes'], ['lab', 'Labs'], ['trabajo', 'Trabajos'], ['tarea', 'Tareas'], ['repaso', 'Repasos'],
];

export default {
  render() {
    const now = Date.now();
    const today0 = startOfDay(now);
    const tomorrow0 = addDays(today0, 1);
    const pass = (t) => filter === 'todos' || t.type === filter;
    const open = state.tasks.filter((t) => !t.done);
    const overdue = open.filter((t) => t.due < now && pass(t));
    const today = state.tasks.filter((t) => t.due >= today0 && t.due < tomorrow0 && (t.due >= now || t.done) && pass(t));
    const upcoming = open.filter((t) => t.due >= tomorrow0 && t.due < addDays(today0, 15) && pass(t));
    const weekCount = open.filter((t) => t.due >= now && t.due < addDays(today0, 7)).length;
    const exam = open.filter((t) => t.type === 'examen' && t.due > now)[0];
    const examCourse = exam && courseById(exam.courseId);
    const cd = exam && countdown(exam.due, now);
    const pad = (n) => String(n).padStart(2, '0');
    const dark = document.documentElement.dataset.resolved === 'dark';
    const push = pushStatus();

    return `<div class="hero">${WAVES}
      <div class="page-head" style="align-items:center">
        <div><p class="over">${cap(fmtDayLong(now))}</p><h1>Hola${greetingName() ? ', ' + esc(greetingName()) : ''}</h1></div>
        <div style="display:flex;gap:8px">
          <button class="glass-btn" data-action="theme" aria-label="${dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}">${icon(dark ? 'sun' : 'moon', 20)}</button>
          <a class="glass-btn" href="#/ajustes" aria-label="Ajustes">${icon('gear', 20)}</a>
        </div>
      </div>
      ${exam ? `<div class="glass">
        <div class="row-head"><span style="font-size:12px;font-weight:800;letter-spacing:.08em">PRÓXIMO EXAMEN</span><span style="font-size:12px;font-weight:700">${weekCount} pendiente${weekCount === 1 ? '' : 's'} esta semana</span></div>
        <div style="display:flex;flex-direction:column;gap:1px">
          <span style="font-size:20px;font-weight:800">${esc(exam.title)}</span>
          <span style="font-size:13px;font-weight:600">${examCourse ? esc(examCourse.name) + ' · ' : ''}${cap(fmtDayLong(exam.due))} · ${fmtTime(exam.due)}</span>
        </div>
        <div class="count"><div><b>${pad(cd.d)}</b><span>días</span></div><div><b>${pad(cd.h)}</b><span>horas</span></div><div><b>${pad(cd.m)}</b><span>min</span></div></div>
        <a class="white-btn" href="#/estudio">${icon('timer', 16, 2.2)}Ver plan de repaso</a>
      </div>` : `<div class="glass">
        <span style="font-size:12px;font-weight:800;letter-spacing:.08em">ESTA SEMANA</span>
        <span style="font-size:20px;font-weight:800">${weekCount ? `${weekCount} pendiente${weekCount === 1 ? '' : 's'}` : 'Todo al día'}</span>
        <span style="font-size:13px;font-weight:600">No tienes exámenes próximos registrados.</span>
        <a class="white-btn" href="#/tarea/nueva?tipo=examen">${icon('plus', 16, 2.5)}Agendar un examen</a>
      </div>`}
    </div>

    <div class="page">
      ${push === 'off' ? `<div class="banner">${icon('bell', 22)}<div class="grow"><b>Activa las notificaciones</b><span class="muted">Para que te lleguen los avisos al celular.</span></div><a class="btn" style="min-height:40px" href="#/ajustes">Activar</a></div>` : ''}
      ${push === 'install' ? `<div class="banner">${icon('download', 22)}<div class="grow"><b>Instala Appsito en tu iPhone</b><span class="muted">Toca Compartir → "Agregar a inicio". Así podrás recibir avisos.</span></div></div>` : ''}

      <div class="chips" role="group" aria-label="Filtrar">
        ${FILTERS.map(([id, label]) => `<button class="chip ${filter === id ? 'on' : ''}" data-action="filter" data-id="${id}" aria-pressed="${filter === id}">${label}</button>`).join('')}
      </div>

      <div class="home-grid">
        <div style="display:flex;flex-direction:column;gap:16px">
          ${overdue.length ? `<div class="section"><div class="row-head"><h2>Atrasadas</h2><span class="small muted">${overdue.length}</span></div>
            <div class="list">${overdue.map((t) => taskRow(t, { now })).join('')}</div></div>` : ''}

          <div class="section">
            <div class="row-head"><h2>Hoy</h2><span class="small" style="font-weight:700;color:var(--accent)">${today.filter((t) => !t.done).length} pendiente${today.filter((t) => !t.done).length === 1 ? '' : 's'}</span></div>
            <div class="list">${today.length ? today.map((t) => taskRow(t, { now, showDate: false })).join('') : '<div class="empty">Nada para hoy. Disfruta tu día.</div>'}</div>
          </div>
        </div>
        <div class="section">
          <div class="row-head"><h2>Próximos días</h2><a href="#/calendario">Ver calendario</a></div>
          <div class="list">${upcoming.length ? upcoming.slice(0, 12).map((t) => taskRow(t, { now })).join('') : '<div class="empty">No hay nada en los próximos 15 días.<br><a href="#/tarea/nueva">Agregar tarea</a></div>'}</div>
        </div>
      </div>
    </div>`;
  },
  onAction(action, el, rerender) {
    if (action === 'filter') { filter = el.dataset.id; rerender(); return true; }
    return false;
  },
  tick: 30000, // refresca la cuenta regresiva
};
