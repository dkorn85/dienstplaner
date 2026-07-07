// Boot: Auth-Gate, Laden, Hash-Routing auf die vier Views.
import { sb, loadAll } from './api.js';
import { renderCalendar } from './calendar.js';
import { renderExport } from './export.js';
import { renderOrte } from './orte.js';
import { renderSettings } from './settings.js';
import { closeSheet, toast } from './ui.js';

const VIEWS = {
  kalender: renderCalendar,
  export: renderExport,
  orte: renderOrte,
  einstellungen: renderSettings,
};

const $ = (id) => document.getElementById(id);

let aktuelleView = null;

function route() {
  const name = location.hash.replace('#', '') || 'kalender';
  if (name === 'setup') return; // nur für den Login-Screen relevant
  const zielName = VIEWS[name] ? name : 'kalender';
  const render = VIEWS[zielName];
  closeSheet();
  document.querySelectorAll('.bottomnav a').forEach((a) => {
    a.classList.toggle('active', a.dataset.view === zielName);
  });
  const view = $('view');
  const wechsel = aktuelleView !== null && aktuelleView !== zielName;
  aktuelleView = zielName;
  render(view);
  if (wechsel && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Einwisch-Animation nur bei echtem Tab-Wechsel neu anstoßen
    view.classList.remove('view-anim');
    void view.offsetWidth;
    view.classList.add('view-anim');
  }
}

function zeigeLogin() {
  $('view-login').classList.remove('hidden');
  $('app').classList.add('hidden');
  const istSetup = location.hash === '#setup';
  $('setup-form').classList.toggle('hidden', !istSetup);
  $('login-form').classList.toggle('hidden', istSetup);
}

async function zeigeApp() {
  try {
    await loadAll();
  } catch (e) {
    toast(`Laden fehlgeschlagen: ${e.message}`, 6000);
    return;
  }
  $('view-login').classList.add('hidden');
  $('app').classList.remove('hidden');
  route();
}

$('login-form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const msg = $('login-msg');
  msg.textContent = 'Anmelden …'; msg.classList.remove('err');
  const { error } = await sb.auth.signInWithPassword({
    email: $('login-email').value.trim(),
    password: $('login-pass').value,
  });
  if (error) {
    msg.textContent = error.message === 'Invalid login credentials'
      ? 'E-Mail oder Passwort falsch' : error.message;
    msg.classList.add('err');
    return;
  }
  msg.textContent = '';
  await zeigeApp();
});

$('setup-form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const msg = $('setup-msg');
  msg.textContent = 'Registrieren …'; msg.classList.remove('err');
  const { error } = await sb.auth.signUp({
    email: $('setup-email').value.trim(),
    password: $('setup-pass').value,
  });
  if (error) { msg.textContent = error.message; msg.classList.add('err'); return; }
  msg.textContent = 'Fertig! Bitte den Bestätigungs-Link in deiner Mail antippen, dann hier anmelden.';
});

window.addEventListener('hashchange', () => {
  if ($('app').classList.contains('hidden')) zeigeLogin();
  else route();
});

// Start: bestehende Session?
const { data: { session } } = await sb.auth.getSession();
if (session) await zeigeApp();
else zeigeLogin();
