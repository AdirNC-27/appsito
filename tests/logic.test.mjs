import { test } from 'node:test';
import assert from 'node:assert/strict';
import { limaMs, parts, fmtDay, fmtTime, fromInputs, dayKey, relDay, HOUR, DAY } from '../js/shared/time.js';
import { buildReminders, nextReminderAt, courseStats, termAverage, upcomingSlots, studyPlanDates, nextOccurrence, reminderMessage } from '../js/shared/model.js';
import { processReminders, dailySummary } from '../scripts/core.mjs';
import { buildICS } from '../js/shared/ics.js';
import { SEED_COURSES } from '../js/seed.js';

const NOW = limaMs(2026, 9, 24, 21, 6); // sáb 24 oct 2026, 21:06 en Lima

test('fechas en hora de Lima', () => {
  const p = parts(NOW);
  assert.equal(p.dow, 6); // sábado
  assert.equal(p.h, 21);
  assert.equal(fmtDay(limaMs(2026, 9, 29, 7)), 'jue 29 oct');
  assert.equal(fmtTime(limaMs(2026, 9, 29, 7)), '07:00');
  assert.equal(fromInputs('2026-10-29', '07:00'), limaMs(2026, 9, 29, 7));
  assert.equal(dayKey(limaMs(2026, 9, 24, 23, 59)), '2026-10-24');
  assert.equal(relDay(limaMs(2026, 9, 25, 8), NOW), 'Mañana');
});

test('avisos: 1 semana, 3 días, 24 h, 2 h; los pasados quedan como enviados', () => {
  const due = limaMs(2026, 9, 29, 7); // jue 29, 07:00
  const r = buildReminders(due, [10080, 4320, 1440, 120], NOW);
  assert.deepEqual(r.map((x) => x.offsetMin), [10080, 4320, 1440, 120]);
  assert.equal(r[0].sent, true);  // 1 semana antes = jue 22 → ya pasó
  assert.equal(r[1].sent, false); // lun 26 07:00
  assert.equal(nextReminderAt(r, false), limaMs(2026, 9, 26, 7));
  assert.equal(nextReminderAt(r, true), null);
});

test('robot: envía un aviso por tarea y marca los vencidos', () => {
  const due = limaMs(2026, 9, 29, 7);
  const reminders = buildReminders(due, [4320, 1440, 120], limaMs(2026, 9, 20));
  const task = { id: 't1', title: 'Examen parcial', type: 'examen', courseId: 'tel', due, done: false, reminders };
  const at = limaMs(2026, 9, 28, 7, 3); // mié 28 07:03 → ya pasaron 3 días y 24 h
  const { notifications, updates } = processReminders({ tasks: [task], courses: SEED_COURSES, now: at });
  assert.equal(notifications.length, 1);
  assert.match(notifications[0].title, /Examen en 24 horas/);
  assert.match(notifications[0].body, /Telecomunicaciones/);
  assert.deepEqual(updates[0].reminders.map((r) => r.sent), [true, true, false]);
  assert.equal(updates[0].nextReminderAt, limaMs(2026, 9, 29, 5));
});

test('robot: no manda avisos muy atrasados ni de tareas hechas', () => {
  const due = limaMs(2026, 9, 29, 7);
  const reminders = [{ offsetMin: 1440, at: limaMs(2026, 9, 28, 7), sent: false }];
  const old = processReminders({ tasks: [{ id: 'a', title: 'x', type: 'tarea', due, done: false, reminders }], courses: [], now: limaMs(2026, 9, 28, 21) });
  assert.equal(old.notifications.length, 0);
  assert.equal(old.updates[0].reminders[0].sent, true);
  const done = processReminders({ tasks: [{ id: 'b', title: 'x', type: 'tarea', due, done: true, reminders }], courses: [], now: limaMs(2026, 9, 28, 7, 5) });
  assert.equal(done.notifications.length, 0);
  assert.equal(done.updates[0].nextReminderAt, null);
});

test('resumen diario a las 7:00, una vez por día', () => {
  const tasks = [
    { id: '1', title: 'Lab 2', type: 'lab', courseId: 'ia', due: limaMs(2026, 9, 26, 23, 59), done: false },
    { id: '2', title: 'Avance', type: 'trabajo', courseId: 'tes', due: limaMs(2026, 9, 27, 16), done: false },
  ];
  const at7 = limaMs(2026, 9, 26, 7, 4);
  const res = dailySummary({ tasks, courses: SEED_COURSES, now: at7, settings: { dailySummary: true, summaryHour: 7, lastSummary: '' } });
  assert.ok(res.notification);
  assert.match(res.notification.title, /1 pendiente para hoy/);
  assert.match(res.notification.body, /Hoy: Lab 2/);
  assert.match(res.notification.body, /Mañana: Avance/);
  assert.equal(dailySummary({ tasks, courses: SEED_COURSES, now: at7, settings: { summaryHour: 7, lastSummary: '2026-10-26' } }), null);
  assert.equal(dailySummary({ tasks, courses: SEED_COURSES, now: limaMs(2026, 9, 26, 6), settings: { summaryHour: 7 } }), null);
});

test('notas: promedio, lo que falta y simulador', () => {
  const comps = [
    { name: 'Primer parcial', weight: 20, grade: 8 },
    { name: 'Segundo parcial', weight: 30, grade: null },
    { name: 'Prácticas', weight: 20, grade: 13 },
    { name: 'Laboratorio', weight: 30, grade: 15 },
  ];
  const s = courseStats(comps, 10.5);
  assert.equal(s.total, 100);
  assert.equal(s.wDone, 70);
  assert.ok(Math.abs(s.current - 12.43) < 0.01); // (1.6+2.6+4.5)/0.7
  assert.ok(Math.abs(s.passNeed - 6) < 0.001);   // (10.5-8.7)/0.3
  assert.ok(Math.abs(s.projected(12) - 12.3) < 0.001);
  const done = courseStats([{ weight: 50, grade: 10 }, { weight: 50, grade: 11 }], 10.5);
  assert.equal(done.finalGrade, 10.5);
  const term = termAverage([{ components: comps, credits: 4 }, { components: [{ weight: 100, grade: 16 }], credits: 3 }]);
  assert.ok(term.weighted);
  assert.ok(Math.abs(term.avg - (s.current * 4 + 16 * 3) / 7) < 1e-9);
});

test('horario: próximas clases y laboratorios', () => {
  const ia = SEED_COURSES.find((c) => c.id === 'ia');
  const slots = upcomingSlots(ia, NOW, { limit: 4 });
  assert.deepEqual(slots.map((s) => `${fmtDay(s.at)} ${fmtTime(s.at)}`), ['mar 27 oct 16:00', 'jue 29 oct 17:00', 'mar 3 nov 16:00', 'jue 5 nov 17:00']);
  const labs = upcomingSlots(ia, NOW, { labs: true, limit: 1 });
  assert.equal(`${fmtDay(labs[0].at)} ${fmtTime(labs[0].at)}`, 'jue 29 oct 09:00');
  const ss = SEED_COURSES.find((c) => c.id === 'ss');
  assert.equal(upcomingSlots(ss, NOW, { labs: true }).length, 0);
  assert.equal(fmtTime(upcomingSlots(ss, NOW)[0].at), '09:00');
});

test('plan de repaso y repetición semanal', () => {
  const exam = limaMs(2026, 9, 29, 7);
  const plan = studyPlanDates(exam, NOW);
  assert.deepEqual(plan.map((p) => `${fmtDay(p)} ${fmtTime(p)}`), ['dom 25 oct 19:00', 'lun 26 oct 19:00', 'mar 27 oct 19:00', 'mié 28 oct 19:00']);
  assert.equal(nextOccurrence({ due: exam, repeat: 'weekly' }), exam + 7 * DAY);
  assert.equal(nextOccurrence({ due: exam, repeat: 'none' }), null);
});

test('mensaje del aviso', () => {
  const m = reminderMessage({ title: 'Parcial', type: 'examen', due: limaMs(2026, 9, 29, 7) }, { name: 'Telecomunicaciones' }, limaMs(2026, 9, 26, 7));
  assert.equal(m.title, 'Examen en 3 días: Parcial');
  assert.equal(m.body, 'Telecomunicaciones · jue 29 oct, 07:00');
});

test('calendario .ics con tareas y clases semanales', () => {
  const ics = buildICS({
    tasks: [{ id: 'x', title: 'Parcial, cap. 1', type: 'examen', due: limaMs(2026, 9, 29, 7), courseId: 'tel' }],
    courses: SEED_COURSES, now: NOW, termEnd: limaMs(2026, 11, 31, 23, 59),
  });
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /DTSTART:20261029T120000Z/); // 07:00 Lima = 12:00 UTC
  assert.match(ics, /SUMMARY:Examen: Parcial\\, cap. 1/);
  assert.match(ics, /RRULE:FREQ=WEEKLY;BYDAY=FR;UNTIL=/);
  assert.ok(ics.split('\r\n').every((l) => l.length <= 75));
});
