// Piezas de interfaz reutilizables.
import { state, courseById } from './store.js';
import { fmtDay, fmtTime, parts, DOW_SHORT, startOfDay, DAY, relDay } from './shared/time.js';
import { typeLabel } from './shared/model.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const P = {
  home: '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  cap: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  next: '<path d="m9 18 6-6-6-6"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z"/><path d="M6.5 17A2.5 2.5 0 0 0 4 19.5 2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
};

export function icon(name, size = 22, sw = 2) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
}

/** Ondas de luz para la cabecera */
export const WAVES = `<svg class="waves" viewBox="0 0 390 320" preserveAspectRatio="none" aria-hidden="true">
  <path d="M-40 250 C 80 140, 220 330, 440 90" stroke="rgba(255,255,255,0.10)" stroke-width="70" fill="none"/>
  <path d="M-40 250 C 80 140, 220 330, 440 90" stroke="rgba(255,255,255,0.45)" stroke-width="1.5" fill="none"/>
  <path d="M-30 330 C 120 210, 250 260, 430 170" stroke="rgba(255,255,255,0.08)" stroke-width="44" fill="none"/>
  <path d="M-30 330 C 120 210, 250 260, 430 170" stroke="rgba(255,255,255,0.35)" stroke-width="1" fill="none"/>
  <path d="M60 -20 C 20 80, 40 160, -20 260" stroke="rgba(255,255,255,0.10)" stroke-width="36" fill="none"/>
  <path d="M300 -30 C 260 60, 380 110, 420 40" stroke="rgba(255,255,255,0.12)" stroke-width="50" fill="none"/>
</svg>`;

let toastTimer;
export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

export const TYPE_COLORS = { examen: '#DB2777', lab: '#4F46E5', trabajo: '#EA580C', tarea: '#0B7BE0', otro: '#64748B', repaso: '#0D9488' };

/** Insignia de una tarea según urgencia y tipo */
export function taskBadge(t, now = Date.now()) {
  if (t.done) return '<span class="badge b-ok">Hecho</span>';
  if (t.due < now) return '<span class="badge b-over">Atrasada</span>';
  const days = Math.round((startOfDay(t.due) - startOfDay(now)) / DAY);
  if (days === 0) return `<span class="badge b-hoy">Hoy · ${fmtTime(t.due)}</span>`;
  if (days === 1) return '<span class="badge b-man">Mañana</span>';
  if (t.type === 'examen') return '<span class="badge b-ex">Examen</span>';
  if (t.type === 'lab') return '<span class="badge b-lab">Lab</span>';
  return `<span class="badge b-sky">${days} días</span>`;
}

/** Fila de tarea con fecha a la izquierda */
export function taskRow(t, { now = Date.now(), showDate = true } = {}) {
  const c = courseById(t.courseId);
  const p = parts(t.due);
  const rep = t.repeat && t.repeat !== 'none' ? icon('repeat', 12) : '';
  return `<div class="item ${t.done ? 'done' : ''}">
    ${showDate ? `<a class="datebox" href="#/tarea/${t.id}" aria-label="Editar"><small>${DOW_SHORT[p.dow]}</small><b>${p.d}</b></a>` : ''}
    <a class="grow" href="#/tarea/${t.id}" style="text-decoration:none;color:inherit">
      <span class="title">${esc(t.title)}</span>
      <span class="sub">${c ? `<span class="dot" style="background:${c.color}"></span>${esc(c.name)} · ` : ''}${typeLabel(t.type)} · ${fmtTime(t.due)} ${rep}</span>
    </a>
    ${taskBadge(t, now)}
    <button class="check sm ${t.done ? 'on' : ''}" data-action="toggle" data-id="${t.id}" aria-label="${t.done ? 'Marcar como pendiente' : 'Marcar como hecho'}">${icon('check', 16, 3)}</button>
  </div>`;
}

export function courseDot(c) {
  return c ? `<span class="dot" style="background:${c.color}"></span>` : '';
}

/** Navegación (abajo en celular, a la izquierda en laptop) */
export function nav(active) {
  const a = (href, key, ic, label) => `<a href="${href}" class="${active === key ? 'on' : ''}" ${active === key ? 'aria-current="page"' : ''}>${icon(ic)}${label}</a>`;
  return `<nav class="nav" aria-label="Principal">
    <div class="brand"><span class="logo-mark" style="width:40px;height:40px;border-radius:12px;background:var(--hero);border:0;color:#fff">${icon('bell', 20)}</span>Appsito</div>
    ${a('#/', 'home', 'home', 'Inicio')}
    ${a('#/calendario', 'cal', 'cal', 'Calendario')}
    <a href="#/tarea/nueva" class="fab" aria-label="Nueva tarea">${icon('plus', 26, 2.5)}</a>
    ${a('#/notas', 'notas', 'cap', 'Notas')}
    ${a('#/estudio', 'estudio', 'timer', 'Estudio')}
    <a href="#/ajustes" class="nav-extra ${active === 'ajustes' ? 'on' : ''}">${icon('gear')}Ajustes</a>
  </nav>`;
}

export const greetingName = () => {
  const email = state.user?.email || '';
  const n = state.settings.name || email.split('@')[0].split('.')[0] || '';
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : '';
};
