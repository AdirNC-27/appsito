// Appsito · arranque, rutas e inicio de sesión
import { configured, fb } from './firebase.js';
import { state, subscribe, start, stop, taskById, toggleDone, saveSettings } from './store.js';
import { nav, icon, toast, esc, WAVES } from './ui.js';
import { initTheme, applyTheme, isDark } from './theme.js';
import home from './views/home.js';
import { monthView, timetableView } from './views/calendar.js';
import task from './views/task.js';
import { gradesView, courseGradesView } from './views/grades.js';
import study from './views/study.js';
import settings from './views/settings.js';
import { coursesView, courseEditView } from './views/courses.js';

const ROUTES = [
  [/^$/, home, 'home'],
  [/^calendario$/, monthView, 'cal'],
  [/^horario$/, timetableView, 'cal'],
  [/^tarea\/([^/]+)$/, task, 'new'],
  [/^notas$/, gradesView, 'notas'],
  [/^notas\/([^/]+)$/, courseGradesView, 'notas'],
  [/^estudio$/, study, 'estudio'],
  [/^ajustes$/, settings, 'ajustes'],
  [/^cursos$/, coursesView, 'ajustes'],
  [/^cursos\/([^/]+)$/, courseEditView, 'ajustes'],
];

const app = document.getElementById('app');
let current = null; // { view, params, query, key, navKey }
let tickTimer = null;
let authReady = false;

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, qs] = raw.split('?');
  for (const [re, view, navKey] of ROUTES) {
    const m = path.match(re);
    if (m) return { view, params: { id: m[1] }, query: new URLSearchParams(qs || ''), key: raw, navKey };
  }
  return { view: home, params: {}, query: new URLSearchParams(), key: '', navKey: 'home' };
}

const go = (hash) => { if (location.hash === hash) render(true); else location.hash = hash; };

/* ---------- Pantallas especiales ---------- */

function setupScreen() {
  return `<div class="setup">
    <div class="splash-logo" style="animation:none"></div>
    <h1>Falta configurar Appsito</h1>
    <p>Abre <code>js/config.js</code> y pega los datos de tu proyecto de Firebase y tu clave pública de notificaciones. Los pasos están en <code>GUIA.md</code>.</p>
  </div>`;
}

function loginScreen(error = '') {
  return `<div class="login">
    <div class="hero">${WAVES}
      <span class="logo-mark">${icon('bell', 28)}</span>
      <h1 style="font-size:34px">Appsito</h1>
      <p class="over" style="font-size:15px">Tus tareas, exámenes, horario y notas.<br>Con avisos para que nada se te pase.</p>
    </div>
    <form id="login-form" novalidate>
      <div class="field"><label for="l-email">Correo</label><input id="l-email" class="input" type="email" autocomplete="username" required></div>
      <div class="field"><label for="l-pass">Contraseña</label><input id="l-pass" class="input" type="password" autocomplete="current-password" required></div>
      ${error ? `<p class="err" role="alert">${esc(error)}</p>` : ''}
      <button class="btn btn-primary" type="submit">Entrar</button>
      <button class="btn" type="button" id="l-reset" style="border:0;background:none;color:var(--accent);min-height:40px">¿Olvidaste tu contraseña?</button>
    </form>
  </div>`;
}

const AUTH_ERRORS = {
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/invalid-email': 'Ese correo no es válido.',
  'auth/too-many-requests': 'Demasiados intentos. Espera un momento.',
  'auth/network-request-failed': 'Sin conexión a internet.',
};

function bindLogin() {
  const form = document.getElementById('login-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true; btn.textContent = 'Entrando…';
    try { await fb.signIn(form.querySelector('#l-email').value.trim(), form.querySelector('#l-pass').value); }
    catch (err) { app.innerHTML = loginScreen(AUTH_ERRORS[err.code] || err.message); bindLogin(); }
  });
  document.getElementById('l-reset').addEventListener('click', async () => {
    const email = document.getElementById('l-email').value.trim();
    if (!email) { toast('Escribe tu correo primero'); return; }
    try { await fb.resetPassword(email); toast('Te enviamos un correo para cambiar tu contraseña'); } catch (err) { toast(AUTH_ERRORS[err.code] || err.message); }
  });
}

/* ---------- Render ---------- */

function focusKey(el) {
  if (!el || el === document.body) return null;
  if (el.id) return '#' + el.id;
  const attrs = ['data-i', 'data-k', 'data-b'].filter((a) => el.hasAttribute(a)).map((a) => `[${a}="${el.getAttribute(a)}"]`).join('');
  return attrs || null;
}

function render(routeChanged = false) {
  if (!configured) { app.innerHTML = setupScreen(); return; }
  if (!authReady) return;
  if (!state.user) { app.innerHTML = loginScreen(); bindLogin(); return; }
  if (!state.ready) {
    app.innerHTML = state.error
      ? `<div class="setup"><h1>No se pudieron cargar tus datos</h1><p class="err">${esc(state.error)}</p>
          <p>Revisa que publicaste las reglas de Firestore (GUIA, paso 1.3) y que tienes internet.</p>
          <button class="btn" onclick="location.reload()">Reintentar</button></div>`
      : `<div class="splash"><div class="splash-logo"></div><p>Cargando tus datos…</p></div>`;
    return;
  }
  const r = parseHash();
  if (routeChanged || !current || current.key !== r.key) {
    current?.view.unmount?.();
    current = r;
    r.view.enter?.(r.params, r.query);
    routeChanged = true;
  }
  const keep = focusKey(document.activeElement);
  const scroll = window.scrollY;
  current.view.unmount?.();
  const body = current.view.render(current.params, current.query);
  app.innerHTML = `<div class="shell">${nav(current.navKey)}<main class="main" id="main">${body}</main></div>`;
  const root = document.getElementById('main');
  current.view.mount?.(root, current.params, () => render(), go);
  if (routeChanged) window.scrollTo(0, 0); else window.scrollTo(0, scroll);
  if (keep && !routeChanged) {
    const el = root.querySelector(keep);
    if (el) { el.focus({ preventScroll: true }); }
  }
  clearInterval(tickTimer);
  if (current.view.tick) tickTimer = setInterval(() => { if (!document.hidden) render(); }, current.view.tick);
}

/* ---------- Acciones (delegación de eventos) ---------- */

app.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || !app.contains(el)) return;
  if (el.tagName === 'A') e.preventDefault();
  const action = el.dataset.action;
  if (action === 'toggle') {
    const t = taskById(el.dataset.id);
    if (t) { toggleDone(t); toast(t.done ? 'Marcada como pendiente' : '¡Hecho! Bien ahí 🎉'); }
    return;
  }
  if (action === 'theme') {
    const next = isDark() ? 'light' : 'dark';
    applyTheme(next);
    saveSettings({ theme: next });
    render();
    return;
  }
  if (current?.view.onAction) {
    const handled = await current.view.onAction(action, el, () => render(), go, current.params);
    if (!handled && el.tagName === 'A' && el.getAttribute('href')) go(el.getAttribute('href'));
  }
});

window.addEventListener('hashchange', () => render(true));
window.addEventListener('appsito-error', (e) => toast('Error al guardar: ' + e.detail));
document.addEventListener('visibilitychange', () => { if (!document.hidden && current && !current.view.persist) render(); });

/* ---------- Arranque ---------- */

initTheme(() => render());

subscribe(() => {
  // Aplica el tema guardado en tu cuenta
  if (state.settings.theme && state.settings.theme !== document.documentElement.dataset.theme) applyTheme(state.settings.theme);
  if (!current || !current.view.persist || !app.querySelector('.shell')) render();
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Service worker', e));
  navigator.serviceWorker.addEventListener('message', (e) => { if (e.data?.type === 'navigate') go(e.data.url); });
}

if (configured) {
  fb.onAuthStateChanged(async (user) => {
    authReady = true;
    if (user) { await start(user); } else { stop(); }
    render(true);
  });
} else {
  render();
}
