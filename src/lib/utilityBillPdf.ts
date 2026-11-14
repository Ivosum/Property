// Nebenkostenabrechnung je Mieter als PDF (pdf-lib, clientseitig).

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface UtilityBillPdfInput {
  propertyName: string;
  propertyCity: string;
  periodLabel: string;
  tenantName: string;
  unitNumber: string;
  areaSqm: number;
  totalArea: number;
  sharePct: number;      // 0..1
  months: number;
  costBreakdown: { code: string; name: string; amount: number }[];
  totalCost: number;     // Gesamtkosten der Liegenschaft
  costShare: number;     // Anteil dieses Mieters
  advancePaid: number;
  balance: number;       // advance - share
  distributionLabel: string;
}

const chf = (n: number) =>
  new Intl.NumberFormat("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export async function buildUtilityBillPdf(input: UtilityBillPdfInput): Promise<Blob> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595.28, 841.89]);
  const width = page.getWidth();
  const margin = 48;
  let y = page.getHeight() - margin;

  const dark = rgb(0.12, 0.12, 0.14);
  const muted = rgb(0.45, 0.45, 0.5);
  const line = rgb(0.85, 0.85, 0.88);
  const green = rgb(0.0, 0.5, 0.2);
  const red = rgb(0.7, 0.1, 0.1);
  const colRight = width - margin;

  const text = (s: string, x: number, size = 10, f = font, color = dark) =>
    page.drawText(s, { x, y, size, font: f, color });
  const rightText = (s: string, xRight: number, size = 10, f = font, color = dark) => {
    const w = f.widthOfTextAtSize(s, size);
    page.drawText(s, { x: xRight - w, y, size, font: f, color });
  };
  const hr = (thickness = 0.5, color = line) =>
    page.drawLine({ start: { x: margin, y: y + 4 }, end: { x: width - margin, y: y + 4 }, thickness, color });

  // Kopf
  text("Nebenkostenabrechnung", margin, 18, bold);
  y -= 22;
  text(`${input.propertyName} · ${input.propertyCity}`, margin, 11, font, muted);
  y -= 15;
  text(`Abrechnungsperiode: ${input.periodLabel}`, margin, 10, font, muted);
  y -= 26;

  // Mieterblock
  text("Mieter", margin, 10, bold, muted);
  rightText("Objekt", colRight, 10, bold, muted);
  y -= 15;
  text(input.tenantName, margin, 11, bold);
  rightText(`Wohnung ${input.unitNumber}`, colRight, 11);
  y -= 14;
  text(`Wohnfläche: ${input.areaSqm.toLocaleString("de-CH")} m²`, margin, 9, font, muted);
  rightText(`Mietmonate in Periode: ${input.months}`, colRight, 9, font, muted);
  y -= 24;

  // Kostenaufstellung der Liegenschaft
  text("Nebenkosten der Liegenschaft", margin, 12, bold);
  y -= 16;
  hr(1, dark);
  y -= 14;
  for (const c of input.costBreakdown) {
    text(`${c.code}  ${c.name}`, margin + 4, 10);
    rightText(chf(c.amount), colRight, 10);
    y -= 14;
  }
  hr(0.5, line);
  y -= 14;
  text("Total Nebenkosten", margin + 4, 10, bold);
  rightText(chf(input.totalCost), colRight, 10, bold);
  y -= 26;

  // Verteilung
  text("Ihr Anteil", margin, 12, bold);
  y -= 16;
  hr(1, dark);
  y -= 14;
  text(`Verteilschlüssel: ${input.distributionLabel}`, margin + 4, 10);
  y -= 14;
  text(`Anteil: ${(input.sharePct * 100).toFixed(2)} %  (${input.areaSqm.toLocaleString("de-CH")} m² von ${input.totalArea.toLocaleString("de-CH")} m²)`, margin + 4, 10);
  y -= 18;
  text("Ihr Kostenanteil", margin + 4, 10, bold);
  rightText(chf(input.costShare), colRight, 10, bold);
  y -= 16;
  text("Geleistete Akonto-Zahlungen", margin + 4, 10);
  rightText("– " + chf(input.advancePaid), colRight, 10);
  y -= 16;
  hr(1, dark);
  y -= 18;

  // Saldo
  const nachzahlung = input.balance < 0;
  text(nachzahlung ? "Nachzahlung" : "Guthaben", margin, 13, bold);
  rightText(chf(Math.abs(input.balance)), colRight, 13, bold, nachzahlung ? red : green);
  y -= 22;
  text(
    nachzahlung
      ? "Bitte überweisen Sie den Nachzahlungsbetrag innert 30 Tagen."
      : "Das Guthaben wird Ihnen gutgeschrieben bzw. zurückerstattet.",
    margin, 9, font, muted
  );

  // Fuß
  page.drawText("Erstellt mit Property Network – Liegenschaftsverwaltung", {
    x: margin, y: margin - 12, size: 8, font, color: muted,
  });

  const bytes = await pdf.save();
  return new Blob([bytes], { type: "application/pdf" });
}
