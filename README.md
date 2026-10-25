# Appsito

Tu app personal para la universidad. Registra tareas, exámenes, laboratorios, horario y notas, y te manda recordatorios al celular **1 semana, 3 días, 24 horas y 2 horas antes**. Funciona en iPhone y en la laptop, es gratis y es solo para ti.

👉 **Para instalarla, sigue [GUIA.md](GUIA.md)** (unos 40 minutos, una sola vez).

## Qué hace
- **Inicio:** cuenta regresiva del próximo examen, lo de hoy, atrasadas y próximos 15 días, con filtros por tipo.
- **Nueva tarea:** eliges curso y tipo, y te sugiere las fechas de tus próximas clases o laboratorios. Incluye avisos, repetición semanal y plan de repaso para exámenes.
- **Calendario:** vista del mes y horario semanal de lunes a viernes, con teoría, laboratorios y clases virtuales.
- **Notas:**
  - Evaluaciones con porcentaje por curso.
  - Promedio actual y promedio ponderado del ciclo.
  - "¿Qué necesito para aprobar?" y simulador.
- **Estudio:** temporizador Pomodoro, minutos por curso y sesiones de repaso.
- **Ajustes:**
  - Tema claro, oscuro o automático.
  - Avisos por defecto y resumen diario.
  - Calendario del iPhone (.ics).
  - Respaldo e importación, y edición de cursos y horario.
- **Sin internet:** funciona offline y sincroniza al reconectar.

## Cómo está hecha
- **Frontend:** HTML, CSS y JavaScript sin compilación (módulos ES). Es una PWA instalable con service worker.
- **Datos e inicio de sesión:** Firebase Firestore y Authentication con correo y contraseña. Las reglas permiten que cada usuario solo vea sus datos.
- **Avisos:** Web Push con claves VAPID, enviados por `scripts/notify.mjs`, que corre cada 10 minutos en GitHub Actions.
- **Hosting:** GitHub Pages.

```
index.html, manifest.webmanifest, sw.js   app instalable
css/app.css                               estilos (claro/oscuro)
js/config.js                              ← tus datos de Firebase y clave pública
js/app.js                                 rutas e inicio de sesión
js/store.js                               estado y acciones (Firestore)
js/views/*.js                             pantallas
js/shared/*.js                            lógica compartida con el robot (fechas, avisos, notas, .ics)
js/seed.js                                tu horario 2026-II (se carga la primera vez)
scripts/notify.mjs, scripts/core.mjs      robot de avisos
.github/workflows/                        robot cada 10 min + latido mensual
herramientas/claves.html                  generador de claves VAPID (en tu navegador)
tests/                                    pruebas de la lógica (npm test)
```

## Para desarrollar
```bash
npm install
npm test              # pruebas de fechas, avisos, notas, horario y calendario
npx serve .           # o cualquier servidor estático, y abre http://localhost:3000
```
