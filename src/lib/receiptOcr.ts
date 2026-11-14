// Client-seitige Beleg-Erkennung (OCR) mit Tesseract.js.
// Liest Text aus einem Bild und extrahiert heuristisch Betrag, Datum und Lieferant.
// Läuft komplett im Browser – kein externer Dienst nötig.

import Tesseract from "tesseract.js";

export interface ReceiptExtract {
  rawText: string;
  amount: number | null;
  date: string | null; // ISO yyyy-mm-dd
  vendor: string | null;
}

// Schweizer Zahlenformate: 1'234.55 / 1234.55 / 1234,55
function parseAmount(text: string): number | null {
  const candidates: number[] = [];
  // Zeilen mit "Total", "Betrag", "CHF", "Rechnungsbetrag" bevorzugen
  const lines = text.split(/\n/);
  const re = /(\d{1,3}(?:['’ ]\d{3})*(?:[.,]\d{2})|\d+[.,]\d{2})/g;
  const prioritized: number[] = [];
  for (const line of lines) {
    const isTotal = /total|betrag|chf|summe|rechnungsbetrag|zu\s*zahlen/i.test(line);
    let m;
    while ((m = re.exec(line)) !== null) {
      const norm = m[1].replace(/['’ ]/g, "").replace(",", ".");
      const val = parseFloat(norm);
      if (!isNaN(val) && val > 0) {
        candidates.push(val);
        if (isTotal) prioritized.push(val);
      }
    }
  }
  if (prioritized.length) return Math.max(...prioritized);
  if (candidates.length) return Math.max(...candidates);
  return null;
}

function parseDate(text: string): string | null {
  // dd.mm.yyyy / dd.mm.yy / yyyy-mm-dd
  const m1 = text.match(/\b(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})\b/);
  if (m1) {
    let [, d, mo, y] = m1;
    if (y.length === 2) y = "20" + y;
    const dd = d.padStart(2, "0");
    const mm = mo.padStart(2, "0");
    if (+mm >= 1 && +mm <= 12 && +dd >= 1 && +dd <= 31) return `${y}-${mm}-${dd}`;
  }
  const m2 = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;
  return null;
}

function parseVendor(text: string): string | null {
  // Erste nicht-leere, nicht-rein-numerische Zeile als Lieferant annehmen
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 6)) {
    if (/^[\d\s.,'’:/-]+$/.test(line)) continue; // reine Zahlen/Datum überspringen
    if (line.length >= 3 && line.length <= 60) return line;
  }
  return null;
}

export async function extractReceipt(
  file: File,
  onProgress?: (p: number) => void
): Promise<ReceiptExtract> {
  const { data } = await Tesseract.recognize(file, "deu+eng", {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) onProgress(Math.round(m.progress * 100));
    },
  });
  const rawText = data.text || "";
  return {
    rawText,
    amount: parseAmount(rawText),
    date: parseDate(rawText),
    vendor: parseVendor(rawText),
  };
}
