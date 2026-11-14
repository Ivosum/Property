import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { insertContract } from "@/lib/pmData";

const sb = supabase as any;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved?: (id: string) => void;
}

interface UnitOpt { id: string; label: string; base_rent: number; utilities_advance: number; }
interface TenantOpt { id: string; label: string; }

const todayISO = () => new Date().toISOString().slice(0, 10);

const ContractDialog = ({ open, onOpenChange, onSaved }: Props) => {
  const [unitId, setUnitId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [start, setStart] = useState(todayISO());
  const [end, setEnd] = useState("");
  const [rent, setRent] = useState("");
  const [nk, setNk] = useState("");
  const [deposit, setDeposit] = useState("");
  const [status, setStatus] = useState("active");
  const [saving, setSaving] = useState(false);

  const { data: units } = useQuery({
    queryKey: ["contract-units", open],
    enabled: open,
    queryFn: async () => {
      const [{ data: u }, { data: props }] = await Promise.all([
        sb.from("pm_units").select("id, unit_number, property_id, base_rent, utilities_advance, status"),
        sb.from("pm_properties").select("id, name"),
      ]);
      const propName = new Map((props ?? []).map((p: any) => [p.id, p.name]));
      return (u ?? []).map((x: any): UnitOpt => ({
        id: x.id,
        label: `${propName.get(x.property_id) ?? "?"} – ${x.unit_number}${x.status === "occupied" ? " (belegt)" : ""}`,
        base_rent: Number(x.base_rent) || 0,
        utilities_advance: Number(x.utilities_advance) || 0,
      }));
    },
  });

  const { data: tenants } = useQuery({
    queryKey: ["contract-tenants", open],
    enabled: open,
    queryFn: async () => {
      const { data } = await sb.from("pm_tenants").select("id, first_name, last_name");
      return (data ?? []).map((t: any): TenantOpt => ({
        id: t.id, label: [t.first_name, t.last_name].filter(Boolean).join(" ") || "Unbenannt",
      }));
    },
  });

  // prefill rent/nk from selected unit
  useEffect(() => {
    const u = (units ?? []).find((x) => x.id === unitId);
    if (u) {
      if (!rent) setRent(String(u.base_rent));
      if (!nk) setNk(String(u.utilities_advance));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId]);

  const reset = () => {
    setUnitId(""); setTenantId(""); setStart(todayISO()); setEnd("");
    setRent(""); setNk(""); setDeposit(""); setStatus("active");
  };

  const save = async () => {
    if (!unitId) { toast.error("Bitte eine Einheit wählen."); return; }
    if (!tenantId) { toast.error("Bitte einen Mieter wählen."); return; }
    if (!rent || Number(rent) <= 0) { toast.error("Bitte die Nettomiete angeben."); return; }
    setSaving(true);
    try {
      const id = await insertContract({
        unit_id: unitId,
        tenant_id: tenantId,
        start_date: start,
        end_date: end || null,
        base_rent: Number(rent),
        utilities_advance: nk ? Number(nk) : 0,
        deposit_amount: deposit ? Number(deposit) : null,
        status,
      });
      toast.success("Vertrag erstellt");
      onSaved?.(id);
      onOpenChange(false);
      reset();
    } catch (e) {
      toast.error("Konnte nicht gespeichert werden. " + (e instanceof Error ? e.message : ""));
    } finally {
      setSaving(false);
    }
  };

  const unitList = units ?? [];
  const tenantList = tenants ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Vertrag erstellen</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Einheit *</Label>
            <Select value={unitId} onValueChange={setUnitId}>
              <SelectTrigger><SelectValue placeholder={unitList.length ? "Einheit wählen" : "Keine Einheiten – zuerst anlegen"} /></SelectTrigger>
              <SelectContent>{unitList.map((u) => <SelectItem key={u.id} value={u.id}>{u.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Mieter *</Label>
            <Select value={tenantId} onValueChange={setTenantId}>
              <SelectTrigger><SelectValue placeholder={tenantList.length ? "Mieter wählen" : "Keine Mieter – zuerst anlegen"} /></SelectTrigger>
              <SelectContent>{tenantList.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Mietbeginn *</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div><Label>Mietende</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Nettomiete *</Label><Input type="number" value={rent} onChange={(e) => setRent(e.target.value)} /></div>
            <div><Label>NK-Akonto</Label><Input type="number" value={nk} onChange={(e) => setNk(e.target.value)} /></div>
            <div><Label>Kaution</Label><Input type="number" value={deposit} onChange={(e) => setDeposit(e.target.value)} /></div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Aktiv</SelectItem>
                <SelectItem value="draft">Entwurf</SelectItem>
              </SelectContent>
            </Select>
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

export default ContractDialog;
