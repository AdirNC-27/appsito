// Conexión con Firebase (cargado desde el CDN oficial de Google, sin instalar nada).
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail,
} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, getDoc, getDocs, writeBatch,
} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
import { firebaseConfig } from './config.js';

export const configured = !String(firebaseConfig.apiKey).startsWith('PEGA');

let app, auth, db;
if (configured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  // Caché local: la app funciona sin internet y sincroniza al reconectar
  db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
}

export { auth, db };
export const fb = {
  onAuthStateChanged: (cb) => onAuthStateChanged(auth, cb),
  signIn: (email, pass) => signInWithEmailAndPassword(auth, email, pass),
  signOut: () => signOut(auth),
  resetPassword: (email) => sendPasswordResetEmail(auth, email),
};

// Rutas de datos: todo vive dentro de users/{uid}/...
let uid = null;
export function setUid(u) { uid = u; }
export const col = (name) => collection(db, 'users', uid, name);
export const ref = (name, id) => doc(db, 'users', uid, name, id);

export const api = {
  listen: (name, cb, onErr) => onSnapshot(col(name), (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), onErr),
  listenDoc: (name, id, cb) => onSnapshot(ref(name, id), (d) => cb(d.exists() ? d.data() : null)),
  set: (name, id, data) => setDoc(ref(name, id), data),
  merge: (name, id, data) => setDoc(ref(name, id), data, { merge: true }),
  update: (name, id, data) => updateDoc(ref(name, id), data),
  remove: (name, id) => deleteDoc(ref(name, id)),
  get: async (name, id) => { const d = await getDoc(ref(name, id)); return d.exists() ? d.data() : null; },
  all: async (name) => (await getDocs(col(name))).docs.map((d) => ({ id: d.id, ...d.data() })),
  batch: () => writeBatch(db),
  ref,
};

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
