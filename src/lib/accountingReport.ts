// Erzeugt einen konsolidierten Buchhaltungs-Report als PDF (pdf-lib, clientseitig).

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface ReportPropertyLine {
  name: string;
  city: string;
  income: number;
  expense: number;
  result: number;
}

export interface ReportInput {
  title: string;
  periodLabel: string;
  properties: ReportPropertyLine[];
  generatedBy?: string;
}

const chf = (n: number) =>
  new Intl.NumberFormat("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export async function buildConsolidatedReport(input: ReportInput): Promise<Blob> {
  const pdf = await PDFDocument.create();
  let page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margin = 48;
  const width = page.getWidth();
  let y = page.getHeight() - margin;

  const dark = rgb(0.12, 0.12, 0.14);
  const muted = rgb(0.45, 0.45, 0.5);
  const line = rgb(0.85, 0.85, 0.88);
  const green = rgb(0.0, 0.5, 0.2);
  const red = rgb(0.7, 0.1, 0.1);

  const text = (s: string, x: number, yy: number, size = 10, f = font, color = dark) =>
    page.drawText(s, { x, y: yy, size, font: f, color });

  const rightText = (s: string, xRight: number, yy: number, size = 10, f = font, color = dark) => {
    const w = f.widthOfTextAtSize(s, size);
    page.drawText(s, { x: xRight - w, y: yy, size, font: f, color });
  };

  // Kopf
  text("Konsolidierte Buchhaltung", margin, y, 18, bold);
  y -= 22;
  text(input.title, margin, y, 11, font, muted);
  y -= 16;
  text(`Zeitraum: ${input.periodLabel}`, margin, y, 10, font, muted);
  y -= 14;
  text(`Erstellt: ${new Date().toLocaleDateString("de-CH")}${input.generatedBy ? " · " + input.generatedBy : ""}`, margin, y, 9, font, muted);
  y -= 24;

  // Tabellenkopf
  const colName = margin;
  const colIncome = width - margin - 320;
  const colExpense = width - margin - 170;
  const colResult = width - margin;

  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: line });
  y -= 14;
  text("Liegenschaft", colName, y, 9, bold, muted);
  rightText("Ertrag", colIncome, y, 9, bold, muted);
  rightText("Aufwand", colExpense, y, 9, bold, muted);
  rightText("Ergebnis", colResult, y, 9, bold, muted);
  y -= 8;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: line });
  y -= 16;

  let tIncome = 0, tExpense = 0, tResult = 0;
  for (const p of input.properties) {
    if (y < margin + 80) {
      page = pdf.addPage([595.28, 841.89]);
      y = page.getHeight() - margin;
    }
    text(p.name, colName, y, 10, bold);
    text(p.city, colName, y - 12, 8, font, muted);
    rightText(chf(p.income), colIncome, y, 10);
    rightText(chf(p.expense), colExpense, y, 10);
    rightText(chf(p.result), colResult, y, 10, bold, p.result >= 0 ? green : red);
    y -= 26;
    page.drawLine({ start: { x: margin, y: y + 6 }, end: { x: width - margin, y: y + 6 }, thickness: 0.5, color: line });

    tIncome += p.income; tExpense += p.expense; tResult += p.result;
  }

  // Summenzeile
  y -= 6;
  page.drawLine({ start: { x: margin, y: y + 10 }, end: { x: width - margin, y: y + 10 }, thickness: 1, color: dark });
  text("Total", colName, y - 6, 11, bold);
  rightText(chf(tIncome), colIncome, y - 6, 11, bold);
  rightText(chf(tExpense), colExpense, y - 6, 11, bold);
  rightText(chf(tResult), colResult, y - 6, 11, bold, tResult >= 0 ? green : red);

  // Fuß
  text("Erstellt mit Property Network – Liegenschaftsverwaltung", margin, margin - 10, 8, font, muted);

  const bytes = await pdf.save();
  return new Blob([bytes], { type: "application/pdf" });
}
