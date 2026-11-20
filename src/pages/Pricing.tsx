import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Building2, ArrowLeft, Loader2 } from "lucide-react";
import { getPlans } from "@/lib/plan";
import { PlanCards } from "@/pages/property-management/Subscription";

const Pricing = () => {
  const [units, setUnits] = useState(80);
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");

  const { data: plans, isLoading } = useQuery({ queryKey: ["public-plans"], queryFn: getPlans });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold">Property Network</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/"><ArrowLeft className="w-4 h-4 mr-1" /> Zur Startseite</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-14">
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="font-display text-4xl font-bold tracking-tight">Preise für Ihre Verwaltung</h1>
          <p className="text-muted-foreground mt-3 text-lg">
            Faire Abrechnung: eine kleine Grundgebühr plus einen Betrag je Verwaltungseinheit. Keine versteckten Kosten, monatlich kündbar.
          </p>
        </div>

        {/* Einheiten-Rechner */}
        <div className="max-w-xl mx-auto mt-10 rounded-2xl border bg-card p-6">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-sm text-muted-foreground">Ihre Verwaltungseinheiten</p>
              <p className="text-3xl font-bold tabular-nums">{units}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPeriod("monthly")} className={`text-sm px-3 py-1.5 rounded-full border ${period === "monthly" ? "bg-primary text-primary-foreground border-primary" : ""}`}>Monatlich</button>
              <button onClick={() => setPeriod("yearly")} className={`text-sm px-3 py-1.5 rounded-full border ${period === "yearly" ? "bg-primary text-primary-foreground border-primary" : ""}`}>Jährlich</button>
            </div>
          </div>
          <input
            type="range" min={5} max={1000} step={5} value={units}
            onChange={(e) => setUnits(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>5</span><span>1000+</span>
          </div>
        </div>

        {/* Pläne */}
        <div className="mt-12">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Lädt...</div>
          ) : (
            <PlanCards plans={plans ?? []} units={units} period={period} />
          )}
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground">Bereit loszulegen? Starten Sie mit 30 Tagen kostenlos.</p>
          <Button className="mt-4" asChild><Link to="/auth">Jetzt kostenlos testen</Link></Button>
        </div>
      </main>
    </div>
  );
};

export default Pricing;
