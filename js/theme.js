// Tema claro / oscuro / automático
const mq = window.matchMedia('(prefers-color-scheme: dark)');
let current = 'auto';

export function applyTheme(pref = current) {
  current = pref || 'auto';
  const root = document.documentElement;
  root.dataset.theme = current;
  const dark = current === 'dark' || (current === 'auto' && mq.matches);
  root.dataset.resolved = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#04325F' : '#0B7BE0');
  try { localStorage.setItem('appsito-theme', current); } catch { /* */ }
}

export function initTheme(onChange) {
  let saved = 'auto';
  try { saved = localStorage.getItem('appsito-theme') || 'auto'; } catch { /* */ }
  applyTheme(saved);
  mq.addEventListener?.('change', () => { if (current === 'auto') { applyTheme('auto'); onChange && onChange(); } });
}

export const isDark = () => document.documentElement.dataset.resolved === 'dark';
