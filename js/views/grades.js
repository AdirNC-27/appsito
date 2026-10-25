import { state, courseById, updateCourse } from '../store.js';
import { icon, esc, toast } from '../ui.js';
import { courseStats, termAverage } from '../shared/model.js';

const f1 = (n) => (n === null || n === undefined || Number.isNaN(n) ? '—' : (Math.round(n * 10) / 10).toFixed(1));
const gradeColor = (g, pass) => (g === null ? 'var(--muted)' : g >= 14 ? '#16A34A' : g >= pass ? 'var(--accent)' : '#DC2626');

export const gradesView = {
  render() {
    const pass = Number(state.settings.passGrade) || 10.5;
    const term = termAverage(state.courses, pass);
    const pct = term.avg === null ? 0 : Math.min(100, (term.avg / 20) * 100);
    const rows = state.courses.map((c) => ({ c, s: courseStats(c.components, pass) }));
    const risky = rows.filter((r) => r.s.current !== null && (r.s.current < pass || (r.s.passNeed !== null && r.s.passNeed > 14)));

    return `<div class="page">
      <div class="page-head"><div><p class="over">Nota mínima aprobatoria: ${pass === 10.5 ? '11 (10.5 redondea)' : esc(pass)}</p><h1>Notas</h1></div></div>

      <div class="hero" style="border-radius:24px;padding:18px;flex-direction:row;align-items:center;gap:16px;margin:0">
        <div class="ring" style="width:96px;height:96px;background:conic-gradient(#BAE6FD 0 ${pct}%, rgba(255,255,255,.22) ${pct}% 100%)">
          <div style="width:76px;height:76px;background:#0862C6"><b style="font-size:26px;line-height:1">${f1(term.avg)}</b><span style="font-size:11px">de 20</span></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <span style="font-size:13px;font-weight:700">Promedio ${term.weighted ? 'ponderado ' : ''}del ciclo</span>
          <span style="font-size:15px;font-weight:800">${term.count} curso${term.count === 1 ? '' : 's'} con notas${term.weighted ? ` · ${term.credits} créditos` : ''}</span>
          <span style="font-size:12px;font-weight:600">${term.avg === null ? 'Agrega tus evaluaciones en cada curso.' : risky.length ? `Atención: ${risky.map((r) => esc(r.c.short || r.c.name)).join(', ')}` : 'Vas aprobando todo. ¡Sigue así!'}</span>
          ${!term.weighted && term.count ? '<span style="font-size:11px;opacity:.9">Agrega los créditos de cada curso para el promedio ponderado.</span>' : ''}
        </div>
      </div>

      <div class="row-head"><h2>Por curso</h2><span class="small muted">Toca uno para editar sus notas</span></div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${rows.map(({ c, s }) => {
          let status = '<span class="badge b-none">Sin notas aún</span>';
          if (!c.components?.length) status = '<span class="badge b-none">Agrega evaluaciones</span>';
          else if (s.finalGrade !== null) status = s.finalGrade >= pass ? '<span class="badge b-ok">Aprobado</span>' : '<span class="badge b-over">Desaprobado</span>';
          else if (s.current !== null) {
            if (s.passNeed !== null && s.passNeed > 20) status = '<span class="badge b-over">Ya no alcanza el 11</span>';
            else if (s.passNeed !== null && s.passNeed > s.current) status = `<span class="badge b-man">Necesitas ${f1(Math.max(0, s.passNeed))} en lo que falta</span>`;
            else status = '<span class="badge b-ok">Aprobando</span>';
          }
          const shown = s.finalGrade ?? s.current;
          return `<a class="card pad" href="#/notas/${c.id}" style="display:flex;align-items:center;gap:12px;text-decoration:none;color:inherit;box-shadow:none">
            <span style="width:10px;height:40px;border-radius:5px;flex:none;background:${c.color}"></span>
            <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:5px;align-items:flex-start"><b style="font-size:15px">${esc(c.name)}</b>${status}</span>
            <span style="display:flex;flex-direction:column;align-items:flex-end"><b style="font-size:22px;color:${gradeColor(shown, pass)}">${f1(shown)}</b><span class="small muted">${c.credits ? c.credits + ' créditos' : `${s.wDone}% evaluado`}</span></span>
          </a>`;
        }).join('')}
      </div>
    </div>`;
  },
};

let simValue = 12;

export const courseGradesView = {
  persist: true,
  render(params) {
    const c = courseById(params.id);
    if (!c) return `<div class="page"><div class="empty">Curso no encontrado. <a href="#/notas">Volver</a></div></div>`;
    const pass = Number(state.settings.passGrade) || 10.5;
    const comps = c.components || [];
    const s = courseStats(comps, pass);
    const targets = [[pass, 'Para aprobar', 'final 11'], [13, 'Para 13', ''], [16, 'Para 16', '']];
    const box = (need, label, extra) => {
      const v = need;
      let style = 'background:var(--b-ok-bg);color:var(--b-ok-fg)', note = extra || 'alcanzable';
      if (v === null) { style = 'background:var(--b-none-bg);color:var(--b-none-fg)'; note = 'nada pendiente'; }
      else if (v > 20) { style = 'background:var(--b-none-bg);color:var(--b-none-fg)'; note = 'no alcanzable'; }
      else if (v <= 0) { note = 'ya lo tienes'; }
      else if (v > 15) { style = 'background:var(--b-sky-bg);color:var(--b-sky-fg)'; note = 'difícil'; }
      return `<div style="${style}"><span>${label}</span><b>${v === null ? '—' : v <= 0 ? '✓' : f1(v)}</b><span style="font-weight:600">${note}</span></div>`;
    };

    return `<div class="page">
      <div class="page-head" style="justify-content:flex-start;align-items:center">
        <a class="icon-btn" href="#/notas" aria-label="Volver a notas" style="color:var(--text)">${icon('back', 20, 2.2)}</a>
        <div><h1 style="font-size:20px">${esc(c.name)}</h1><span class="small muted">${[c.code, c.teacher].filter(Boolean).map(esc).join(' · ')}</span></div>
      </div>

      <div class="card pad">
        <div class="row-head" style="padding-bottom:6px"><b style="font-size:14px">Evaluaciones</b><span class="small" style="font-weight:700;color:${s.total === 100 ? 'var(--b-ok-fg)' : '#D97706'}">Suma: ${s.total}%${s.total !== 100 ? ' (debe ser 100%)' : ''}</span></div>
        <div class="grade-row small muted" style="border:0;padding:0 0 2px;font-weight:700"><span>Nombre</span><span class="num">Peso %</span><span class="num">Nota</span><span></span></div>
        <div id="comps">
          ${comps.map((x, i) => `<div class="grade-row">
            <input class="input" data-i="${i}" data-k="name" value="${esc(x.name)}" aria-label="Nombre de la evaluación" placeholder="Ej. Primer parcial">
            <input class="input num" data-i="${i}" data-k="weight" type="number" inputmode="decimal" min="0" max="100" value="${x.weight ?? ''}" aria-label="Peso en porcentaje">
            <input class="input num" data-i="${i}" data-k="grade" type="number" inputmode="decimal" min="0" max="20" step="0.1" value="${x.grade ?? ''}" placeholder="—" aria-label="Nota sobre 20">
            <button class="icon-btn" style="width:36px;height:36px;color:#DC2626" data-action="del-comp" data-id="${i}" aria-label="Quitar ${esc(x.name)}">${icon('trash', 16)}</button>
          </div>`).join('') || '<div class="empty" style="padding:12px">Aún no hay evaluaciones. Agrega las de tu sílabo.</div>'}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:10px">
          <button class="btn" style="min-height:40px" data-action="add-comp">${icon('plus', 16, 2.5)}Agregar evaluación</button>
          ${!comps.length ? '<button class="btn" style="min-height:40px" data-action="template">Usar plantilla</button>' : ''}
        </div>
        <div class="row-head" style="border-top:1px solid var(--line);margin-top:12px;padding-top:10px">
          <span class="small muted">Promedio en lo evaluado (${s.wDone}%)</span><b style="font-size:18px;color:${gradeColor(s.current, pass)}">${f1(s.current)}</b>
        </div>
        <div class="row-head" style="padding-top:8px">
          <label for="credits" class="small muted">Créditos del curso</label>
          <input id="credits" class="input num" type="number" min="0" max="10" value="${c.credits || ''}" placeholder="0" style="width:72px;min-height:38px;text-align:center">
        </div>
      </div>

      ${comps.length && s.wLeft > 0 ? `<div class="section">
        <h2 style="font-size:17px;font-weight:800">¿Qué promedio necesito en lo que falta (${s.wLeft}%)?</h2>
        <div class="need-grid">${targets.map(([t, l, e]) => box(s.need(t), l, e)).join('')}</div>
      </div>
      <div class="sim">
        <div class="row-head"><label for="sim" style="font-size:14px;font-weight:800">Simulador: si saco en lo que falta…</label><b id="sim-val" style="font-size:22px;color:#E0F2FE">${simValue}</b></div>
        <input id="sim" type="range" min="0" max="20" step="0.5" value="${simValue}">
        <div class="row-head" style="background:rgba(255,255,255,.14);border-radius:14px;padding:10px 12px">
          <span style="font-size:13px;font-weight:600">Promedio final del curso</span>
          <span style="display:flex;align-items:center;gap:8px"><b id="sim-res" style="font-size:20px">${f1(s.projected(simValue))}</b><span id="sim-badge" class="badge ${s.projected(simValue) >= pass ? 'b-ok' : 'b-over'}">${s.projected(simValue) >= pass ? 'APRUEBAS' : 'DESAPRUEBAS'}</span></span>
        </div>
      </div>` : ''}
    </div>`;
  },
  mount(root, params, rerender) {
    const c = courseById(params.id);
    if (!c) return;
    const pass = Number(state.settings.passGrade) || 10.5;
    const save = async (components) => {
      try { await updateCourse(c.id, { components }); } catch (e) { toast('No se pudo guardar: ' + e.message); }
    };
    root.querySelectorAll('#comps input').forEach((inp) => {
      inp.addEventListener('change', async () => {
        const comps = (courseById(c.id).components || []).map((x) => ({ ...x }));
        const i = Number(inp.dataset.i), k = inp.dataset.k;
        if (k === 'name') comps[i].name = inp.value.trim();
        else {
          const v = inp.value === '' ? null : Number(String(inp.value).replace(',', '.'));
          comps[i][k] = v === null || Number.isNaN(v) ? null : Math.max(0, Math.min(k === 'grade' ? 20 : 100, v));
        }
        save(comps);
        setTimeout(rerender, 0); // espera a que el foco pase al siguiente campo
      });
    });
    root.querySelector('#credits')?.addEventListener('change', async (e) => {
      await updateCourse(c.id, { credits: Math.max(0, Number(e.target.value) || 0) });
      toast('Créditos guardados');
    });
    const sim = root.querySelector('#sim');
    sim?.addEventListener('input', () => {
      simValue = Number(sim.value);
      const s = courseStats(courseById(c.id).components, pass);
      const p = s.projected(simValue);
      root.querySelector('#sim-val').textContent = simValue;
      root.querySelector('#sim-res').textContent = f1(p);
      const b = root.querySelector('#sim-badge');
      b.textContent = p >= pass ? 'APRUEBAS' : 'DESAPRUEBAS';
      b.className = 'badge ' + (p >= pass ? 'b-ok' : 'b-over');
    });
  },
  async onAction(action, el, rerender, go, params) {
    const c = courseById(params.id);
    if (!c) return false;
    const comps = (c.components || []).map((x) => ({ ...x }));
    if (action === 'add-comp') { comps.push({ name: `Evaluación ${comps.length + 1}`, weight: Math.max(0, 100 - comps.reduce((s, x) => s + (Number(x.weight) || 0), 0)), grade: null }); }
    else if (action === 'del-comp') { comps.splice(Number(el.dataset.id), 1); }
    else if (action === 'template') {
      comps.push({ name: 'Primer parcial', weight: 20, grade: null }, { name: 'Segundo parcial', weight: 30, grade: null },
        { name: 'Prácticas', weight: 20, grade: null }, { name: 'Laboratorio', weight: 30, grade: null });
      toast('Plantilla agregada: ajusta los porcentajes a tu sílabo');
    } else return false;
    await updateCourse(c.id, { components: comps });
    rerender();
    return true;
  },
};
