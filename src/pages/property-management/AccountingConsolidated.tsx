import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  getAccounts, getJournal, computeBalances, computeIncomeStatement, formatCHF,
} from "@/lib/accounting";
import { buildConsolidatedReport, type ReportPropertyLine } from "@/lib/accountingReport";
import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Loader2, FileDown, Layers } from "lucide-react";
import { toast } from "sonner";

interface PropData {
  id: string;
  name: string;
  city: string;
}

const AccountingConsolidated = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [from, setFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [computing, setComputing] = useState(false);
  const [rows, setRows] = useState<ReportPropertyLine[] | null>(null);
  const [generating, setGenerating] = useState(false);

  const { data: properties, isLoading } = useQuery({
    queryKey: ["consolidated-properties"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pm_properties").select("id, name, city").order("name");
      if (error) throw error;
      return (data ?? []) as PropData[];
    },
  });

  const props = properties ?? [];

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setRows(null);
  };

  const toggleAll = () => {
    setSelected((prev) => (prev.size === props.length ? new Set() : new Set(props.map((p) => p.id))));
    setRows(null);
  };

  const compute = async () => {
    if (selected.size === 0) return toast.error("Bitte mindestens eine Liegenschaft wählen.");
    setComputing(true);
    try {
      const result: ReportPropertyLine[] = [];
      for (const p of props.filter((x) => selected.has(x.id))) {
        const [accounts, entries] = await Promise.all([
          getAccounts(p.id),
          getJournal(p.id, { from, to }),
        ]);
        const balances = computeBalances(accounts, entries);
        const inc = computeIncomeStatement(balances);
        result.push({ name: p.name, city: p.city, income: inc.income, expense: inc.expense, result: inc.result });
      }
      setRows(result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fehler bei der Berechnung");
    } finally {
      setComputing(false);
    }
  };

  const periodLabel = `${new Date(from).toLocaleDateString("de-CH")} – ${new Date(to).toLocaleDateString("de-CH")}`;

  const exportPdf = async () => {
    if (!rows || rows.length === 0) return;
    setGenerating(true);
    try {
      const blob = await buildConsolidatedReport({
        title: `${rows.length} Liegenschaft${rows.length > 1 ? "en" : ""}`,
        periodLabel,
        properties: rows,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Buchhaltung_konsolidiert_${from}_${to}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("PDF erstellt");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fehler beim PDF-Export");
    } finally {
      setGenerating(false);
    }
  };

  const totals = rows
    ? rows.reduce((t, r) => ({ income: t.income + r.income, expense: t.expense + r.expense, result: t.result + r.result }), { income: 0, expense: 0, result: 0 })
    : null;

  return (
    <PropertyManagementLayout>
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/property-management/accounting")} className="mb-3 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> Zur Übersicht
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-primary/10 rounded-lg flex items-center justify-center">
            <Layers className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Liegenschaften zusammenführen</h1>
            <p className="text-sm text-muted-foreground">Konsolidierte Buchhaltung für den Auftraggeber</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Auswahl */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-lg">Auswahl</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Von</Label>
                <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setRows(null); }} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Bis</Label>
                <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setRows(null); }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Liegenschaften</Label>
                {props.length > 0 && (
                  <button className="text-xs text-primary" onClick={toggleAll}>
                    {selected.size === props.length ? "Keine" : "Alle"}
                  </button>
                )}
              </div>
              {isLoading ? (
                <div className="flex items-center py-4 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Lädt...
                </div>
              ) : props.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Keine Liegenschaften vorhanden.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {props.map((p) => (
                    <label key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/40 cursor-pointer">
                      <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.city}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <Button className="w-full" onClick={compute} disabled={computing || selected.size === 0}>
              {computing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Zusammenführen
            </Button>
          </CardContent>
        </Card>

        {/* Ergebnis */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Konsolidierte Ansicht</CardTitle>
            {rows && rows.length > 0 && (
              <Button variant="outline" size="sm" onClick={exportPdf} disabled={generating}>
                {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
                PDF für Auftraggeber
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!rows ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <Layers className="w-10 h-10 mb-3 opacity-40" />
                <p>Wählen Sie Liegenschaften und Zeitraum, dann „Zusammenführen".</p>
              </div>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Keine Daten im gewählten Zeitraum.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 px-3 font-medium">Liegenschaft</th>
                      <th className="text-right py-2 px-3 font-medium">Ertrag</th>
                      <th className="text-right py-2 px-3 font-medium">Aufwand</th>
                      <th className="text-right py-2 px-3 font-medium">Ergebnis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-b">
                        <td className="py-3 px-3">
                          <p className="font-medium">{r.name}</p>
                          <p className="text-xs text-muted-foreground">{r.city}</p>
                        </td>
                        <td className="py-3 px-3 text-right text-green-600">{formatCHF(r.income)}</td>
                        <td className="py-3 px-3 text-right text-destructive">{formatCHF(r.expense)}</td>
                        <td className={`py-3 px-3 text-right font-semibold ${r.result >= 0 ? "text-green-600" : "text-destructive"}`}>
                          {formatCHF(r.result)}
                        </td>
                      </tr>
                    ))}
                    {totals && (
                      <tr className="border-t-2 border-foreground/20 font-bold">
                        <td className="py-3 px-3">Total</td>
                        <td className="py-3 px-3 text-right text-green-600">{formatCHF(totals.income)}</td>
                        <td className="py-3 px-3 text-right text-destructive">{formatCHF(totals.expense)}</td>
                        <td className={`py-3 px-3 text-right ${totals.result >= 0 ? "text-green-600" : "text-destructive"}`}>
                          {formatCHF(totals.result)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <p className="text-xs text-muted-foreground mt-4">Zeitraum: {periodLabel}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PropertyManagementLayout>
  );
};

export default AccountingConsolidated;
