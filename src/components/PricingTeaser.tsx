import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";
import { getPlans, monthlyPrice } from "@/lib/plan";

const formatCHF = (n: number) =>
  new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF", maximumFractionDigits: 0 }).format(n);

const PricingTeaser = () => {
  const [units, setUnits] = useState(80);
  const { data: plans, isLoading } = useQuery({ queryKey: ["teaser-plans"], queryFn: getPlans });

  const sorted = [...(plans ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <section className="py-20 bg-secondary/30">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-sm font-medium text-primary mb-2">Für Verwaltungen</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Was kostet das für mich?</h2>
          <p className="text-muted-foreground mt-3">
            Faire Abrechnung: eine kleine Grundgebühr plus einen Betrag je Verwaltungseinheit. Stellen Sie Ihre Portfoliogrösse ein.
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 md:p-8 shadow-sm">
          {/* Slider */}
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="text-sm text-muted-foreground">Ihre Verwaltungseinheiten</p>
              <p className="text-3xl font-bold tabular-nums">{units}</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/pricing">Alle Details <ArrowRight className="w-4 h-4 ml-1.5" /></Link>
            </Button>
          </div>
          <input
            type="range" min={5} max={1000} step={5} value={units}
            onChange={(e) => setUnits(Number(e.target.value))}
            className="w-full accent-primary"
            aria-label="Anzahl Verwaltungseinheiten"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1 mb-6">
            <span>5</span><span>1000+</span>
          </div>

          {/* Preise je Plan */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Lädt...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {sorted.map((p) => (
                <div key={p.code} className={`rounded-xl border p-4 text-center ${p.highlight ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "bg-background"}`}>
                  <p className="text-sm font-medium flex items-center justify-center gap-2">
                    {p.name}
                    {p.highlight && <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">Beliebt</span>}
                  </p>
                  <p className="text-2xl font-bold tabular-nums mt-1">{formatCHF(monthlyPrice(p, units, "monthly"))}</p>
                  <p className="text-xs text-muted-foreground">/Monat</p>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center mt-5">
            Richtpreis für {units} Einheiten · 30 Tage kostenlos testen · monatlich kündbar
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingTeaser;
