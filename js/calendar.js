// Monatsansicht: Hero (Ist-Stunden + Regenbogen-Fortschritt Richtung Soll) + Kalender-Grid.
import { store, sollFuer } from './api.js';
import {
  WOCHENTAGE_KURZ, MONATE, nettoMinuten, fmtStundenDE, fmtStundenKurz,
  daysInMonth, todayStr, isoWeek, wochentagIndex,
} from './time.js';
import { openDay } from './editor.js';
import { esc } from './ui.js';

const heute = () => todayStr();
let jahr = Number(heute().slice(0, 4));
let monat = Number(heute().slice(5, 7)); // 1-basiert
let slide = '';                          // Richtung des Monatswechsels für die Animation

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function countUp(el, zielMin) {
  if (reduceMotion() || zielMin === 0) { el.textContent = fmtStundenDE(zielMin); return; }
  const dauer = 550, start = performance.now();
  const tick = (t) => {
    const p = Math.min(1, (t - start) / dauer);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = fmtStundenDE(Math.round(zielMin * eased));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function renderCalendar(el) {
  const mKey = `${jahr}-${String(monat).padStart(2, '0')}`;
  const dienste = store.dienste.filter((d) => d.datum.startsWith(mKey));
  const istMin = dienste.reduce((s, d) => s + nettoMinuten(d.von, d.bis, d.pause), 0);
  const sollH = sollFuer(mKey);
  const sollMin = Math.round(sollH * 60);
  const diffMin = sollMin - istMin;
  const pct = sollMin > 0 ? Math.min(100, (istMin / sollMin) * 100) : (istMin > 0 ? 100 : 0);

  const proTag = new Map();
  for (const d of dienste) {
    if (!proTag.has(d.datum)) proTag.set(d.datum, []);
    proTag.get(d.datum).push(d);
  }

  const zelle = (tag) => {
    const datum = `${mKey}-${String(tag).padStart(2, '0')}`;
    const chips = (proTag.get(datum) || []).map((d) => {
      const ort = store.orte.find((o) => o.id === d.ort_id);
      return `<div class="chip" style="--chip-farbe:${esc(ort?.farbe || '#999')}">${esc(ort?.kurz || '?')}&hairsp;<small>${fmtStundenKurz(nettoMinuten(d.von, d.bis, d.pause))}</small></div>`;
    }).join('');
    const today = datum === heute() ? ' today' : '';
    return `<div class="day${today}" data-datum="${datum}"><div class="num">${tag}</div>${chips}</div>`;
  };

  let cells = '';
  const tage = daysInMonth(jahr, monat);
  const firstDow = wochentagIndex(`${mKey}-01`);
  let tag = 1;
  while (tag <= tage) {
    const startTag = tag;
    cells += `<div class="kw">${isoWeek(`${mKey}-${String(tag).padStart(2, '0')}`).kw}</div>`;
    for (let dow = 0; dow < 7; dow++) {
      const leerVor = startTag === 1 && dow < firstDow;
      cells += (leerVor || tag > tage) ? '<div class="day out"></div>' : zelle(tag++);
    }
  }

  const sub = diffMin > 0
    ? `noch <b>${fmtStundenDE(diffMin)} h</b> bis Soll ${fmtStundenKurz(sollMin)} h`
    : `<span class="ok">Soll erfüllt</span> · +${fmtStundenDE(-diffMin)} h über ${fmtStundenKurz(sollMin)} h`;

  el.innerHTML = `
    <div class="month-head">
      <button class="btn" id="cal-prev" aria-label="Voriger Monat">‹</button>
      <h1>${MONATE[monat - 1]} ${jahr}</h1>
      <button class="btn" id="cal-next" aria-label="Nächster Monat">›</button>
    </div>
    <section class="card hero">
      <div class="hero-label">Geleistet im ${MONATE[monat - 1]}</div>
      <div class="hero-num"><span id="hero-ist">0,00</span><small> h</small></div>
      <div class="bar"><i id="hero-bar"></i></div>
      <div class="hero-sub">${sub}</div>
    </section>
    <div class="cal ${slide}">
      <div class="kw"></div>
      ${WOCHENTAGE_KURZ.map((t) => `<div class="dow">${t}</div>`).join('')}
      ${cells}
    </div>`;

  countUp(el.querySelector('#hero-ist'), istMin);
  const bar = el.querySelector('#hero-bar');
  requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = `${pct}%`; }));

  slide = '';
  el.querySelector('#cal-prev').onclick = () => { monat--; if (monat < 1) { monat = 12; jahr--; } slide = 'slide-r'; renderCalendar(el); };
  el.querySelector('#cal-next').onclick = () => { monat++; if (monat > 12) { monat = 1; jahr++; } slide = 'slide-l'; renderCalendar(el); };
  el.querySelectorAll('.day[data-datum]').forEach((d) => {
    d.onclick = () => openDay(d.dataset.datum, () => renderCalendar(el));
  });
}
