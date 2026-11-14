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
import { insertProperty, CANTONS, PROPERTY_TYPES, type PropertyInput } from "@/lib/pmData";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved?: (id: string) => void;
}

const empty: PropertyInput = {
  name: "", address: "", postal_code: "", city: "", canton: "SZ",
  property_type: "Mehrfamilienhaus", year_built: null, total_units: null, notes: "",
};

const PropertyDialog = ({ open, onOpenChange, onSaved }: Props) => {
  const [form, setForm] = useState<PropertyInput>(empty);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof PropertyInput>(k: K, v: PropertyInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name.trim() || !form.address.trim() || !form.city.trim() || !form.postal_code.trim()) {
      toast.error("Bitte Name, Adresse, PLZ und Ort ausfüllen.");
      return;
    }
    setSaving(true);
    try {
      const id = await insertProperty(form);
      toast.success("Liegenschaft erstellt");
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
        <DialogHeader><DialogTitle>Liegenschaft hinzufügen</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name / Bezeichnung *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="z.B. Seestrasse 12" />
          </div>
          <div>
            <Label>Adresse *</Label>
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Strasse und Nr." />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>PLZ *</Label>
              <Input value={form.postal_code} onChange={(e) => set("postal_code", e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Ort *</Label>
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Kanton *</Label>
              <Select value={form.canton} onValueChange={(v) => set("canton", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CANTONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Objekttyp</Label>
              <Select value={form.property_type ?? ""} onValueChange={(v) => set("property_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROPERTY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Baujahr</Label>
              <Input type="number" value={form.year_built ?? ""} onChange={(e) => set("year_built", e.target.value ? Number(e.target.value) : null)} />
            </div>
            <div>
              <Label>Anzahl Einheiten</Label>
              <Input type="number" value={form.total_units ?? ""} onChange={(e) => set("total_units", e.target.value ? Number(e.target.value) : null)} />
            </div>
          </div>
          <div>
            <Label>Notizen</Label>
            <Textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} rows={2} />
          </div>
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

export default PropertyDialog;
