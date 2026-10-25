// Estado de la app + acciones. Escucha Firestore en tiempo real.
import { api, newId, setUid } from './firebase.js';
import { SEED_COURSES, DEFAULT_SETTINGS } from './seed.js';
import { buildReminders, nextReminderAt, nextOccurrence, studyPlanDates } from './shared/model.js';

export const state = {
  user: null,
  ready: false,
  courses: [],
  tasks: [],
  study: [],
  settings: { ...DEFAULT_SETTINGS },
  error: null,
};

const subs = new Set();
// Las escrituras se aplican al instante en la caché local; no esperamos al servidor
// (así la app funciona sin internet). Los errores se avisan en pantalla.
function fire(promise) {
  promise.catch((e) => { console.error(e); window.dispatchEvent(new CustomEvent('appsito-error', { detail: e.message })); });
}
export function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
function emit() { subs.forEach((fn) => fn(state)); }

let unsubs = [];

export async function start(user) {
  state.user = user;
  setUid(user.uid);
  // Primera vez: cargar tu horario y ajustes por defecto
  try {
    const s = await api.get('settings', 'main');
    if (!s) {
      const b = api.batch();
      SEED_COURSES.forEach((c, i) => { const { id, ...data } = c; b.set(api.ref('courses', id), { ...data, order: i }); });
      b.set(api.ref('settings', 'main'), DEFAULT_SETTINGS);
      await b.commit();
    }
  } catch (e) {
    console.warn('No se pudo revisar la configuración inicial', e);
  }
  const onErr = (e) => { state.error = e.message; emit(); };
  let pending = 3;
  const done = () => { if (--pending <= 0 && !state.ready) { state.ready = true; } emit(); };
  unsubs = [
    api.listen('courses', (rows) => { state.courses = rows.sort((a, b) => (a.order ?? 99) - (b.order ?? 99)); done(); }, onErr),
    api.listen('tasks', (rows) => { state.tasks = rows.sort((a, b) => a.due - b.due); done(); }, onErr),
    api.listenDoc('settings', 'main', (s) => { state.settings = { ...DEFAULT_SETTINGS, ...(s || {}) }; done(); }),
    api.listen('study', (rows) => { state.study = rows; emit(); }, onErr),
  ];
}

export function stop() {
  unsubs.forEach((u) => u && u());
  unsubs = [];
  Object.assign(state, { user: null, ready: false, courses: [], tasks: [], study: [], settings: { ...DEFAULT_SETTINGS } });
  emit();
}

export const courseById = (id) => state.courses.find((c) => c.id === id);
export const taskById = (id) => state.tasks.find((t) => t.id === id);

/* ---------------- Tareas ---------------- */

export function saveTask(draft) {
  const now = Date.now();
  const id = draft.id || newId();
  const prev = taskById(id);
  const reminders = buildReminders(draft.due, draft.reminderOffsets || [], now, prev ? prev.reminders : []);
  const done = !!draft.done;
  const data = {
    title: draft.title.trim() || 'Sin título',
    courseId: draft.courseId || '',
    type: draft.type || 'tarea',
    due: draft.due,
    notes: (draft.notes || '').trim(),
    priority: draft.priority || 'media',
    repeat: draft.repeat || 'none',
    done,
    doneAt: draft.doneAt || null,
    parentId: draft.parentId || null,
    reminders,
    nextReminderAt: nextReminderAt(reminders, done),
    createdAt: prev ? prev.createdAt || now : now,
    updatedAt: now,
  };
  fire(api.set('tasks', id, data));

  // Plan de repaso automático para exámenes nuevos
  if (!prev && data.type === 'examen' && draft.studyPlan) {
    const dates = studyPlanDates(data.due, now);
    const b = api.batch();
    dates.forEach((at, i) => {
      const r = buildReminders(at, [120], now);
      b.set(api.ref('tasks', newId() + i), {
        title: `Repaso ${i + 1}/${dates.length} · ${data.title}`,
        courseId: data.courseId, type: 'repaso', due: at, notes: '', priority: 'media', repeat: 'none',
        done: false, doneAt: null, parentId: id, reminders: r, nextReminderAt: nextReminderAt(r, false),
        createdAt: now, updatedAt: now,
      });
    });
    if (dates.length) fire(b.commit());
  }
  return id;
}

export function toggleDone(task) {
  const now = Date.now();
  const done = !task.done;
  const patch = { done, doneAt: done ? now : null, nextReminderAt: nextReminderAt(task.reminders, done), updatedAt: now };
  // Si se repite, crea la siguiente
  if (done && task.repeat && task.repeat !== 'none' && !task.spawnedNext) {
    const due = nextOccurrence(task);
    if (due) {
      patch.spawnedNext = true;
      saveTask({
        ...task, id: null, due, done: false, doneAt: null,
        reminderOffsets: (task.reminders || []).map((r) => r.offsetMin),
      });
    }
  }
  fire(api.update('tasks', task.id, patch));
}

export function deleteTask(task, withChildren = true) {
  fire(api.remove('tasks', task.id));
  if (withChildren) state.tasks.filter((t) => t.parentId === task.id).forEach((k) => fire(api.remove('tasks', k.id)));
}

/* ---------------- Cursos ---------------- */

export async function saveCourse(course) {
  const id = course.id || newId();
  const { id: _omit, ...data } = course;
  if (data.order === undefined) data.order = state.courses.length;
  fire(api.set('courses', id, data));
  return id;
}
/** Cambia un curso: actualiza la copia local al momento y luego Firestore */
export function updateCourse(id, data) {
  const c = courseById(id);
  if (c) Object.assign(c, data);
  fire(api.update('courses', id, data));
}
export const deleteCourse = (id) => fire(api.remove('courses', id));

/* ---------------- Ajustes ---------------- */

export function saveSettings(partial) {
  Object.assign(state.settings, partial);
  fire(api.merge('settings', 'main', partial));
}

/* ---------------- Estudio ---------------- */

export const logStudy = (courseId, minutes) => fire(api.set('study', newId(), { courseId: courseId || '', minutes, at: Date.now() }));

/* ---------------- Notificaciones ---------------- */

export const saveSubscription = (id, data) => api.set('subs', id, data);
export const removeSubscription = (id) => api.remove('subs', id);

/* ---------------- Respaldo ---------------- */

export function exportData() {
  return {
    app: 'appsito', version: 1, exportedAt: new Date().toISOString(),
    courses: state.courses, tasks: state.tasks, study: state.study, settings: state.settings,
  };
}

export async function importData(json) {
  if (!json || json.app !== 'appsito') throw new Error('El archivo no es un respaldo de Appsito');
  const writes = [];
  (json.courses || []).forEach((c) => { const { id, ...d } = c; writes.push(['courses', id, d]); });
  (json.tasks || []).forEach((t) => { const { id, ...d } = t; writes.push(['tasks', id, d]); });
  (json.study || []).forEach((s) => { const { id, ...d } = s; writes.push(['study', id, d]); });
  if (json.settings) writes.push(['settings', 'main', json.settings]);
  // Firestore permite 500 escrituras por lote
  for (let i = 0; i < writes.length; i += 450) {
    const b = api.batch();
    writes.slice(i, i + 450).forEach(([n, id, d]) => b.set(api.ref(n, id), d));
    await b.commit();
  }
  return writes.length;
}
