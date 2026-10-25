import { state, courseById, taskById, saveTask, deleteTask, toggleDone } from '../store.js';
import { icon, esc, toast } from '../ui.js';
import { TYPES, REMINDERS, buildReminders, upcomingSlots } from '../shared/model.js';
import { fmtDay, fmtTime, toInputDate, toInputTime, fromInputs, cap, addDays, startOfDay, HOUR } from '../shared/time.js';

const DEFAULT_TITLE = { examen: 'Examen parcial', lab: 'Informe de laboratorio', trabajo: 'Trabajo', tarea: 'Tarea', otro: '', repaso: 'Repaso' };
let d = null; // borrador

function autoTitle() {
  const c = courseById(d.courseId);
  const base = DEFAULT_TITLE[d.type] || '';
  return base && c ? `${base} · ${c.name}` : base || (c ? c.name : '');
}

function initDraft(id, q) {
  const t = id && id !== 'nueva' ? taskById(id) : null;
  if (t) {
    d = {
      id: t.id, courseId: t.courseId, type: t.type, title: t.title, titleTouched: true,
      date: toInputDate(t.due), time: toInputTime(t.due),
      reminderOffsets: (t.reminders || []).map((r) => r.offsetMin), repeat: t.repeat || 'none',
      priority: t.priority || 'media', notes: t.notes || '', studyPlan: false, done: t.done, parentId: t.parentId || null,
      original: t,
    };
    return;
  }
  const tomorrow = addDays(startOfDay(Date.now()), 1) + 23 * HOUR + 59 * 60000;
  d = {
    id: null, courseId: q.get('curso') || state.courses[0]?.id || '', type: q.get('tipo') || 'examen',
    title: '', titleTouched: false,
    date: q.get('fecha') || toInputDate(tomorrow), time: q.get('fecha') ? '23:59' : '23:59',
    reminderOffsets: [...(state.settings.defaultReminders || REMINDERS.map((r) => r.min))],
    repeat: 'none', priority: 'media', notes: '', studyPlan: true, done: false, parentId: null,
    pickedSlot: null,
  };
  // Si hay clases, propone la próxima clase del curso
  if (!q.get('fecha')) {
    const s = upcomingSlots(courseById(d.courseId), Date.now(), { labs: d.type === 'lab', limit: 1 })[0];
    if (s) { d.date = toInputDate(s.at); d.time = toInputTime(s.at); d.pickedSlot = s.at; }
  }
  d.title = autoTitle();
}

function reminderHint() {
  const due = fromInputs(d.date, d.time);
  if (!due) return 'Elige una fecha para ver tus avisos.';
  const now = Date.now();
  const rems = buildReminders(due, d.reminderOffsets, now);
  const future = rems.filter((r) => !r.sent);
  if (!d.reminderOffsets.length) return 'Sin avisos para esta tarea.';
  if (!future.length) return 'Todos los avisos elegidos ya pasaron.';
  const skipped = rems.length - future.length;
  return `Te avisaremos: ${future.map((r) => `${fmtDay(r.at)} ${fmtTime(r.at)}`).join(' · ')}${skipped ? ` (${skipped} ya pasó)` : ''}`;
}

export default {
  persist: true,
  enter(params, q) { initDraft(params.id, q); },
  render(params) {
    if (!d) initDraft(params.id, new URLSearchParams());
    if (params.id && params.id !== 'nueva' && !d.original && taskById(params.id)) initDraft(params.id, new URLSearchParams());
    const isNew = !d.id;
    const course = courseById(d.courseId);
    const slots = upcomingSlots(course, Date.now(), { labs: d.type === 'lab', limit: 6 });
    const types = TYPES.filter((t) => !t.hidden || t.id === d.type);

    return `<div class="page">
      <div class="page-head" style="justify-content:flex-start;align-items:center">
        <a class="icon-btn" href="#/" data-action="back" aria-label="Volver" style="color:var(--text)">${icon('back', 20, 2.2)}</a>
        <h1 style="font-size:22px">${isNew ? 'Nueva tarea' : 'Editar tarea'}</h1>
      </div>

      <div class="field">
        <span class="label">1. Curso</span>
        <div class="grid3">
          ${state.courses.map((c) => `<button class="course-btn ${c.id === d.courseId ? 'on' : ''}" data-action="course" data-id="${c.id}" aria-pressed="${c.id === d.courseId}"
            style="${c.id === d.courseId ? `border-color:${c.color};background:${c.color}1f` : ''}">
            <b><span class="dot" style="background:${c.color}"></span>${esc(c.short || c.name)}</b><small>${esc(c.code || ' ')}</small></button>`).join('')}
          <button class="course-btn ${!d.courseId ? 'on' : ''}" data-action="course" data-id="" aria-pressed="${!d.courseId}"><b>Sin curso</b><small>Personal</small></button>
        </div>
      </div>

      <div class="field">
        <span class="label">2. Tipo</span>
        <div class="seg">${types.map((t) => `<button class="${t.id === d.type ? 'on' : ''}" data-action="type" data-id="${t.id}" aria-pressed="${t.id === d.type}">${t.label}</button>`).join('')}</div>
      </div>

      <div class="field">
        <label for="f-title">Título</label>
        <input id="f-title" class="input" type="text" value="${esc(d.title)}" maxlength="120" autocomplete="off">
      </div>

      <div class="field">
        <span class="label">3. Fecha y hora ${course && slots.length ? '<span style="font-weight:600">· según tu horario</span>' : ''}</span>
        ${slots.length ? `<div class="chips">${slots.map((s) => {
          const on = fromInputs(d.date, d.time) === s.at;
          return `<button class="chip ${on ? 'on' : ''}" style="min-height:40px;font-size:13px" data-action="slot" data-id="${s.at}">${cap(fmtDay(s.at))} · ${fmtTime(s.at)}</button>`;
        }).join('')}</div>` : course && d.type === 'lab' ? '<span class="hint">Este curso no tiene laboratorio en tu horario. Elige la fecha a mano.</span>' : ''}
        <div class="grid2" style="grid-template-columns:3fr 2fr">
          <div><label class="sr-only" for="f-date">Fecha</label><input id="f-date" class="input" type="date" value="${d.date}"></div>
          <div><label class="sr-only" for="f-time">Hora</label><input id="f-time" class="input" type="time" value="${d.time}"></div>
        </div>
      </div>

      <div class="field">
        <span class="label">4. Recordarme</span>
        <div class="grid2" style="grid-template-columns:repeat(4,minmax(0,1fr));gap:6px">
          ${REMINDERS.map((r) => `<button class="rem-btn ${d.reminderOffsets.includes(r.min) ? 'on' : ''}" data-action="rem" data-id="${r.min}" aria-pressed="${d.reminderOffsets.includes(r.min)}">${r.short}</button>`).join('')}
        </div>
        <div class="hint" id="rem-hint">${icon('bell', 16)}<span>${esc(reminderHint())}</span></div>
      </div>

      <div class="grid2">
        <div class="field">
          <label for="f-repeat">Repetir</label>
          <select id="f-repeat" class="input">
            ${[['none', 'No se repite'], ['weekly', 'Cada semana'], ['biweekly', 'Cada 2 semanas']].map(([v, l]) => `<option value="${v}" ${d.repeat === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="f-prio">Prioridad</label>
          <select id="f-prio" class="input">
            ${[['alta', 'Alta'], ['media', 'Media'], ['baja', 'Baja']].map(([v, l]) => `<option value="${v}" ${d.priority === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </div>
      </div>

      ${isNew && d.type === 'examen' ? `<label class="card pad" style="display:flex;align-items:center;gap:12px;cursor:pointer">
        <span style="flex:1;display:flex;flex-direction:column;gap:1px"><b style="font-size:14px">Crear plan de repaso</b><span class="small muted">Hasta 5 sesiones a las 19:00 los días antes del examen</span></span>
        <input id="f-plan" class="toggle" type="checkbox" ${d.studyPlan ? 'checked' : ''}>
      </label>` : ''}

      <div class="field">
        <label for="f-notes">Notas</label>
        <textarea id="f-notes" class="input" placeholder="Temas, materiales, aula…">${esc(d.notes)}</textarea>
      </div>

      <div class="sticky-save">
        ${!isNew ? `<button class="btn" data-action="done" aria-label="${d.done ? 'Marcar como pendiente' : 'Marcar como hecho'}">${icon('check', 18, 2.5)}${d.done ? 'Pendiente' : 'Hecho'}</button>` : ''}
        ${!isNew ? `<button class="btn btn-danger" data-action="delete" aria-label="Eliminar">${icon('trash', 18)}</button>` : ''}
        <button class="btn btn-primary" style="flex:1" data-action="save">${isNew ? 'Guardar recordatorio' : 'Guardar cambios'}</button>
      </div>
    </div>`;
  },
  mount(root) {
    const $ = (id) => root.querySelector('#' + id);
    const updHint = () => { const h = root.querySelector('#rem-hint span'); if (h) h.textContent = reminderHint(); };
    $('f-title')?.addEventListener('input', (e) => { d.title = e.target.value; d.titleTouched = true; });
    $('f-date')?.addEventListener('input', (e) => { d.date = e.target.value; updHint(); });
    $('f-time')?.addEventListener('input', (e) => { d.time = e.target.value; updHint(); });
    $('f-repeat')?.addEventListener('change', (e) => { d.repeat = e.target.value; });
    $('f-prio')?.addEventListener('change', (e) => { d.priority = e.target.value; });
    $('f-notes')?.addEventListener('input', (e) => { d.notes = e.target.value; });
    $('f-plan')?.addEventListener('change', (e) => { d.studyPlan = e.target.checked; });
  },
  async onAction(action, el, rerender, go) {
    switch (action) {
      case 'course': {
        d.courseId = el.dataset.id;
        const s = upcomingSlots(courseById(d.courseId), Date.now(), { labs: d.type === 'lab', limit: 1 })[0];
        if (s && !d.id) { d.date = toInputDate(s.at); d.time = toInputTime(s.at); }
        if (!d.titleTouched) d.title = autoTitle();
        rerender(); return true;
      }
      case 'type': {
        d.type = el.dataset.id;
        const s = upcomingSlots(courseById(d.courseId), Date.now(), { labs: d.type === 'lab', limit: 1 })[0];
        if (s && !d.id) { d.date = toInputDate(s.at); d.time = toInputTime(s.at); }
        if (!d.titleTouched) d.title = autoTitle();
        rerender(); return true;
      }
      case 'slot': { const at = Number(el.dataset.id); d.date = toInputDate(at); d.time = toInputTime(at); rerender(); return true; }
      case 'rem': {
        const m = Number(el.dataset.id);
        d.reminderOffsets = d.reminderOffsets.includes(m) ? d.reminderOffsets.filter((x) => x !== m) : [...d.reminderOffsets, m];
        rerender(); return true;
      }
      case 'back': history.length > 1 ? history.back() : go('#/'); return true;
      case 'save': {
        const due = fromInputs(d.date, d.time);
        if (!due) { toast('Elige una fecha'); return true; }
        if (!d.title.trim()) { toast('Escribe un título'); return true; }
        el.disabled = true;
        try {
          await saveTask({ ...d, due });
          toast(d.id ? 'Cambios guardados' : 'Recordatorio guardado');
          d = null;
          go('#/');
        } catch (e) { el.disabled = false; toast('No se pudo guardar: ' + e.message); }
        return true;
      }
      case 'done': {
        await toggleDone(d.original);
        toast(d.done ? 'Marcada como pendiente' : '¡Bien hecho!');
        d = null; go('#/'); return true;
      }
      case 'delete': {
        if (!confirm('¿Eliminar esta tarea?')) return true;
        await deleteTask(d.original);
        toast('Tarea eliminada');
        d = null; go('#/'); return true;
      }
    }
    return false;
  },
};
