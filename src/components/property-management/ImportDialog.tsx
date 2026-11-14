import { useCallback, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Upload, FileSpreadsheet, Loader2, Download, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  IMPORT_SCHEMAS, parseWorkbook, autoMap, applyMapping, downloadTemplate,
  type ParsedSheet, type MappedRow,
} from "@/lib/importMapping";

type Schema = "properties" | "tenants";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  schema: Schema;
  /** called with validated rows (only rows without errors) */
  onImport: (rows: Record<string, string | number | null>[]) => Promise<number>;
  onDone?: () => void;
}

const NONE = "__none__";

const ImportDialog = ({ open, onOpenChange, schema, onImport, onDone }: Props) => {
  const fields = IMPORT_SCHEMAS[schema];
  const fileRef = useRef<HTMLInputElement>(null);
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [importing, setImporting] = useState(false);
  const [parsing, setParsing] = useState(false);

  const reset = () => { setSheet(null); setMapping({}); };

  const handleFile = useCallback(async (file: File) => {
    setParsing(true);
    try {
      const parsed = await parseWorkbook(file);
      if (!parsed.rows.length) throw new Error("Keine Datenzeilen gefunden.");
      setSheet(parsed);
      setMapping(autoMap(parsed.headers, fields));
    } catch (e) {
      toast.error("Datei konnte nicht gelesen werden. " + (e instanceof Error ? e.message : ""));
      reset();
    } finally {
      setParsing(false);
    }
  }, [fields]);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  };

  const preview: MappedRow[] = sheet ? applyMapping(sheet, fields, mapping) : [];
  const validRows = preview.filter((r) => r.errors.length === 0);
  const invalidCount = preview.length - validRows.length;

  const doImport = async () => {
    if (!validRows.length) { toast.error("Keine gültigen Zeilen zum Importieren."); return; }
    setImporting(true);
    try {
      const n = await onImport(validRows.map((r) => r.values));
      toast.success(`${n} ${schema === "properties" ? "Liegenschaften" : "Mieter"} importiert`);
      onDone?.();
      onOpenChange(false);
      reset();
    } catch (e) {
      toast.error("Import fehlgeschlagen. " + (e instanceof Error ? e.message : ""));
    } finally {
      setImporting(false);
    }
  };

  const title = schema === "properties" ? "Liegenschaften importieren" : "Mieter importieren";

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" /> {title}
          </DialogTitle>
        </DialogHeader>

        {!sheet ? (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer hover:bg-secondary/40 transition-colors"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
            >
              {parsing ? (
                <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
              )}
              <p className="font-medium">Excel- oder CSV-Datei hierher ziehen</p>
              <p className="text-sm text-muted-foreground mt-1">oder klicken zum Auswählen (.xlsx, .xls, .csv)</p>
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFileInput} />
            <div className="flex items-center justify-between rounded-lg bg-secondary/40 p-4">
              <div className="text-sm">
                <p className="font-medium">Keine passende Tabelle?</p>
                <p className="text-muted-foreground">Nutzen Sie unsere Vorlage – die Spalten werden automatisch erkannt.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => downloadTemplate(schema)}>
                <Download className="w-4 h-4 mr-2" /> Vorlage herunterladen
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Mapping */}
            <div>
              <p className="font-medium mb-2">Spalten zuordnen</p>
              <p className="text-sm text-muted-foreground mb-3">
                Automatisch erkannt – bei Bedarf anpassen. ({sheet.rows.length} Zeilen gefunden)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {fields.map((f) => (
                  <div key={f.key}>
                    <Label className="text-xs">
                      {f.label}{f.required && <span className="text-red-500"> *</span>}
                    </Label>
                    <Select
                      value={mapping[f.key] ?? NONE}
                      onValueChange={(v) => setMapping((m) => ({ ...m, [f.key]: v === NONE ? null : v }))}
                    >
                      <SelectTrigger className="h-9"><SelectValue placeholder="– nicht zuordnen –" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>– nicht zuordnen –</SelectItem>
                        {sheet.headers.map((h) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div>
              <div className="flex items-center gap-4 mb-2 text-sm">
                <span className="flex items-center gap-1 text-green-700">
                  <CheckCircle2 className="w-4 h-4" /> {validRows.length} gültig
                </span>
                {invalidCount > 0 && (
                  <span className="flex items-center gap-1 text-orange-600">
                    <AlertTriangle className="w-4 h-4" /> {invalidCount} unvollständig (werden übersprungen)
                  </span>
                )}
              </div>
              <div className="border rounded-lg overflow-auto max-h-56">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/50 sticky top-0">
                    <tr>
                      {fields.map((f) => <th key={f.key} className="text-left py-2 px-2 font-medium whitespace-nowrap">{f.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 50).map((r, i) => (
                      <tr key={i} className={`border-t ${r.errors.length ? "bg-orange-50" : ""}`}>
                        {fields.map((f) => (
                          <td key={f.key} className="py-1.5 px-2 whitespace-nowrap">
                            {r.values[f.key] === null || r.values[f.key] === "" ? (
                              <span className={f.required ? "text-red-400" : "text-muted-foreground"}>–</span>
                            ) : String(r.values[f.key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.length > 50 && (
                <p className="text-xs text-muted-foreground mt-1">… und {preview.length - 50} weitere Zeilen</p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {sheet && <Button variant="ghost" onClick={reset} disabled={importing}>Andere Datei</Button>}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>Abbrechen</Button>
          {sheet && (
            <Button onClick={doImport} disabled={importing || !validRows.length}>
              {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              {validRows.length} importieren
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportDialog;
