import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import { Button } from "@/components/ui/button";
import {
  Check, Minus, Loader2, Sparkles, Info,
} from "lucide-react";
import { toast } from "sonner";
import {
  getPlans, getSubscription, getUnitCount, setPlan, monthlyPrice, trialDaysLeft,
  FEATURE_LABELS, type Plan,
} from "@/lib/plan";

const formatCHF = (n: number) =>
  new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF", maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);

const Subscription = () => {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const [switching, setSwitching] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["subscription-page"],
    queryFn: async () => {
      const [plans, sub, units] = await Promise.all([getPlans(), getSubscription(), getUnitCount()]);
      return { plans, sub, units };
    },
  });

  const plans = data?.plans ?? [];
  const sub = data?.sub ?? null;
  const units = data?.units ?? 0;
  const currentPlan = plans.find((p) => p.code === sub?.plan_code) ?? null;
  const trial = trialDaysLeft(sub);

  const choose = async (code: string) => {
    setSwitching(code);
    try {
      await setPlan(code, period);
      toast.success("Plan geändert");
      queryClient.invalidateQueries({ queryKey: ["subscription-page"] });
      queryClient.invalidateQueries({ queryKey: ["pm-subscription"] });
    } catch (e) {
      toast.error("Konnte nicht geändert werden. " + (e instanceof Error ? e.message : ""));
    } finally {
      setSwitching(null);
    }
  };

  return (
    <PropertyManagementLayout>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Abo & Pläne</h1>
        <p className="text-muted-foreground mt-1">Grundgebühr pro Monat plus ein kleiner Betrag je Verwaltungseinheit – zahlen Sie nur, was Sie nutzen</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Lädt...</div>
      ) : (
        <>
          {/* Aktueller Stand */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl border bg-card p-5">
              <p className="text-xs text-muted-foreground">Aktueller Plan</p>
              <p className="text-2xl font-bold mt-1">{currentPlan?.name ?? "–"}</p>
              {trial != null && <p className="text-xs text-amber-600 mt-1">Testphase – noch {trial} Tage</p>}
            </div>
            <div className="rounded-xl border bg-card p-5">
              <p className="text-xs text-muted-foreground">Verwaltungseinheiten</p>
              <p className="text-2xl font-bold mt-1 tabular-nums">{units}</p>
              <p className="text-xs text-muted-foreground mt-1">Wohnungen & Gewerbe</p>
            </div>
            <div className="rounded-xl border bg-card p-5 ring-1 ring-primary/15">
              <p className="text-xs text-muted-foreground">Kosten / Monat</p>
              <p className="text-2xl font-bold mt-1 tabular-nums text-primary">{currentPlan ? formatCHF(monthlyPrice(currentPlan, units, sub?.billing_period === "yearly" ? "yearly" : "monthly")) : "–"}</p>
              <p className="text-xs text-muted-foreground mt-1">{sub?.billing_period === "yearly" ? "jährliche Abrechnung" : "monatliche Abrechnung"}</p>
            </div>
          </div>

          {/* Abrechnungsperiode */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <button onClick={() => setPeriod("monthly")} className={`text-sm px-4 py-1.5 rounded-full border transition-colors ${period === "monthly" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-secondary/50"}`}>Monatlich</button>
            <button onClick={() => setPeriod("yearly")} className={`text-sm px-4 py-1.5 rounded-full border transition-colors ${period === "yearly" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-secondary/50"}`}>
              Jährlich <span className="text-xs opacity-80">· 2 Monate gratis</span>
            </button>
          </div>

          {/* Pläne */}
          <PlanCards plans={plans} units={units} period={period} currentCode={sub?.plan_code} onChoose={choose} switching={switching} />

          <p className="text-xs text-muted-foreground mt-6 flex items-center gap-1.5 justify-center">
            <Info className="w-3.5 h-3.5" /> Preis richtet sich nach Ihren aktuellen {units} Einheiten. Die Bezahlung wird separat eingerichtet – hier wählen Sie vorerst nur den Plan.
          </p>
        </>
      )}
    </PropertyManagementLayout>
  );
};

// Wiederverwendbare Plan-Karten (auch für die öffentliche Preis-Seite)
export const PlanCards = ({ plans, units, period, currentCode, onChoose, switching }: {
  plans: Plan[]; units: number; period: "monthly" | "yearly";
  currentCode?: string; onChoose?: (code: string) => void; switching?: string | null;
}) => {
  const sorted = useMemo(() => [...plans].sort((a, b) => a.sort_order - b.sort_order), [plans]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
      {sorted.map((p) => {
        const price = monthlyPrice(p, units, period);
        const isCurrent = p.code === currentCode;
        return (
          <div key={p.code} className={`relative rounded-2xl border bg-card p-6 flex flex-col ${p.highlight ? "ring-2 ring-primary shadow-lg lg:-mt-2" : ""}`}>
            {p.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-medium bg-primary text-primary-foreground px-3 py-1 rounded-full">Beliebt</span>
            )}
            <p className="font-display text-lg font-bold">{p.name}</p>
            <div className="mt-3">
              <span className="text-3xl font-bold tabular-nums">{formatCHF(price)}</span>
              <span className="text-sm text-muted-foreground">/Monat</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {p.base_fee > 0 ? `${formatCHF(p.base_fee)} Grundgebühr + ` : ""}{formatCHF(p.price_per_unit)}/Einheit
              {p.included_units != null ? ` · bis ${p.included_units} Einheiten` : " · unbegrenzt"}
            </p>

            {onChoose && (
              <Button
                className="mt-4 w-full"
                variant={p.highlight ? "default" : "outline"}
                disabled={isCurrent || switching === p.code}
                onClick={() => onChoose(p.code)}
              >
                {switching === p.code ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : isCurrent ? <Check className="w-4 h-4 mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {isCurrent ? "Aktueller Plan" : "Diesen Plan wählen"}
              </Button>
            )}

            <ul className="mt-5 space-y-2.5 text-sm">
              {FEATURE_LABELS.map((f) => {
                const on = p.features?.[f.key] === true;
                return (
                  <li key={f.key} className={`flex items-start gap-2 ${on ? "" : "text-muted-foreground/60"}`}>
                    {on ? <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> : <Minus className="w-4 h-4 mt-0.5 shrink-0 opacity-50" />}
                    <span>{f.label}</span>
                  </li>
                );
              })}
              <li className="flex items-start gap-2 text-muted-foreground pt-1">
                <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>{p.max_users == null ? "Unbegrenzt Teammitglieder" : `${p.max_users} Teammitglied${p.max_users > 1 ? "er" : ""}`}</span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>{p.features?.support === "personal" ? "Persönlicher Support" : p.features?.support === "priority" ? "Prioritäts-Support" : "E-Mail-Support"}</span>
              </li>
            </ul>
          </div>
        );
      })}
    </div>
  );
};

export default Subscription;
