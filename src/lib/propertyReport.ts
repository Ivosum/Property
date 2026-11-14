// Vollständiger Liegenschafts-Report als PDF: Erfolgsrechnung, Bilanz und Belegliste.
// Clientseitig mit pdf-lib. Für den Versand an den Eigentümer/Auftraggeber.

import { PDFDocument, PDFPage, PDFFont, StandardFonts, rgb } from "pdf-lib";
import type { AccountBalance } from "./accounting";

export interface ReceiptLine {
  date: string;        // ISO
  vendor: string;
  reference: string | null;
  amount: number;
}

export interface PropertyReportInput {
  propertyName: string;
  propertyCity: string;
  periodLabel: string;
  balances: AccountBalance[];
  receipts: ReceiptLine[];
  generatedBy?: string;
}

const chf = (n: number) =>
  new Intl.NumberFormat("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const dateCH = (iso: string) => (iso ? new Date(iso).toLocaleDateString("de-CH") : "");

export async function buildPropertyReport(input: PropertyReportInput): Promise<Blob> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const A4: [number, number] = [595.28, 841.89];
  const margin = 48;
  const dark = rgb(0.12, 0.12, 0.14);
  const muted = rgb(0.45, 0.45, 0.5);
  const line = rgb(0.85, 0.85, 0.88);
  const green = rgb(0.0, 0.5, 0.2);
  const red = rgb(0.7, 0.1, 0.1);

  let page: PDFPage = pdf.addPage(A4);
  const width = page.getWidth();
  let y = page.getHeight() - margin;

  const newPageIfNeeded = (needed: number) => {
    if (y < margin + needed) {
      page = pdf.addPage(A4);
      y = page.getHeight() - margin;
    }
  };

  const text = (s: string, x: number, size = 10, f: PDFFont = font, color = dark) =>
    page.drawText(s, { x, y, size, font: f, color });

  const rightText = (s: string, xRight: number, size = 10, f: PDFFont = font, color = dark) => {
    const w = f.widthOfTextAtSize(s, size);
    page.drawText(s, { x: xRight - w, y, size, font: f, color });
  };

  const hr = (thickness = 0.5, color = line) => {
    page.drawLine({ start: { x: margin, y: y + 4 }, end: { x: width - margin, y: y + 4 }, thickness, color });
  };

  const colRight = width - margin;

  // ---- Kopf ----
  text("Liegenschafts-Report", margin, 18, bold);
  y -= 22;
  text(`${input.propertyName} · ${input.propertyCity}`, margin, 11, font, muted);
  y -= 15;
  text(`Zeitraum: ${input.periodLabel}`, margin, 10, font, muted);
  y -= 13;
  text(`Erstellt: ${new Date().toLocaleDateString("de-CH")}${input.generatedBy ? " · " + input.generatedBy : ""}`, margin, 9, font, muted);
  y -= 26;

  // ---- Erfolgsrechnung ----
  const income = input.balances.filter((b) => b.account.type === "income" && Math.abs(b.balance) > 0.005);
  const expense = input.balances.filter((b) => b.account.type === "expense" && Math.abs(b.balance) > 0.005);
  const totalIncome = income.reduce((s, b) => s + b.balance, 0);
  const totalExpense = expense.reduce((s, b) => s + b.balance, 0);
  const result = totalIncome - totalExpense;

  text("Erfolgsrechnung", margin, 13, bold);
  y -= 16;
  hr(1, dark);
  y -= 14;

  text("Ertrag", margin, 10, bold, muted);
  y -= 14;
  for (const b of income) {
    newPageIfNeeded(40);
    text(`${b.account.code}  ${b.account.name}`, margin + 8, 10);
    rightText(chf(b.balance), colRight, 10);
    y -= 14;
  }
  text("Total Ertrag", margin + 8, 10, bold);
  rightText(chf(totalIncome), colRight, 10, bold, green);
  y -= 18;

  text("Aufwand", margin, 10, bold, muted);
  y -= 14;
  for (const b of expense) {
    newPageIfNeeded(40);
    text(`${b.account.code}  ${b.account.name}`, margin + 8, 10);
    rightText(chf(b.balance), colRight, 10);
    y -= 14;
  }
  text("Total Aufwand", margin + 8, 10, bold);
  rightText(chf(totalExpense), colRight, 10, bold, red);
  y -= 16;
  hr(1, dark);
  y -= 16;
  text("Ergebnis (Gewinn / Verlust)", margin, 11, bold);
  rightText(chf(result), colRight, 11, bold, result >= 0 ? green : red);
  y -= 30;

  // ---- Bilanz ----
  newPageIfNeeded(140);
  const assets = input.balances.filter((b) => b.account.type === "asset" && Math.abs(b.balance) > 0.005);
  const liabilities = input.balances.filter((b) => b.account.type === "liability" && Math.abs(b.balance) > 0.005);
  const equity = input.balances.filter((b) => b.account.type === "equity" && Math.abs(b.balance) > 0.005);
  const totalAssets = assets.reduce((s, b) => s + b.balance, 0);
  const totalLiab = liabilities.reduce((s, b) => s + b.balance, 0);
  const totalEq = equity.reduce((s, b) => s + b.balance, 0);

  text("Bilanz", margin, 13, bold);
  y -= 16;
  hr(1, dark);
  y -= 14;

  text("Aktiven", margin, 10, bold, muted);
  y -= 14;
  for (const b of assets) {
    newPageIfNeeded(40);
    text(`${b.account.code}  ${b.account.name}`, margin + 8, 10);
    rightText(chf(b.balance), colRight, 10);
    y -= 14;
  }
  text("Total Aktiven", margin + 8, 10, bold);
  rightText(chf(totalAssets), colRight, 10, bold);
  y -= 18;

  text("Passiven & Eigenkapital", margin, 10, bold, muted);
  y -= 14;
  for (const b of [...liabilities, ...equity]) {
    newPageIfNeeded(40);
    text(`${b.account.code}  ${b.account.name}`, margin + 8, 10);
    rightText(chf(b.balance), colRight, 10);
    y -= 14;
  }
  // Ergebnis zählt zum Eigenkapital
  text("Ergebnisvortrag (Periode)", margin + 8, 10);
  rightText(chf(result), colRight, 10);
  y -= 14;
  text("Total Passiven & EK", margin + 8, 10, bold);
  rightText(chf(totalLiab + totalEq + result), colRight, 10, bold);
  y -= 30;

  // ---- Belegliste ----
  if (input.receipts.length > 0) {
    newPageIfNeeded(80);
    text("Belege", margin, 13, bold);
    y -= 16;
    hr(1, dark);
    y -= 14;
    text("Datum", margin, 9, bold, muted);
    text("Lieferant / Referenz", margin + 80, 9, bold, muted);
    rightText("Betrag", colRight, 9, bold, muted);
    y -= 8;
    hr(0.5, line);
    y -= 14;
    let totalReceipts = 0;
    for (const r of input.receipts) {
      newPageIfNeeded(30);
      text(dateCH(r.date), margin, 9);
      const label = [r.vendor, r.reference].filter(Boolean).join(" · ") || "Beleg";
      text(label.length > 54 ? label.slice(0, 54) + "…" : label, margin + 80, 9);
      rightText(chf(r.amount), colRight, 9);
      y -= 14;
      totalReceipts += r.amount;
    }
    y -= 4;
    hr(0.5, line);
    y -= 14;
    text("Total Belege", margin, 10, bold);
    rightText(chf(totalReceipts), colRight, 10, bold);
    y -= 20;
  }

  // Fuß auf jeder Seite
  pdf.getPages().forEach((p) => {
    p.drawText("Erstellt mit Property Network – Liegenschaftsverwaltung", {
      x: margin, y: margin - 12, size: 8, font, color: muted,
    });
  });

  const bytes = await pdf.save();
  return new Blob([bytes], { type: "application/pdf" });
}
