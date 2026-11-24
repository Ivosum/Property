import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { renameFloor, FLOOR_LABELS } from "@/lib/pmData";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  propertyId: string;
  currentLabel: string | null;   // null = "Ohne Stockwerk"
  unitCount: number;
  onSaved?: () => void;
}

const FloorRenameDialog = ({ open, onOpenChange, propertyId, currentLabel, unitCount, onSaved }: Props) => {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setValue(currentLabel ?? ""); }, [open, currentLabel]);

  const save = async () => {
    const next = value.trim();
    const nextLabel = next === "" ? null : next;
    if (nextLabel === currentLabel) { onOpenChange(false); return; }
    setSaving(true);
    try {
      const n = await renameFloor(propertyId, currentLabel, nextLabel);
      toast.success(`Stockwerk umbenannt – ${n} ${n === 1 ? "Einheit" : "Einheiten"} angepasst`);
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Stockwerk umbenennen</DialogTitle>
          <DialogDescription>
            Das neue Stockwerk gilt für alle {unitCount} {unitCount === 1 ? "Einheit" : "Einheiten"} von
            {" "}„{currentLabel ?? "Ohne Stockwerk"}".
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Bezeichnung</Label>
            <Input value={value} onChange={(e) => setValue(e.target.value)}
              placeholder="z.B. EG, 1.OG, Hochparterre, Souterrain"
              onKeyDown={(e) => { if (e.key === "Enter") save(); }} autoFocus />
            <p className="text-xs text-muted-foreground mt-1">Leer lassen für „Ohne Stockwerk".</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FLOOR_LABELS.map((f) => (
              <button key={f} type="button" onClick={() => setValue(f)}
                className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                  value === f ? "bg-primary text-primary-foreground border-primary" : "hover:bg-secondary"
                }`}>
                {f}
              </button>
            ))}
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

export default FloorRenameDialog;
