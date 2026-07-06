// Supabase-Client, Auth, CRUD und In-Memory-Store.
// Datenmenge ist winzig (~200 Dienste/Jahr) → einmal laden, im Speicher halten.
import { CONFIG } from './config.js';

export const sb = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);

export const store = {
  dienste: [],    // [{id, datum, von, bis, pause, ort_id, zusammenfassung}]
  orte: [],       // [{id, name, kurz, farbe, von_default, bis_default, pause_default, aktiv}]
  settings: null, // {name, email, soll_default, signatur}
  monatssoll: [], // [{monat: '2026-07-01', soll}]
};

const SEED_ORTE = [
  { name: 'Edith Stein Haus, Hubertstraße', kurz: 'ESH', farbe: '#f0b429' },
  { name: 'Haus Edith Stein WB Kaktus', kurz: 'Kaktus', farbe: '#7ec46f' },
  { name: 'Engelbert - Manderscheidtstr.', kurz: 'Eng-M', farbe: '#5aa9e6' },
  { name: 'Engelbert - Tommesweg 15', kurz: 'Eng-T', farbe: '#9b7ede' },
  { name: 'AWO Friedrich Ebert Zentrum Essen', kurz: 'AWO', farbe: '#e66a6a' },
].map((o) => ({ ...o, von_default: '22:15', bis_default: '06:15', pause_default: 0 }));

function fail(error, kontext) {
  console.error(kontext, error);
  throw new Error(`${kontext}: ${error.message}`);
}

// HH:MM:SS aus Postgres → HH:MM
const zeit = (t) => (t ? t.slice(0, 5) : t);

export async function loadAll() {
  const [dienste, orte, settings, monatssoll] = await Promise.all([
    sb.from('dp_dienste').select('*').order('datum').order('von'),
    sb.from('dp_orte').select('*').order('name'),
    sb.from('dp_settings').select('*').maybeSingle(),
    sb.from('dp_monatssoll').select('*').order('monat'),
  ]);
  for (const r of [dienste, orte, settings, monatssoll]) if (r.error) fail(r.error, 'Laden');
  store.dienste = dienste.data.map((d) => ({ ...d, von: zeit(d.von), bis: zeit(d.bis) }));
  store.orte = orte.data.map((o) => ({ ...o, von_default: zeit(o.von_default), bis_default: zeit(o.bis_default) }));
  store.settings = settings.data;
  store.monatssoll = monatssoll.data;
  await ensureSeed();
}

// Erster Login: Settings-Zeile + bekannte Einsatzorte anlegen.
async function ensureSeed() {
  if (!store.settings) {
    const { data: userData } = await sb.auth.getUser();
    const { data, error } = await sb.from('dp_settings')
      .insert({ email: userData?.user?.email ?? 'dkorn85@gmail.com' })
      .select().single();
    if (error) fail(error, 'Settings anlegen');
    store.settings = data;
  }
  if (store.orte.length === 0) {
    const { data, error } = await sb.from('dp_orte').insert(SEED_ORTE).select();
    if (error) fail(error, 'Orte anlegen');
    store.orte = data.map((o) => ({ ...o, von_default: zeit(o.von_default), bis_default: zeit(o.bis_default) }));
  }
}

// ---- Dienste ----

export async function saveDienst(dienst) {
  const row = {
    datum: dienst.datum, von: dienst.von, bis: dienst.bis,
    pause: dienst.pause, ort_id: dienst.ort_id,
    zusammenfassung: dienst.zusammenfassung || null,
  };
  let res;
  if (dienst.id) {
    res = await sb.from('dp_dienste').update({ ...row, updated_at: new Date().toISOString() }).eq('id', dienst.id).select().single();
  } else {
    res = await sb.from('dp_dienste').insert(row).select().single();
  }
  if (res.error) fail(res.error, 'Dienst speichern');
  const saved = { ...res.data, von: zeit(res.data.von), bis: zeit(res.data.bis) };
  store.dienste = store.dienste.filter((d) => d.id !== saved.id).concat(saved)
    .sort((a, b) => (a.datum + a.von).localeCompare(b.datum + b.von));
  return saved;
}

export async function deleteDienst(id) {
  const { error } = await sb.from('dp_dienste').delete().eq('id', id);
  if (error) fail(error, 'Dienst löschen');
  store.dienste = store.dienste.filter((d) => d.id !== id);
}

// ---- Orte ----

export async function saveOrt(ort) {
  const row = {
    name: ort.name, kurz: ort.kurz, farbe: ort.farbe,
    von_default: ort.von_default || null, bis_default: ort.bis_default || null,
    pause_default: ort.pause_default, aktiv: ort.aktiv,
  };
  const res = ort.id
    ? await sb.from('dp_orte').update(row).eq('id', ort.id).select().single()
    : await sb.from('dp_orte').insert(row).select().single();
  if (res.error) fail(res.error, 'Ort speichern');
  const saved = { ...res.data, von_default: zeit(res.data.von_default), bis_default: zeit(res.data.bis_default) };
  store.orte = store.orte.filter((o) => o.id !== saved.id).concat(saved)
    .sort((a, b) => a.name.localeCompare(b.name));
  return saved;
}

// Liefert false, wenn der Ort noch von Diensten benutzt wird (FK restrict).
export async function deleteOrt(id) {
  const { error } = await sb.from('dp_orte').delete().eq('id', id);
  if (error) {
    if (error.code === '23503') return false;
    fail(error, 'Ort löschen');
  }
  store.orte = store.orte.filter((o) => o.id !== id);
  return true;
}

// ---- Settings & Monatssoll ----

export async function saveSettings(patch) {
  const { data, error } = await sb.from('dp_settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('user_id', store.settings.user_id).select().single();
  if (error) fail(error, 'Einstellungen speichern');
  store.settings = data;
}

export async function setMonatssoll(monat, soll) { // monat = '2026-07-01', soll = null löscht
  if (soll === null) {
    const { error } = await sb.from('dp_monatssoll').delete().eq('monat', monat);
    if (error) fail(error, 'Monatssoll löschen');
    store.monatssoll = store.monatssoll.filter((m) => m.monat !== monat);
  } else {
    const { data, error } = await sb.from('dp_monatssoll').upsert({ monat, soll }, { onConflict: 'user_id,monat' }).select().single();
    if (error) fail(error, 'Monatssoll speichern');
    store.monatssoll = store.monatssoll.filter((m) => m.monat !== monat).concat(data)
      .sort((a, b) => a.monat.localeCompare(b.monat));
  }
}

// Soll für einen Monat ('2026-07') — Override oder Default.
export function sollFuer(monatKey) {
  const ov = store.monatssoll.find((m) => m.monat.startsWith(monatKey));
  return Number(ov ? ov.soll : store.settings.soll_default);
}
