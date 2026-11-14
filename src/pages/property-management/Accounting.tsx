import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  getAccounts, getJournal, computeBalances, computeIncomeStatement, formatCHF,
} from "@/lib/accounting";
import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Loader2, ChevronRight, Layers, TrendingUp, TrendingDown } from "lucide-react";

interface PropRow {
  id: string;
  name: string;
  city: string;
  income: number;
  expense: number;
  result: number;
}

const Accounting = () => {
  const navigate = useNavigate();

  const { data: rows, isLoading } = useQuery({
    queryKey: ["accounting-overview"],
    queryFn: async () => {
      const { data: props, error } = await supabase
        .from("pm_properties")
        .select("id, name, city")
        .order("name");
      if (error) throw error;

      const result: PropRow[] = [];
      for (const p of props ?? []) {
        const [accounts, entries] = await Promise.all([getAccounts(p.id), getJournal(p.id)]);
        const balances = computeBalances(accounts, entries);
        const inc = computeIncomeStatement(balances);
        result.push({
          id: p.id,
          name: p.name,
          city: p.city,
          income: inc.income,
          expense: inc.expense,
          result: inc.result,
        });
      }
      return result;
    },
  });

  const list = rows ?? [];
  const totalIncome = list.reduce((s, r) => s + r.income, 0);
  const totalExpense = list.reduce((s, r) => s + r.expense, 0);
  const totalResult = totalIncome - totalExpense;

  return (
    <PropertyManagementLayout>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Buchhaltung</h1>
          <p className="text-muted-foreground mt-1">Separate Buchhaltung je Liegenschaft</p>
        </div>
        <Button onClick={() => navigate("/property-management/accounting/consolidated")}>
          <Layers className="w-4 h-4 mr-2" />
          Liegenschaften zusammenführen
        </Button>
      </div>

      {/* Gesamtkennzahlen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold">{isLoading ? "–" : formatCHF(totalIncome)}</p>
            <p className="text-sm text-muted-foreground">Ertrag gesamt</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingDown className="w-5 h-5 text-destructive" />
            </div>
            <p className="text-2xl font-bold">{isLoading ? "–" : formatCHF(totalExpense)}</p>
            <p className="text-sm text-muted-foreground">Aufwand gesamt</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-6">
            <p className={`text-2xl font-bold ${totalResult >= 0 ? "text-green-600" : "text-destructive"}`}>
              {isLoading ? "–" : formatCHF(totalResult)}
            </p>
            <p className="text-sm text-muted-foreground">Ergebnis gesamt</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liegenschaften</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Buchhaltungen werden geladen...
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Building2 className="w-10 h-10 mb-3 opacity-40" />
              <p>Noch keine Liegenschaften.</p>
              <p className="text-sm mt-1">Legen Sie zuerst eine Liegenschaft an – der Kontenplan wird automatisch erstellt.</p>
            </div>
          ) : (
            <div className="divide-y">
              {list.map((r) => (
                <button
                  key={r.id}
                  onClick={() => navigate(`/property-management/accounting/${r.id}`)}
                  className="w-full flex items-center justify-between py-4 px-2 text-left hover:bg-secondary/30 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{r.name}</p>
                      <p className="text-sm text-muted-foreground">{r.city}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-muted-foreground">Ertrag</p>
                      <p className="font-medium text-green-600">{formatCHF(r.income)}</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-muted-foreground">Aufwand</p>
                      <p className="font-medium text-destructive">{formatCHF(r.expense)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Ergebnis</p>
                      <p className={`font-semibold ${r.result >= 0 ? "text-green-600" : "text-destructive"}`}>
                        {formatCHF(r.result)}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PropertyManagementLayout>
  );
};

export default Accounting;
