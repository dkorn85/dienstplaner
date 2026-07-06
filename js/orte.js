// Einsatzort-Verwaltung: Liste + Editor-Sheet.
import { store, saveOrt, deleteOrt } from './api.js';
import { openSheet, closeSheet, toast, esc } from './ui.js';

export function renderOrte(el) {
  const items = store.orte.map((o) => `
    <div class="list-item ${o.aktiv ? '' : 'inaktiv'}" data-id="${o.id}">
      <div class="dot" style="background:${esc(o.farbe)}"></div>
      <div class="grow">
        <div class="title">${esc(o.name)}</div>
        <div class="sub">${esc(o.kurz)}${o.von_default ? ` · Standard ${o.von_default}–${o.bis_default}` : ''} · Pause ${o.pause_default} min${o.aktiv ? '' : ' · inaktiv'}</div>
      </div>
    </div>`).join('');

  el.innerHTML = `
    <h1 class="page-title">Einsatzorte</h1>
    ${items || '<p style="color:var(--muted)">Noch keine Einsatzorte.</p>'}
    <button class="btn btn-primary btn-block" id="ort-neu">+ Neuer Einsatzort</button>`;

  el.querySelectorAll('.list-item').forEach((item) => {
    item.onclick = () => openOrtForm(store.orte.find((o) => o.id === item.dataset.id), () => renderOrte(el));
  });
  el.querySelector('#ort-neu').onclick = () => openOrtForm(null, () => renderOrte(el));
}

function openOrtForm(ort, onChange) {
  const neu = !ort;
  const el = openSheet(`
    <h2>${neu ? 'Neuer Einsatzort' : 'Einsatzort bearbeiten'}</h2>
    <label>Name (erscheint auf dem Nachweis)
      <input id="o-name" value="${esc(ort?.name || '')}" required>
    </label>
    <div class="row">
      <label>Kürzel (Kalender-Chip)
        <input id="o-kurz" maxlength="8" value="${esc(ort?.kurz || '')}" required>
      </label>
      <label>Farbe
        <input type="color" id="o-farbe" value="${esc(ort?.farbe || '#f0b429')}">
      </label>
    </div>
    <div class="row">
      <label>Standard Von <input type="time" id="o-von" value="${ort?.von_default || '22:15'}"></label>
      <label>Standard Bis <input type="time" id="o-bis" value="${ort?.bis_default || '06:15'}"></label>
      <label>Pause (min) <input type="number" id="o-pause" min="0" step="5" value="${ort?.pause_default ?? 0}"></label>
    </div>
    ${neu ? '' : `<label style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="o-aktiv" style="width:auto" ${ort.aktiv ? 'checked' : ''}> aktiv (in der Auswahl sichtbar)</label>`}
    <div class="sheet-actions">
      ${neu ? '' : '<button class="btn btn-danger" id="o-del">Löschen</button>'}
      <button class="btn" id="o-abbr">Abbrechen</button>
      <button class="btn btn-primary" id="o-save">Speichern</button>
    </div>`);

  const $ = (id) => el.querySelector(id);
  $('#o-abbr').onclick = closeSheet;

  if (!neu) {
    $('#o-del').onclick = async () => {
      if (!confirm(`"${ort.name}" wirklich löschen?`)) return;
      const ok = await deleteOrt(ort.id);
      if (!ok) {
        if (confirm('Dieser Ort wird von Diensten verwendet und kann nicht gelöscht werden.\n\nStattdessen inaktiv setzen?')) {
          await saveOrt({ ...ort, aktiv: false });
          closeSheet(); onChange();
        }
        return;
      }
      closeSheet(); onChange();
    };
  }

  $('#o-save').onclick = async () => {
    const name = $('#o-name').value.trim();
    const kurz = $('#o-kurz').value.trim();
    if (!name || !kurz) return toast('Name und Kürzel angeben');
    try {
      await saveOrt({
        id: ort?.id, name, kurz,
        farbe: $('#o-farbe').value,
        von_default: $('#o-von').value || null,
        bis_default: $('#o-bis').value || null,
        pause_default: Number($('#o-pause').value || 0),
        aktiv: neu ? true : $('#o-aktiv').checked,
      });
      closeSheet(); onChange();
    } catch (e) { toast(e.message); }
  };
}
