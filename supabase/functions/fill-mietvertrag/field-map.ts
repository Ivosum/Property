// Feld-Mapping für das mietrechtspraxis-Mietvertragsformular (Ausgabe 2019).
// Die Feldnamen ("Textfeld N") stammen aus dem Original-PDF (AcroForm).
// Zuordnung wurde über die Feldpositionen zu den Formular-Labels ermittelt.
//
// Schlüssel = logischer Datenname, Wert = PDF-Feldname.
// Nur die Felder, die sinnvoll aus der Datenbank befüllt werden können,
// sind hier gemappt. Alle übrigen Formularfelder bleiben im PDF leer und
// können weiterhin von Hand ausgefüllt werden.

export const MIETVERTRAG_FIELDS = {
  vermieter: "Textfeld 71",            // 1.1 VermieterIn (Zeile 1)
  vermieterZeile2: "Textfeld 72",      // 1.1 VermieterIn (Zeile 2)
  vertretenDurch: "Textfeld 75",       // 1.1 Vertreten durch
  mieter: "Textfeld 77",               // 1.2 MieterIn(nen) Zeile 1
  mieterZeile2: "Textfeld 73",         // 1.2 MieterIn(nen) Zeile 2
  mieterZeile3: "Textfeld 78",         // 1.2 MieterIn(nen) Zeile 3
  zimmerAnzahl: "Textfeld 80",         // 2.1 Anzahl Zimmer
  objektAdresse: "Textfeld 79",        // 2.1 Ort, Strasse, Stockwerk
  mietbeginn: "Textfeld 115",          // 3.1 Mietbeginn (Datum/Zeitpunkt)
  nettoWohnung: "Textfeld 93",         // 4.1 Netto-Mietzins Wohnung
  nettoGarage: "Textfeld 94",          // 4.1 Netto-Mietzins Garage/Abstellplatz
  nettoWeitere1: "Textfeld 95",        // 4.1 weitere Zeile
  nettoWeitere2: "Textfeld 96",        // 4.1 weitere Zeile
  nkHeizung: "Textfeld 97",            // 4.2 Heizungs-/Warmwasserkosten (akonto)
  nkWasser: "Textfeld 98",             // 4.2 Wasser-/Abwasserkosten (akonto)
  nkRadioTv: "Textfeld 99",            // 4.2 Radio/TV (akonto)
  nkHauswartung: "Textfeld 100",       // 4.2 Hauswartung (akonto)
  kaution: "Textfeld 87",              // 5.1 Kaution Betrag
} as const;

export type MietvertragFieldKey = keyof typeof MIETVERTRAG_FIELDS;
