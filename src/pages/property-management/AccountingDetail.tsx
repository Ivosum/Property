import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  getAccounts, getJournal, computeBalances, computeIncomeStatement, formatCHF,
  accountTypeLabels, createEntry, deleteEntry,
  type Account, type JournalLine,
} from "@/lib/accounting";
import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Plus, Loader2, Trash2, TrendingUp, TrendingDown, Receipt, BookOpen, ListTree, Paperclip,
} from "lucide-react";
import { toast } from "sonner";
import ReceiptUpload from "@/components/property-management/ReceiptUpload";

type Tab = "journal" | "accounts";

const todayISO = () => new Date().toISOString().slice(0, 10);

const AccountingDetail = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("journal");
  const [entryOpen, setEntryOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const { data: property } = useQuery({
    queryKey: ["accounting-property", propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const { data } = await supabase.from("pm_properties").select("id, name, city").eq("id", propertyId!).single();
      return data;
    },
  });

  const { data: accounts } = useQuery({
    queryKey: ["accounting-accounts", propertyId],
    enabled: !!propertyId,
    queryFn: () => getAccounts(propertyId!),
  });

  const { data: entries, isLoading } = useQuery({
    queryKey: ["accounting-journal", propertyId],
    enabled: !!propertyId,
    queryFn: () => getJournal(propertyId!),
  });

  const accountList = accounts ?? [];
  const entryList = entries ?? [];
  const balances = computeBalances(accountList, entryList);
  const inc = computeIncomeStatement(balances);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["accounting-journal", propertyId] });
    queryClient.invalidateQueries({ queryKey: ["accounting-accounts", propertyId] });
    queryClient.invalidateQueries({ queryKey: ["accounting-overview"] });
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEntry(id);
      toast.success("Buchung gelöscht");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fehler");
    }
  };

  return (
    <PropertyManagementLayout>
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/property-management/accounting")} className="mb-3 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> Zur Übersicht
        </Button>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">{property?.name ?? "Buchhaltung"}</h1>
            <p className="text-sm text-muted-foreground">{property?.city} · Separate Buchhaltung</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setReceiptOpen(true)}>
              <Paperclip className="w-4 h-4 mr-2" /> Beleg hochladen
            </Button>
            <Button onClick={() => setEntryOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Buchung
            </Button>
          </div>
        </div>
      </div>

      {/* Kennzahlen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <TrendingUp className="w-5 h-5 text-green-500 mb-2" />
            <p className="text-2xl font-bold">{formatCHF(inc.income)}</p>
            <p className="text-sm text-muted-foreground">Ertrag</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <TrendingDown className="w-5 h-5 text-destructive mb-2" />
            <p className="text-2xl font-bold">{formatCHF(inc.expense)}</p>
            <p className="text-sm text-muted-foreground">Aufwand</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-6">
            <Receipt className="w-5 h-5 text-primary mb-2" />
            <p className={`text-2xl font-bold ${inc.result >= 0 ? "text-green-600" : "text-destructive"}`}>
              {formatCHF(inc.result)}
            </p>
            <p className="text-sm text-muted-foreground">Ergebnis</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <Button variant={tab === "journal" ? "default" : "outline"} size="sm" onClick={() => setTab("journal")}>
          <BookOpen className="w-4 h-4 mr-2" /> Journal
        </Button>
        <Button variant={tab === "accounts" ? "default" : "outline"} size="sm" onClick={() => setTab("accounts")}>
          <ListTree className="w-4 h-4 mr-2" /> Kontenplan
        </Button>
      </div>

      {tab === "journal" ? (
        <Card>
          <CardHeader><CardTitle>Journal ({entryList.length})</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Buchungen werden geladen...
              </div>
            ) : entryList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <BookOpen className="w-10 h-10 mb-3 opacity-40" />
                <p>Noch keine Buchungen.</p>
                <p className="text-sm mt-1">Erfassen Sie eine Buchung oder laden Sie einen Beleg hoch.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {entryList.map((e) => {
                  const total = e.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
                  return (
                    <div key={e.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{e.description}</span>
                            {e.source === "rent" && (
                              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Auto: Miete</span>
                            )}
                            {e.source === "receipt" && (
                              <span className="text-xs px-2 py-0.5 bg-primary/15 text-primary rounded-full">Beleg</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(e.entry_date).toLocaleDateString("de-CH")}
                            {e.reference ? ` · ${e.reference}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">{formatCHF(total)}</span>
                          {e.source === "manual" || e.source === "receipt" ? (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(e.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-3 text-sm space-y-1">
                        {e.lines.map((l, i) => (
                          <div key={i} className="flex items-center justify-between text-muted-foreground">
                            <span>
                              {l.account?.code} {l.account?.name}
                              {l.line_text ? ` – ${l.line_text}` : ""}
                            </span>
                            <span className={l.debit ? "text-foreground" : ""}>
                              {Number(l.debit) ? `Soll ${formatCHF(Number(l.debit))}` : `Haben ${formatCHF(Number(l.credit))}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>Kontenplan & Saldi</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 px-3 font-medium">Konto</th>
                    <th className="text-left py-2 px-3 font-medium">Bezeichnung</th>
                    <th className="text-left py-2 px-3 font-medium">Typ</th>
                    <th className="text-right py-2 px-3 font-medium">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map((b) => (
                    <tr key={b.account.id} className="border-b hover:bg-secondary/20">
                      <td className="py-2 px-3 font-mono">{b.account.code}</td>
                      <td className="py-2 px-3">{b.account.name}</td>
                      <td className="py-2 px-3 text-muted-foreground">{accountTypeLabels[b.account.type]}</td>
                      <td className="py-2 px-3 text-right font-medium">{formatCHF(b.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Buchung erfassen */}
      <EntryDialog
        open={entryOpen}
        onOpenChange={setEntryOpen}
        accounts={accountList}
        propertyId={propertyId!}
        onSaved={() => { setEntryOpen(false); refresh(); }}
      />

      {/* Beleg hochladen */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Beleg hochladen & verbuchen</DialogTitle></DialogHeader>
          {propertyId && (
            <ReceiptUpload
              propertyId={propertyId}
              accounts={accountList}
              onBooked={() => { setReceiptOpen(false); refresh(); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </PropertyManagementLayout>
  );
};

// --- Buchung erfassen Dialog (vereinfachte Soll/Haben-Erfassung) ---
function EntryDialog({
  open, onOpenChange, accounts, propertyId, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accounts: Account[];
  propertyId: string;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(todayISO());
  const [desc, setDesc] = useState("");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [debitAcc, setDebitAcc] = useState("");
  const [creditAcc, setCreditAcc] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setDate(todayISO()); setDesc(""); setReference(""); setAmount(""); setDebitAcc(""); setCreditAcc("");
  };

  const save = async () => {
    const amt = Number(amount);
    if (!desc.trim()) return toast.error("Bitte eine Beschreibung angeben.");
    if (!amt || amt <= 0) return toast.error("Bitte einen gültigen Betrag angeben.");
    if (!debitAcc || !creditAcc) return toast.error("Bitte Soll- und Haben-Konto wählen.");
    if (debitAcc === creditAcc) return toast.error("Soll- und Haben-Konto müssen verschieden sein.");

    setSaving(true);
    try {
      const lines: JournalLine[] = [
        { account_id: debitAcc, debit: amt, credit: 0 },
        { account_id: creditAcc, debit: 0, credit: amt },
      ];
      await createEntry({
        property_id: propertyId,
        entry_date: date,
        description: desc.trim(),
        reference: reference.trim() || null,
        source: "manual",
        lines,
      });
      toast.success("Buchung erfasst");
      reset();
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fehler beim Buchen");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Buchung erfassen</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Datum</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Betrag (CHF)</Label>
              <Input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Beschreibung</Label>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="z.B. Heizölrechnung" />
          </div>
          <div className="space-y-2">
            <Label>Referenz / Beleg-Nr. (optional)</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Soll-Konto</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={debitAcc} onChange={(e) => setDebitAcc(e.target.value)}>
                <option value="">Wählen...</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Haben-Konto</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={creditAcc} onChange={(e) => setCreditAcc(e.target.value)}>
                <option value="">Wählen...</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
              </select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Beispiel: Ausgabe = Soll Aufwandskonto / Haben Bank. Einnahme = Soll Bank / Haben Ertragskonto.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Buchen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AccountingDetail;
