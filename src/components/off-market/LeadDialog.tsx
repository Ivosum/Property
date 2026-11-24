import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createLead, updateLead, type OmLead } from "@/lib/omData";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lead?: OmLead | null;          // gesetzt = bearbeiten
  onSaved?: () => void;
}

const LeadDialog = ({ open, onOpenChange, lead, onSaved }: Props) => {
  const editing = !!lead;
  const [f, setF] = useState({ first_name: "", last_name: "", email: "", phone: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!open) return;
    setF({
      first_name: lead?.first_name ?? "", last_name: lead?.last_name ?? "",
      email: lead?.email ?? "", phone: lead?.phone ?? "", notes: lead?.notes ?? "",
    });
  }, [open, lead]);

  const save = async () => {
    if (!f.first_name.trim()) { toast.error("Bitte mindestens den Vornamen angeben."); return; }
    setSaving(true);
    try {
      if (editing) await updateLead(lead!.id, f);
      else await createLead(f);
      toast.success(editing ? "Kontakt aktualisiert" : "Kontakt erfasst");
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast.error("Konnte nicht gespeichert werden. " + (e instanceof Error ? e.message : ""));
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-lg">
        <DialogHeader><DialogTitle>{editing ? "Kontakt bearbeiten" : "Kunde erfassen"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Vorname *</Label><Input value={f.first_name} onChange={(e) => set("first_name", e.target.value)} /></div>
            <div><Label>Nachname</Label><Input value={f.last_name} onChange={(e) => set("last_name", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>E-Mail</Label><Input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></div>
            <div><Label>Telefon</Label><Input value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+41 ..." /></div>
          </div>
          <div><Label>Notiz</Label><Textarea rows={3} value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="z.B. sucht 4.5-Zi-Wohnung im Raum Zürich, Budget 1.2 Mio" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Abbrechen</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Speichern</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LeadDialog;
