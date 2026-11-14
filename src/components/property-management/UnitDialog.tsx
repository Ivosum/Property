import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { insertUnit, getUnits, UNIT_TYPES, FLOOR_LABELS } from "@/lib/pmData";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  propertyId: string;
  onSaved?: () => void;
}

const NONE = "__none__";

const UnitDialog = ({ open, onOpenChange, propertyId, onSaved }: Props) => {
  const [unitType, setUnitType] = useState("wohnung");
  const [floorLabel, setFloorLabel] = useState("EG");
  const [unitNumber, setUnitNumber] = useState("");
  const [rooms, setRooms] = useState("");
  const [area, setArea] = useState("");
  const [baseRent, setBaseRent] = useState("");
  const [nk, setNk] = useState("");
  const [parentId, setParentId] = useState<string>(NONE);
  const [saving, setSaving] = useState(false);

  // vorhandene Wohnungen für die Kopplung (Keller/Parking zu Wohnung)
  const { data: flats } = useQuery({
    queryKey: ["unit-flats", propertyId, open],
    enabled: open,
    queryFn: async () => {
      const units = await getUnits(propertyId);
      return units.filter((u) => u.unit_type === "wohnung" || u.unit_type === "gewerbe");
    },
  });

  const isFlat = unitType === "wohnung" || unitType === "gewerbe";

  const reset = () => {
    setUnitType("wohnung"); setFloorLabel("EG"); setUnitNumber("");
    setRooms(""); setArea(""); setBaseRent(""); setNk(""); setParentId(NONE);
  };

  const save = async () => {
    if (!unitNumber.trim()) { toast.error("Bitte die Einheit benennen (z.B. TOP1, Keller 3, PP 5)."); return; }
    if (!baseRent || Number(baseRent) < 0) { toast.error("Bitte die Nettomiete angeben."); return; }
    setSaving(true);
    try {
      await insertUnit({
        property_id: propertyId,
        unit_number: unitNumber.trim(),
        unit_type: unitType,
        floor_label: floorLabel || null,
        rooms: isFlat && rooms ? Number(rooms) : null,
        living_area_sqm: isFlat && area ? Number(area) : null,
        base_rent: Number(baseRent),
        utilities_advance: nk ? Number(nk) : 0,
        parent_unit_id: !isFlat && parentId !== NONE ? parentId : null,
        status: "vacant",
      });
      toast.success("Einheit erstellt");
      onSaved?.();
      onOpenChange(false);
      reset();
    } catch (e) {
      toast.error("Konnte nicht gespeichert werden. " + (e instanceof Error ? e.message : ""));
    } finally {
      setSaving(false);
    }
  };

  const flatList = flats ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Einheit hinzufügen</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Typ *</Label>
              <Select value={unitType} onValueChange={setUnitType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{UNIT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Stockwerk</Label>
              <Select value={floorLabel} onValueChange={setFloorLabel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FLOOR_LABELS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Bezeichnung / Nr. *</Label>
            <Input value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)}
              placeholder={isFlat ? "z.B. TOP1, 2.OG links" : "z.B. Keller 3, PP 5, Garage A"} />
          </div>

          {isFlat ? (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Zimmer</Label><Input type="number" step="0.5" value={rooms} onChange={(e) => setRooms(e.target.value)} placeholder="3.5" /></div>
              <div><Label>Wohnfläche m²</Label><Input type="number" value={area} onChange={(e) => setArea(e.target.value)} /></div>
            </div>
          ) : (
            <div>
              <Label>Gehört zu Wohnung (optional)</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger><SelectValue placeholder="– keine Kopplung –" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>– keine Kopplung –</SelectItem>
                  {flatList.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {[f.floor_label, f.unit_number].filter(Boolean).join(" ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Keller/Parkplatz einer Wohnung zuordnen – oder frei lassen für separate Vermietung.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nettomiete CHF *</Label><Input type="number" value={baseRent} onChange={(e) => setBaseRent(e.target.value)} /></div>
            <div><Label>NK-Akonto CHF</Label><Input type="number" value={nk} onChange={(e) => setNk(e.target.value)} /></div>
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

export default UnitDialog;
