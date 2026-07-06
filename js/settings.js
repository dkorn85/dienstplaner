// Einstellungen: Stammdaten, Monatssoll (Default + Ausnahmen), gespeicherte Signatur, Logout.
import { sb, store, saveSettings, setMonatssoll } from './api.js';
import { fmtStundenDE, MONATE } from './time.js';
import { openSignaturePad, toast, esc } from './ui.js';

export function renderSettings(el) {
  const s = store.settings;

  const overrides = store.monatssoll.map((m) => {
    const [y, mo] = m.monat.split('-');
    return `
      <div class="msoll-row" data-monat="${m.monat}">
        <div class="grow">${MONATE[Number(mo) - 1]} ${y}</div>
        <div>${fmtStundenDE(Math.round(Number(m.soll) * 60))} h</div>
        <button title="Ausnahme entfernen">✕</button>
      </div>`;
  }).join('');

  el.innerHTML = `
    <h1 class="page-title">Einstellungen</h1>

    <div class="card">
      <h2>Stammdaten (für den Nachweis)</h2>
      <label>Name <input id="s-name" value="${esc(s.name)}"></label>
      <label>E-Mail <input type="email" id="s-email" value="${esc(s.email)}"></label>
      <button class="btn btn-block" id="s-save">Speichern</button>
    </div>

    <div class="card">
      <h2>Monatssoll</h2>
      <label>Standard (Stunden pro Monat)
        <input type="number" id="s-soll" min="0" step="0.25" value="${Number(s.soll_default)}">
      </label>
      <button class="btn btn-block" id="s-soll-save">Standard speichern</button>
      <h2 style="margin-top:18px">Ausnahmen einzelner Monate</h2>
      ${overrides || '<p style="color:var(--muted);font-size:0.85rem">Keine Ausnahmen — überall gilt der Standard.</p>'}
      <div class="row" style="margin-top:10px">
        <label>Monat <input type="month" id="s-ov-monat"></label>
        <label>Soll (h) <input type="number" id="s-ov-soll" min="0" step="0.25"></label>
      </div>
      <button class="btn btn-block" id="s-ov-add">Ausnahme setzen</button>
    </div>

    <div class="card">
      <h2>Meine Unterschrift</h2>
      <div class="sig-preview" id="s-sig-preview">
        ${s.signatur ? `<img src="${s.signatur}" alt="Unterschrift">` : '<span>Noch keine Unterschrift gespeichert</span>'}
      </div>
      <div class="sheet-actions">
        ${s.signatur ? '<button class="btn btn-danger" id="s-sig-del">Entfernen</button>' : ''}
        <button class="btn btn-primary" id="s-sig-neu">${s.signatur ? 'Neu zeichnen' : 'Unterschrift aufnehmen'}</button>
      </div>
      <p style="color:var(--muted);font-size:0.8rem">Wird im Wochennachweis als „Unterschrift Pflegekraft" vorbefüllt.</p>
    </div>

    <div class="card">
      <button class="btn btn-block" id="s-logout">Abmelden</button>
    </div>`;

  const $ = (id) => el.querySelector(id);

  $('#s-save').onclick = async () => {
    await saveSettings({ name: $('#s-name').value.trim(), email: $('#s-email').value.trim() });
    toast('Gespeichert');
  };

  $('#s-soll-save').onclick = async () => {
    const v = Number($('#s-soll').value);
    if (!(v >= 0)) return toast('Ungültiger Wert');
    await saveSettings({ soll_default: v });
    toast('Standard-Soll gespeichert');
  };

  $('#s-ov-add').onclick = async () => {
    const monat = $('#s-ov-monat').value; // 'YYYY-MM'
    const soll = Number($('#s-ov-soll').value);
    if (!monat || !(soll >= 0)) return toast('Monat und Soll angeben');
    await setMonatssoll(`${monat}-01`, soll);
    renderSettings(el);
  };

  el.querySelectorAll('.msoll-row button').forEach((btn) => {
    btn.onclick = async () => {
      await setMonatssoll(btn.closest('.msoll-row').dataset.monat, null);
      renderSettings(el);
    };
  });

  $('#s-sig-neu').onclick = async () => {
    const dataUrl = await openSignaturePad('Deine Unterschrift');
    if (!dataUrl) return;
    await saveSettings({ signatur: dataUrl });
    renderSettings(el);
  };

  const del = $('#s-sig-del');
  if (del) del.onclick = async () => {
    await saveSettings({ signatur: null });
    renderSettings(el);
  };

  $('#s-logout').onclick = async () => {
    await sb.auth.signOut();
    location.reload();
  };
}
