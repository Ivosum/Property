import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Landmark, Info } from "lucide-react";
import { toast } from "sonner";
import {
  getBankConnection, saveBankConnection, BANK_ACCESS_STATUS, type BankConnectionInput,
} from "@/lib/pmData";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  propertyId: string;
  propertyName?: string;
  onSaved?: () => void;
}

const empty: BankConnectionInput = {
  property_id: "",
  bank_name: "", iban: "", qr_iban: "", bic: "", account_holder: "",
  access_method: "manual", ebics_host_id: "", ebics_user_id: "", ebics_partner_id: "", ebics_url: "",
  status: "none", notes: "",
};

const BankConnectionDialog = ({ open, onOpenChange, propertyId, propertyName, onSaved }: Props) => {
  const [form, setForm] = useState<BankConnectionInput>({ ...empty, property_id: propertyId });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getBankConnection(propertyId)
      .then((c) => {
        if (c) setForm({ ...empty, ...c, property_id: propertyId });
        else setForm({ ...empty, property_id: propertyId });
      })
      .finally(() => setLoading(false));
  }, [open, propertyId]);

  const set = (k: keyof BankConnectionInput, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await saveBankConnection(form);
      toast.success("Bankzugang gespeichert");
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast.error("Konnte nicht gespeichert werden. " + (e instanceof Error ? e.message : ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-primary" />
            Bankanbindung {propertyName ? `– ${propertyName}` : ""}
          </DialogTitle>
          <DialogDescription>
            Konto- und Zugangsdaten für den automatischen Zahlungsabgleich (camt.053 / EBICS).
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Lädt...
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-lg border bg-secondary/30 p-3 text-sm text-muted-foreground flex gap-2">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Schweizer Banken liefern Kontoauszüge als <strong>camt.053/054</strong> (ISO 20022). Für den
                automatischen Abruf per <strong>EBICS</strong> muss die Bank den Zugang freischalten –
                Status unten auf „Zugang beantragt" setzen, bis die Freigabe da ist. Solange laden Sie den
                Auszug als Datei hoch.
              </span>
            </div>

            {/* Kontodaten */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Bank</Label>
                <Input value={form.bank_name ?? ""} onChange={(e) => set("bank_name", e.target.value)} placeholder="z.B. Zürcher Kantonalbank" />
              </div>
              <div>
                <Label>Kontoinhaber</Label>
                <Input value={form.account_holder ?? ""} onChange={(e) => set("account_holder", e.target.value)} placeholder="Eigentümer / Verwaltung" />
              </div>
              <div>
                <Label>IBAN (Mietzinskonto)</Label>
                <Input value={form.iban ?? ""} onChange={(e) => set("iban", e.target.value)} placeholder="CH.. .... .... .... .... ." />
              </div>
              <div>
                <Label>QR-IBAN</Label>
                <Input value={form.qr_iban ?? ""} onChange={(e) => set("qr_iban", e.target.value)} placeholder="für QR-Rechnung mit Referenz" />
              </div>
              <div>
                <Label>BIC / SWIFT</Label>
                <Input value={form.bic ?? ""} onChange={(e) => set("bic", e.target.value)} />
              </div>
              <div>
                <Label>Zugangs-Status</Label>
                <Select value={form.status ?? "none"} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BANK_ACCESS_STATUS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Abrufmethode */}
            <div>
              <Label>Abruf-Methode</Label>
              <Select value={form.access_method ?? "manual"} onValueChange={(v) => set("access_method", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manueller Datei-Upload (camt.053/054)</SelectItem>
                  <SelectItem value="ebics">EBICS (automatischer Abruf)</SelectItem>
                  <SelectItem value="api">Bank-API</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* EBICS-Zugangsdaten – nur bei ebics */}
            {form.access_method === "ebics" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border p-4">
                <div className="sm:col-span-2 text-sm font-medium">EBICS-Zugangsdaten (von der Bank)</div>
                <div>
                  <Label>Host-ID</Label>
                  <Input value={form.ebics_host_id ?? ""} onChange={(e) => set("ebics_host_id", e.target.value)} />
                </div>
                <div>
                  <Label>Partner-ID</Label>
                  <Input value={form.ebics_partner_id ?? ""} onChange={(e) => set("ebics_partner_id", e.target.value)} />
                </div>
                <div>
                  <Label>User-ID</Label>
                  <Input value={form.ebics_user_id ?? ""} onChange={(e) => set("ebics_user_id", e.target.value)} />
                </div>
                <div>
                  <Label>EBICS-URL</Label>
                  <Input value={form.ebics_url ?? ""} onChange={(e) => set("ebics_url", e.target.value)} placeholder="https://ebics.bank.ch/..." />
                </div>
              </div>
            )}

            <div>
              <Label>Notizen</Label>
              <Textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="z.B. Ansprechpartner Bank, Referenz des Antrags" />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button onClick={save} disabled={saving || loading}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BankConnectionDialog;
