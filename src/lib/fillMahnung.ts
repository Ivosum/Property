// Erzeugt eine Mahnung / Zahlungserinnerung als A4-PDF (pdf-lib, ohne Vorlage).
// Stufen:
//   1 = 1. Zahlungserinnerung (freundlich)
//   2 = 2. Zahlungserinnerung (bestimmt)
//   3 = Mahnung mit Kündigungsandrohung nach Art. 257d OR (30 Tage Frist)
//   4 = Betreibungsandrohung
// Absender = Eigentümer/Verwaltung der Liegenschaft (pm_owners), Empfänger =
// Mieter an der Adresse des Mietobjekts. Legt das PDF in pm-documents ab,
// verknüpft es mit der pm_reminders-Zeile und gibt es als Blob zurück.

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { supabase } from "@/integrations/supabase/client";
import { getReminderSettings } from "./pmData";

const sb = supabase as any;

const chf = (n: number | null | undefined) =>
  new Intl.NumberFormat("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n ?? 0));
const dateCH = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("de-CH") : "");

export interface MahnungResult {
  blob: Blob;
  fileName: string;
  stored: boolean;
  reminderId: string | null;
}

interface StageText {
  betreff: string;
  anrede_intro: string;
  schluss: string;
}

function stageText(stage: number, obj: string, frist: string, kuendFristTage: number): StageText {
  switch (stage) {
    case 1:
      return {
        betreff: "1. Zahlungserinnerung",
        anrede_intro:
          `bei der Durchsicht unserer Unterlagen haben wir festgestellt, dass der nachstehende Mietzins ` +
          `für das Mietobjekt ${obj} noch offen ist. Möglicherweise hat sich Ihre Zahlung mit diesem ` +
          `Schreiben überschnitten – in diesem Fall betrachten Sie es bitte als gegenstandslos.`,
        schluss:
          `Wir bitten Sie, den offenen Betrag bis spätestens ${frist} zu begleichen. ` +
          `Besten Dank für Ihre Bemühungen.`,
      };
    case 2:
      return {
        betreff: "2. Zahlungserinnerung",
        anrede_intro:
          `trotz unserer ersten Zahlungserinnerung ist der nachstehende Mietzins für das Mietobjekt ` +
          `${obj} bis heute nicht bei uns eingegangen.`,
        schluss:
          `Wir fordern Sie auf, den offenen Betrag inkl. Gebühren bis spätestens ${frist} zu begleichen. ` +
          `Sollte die Zahlung bis dahin ausbleiben, sehen wir uns gezwungen, weitere Schritte einzuleiten.`,
      };
    case 3:
      return {
        betreff: "Mahnung mit Kündigungsandrohung (Art. 257d OR)",
        anrede_intro:
          `trotz mehrfacher Erinnerung ist der nachstehende Mietzins für das Mietobjekt ${obj} weiterhin ` +
          `ausstehend. Gestützt auf Art. 257d des Obligationenrechts (OR) setzen wir Ihnen hiermit eine ` +
          `letzte Zahlungsfrist.`,
        schluss:
          `Wir setzen Ihnen eine Frist von ${kuendFristTage} Tagen, d.h. bis spätestens ${frist}, zur ` +
          `vollständigen Begleichung des offenen Betrags. Sollte die Zahlung nicht fristgerecht erfolgen, ` +
          `kündigen wir das Mietverhältnis gestützt auf Art. 257d OR mit einer Frist von 30 Tagen auf das ` +
          `Ende eines Monats. Zudem behalten wir uns die Einleitung der Betreibung vor.`,
      };
    default:
      return {
        betreff: "Betreibungsandrohung",
        anrede_intro:
          `der nachstehende Mietzins für das Mietobjekt ${obj} ist trotz Mahnung und Fristansetzung nach ` +
          `Art. 257d OR nicht beglichen worden.`,
        schluss:
          `Wir setzen Ihnen eine letzte Frist bis ${frist}. Nach unbenutztem Ablauf dieser Frist leiten wir ` +
          `ohne weitere Ankündigung die Betreibung ein. Die daraus entstehenden Kosten gehen zu Ihren Lasten.`,
      };
  }
}

/**
 * Erzeugt das Mahnungs-PDF für eine pm_reminders-Zeile.
 * (addReminder() hat Stufe/Gebühr/Frist bereits gesetzt.)
 */
export async function fillMahnung(reminderId: string): Promise<MahnungResult> {
  // Mahnung + zugehörige Daten laden
  const { data: rem } = await sb.from("pm_reminders").select("*").eq("id", reminderId).maybeSingle();
  if (!rem) throw new Error("Mahnung nicht gefunden");

  const { data: pay } = await sb.from("pm_payments").select("*").eq("id", rem.payment_id).maybeSingle();
  const { data: tenant } = await sb.from("pm_tenants").select("first_name, last_name").eq("id", rem.tenant_id).maybeSingle();

  // Liegenschaft + Einheit über Vertrag
  let property: any = null, unit: any = null, owner: any = null;
  if (pay?.contract_id) {
    const { data: c } = await sb.from("pm_contracts").select("unit_id").eq("id", pay.contract_id).maybeSingle();
    if (c?.unit_id) {
      const { data: u } = await sb.from("pm_units").select("unit_number, floor_label, property_id").eq("id", c.unit_id).maybeSingle();
      unit = u;
      if (u?.property_id) {
        const { data: p } = await sb.from("pm_properties").select("*").eq("id", u.property_id).maybeSingle();
        property = p;
        if (p?.owner_ref_id) {
          const { data: o } = await sb.from("pm_owners").select("*").eq("id", p.owner_ref_id).maybeSingle();
          owner = o;
        }
      }
    }
  }

  const settings = await getReminderSettings();
  const stage = Number(rem.stage);
  const unitLabel = unit ? [unit.floor_label, unit.unit_number].filter(Boolean).join(" ") : "";
  const propAddr = property ? `${property.address}, ${property.postal_code} ${property.city}` : "";
  const objekt = [unitLabel, propAddr].filter(Boolean).join(", ");
  const st = stageText(stage, objekt || "Mietobjekt", dateCH(rem.due_date), Number(settings.grace_days_terminate ?? 30));

  const tenantName = [tenant?.first_name, tenant?.last_name].filter(Boolean).join(" ") || "Mieter/in";

  // Absender: Eigentümer/Verwaltung
  const senderLines = [
    owner?.name || "Liegenschaftsverwaltung",
    owner?.address || "",
    [owner?.postal_code, owner?.city].filter(Boolean).join(" "),
    owner?.email || "",
  ].filter(Boolean);

  // --- PDF aufbauen ---
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { width } = page.getSize();
  const M = 56; // Rand
  let y = 800;
  const ink = rgb(0.1, 0.1, 0.12);
  const grey = rgb(0.45, 0.45, 0.5);

  const draw = (text: string, x: number, yy: number, f = font, size = 10, color = ink) =>
    page.drawText(text, { x, y: yy, size, font: f, color });

  // Zeilenumbruch
  const wrap = (text: string, f: any, size: number, maxW: number): string[] => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (f.widthOfTextAtSize(test, size) > maxW && line) { lines.push(line); line = w; }
      else line = test;
    }
    if (line) lines.push(line);
    return lines;
  };
  const paragraph = (text: string, size = 10, f = font, lh = 14) => {
    for (const ln of wrap(text, f, size, width - 2 * M)) { draw(ln, M, y, f, size); y -= lh; }
  };

  // Absender (klein, oben)
  senderLines.forEach((l, i) => draw(l, M, y - i * 11, font, 8.5, grey));
  y -= senderLines.length * 11 + 24;

  // Empfänger-Adressblock
  draw(tenantName, M, y, bold, 11); y -= 14;
  if (unitLabel) { draw(unitLabel, M, y); y -= 13; }
  if (property?.address) { draw(property.address, M, y); y -= 13; }
  if (property) { draw(`${property.postal_code} ${property.city}`, M, y); y -= 13; }

  // Ort/Datum rechts
  const place = owner?.city || property?.city || "";
  const dateLine = `${place ? place + ", den " : ""}${new Date().toLocaleDateString("de-CH")}`;
  draw(dateLine, width - M - font.widthOfTextAtSize(dateLine, 10), y + 13, font, 10, grey);

  y -= 28;

  // Betreff
  draw(st.betreff, M, y, bold, 13); y -= 24;

  // Anrede + Intro
  paragraph(`Sehr geehrte/r ${tenantName}`); y -= 6;
  paragraph(st.anrede_intro); y -= 10;

  // Betragstabelle
  const amount = Number(pay?.amount ?? 0);
  const feesPrev = Number(pay?.reminder_fees ?? 0) - Number(rem.fee ?? 0); // bereits aufgelaufen vor dieser Stufe
  const feeNow = Number(rem.fee ?? 0);
  const total = amount + Math.max(0, feesPrev) + feeNow;

  const rows: [string, number][] = [
    [`Ausstehender Mietzins${pay?.due_date ? ` (fällig ${dateCH(pay.due_date)})` : ""}`, amount],
  ];
  if (feesPrev > 0) rows.push(["Bereits angefallene Mahngebühren", feesPrev]);
  if (feeNow > 0) rows.push([`Mahngebühr ${st.betreff}`, feeNow]);

  const tableTop = y;
  const col2 = width - M - 90;
  page.drawRectangle({ x: M, y: tableTop - (rows.length * 18 + 26), width: width - 2 * M, height: rows.length * 18 + 26, borderColor: rgb(0.8, 0.8, 0.84), borderWidth: 0.8, color: rgb(0.98, 0.98, 0.99) });
  y -= 4;
  rows.forEach(([label, val]) => {
    draw(label, M + 10, y - 10);
    const vs = chf(val);
    draw(vs, col2 + 80 - font.widthOfTextAtSize(vs, 10), y - 10);
    y -= 18;
  });
  // Total-Linie
  page.drawLine({ start: { x: M + 10, y: y - 2 }, end: { x: width - M - 10, y: y - 2 }, thickness: 0.8, color: rgb(0.7, 0.7, 0.74) });
  draw("Total offen", M + 10, y - 16, bold, 10.5);
  const ts = "CHF " + chf(total);
  draw(ts, col2 + 80 - bold.widthOfTextAtSize(ts, 10.5), y - 16, bold, 10.5);
  y -= 34;

  // Schlusstext
  paragraph(st.schluss); y -= 10;

  // Einzahlungshinweis (IBAN/QR-IBAN der Liegenschaft, falls vorhanden)
  if (property?.id) {
    const { data: conn } = await sb.from("pm_bank_connections").select("iban, qr_iban, bank_name").eq("property_id", property.id).maybeSingle();
    const iban = conn?.qr_iban || conn?.iban;
    if (iban) {
      paragraph(`Bitte überweisen Sie den Betrag unter Angabe der Referenz auf: ${conn?.bank_name ? conn.bank_name + ", " : ""}IBAN ${iban}.`, 9.5, font, 13);
      y -= 6;
    }
  }

  y -= 6;
  paragraph("Freundliche Grüsse"); y -= 22;
  draw(owner?.name || "Die Verwaltung", M, y, font, 10);

  const bytes = await pdf.save();
  const blob = new Blob([bytes], { type: "application/pdf" });
  const slug = tenantName.replace(/[^a-zA-Z0-9]+/g, "_");
  const fileName = `${st.betreff.replace(/[^a-zA-Z0-9]+/g, "_")}_${slug}.pdf`;

  // Ablage
  let stored = false;
  try {
    const { data: authData } = await sb.auth.getUser();
    const uid = authData?.user?.id ?? null;
    const folder = rem.tenant_id ?? "allgemein";
    const storagePath = `${folder}/${fileName.replace(/\.pdf$/, "")}_${Date.now()}.pdf`;
    const { error: upErr } = await sb.storage.from("pm-documents")
      .upload(storagePath, blob, { contentType: "application/pdf", upsert: false });
    if (!upErr) {
      const { data: doc, error: insErr } = await sb.from("pm_documents").insert({
        name: fileName, document_type: "other", file_url: storagePath, file_size: bytes.byteLength,
        tenant_id: rem.tenant_id ?? null, property_id: property?.id ?? null, uploaded_by: uid,
      }).select("id").single();
      if (!insErr) {
        stored = true;
        // Dokument an die Mahnung hängen
        try { await sb.from("pm_reminders").update({ document_id: doc.id }).eq("id", reminderId); } catch { /* egal */ }
      }
    }
  } catch { /* Download klappt auch ohne Ablage */ }

  return { blob, fileName, stored, reminderId };
}
