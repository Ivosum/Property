import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Link2, Link2Off, Car, Box, Check } from "lucide-react";
import { toast } from "sonner";
import {
  getPropertyUnits, setUnitParent, updateUnit, addCoupledUnit, UNIT_TYPE_LABEL,
} from "@/lib/pmData";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  propertyId: string;
  unitId: string;           // die Wohnung (Haupteinheit)
  unitLabel: string;        // Anzeigename der Wohnung
  onChanged?: () => void;
}

const typeIcon = (t: string) => t === "garage" || t === "aussenparkplatz" ? Car : Box;

const UnitManageDialog = ({ open, onOpenChange, propertyId, unitId, unitLabel, onChanged }: Props) => {
  const queryClient = useQueryClient();
  const [all, setAll] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  // Entwürfe für Nummer/Miete-Änderungen
  const [draft, setDraft] = useState<Record<string, { unit_number: string; base_rent: string }>>({});
  // neue Einheit
  const [newType, setNewType] = useState("garage");
  const [newNr, setNewNr] = useState("");
  const [newRent, setNewRent] = useState("125");

  const load = async () => {
    setLoading(true);
    try {
      const units = await getPropertyUnits(propertyId);
      setAll(units);
      const d: Record<string, { unit_number: string; base_rent: string }> = {};
      units.forEach((u) => { d[u.id] = { unit_number: u.unit_number, base_rent: String(Number(u.base_rent) || 0) }; });
      setDraft(d);
    } finally { setLoading(false); }
  };
  useEffect(() => { if (open) load(); }, [open, propertyId]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["pm-tenant-360"] });
    queryClient.invalidateQueries({ queryKey: ["pm-tenants"] });
    onChanged?.();
    load();
  };

  // Nebeneinheiten: alles ausser Wohnung/Gewerbe
  const side = all.filter((u) => !["wohnung", "gewerbe"].includes(u.unit_type));
  const coupled = side.filter((u) => u.parent_unit_id === unitId);
  const free = side.filter((u) => !u.parent_unit_id);

  const detach = async (id: string) => {
    setBusy(id);
    try { await setUnitParent(id, null); toast.success("Entkoppelt"); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Fehler"); } finally { setBusy(null); }
  };
  const attach = async (id: string) => {
    setBusy(id);
    try { await setUnitParent(id, unitId); toast.success("Zugeordnet"); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Fehler"); } finally { setBusy(null); }
  };
  const saveUnit = async (id: string) => {
    const d = draft[id]; if (!d) return;
    setBusy(id);
    try {
      await updateUnit(id, { unit_number: d.unit_number.trim(), base_rent: Number(d.base_rent) || 0 });
      toast.success("Gespeichert"); refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Fehler"); } finally { setBusy(null); }
  };
  const addNew = async () => {
    if (!newNr.trim()) { toast.error("Nummer/Bezeichnung nötig"); return; }
    setBusy("new");
    try {
      await addCoupledUnit({ property_id: propertyId, unit_number: newNr.trim(), unit_type: newType, base_rent: Number(newRent) || 0, parent_unit_id: unitId });
      toast.success("Hinzugefügt"); setNewNr(""); refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Fehler"); } finally { setBusy(null); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Garage & Keller – {unitLabel}</DialogTitle>
          <DialogDescription>Sehen und anpassen, welche Garage und welcher Keller zu dieser Wohnung gehören.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Lädt...</div>
        ) : (
          <div className="space-y-5">
            {/* Zugeordnet */}
            <div>
              <p className="text-sm font-medium mb-2">Zu dieser Wohnung ({coupled.length})</p>
              {coupled.length === 0 ? (
                <p className="text-xs text-muted-foreground">Noch keine Garage oder Keller zugeordnet.</p>
              ) : (
                <div className="space-y-2">
                  {coupled.map((u) => {
                    const Icon = typeIcon(u.unit_type);
                    const d = draft[u.id] ?? { unit_number: u.unit_number, base_rent: String(u.base_rent) };
                    return (
                      <div key={u.id} className="flex items-center gap-2 p-2 rounded-lg border">
                        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground w-16 shrink-0">{UNIT_TYPE_LABEL[u.unit_type] ?? u.unit_type}</span>
                        <Input className="h-8" value={d.unit_number} onChange={(e) => setDraft((p) => ({ ...p, [u.id]: { ...d, unit_number: e.target.value } }))} />
                        <div className="flex items-center gap-1 shrink-0">
                          <Input className="h-8 w-20" type="number" value={d.base_rent} onChange={(e) => setDraft((p) => ({ ...p, [u.id]: { ...d, base_rent: e.target.value } }))} />
                          <span className="text-xs text-muted-foreground">CHF</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Speichern" onClick={() => saveUnit(u.id)} disabled={busy === u.id}>
                          {busy === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground" title="Entkoppeln" onClick={() => detach(u.id)} disabled={busy === u.id}>
                          <Link2Off className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Freie Einheiten zum Zuordnen */}
            {free.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Freie Garage/Keller zuordnen</p>
                <div className="space-y-2">
                  {free.map((u) => {
                    const Icon = typeIcon(u.unit_type);
                    return (
                      <div key={u.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border bg-secondary/20">
                        <span className="flex items-center gap-2 text-sm min-w-0">
                          <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                          {u.unit_number} <span className="text-xs text-muted-foreground">({UNIT_TYPE_LABEL[u.unit_type] ?? u.unit_type})</span>
                        </span>
                        <Button variant="outline" size="sm" onClick={() => attach(u.id)} disabled={busy === u.id}>
                          {busy === u.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Link2 className="w-3.5 h-3.5 mr-1" />} Zuordnen
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Neu anlegen */}
            <div className="pt-2 border-t">
              <p className="text-sm font-medium mb-2">Neu hinzufügen</p>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="garage">Garage</SelectItem>
                    <SelectItem value="aussenparkplatz">Aussenparkplatz</SelectItem>
                    <SelectItem value="keller">Keller</SelectItem>
                    <SelectItem value="lager">Lager</SelectItem>
                  </SelectContent>
                </Select>
                <Input className="h-9 flex-1 min-w-[120px]" placeholder="Nr. / Bezeichnung (z.B. Garage 7)" value={newNr} onChange={(e) => setNewNr(e.target.value)} />
                <Input className="h-9 w-24" type="number" placeholder="Miete" value={newRent} onChange={(e) => setNewRent(e.target.value)} />
                <Button onClick={addNew} disabled={busy === "new"}>
                  {busy === "new" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />} Hinzufügen
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Fertig</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UnitManageDialog;
