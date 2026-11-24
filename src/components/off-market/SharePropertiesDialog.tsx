import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Copy, Check, QrCode, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";
import {
  getMyProperties, recordLeadProperties, formatCHF, PROPERTY_TYPE_LABEL, type OmProperty,
} from "@/lib/omData";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  leadId?: string | null;        // optional: an welchen Lead gesendet wird
  leadName?: string;
}

const exposeUrl = (token: string) => `${window.location.origin}/immobilie/${token}`;

const SharePropertiesDialog = ({ open, onOpenChange, leadId, leadName }: Props) => {
  const [props, setProps] = useState<OmProperty[]>([]);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [qrFor, setQrFor] = useState<OmProperty | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!open) return;
    setSel(new Set()); setQrFor(null);
    setLoading(true);
    getMyProperties().then(setProps).finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (qrFor?.share_token && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, exposeUrl(qrFor.share_token), { width: 220, margin: 2 });
    }
  }, [qrFor]);

  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const copyLink = async (token: string) => {
    try { await navigator.clipboard.writeText(exposeUrl(token)); setCopied(token); setTimeout(() => setCopied(null), 1500); }
    catch { toast.error("Link konnte nicht kopiert werden."); }
  };

  // Native Teilen (Handy) für die ausgewählten Immobilien
  const shareSelected = async () => {
    const chosen = props.filter((p) => sel.has(p.id) && p.share_token);
    if (chosen.length === 0) { toast.error("Bitte mindestens eine Immobilie auswählen."); return; }
    if (leadId) { try { await recordLeadProperties(leadId, chosen.map((p) => p.id)); } catch { /* */ } }
    const text = chosen.map((p) => `${p.title} – ${p.city}, ${formatCHF(Number(p.price), p.currency)}\n${exposeUrl(p.share_token!)}`).join("\n\n");
    if (navigator.share) {
      try { await navigator.share({ title: "Immobilien", text }); return; } catch { /* abgebrochen */ }
    }
    try { await navigator.clipboard.writeText(text); toast.success("Links kopiert – zum Senden einfügen"); }
    catch { toast.error("Konnte nicht teilen."); }
  };

  const printQr = (p: OmProperty) => {
    if (!p.share_token) return;
    QRCode.toDataURL(exposeUrl(p.share_token), { width: 300, margin: 2 }).then((img) => {
      const w = window.open("", "_blank", "width=600,height=800");
      if (!w) { toast.error("Bitte Pop-ups erlauben."); return; }
      w.document.write(`<html><head><title>${p.title}</title>
        <style>body{font-family:Arial;text-align:center;padding:40px;color:#111}
        h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;font-weight:normal;color:#555;margin:0 0 24px}
        img{width:300px;height:300px}p{color:#555;margin-top:16px}</style></head>
        <body onload="window.print()"><h1>${p.title}</h1>
        <h2>${p.city} · ${formatCHF(Number(p.price), p.currency)}</h2>
        <img src="${img}"/><p>Scannen für alle Eckdaten</p></body></html>`);
      w.document.close();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Immobilien senden{leadName ? ` an ${leadName}` : ""}</DialogTitle>
          <DialogDescription>
            Wählen Sie eine oder mehrere Immobilien. Geteilt werden nur die Eckdaten (Grösse, Ort, Preis) mit QR-Code.
          </DialogDescription>
        </DialogHeader>

        {qrFor ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <p className="font-medium">{qrFor.title}</p>
            <p className="text-sm text-muted-foreground">{qrFor.city} · {formatCHF(Number(qrFor.price), qrFor.currency)}</p>
            <div className="bg-white p-3 rounded-xl border"><canvas ref={canvasRef} /></div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => copyLink(qrFor.share_token!)}>
                {copied === qrFor.share_token ? <Check className="w-4 h-4 mr-1 text-green-600" /> : <Copy className="w-4 h-4 mr-1" />} Link
              </Button>
              <Button variant="outline" size="sm" onClick={() => printQr(qrFor)}><Printer className="w-4 h-4 mr-1" /> Drucken</Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setQrFor(null)}>← Zurück zur Auswahl</Button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Lädt...</div>
        ) : props.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Sie betreuen noch keine Immobilien. Legen Sie zuerst eine Immobilie an.</p>
        ) : (
          <div className="space-y-2">
            {props.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg border">
                <Checkbox checked={sel.has(p.id)} onCheckedChange={() => toggle(p.id)} />
                <div className="flex-1 min-w-0" onClick={() => toggle(p.id)} role="button">
                  <p className="font-medium text-sm truncate">{p.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {PROPERTY_TYPE_LABEL[p.property_type] ?? p.property_type} · {p.city} ({p.canton})
                    {p.living_area_sqm ? ` · ${p.living_area_sqm} m²` : ""}
                    {p.rooms ? ` · ${p.rooms} Zi.` : ""}
                  </p>
                </div>
                <span className="text-sm font-medium shrink-0 tabular-nums whitespace-nowrap">{formatCHF(Number(p.price), p.currency)}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="QR anzeigen"
                  onClick={() => setQrFor(p)} disabled={!p.share_token}>
                  <QrCode className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {!qrFor && !loading && props.length > 0 && (
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <p className="text-xs text-muted-foreground sm:mr-auto self-center">{sel.size} ausgewählt</p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Schliessen</Button>
            <Button onClick={shareSelected} disabled={sel.size === 0}>
              <Share2 className="w-4 h-4 mr-2" /> Senden / Teilen
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SharePropertiesDialog;
