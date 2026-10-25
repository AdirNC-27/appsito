// Genera un calendario .ics (para el Calendario del iPhone) con tus tareas y tu horario.
import { typeLabel } from './model.js';

const pad = (n) => String(n).padStart(2, '0');
function stamp(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
}
function esc(s = '') {
  return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}
// Las líneas de un .ics no deben pasar de 75 caracteres
function fold(line) {
  const out = [];
  let rest = line;
  while (rest.length > 74) { out.push(rest.slice(0, 74)); rest = ' ' + rest.slice(74); }
  out.push(rest);
  return out.join('\r\n');
}

const RRULE_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/**
 * @param {object} p
 * @param {Array} p.tasks   tareas (se incluyen las no terminadas)
 * @param {Array} p.courses cursos con horario
 * @param {number} p.now
 * @param {number} [p.termEnd] fin del ciclo (ms) para repetir las clases hasta esa fecha
 */
export function buildICS({ tasks = [], courses = [], now = Date.now(), termEnd }) {
  const byId = Object.fromEntries(courses.map((c) => [c.id, c]));
  const L = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Appsito//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:Appsito', 'X-WR-TIMEZONE:America/Lima', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
  ];
  const dtstamp = stamp(now);

  for (const t of tasks) {
    if (t.done || !t.due) continue;
    const c = byId[t.courseId];
    const len = t.type === 'examen' ? 60 : 30;
    L.push('BEGIN:VEVENT',
      `UID:task-${t.id}@appsito`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${stamp(t.due)}`,
      `DTEND:${stamp(t.due + len * 60000)}`,
      fold(`SUMMARY:${esc(`${typeLabel(t.type)}: ${t.title}`)}`),
      fold(`DESCRIPTION:${esc([c && c.name, t.notes].filter(Boolean).join('\n'))}`),
      'END:VEVENT');
  }

  if (termEnd) {
    const until = stamp(termEnd);
    for (const c of courses) {
      (c.schedule || []).forEach((b, i) => {
        // Primera clase: el próximo día de la semana que toque, desde hoy
        const base = new Date(now - 5 * 3600000);
        let y = base.getUTCFullYear(), m = base.getUTCMonth(), d = base.getUTCDate();
        for (let k = 0; k < 7; k++) {
          if (new Date(Date.UTC(y, m, d + k)).getUTCDay() === Number(b.day)) { d += k; break; }
        }
        const sh = Math.floor(b.start), sm = Math.round((b.start - sh) * 60);
        const eh = Math.floor(b.end), em = Math.round((b.end - eh) * 60);
        const start = Date.UTC(y, m, d, sh + 5, sm);
        const end = Date.UTC(y, m, d, eh + 5, em);
        const kind = b.kind === 'lab' ? 'Lab ' : '';
        L.push('BEGIN:VEVENT',
          `UID:class-${c.id}-${i}@appsito`,
          `DTSTAMP:${dtstamp}`,
          `DTSTART:${stamp(start)}`,
          `DTEND:${stamp(end)}`,
          `RRULE:FREQ=WEEKLY;BYDAY=${RRULE_DAYS[b.day]};UNTIL=${until}`,
          fold(`SUMMARY:${esc(kind + c.name)}`),
          fold(`DESCRIPTION:${esc([b.teacher, b.note].filter(Boolean).join(' · '))}`),
          'END:VEVENT');
      });
    }
  }
  L.push('END:VCALENDAR');
  return L.join('\r\n') + '\r\n';
}
