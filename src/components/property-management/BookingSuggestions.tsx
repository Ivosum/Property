import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Check, X, Sparkles, ArrowDownLeft, ArrowUpRight, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { formatCHF, type Account } from "@/lib/accounting";
import {
  getSuggestions, confirmSuggestion, rejectSuggestion, accountIdByCode,
} from "@/lib/bookingEngine";

interface Props {
  propertyId: string;
  accounts: Account[];
  onChanged: () => void;
}

const sourceLabel: Record<string, string> = {
  rule: "Gelernte Regel", heuristic: "Automatik", ai: "KI", fallback: "Unklar", manual: "Manuell",
};

const BookingSuggestions = ({ propertyId, accounts, onChanged }: Props) => {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  // lokale Konto-Overrides je Vorschlag (Code)
  const [override, setOverride] = useState<Record<string, string>>({});

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ["booking-suggestions", propertyId],
    queryFn: () => getSuggestions(propertyId, "pending"),
  });

  const list = suggestions ?? [];
  // nur Ertrag/Aufwand-Konten zur Auswahl
  const pickable = accounts.filter((a) => a.type === "income" || a.type === "expense");
  const codeById = new Map(accounts.map((a) => [a.id, a.code]));
  const nameByCode = new Map(accounts.map((a) => [a.code, `${a.code} ${a.name}`]));

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["booking-suggestions", propertyId] });
    onChanged();
  };

  const confirm = async (s: any) => {
    setBusy(s.id);
    try {
      const chosenCode = override[s.id] ?? codeById.get(s.suggested_account_id) ?? "";
      const accId = await accountIdByCode(propertyId, chosenCode);
      if (!accId) { toast.error("Konto nicht gefunden"); return; }
      const changed = chosenCode !== codeById.get(s.suggested_account_id);
      await confirmSuggestion(s.id, accId, changed && s.counterparty ? {
        propertyId, matchField: "counterparty",
        pattern: String(s.counterparty).toLowerCase().slice(0, 40),
        direction: s.direction, accountCode: chosenCode,
      } : undefined);
      toast.success(changed ? "Gebucht & Regel gelernt" : "Buchung bestätigt");
      refresh();
    } catch (e) {
      toast.error("Konnte nicht gebucht werden. " + (e instanceof Error ? e.message : ""));
    } finally {
      setBusy(null);
    }
  };

  const confirmAllConfident = async () => {
    const confident = list.filter((s: any) => Number(s.confidence) >= 0.8 && !override[s.id]);
    if (confident.length === 0) { toast.info("Keine Vorschläge mit hoher Konfidenz"); return; }
    setBusy("all");
    let ok = 0;
    for (const s of confident) {
      try {
        const code = codeById.get(s.suggested_account_id) ?? "";
        const accId = await accountIdByCode(propertyId, code);
        if (accId) { await confirmSuggestion(s.id, accId); ok++; }
      } catch { /* weiter */ }
    }
    toast.success(`${ok} Buchung(en) bestätigt`);
    refresh();
    setBusy(null);
  };

  const reject = async (id: string) => {
    setBusy(id);
    try { await rejectSuggestion(id); toast.success("Vorschlag verworfen"); refresh(); }
    finally { setBusy(null); }
  };

  if (isLoading) {
    return <Card><CardContent className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Vorschläge werden geladen...</CardContent></Card>;
  }

  if (list.length === 0) {
    return (
      <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
        <Sparkles className="w-10 h-10 mb-3 opacity-40" />
        <p>Keine offenen Buchungsvorschläge.</p>
        <p className="text-sm mt-1">Importieren Sie einen Kontoauszug unter Finanzen → Bankanbindung – Bewegungen erscheinen hier zur Bestätigung.</p>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          {list.length} offene Vorschläge – bestätigen oder Konto anpassen. Korrekturen werden gelernt.
        </p>
        <Button size="sm" variant="outline" onClick={confirmAllConfident} disabled={busy === "all"}>
          {busy === "all" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
          Sichere übernehmen
        </Button>
      </div>

      {list.map((s: any) => {
        const curCode = override[s.id] ?? codeById.get(s.suggested_account_id) ?? "";
        const conf = Number(s.confidence);
        return (
          <Card key={s.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {s.direction === "in"
                      ? <ArrowDownLeft className="w-4 h-4 text-green-600 shrink-0" />
                      : <ArrowUpRight className="w-4 h-4 text-destructive shrink-0" />}
                    <p className="font-medium truncate">{s.description}</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {new Date(s.entry_date).toLocaleDateString("de-CH")}
                    {s.counterparty ? ` · ${s.counterparty}` : ""}
                    {s.reference ? ` · Ref ${String(s.reference).slice(0, 20)}` : ""}
                  </p>
                  {s.reasoning && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> {sourceLabel[s.source] ?? s.source}: {s.reasoning}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-semibold ${s.direction === "in" ? "text-green-600" : ""}`}>
                    {s.direction === "in" ? "+" : "−"}{formatCHF(Number(s.amount))}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    conf >= 0.8 ? "bg-green-100 text-green-700" :
                    conf >= 0.5 ? "bg-amber-100 text-amber-700" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {Math.round(conf * 100)}% sicher
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="text-sm text-muted-foreground">
                  {s.direction === "in" ? "Ertragskonto:" : "Aufwandkonto:"}
                </span>
                <Select value={curCode} onValueChange={(v) => setOverride((o) => ({ ...o, [s.id]: v }))}>
                  <SelectTrigger className="w-[260px] h-9"><SelectValue placeholder="Konto wählen" /></SelectTrigger>
                  <SelectContent>
                    {pickable
                      .filter((a) => s.direction === "in" ? a.type === "income" : a.type === "expense")
                      .map((a) => <SelectItem key={a.id} value={a.code}>{a.code} {a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="ml-auto flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => reject(s.id)} disabled={busy === s.id}>
                    <X className="w-4 h-4 mr-1" /> Verwerfen
                  </Button>
                  <Button size="sm" onClick={() => confirm(s)} disabled={busy === s.id || !curCode}>
                    {busy === s.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                    Buchen
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default BookingSuggestions;
