import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  getAccounts, getJournal, computeBalances, computeIncomeStatement, formatCHF,
} from "@/lib/accounting";
import { getOpenItems } from "@/lib/openItems";
import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import FeatureGate from "@/components/property-management/FeatureGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Loader2, ChevronRight, Layers } from "lucide-react";

interface PropRow {
  id: string;
  name: string;
  city: string;
  income: number;
  expense: number;
  result: number;
  open: number;      // offene Posten
  overdue: number;   // davon überfällig
}

const Accounting = () => {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["accounting-overview"],
    queryFn: async () => {
      const [{ data: props, error }, openData] = await Promise.all([
        supabase.from("pm_properties").select("id, name, city").order("name"),
        getOpenItems(),
      ]);
      if (error) throw error;

      // offene Posten je Liegenschaft summieren
      const openByProp = new Map<string, { open: number; overdue: number }>();
      openData.debtors.forEach((d) => {
        if (!d.propertyId) return;
        const cur = openByProp.get(d.propertyId) ?? { open: 0, overdue: 0 };
        cur.open += d.total;
        cur.overdue += d.d30 + d.d60 + d.d90;
        openByProp.set(d.propertyId, cur);
      });

      const rows: PropRow[] = [];
      for (const p of props ?? []) {
        const o = openByProp.get(p.id) ?? { open: 0, overdue: 0 };
        try {
          const [accounts, entries] = await Promise.all([getAccounts(p.id), getJournal(p.id)]);
          const inc = computeIncomeStatement(computeBalances(accounts, entries));
          rows.push({ id: p.id, name: p.name, city: p.city, income: inc.income, expense: inc.expense, result: inc.result, open: o.open, overdue: o.overdue });
        } catch {
          rows.push({ id: p.id, name: p.name, city: p.city, income: 0, expense: 0, result: 0, open: o.open, overdue: o.overdue });
        }
      }
      return { rows, summary: openData.summary };
    },
  });

  const list = data?.rows ?? [];
  const totalIncome = list.reduce((s, r) => s + r.income, 0);
  const totalExpense = list.reduce((s, r) => s + r.expense, 0);
  const totalResult = totalIncome - totalExpense;
  const totalOpen = data?.summary.total ?? 0;
  const totalOverdue = (data?.summary.d30 ?? 0) + (data?.summary.d60 ?? 0) + (data?.summary.d90 ?? 0);

  return (
    <PropertyManagementLayout>
      <FeatureGate feature="accounting">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Buchhaltung</h1>
          <p className="text-muted-foreground mt-1">Separate Buchhaltung je Liegenschaft</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/property-management/accounting/consolidated")}>
          <Layers className="w-4 h-4 mr-2" /> Zusammenführen
        </Button>
      </div>

      {/* Kennzahlen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Kpi label="Ertrag" value={isLoading ? null : totalIncome} tone="pos" />
        <Kpi label="Aufwand" value={isLoading ? null : totalExpense} tone="neg" />
        <Kpi label="Ergebnis" value={isLoading ? null : totalResult} tone="result" big />
        <Kpi label="Offene Posten" value={isLoading ? null : totalOpen} tone="open" sub={totalOverdue > 0 ? `${formatCHF(totalOverdue)} überfällig` : "nichts überfällig"} />
      </div>

      {/* Liegenschaften */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">Liegenschaften</h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Buchhaltungen werden geladen...
          </div>
        ) : list.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Building2 className="w-10 h-10 mb-3 opacity-40" />
            <p className="font-medium text-foreground">Noch keine Liegenschaften</p>
            <p className="text-sm mt-1">Legen Sie eine Liegenschaft an – der Kontenplan wird automatisch erstellt.</p>
          </CardContent></Card>
        ) : (
          <div className="rounded-xl border bg-card divide-y overflow-hidden">
            {list.map((r) => (
              <button
                key={r.id}
                onClick={() => navigate(`/property-management/accounting/${r.id}`)}
                className="w-full grid grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-4 text-left hover:bg-muted/40 transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{r.city}</p>
                  <div className="flex items-center gap-4 mt-1.5 text-xs">
                    <span className="text-muted-foreground">Ertrag <span className="text-emerald-600 font-medium tabular-nums">{formatCHF(r.income)}</span></span>
                    <span className="text-muted-foreground hidden sm:inline">Aufwand <span className="text-rose-600 font-medium tabular-nums">{formatCHF(r.expense)}</span></span>
                    {r.overdue > 0 && (
                      <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> {formatCHF(r.overdue)} überfällig
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Ergebnis</p>
                    <p className={`font-semibold tabular-nums ${r.result >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{formatCHF(r.result)}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      </FeatureGate>
    </PropertyManagementLayout>
  );
};

const Kpi = ({ label, value, tone, sub, big }: {
  label: string; value: number | null; tone: "pos" | "neg" | "result" | "open"; sub?: string; big?: boolean;
}) => {
  const color =
    tone === "pos" ? "text-emerald-600" :
    tone === "neg" ? "text-rose-600" :
    tone === "open" ? "text-amber-600" :
    (value ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600";
  const accent =
    tone === "pos" ? "bg-emerald-400" :
    tone === "neg" ? "bg-rose-400" :
    tone === "open" ? "bg-amber-400" : "bg-primary";
  return (
    <div className={`relative rounded-xl border bg-card p-5 overflow-hidden ${big ? "ring-1 ring-primary/15" : ""}`}>
      <span className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 font-bold tabular-nums ${big ? "text-3xl" : "text-2xl"} ${color}`}>
        {value == null ? "–" : formatCHF(value)}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
};

export default Accounting;
