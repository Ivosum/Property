import { useEffect, useMemo, useState } from "react";
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
import { insertContractGroup, UNIT_TYPE_LABEL, FLOOR_LABELS } from "@/lib/pmData";

const sb = supabase as any;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved?: (ids: string[]) => void;
}

interface PropOpt { id: string; name: string; }
interface UnitOpt {
  id: string; property_id: string; unit_number: string; unit_type: string;
  floor_label: string | null; base_rent: number; utilities_advance: number; status: string;
}
interface TenantOpt { id: string; label: string; }

const todayISO = () => new Date().toISOString().slice(0, 10);
const formatCHF = (n: number) =>
  new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF", maximumFractionDigits: 0 }).format(n);
const floorRank = (l: string | null) => (l ? (FLOOR_LABELS.indexOf(l) >= 0 ? FLOOR_LABELS.indexOf(l) : 500) : 999);

const ContractDialog = ({ open, onOpenChange, onSaved }: Props) => {
  const [propertyId, setPropertyId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [start, setStart] = useState(todayISO());
  const [end, setEnd] = useState("");
  const [deposit, setDeposit] = useState("");
  const [status, setStatus] = useState("active");
  const [saving, setSaving] = useState(false);

  const { data: properties } = useQuery({
    queryKey: ["contract-properties", open],
    enabled: open,
    queryFn: async () => {
      const { data } = await sb.from("pm_properties").select("id, name").order("name");
      return (data ?? []) as PropOpt[];
    },
  });

  const { data: allUnits } = useQuery({
    queryKey: ["contract-units-all", open],
    enabled: open,
    queryFn: async () => {
      const { data } = await sb.from("pm_units")
        .select("id, property_id, unit_number, unit_type, floor_label, base_rent, utilities_advance, status");
      return (data ?? []) as UnitOpt[];
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

  // Einheiten der gewählten Liegenschaft, sortiert nach Stockwerk/Bezeichnung
  const propertyUnits = useMemo(() => {
    const list = (allUnits ?? []).filter((u) => u.property_id === propertyId);
    return list.sort((a, b) =>
      floorRank(a.floor_label) - floorRank(b.floor_label) ||
      a.unit_number.localeCompare(b.unit_number, "de"));
  }, [allUnits, propertyId]);

  // Auswahl zurücksetzen bei Liegenschaftswechsel
  useEffect(() => { setSelected(new Set()); }, [propertyId]);

  const toggle = (id: string) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const selectedUnits = propertyUnits.filter((u) => selected.has(u.id));
  const totalRent = selectedUnits.reduce((s, u) => s + (Number(u.base_rent) || 0), 0);
  const totalNk = selectedUnits.reduce((s, u) => s + (Number(u.utilities_advance) || 0), 0);

  const reset = () => {
    setPropertyId(""); setTenantId(""); setSelected(new Set());
    setStart(todayISO()); setEnd(""); setDeposit(""); setStatus("active");
  };

  const save = async () => {
    if (!tenantId) { toast.error("Bitte einen Mieter wählen."); return; }
    if (selectedUnits.length === 0) { toast.error("Bitte mindestens ein Objekt wählen."); return; }
    setSaving(true);
    try {
      const ids = await insertContractGroup({
        tenant_id: tenantId,
        objects: selectedUnits.map((u) => ({
          unit_id: u.id,
          base_rent: Number(u.base_rent) || 0,
          utilities_advance: Number(u.utilities_advance) || 0,
        })),
        start_date: start,
        end_date: end || null,
        deposit_amount: deposit ? Number(deposit) : null,
        status,
      });
      toast.success(`Vertrag erstellt (${ids.length} ${ids.length === 1 ? "Objekt" : "Objekte"})`);
      onSaved?.(ids);
      onOpenChange(false);
      reset();
    } catch (e) {
      toast.error("Konnte nicht gespeichert werden. " + (e instanceof Error ? e.message : ""));
    } finally {
      setSaving(false);
    }
  };

  const propList = properties ?? [];
  const tenantList = tenants ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Vertrag erstellen</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Liegenschaft *</Label>
              <Select value={propertyId} onValueChange={setPropertyId}>
                <SelectTrigger><SelectValue placeholder={propList.length ? "Wählen" : "Keine"} /></SelectTrigger>
                <SelectContent>{propList.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mieter *</Label>
              <Select value={tenantId} onValueChange={setTenantId}>
                <SelectTrigger><SelectValue placeholder={tenantList.length ? "Wählen" : "Keine Mieter"} /></SelectTrigger>
                <SelectContent>{tenantList.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* Objekt-Auswahl */}
          <div>
            <Label>Objekte (Wohnung, Keller, Parkplatz …) *</Label>
            {!propertyId ? (
              <p className="text-sm text-muted-foreground mt-1">Zuerst eine Liegenschaft wählen.</p>
            ) : propertyUnits.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-1">Diese Liegenschaft hat noch keine Einheiten.</p>
            ) : (
              <div className="border rounded-lg divide-y mt-1 max-h-60 overflow-auto">
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
                <span className="font-medium">
                  {formatCHF(totalRent)} Netto{totalNk ? ` + ${formatCHF(totalNk)} NK` : ""}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label>Mietbeginn *</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div><Label>Mietende</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Kaution CHF</Label><Input type="number" value={deposit} onChange={(e) => setDeposit(e.target.value)} /></div>
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
