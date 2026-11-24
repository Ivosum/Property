import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, Check, Printer } from "lucide-react";
import { toast } from "sonner";
import { getMyBrokerCode } from "@/lib/omData";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

const BrokerQrDialog = ({ open, onOpenChange }: Props) => {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const regUrl = code ? `${window.location.origin}/auth?ref=${code}` : "";

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getMyBrokerCode().then(setCode).finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (code && canvasRef.current) QRCode.toCanvas(canvasRef.current, regUrl, { width: 240, margin: 2 });
  }, [code, regUrl]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(regUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { toast.error("Konnte nicht kopieren."); }
  };

  const print = () => {
    if (!canvasRef.current) return;
    const img = canvasRef.current.toDataURL("image/png");
    const w = window.open("", "_blank", "width=600,height=800");
    if (!w) { toast.error("Bitte Pop-ups erlauben."); return; }
    w.document.write(`<html><head><title>Registrierung</title>
      <style>body{font-family:Arial;text-align:center;padding:40px;color:#111}
      h1{font-size:20px;margin:0 0 4px}h2{font-size:14px;font-weight:normal;color:#555;margin:0 0 24px}
      img{width:280px;height:280px}p{color:#555;margin-top:16px;font-size:13px}</style></head>
      <body onload="window.print()"><h1>Jetzt registrieren</h1>
      <h2>Ihr persönlicher Zugang über Ihren Makler</h2>
      <img src="${img}"/><p>QR-Code scannen und als Käufer oder Verkäufer registrieren.<br/>Code: ${code}</p></body></html>`);
    w.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-sm">
        <DialogHeader>
          <DialogTitle>Mein Werbe-QR</DialogTitle>
          <DialogDescription>
            Senden Sie diesen QR-Code an Kunden. Wer sich darüber registriert, wird fest Ihnen zugeordnet – wichtig für die Provision.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Lädt...</div>
        ) : !code ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Für Ihr Konto ist noch kein Makler-Code hinterlegt. Bitte wenden Sie sich an die Verwaltung.</p>
        ) : (
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="bg-white p-3 rounded-xl border"><canvas ref={canvasRef} /></div>
            <p className="text-sm">Code: <span className="font-mono font-semibold">{code}</span></p>
            <button onClick={copy} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Link kopiert" : "Registrierungs-Link kopieren"}
            </button>
          </div>
        )}
        {code && (
          <DialogFooter className="justify-center sm:justify-center">
            <Button variant="outline" onClick={print}><Printer className="w-4 h-4 mr-2" /> Drucken</Button>
            <Button onClick={() => onOpenChange(false)}>Fertig</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BrokerQrDialog;
