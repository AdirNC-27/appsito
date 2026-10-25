import { state, saveSettings, exportData, importData } from '../store.js';
import { icon, esc, toast } from '../ui.js';
import { REMINDERS } from '../shared/model.js';
import { buildICS } from '../shared/ics.js';
import { pushStatus, enablePush, disablePush, testLocal } from '../push.js';
import { ICS_URL } from '../config.js';
import { fb } from '../firebase.js';
import { applyTheme } from '../theme.js';

function download(name, text, type) {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

const PUSH_TEXT = {
  on: ['Activadas en este dispositivo', 'b-ok'],
  off: ['Desactivadas', 'b-none'],
  denied: ['Bloqueadas en el sistema', 'b-over'],
  install: ['Primero instala la app', 'b-man'],
  unsupported: ['No disponibles aquí', 'b-none'],
};

export default {
  render() {
    const s = state.settings;
    const ps = pushStatus();
    const [pText, pCls] = PUSH_TEXT[ps];
    const sec = (t) => `<span class="small" style="font-weight:800;letter-spacing:.06em;color:var(--muted);padding-left:4px">${t}</span>`;

    return `<div class="page">
      <div class="page-head" style="justify-content:flex-start;align-items:center">
        <a class="icon-btn" href="#/" aria-label="Volver" style="color:var(--text)">${icon('back', 20, 2.2)}</a>
        <h1 style="font-size:22px">Ajustes</h1>
      </div>

      <div class="section">${sec('PERFIL')}
        <div class="card pad"><div class="field"><label for="s-name">¿Cómo te llamo?</label><input id="s-name" class="input" value="${esc(s.name || '')}" placeholder="Tu nombre" maxlength="30"></div></div>
      </div>

      <div class="section">${sec('APARIENCIA')}
        <div class="seg">${[['light', 'Claro'], ['dark', 'Oscuro'], ['auto', 'Automático']].map(([v, l]) => `<button class="${s.theme === v ? 'on' : ''}" data-action="set-theme" data-id="${v}" aria-pressed="${s.theme === v}">${l}</button>`).join('')}</div>
      </div>

      <div class="section">${sec('NOTIFICACIONES')}
        <div class="card pad" style="padding-top:4px;padding-bottom:4px">
          <div class="switch-row"><span class="grow"><b>En este dispositivo</b><span class="small muted">${ps === 'install' ? 'En iPhone: Compartir → "Agregar a inicio" y abre Appsito desde el ícono.' : ps === 'denied' ? 'Actívalas en Ajustes del iPhone → Notificaciones → Appsito.' : 'Te llegan aunque la app esté cerrada.'}</span></span><span class="badge ${pCls}">${pText}</span></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;padding:4px 0 12px">
            ${ps === 'off' ? '<button class="btn btn-primary" data-action="push-on">Activar notificaciones</button>' : ''}
            ${ps === 'on' ? '<button class="btn" data-action="push-test">Probar aviso</button><button class="btn" data-action="push-off">Desactivar</button>' : ''}
          </div>
          <div class="switch-row" style="flex-direction:column;align-items:stretch;gap:8px">
            <b>Avisos por defecto para tareas nuevas</b>
            <div class="grid2" style="grid-template-columns:repeat(4,minmax(0,1fr));gap:6px">
              ${REMINDERS.map((r) => `<button class="rem-btn ${(s.defaultReminders || []).includes(r.min) ? 'on' : ''}" data-action="def-rem" data-id="${r.min}" aria-pressed="${(s.defaultReminders || []).includes(r.min)}">${r.short}</button>`).join('')}
            </div>
          </div>
          <label class="switch-row" for="s-summary" style="cursor:pointer"><span class="grow"><b>Resumen diario</b><span class="small muted">Lo que vence hoy y mañana, cada mañana</span></span><input id="s-summary" class="toggle" type="checkbox" ${s.dailySummary ? 'checked' : ''}></label>
          <div class="switch-row"><label for="s-hour" class="grow"><b>Hora del resumen</b></label>
            <select id="s-hour" class="input" style="width:110px;min-height:40px">${[5, 6, 7, 8, 9, 10, 20, 21].map((h) => `<option value="${h}" ${Number(s.summaryHour) === h ? 'selected' : ''}>${String(h).padStart(2, '0')}:00</option>`).join('')}</select>
          </div>
        </div>
      </div>

      <div class="section">${sec('CALENDARIO DEL IPHONE')}
        <div class="card pad" style="display:flex;flex-direction:column;gap:10px">
          <span class="small muted">${ICS_URL ? 'Suscríbete una vez y tus tareas y clases aparecerán solas en la app Calendario (se actualiza cada hora).' : 'Descarga tus tareas y clases como archivo .ics para importarlas. Para que se actualice solo, configura el calendario suscrito (mira la guía).'}</span>
          ${ICS_URL ? `<a class="btn btn-primary" href="${esc(ICS_URL.replace(/^https?:/, 'webcal:'))}">${icon('cal', 18)}Suscribirme en Calendario</a>
            <button class="btn" data-action="copy-ics">Copiar enlace</button>` : ''}
          <button class="btn" data-action="ics">${icon('download', 18)}Descargar archivo .ics</button>
          <div class="switch-row"><label for="s-term" class="grow"><b>Fin del ciclo</b><span class="small muted">Las clases se repiten hasta esta fecha</span></label><input id="s-term" class="input" type="date" value="${esc(s.termEnd || '')}" style="width:160px;min-height:40px"></div>
        </div>
      </div>

      <div class="section">${sec('CURSOS Y NOTAS')}
        <div class="card pad" style="padding-top:4px;padding-bottom:4px">
          <a class="switch-row" href="#/cursos" style="text-decoration:none;color:inherit"><span class="grow"><b>Mis cursos y horario</b><span class="small muted">${state.courses.length} cursos · colores, docentes, horarios</span></span>${icon('next', 18)}</a>
          <div class="switch-row"><label for="s-pass" class="grow"><b>Nota mínima aprobatoria</b></label>
            <select id="s-pass" class="input" style="width:150px;min-height:40px">
              <option value="10.5" ${Number(s.passGrade) === 10.5 ? 'selected' : ''}>11 (10.5 redondea)</option>
              <option value="11" ${Number(s.passGrade) === 11 ? 'selected' : ''}>11 exacto</option>
            </select>
          </div>
        </div>
      </div>

      <div class="section">${sec('RESPALDO')}
        <div class="grid2">
          <button class="btn" data-action="export">${icon('download', 18)}Exportar</button>
          <label class="btn" for="s-import" style="cursor:pointer">${icon('upload', 18)}Importar</label>
          <input id="s-import" type="file" accept="application/json,.json" class="sr-only">
        </div>
      </div>

      <div class="section">${sec('CUENTA')}
        <div class="card pad" style="display:flex;align-items:center;gap:10px">
          <span class="grow" style="flex:1;font-size:14px;font-weight:600;overflow-wrap:anywhere">${esc(state.user?.email || '')}</span>
          <button class="btn" data-action="logout">${icon('logout', 18)}Salir</button>
        </div>
        <p class="small muted" style="text-align:center">Appsito · hecho para ti</p>
      </div>
    </div>`;
  },
  mount(root, params, rerender) {
    const $ = (id) => root.querySelector('#' + id);
    $('s-name')?.addEventListener('change', (e) => { saveSettings({ name: e.target.value.trim() }); toast('Nombre guardado'); });
    $('s-summary')?.addEventListener('change', (e) => { saveSettings({ dailySummary: e.target.checked }); });
    $('s-hour')?.addEventListener('change', (e) => { saveSettings({ summaryHour: Number(e.target.value) }); toast('Hora guardada'); });
    $('s-pass')?.addEventListener('change', (e) => { saveSettings({ passGrade: Number(e.target.value) }); });
    $('s-term')?.addEventListener('change', (e) => { saveSettings({ termEnd: e.target.value }); });
    $('s-import')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const n = await importData(JSON.parse(await file.text()));
        toast(`Respaldo importado (${n} elementos)`);
      } catch (err) { toast('No se pudo importar: ' + err.message); }
      e.target.value = '';
    });
  },
  async onAction(action, el, rerender) {
    const s = state.settings;
    switch (action) {
      case 'set-theme': saveSettings({ theme: el.dataset.id }); applyTheme(el.dataset.id); rerender(); return true;
      case 'def-rem': {
        const m = Number(el.dataset.id);
        const cur = s.defaultReminders || [];
        saveSettings({ defaultReminders: cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m].sort((a, b) => b - a) });
        rerender(); return true;
      }
      case 'push-on':
        el.disabled = true;
        try { await enablePush(); toast('¡Notificaciones activadas!'); } catch (e) { toast(e.message); }
        rerender(); return true;
      case 'push-off':
        try { await disablePush(); toast('Notificaciones desactivadas'); } catch (e) { toast(e.message); }
        rerender(); return true;
      case 'push-test':
        try { await testLocal(); } catch (e) { toast(e.message); }
        return true;
      case 'ics': {
        const termEnd = s.termEnd ? Date.parse(s.termEnd + 'T23:59:00-05:00') : null;
        download('appsito.ics', buildICS({ tasks: state.tasks, courses: state.courses, now: Date.now(), termEnd }), 'text/calendar');
        return true;
      }
      case 'copy-ics':
        try { await navigator.clipboard.writeText(ICS_URL); toast('Enlace copiado'); } catch { toast(ICS_URL); }
        return true;
      case 'export': {
        const d = new Date();
        download(`appsito-respaldo-${d.toISOString().slice(0, 10)}.json`, JSON.stringify(exportData(), null, 2), 'application/json');
        return true;
      }
      case 'logout':
        if (confirm('¿Cerrar sesión en este dispositivo?')) await fb.signOut();
        return true;
    }
    return false;
  },
};
