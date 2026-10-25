// Notificaciones push (Web Push). En iPhone solo funcionan con la app
// agregada a la pantalla de inicio (iOS 16.4 o superior).
import { VAPID_PUBLIC_KEY } from './config.js';
import { saveSubscription, removeSubscription } from './store.js';

const KEY = 'appsito-push-id';
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } };

export function pushStatus() {
  if (isIOS() && !standalone()) return 'install';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission === 'granted' && lsGet(KEY)) return 'on';
  return 'off';
}

function b64ToBytes(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function idFor(endpoint) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return [...new Uint8Array(buf)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Debe llamarse desde un toque del usuario (requisito de iOS). */
export async function enablePush() {
  if (VAPID_PUBLIC_KEY.startsWith('PEGA')) throw new Error('Falta la clave pública en js/config.js (mira la guía).');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('No diste permiso para notificaciones.');
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID_PUBLIC_KEY) });
  const json = sub.toJSON();
  const id = await idFor(json.endpoint);
  await saveSubscription(id, { endpoint: json.endpoint, keys: json.keys, device: navigator.userAgent.slice(0, 140), createdAt: Date.now() });
  lsSet(KEY, id);
  return id;
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  const id = lsGet(KEY);
  if (sub) await sub.unsubscribe();
  if (id) await removeSubscription(id);
  lsSet(KEY, null);
}

/** Notificación local de prueba (no pasa por el servidor) */
export async function testLocal(title = 'Appsito', body = '¡Las notificaciones funcionan en este dispositivo!') {
  const reg = await navigator.serviceWorker.ready;
  await reg.showNotification(title, { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'appsito-test' });
}
