import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  token: string | null;
  unitLabel: string;
  propertyName: string;
}

const UnitQrDialog = ({ open, onOpenChange, token, unitLabel, propertyName }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  const signupUrl = token ? `${window.location.origin}/mieter-anmeldung?token=${token}` : "";

  useEffect(() => {
    if (!open || !token || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, signupUrl, { width: 240, margin: 2 }, (err) => {
      if (err) toast.error("QR-Code konnte nicht erstellt werden.");
    });
  }, [open, token, signupUrl]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `QR_${propertyName}_${unitLabel}`.replace(/[^\w\-]+/g, "_") + ".png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(signupUrl);
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    } catch { toast.error("Link konnte nicht kopiert werden."); }
  };

  const print = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = canvas.toDataURL("image/png");
    const w = window.open("", "_blank", "width=600,height=800");
    if (!w) { toast.error("Bitte Pop-ups erlauben, um zu drucken."); return; }
    w.document.write(`
      <html><head><title>Mieterportal-Anmeldung</title>
      <style>
        body{font-family:Arial,sans-serif;text-align:center;padding:40px;color:#111}
        h1{font-size:20px;margin:0 0 4px} h2{font-size:15px;font-weight:normal;color:#555;margin:0 0 24px}
        img{width:260px;height:260px} p{font-size:13px;color:#555;margin-top:20px}
        .box{display:inline-block;border:1px solid #ddd;border-radius:12px;padding:28px 36px}
      </style></head>
      <body onload="window.print()">
        <div class="box">
          <h1>${propertyName}</h1>
          <h2>${unitLabel} · Mieterportal</h2>
          <img src="${img}" />
          <p>Scannen Sie den QR-Code mit Ihrem Smartphone,<br/>um Ihren Zugang zum Mieterportal zu beantragen.</p>
        </div>
      </body></html>`);
    w.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>QR-Code · {unitLabel}</DialogTitle>
          <DialogDescription>
            Der Mieter scannt diesen Code, trägt seine Daten ein und beantragt den Portalzugang.
            Sie bestätigen die Anfrage anschliessend in der Verwaltung.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="bg-white p-3 rounded-xl border">
            <canvas ref={canvasRef} />
          </div>
          <button onClick={copyLink} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Link kopiert" : "Anmelde-Link kopieren"}
          </button>
        </div>
        <DialogFooter className="flex-row justify-center gap-2 sm:justify-center">
          <Button variant="outline" onClick={download}><Download className="w-4 h-4 mr-2" />PNG</Button>
          <Button variant="outline" onClick={print}><Printer className="w-4 h-4 mr-2" />Drucken</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UnitQrDialog;
