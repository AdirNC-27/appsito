// Utilidades de fecha y hora. Perú usa UTC-5 todo el año (sin horario de verano),
// así que trabajamos con un desfase fijo. Funciona igual en el navegador y en Node.

export const OFFSET_H = -5;
export const MIN = 60 * 1000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

export const DOW_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
export const DOW_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const MON_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
export const MON_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];

/** Partes de la fecha en hora de Lima. dow: 0 = domingo. */
export function parts(ms) {
  const d = new Date(ms + OFFSET_H * HOUR);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), dow: d.getUTCDay(), h: d.getUTCHours(), min: d.getUTCMinutes() };
}

/** Milisegundos para una fecha/hora de Lima. */
export function limaMs(y, m, d, h = 0, min = 0) {
  return Date.UTC(y, m, d, h - OFFSET_H, min);
}

export function startOfDay(ms) {
  const p = parts(ms);
  return limaMs(p.y, p.m, p.d);
}

export function addDays(ms, n) {
  return ms + n * DAY; // sin horario de verano, sumar días es exacto
}

const pad = (n) => String(n).padStart(2, '0');

export function dayKey(ms) {
  const p = parts(ms);
  return `${p.y}-${pad(p.m + 1)}-${pad(p.d)}`;
}

export function fmtTime(ms) {
  const p = parts(ms);
  return `${pad(p.h)}:${pad(p.min)}`;
}

/** "jue 29 oct" */
export function fmtDay(ms) {
  const p = parts(ms);
  return `${DOW_SHORT[p.dow]} ${p.d} ${MON_SHORT[p.m]}`;
}

/** "jueves 29 de octubre" */
export function fmtDayLong(ms) {
  const p = parts(ms);
  return `${DOW_LONG[p.dow]} ${p.d} de ${MON_LONG[p.m]}`;
}

export function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** Valores para <input type="date"> y <input type="time"> */
export function toInputDate(ms) {
  return dayKey(ms);
}
export function toInputTime(ms) {
  return fmtTime(ms);
}
export function fromInputs(dateStr, timeStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, min] = (timeStr || '23:59').split(':').map(Number);
  return limaMs(y, m - 1, d, h, min);
}

/** "Hoy", "Mañana", "En 3 días", "Ayer", "Hace 2 días" */
export function relDay(ms, now) {
  const diff = Math.round((startOfDay(ms) - startOfDay(now)) / DAY);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  if (diff === -1) return 'Ayer';
  if (diff > 1) return `En ${diff} días`;
  return `Hace ${-diff} días`;
}

/** Cuenta regresiva {d, h, m} */
export function countdown(ms, now) {
  let t = Math.max(0, ms - now);
  const d = Math.floor(t / DAY); t -= d * DAY;
  const h = Math.floor(t / HOUR); t -= h * HOUR;
  const m = Math.floor(t / MIN);
  return { d, h, m };
}

/** "en 3 días", "en 5 h", "en 40 min" — para textos de avisos */
export function inText(ms, now) {
  const t = ms - now;
  if (t <= 0) return 'ahora';
  if (t >= 2 * DAY) return `en ${Math.round(t / DAY)} días`;
  if (t >= 20 * HOUR) return 'en 24 horas';
  if (t >= HOUR) return `en ${Math.round(t / HOUR)} h`;
  return `en ${Math.max(1, Math.round(t / MIN))} min`;
}
