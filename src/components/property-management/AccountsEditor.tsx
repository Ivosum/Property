import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import {
  formatCHF, accountTypeLabels, createAccount, updateAccount, deleteAccount,
  type Account, type AccountType, type AccountBalance,
} from "@/lib/accounting";

interface Props {
  propertyId: string;
  balances: AccountBalance[];
  onChanged: () => void;
}

const TYPES: AccountType[] = ["asset", "liability", "equity", "income", "expense"];

const AccountsEditor = ({ propertyId, balances, onChanged }: Props) => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState({ code: "", name: "", type: "expense" as AccountType });
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["accounting-accounts", propertyId] });
    queryClient.invalidateQueries({ queryKey: ["accounting-journal", propertyId] });
    onChanged();
  };

  const openNew = () => { setEditing(null); setForm({ code: "", name: "", type: "expense" }); setDialogOpen(true); };
  const openEdit = (a: Account) => { setEditing(a); setForm({ code: a.code, name: a.name, type: a.type }); setDialogOpen(true); };

  const save = async () => {
    if (!form.code.trim() || !form.name.trim()) { toast.error("Konto-Nummer und Bezeichnung nötig"); return; }
    setSaving(true);
    try {
      if (editing) {
        await updateAccount(editing.id, { code: form.code, name: form.name, type: form.type });
        toast.success("Konto aktualisiert");
      } else {
        await createAccount({ property_id: propertyId, code: form.code, name: form.name, type: form.type });
        toast.success("Konto hinzugefügt");
      }
      setDialogOpen(false);
      refresh();
    } catch (e) {
      toast.error("Konnte nicht gespeichert werden. " + (e instanceof Error ? e.message : ""));
    } finally {
      setSaving(false);
    }
  };

  const del = async (a: Account) => {
    setBusyId(a.id);
    try {
      await deleteAccount(a.id);
      toast.success("Konto gelöscht");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Konnte nicht gelöscht werden.");
    } finally {
      setBusyId(null);
    }
  };

  // nach Typ gruppieren
  const byType = new Map<AccountType, AccountBalance[]>();
  balances.forEach((b) => {
    const arr = byType.get(b.account.type) ?? [];
    arr.push(b); byType.set(b.account.type, arr);
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Kontenplan & Saldi</CardTitle>
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Konto hinzufügen</Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {TYPES.filter((t) => byType.has(t)).map((t) => (
          <div key={t}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">{accountTypeLabels[t]}</h3>
            <div className="space-y-1">
              {(byType.get(t) ?? []).map((b) => (
                <div key={b.account.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-secondary/30 group">
                  <span className="font-mono text-sm w-14 shrink-0">{b.account.code}</span>
                  <span className="flex-1 min-w-0 truncate">{b.account.name}</span>
                  {b.account.is_system && (
                    <Lock className="w-3 h-3 text-muted-foreground shrink-0" aria-label="Systemkonto" />
                  )}
                  <span className="font-medium text-sm w-28 text-right shrink-0">{formatCHF(b.balance)}</span>
                  <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(b.account)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    {!b.account.is_system && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => del(b.account)} disabled={busyId === b.account.id}>
                        {busyId === b.account.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          <Lock className="w-3 h-3 inline mr-1" />Systemkonten (z.B. Bank, Mietertrag) können umbenannt, aber nicht gelöscht werden – sie werden für Auto-Buchungen gebraucht.
        </p>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Konto bearbeiten" : "Konto hinzufügen"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="text-sm font-medium">Nummer</label>
                <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="6600" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Bezeichnung</label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="z.B. Gartenunterhalt" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Kontotyp</label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as AccountType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => <SelectItem key={t} value={t}>{accountTypeLabels[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {editing?.is_system && (
              <p className="text-xs text-muted-foreground">Systemkonto: Nummer besser nicht ändern, da Auto-Buchungen darauf verweisen.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AccountsEditor;
