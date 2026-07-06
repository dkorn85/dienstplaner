// Kleine UI-Helfer: Bottom-Sheet, Signatur-Pad, Toast.

const sheet = () => document.getElementById('sheet');
const backdrop = () => document.getElementById('backdrop');

export function openSheet(html) {
  sheet().innerHTML = html;
  sheet().classList.remove('hidden');
  backdrop().classList.remove('hidden');
  backdrop().onclick = closeSheet;
  return sheet();
}

export function closeSheet() {
  sheet().classList.add('hidden');
  backdrop().classList.add('hidden');
  sheet().innerHTML = '';
}

export function toast(msg, ms = 2600) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), ms);
}

// Öffnet das Signatur-Pad; resolved mit PNG-Data-URL oder null bei Abbruch.
export function openSignaturePad(titel = 'Unterschrift') {
  return new Promise((resolve) => {
    const modal = document.getElementById('sigmodal');
    const canvas = document.getElementById('sig-canvas');
    document.getElementById('sig-title').textContent = titel;
    modal.classList.remove('hidden');

    // Canvas scharf stellen (devicePixelRatio), sonst versetzte/verwaschene Striche
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    canvas.getContext('2d').scale(ratio, ratio);

    const pad = new window.SignaturePad(canvas, { penColor: '#1a1a2e' });

    const done = (result) => {
      modal.classList.add('hidden');
      pad.off();
      resolve(result);
    };
    document.getElementById('sig-clear').onclick = () => pad.clear();
    document.getElementById('sig-cancel').onclick = () => done(null);
    document.getElementById('sig-ok').onclick = () => {
      if (pad.isEmpty()) return toast('Bitte erst unterschreiben');
      done(pad.toDataURL('image/png'));
    };
  });
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
