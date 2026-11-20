import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { insertOwner, updateOwner, OWNER_TYPES, type OwnerInput, type OwnerRow } from "@/lib/pmData";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved?: (id: string) => void;
  /** vorhandenen Eigentümer bearbeiten */
  owner?: OwnerRow | null;
}

const empty: OwnerInput = {
  owner_type: "private", name: "", contact_person: "", email: "", phone: "",
  address: "", postal_code: "", city: "", iban: "", bank_name: "", notes: "",
};

const OwnerDialog = ({ open, onOpenChange, onSaved, owner }: Props) => {
  const [form, setForm] = useState<OwnerInput>(owner ?? empty);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof OwnerInput>(k: K, v: OwnerInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  // bei Öffnen mit anderem Eigentümer neu befüllen
  const [lastId, setLastId] = useState<string | null>(owner?.id ?? null);
  if (open && (owner?.id ?? null) !== lastId) {
    setForm(owner ?? empty);
    setLastId(owner?.id ?? null);
  }

  const isCompany = form.owner_type === "company";

  const save = async () => {
    if (!form.name.trim()) { toast.error(isCompany ? "Bitte Firmennamen angeben." : "Bitte Namen angeben."); return; }
    setSaving(true);
    try {
      let id: string;
      if (owner?.id) { await updateOwner(owner.id, form); id = owner.id; toast.success("Eigentümer aktualisiert"); }
      else { id = await insertOwner(form); toast.success("Eigentümer gespeichert"); }
      onSaved?.(id);
      onOpenChange(false);
      if (!owner?.id) setForm(empty);
    } catch (e) {
      toast.error("Konnte nicht gespeichert werden. " + (e instanceof Error ? e.message : ""));
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o && !owner?.id) setForm(empty); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{owner?.id ? "Eigentümer bearbeiten" : "Eigentümer hinzufügen"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Typ *</Label>
              <Select value={form.owner_type} onValueChange={(v) => set("owner_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{OWNER_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>{isCompany ? "Firmenname *" : "Name *"}</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={isCompany ? "Muster Immobilien AG" : "Hans Muster"} />
            </div>
          </div>
          {isCompany && (
            <div>
              <Label>Ansprechpartner</Label>
              <Input value={form.contact_person ?? ""} onChange={(e) => set("contact_person", e.target.value)} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>E-Mail</Label><Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} /></div>
            <div><Label>Telefon</Label><Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></div>
          </div>
          <div><Label>Adresse</Label><Input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} placeholder="Strasse und Nr." /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>PLZ</Label><Input value={form.postal_code ?? ""} onChange={(e) => set("postal_code", e.target.value)} /></div>
            <div className="col-span-2"><Label>Ort</Label><Input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>IBAN</Label><Input value={form.iban ?? ""} onChange={(e) => set("iban", e.target.value)} placeholder="CH.." /></div>
            <div><Label>Bank</Label><Input value={form.bank_name ?? ""} onChange={(e) => set("bank_name", e.target.value)} /></div>
          </div>
          <div><Label>Notizen</Label><Textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Abbrechen</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Speichern</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OwnerDialog;
