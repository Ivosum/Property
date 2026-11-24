import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  insertUnit, updateUnit, deleteUnit, setUnitParent, getUnits,
  UNIT_TYPES, FLOOR_LABELS,
} from "@/lib/pmData";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  propertyId: string;
  unit?: any;              // wenn gesetzt: Bearbeiten-Modus
  onSaved?: () => void;
}

const NONE = "__none__";

const UnitDialog = ({ open, onOpenChange, propertyId, unit, onSaved }: Props) => {
  const editing = !!unit;
  const [unitType, setUnitType] = useState("wohnung");
  const [floorLabel, setFloorLabel] = useState("EG");
  const [unitNumber, setUnitNumber] = useState("");
  const [rooms, setRooms] = useState("");
  const [area, setArea] = useState("");
  const [baseRent, setBaseRent] = useState("");
  const [nk, setNk] = useState("");
  const [parentId, setParentId] = useState<string>(NONE);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Felder aus bestehender Einheit laden (Edit) bzw. zurücksetzen (Neu)
  useEffect(() => {
    if (!open) return;
    if (unit) {
      setUnitType(unit.unit_type ?? "wohnung");
      setFloorLabel(unit.floor_label ?? "EG");
      setUnitNumber(unit.unit_number ?? "");
      setRooms(unit.rooms != null ? String(unit.rooms) : "");
      setArea(unit.living_area_sqm != null ? String(unit.living_area_sqm) : "");
      setBaseRent(unit.base_rent != null ? String(Number(unit.base_rent)) : "");
      setNk(unit.utilities_advance != null ? String(Number(unit.utilities_advance)) : "");
      setParentId(unit.parent_unit_id ?? NONE);
    } else {
      setUnitType("wohnung"); setFloorLabel("EG"); setUnitNumber("");
      setRooms(""); setArea(""); setBaseRent(""); setNk(""); setParentId(NONE);
    }
  }, [open, unit]);

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

  const save = async () => {
    if (!unitNumber.trim()) { toast.error("Bitte die Einheit benennen (z.B. TOP1, Keller 3, PP 5)."); return; }
    if (baseRent === "" || Number(baseRent) < 0) { toast.error("Bitte die Nettomiete angeben."); return; }
    setSaving(true);
    try {
      const nextParent = !isFlat && parentId !== NONE ? parentId : null;
      if (editing) {
        await updateUnit(unit.id, {
          unit_number: unitNumber.trim(),
          unit_type: unitType,
          floor_label: floorLabel || null,
          rooms: isFlat && rooms ? Number(rooms) : null,
          living_area_sqm: isFlat && area ? Number(area) : null,
          base_rent: Number(baseRent),
          utilities_advance: nk ? Number(nk) : 0,
        });
        // Kopplung separat aktualisieren (nur bei Nebeneinheiten relevant)
        if ((unit.parent_unit_id ?? null) !== nextParent) {
          await setUnitParent(unit.id, nextParent);
        }
        toast.success("Einheit aktualisiert");
      } else {
        await insertUnit({
          property_id: propertyId,
          unit_number: unitNumber.trim(),
          unit_type: unitType,
          floor_label: floorLabel || null,
          rooms: isFlat && rooms ? Number(rooms) : null,
          living_area_sqm: isFlat && area ? Number(area) : null,
          base_rent: Number(baseRent),
          utilities_advance: nk ? Number(nk) : 0,
          parent_unit_id: nextParent,
          status: "vacant",
        });
        toast.success("Einheit erstellt");
      }
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast.error("Konnte nicht gespeichert werden. " + (e instanceof Error ? e.message : ""));
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!unit) return;
    setDeleting(true);
    try {
      await deleteUnit(unit.id);
      toast.success("Einheit gelöscht");
      setConfirmDel(false);
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      const fk = /foreign key|violates|constraint|verletzt/i.test(msg);
      toast.error(fk
        ? "Diese Einheit ist noch mit einem Mietvertrag oder Buchungen verknüpft und kann nicht gelöscht werden."
        : "Konnte nicht gelöscht werden. " + msg);
    } finally {
      setDeleting(false);
    }
  };

  const flatList = (flats ?? []).filter((f) => f.id !== unit?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Einheit bearbeiten" : "Einheit hinzufügen"}</DialogTitle></DialogHeader>
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
        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2">
          {editing ? (
            <Button variant="ghost" className="text-destructive hover:text-destructive sm:mr-auto"
              onClick={() => setConfirmDel(true)} disabled={saving}>
              <Trash2 className="w-4 h-4 mr-2" />Löschen
            </Button>
          ) : <span />}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Abbrechen</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Speichern
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={confirmDel} onOpenChange={setConfirmDel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Einheit löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              „{unit?.unit_number}“ wird dauerhaft entfernt. Dies kann nicht rückgängig gemacht werden.
              Einheiten mit einem laufenden Mietvertrag lassen sich nicht löschen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => { e.preventDefault(); doDelete(); }} disabled={deleting}>
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default UnitDialog;
