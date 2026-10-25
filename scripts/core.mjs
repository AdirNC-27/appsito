// Lógica del robot de avisos, sin dependencias externas (fácil de probar).
import { HOUR, dayKey, startOfDay, addDays, parts, fmtTime } from '../js/shared/time.js';
import { reminderMessage, nextReminderAt } from '../js/shared/model.js';

/**
 * Revisa las tareas con avisos vencidos.
 * Envía UNA notificación por tarea (la del aviso más reciente) y marca los demás como enviados.
 * Los avisos con más de 12 h de retraso se marcan sin enviarse.
 */
export function processReminders({ tasks, courses, now, staleMs = 12 * HOUR }) {
  const byId = Object.fromEntries(courses.map((c) => [c.id, c]));
  const notifications = [];
  const updates = [];
  for (const t of tasks) {
    if (t.done || !Array.isArray(t.reminders)) {
      updates.push({ id: t.id, reminders: t.reminders || [], nextReminderAt: null });
      continue;
    }
    const due = t.reminders.filter((r) => !r.sent && r.at <= now);
    if (!due.length) {
      updates.push({ id: t.id, reminders: t.reminders, nextReminderAt: nextReminderAt(t.reminders, false) });
      continue;
    }
    const latest = due.reduce((a, b) => (b.at > a.at ? b : a));
    if (now - latest.at <= staleMs && t.due > now - HOUR) {
      const msg = reminderMessage(t, byId[t.courseId], now);
      notifications.push({ ...msg, url: `#/tarea/${t.id}`, tag: `task-${t.id}` });
    }
    const reminders = t.reminders.map((r) => (r.at <= now ? { ...r, sent: true } : r));
    updates.push({ id: t.id, reminders, nextReminderAt: nextReminderAt(reminders, false) });
  }
  return { notifications, updates };
}

/**
 * Resumen de la mañana. Devuelve null si no toca enviarlo.
 * Se envía una vez al día, entre la hora elegida y 3 h después (por si GitHub se retrasa).
 */
export function dailySummary({ tasks, courses, now, settings }) {
  if (!settings || settings.dailySummary === false) return null;
  const hour = Number(settings.summaryHour ?? 7);
  const h = parts(now).h;
  const today = dayKey(now);
  if (h < hour || h >= hour + 3 || settings.lastSummary === today) return null;

  const byId = Object.fromEntries(courses.map((c) => [c.id, c]));
  const t0 = startOfDay(now), t1 = addDays(t0, 1), t2 = addDays(t0, 2);
  const open = tasks.filter((t) => !t.done);
  const name = (t) => { const c = byId[t.courseId]; return `${t.title}${c && !t.title.includes(c.name) ? ` (${c.short || c.name})` : ''}`; };
  const todayList = open.filter((t) => t.due >= t0 && t.due < t1).sort((a, b) => a.due - b.due);
  const tomorrowList = open.filter((t) => t.due >= t1 && t.due < t2).sort((a, b) => a.due - b.due);
  const overdue = open.filter((t) => t.due < now && t.type !== 'repaso').length;

  const lines = [];
  if (todayList.length) lines.push(`Hoy: ${todayList.map((t) => `${name(t)} ${fmtTime(t.due)}`).join(', ')}`);
  if (tomorrowList.length) lines.push(`Mañana: ${tomorrowList.map(name).join(', ')}`);
  if (overdue) lines.push(`${overdue} atrasada${overdue === 1 ? '' : 's'}`);

  const result = { lastSummary: today, notification: null };
  if (lines.length) {
    const n = todayList.length;
    result.notification = {
      title: n ? `Buenos días · ${n} pendiente${n === 1 ? '' : 's'} para hoy` : 'Buenos días · hoy estás libre',
      body: lines.join(' · '),
      url: '#/',
      tag: `summary-${today}`,
    };
  }
  return result;
}
