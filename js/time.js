// Pure Zeit-/Datumslogik — keine Imports, node-testbar.
// Datumswerte sind überall 'YYYY-MM-DD'-Strings, Arithmetik läuft über Date.UTC
// (dadurch keine DST-/Zeitzonen-Effekte). Uhrzeiten sind 'HH:MM'-Strings.

export const WOCHENTAGE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
export const WOCHENTAGE_KURZ = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
export const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

const TAG_MS = 86400000;
const pad = (n) => String(n).padStart(2, '0');

export function toMin(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// Netto-Minuten eines Dienstes; bis <= von bedeutet: geht über Mitternacht.
export function nettoMinuten(von, bis, pause = 0) {
  let d = toMin(bis) - toMin(von);
  if (d <= 0) d += 1440;
  return d - pause;
}

function toUTC(s) {
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUTC(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function addDays(s, n) {
  return fromUTC(toUTC(s) + n * TAG_MS);
}

// 0 = Montag … 6 = Sonntag
export function wochentagIndex(s) {
  return (new Date(toUTC(s)).getUTCDay() + 6) % 7;
}

// ISO-8601-Kalenderwoche (Donnerstag-Regel). Liefert { jahr, kw } — jahr ist das ISO-Jahr!
export function isoWeek(s) {
  const ms = toUTC(s);
  const thu = ms + (3 - wochentagIndex(s)) * TAG_MS;
  const isoJahr = new Date(thu).getUTCFullYear();
  return { jahr: isoJahr, kw: Math.floor((thu - week1Monday(isoJahr)) / (7 * TAG_MS)) + 1 };
}

// Montag der KW 1 eines ISO-Jahres (die Woche, die den 4. Januar enthält).
function week1Monday(isoJahr) {
  const jan4 = `${isoJahr}-01-04`;
  return toUTC(jan4) - wochentagIndex(jan4) * TAG_MS;
}

// Die 7 Datums-Strings (Mo–So) einer ISO-KW.
export function weekDates(isoJahr, kw) {
  const mon = week1Monday(isoJahr) + (kw - 1) * 7 * TAG_MS;
  return Array.from({ length: 7 }, (_, i) => fromUTC(mon + i * TAG_MS));
}

// Anzahl ISO-Wochen eines Jahres (52 oder 53): der 28.12. liegt immer in der letzten KW.
export function weeksInIsoYear(isoJahr) {
  return isoWeek(`${isoJahr}-12-28`).kw;
}

// Ostersonntag nach der anonymen Gauß-Ergänzung (gregorianisch)
export function ostersonntag(jahr) {
  const a = jahr % 19, b = Math.floor(jahr / 100), c = jahr % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31);
  const tag = ((h + l - 7 * m + 114) % 31) + 1;
  return `${jahr}-${pad(monat)}-${pad(tag)}`;
}

const ftCache = new Map();

// Gesetzliche Feiertage in NRW: Datum-String → Name
export function feiertageNRW(jahr) {
  if (ftCache.has(jahr)) return ftCache.get(jahr);
  const os = ostersonntag(jahr);
  const ft = {
    [`${jahr}-01-01`]: 'Neujahr',
    [addDays(os, -2)]: 'Karfreitag',
    [addDays(os, 1)]: 'Ostermontag',
    [`${jahr}-05-01`]: 'Tag der Arbeit',
    [addDays(os, 39)]: 'Christi Himmelfahrt',
    [addDays(os, 50)]: 'Pfingstmontag',
    [addDays(os, 60)]: 'Fronleichnam',
    [`${jahr}-10-03`]: 'Tag der Deutschen Einheit',
    [`${jahr}-11-01`]: 'Allerheiligen',
    [`${jahr}-12-25`]: '1. Weihnachtstag',
    [`${jahr}-12-26`]: '2. Weihnachtstag',
  };
  ftCache.set(jahr, ft);
  return ft;
}

// Feiertagsname für ein Datum oder null
export function feiertag(datum) {
  return feiertageNRW(Number(datum.slice(0, 4)))[datum] || null;
}

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function daysInMonth(jahr, monat) { // monat 1-basiert
  return new Date(Date.UTC(jahr, monat, 0)).getUTCDate();
}

export function monatKey(s) { // '2026-07-03' → '2026-07'
  return s.slice(0, 7);
}

// ---- Formatierung ----

export function fmtStundenDE(min) { // 480 → '8,00'
  return (min / 60).toFixed(2).replace('.', ',');
}

export function fmtStundenPDF(min) { // 480 → '8.00' (wie die bisherigen Nachweise)
  return (min / 60).toFixed(2);
}

export function fmtStundenKurz(min) { // 480 → '8', 510 → '8,5', 495 → '8,25' (für enge Chips)
  return (min / 60).toFixed(2).replace(/\.?0+$/, '').replace('.', ',');
}

export function fmtDatumDE(s) { // '2026-07-03' → '03.07.2026'
  const [y, m, d] = s.split('-');
  return `${d}.${m}.${y}`;
}

export function fmtDatumKurz(s) { // '2026-07-03' → '03.07.'
  const [, m, d] = s.split('-');
  return `${d}.${m}.`;
}
