import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Loader2, Home } from "lucide-react";
import { toast } from "sonner";
import { insertTenant, insertContractGroup, UNIT_TYPE_LABEL, FLOOR_LABELS, type TenantInput } from "@/lib/pmData";

const sb = supabase as any;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved?: (id: string) => void;
}

interface PropOpt { id: string; name: string; }
interface UnitOpt {
  id: string; property_id: string; unit_number: string; unit_type: string;
  floor_label: string | null; base_rent: number; utilities_advance: number; status: string;
}

const empty: TenantInput = {
  first_name: "", last_name: "", email: "", phone: "",
  date_of_birth: "", nationality: "", employer: "", monthly_income: null, notes: "",
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const formatCHF = (n: number) =>
  new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF", maximumFractionDigits: 0 }).format(n);
const floorRank = (l: string | null) => (l ? (FLOOR_LABELS.indexOf(l) >= 0 ? FLOOR_LABELS.indexOf(l) : 500) : 999);

const TenantDialog = ({ open, onOpenChange, onSaved }: Props) => {
  const [form, setForm] = useState<TenantInput>(empty);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof TenantInput>(k: K, v: TenantInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  // Vertrags-Teil (optional)
  const [withContract, setWithContract] = useState(false);
  const [propertyId, setPropertyId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [start, setStart] = useState(todayISO());
  const [deposit, setDeposit] = useState("");

  const { data: properties } = useQuery({
    queryKey: ["tenant-contract-properties", open],
    enabled: open,
    queryFn: async () => {
      const { data } = await sb.from("pm_properties").select("id, name").order("name");
      return (data ?? []) as PropOpt[];
    },
  });

  const { data: allUnits } = useQuery({
    queryKey: ["tenant-contract-units", open],
    enabled: open,
    queryFn: async () => {
      const { data } = await sb.from("pm_units")
        .select("id, property_id, unit_number, unit_type, floor_label, base_rent, utilities_advance, status");
      return (data ?? []) as UnitOpt[];
    },
  });

  const propertyUnits = useMemo(() => {
    const list = (allUnits ?? []).filter((u) => u.property_id === propertyId);
    return list.sort((a, b) =>
      floorRank(a.floor_label) - floorRank(b.floor_label) ||
      a.unit_number.localeCompare(b.unit_number, "de"));
  }, [allUnits, propertyId]);

  useEffect(() => { setSelected(new Set()); }, [propertyId]);

  const toggle = (id: string) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const selectedUnits = propertyUnits.filter((u) => selected.has(u.id));
  const totalRent = selectedUnits.reduce((s, u) => s + (Number(u.base_rent) || 0), 0);
  const totalNk = selectedUnits.reduce((s, u) => s + (Number(u.utilities_advance) || 0), 0);

  const reset = () => {
    setForm(empty); setWithContract(false); setPropertyId(""); setSelected(new Set());
    setStart(todayISO()); setDeposit("");
  };

  const save = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error("Bitte Vor- und Nachname ausfüllen.");
      return;
    }
    if (withContract && selectedUnits.length === 0) {
      toast.error("Bitte mindestens ein Objekt wählen – oder den Vertragsteil ausschalten.");
      return;
    }
    setSaving(true);
    try {
      const tenantId = await insertTenant(form);

      if (withContract && selectedUnits.length > 0) {
        await insertContractGroup({
          tenant_id: tenantId,
          objects: selectedUnits.map((u) => ({
            unit_id: u.id,
            base_rent: Number(u.base_rent) || 0,
            utilities_advance: Number(u.utilities_advance) || 0,
          })),
          start_date: start,
          deposit_amount: deposit ? Number(deposit) : null,
          status: "active",
        });
        toast.success(`Mieter + Vertrag (${selectedUnits.length} Objekt${selectedUnits.length === 1 ? "" : "e"}) erstellt`);
      } else {
        toast.success("Mieter erstellt");
      }

      onSaved?.(tenantId);
      onOpenChange(false);
      reset();
    } catch (e) {
      toast.error("Konnte nicht gespeichert werden. " + (e instanceof Error ? e.message : ""));
    } finally {
      setSaving(false);
    }
  };

  const propList = properties ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="w-[92vw] max-w-2xl max-h-[92vh] overflow-y-auto">
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

          {/* Objekte zuweisen (Vertrag) */}
          <div className="rounded-lg border p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={withContract} onChange={(e) => setWithContract(e.target.checked)} />
              <span className="font-medium text-sm flex items-center gap-2"><Home className="w-4 h-4" /> Wohnung / Parkplatz direkt zuweisen (Vertrag erstellen)</span>
            </label>

            {withContract && (
              <div className="mt-3 space-y-3">
                <div>
                  <Label>Liegenschaft *</Label>
                  <Select value={propertyId} onValueChange={setPropertyId}>
                    <SelectTrigger><SelectValue placeholder={propList.length ? "Liegenschaft wählen" : "Keine Liegenschaften"} /></SelectTrigger>
                    <SelectContent>{propList.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Objekte (Wohnung, Keller, Parkplatz …) *</Label>
                  {!propertyId ? (
                    <p className="text-sm text-muted-foreground mt-1">Zuerst eine Liegenschaft wählen.</p>
                  ) : propertyUnits.length === 0 ? (
                    <p className="text-sm text-muted-foreground mt-1">Diese Liegenschaft hat noch keine Einheiten.</p>
                  ) : (
                    <div className="border rounded-lg divide-y mt-1 max-h-56 overflow-auto">
                      {propertyUnits.map((u) => {
                        const taken = u.status === "occupied";
                        return (
                          <label key={u.id}
                            className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-secondary/40 ${selected.has(u.id) ? "bg-secondary/50" : ""}`}>
                            <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {[u.floor_label, u.unit_number].filter(Boolean).join(" ")}
                                <span className="text-xs text-muted-foreground font-normal"> · {UNIT_TYPE_LABEL[u.unit_type] ?? u.unit_type}</span>
                                {taken && <span className="text-xs text-orange-600 font-normal"> · belegt</span>}
                              </p>
                            </div>
                            <span className="text-sm text-muted-foreground shrink-0">{formatCHF(Number(u.base_rent) || 0)}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  {selectedUnits.length > 0 && (
                    <div className="flex justify-between text-sm mt-2 px-1">
                      <span className="text-muted-foreground">{selectedUnits.length} Objekt(e) gewählt</span>
                      <span className="font-medium">{formatCHF(totalRent)} Netto{totalNk ? ` + ${formatCHF(totalNk)} NK` : ""}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Mietbeginn *</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
                  <div><Label>Kaution CHF</Label><Input type="number" value={deposit} onChange={(e) => setDeposit(e.target.value)} /></div>
                </div>
              </div>
            )}
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

export default TenantDialog;
