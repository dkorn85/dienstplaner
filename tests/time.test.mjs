// Ausführen mit: node tests/time.test.mjs
import assert from 'node:assert/strict';
import {
  nettoMinuten, isoWeek, weekDates, weeksInIsoYear, addDays,
  wochentagIndex, fmtStundenDE, fmtStundenPDF, fmtStundenKurz, fmtDatumDE, daysInMonth,
  ostersonntag, feiertag,
} from '../js/time.js';

// Netto-Vektoren aus den echten Arbeitszeitnachweisen
assert.equal(nettoMinuten('22:15', '06:15', 0), 480);   // 8.00 h Nachtdienst
assert.equal(nettoMinuten('20:45', '06:15', 0), 570);   // 9.50 h
assert.equal(nettoMinuten('08:00', '14:00', 0), 360);   // 6.00 h Frühdienst
assert.equal(nettoMinuten('22:15', '06:15', 30), 450);  // mit Pause
assert.equal(nettoMinuten('23:00', '00:30', 0), 90);    // knapp über Mitternacht

// ISO-Wochen: bekannte Kanten
assert.deepEqual(isoWeek('2026-05-27'), { jahr: 2026, kw: 22 }); // aus dem echten PDF (KW 22)
assert.deepEqual(isoWeek('2026-05-18'), { jahr: 2026, kw: 21 }); // das alte Tool sagte fälschlich KW 24
assert.deepEqual(isoWeek('2021-01-01'), { jahr: 2020, kw: 53 });
assert.deepEqual(isoWeek('2024-12-30'), { jahr: 2025, kw: 1 });
assert.deepEqual(isoWeek('2026-01-01'), { jahr: 2026, kw: 1 });
assert.deepEqual(isoWeek('2026-12-31'), { jahr: 2026, kw: 53 });
assert.equal(weeksInIsoYear(2020), 53);
assert.equal(weeksInIsoYear(2024), 52);
assert.equal(weeksInIsoYear(2026), 53);

// weekDates: KW 27/2026 = 29.06.–05.07.
assert.deepEqual(weekDates(2026, 27)[0], '2026-06-29');
assert.deepEqual(weekDates(2026, 27)[6], '2026-07-05');
// KW 1/2021 enthält Dezember-Tage
assert.deepEqual(weekDates(2020, 53)[4], '2021-01-01');

// Roundtrip über viele Tage: weekDates(isoWeek(d)) enthält d an Position wochentagIndex(d)
let d = '2019-12-15';
for (let i = 0; i < 800; i++) {
  const { jahr, kw } = isoWeek(d);
  assert.equal(weekDates(jahr, kw)[wochentagIndex(d)], d, `Roundtrip für ${d}`);
  d = addDays(d, 1);
}

// Kalendermathe
assert.equal(addDays('2026-06-30', 1), '2026-07-01');
assert.equal(addDays('2026-01-01', -1), '2025-12-31');
assert.equal(daysInMonth(2026, 2), 28);
assert.equal(daysInMonth(2028, 2), 29);
assert.equal(wochentagIndex('2026-07-06'), 0); // Montag

// Formatierung
assert.equal(fmtStundenDE(480), '8,00');
assert.equal(fmtStundenDE(570), '9,50');
assert.equal(fmtStundenPDF(495), '8.25');
assert.equal(fmtStundenKurz(480), '8');
assert.equal(fmtStundenKurz(510), '8,5');
assert.equal(fmtStundenKurz(495), '8,25');
assert.equal(fmtStundenKurz(600), '10');
assert.equal(fmtDatumDE('2026-07-03'), '03.07.2026');

// Feiertage NRW
assert.equal(ostersonntag(2024), '2024-03-31');
assert.equal(ostersonntag(2025), '2025-04-20');
assert.equal(ostersonntag(2026), '2026-04-05');
assert.equal(feiertag('2026-04-03'), 'Karfreitag');
assert.equal(feiertag('2026-05-25'), 'Pfingstmontag');
assert.equal(feiertag('2026-06-04'), 'Fronleichnam');
assert.equal(feiertag('2026-11-01'), 'Allerheiligen');
assert.equal(feiertag('2026-10-31'), null);  // Reformationstag ist NICHT NRW
assert.equal(feiertag('2026-07-04'), null);

console.log('✓ alle time.js-Tests grün');
