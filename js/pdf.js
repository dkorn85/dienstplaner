// Arbeitszeitnachweis-PDF (jsPDF + autoTable) — Layout wie die bisherigen pkr-zeiten-Nachweise,
// aber eine Datei pro KW mit einer Seite je Einrichtung (jede mit eigenem Unterschriften-Paar).
import { fmtDatumDE, fmtStundenPDF } from './time.js';

const M = 20;          // Seitenrand mm
const BREITE = 210;    // A4 hoch

function ladeBild(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// sections: [{ ortName, rows: [{tag, datum, von, bis, pause, nettoMin}], summeMin, sigPflegekraft, sigEinrichtung }]
export async function buildWeekPdf({ jahr, kw, dates, pflegekraft, sections }) {
  const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
  const erstellt = new Date().toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });

  for (let i = 0; i < sections.length; i++) {
    if (i > 0) doc.addPage();
    const s = sections[i];
    let y = 22;

    // Titel + Goldlinie + Zeitraum (Zeitraum neu — beugt KW-Verwechslung vor)
    doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(30, 30, 40);
    doc.text(`Arbeitszeitnachweis (KW ${kw})`, M, y);
    doc.setDrawColor(217, 131, 36).setLineWidth(0.5);
    doc.line(M, y + 2.5, BREITE - M, y + 2.5);
    y += 9;
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(110, 110, 110);
    doc.text(`Zeitraum: ${fmtDatumDE(dates[0])} – ${fmtDatumDE(dates[6])}`, M, y);
    y += 8;

    // Kopfzeilen
    doc.setFontSize(11).setTextColor(30, 30, 40);
    doc.text(`Pflegekraft: ${pflegekraft.name}`, M, y);
    doc.text(`E-Mail: ${pflegekraft.email}`, M, y + 5.5);
    doc.text(`Einrichtung: ${s.ortName}`, M, y + 11);
    y += 18;

    // Tages-Tabelle
    doc.autoTable({
      startY: y,
      margin: { left: M, right: M },
      head: [['Tag', 'Datum', 'Von', 'Bis', 'Pause', 'Netto']],
      body: s.rows.map((r) => [
        r.tag,
        r.datum ? fmtDatumDE(r.datum) : '–',
        r.von ?? '–',
        r.bis ?? '–',
        `${r.pause ?? 0} min`,
        r.nettoMin != null ? fmtStundenPDF(r.nettoMin) : '0.00',
      ]),
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 10, cellPadding: 2.2, textColor: [40, 40, 50], lineColor: [170, 170, 170], lineWidth: 0.2 },
      headStyles: { fillColor: [235, 235, 235], textColor: [30, 30, 40], fontStyle: 'bold' },
    });
    y = doc.lastAutoTable.finalY + 8;

    // Wochensumme rechtsbündig unter der Tabelle
    doc.setFont('helvetica', 'bold').setFontSize(11);
    const summe = `Wochensumme Netto:  ${fmtStundenPDF(s.summeMin)}`;
    doc.text(summe, BREITE - M, y, { align: 'right' });
    y += 14;

    // Unterschriften: zwei Boxen nebeneinander
    const boxW = 80, boxH = 32, x2 = BREITE - M - boxW;
    doc.setFontSize(10.5);
    doc.text('Unterschrift Pflegekraft', M, y);
    doc.text('Unterschrift Einrichtung', x2, y);
    y += 3;
    doc.setDrawColor(120, 120, 120).setLineWidth(0.3);
    doc.rect(M, y, boxW, boxH);
    doc.rect(x2, y, boxW, boxH);

    for (const [sig, bx] of [[s.sigPflegekraft, M], [s.sigEinrichtung, x2]]) {
      if (!sig) continue;
      const dim = await ladeBild(sig);
      const innenW = boxW - 8, innenH = boxH - 6;
      const f = Math.min(innenW / dim.w, innenH / dim.h);
      const w = dim.w * f, h = dim.h * f;
      doc.addImage(sig, 'PNG', bx + (boxW - w) / 2, y + (boxH - h) / 2, w, h);
    }

    // Fußzeile
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(140, 140, 140);
    doc.text(`Erstellt am ${erstellt}`, M, 287);
    doc.text(`Seite ${i + 1}/${sections.length}`, BREITE - M, 287, { align: 'right' });
  }

  return doc;
}

export function pdfDateiname(jahr, kw) {
  return `Arbeitszeitnachweis_KW${String(kw).padStart(2, '0')}_${jahr}.pdf`;
}
