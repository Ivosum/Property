import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { insertTenant, type TenantInput } from "@/lib/pmData";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved?: (id: string) => void;
}

const empty: TenantInput = {
  first_name: "", last_name: "", email: "", phone: "",
  date_of_birth: "", nationality: "", employer: "", monthly_income: null, notes: "",
};

const TenantDialog = ({ open, onOpenChange, onSaved }: Props) => {
  const [form, setForm] = useState<TenantInput>(empty);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof TenantInput>(k: K, v: TenantInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error("Bitte Vor- und Nachname ausfüllen.");
      return;
    }
    setSaving(true);
    try {
      const id = await insertTenant(form);
      toast.success("Mieter erstellt");
      onSaved?.(id);
      onOpenChange(false);
      setForm(empty);
    } catch (e) {
      toast.error("Konnte nicht gespeichert werden. " + (e instanceof Error ? e.message : ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setForm(empty); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Mieter hinzufügen</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Vorname *</Label><Input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} /></div>
            <div><Label>Nachname *</Label><Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>E-Mail</Label><Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} /></div>
            <div><Label>Telefon</Label><Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Geburtsdatum</Label><Input value={form.date_of_birth ?? ""} onChange={(e) => set("date_of_birth", e.target.value)} placeholder="TT.MM.JJJJ" /></div>
            <div><Label>Nationalität</Label><Input value={form.nationality ?? ""} onChange={(e) => set("nationality", e.target.value)} placeholder="CH" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Arbeitgeber</Label><Input value={form.employer ?? ""} onChange={(e) => set("employer", e.target.value)} /></div>
            <div><Label>Monatseinkommen CHF</Label><Input type="number" value={form.monthly_income ?? ""} onChange={(e) => set("monthly_income", e.target.value ? Number(e.target.value) : null)} /></div>
          </div>
          <div><Label>Notizen</Label><Textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Abbrechen</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TenantDialog;
