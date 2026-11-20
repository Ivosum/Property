import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, Check, X, FileCode2 } from "lucide-react";
import { toast } from "sonner";
import { importCamtForProperty, type CamtMatchResult } from "@/lib/pmData";

const sb = supabase as any;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultPropertyId?: string | null;
  onDone?: () => void;
}

const formatCHF = (n: number) =>
  new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF", maximumFractionDigits: 2 }).format(n);

const CamtImportDialog = ({ open, onOpenChange, defaultPropertyId, onDone }: Props) => {
  const [props, setProps] = useState<{ id: string; name: string }[]>([]);
  const [propertyId, setPropertyId] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [xml, setXml] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CamtMatchResult | null>(null);

  useEffect(() => {
    if (!open) return;
    setResult(null); setXml(""); setFileName("");
    sb.from("pm_properties").select("id, name, address, city").order("name").then(({ data }: any) => {
      const list = (data ?? []).map((p: any) => ({ id: p.id, name: p.name || [p.address, p.city].filter(Boolean).join(", ") || "Liegenschaft" }));
      setProps(list);
      setPropertyId(defaultPropertyId || list[0]?.id || "");
    });
  }, [open, defaultPropertyId]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setXml(await f.text());
    setResult(null);
  };

  const run = async () => {
    if (!propertyId || !xml) { toast.error("Liegenschaft und Datei wählen"); return; }
    setRunning(true);
    try {
      const r = await importCamtForProperty(propertyId, xml, fileName);
      setResult(r);
      toast.success(`${r.matched} von ${r.total} Gutschriften zugeordnet`);
      onDone?.();
    } catch (err) {
      toast.error("Import fehlgeschlagen. " + (err instanceof Error ? err.message : ""));
    } finally {
      setRunning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-primary" /> Kontoauszug importieren (camt.053/054)
          </DialogTitle>
          <DialogDescription>
            Bank-Auszug hochladen – Gutschriften werden automatisch über die QR-Referenz den offenen Mieten zugeordnet und verbucht.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Liegenschaft</Label>
            <Select value={propertyId} onValueChange={setPropertyId}>
              <SelectTrigger><SelectValue placeholder="Liegenschaft wählen" /></SelectTrigger>
              <SelectContent>
                {props.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>camt-Datei (.xml)</Label>
            <label className="mt-1 flex items-center justify-center gap-2 border-2 border-dashed rounded-lg py-6 cursor-pointer hover:bg-secondary/40 transition-colors">
              <Upload className="w-4 h-4" />
              <span className="text-sm">{fileName || "Datei auswählen (camt.053 / camt.054)"}</span>
              <input type="file" accept=".xml,text/xml,application/xml" className="hidden" onChange={onFile} />
            </label>
          </div>

          {result && (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-4 text-sm flex-wrap">
                <span className="flex items-center gap-1 text-green-600"><Check className="w-4 h-4" />{result.matched} Miete verbucht</span>
                <span className="flex items-center gap-1 text-blue-600">{result.suggested} Buchungsvorschläge</span>
                <span className="flex items-center gap-1 text-muted-foreground"><X className="w-4 h-4" />{result.unmatched} offen</span>
                <span className="text-muted-foreground ml-auto">{result.total} Bewegungen total</span>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {result.details.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-secondary/30">
                    <div className="min-w-0">
                      <span className="font-medium">{formatCHF(d.amount)}</span>
                      <span className="text-muted-foreground"> · {d.debtor || "Unbekannt"}</span>
                      {d.reference && <span className="text-xs text-muted-foreground block truncate">Ref: {d.reference}</span>}
                    </div>
                    {d.status === "matched" ? (
                      <span className="text-xs text-green-700 whitespace-nowrap">→ {d.tenant} ✓</span>
                    ) : d.status === "suggested" ? (
                      <span className="text-xs text-blue-600 whitespace-nowrap">→ Vorschlag</span>
                    ) : (
                      <span className="text-xs text-amber-600 whitespace-nowrap">nicht zugeordnet</span>
                    )}
                  </div>
                ))}
              </div>
              {result.suggested > 0 && (
                <p className="text-xs text-muted-foreground">
                  Für Belastungen und nicht zugeordnete Eingänge wurden Buchungsvorschläge erstellt. Diese finden Sie in der Buchhaltung der Liegenschaft unter „Buchungsvorschläge" – dort nur noch bestätigen oder Konto anpassen.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{result ? "Schliessen" : "Abbrechen"}</Button>
          {!result && (
            <Button onClick={run} disabled={running || !xml || !propertyId}>
              {running && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Abgleichen & verbuchen
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CamtImportDialog;
