// Wochennachweis-Export: KW wählen → je Einrichtung signieren → eine PDF mit einer Seite pro Einrichtung.
import { store } from './api.js';
import {
  isoWeek, weekDates, weeksInIsoYear, todayStr, wochentagIndex,
  WOCHENTAGE, WOCHENTAGE_KURZ, nettoMinuten, fmtStundenDE, fmtDatumKurz, fmtDatumDE,
} from './time.js';
import { buildWeekPdf, pdfDateiname } from './pdf.js';
import { openSignaturePad, toast, esc } from './ui.js';

let sel = isoWeek(todayStr());          // { jahr, kw }
let signaturen = new Map();             // ort_id → { pflegekraft, einrichtung } (nur für die gewählte KW)
let selKey = `${sel.jahr}-${sel.kw}`;

function wechsleKW(delta) {
  let { jahr, kw } = sel;
  kw += delta;
  if (kw < 1) { jahr--; kw = weeksInIsoYear(jahr); }
  else if (kw > weeksInIsoYear(jahr)) { jahr++; kw = 1; }
  sel = { jahr, kw };
  const key = `${jahr}-${kw}`;
  if (key !== selKey) { signaturen = new Map(); selKey = key; }
}

// Dienste der KW nach Einrichtung gruppiert
function wochenDaten() {
  const dates = weekDates(sel.jahr, sel.kw);
  const im = new Set(dates);
  const proOrt = new Map();
  for (const d of store.dienste) {
    if (!im.has(d.datum)) continue;
    if (!proOrt.has(d.ort_id)) proOrt.set(d.ort_id, []);
    proOrt.get(d.ort_id).push(d);
  }
  return { dates, proOrt };
}

export function renderExport(el) {
  const { dates, proOrt } = wochenDaten();

  const karten = [...proOrt.entries()].map(([ortId, dienste]) => {
    const ort = store.orte.find((o) => o.id === ortId);
    const sig = signaturen.get(ortId) || {};
    const zeilen = dienste.map((d) => `
      <div class="zeile">
        <span>${WOCHENTAGE_KURZ[wochentagIndex(d.datum)]} ${fmtDatumKurz(d.datum)}</span>
        <span class="z-zeit">${d.von}–${d.bis}${d.pause ? ` · P ${d.pause}′` : ''}</span>
        <span>${fmtStundenDE(nettoMinuten(d.von, d.bis, d.pause))} h</span>
      </div>`).join('');
    const summe = dienste.reduce((s, d) => s + nettoMinuten(d.von, d.bis, d.pause), 0);

    const slot = (art, dataUrl, label) => `
      <div class="sig-slot ${dataUrl ? 'filled' : ''}" data-ort="${ortId}" data-art="${art}">
        ${dataUrl ? `<img src="${dataUrl}" alt="">` : ''}
        <span class="slot-label">${label}${dataUrl ? ' ✓' : ' — tippen'}</span>
      </div>`;

    return `
      <div class="card export-card">
        <h2>${esc(ort?.name || '?')}</h2>
        ${zeilen}
        <div class="summe"><span>Wochensumme</span><span>${fmtStundenDE(summe)} h</span></div>
        <div class="sig-slots">
          ${slot('pflegekraft', sig.pflegekraft ?? store.settings.signatur, 'Pflegekraft')}
          ${slot('einrichtung', sig.einrichtung, 'Einrichtung')}
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div class="kw-head">
      <button class="btn" id="kw-prev">‹</button>
      <h1>KW ${sel.kw} / ${sel.jahr}</h1>
      <button class="btn" id="kw-next">›</button>
    </div>
    <p class="kw-range">${fmtDatumDE(dates[0])} – ${fmtDatumDE(dates[6])}</p>
    ${karten || `<div class="card"><p style="color:var(--muted);margin:0">Keine Dienste in KW ${sel.kw}.</p></div>`}
    <div class="sheet-actions">
      <button class="btn btn-primary" id="pdf-share" ${proOrt.size ? '' : 'disabled'}>PDF teilen</button>
      <button class="btn" id="pdf-save" ${proOrt.size ? '' : 'disabled'}>Herunterladen</button>
    </div>
    <p class="export-hint">
      Eine PDF · ${proOrt.size} Seite${proOrt.size === 1 ? '' : 'n'} · jede Einrichtung unterschreibt ihre eigene Seite
    </p>`;

  el.querySelector('#kw-prev').onclick = () => { wechsleKW(-1); renderExport(el); };
  el.querySelector('#kw-next').onclick = () => { wechsleKW(1); renderExport(el); };

  el.querySelectorAll('.sig-slot').forEach((slot) => {
    slot.onclick = async () => {
      const { ort: ortId, art } = slot.dataset;
      const ortName = store.orte.find((o) => o.id === ortId)?.name || '';
      const titel = art === 'pflegekraft' ? 'Unterschrift Pflegekraft' : `Unterschrift Einrichtung — ${ortName}`;
      const dataUrl = await openSignaturePad(titel);
      if (!dataUrl) return;
      const s = signaturen.get(ortId) || {};
      s[art] = dataUrl;
      signaturen.set(ortId, s);
      renderExport(el);
    };
  });

  const erzeugen = async () => {
    const sections = [...proOrt.entries()].map(([ortId, dienste]) => {
      const ort = store.orte.find((o) => o.id === ortId);
      const sig = signaturen.get(ortId) || {};
      const rows = [];
      dates.forEach((datum, i) => {
        const amTag = dienste.filter((d) => d.datum === datum);
        if (amTag.length === 0) {
          rows.push({ tag: WOCHENTAGE[i] });
        } else {
          for (const d of amTag) {
            rows.push({
              tag: WOCHENTAGE[i], datum, von: d.von, bis: d.bis, pause: d.pause,
              nettoMin: nettoMinuten(d.von, d.bis, d.pause),
            });
          }
        }
      });
      return {
        ortName: ort?.name || '?',
        rows,
        summeMin: dienste.reduce((s, d) => s + nettoMinuten(d.von, d.bis, d.pause), 0),
        sigPflegekraft: sig.pflegekraft ?? store.settings.signatur ?? null,
        sigEinrichtung: sig.einrichtung ?? null,
      };
    });
    return buildWeekPdf({
      jahr: sel.jahr, kw: sel.kw, dates,
      pflegekraft: { name: store.settings.name, email: store.settings.email },
      sections,
    });
  };

  el.querySelector('#pdf-share').onclick = async () => {
    try {
      const doc = await erzeugen();
      const file = new File([doc.output('blob')], pdfDateiname(sel.jahr, sel.kw), { type: 'application/pdf' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: file.name });
      } else {
        doc.save(file.name);
        toast('Teilen nicht verfügbar — als Download gespeichert');
      }
    } catch (e) {
      if (e.name !== 'AbortError') toast(e.message);
    }
  };

  el.querySelector('#pdf-save').onclick = async () => {
    try {
      (await erzeugen()).save(pdfDateiname(sel.jahr, sel.kw));
    } catch (e) { toast(e.message); }
  };
}
