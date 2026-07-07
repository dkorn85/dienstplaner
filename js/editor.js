// Dienst-Editor im Bottom-Sheet. openDay() zeigt bei mehreren Diensten erst eine Tagesliste.
import { store, saveDienst, deleteDienst } from './api.js';
import { nettoMinuten, fmtStundenDE, fmtDatumDE, toMin, WOCHENTAGE, wochentagIndex, feiertag } from './time.js';
import { openSheet, closeSheet, toast, esc } from './ui.js';

export function openDay(datum, onChange) {
  const dienste = store.dienste.filter((d) => d.datum === datum);
  if (dienste.length === 0) return openForm(null, datum, onChange);

  const ft = feiertag(datum);
  const titel = `${WOCHENTAGE[wochentagIndex(datum)]}, ${fmtDatumDE(datum)}${ft ? ` · ${ft}` : ''}`;
  const items = dienste.map((d) => {
    const ort = store.orte.find((o) => o.id === d.ort_id);
    return `
      <div class="list-item" data-id="${d.id}">
        <div class="dot" style="background:${esc(ort?.farbe || '#999')}"></div>
        <div class="grow">
          <div class="title">${esc(ort?.name || '?')}</div>
          <div class="sub">${d.von}–${d.bis} · Pause ${d.pause} min · ${fmtStundenDE(nettoMinuten(d.von, d.bis, d.pause))} h${d.zusammenfassung ? ' · ' + esc(d.zusammenfassung) : ''}</div>
        </div>
      </div>`;
  }).join('');

  const el = openSheet(`
    <h2>${titel}</h2>
    ${items}
    <div class="sheet-actions">
      <button class="btn btn-primary" id="day-neu">+ Neuer Dienst</button>
    </div>`);

  el.querySelectorAll('.list-item').forEach((item) => {
    item.onclick = () => openForm(dienste.find((d) => d.id === item.dataset.id), datum, onChange);
  });
  el.querySelector('#day-neu').onclick = () => openForm(null, datum, onChange);
}

// datumArg: einzelner Datums-String oder Array (Serie: ein Dienst für jeden Tag)
export function openForm(dienst, datumArg, onChange) {
  const daten = Array.isArray(datumArg) ? datumArg : [datumArg];
  const serie = daten.length > 1;
  const neu = !dienst;
  const orte = store.orte.filter((o) => o.aktiv || o.id === dienst?.ort_id);
  if (orte.length === 0) { toast('Bitte zuerst einen Einsatzort anlegen'); return; }

  const options = orte.map((o) =>
    `<option value="${o.id}" ${o.id === dienst?.ort_id ? 'selected' : ''}>${esc(o.name)}</option>`).join('');

  const titel = serie
    ? `Neue Serie · ${daten.length} Tage <small style="color:var(--muted);font-weight:500">(${fmtDatumDE(daten[0])} – ${fmtDatumDE(daten[daten.length - 1])})</small>`
    : `${neu ? 'Neuer Dienst' : 'Dienst bearbeiten'} · ${fmtDatumDE(daten[0])}`;

  const el = openSheet(`
    <h2>${titel}</h2>
    <label>Einsatzort
      <select id="f-ort">${options}</select>
    </label>
    <div class="row">
      <label>Von <input type="time" id="f-von" required></label>
      <label>Bis <input type="time" id="f-bis" required></label>
      <label>Pause (min) <input type="number" id="f-pause" min="0" step="5" value="0"></label>
    </div>
    <label>Zusammenfassung des Dienstes
      <textarea id="f-notiz" placeholder="z.B. ruhige Nacht, 2 Neuaufnahmen …">${esc(dienst?.zusammenfassung || '')}</textarea>
    </label>
    <p class="netto-live" id="f-netto"></p>
    <div class="sheet-actions">
      ${neu ? '' : '<button class="btn btn-danger" id="f-del">Löschen</button>'}
      <button class="btn" id="f-abbr">Abbrechen</button>
      <button class="btn btn-primary" id="f-save">${serie ? `${daten.length}× speichern` : 'Speichern'}</button>
    </div>`);

  const $ = (id) => el.querySelector(id);
  const ortSel = $('#f-ort'), von = $('#f-von'), bis = $('#f-bis'), pause = $('#f-pause');

  const fuelleDefaults = () => {
    const ort = store.orte.find((o) => o.id === ortSel.value);
    if (ort?.von_default) von.value = ort.von_default;
    if (ort?.bis_default) bis.value = ort.bis_default;
    pause.value = ort?.pause_default ?? 0;
    zeigeNetto();
  };

  const zeigeNetto = () => {
    const out = $('#f-netto');
    if (!von.value || !bis.value) { out.innerHTML = ''; return; }
    const netto = nettoMinuten(von.value, bis.value, Number(pause.value || 0));
    const folgetag = toMin(bis.value) <= toMin(von.value) ? '<span class="folgetag">endet am Folgetag</span>' : '';
    out.innerHTML = netto > 0
      ? `Netto: <b>${fmtStundenDE(netto)} h</b>${folgetag}`
      : '<b class="err" style="color:var(--danger)">Pause länger als der Dienst</b>';
  };

  if (dienst) {
    von.value = dienst.von; bis.value = dienst.bis; pause.value = dienst.pause;
    zeigeNetto();
  } else {
    fuelleDefaults(); // beim Anlegen: Defaults des vorgewählten Orts
  }

  // Beim Neuanlegen befüllt ein Ortswechsel die Zeiten neu; beim Bearbeiten nicht (Zeiten stehen schon fest).
  ortSel.onchange = neu ? fuelleDefaults : zeigeNetto;
  von.oninput = bis.oninput = pause.oninput = zeigeNetto;

  $('#f-abbr').onclick = closeSheet;
  if (!neu) {
    $('#f-del').onclick = async () => {
      if (!confirm('Diesen Dienst wirklich löschen?')) return;
      await deleteDienst(dienst.id);
      closeSheet(); onChange();
    };
  }
  $('#f-save').onclick = async () => {
    if (!von.value || !bis.value) return toast('Bitte Von und Bis angeben');
    if (von.value === bis.value) return toast('Von und Bis dürfen nicht gleich sein');
    const p = Number(pause.value || 0);
    if (nettoMinuten(von.value, bis.value, p) <= 0) return toast('Pause ist länger als der Dienst');
    try {
      for (const dt of daten) {
        await saveDienst({
          id: dienst?.id, datum: dt, von: von.value, bis: bis.value, pause: p,
          ort_id: ortSel.value, zusammenfassung: $('#f-notiz').value.trim(),
        });
      }
      if (serie) toast(`${daten.length} Dienste eingetragen`);
      closeSheet(); onChange();
    } catch (e) { toast(e.message); }
  };
}
