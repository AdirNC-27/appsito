import { state, courseById, saveCourse, deleteCourse } from '../store.js';
import { icon, esc, toast } from '../ui.js';
import { COURSE_COLORS } from '../seed.js';

const DAYS = [[1, 'Lunes'], [2, 'Martes'], [3, 'Miércoles'], [4, 'Jueves'], [5, 'Viernes'], [6, 'Sábado']];
const KINDS = [['teoria', 'Teoría'], ['lab', 'Laboratorio'], ['virtual', 'Virtual']];
const toTime = (h) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h - Math.floor(h)) * 60)).padStart(2, '0')}`;
const fromTime = (s) => { const [h, m] = String(s || '0:0').split(':').map(Number); return h + (m || 0) / 60; };

export const coursesView = {
  render() {
    return `<div class="page">
      <div class="page-head" style="justify-content:flex-start;align-items:center">
        <a class="icon-btn" href="#/ajustes" aria-label="Volver" style="color:var(--text)">${icon('back', 20, 2.2)}</a>
        <h1 style="font-size:22px">Mis cursos</h1>
      </div>
      <div class="list">
        ${state.courses.map((c) => `<a class="item" href="#/cursos/${c.id}">
          <span style="width:40px;height:40px;border-radius:12px;background:${c.color}22;color:${c.color};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;flex:none">${esc((c.short || c.name).slice(0, 2).toUpperCase())}</span>
          <span class="grow"><span class="title">${esc(c.name)}</span><span class="sub">${[c.code, c.teacher, `${(c.schedule || []).length} bloques`].filter(Boolean).map(esc).join(' · ')}</span></span>
          ${icon('next', 18)}</a>`).join('')}
      </div>
      <a class="btn" href="#/cursos/nuevo" style="border-style:dashed;color:var(--accent)">${icon('plus', 18, 2.5)}Agregar curso</a>
      <a class="btn" href="#/horario">${icon('cal', 18)}Ver horario semanal</a>
    </div>`;
  },
};

let draft = null;

export const courseEditView = {
  persist: true,
  enter(params) {
    const c = params.id !== 'nuevo' ? courseById(params.id) : null;
    draft = c ? JSON.parse(JSON.stringify(c)) : { id: null, name: '', short: '', code: '', teacher: '', credits: 0, color: COURSE_COLORS[state.courses.length % COURSE_COLORS.length], schedule: [], components: [] };
  },
  render(params) {
    if (!draft || (params.id !== 'nuevo' && draft.id !== params.id)) this.enter(params);
    const d = draft;
    return `<div class="page">
      <div class="page-head" style="justify-content:flex-start;align-items:center">
        <a class="icon-btn" href="#/cursos" aria-label="Volver" style="color:var(--text)">${icon('back', 20, 2.2)}</a>
        <h1 style="font-size:22px">${d.id ? 'Editar curso' : 'Nuevo curso'}</h1>
      </div>
      <div class="card pad" style="display:flex;flex-direction:column;gap:12px">
        <div class="field"><label for="c-name">Nombre</label><input id="c-name" class="input" data-k="name" value="${esc(d.name)}" placeholder="Ej. Inteligencia Artificial"></div>
        <div class="grid2">
          <div class="field"><label for="c-short">Nombre corto</label><input id="c-short" class="input" data-k="short" value="${esc(d.short)}" placeholder="Ej. IA" maxlength="16"></div>
          <div class="field"><label for="c-code">Código</label><input id="c-code" class="input" data-k="code" value="${esc(d.code)}" placeholder="IS-484"></div>
        </div>
        <div class="grid2">
          <div class="field"><label for="c-teacher">Docente</label><input id="c-teacher" class="input" data-k="teacher" value="${esc(d.teacher)}"></div>
          <div class="field"><label for="c-credits">Créditos</label><input id="c-credits" class="input" data-k="credits" type="number" min="0" max="10" value="${d.credits || ''}" placeholder="0"></div>
        </div>
        <div class="field"><span class="label">Color</span>
          <div style="display:flex;gap:8px;flex-wrap:wrap">${COURSE_COLORS.map((col) => `<button data-action="color" data-id="${col}" aria-label="Color ${col}" aria-pressed="${d.color === col}" style="width:40px;height:40px;border-radius:12px;background:${col};border:${d.color === col ? '3px solid var(--text)' : '0'}"></button>`).join('')}</div>
        </div>
      </div>

      <div class="section">
        <div class="row-head"><h2>Horario</h2><button class="link" data-action="add-block">+ Agregar bloque</button></div>
        ${d.schedule.length ? d.schedule.map((b, i) => `<div class="card pad" style="display:flex;flex-direction:column;gap:8px;box-shadow:none">
          <div class="grid2">
            <select class="input" data-i="${i}" data-b="day" aria-label="Día">${DAYS.map(([v, l]) => `<option value="${v}" ${Number(b.day) === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
            <select class="input" data-i="${i}" data-b="kind" aria-label="Tipo">${KINDS.map(([v, l]) => `<option value="${v}" ${b.kind === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
          </div>
          <div class="grid2">
            <div class="field"><label class="small">Inicio</label><input class="input" type="time" step="1800" data-i="${i}" data-b="start" value="${toTime(b.start)}"></div>
            <div class="field"><label class="small">Fin</label><input class="input" type="time" step="1800" data-i="${i}" data-b="end" value="${toTime(b.end)}"></div>
          </div>
          <div class="grid2" style="grid-template-columns:1fr 1fr 44px">
            <input class="input" data-i="${i}" data-b="teacher" value="${esc(b.teacher || '')}" placeholder="Docente" aria-label="Docente del bloque">
            <input class="input" data-i="${i}" data-b="note" value="${esc(b.note || '')}" placeholder="Grupo / aula" aria-label="Nota">
            <button class="icon-btn" style="color:#DC2626" data-action="del-block" data-id="${i}" aria-label="Quitar bloque">${icon('trash', 16)}</button>
          </div>
        </div>`).join('') : '<div class="list"><div class="empty">Sin horario. Agrega los bloques de clase.</div></div>'}
      </div>

      <div class="sticky-save">
        ${d.id ? `<button class="btn btn-danger" data-action="delete-course" aria-label="Eliminar curso">${icon('trash', 18)}</button>` : ''}
        <button class="btn btn-primary" style="flex:1" data-action="save-course">Guardar curso</button>
      </div>
    </div>`;
  },
  mount(root) {
    root.querySelectorAll('[data-k]').forEach((inp) => inp.addEventListener('input', () => {
      draft[inp.dataset.k] = inp.dataset.k === 'credits' ? Number(inp.value) || 0 : inp.value;
    }));
    root.querySelectorAll('[data-b]').forEach((inp) => inp.addEventListener('change', () => {
      const b = draft.schedule[Number(inp.dataset.i)];
      const k = inp.dataset.b;
      b[k] = k === 'day' ? Number(inp.value) : k === 'start' || k === 'end' ? fromTime(inp.value) : inp.value;
    }));
  },
  onAction(action, el, rerender, go) {
    const d = draft;
    switch (action) {
      case 'color': d.color = el.dataset.id; rerender(); return true;
      case 'add-block': {
        const last = d.schedule[d.schedule.length - 1];
        d.schedule.push({ day: last ? last.day : 1, start: last ? last.end : 7, end: (last ? last.end : 7) + 2, kind: 'teoria', teacher: d.teacher || '', note: '' });
        rerender(); return true;
      }
      case 'del-block': d.schedule.splice(Number(el.dataset.id), 1); rerender(); return true;
      case 'save-course': {
        if (!d.name.trim()) { toast('Escribe el nombre del curso'); return true; }
        const bad = d.schedule.find((b) => b.end <= b.start);
        if (bad) { toast('Revisa el horario: la hora de fin debe ser después del inicio'); return true; }
        saveCourse({ ...d, name: d.name.trim(), short: (d.short || '').trim() || d.name.trim().split(' ')[0] });
        toast('Curso guardado');
        draft = null; go('#/cursos'); return true;
      }
      case 'delete-course':
        if (!confirm(`¿Eliminar ${d.name}? Sus tareas se conservan.`)) return true;
        deleteCourse(d.id); toast('Curso eliminado'); draft = null; go('#/cursos'); return true;
    }
    return false;
  },
};
