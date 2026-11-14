import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { insertUnit } from "@/lib/pmData";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  propertyId: string;
  onSaved?: () => void;
}

const UnitDialog = ({ open, onOpenChange, propertyId, onSaved }: Props) => {
  const [unitNumber, setUnitNumber] = useState("");
  const [floor, setFloor] = useState("");
  const [rooms, setRooms] = useState("");
  const [area, setArea] = useState("");
  const [baseRent, setBaseRent] = useState("");
  const [nk, setNk] = useState("");
  const [parking, setParking] = useState(false);
  const [storage, setStorage] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setUnitNumber(""); setFloor(""); setRooms(""); setArea("");
    setBaseRent(""); setNk(""); setParking(false); setStorage(false);
  };

  const save = async () => {
    if (!unitNumber.trim()) { toast.error("Bitte die Einheit benennen (z.B. 2.OG links)."); return; }
    if (!baseRent || Number(baseRent) <= 0) { toast.error("Bitte die Nettomiete angeben."); return; }
    setSaving(true);
    try {
      await insertUnit({
        property_id: propertyId,
        unit_number: unitNumber.trim(),
        floor: floor ? Number(floor) : null,
        rooms: rooms ? Number(rooms) : null,
        living_area_sqm: area ? Number(area) : null,
        base_rent: Number(baseRent),
        utilities_advance: nk ? Number(nk) : 0,
        has_parking: parking,
        has_storage: storage,
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

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Einheit hinzufügen</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Bezeichnung *</Label>
            <Input value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)} placeholder="z.B. 2.OG links, EG" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Stockwerk</Label><Input type="number" value={floor} onChange={(e) => setFloor(e.target.value)} /></div>
            <div><Label>Zimmer</Label><Input type="number" step="0.5" value={rooms} onChange={(e) => setRooms(e.target.value)} placeholder="3.5" /></div>
            <div><Label>Fläche m²</Label><Input type="number" value={area} onChange={(e) => setArea(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nettomiete CHF *</Label><Input type="number" value={baseRent} onChange={(e) => setBaseRent(e.target.value)} /></div>
            <div><Label>NK-Akonto CHF</Label><Input type="number" value={nk} onChange={(e) => setNk(e.target.value)} /></div>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={parking} onChange={(e) => setParking(e.target.checked)} /> Parkplatz
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={storage} onChange={(e) => setStorage(e.target.checked)} /> Keller/Estrich
            </label>
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
