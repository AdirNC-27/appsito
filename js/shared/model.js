// Reglas del negocio compartidas entre la app y el robot de avisos.
import { MIN, DAY, fmtDay, fmtTime, inText, addDays } from './time.js';

/** Tipos de tarea */
export const TYPES = [
  { id: 'examen', label: 'Examen', plural: 'Exámenes' },
  { id: 'lab', label: 'Lab', plural: 'Labs' },
  { id: 'trabajo', label: 'Trabajo', plural: 'Trabajos' },
  { id: 'tarea', label: 'Tarea', plural: 'Tareas' },
  { id: 'otro', label: 'Otro', plural: 'Otros' },
  { id: 'repaso', label: 'Repaso', plural: 'Repasos', hidden: true },
];
export const typeLabel = (id) => (TYPES.find((t) => t.id === id) || TYPES[4]).label;

/** Avisos disponibles (minutos antes de la fecha) */
export const REMINDERS = [
  { min: 7 * 24 * 60, short: '1 sem', label: '1 semana antes' },
  { min: 3 * 24 * 60, short: '3 días', label: '3 días antes' },
  { min: 24 * 60, short: '24 h', label: '24 horas antes' },
  { min: 2 * 60, short: '2 h', label: '2 horas antes' },
];
export const DEFAULT_REMINDERS = REMINDERS.map((r) => r.min);

/**
 * Construye la lista de avisos de una tarea.
 * Conserva el estado "enviado" de los avisos que no cambiaron.
 * Los avisos cuya hora ya pasó se marcan como enviados (no se mandan tarde).
 */
export function buildReminders(due, offsets, now, prev = []) {
  return [...new Set(offsets)]
    .sort((a, b) => b - a)
    .map((offsetMin) => {
      const at = due - offsetMin * MIN;
      const old = prev.find((p) => p.offsetMin === offsetMin && p.at === at);
      return { offsetMin, at, sent: old ? !!old.sent : at <= now };
    });
}

export function nextReminderAt(reminders, done) {
  if (done) return null;
  const pending = (reminders || []).filter((r) => !r.sent).map((r) => r.at);
  return pending.length ? Math.min(...pending) : null;
}

/** Texto de la notificación */
export function reminderMessage(task, course, now) {
  const kind = task.type === 'examen' ? 'Examen' : task.type === 'repaso' ? 'Repaso' : task.type === 'lab' ? 'Laboratorio' : 'Entrega';
  const title = task.type === 'repaso' ? `Hoy toca repasar: ${task.title}` : `${kind} ${inText(task.due, now)}: ${task.title}`;
  const body = `${course ? course.name + ' · ' : ''}${fmtDay(task.due)}, ${fmtTime(task.due)}`;
  return { title, body };
}

/** Siguiente ocurrencia de una tarea que se repite */
export function nextOccurrence(task) {
  const step = task.repeat === 'weekly' ? 7 : task.repeat === 'biweekly' ? 14 : 0;
  return step ? addDays(task.due, step) : null;
}

/** Sesiones de repaso antes de un examen: 5 días antes, a las 19:00 (hora de Lima) */
export function studyPlanDates(examDue, now, sessions = 5, hour = 19) {
  const out = [];
  for (let i = sessions; i >= 1; i--) {
    const day = addDays(examDue, -i);
    const d = new Date(day - 5 * 60 * MIN); // hora local de Lima
    const at = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hour + 5, 0);
    if (at > now && at < examDue) out.push(at);
  }
  return out;
}

/* ---------------- Notas ---------------- */

const isNum = (v) => typeof v === 'number' && !Number.isNaN(v);

/**
 * components: [{ name, weight (0-100), grade (0-20 | null) }]
 * Devuelve el avance del curso y lo que falta.
 */
export function courseStats(components = [], passGrade = 10.5) {
  const total = components.reduce((s, c) => s + (Number(c.weight) || 0), 0);
  const graded = components.filter((c) => isNum(c.grade));
  const wDone = graded.reduce((s, c) => s + (Number(c.weight) || 0), 0);
  const points = graded.reduce((s, c) => s + (Number(c.weight) || 0) * c.grade, 0) / 100; // puntos ya asegurados sobre 20
  const wLeft = Math.max(0, (total || 100) - wDone);
  const current = wDone > 0 ? (points * 100) / wDone : null;
  const need = (target) => (wLeft > 0 ? (target - points) / (wLeft / 100) : null);
  const projected = (x) => points + (wLeft / 100) * x;
  const finalGrade = wLeft === 0 && wDone > 0 ? points * (100 / (total || 100)) : null;
  return {
    total, wDone, wLeft, points, current, finalGrade,
    need, projected,
    passNeed: need(passGrade),
    passing: current === null ? null : current >= passGrade,
  };
}

/** Promedio ponderado por créditos (o simple si faltan créditos) */
export function termAverage(courses, passGrade = 10.5) {
  const rows = courses
    .map((c) => ({ c, s: courseStats(c.components, passGrade) }))
    .filter((r) => r.s.current !== null);
  if (!rows.length) return { avg: null, credits: 0, count: 0 };
  const allCredits = rows.every((r) => Number(r.c.credits) > 0);
  if (allCredits) {
    const credits = rows.reduce((s, r) => s + Number(r.c.credits), 0);
    const avg = rows.reduce((s, r) => s + r.s.current * Number(r.c.credits), 0) / credits;
    return { avg, credits, count: rows.length, weighted: true };
  }
  const avg = rows.reduce((s, r) => s + r.s.current, 0) / rows.length;
  return { avg, credits: 0, count: rows.length, weighted: false };
}

/* ---------------- Horario ---------------- */

/**
 * Próximas clases de un curso desde "now".
 * schedule: [{ day: 1..5 (lun..vie), start: 7, end: 9, kind: 'teoria'|'lab'|'virtual' }]
 */
export function upcomingSlots(course, now, { labs = false, limit = 4, days = 28 } = {}) {
  if (!course) return [];
  const out = [];
  const base = new Date(now - 5 * 60 * MIN);
  for (let i = 0; i <= days && out.length < limit; i++) {
    const y = base.getUTCFullYear(), m = base.getUTCMonth(), d = base.getUTCDate() + i;
    const dow = new Date(Date.UTC(y, m, d)).getUTCDay();
    const blocks = (course.schedule || [])
      .filter((b) => Number(b.day) === dow && (labs ? b.kind === 'lab' : b.kind !== 'lab'))
      .sort((a, b) => a.start - b.start);
    for (const b of blocks) {
      const h = Math.floor(b.start), mi = Math.round((b.start - h) * 60);
      const at = Date.UTC(y, m, d, h + 5, mi);
      if (at > now && out.length < limit) out.push({ at, block: b });
    }
  }
  return out;
}

export const DAY_MS = DAY;
