// camt.053 / camt.054 (ISO 20022) Parser für den Zahlungsabgleich.
// Liest Gutschriften (CRDT) aus einem Schweizer Bank-Kontoauszug und
// extrahiert Betrag, Datum, QR-/ESR-Referenz und Auftraggeber.
//
// Unterstützt camt.053 (Kontoauszug) und camt.054 (Sammelbuchung/Avis).
// Robust gegen Namespace-Präfixe: wir suchen per localName.

export interface CamtEntry {
  amount: number;
  currency: string;
  creditDebit: "CRDT" | "DBIT";
  bookingDate: string | null;   // YYYY-MM-DD
  valueDate: string | null;
  reference: string | null;     // QR-Referenz / ESR (Ziffern, ohne Leerzeichen)
  debtorName: string | null;
  debtorIban: string | null;
  remittanceInfo: string | null;
}

export interface CamtStatement {
  iban: string | null;
  currency: string | null;
  periodFrom: string | null;
  periodTo: string | null;
  format: string;               // camt.053 | camt.054
  entries: CamtEntry[];
}

// --- DOM-Helfer (namespace-agnostisch über localName) ---
function kids(el: Element, local: string): Element[] {
  const out: Element[] = [];
  for (const c of Array.from(el.children)) {
    if (c.localName === local) out.push(c);
  }
  return out;
}
// erste Nachkommen-Element mit localName (Tiefensuche)
function firstDeep(el: Element, local: string): Element | null {
  const direct = kids(el, local);
  if (direct.length) return direct[0];
  for (const c of Array.from(el.children)) {
    const found = firstDeep(c, local);
    if (found) return found;
  }
  return null;
}
function allDeep(el: Element, local: string): Element[] {
  const out: Element[] = [];
  const walk = (node: Element) => {
    for (const c of Array.from(node.children)) {
      if (c.localName === local) out.push(c);
      walk(c);
    }
  };
  walk(el);
  return out;
}
function textOf(el: Element | null): string | null {
  const t = el?.textContent?.trim();
  return t ? t : null;
}
function dateOf(el: Element | null): string | null {
  // <Dt>2026-11-01</Dt> oder <DtTm>2026-11-01T..</DtTm>
  if (!el) return null;
  const dt = firstDeep(el, "Dt") ?? firstDeep(el, "DtTm");
  const raw = textOf(dt) ?? textOf(el);
  if (!raw) return null;
  return raw.slice(0, 10);
}

function parseEntry(ntry: Element): CamtEntry {
  const amtEl = kids(ntry, "Amt")[0] ?? firstDeep(ntry, "Amt");
  const amount = Number(textOf(amtEl) ?? "0");
  const currency = amtEl?.getAttribute("Ccy") ?? "CHF";
  const cd = (textOf(firstDeep(ntry, "CdtDbtInd")) ?? "CRDT") as "CRDT" | "DBIT";

  const bookingDate = dateOf(kids(ntry, "BookgDt")[0] ?? null);
  const valueDate = dateOf(kids(ntry, "ValDt")[0] ?? null);

  // Referenz: bevorzugt strukturierte Referenz (QR/ESR),
  // CdtrRefInf/Ref, sonst AcctSvcrRef / RmtInf/Ustrd.
  let reference: string | null = null;
  const refInf = firstDeep(ntry, "CdtrRefInf");
  if (refInf) reference = textOf(firstDeep(refInf, "Ref"));
  if (!reference) {
    const strd = firstDeep(ntry, "Strd");
    if (strd) reference = textOf(firstDeep(strd, "Ref"));
  }
  // nur Ziffern behalten, wenn es wie eine QR/ESR-Referenz aussieht
  if (reference) {
    const digits = reference.replace(/\s+/g, "");
    reference = digits;
  }

  // Auftraggeber (bei Gutschrift: Dbtr)
  const dbtr = firstDeep(ntry, "Dbtr");
  const debtorName = dbtr ? textOf(firstDeep(dbtr, "Nm")) : null;
  const dbtrAcct = firstDeep(ntry, "DbtrAcct");
  const debtorIban = dbtrAcct ? textOf(firstDeep(dbtrAcct, "IBAN")) : null;

  // unstrukturierte Mitteilung
  const ustrd = firstDeep(ntry, "Ustrd");
  const remittanceInfo = textOf(ustrd);

  return {
    amount, currency, creditDebit: cd,
    bookingDate, valueDate, reference, debtorName, debtorIban, remittanceInfo,
  };
}

export function parseCamt(xmlText: string): CamtStatement {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  const err = doc.querySelector("parsererror");
  if (err) throw new Error("Ungültige XML-Datei");

  const root = doc.documentElement;
  const format = root.localName === "BkToCstmrStmt" || allDeep(root, "Stmt").length ? "camt.053"
    : root.localName === "BkToCstmrDbtCdtNtfctn" || allDeep(root, "Ntfctn").length ? "camt.054"
    : "camt";

  // Statement- bzw. Notification-Container
  const container = firstDeep(root, "Stmt") ?? firstDeep(root, "Ntfctn") ?? root;

  const acct = firstDeep(container, "Acct");
  const iban = acct ? textOf(firstDeep(acct, "IBAN")) : null;
  const currency = acct ? textOf(firstDeep(acct, "Ccy")) : null;

  const period = firstDeep(container, "FrToDt");
  const periodFrom = period ? dateOf(firstDeep(period, "FrDtTm") ?? firstDeep(period, "FrDt")) : null;
  const periodTo = period ? dateOf(firstDeep(period, "ToDtTm") ?? firstDeep(period, "ToDt")) : null;

  const entries = allDeep(container, "Ntry").map(parseEntry);

  return { iban, currency, periodFrom, periodTo, format, entries };
}

// Normalisiert eine Referenz für den Vergleich (nur Ziffern).
export function normalizeRef(ref: string | null | undefined): string {
  return (ref ?? "").replace(/\D+/g, "");
}
