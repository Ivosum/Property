// TEMPORÄRE Vorschau-Seite zum Prüfen der Handy-Darstellung (öffentlich, kein Login).
// Zeigt die typischen UI-Bausteine der Verwaltung mit Beispieldaten.
// Nach dem Review wieder entfernen.
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, CreditCard, Clock, AlertTriangle, Home, Building2, Users } from "lucide-react";

const fmt = (n: number) => new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF", maximumFractionDigits: 0 }).format(n);

export default function MobileCheck() {
  const stats = [
    { icon: Building2, value: "2", label: "Liegenschaften" },
    { icon: Home, value: "47", label: "Einheiten" },
    { icon: Users, value: "19", label: "Mieter" },
    { icon: DollarSign, value: fmt(1284500), label: "Gesamtvolumen" },
    { icon: CreditCard, value: fmt(982300), label: "Bezahlt" },
  ];
  const fin = [
    { icon: DollarSign, value: fmt(1284500), label: "Gesamtvolumen" },
    { icon: CreditCard, value: fmt(982300), label: "Bezahlte Mieten" },
    { icon: Clock, value: fmt(302200), label: "Ausstehend" },
    { icon: AlertTriangle, value: fmt(45800), label: "Überfällig" },
  ];
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-8">
      <h1 className="font-display text-2xl sm:text-3xl font-bold">Handy-Check</h1>

      <section>
        <h2 className="font-semibold mb-3">Dashboard-Kennzahlen (2 Spalten mobil)</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 sm:p-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                  <s.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <p className="text-xl sm:text-2xl font-bold break-words">{s.value}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-3">Finanzen-Kennzahlen (volle Breite mobil)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
          {fin.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-2"><s.icon className="w-5 h-5 text-primary" /></div>
                <p className="text-xl sm:text-2xl font-bold break-words">{s.value}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-3">Listeneintrag (z.B. Mieter / Mängel)</h2>
        <div className="space-y-2">
          {["Karolina Czajka · 3.OG links", "Hans Müller · EG rechts"].map((t) => (
            <Card key={t}><CardContent className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{t}</p>
                <p className="text-xs text-muted-foreground truncate">Hintere Bergstrasse 1, 5734 Reinach</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 shrink-0">Vermietet</span>
            </CardContent></Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-3">Buttons & Eingaben</h2>
        <Card><CardHeader><CardTitle className="text-base">Formular</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <input className="w-full h-10 rounded-md border px-3 text-sm" placeholder="Beispiel-Eingabefeld" />
            <div className="flex flex-wrap gap-2">
              <Button>Speichern</Button>
              <Button variant="outline">Abbrechen</Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
