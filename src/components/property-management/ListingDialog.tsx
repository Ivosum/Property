import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import {
  getUnits, insertListing, updateListing, uploadListingImage,
  OBJECT_TYPES, LISTING_FEATURES, UNIT_TYPE_LABEL, type ListingInput,
} from "@/lib/pmData";

const sb = supabase as any;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved?: (listingId: string) => void;
}

const empty: ListingInput = {
  unit_id: "", title: "", description: "", rent_display: 0, utilities: 0, deposit: 0,
  rooms: null, living_area: null, floor_label: "", object_type: "wohnung",
  available_from: "", address_line: "", postal_code: "", city: "",
  contact_email: "", contact_phone: "", features: [], images: [],
};

const ListingDialog = ({ open, onOpenChange, onSaved }: Props) => {
  const [properties, setProperties] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [propertyId, setPropertyId] = useState("");
  const [form, setForm] = useState<ListingInput>(empty);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [listingId, setListingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(empty); setPropertyId(""); setUnits([]); setListingId(null);
    sb.from("pm_properties").select("id, name, address, postal_code, city").order("name").then(({ data }: any) => setProperties(data ?? []));
  }, [open]);

  const set = <K extends keyof ListingInput>(k: K, v: ListingInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const onPickProperty = async (pid: string) => {
    setPropertyId(pid);
    const p = properties.find((x) => x.id === pid);
    const us = await getUnits(pid);
    // nur vermietbare Einheiten (Wohnung/Gewerbe/Parkplatz)
    setUnits(us);
    set("property_id", pid);
    set("address_line", p?.address ?? "");
    set("postal_code", p?.postal_code ?? "");
    set("city", p?.city ?? "");
  };

  // Einheit wählen -> Objektdaten automatisch übernehmen
  const onPickUnit = (uid: string) => {
    const u = units.find((x) => x.id === uid);
    if (!u) return;
    const p = properties.find((x) => x.id === propertyId);
    setForm((f) => ({
      ...f,
      unit_id: uid,
      rooms: u.rooms ?? null,
      living_area: u.living_area_sqm ?? null,
      floor_label: u.floor_label ?? "",
      rent_display: Number(u.base_rent) || f.rent_display,
      utilities: Number(u.utilities_advance) || 0,
      object_type: u.unit_type === "gewerbe" ? "gewerbe" : u.unit_type === "garage" || u.unit_type === "aussenparkplatz" ? "parkplatz" : "wohnung",
      title: f.title || `${UNIT_TYPE_LABEL[u.unit_type] ?? "Wohnung"} ${[u.floor_label, u.unit_number].filter(Boolean).join(" ")} in ${p?.city ?? ""}`.trim(),
    }));
  };

  const ensureListing = async (): Promise<string> => {
    if (listingId) return listingId;
    const id = await insertListing(form);
    setListingId(id);
    return id;
  };

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    if (!form.unit_id) { toast.error("Bitte zuerst Einheit wählen"); return; }
    setUploading(true);
    try {
      const id = await ensureListing();
      const urls: string[] = [];
      for (const f of files) urls.push(await uploadListingImage(f, id));
      set("images", [...(form.images ?? []), ...urls]);
    } catch (err) {
      toast.error("Upload fehlgeschlagen. " + (err instanceof Error ? err.message : ""));
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (url: string) => set("images", (form.images ?? []).filter((u) => u !== url));

  const toggleFeature = (f: string) =>
    set("features", (form.features ?? []).includes(f) ? (form.features ?? []).filter((x) => x !== f) : [...(form.features ?? []), f]);

  const save = async () => {
    if (!form.unit_id || !form.title) { toast.error("Einheit und Titel nötig"); return; }
    setSaving(true);
    try {
      let id = listingId;
      if (id) await updateListing(id, form);
      else id = await insertListing(form);
      toast.success("Inserat gespeichert");
      onSaved?.(id);
      onOpenChange(false);
    } catch (e) {
      toast.error("Konnte nicht gespeichert werden. " + (e instanceof Error ? e.message : ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[94vw] max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neues Inserat</DialogTitle>
          <DialogDescription>Liegenschaft und Einheit wählen – die Objektdaten werden übernommen. Danach veröffentlichen Sie auf Homegate und Flatfox.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Schritt 1: Objekt wählen */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Liegenschaft</Label>
              <Select value={propertyId} onValueChange={onPickProperty}>
                <SelectTrigger><SelectValue placeholder="Liegenschaft wählen" /></SelectTrigger>
                <SelectContent>
                  {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name || p.address}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Einheit</Label>
              <Select value={form.unit_id} onValueChange={onPickUnit} disabled={!propertyId}>
                <SelectTrigger><SelectValue placeholder={propertyId ? "Einheit wählen" : "zuerst Liegenschaft"} /></SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {[u.floor_label, u.unit_number].filter(Boolean).join(" ")} · {UNIT_TYPE_LABEL[u.unit_type] ?? u.unit_type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bilder */}
          <div>
            <Label>Bilder</Label>
            <div className="mt-1 grid grid-cols-3 sm:grid-cols-4 gap-2">
              {(form.images ?? []).map((url) => (
                <div key={url} className="relative aspect-video rounded-lg overflow-hidden border group">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => removeImage(url)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className={`aspect-video rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-secondary/40 text-muted-foreground ${!form.unit_id ? "opacity-50 pointer-events-none" : ""}`}>
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
                <span className="text-xs">Hochladen</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={onFiles} />
              </label>
            </div>
          </div>

          {/* Text */}
          <div>
            <Label>Titel</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Helle 3.5-Zimmer-Wohnung mit Balkon" />
          </div>
          <div>
            <Label>Beschreibung</Label>
            <Textarea rows={4} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="Lage, Zustand, Besonderheiten …" />
          </div>

          {/* Eckdaten */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><Label className="text-xs">Objekttyp</Label>
              <Select value={form.object_type} onValueChange={(v) => set("object_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{OBJECT_TYPES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Zimmer</Label><Input type="number" step="0.5" value={form.rooms ?? ""} onChange={(e) => set("rooms", e.target.value ? Number(e.target.value) : null)} /></div>
            <div><Label className="text-xs">Fläche m²</Label><Input type="number" value={form.living_area ?? ""} onChange={(e) => set("living_area", e.target.value ? Number(e.target.value) : null)} /></div>
            <div><Label className="text-xs">Stockwerk</Label><Input value={form.floor_label ?? ""} onChange={(e) => set("floor_label", e.target.value)} /></div>
            <div><Label className="text-xs">Nettomiete</Label><Input type="number" value={form.rent_display || ""} onChange={(e) => set("rent_display", Number(e.target.value) || 0)} /></div>
            <div><Label className="text-xs">Nebenkosten</Label><Input type="number" value={form.utilities ?? ""} onChange={(e) => set("utilities", e.target.value ? Number(e.target.value) : null)} /></div>
            <div><Label className="text-xs">Kaution</Label><Input type="number" value={form.deposit ?? ""} onChange={(e) => set("deposit", e.target.value ? Number(e.target.value) : null)} /></div>
            <div><Label className="text-xs">Verfügbar ab</Label><Input type="date" value={form.available_from ?? ""} onChange={(e) => set("available_from", e.target.value)} /></div>
          </div>

          {/* Merkmale */}
          <div>
            <Label className="text-xs">Ausstattung</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {LISTING_FEATURES.map((f) => {
                const on = (form.features ?? []).includes(f);
                return (
                  <button key={f} onClick={() => toggleFeature(f)} className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${on ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-secondary/50"}`}>
                    {f}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Kontakt */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label className="text-xs">Kontakt E-Mail</Label><Input type="email" value={form.contact_email ?? ""} onChange={(e) => set("contact_email", e.target.value)} /></div>
            <div><Label className="text-xs">Kontakt Telefon</Label><Input value={form.contact_phone ?? ""} onChange={(e) => set("contact_phone", e.target.value)} /></div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button onClick={save} disabled={saving || uploading}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Inserat speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ListingDialog;
