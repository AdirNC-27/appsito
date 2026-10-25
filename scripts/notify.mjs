// Robot de avisos de Appsito. Lo ejecuta GitHub Actions cada 10 minutos.
// Lee tus tareas de Firestore, manda las notificaciones que tocan y
// (opcional) actualiza tu calendario suscrito del iPhone.
//
// IMPORTANTE: el repositorio es público, así que los registros (logs) también.
// Por eso aquí solo se imprimen cantidades, nunca títulos de tus tareas.

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import webpush from 'web-push';
import { processReminders, dailySummary } from './core.mjs';
import { buildICS } from '../js/shared/ics.js';
import { parts } from '../js/shared/time.js';

const env = process.env;
const args = new Set(process.argv.slice(2));
const TEST = args.has('--test') || env.APPSITO_TEST === 'true';
const FORCE_ICS = args.has('--ics');

function need(name) {
  const v = env[name];
  if (!v || !v.trim()) { console.error(`Falta el secreto ${name}. Revisa la guía (paso de secretos de GitHub).`); process.exit(1); }
  return v.trim();
}

const serviceAccount = JSON.parse(need('FIREBASE_SERVICE_ACCOUNT'));
const uid = need('OWNER_UID');
webpush.setVapidDetails(env.VAPID_SUBJECT?.trim() || 'mailto:appsito@example.com', need('VAPID_PUBLIC_KEY'), need('VAPID_PRIVATE_KEY'));

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
const user = db.collection('users').doc(uid);
const now = Date.now();

async function getSubs() {
  const snap = await user.collection('subs').get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function sendAll(subs, notification) {
  let ok = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify(notification), { TTL: 6 * 3600, urgency: 'high' });
      ok++;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) {
        await user.collection('subs').doc(s.id).delete();
        console.log('Se eliminó un dispositivo que ya no recibe avisos.');
      } else {
        console.warn('Error al enviar a un dispositivo:', e.statusCode || '', e.body || e.message);
      }
    }
  }
  return ok;
}

async function main() {
  const subs = await getSubs();
  console.log(`Dispositivos registrados: ${subs.length}`);

  if (TEST) {
    const n = await sendAll(subs, { title: 'Appsito funciona 🎉', body: 'Este es un aviso de prueba enviado por tu robot de GitHub.', url: '#/', tag: 'test' });
    console.log(`Prueba enviada a ${n} dispositivo(s).`);
    if (!subs.length) console.log('No hay dispositivos: abre Appsito en tu iPhone → Ajustes → Activar notificaciones.');
    return;
  }

  // 1) Avisos de tareas
  const dueSnap = await user.collection('tasks').where('nextReminderAt', '<=', now).get();
  let courses = null;
  const loadCourses = async () => {
    if (!courses) courses = (await user.collection('courses').get()).docs.map((d) => ({ id: d.id, ...d.data() }));
    return courses;
  };
  if (!dueSnap.empty) {
    const tasks = dueSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const { notifications, updates } = processReminders({ tasks, courses: await loadCourses(), now });
    let sent = 0;
    for (const n of notifications) sent += (await sendAll(subs, n)) > 0 ? 1 : 0;
    const batch = db.batch();
    updates.forEach((u) => batch.update(user.collection('tasks').doc(u.id), { reminders: u.reminders, nextReminderAt: u.nextReminderAt }));
    await batch.commit();
    console.log(`Avisos: ${notifications.length} por enviar, ${sent} enviados.`);
  } else {
    console.log('Avisos: nada pendiente ahora.');
  }

  // 2) Resumen diario
  const settingsDoc = await user.collection('settings').doc('main').get();
  const settings = settingsDoc.exists ? settingsDoc.data() : {};
  const h = parts(now).h;
  const hour = Number(settings.summaryHour ?? 7);
  let allTasks = null;
  if (settings.dailySummary !== false && h >= hour && h < hour + 3) {
    allTasks = (await user.collection('tasks').get()).docs.map((d) => ({ id: d.id, ...d.data() }));
    const res = dailySummary({ tasks: allTasks, courses: await loadCourses(), now, settings });
    if (res) {
      if (res.notification) await sendAll(subs, res.notification);
      await user.collection('settings').doc('main').set({ lastSummary: res.lastSummary }, { merge: true });
      console.log(`Resumen diario: ${res.notification ? 'enviado' : 'sin pendientes, no se envió'}.`);
    }
  }

  // 3) Calendario suscrito (opcional): se actualiza una vez por hora
  const gistId = env.GIST_ID?.trim(), gistToken = env.GIST_TOKEN?.trim();
  if (gistId && gistToken && (FORCE_ICS || new Date(now).getUTCMinutes() < 10)) {
    allTasks ||= (await user.collection('tasks').get()).docs.map((d) => ({ id: d.id, ...d.data() }));
    const termEnd = settings.termEnd ? Date.parse(settings.termEnd + 'T23:59:00-05:00') : null;
    const ics = buildICS({ tasks: allTasks, courses: await loadCourses(), now, termEnd });
    const r = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${gistToken}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'User-Agent': 'appsito' },
      body: JSON.stringify({ files: { 'appsito.ics': { content: ics } } }),
    });
    console.log(r.ok ? 'Calendario actualizado.' : `No se pudo actualizar el calendario (HTTP ${r.status}). Revisa GIST_ID y GIST_TOKEN.`);
  }
}

main().catch((e) => { console.error('Error:', e.message); process.exit(1); });
