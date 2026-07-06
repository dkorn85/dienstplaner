// Monatsansicht: Statistik-Leiste + CSS-Grid-Kalender mit KW-Spalte.
import { store, sollFuer } from './api.js';
import {
  WOCHENTAGE_KURZ, MONATE, nettoMinuten, fmtStundenDE,
  daysInMonth, todayStr, isoWeek, wochentagIndex,
} from './time.js';
import { openDay } from './editor.js';
import { esc } from './ui.js';

const heute = () => todayStr();
let jahr = Number(heute().slice(0, 4));
let monat = Number(heute().slice(5, 7)); // 1-basiert

export function renderCalendar(el) {
  const mKey = `${jahr}-${String(monat).padStart(2, '0')}`;
  const dienste = store.dienste.filter((d) => d.datum.startsWith(mKey));
  const istMin = dienste.reduce((s, d) => s + nettoMinuten(d.von, d.bis, d.pause), 0);
  const sollH = sollFuer(mKey);
  const diffMin = Math.round(sollH * 60) - istMin;

  const proTag = new Map();
  for (const d of dienste) {
    if (!proTag.has(d.datum)) proTag.set(d.datum, []);
    proTag.get(d.datum).push(d);
  }

  let cells = '';
  const tage = daysInMonth(jahr, monat);
  const firstDow = wochentagIndex(`${mKey}-01`);

  const zelle = (tag) => {
    const datum = `${mKey}-${String(tag).padStart(2, '0')}`;
    const chips = (proTag.get(datum) || []).map((d) => {
      const ort = store.orte.find((o) => o.id === d.ort_id);
      return `<div class="chip" style="background:${esc(ort?.farbe || '#999')}">${esc(ort?.kurz || '?')} <small>${fmtStundenDE(nettoMinuten(d.von, d.bis, d.pause))}</small></div>`;
    }).join('');
    const today = datum === heute() ? ' today' : '';
    return `<div class="day${today}" data-datum="${datum}"><div class="num">${tag}</div>${chips}</div>`;
  };

  // Zeilenweise: KW-Zelle + 7 Tageszellen
  let tag = 1;
  while (tag <= tage) {
    const startTag = tag;
    const kwDatum = `${mKey}-${String(tag).padStart(2, '0')}`;
    cells += `<div class="kw">${isoWeek(kwDatum).kw}</div>`;
    for (let dow = 0; dow < 7; dow++) {
      const leerVor = startTag === 1 && dow < firstDow;
      if (leerVor || tag > tage) {
        cells += '<div class="day out"></div>';
      } else {
        cells += zelle(tag++);
      }
    }
  }

  const fehltLabel = diffMin >= 0 ? 'fehlen noch' : 'Überstunden';
  const fehltKlasse = diffMin >= 0 ? 'fehlt' : 'ueber';

  el.innerHTML = `
    <div class="month-head">
      <button class="btn" id="cal-prev">‹</button>
      <h1>${MONATE[monat - 1]} ${jahr}</h1>
      <button class="btn" id="cal-next">›</button>
    </div>
    <div class="stats">
      <div class="stat"><b>${fmtStundenDE(istMin)} h</b><span>Ist</span></div>
      <div class="stat"><b>${fmtStundenDE(Math.round(sollH * 60))} h</b><span>Soll</span></div>
      <div class="stat ${fehltKlasse}"><b>${fmtStundenDE(Math.abs(diffMin))} h</b><span>${fehltLabel}</span></div>
    </div>
    <div class="cal">
      <div class="kw">KW</div>
      ${WOCHENTAGE_KURZ.map((t) => `<div class="dow">${t}</div>`).join('')}
      ${cells}
    </div>`;

  el.querySelector('#cal-prev').onclick = () => { monat--; if (monat < 1) { monat = 12; jahr--; } renderCalendar(el); };
  el.querySelector('#cal-next').onclick = () => { monat++; if (monat > 12) { monat = 1; jahr++; } renderCalendar(el); };
  el.querySelectorAll('.day[data-datum]').forEach((d) => {
    d.onclick = () => openDay(d.dataset.datum, () => renderCalendar(el));
  });
}
