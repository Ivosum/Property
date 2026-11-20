import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2, UserPlus, Link2 } from "lucide-react";
import { toast } from "sonner";
import {
  insertPropertyWithUnits, getOwners, CANTONS, PROPERTY_TYPES, UNIT_TYPES, FLOOR_LABELS,
  type PropertyInput, type UnitInput,
} from "@/lib/pmData";
import OwnerDialog from "./OwnerDialog";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved?: (id: string) => void;
}

const NONE = "__none__";

// Spaltenraster der Einheiten-Schnelltabelle – füllt den breiten Dialog,
// schrumpft gleichmässig mit (kein horizontales Scrollen).
const UNIT_GRID = "grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,0.7fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.4fr)_auto]";

interface UnitRowDraft {
  key: number;
  unit_type: string;
  floor_label: string;
  unit_number: string;
  rooms: string;
  area: string;
  base_rent: string;
  nk: string;
  parentRef: number | null; // Zeilen-key einer Wohnung
}

let rowSeq = 1;

// Hebt eine Bezeichnung um eins an: "TOP1" -> "TOP2", "Keller 3" -> "Keller 4",
// "PP 5" -> "PP 6". Ohne Zahl: " 2" anhängen.
const nextLabel = (label: string): string => {
  const s = label.trim();
  if (!s) return "";
  const m = s.match(/^(.*?)(\d+)(\D*)$/);
  if (m) {
    const [, prefix, num, suffix] = m;
    return `${prefix}${Number(num) + 1}${suffix}`;
  }
  return `${s} 2`;
};

// Standard-Bezeichnung je Typ, wenn die Vorzeile leer ist
const defaultLabel = (unit_type: string): string =>
  unit_type === "keller" ? "Keller 1"
  : unit_type === "garage" ? "Garage 1"
  : unit_type === "aussenparkplatz" ? "PP 1"
  : unit_type === "lager" ? "Lager 1"
  : "TOP1";

// Erzeugt die nächste Zeile – übernimmt Typ/Stockwerk der letzten Zeile und
// zählt die Bezeichnung automatisch hoch (TOP1 -> TOP2 ...).
const newRow = (prev?: UnitRowDraft): UnitRowDraft => {
  const unit_type = prev?.unit_type ?? "wohnung";
  const floor_label = prev?.floor_label ?? "EG";
  const unit_number = prev?.unit_number?.trim()
    ? nextLabel(prev.unit_number)
    : defaultLabel(unit_type);
  return {
    key: rowSeq++, unit_type, floor_label, unit_number,
    rooms: "", area: "", base_rent: "", nk: "", parentRef: null,
  };
};

const empty: PropertyInput = {
  name: "", address: "", postal_code: "", city: "", canton: "SZ",
  property_type: "Mehrfamilienhaus", year_built: null, notes: "", owner_ref_id: null,
};

const PropertyDialog = ({ open, onOpenChange, onSaved }: Props) => {
  const [form, setForm] = useState<PropertyInput>(empty);
  const [ownerId, setOwnerId] = useState<string>(NONE);
  const [rows, setRows] = useState<UnitRowDraft[]>([]);
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof PropertyInput>(k: K, v: PropertyInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const { data: owners, refetch: refetchOwners } = useQuery({
    queryKey: ["pm-owners", open],
    enabled: open,
    queryFn: getOwners,
  });
  const ownerList = owners ?? [];
  // Wohnungen/Gewerbe als Kopplungsziel (für Keller/Parkplatz)
  const flatRows = rows.filter((r) => r.unit_type === "wohnung" || r.unit_type === "gewerbe");

  const reset = () => { setForm(empty); setOwnerId(NONE); setRows([]); };

  const updateRow = (key: number, patch: Partial<UnitRowDraft>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const removeRow = (key: number) =>
    setRows((rs) => rs.filter((r) => r.key !== key).map((r) => (r.parentRef === key ? { ...r, parentRef: null } : r)));

  const save = async () => {
    if (!form.name.trim() || !form.address.trim() || !form.city.trim() || !form.postal_code.trim()) {
      toast.error("Bitte Name, Adresse, PLZ und Ort ausfüllen.");
      return;
    }
    // Einheiten-Zeilen validieren (nur befüllte zählen)
    const filled = rows.filter((r) => r.unit_number.trim());
    for (const r of filled) {
      if (!r.base_rent || Number(r.base_rent) < 0) { toast.error(`Nettomiete fehlt bei „${r.unit_number}".`); return; }
    }

    // Zeilenindex-Mapping für Kopplung (parentRef = key -> Index in filled)
    const indexByKey = new Map(filled.map((r, i) => [r.key, i]));
    const units: Array<UnitInput & { parentRef?: number | null }> = filled.map((r) => {
      const isFlat = r.unit_type === "wohnung" || r.unit_type === "gewerbe";
      return {
        property_id: "", // wird in insertPropertyWithUnits gesetzt
        unit_number: r.unit_number.trim(),
        unit_type: r.unit_type,
        floor_label: r.floor_label || null,
        rooms: isFlat && r.rooms ? Number(r.rooms) : null,
        living_area_sqm: isFlat && r.area ? Number(r.area) : null,
        base_rent: Number(r.base_rent) || 0,
        utilities_advance: r.nk ? Number(r.nk) : 0,
        status: "vacant",
        parentRef: !isFlat && r.parentRef != null ? (indexByKey.get(r.parentRef) ?? null) : null,
      };
    });

    setSaving(true);
    try {
      const { propertyId, unitCount } = await insertPropertyWithUnits(
        { ...form, owner_ref_id: ownerId === NONE ? null : ownerId },
        units,
      );
      toast.success(unitCount > 0 ? `Liegenschaft + ${unitCount} Einheiten erstellt` : "Liegenschaft erstellt");
      onSaved?.(propertyId);
      onOpenChange(false);
      reset();
    } catch (e) {
      toast.error("Konnte nicht gespeichert werden. " + (e instanceof Error ? e.message : ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="w-[94vw] max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Liegenschaft hinzufügen</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name / Bezeichnung *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="z.B. Seestrasse 12" />
          </div>
          <div>
            <Label>Adresse *</Label>
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Strasse und Nr." />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>PLZ *</Label><Input value={form.postal_code} onChange={(e) => set("postal_code", e.target.value)} /></div>
            <div className="col-span-2"><Label>Ort *</Label><Input value={form.city} onChange={(e) => set("city", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Kanton *</Label>
              <Select value={form.canton} onValueChange={(v) => set("canton", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CANTONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Objekttyp</Label>
              <Select value={form.property_type ?? ""} onValueChange={(v) => set("property_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROPERTY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* Eigentümer */}
          <div>
            <Label>Eigentümer</Label>
            <div className="flex gap-2">
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger><SelectValue placeholder="– kein Eigentümer –" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>– kein Eigentümer –</SelectItem>
                  {ownerList.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={() => setOwnerOpen(true)}>
                <UserPlus className="w-4 h-4 mr-1" /> Neu
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Einmal erfassen, bei weiteren Liegenschaften nur noch auswählen.</p>
          </div>

          <div><Label>Baujahr</Label><Input type="number" value={form.year_built ?? ""} onChange={(e) => set("year_built", e.target.value ? Number(e.target.value) : null)} /></div>

          {/* Einheiten-Schnelltabelle (Mieterspiegel ohne Mieter) */}
          <div className="border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-medium text-sm">Einheiten (optional)</p>
                <p className="text-xs text-muted-foreground">Wohnungen, Keller, Parkplätze gleich miterfassen.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setRows((rs) => [...rs, newRow(rs[rs.length - 1])])}>
                <Plus className="w-4 h-4 mr-1" /> Zeile
              </Button>
            </div>

            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3 text-center">Noch keine Einheiten – auf „Zeile" klicken oder später hinzufügen.</p>
            ) : (
              <div className="space-y-2">
                {/* Kopfzeile */}
                <div className={`grid ${UNIT_GRID} gap-2 text-xs font-medium text-muted-foreground px-1`}>
                  <span>Typ</span><span>Stockwerk</span><span>Bezeichnung</span><span>Zi.</span><span>m²</span><span>Miete</span><span>NK</span><span>zu Wohnung</span><span></span>
                </div>
                {rows.map((r) => {
                  const isFlat = r.unit_type === "wohnung" || r.unit_type === "gewerbe";
                  return (
                    <div key={r.key} className={`grid ${UNIT_GRID} gap-2 items-center`}>
                      <Select value={r.unit_type} onValueChange={(v) => updateRow(r.key, { unit_type: v, parentRef: null })}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>{UNIT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select value={r.floor_label} onValueChange={(v) => updateRow(r.key, { floor_label: v })}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>{FLOOR_LABELS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input className="h-9" value={r.unit_number} onChange={(e) => updateRow(r.key, { unit_number: e.target.value })} placeholder={isFlat ? "TOP1" : "PP 5"} />
                      <Input className="h-9 no-spinner" type="number" step="0.5" value={r.rooms} disabled={!isFlat} onChange={(e) => updateRow(r.key, { rooms: e.target.value })} placeholder="3.5" />
                      <Input className="h-9 no-spinner" type="number" value={r.area} disabled={!isFlat} onChange={(e) => updateRow(r.key, { area: e.target.value })} placeholder="85" />
                      <Input className="h-9 no-spinner" type="number" value={r.base_rent} onChange={(e) => updateRow(r.key, { base_rent: e.target.value })} placeholder="1800" />
                      <Input className="h-9 no-spinner" type="number" value={r.nk} onChange={(e) => updateRow(r.key, { nk: e.target.value })} placeholder="250" />
                      {isFlat ? (
                        <span className="text-xs text-muted-foreground px-1">–</span>
                      ) : (
                        <Select value={r.parentRef != null ? String(r.parentRef) : NONE} onValueChange={(v) => updateRow(r.key, { parentRef: v === NONE ? null : Number(v) })}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="– keine –" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>– keine –</SelectItem>
                            {flatRows.filter((f) => f.unit_number.trim()).map((f) => (
                              <SelectItem key={f.key} value={String(f.key)}>
                                <span className="flex items-center gap-1"><Link2 className="w-3 h-3" />{[f.floor_label, f.unit_number].filter(Boolean).join(" ")}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeRow(r.key)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div><Label>Notizen</Label><Textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Abbrechen</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <OwnerDialog open={ownerOpen} onOpenChange={setOwnerOpen} onSaved={(id) => { refetchOwners(); setOwnerId(id); }} />
    </>
  );
};

export default PropertyDialog;
