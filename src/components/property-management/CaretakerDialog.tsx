import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updatePropertyCaretaker } from "@/lib/pmData";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  propertyId: string;
  current: { caretaker_name?: string | null; caretaker_phone?: string | null; caretaker_email?: string | null };
  onSaved?: () => void;
}

const CaretakerDialog = ({ open, onOpenChange, propertyId, current, onSaved }: Props) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(current.caretaker_name ?? "");
    setPhone(current.caretaker_phone ?? "");
    setEmail(current.caretaker_email ?? "");
  }, [open, current]);

  const save = async () => {
    setSaving(true);
    try {
      await updatePropertyCaretaker(propertyId, {
        caretaker_name: name.trim() || null,
        caretaker_phone: phone.trim() || null,
        caretaker_email: email.trim() || null,
      });
      toast.success("Hauswart gespeichert");
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast.error("Konnte nicht gespeichert werden. " + (e instanceof Error ? e.message : ""));
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Hauswart / Abwart</DialogTitle>
          <DialogDescription>Wird den Mietern dieser Liegenschaft im Mieterportal als Kontakt angezeigt.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Vor- und Nachname" /></div>
          <div><Label>Telefon</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+41 ..." /></div>
          <div><Label>E-Mail (optional)</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Abbrechen</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Speichern</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CaretakerDialog;
