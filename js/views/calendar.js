import { state } from '../store.js';
import { icon, esc, taskRow, TYPE_COLORS, courseDot } from '../ui.js';
import { parts, limaMs, dayKey, startOfDay, addDays, MON_LONG, fmtDayLong, cap } from '../shared/time.js';

let monthShift = 0;
let selected = null;

const fmtH = (h) => { const hh = Math.floor(h), mm = Math.round((h - hh) * 60); return `${hh}:${String(mm).padStart(2, '0')}`; };

function tabs(active) {
  return `<div class="seg" role="tablist">
    <a href="#/calendario" class="${active === 'mes' ? 'on' : ''}" role="tab" aria-selected="${active === 'mes'}">Mes</a>
    <a href="#/horario" class="${active === 'horario' ? 'on' : ''}" role="tab" aria-selected="${active === 'horario'}">Horario</a>
  </div>`;
}

export const monthView = {
  render() {
    const now = Date.now();
    const p = parts(now);
    const first = new Date(Date.UTC(p.y, p.m + monthShift, 1));
    const y = first.getUTCFullYear(), m = first.getUTCMonth();
    const startDow = (first.getUTCDay() + 6) % 7; // lunes = 0
    const daysIn = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    if (!selected) selected = dayKey(now);

    const byDay = {};
    state.tasks.forEach((t) => { (byDay[dayKey(t.due)] ||= []).push(t); });

    const cells = [];
    const gridStart = limaMs(y, m, 1 - startDow);
    const total = Math.ceil((startDow + daysIn) / 7) * 7;
    for (let i = 0; i < total; i++) {
      const ms = addDays(gridStart, i);
      const dp = parts(ms);
      const key = dayKey(ms);
      const list = byDay[key] || [];
      const dots = list.slice(0, 3).map((t) => `<i style="background:${t.done ? '#9FB8CC' : TYPE_COLORS[t.type] || '#64748B'}"></i>`).join('');
      const cls = ['cal-day', dp.m !== m ? 'muted' : '', key === dayKey(now) ? 'today' : '', key === selected ? 'sel' : ''].join(' ');
      cells.push(`<button class="${cls}" data-action="pick-day" data-id="${key}" aria-label="${fmtDayLong(ms)}${list.length ? `, ${list.length} pendientes` : ''}"><span class="n">${dp.d}</span><span class="cal-dots">${dots}</span></button>`);
    }

    const [sy, sm, sd] = selected.split('-').map(Number);
    const selMs = limaMs(sy, sm - 1, sd);
    const dayTasks = (byDay[selected] || []).sort((a, b) => a.due - b.due);
    const dow = parts(selMs).dow;
    const classes = state.courses.flatMap((c) => (c.schedule || []).filter((b) => Number(b.day) === dow).map((b) => ({ c, b }))).sort((a, b) => a.b.start - b.b.start);

    return `<div class="page">
      <div class="page-head">
        <div><p class="over">Calendario</p><h1>${cap(MON_LONG[m])} ${y}</h1></div>
        <div style="display:flex;gap:6px">
          <button class="icon-btn" data-action="month" data-id="-1" aria-label="Mes anterior">${icon('back', 18, 2.2)}</button>
          <button class="icon-btn" data-action="month" data-id="1" aria-label="Mes siguiente">${icon('next', 18, 2.2)}</button>
        </div>
      </div>
      ${tabs('mes')}
      <div class="card" style="padding:14px 10px">
        <div class="cal-week">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d) => `<span>${d}</span>`).join('')}</div>
        <div class="cal-grid">${cells.join('')}</div>
      </div>
      <div class="chips small" style="gap:12px;color:var(--muted);font-weight:600">
        ${[['examen', 'Examen'], ['lab', 'Lab'], ['trabajo', 'Trabajo'], ['tarea', 'Tarea'], ['repaso', 'Repaso']].map(([k, l]) => `<span style="display:flex;align-items:center;gap:5px;flex:none"><span class="dot" style="background:${TYPE_COLORS[k]}"></span>${l}</span>`).join('')}
      </div>
      <div class="section">
        <div class="row-head"><h2>${cap(fmtDayLong(selMs))}</h2><a href="#/tarea/nueva?fecha=${selected}">+ Agregar</a></div>
        <div class="list">${dayTasks.length ? dayTasks.map((t) => taskRow(t, { now, showDate: false })).join('') : '<div class="empty">Sin pendientes este día.</div>'}</div>
        ${classes.length ? `<div class="list">${classes.map(({ c, b }) => `<div class="item"><span class="grow"><span class="title">${b.kind === 'lab' ? 'Lab · ' : ''}${esc(c.name)}</span><span class="sub">${courseDot(c)}${fmtH(b.start)}–${fmtH(b.end)}${b.teacher ? ' · ' + esc(b.teacher) : ''}${b.note ? ' · ' + esc(b.note) : ''}</span></span><span class="badge ${b.kind === 'lab' ? 'b-lab' : 'b-sky'}">${b.kind === 'lab' ? 'Lab' : b.kind === 'virtual' ? 'Virtual' : 'Clase'}</span></div>`).join('')}</div>` : ''}
      </div>
    </div>`;
  },
  onAction(action, el, rerender) {
    if (action === 'month') { monthShift += Number(el.dataset.id); rerender(); return true; }
    if (action === 'pick-day') { selected = el.dataset.id; rerender(); return true; }
    return false;
  },
};

export const timetableView = {
  render() {
    const now = Date.now();
    const p = parts(now);
    // Semana a mostrar: la actual (o la siguiente si es fin de semana)
    const dowMon = (p.dow + 6) % 7; // lunes = 0
    let monday = addDays(startOfDay(now), -dowMon);
    if (dowMon >= 5) monday = addDays(monday, 7);
    const blocks = state.courses.flatMap((c) => (c.schedule || []).map((b) => ({ c, b })));
    const minH = Math.min(7, ...blocks.map(({ b }) => Math.floor(b.start)));
    const maxH = Math.max(18, ...blocks.map(({ b }) => Math.ceil(b.end)));
    const H = window.innerWidth >= 900 ? 46 : 34;
    const hours = [];
    for (let h = minH; h < maxH; h++) hours.push(`<div class="tt-hour" style="top:${(h - minH) * H}px;height:${H}px"><span>${h}:00</span></div>`);
    const colW = 'calc((100% - 30px) / 5)';
    const blockHtml = blocks.filter(({ b }) => b.day >= 1 && b.day <= 5).map(({ c, b }) => {
      const dur = b.end - b.start;
      const lab = b.kind === 'lab', virt = b.kind === 'virtual';
      const style = [
        `top:${(b.start - minH) * H + 2}px`, `height:${dur * H - 3}px`,
        `left:calc(30px + ${colW} * ${b.day - 1} + 1.5px)`, `width:calc(${colW} - 3px)`,
        `background:${lab ? 'var(--card)' : c.color + '22'}`, `color:var(--text)`,
        `border:${lab ? '1.5px dashed ' + c.color : virt ? '1.5px dotted ' + c.color : '0'}`,
        `box-shadow:inset 3px 0 0 ${c.color}`,
      ].join(';');
      return `<a class="tt-block" href="#/cursos/${c.id}" style="${style}" aria-label="${esc(c.name)}, ${fmtH(b.start)} a ${fmtH(b.end)}">
        <b>${lab ? 'Lab ' : ''}${esc(c.short || c.name)}</b>${dur * H >= 50 ? `<small>${esc(b.teacher || '')}${b.note ? ' · ' + esc(b.note) : ''}</small>` : ''}</a>`;
    }).join('');
    const days = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE'].map((n, i) => {
      const ms = addDays(monday, i);
      return `<span class="${dayKey(ms) === dayKey(now) ? 'today' : ''}">${n}<b>${parts(ms).d}</b></span>`;
    }).join('');
    const free = minH <= 13 && maxH >= 14 ? `<div class="tt-free" style="top:${(13 - minH) * H}px;height:${H}px">LIBRE</div>` : '';
    const mp = parts(monday), fp = parts(addDays(monday, 4));

    return `<div class="page">
      <div class="page-head">
        <div><p class="over">Semana del ${mp.d} al ${fp.d} de ${MON_LONG[fp.m]}</p><h1>Horario de clases</h1></div>
        <a class="icon-btn" href="#/cursos" aria-label="Editar cursos y horario">${icon('edit', 18, 2.2)}</a>
      </div>
      ${tabs('horario')}
      <div class="card" style="padding:8px 6px 6px 2px">
        <div class="tt-head"><span></span>${days}</div>
        <div class="tt-body" style="height:${(maxH - minH) * H}px">${hours.join('')}${free}${blockHtml}</div>
      </div>
      <div class="chips small" style="gap:12px;color:var(--muted);font-weight:600">
        <span style="display:flex;align-items:center;gap:5px;flex:none"><span style="width:14px;height:10px;border-radius:3px;background:#2563EB22;box-shadow:inset 3px 0 0 #2563EB"></span>Teoría</span>
        <span style="display:flex;align-items:center;gap:5px;flex:none"><span style="width:14px;height:10px;border-radius:3px;border:1.5px dashed #4F46E5"></span>Laboratorio</span>
        <span style="display:flex;align-items:center;gap:5px;flex:none"><span style="width:14px;height:10px;border-radius:3px;border:1.5px dotted #7C3AED"></span>Virtual</span>
      </div>
    </div>`;
  },
};
