# Guía para poner en marcha Appsito

Tiempo aproximado: **40 minutos**, una sola vez. Todo es **gratis** y no necesitas tarjeta.

Vas a usar tres cosas:

| Servicio | Para qué | Costo |
|---|---|---|
| **Firebase** (Google) | Guardar tus tareas, cursos y notas en la nube, e iniciar sesión | Gratis (plan Spark) |
| **GitHub Pages** | Publicar la app en internet (tu propio enlace) | Gratis |
| **GitHub Actions** | El "robot" que cada 10 minutos revisa y te manda los avisos | Gratis |

> **Nunca compartas** tu contraseña, el archivo JSON de la cuenta de servicio ni tu clave privada de notificaciones. Solo van en los lugares que indica esta guía.

---

## Paso 1 · Crear el proyecto en Firebase

1. Entra a **https://console.firebase.google.com** con tu cuenta de Google.
2. **Crear un proyecto** → nombre: `appsito` → puedes **desactivar Google Analytics** → Crear.

### 1.1 Registrar la app web
1. En la página del proyecto toca el ícono **`</>`** (Web).
2. Apodo: `Appsito`. **No** marques Firebase Hosting. → Registrar app.
3. Te mostrará un bloque `const firebaseConfig = { ... }`. Copia esos valores en el archivo **`js/config.js`** de este proyecto, reemplazando cada `PEGA_AQUI`.

```js
export const firebaseConfig = {
  apiKey: 'AIza…',
  authDomain: 'appsito-xxxx.firebaseapp.com',
  projectId: 'appsito-xxxx',
  storageBucket: 'appsito-xxxx.firebasestorage.app',
  messagingSenderId: '1234…',
  appId: '1:1234…:web:abcd…',
};
```

> Estos datos **no son secretos**: Firebase está hecho para que vayan en la página. Lo que protege tus datos son las reglas del paso 1.3.

### 1.2 Crear tu usuario (inicio de sesión)
1. Menú izquierdo → **Compilación → Authentication** → **Comenzar**.
2. Pestaña **Método de acceso** → **Correo electrónico/contraseña** → **Habilitar** → Guardar.
3. Pestaña **Usuarios** → **Agregar usuario** → escribe tu correo y una contraseña → Agregar.
4. En la lista aparece tu usuario con un **UID** (por ejemplo `Xk3p9…`). **Cópialo y guárdalo**: lo usarás en el Paso 4.
5. Pestaña **Configuración** → **Acciones del usuario** → **desmarca "Habilitar creación (registro)"** → Guardar. Así nadie más puede crearse una cuenta en tu app.
6. En esa misma pestaña → **Dominios autorizados** → **Agregar dominio** → `TU_USUARIO.github.io` (tu usuario de GitHub).

### 1.3 Crear la base de datos
1. Menú izquierdo → **Compilación → Firestore Database** → **Crear base de datos**.
2. Ubicación: **`southamerica-east1 (São Paulo)`**, la más cercana a Perú. → Siguiente.
3. Elige **Iniciar en modo de producción** → Crear.
4. Pestaña **Reglas** → borra lo que hay → pega el contenido del archivo **`firestore.rules`** → **Publicar**.

### 1.4 Descargar la llave del robot
1. Ícono de engranaje ⚙ (arriba a la izquierda) → **Configuración del proyecto** → pestaña **Cuentas de servicio**.
2. **Generar nueva clave privada** → Generar clave. Se descarga un archivo `.json`.
3. **Guárdalo en un lugar seguro y NO lo pongas dentro de la carpeta del proyecto.** Lo pegarás como secreto en GitHub (Paso 4).

---

## Paso 2 · Subir Appsito a GitHub y publicarlo

1. Entra a **https://github.com/new**.
2. Nombre del repositorio: **`appsito`** → **Public** → Create repository.
   - Debe ser público para que GitHub Pages y el robot sean gratis.
   - En el repositorio **no hay datos tuyos ni secretos**: tus tareas viven en Firebase.

3. Sube los archivos. Elige una opción:

**Opción A — con Git (recomendado):** abre una terminal dentro de la carpeta `appsito`:
```bash
git init
git add .
git commit -m "Appsito v1"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/appsito.git
git push -u origin main
```

**Opción B — desde la web:** en el repositorio vacío toca **"uploading an existing file"** y arrastra **todo el contenido** de la carpeta (no la carpeta en sí).
- Asegúrate de que se suba la carpeta **`.github`**. En Mac, presiona `Cmd + Shift + .` en el Finder para ver las carpetas ocultas.
- No subas `node_modules` si existe.

4. Publica la app: en el repositorio → **Settings → Pages** → *Build and deployment* → Source: **Deploy from a branch** → Branch: **main** y **/ (root)** → **Save**.
5. Espera 1 o 2 minutos. Tu app quedará en:
   **`https://TU_USUARIO.github.io/appsito/`**

---

## Paso 3 · Generar las claves de notificaciones

1. Abre **`https://TU_USUARIO.github.io/appsito/herramientas/claves.html`**.
2. Toca **Generar claves**. Aparecen dos claves:
   - **Pública:** cópiala en `js/config.js` → `VAPID_PUBLIC_KEY`. Guarda también una copia para el Paso 4.
   - **Privada:** guárdala para el Paso 4. **No va en ningún archivo.**
3. Sube el cambio de `js/config.js`. Con Git:
```bash
git add js/config.js
git commit -m "Clave pública de notificaciones"
git push
```
   También puedes editarlo en la web de GitHub con el lápiz ✏️ sobre el archivo → **Commit changes**.

> Las claves se generan en tu navegador y no se envían a ningún lado. Si alguna vez las cambias, vuelve a activar las notificaciones en la app.

---

## Paso 4 · Guardar los secretos del robot en GitHub

En el repositorio → **Settings → Secrets and variables → Actions → New repository secret**. Crea estos 5 secretos (el nombre exacto, en mayúsculas):

| Nombre | Valor |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Abre el `.json` del Paso 1.4 con el Bloc de notas y pega **todo** su contenido |
| `OWNER_UID` | Tu UID del Paso 1.2 |
| `VAPID_PUBLIC_KEY` | La clave pública del Paso 3 |
| `VAPID_PRIVATE_KEY` | La clave privada del Paso 3 |
| `VAPID_SUBJECT` | `mailto:` + tu correo, por ejemplo `mailto:adir@gmail.com` |

Después ve a la pestaña **Actions**. Si GitHub pregunta, toca **"I understand my workflows, go ahead and enable them"**.

---

## Paso 5 · Instalar Appsito en tu iPhone 15

1. Abre **Safari** (tiene que ser Safari) y entra a `https://TU_USUARIO.github.io/appsito/`.
2. Toca **Compartir** (el cuadrado con flecha) → **Agregar a inicio** → Agregar.
3. **Abre Appsito desde el ícono nuevo** de tu pantalla de inicio, no desde Safari.
4. Inicia sesión con el correo y la contraseña del Paso 1.2. Tu horario ya viene cargado.
5. Ve a **Ajustes → Activar notificaciones → Permitir**.
6. Toca **Probar aviso**: debe aparecer una notificación al instante.

> En iPhone, las notificaciones de apps web solo funcionan si la abres desde el ícono de inicio (iOS 16.4 o superior; tu iPhone 15 cumple).

---

## Paso 6 · Probar el robot de avisos

1. En GitHub → pestaña **Actions** → **Avisos de Appsito** → **Run workflow** → deja marcado "Enviar un aviso de prueba" → **Run workflow**.
2. En unos 30 segundos debe llegarte a tu iPhone la notificación **"Appsito funciona 🎉"**, aunque la app esté cerrada.
3. Desde ahora el robot corre solo **cada 10 minutos**:
   - Revisa tus tareas y te manda los avisos (1 semana, 3 días, 24 h y 2 h antes, según lo que elegiste).
   - Cada mañana a las 7:00 te manda el **resumen del día**. La hora la cambias en Ajustes.

---

## Paso 7 · Usarla en tu laptop

Abre el mismo enlace en Chrome o Edge e inicia sesión. Todo se sincroniza con tu iPhone al instante.

Si quieres:
- **Instalarla como app:** en la barra de direcciones aparece un ícono de instalar.
- **Recibir avisos también en la laptop:** ve a Ajustes → Activar notificaciones.

---

## (Opcional) Paso 8 · Ver tus tareas en el Calendario del iPhone

Así tus tareas y clases aparecen solas en la app **Calendario** y se actualizan cada hora.

1. **Crea un token:** GitHub → tu foto → **Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token (classic)**.
   - Nota: `appsito-calendario`.
   - Expiración: **No expiration**, o la que prefieras.
   - Marca **solo** la casilla **`gist`** → Generate token → copia el token.
2. **Crea un gist secreto:** entra a **https://gist.github.com**.
   - Nombre de archivo: `appsito.ics`.
   - Contenido: escribe cualquier cosa, por ejemplo `vacío`.
   - **Create secret gist**.
3. Copia el **ID del gist**: es la parte final de la dirección, `gist.github.com/TU_USUARIO/`**`a1b2c3d4…`**.
4. **Agrega dos secretos más en GitHub** (Paso 4):
   - `GIST_ID` = el ID del gist.
   - `GIST_TOKEN` = el token.
5. Ejecuta el robot una vez (**Actions → Avisos de Appsito → Run workflow**, desmarcando la prueba). A la hora en punto actualizará el calendario.
6. **Pon el enlace en `js/config.js`:**
   ```js
   export const ICS_URL = 'https://gist.githubusercontent.com/TU_USUARIO/ID_DEL_GIST/raw/appsito.ics';
   ```
   Sube el cambio.
7. **Suscríbete desde el iPhone:** Appsito → Ajustes → **Suscribirme en Calendario** → Suscribir.

> Un gist secreto no aparece en buscadores, pero cualquiera que tenga el enlace puede verlo. No lo compartas.

Si no quieres configurar esto, en Ajustes tienes **Descargar archivo .ics** para importar tus tareas una vez.

---

## Cómo se usa (resumen)

- **＋ (botón central):**
  1. Elige el **curso**.
  2. Elige el **tipo**: Examen, Lab, Trabajo, Tarea u Otro.
  3. Toca una de las **fechas sugeridas según tu horario**, o elige otra a mano.
  4. Marca qué avisos quieres.
- **Exámenes:** deja marcado "Crear plan de repaso" y Appsito te agenda sesiones de estudio a las 19:00 los días previos.
- **Repetir:** para tareas de cada semana, como los informes de laboratorio. Al marcarla como hecha, se crea la siguiente.
- **Notas:**
  1. Entra a cada curso.
  2. Agrega sus evaluaciones con su porcentaje (por ejemplo Primer parcial 20%, Segundo parcial 30%, Laboratorio 50%).
  3. Pon tus notas cuando las tengas.
  4. Te dice qué promedio necesitas en lo que falta para aprobar (10.5 → 11), y el simulador te deja probar escenarios.
- **Créditos:** ponlos en cada curso para ver tu promedio ponderado del ciclo.
- **Estudio:** temporizador Pomodoro (25/5/15). Registra tus minutos por curso.
- **Ajustes → Mis cursos:** cambia horarios, colores, docentes o agrega cursos el próximo ciclo.
- **Ajustes → Exportar:** descarga un respaldo de todo en un archivo.

---

## Si algo no funciona

**No me llegan los avisos**
1. ¿Abriste Appsito desde el ícono de inicio y activaste las notificaciones en Ajustes?
2. iPhone → Ajustes → Notificaciones → Appsito → Permitir. Revisa también que el modo Enfoque o No molestar no las esté bloqueando.
3. GitHub → Actions → abre la última ejecución de "Avisos de Appsito". Si dice "Falta el secreto…", revisa el Paso 4.
4. Si dice "Dispositivos registrados: 0", vuelve a tocar **Activar notificaciones** en la app.

**"Falta configurar Appsito"**
Revisa que `js/config.js` tenga tus datos de Firebase y que hayas subido el cambio.

**"Correo o contraseña incorrectos"**
Usa el usuario del Paso 1.2. Si olvidaste la contraseña, toca "¿Olvidaste tu contraseña?".

**Error de permisos al guardar**
Revisa que publicaste las reglas del Paso 1.3.

**Los avisos llegan unos minutos tarde**
Es normal. GitHub a veces retrasa las tareas programadas entre 5 y 15 minutos.

**GitHub desactivó el robot**
GitHub pausa los robots de repositorios sin cambios en 60 días. Appsito incluye un "latido" mensual que lo evita. Si aun así pasa, entra a Actions y vuelve a activarlo.

**El temporizador de estudio no avisa con la app cerrada**
El aviso de fin de sesión Pomodoro se muestra en el dispositivo, así que mantén la app abierta mientras estudias.

---

## Para actualizar la app más adelante
Cambia los archivos y súbelos (`git add . && git commit -m "cambio" && git push`). GitHub Pages publica en 1 o 2 minutos. La app descarga la versión nueva sola la próxima vez que la abras con internet.
