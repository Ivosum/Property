import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { updateTenant, type CoTenant } from "@/lib/pmData";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tenant: any;            // aktueller Mieter-Datensatz
  onSaved?: () => void;
}

const TenantEditDialog = ({ open, onOpenChange, tenant, onSaved }: Props) => {
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "", nationality: "", employer: "",
  });
  const [coTenants, setCoTenants] = useState<CoTenant[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !tenant) return;
    setForm({
      first_name: tenant.first_name ?? "", last_name: tenant.last_name ?? "",
      email: tenant.email ?? "", phone: tenant.phone ?? "",
      nationality: tenant.nationality ?? "", employer: tenant.employer ?? "",
    });
    setCoTenants(Array.isArray(tenant.co_tenants) ? tenant.co_tenants : []);
  }, [open, tenant]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const addCo = () => setCoTenants((c) => [...c, { first_name: "", last_name: "" }]);
  const updateCo = (i: number, k: keyof CoTenant, v: string) =>
    setCoTenants((c) => c.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)));
  const removeCo = (i: number) => setCoTenants((c) => c.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) { toast.error("Vor- und Nachname nötig"); return; }
    setSaving(true);
    try {
      await updateTenant(tenant.id, {
        ...form,
        email: form.email || null, phone: form.phone || null,
        nationality: form.nationality || null, employer: form.employer || null,
        co_tenants: coTenants.filter((c) => c.first_name || c.last_name),
      });
      toast.success("Mieter aktualisiert");
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
      <DialogContent className="w-[92vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Mieter bearbeiten</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Vorname</Label><Input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} /></div>
            <div><Label>Nachname</Label><Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>E-Mail</Label><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
            <div><Label>Telefon</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nationalität</Label><Input value={form.nationality} onChange={(e) => set("nationality", e.target.value)} /></div>
            <div><Label>Arbeitgeber</Label><Input value={form.employer} onChange={(e) => set("employer", e.target.value)} /></div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Mitmieter / Partner</Label>
              <Button variant="outline" size="sm" onClick={addCo}><Plus className="w-3.5 h-3.5 mr-1" /> Hinzufügen</Button>
            </div>
            {coTenants.length === 0 ? (
              <p className="text-xs text-muted-foreground">Keine Mitmieter erfasst.</p>
            ) : (
              <div className="space-y-2">
                {coTenants.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input placeholder="Vorname" value={c.first_name} onChange={(e) => updateCo(i, "first_name", e.target.value)} />
                    <Input placeholder="Nachname" value={c.last_name} onChange={(e) => updateCo(i, "last_name", e.target.value)} />
                    <Button variant="ghost" size="icon" onClick={() => removeCo(i)}><X className="w-4 h-4" /></Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Speichern</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TenantEditDialog;
