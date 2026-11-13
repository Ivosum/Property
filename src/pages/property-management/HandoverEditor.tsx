import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Plus, Camera, Trash2, Loader2, Save, CheckCircle, LogIn, LogOut, ImageIcon, X,
} from "lucide-react";
import { toast } from "sonner";

type Condition = "good" | "minor_defect" | "defect" | "missing";

interface ItemRow {
  id: string;
  room: string;
  element: string;
  condition: Condition;
  description: string | null;
  cost_bearer: string | null;
  sort_order: number;
}

interface PhotoRow {
  id: string;
  item_id: string | null;
  storage_path: string;
  signedUrl?: string;
}

const conditionOptions: { value: Condition; label: string; cls: string }[] = [
  { value: "good", label: "In Ordnung", cls: "bg-green-100 text-green-700 border-green-300" },
  { value: "minor_defect", label: "Kleiner Mangel", cls: "bg-amber-100 text-amber-700 border-amber-300" },
  { value: "defect", label: "Mangel", cls: "bg-destructive/15 text-destructive border-destructive/40" },
  { value: "missing", label: "Fehlt", cls: "bg-muted text-muted-foreground border-border" },
];

const roomPresets = [
  "Eingang / Korridor", "Wohnzimmer", "Küche", "Bad / WC", "Schlafzimmer",
  "Zimmer 2", "Zimmer 3", "Balkon / Terrasse", "Keller", "Estrich / Dachboden", "Aussenbereich",
];

const BUCKET = "handover-photos";

const HandoverEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [saving, setSaving] = useState(false);
  const [header, setHeader] = useState({
    handover_date: "",
    present_persons: "",
    meter_electricity: "",
    meter_water: "",
    meter_gas: "",
    keys_count: "",
    notes: "",
  });
  const [newRoom, setNewRoom] = useState(roomPresets[0]);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoTargetItem = useRef<string | null>(null);

  // Protokollkopf laden
  const { data: protocol, isLoading } = useQuery({
    queryKey: ["handover-protocol", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pm_handover_protocols")
        .select("id, unit_id, tenant_id, type, status, handover_date, present_persons, meter_electricity, meter_water, meter_gas, keys_count, notes")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (protocol) {
      setHeader({
        handover_date: protocol.handover_date ?? "",
        present_persons: protocol.present_persons ?? "",
        meter_electricity: protocol.meter_electricity ?? "",
        meter_water: protocol.meter_water ?? "",
        meter_gas: protocol.meter_gas ?? "",
        keys_count: protocol.keys_count != null ? String(protocol.keys_count) : "",
        notes: protocol.notes ?? "",
      });
    }
  }, [protocol]);

  // Positionen
  const { data: items } = useQuery({
    queryKey: ["handover-items", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pm_handover_items")
        .select("id, room, element, condition, description, cost_bearer, sort_order")
        .eq("protocol_id", id!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ItemRow[];
    },
  });

  // Fotos (mit signierten URLs)
  const { data: photos } = useQuery({
    queryKey: ["handover-photos", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pm_handover_photos")
        .select("id, item_id, storage_path")
        .eq("protocol_id", id!);
      if (error) throw error;
      const rows = (data ?? []) as PhotoRow[];
      await Promise.all(
        rows.map(async (r) => {
          const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(r.storage_path, 3600);
          r.signedUrl = signed?.signedUrl;
        })
      );
      return rows;
    },
  });

  const itemList = items ?? [];
  const photoList = photos ?? [];

  // --- Kopf speichern ---
  const saveHeader = async (close = false) => {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase
      .from("pm_handover_protocols")
      .update({
        handover_date: header.handover_date || new Date().toISOString().slice(0, 10),
        present_persons: header.present_persons || null,
        meter_electricity: header.meter_electricity || null,
        meter_water: header.meter_water || null,
        meter_gas: header.meter_gas || null,
        keys_count: header.keys_count ? Number(header.keys_count) : null,
        notes: header.notes || null,
        ...(close ? { status: "completed" } : {}),
      })
      .eq("id", id);
    setSaving(false);
    if (error) {
      toast.error("Speichern fehlgeschlagen: " + error.message);
      return;
    }
    toast.success(close ? "Protokoll abgeschlossen" : "Gespeichert");
    queryClient.invalidateQueries({ queryKey: ["handover-protocol", id] });
    if (close) navigate("/property-management/handover");
  };

  // --- Position hinzufügen ---
  const addItem = async () => {
    if (!id) return;
    const { error } = await supabase.from("pm_handover_items").insert({
      protocol_id: id,
      room: newRoom,
      element: "",
      condition: "good",
      sort_order: itemList.length,
    });
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["handover-items", id] });
  };

  const updateItem = async (itemId: string, patch: Partial<ItemRow>) => {
    const { error } = await supabase.from("pm_handover_items").update(patch).eq("id", itemId);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["handover-items", id] });
  };

  const deleteItem = async (itemId: string) => {
    const { error } = await supabase.from("pm_handover_items").delete().eq("id", itemId);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["handover-items", id] });
    queryClient.invalidateQueries({ queryKey: ["handover-photos", id] });
  };

  // --- Foto-Aufnahme ---
  const triggerPhoto = (itemId: string) => {
    photoTargetItem.current = itemId;
    fileInputRef.current?.click();
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset for next capture
    if (!file || !id) return;
    const itemId = photoTargetItem.current;
    setUploadingFor(itemId);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${id}/${itemId ?? "allgemein"}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("pm_handover_photos").insert({
        protocol_id: id,
        item_id: itemId,
        storage_path: path,
      });
      if (insErr) throw insErr;
      toast.success("Foto hinzugefügt");
      queryClient.invalidateQueries({ queryKey: ["handover-photos", id] });
    } catch (err) {
      toast.error("Upload fehlgeschlagen: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUploadingFor(null);
      photoTargetItem.current = null;
    }
  };

  const deletePhoto = async (photo: PhotoRow) => {
    await supabase.storage.from(BUCKET).remove([photo.storage_path]);
    await supabase.from("pm_handover_photos").delete().eq("id", photo.id);
    queryClient.invalidateQueries({ queryKey: ["handover-photos", id] });
  };

  if (isLoading) {
    return (
      <PropertyManagementLayout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Protokoll wird geladen...
        </div>
      </PropertyManagementLayout>
    );
  }

  return (
    <PropertyManagementLayout>
      {/* Verstecktes Kamera-/Datei-Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFileSelected}
      />

      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/property-management/handover")} className="mb-3 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> Zurück
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-primary/10 rounded-lg flex items-center justify-center">
            {protocol?.type === "move_in" ? <LogIn className="w-6 h-6 text-primary" /> : <LogOut className="w-6 h-6 text-primary" />}
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">
              Abnahme – {protocol?.type === "move_in" ? "Einzug" : "Auszug"}
            </h1>
            <p className="text-sm text-muted-foreground">Vor Ort ausfüllen und speichern</p>
          </div>
        </div>
      </div>

      {/* Kopfdaten */}
      <Card className="mb-6">
        <CardHeader><CardTitle className="text-lg">Allgemeine Angaben</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Datum</Label>
            <Input type="date" value={header.handover_date}
              onChange={(e) => setHeader({ ...header, handover_date: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Anzahl Schlüssel</Label>
            <Input type="number" inputMode="numeric" value={header.keys_count}
              onChange={(e) => setHeader({ ...header, keys_count: e.target.value })} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Anwesende Personen</Label>
            <Input value={header.present_persons} placeholder="Bewirtschafter, Mieter, ..."
              onChange={(e) => setHeader({ ...header, present_persons: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Zähler Strom</Label>
            <Input inputMode="decimal" value={header.meter_electricity}
              onChange={(e) => setHeader({ ...header, meter_electricity: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Zähler Wasser</Label>
            <Input inputMode="decimal" value={header.meter_water}
              onChange={(e) => setHeader({ ...header, meter_water: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Zähler Gas</Label>
            <Input inputMode="decimal" value={header.meter_gas}
              onChange={(e) => setHeader({ ...header, meter_gas: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      {/* Mängelliste */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Räume & Zustand</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Position hinzufügen */}
          <div className="flex gap-2 mb-5">
            <select
              className="flex-1 h-11 rounded-md border border-input bg-background px-3 text-sm"
              value={newRoom}
              onChange={(e) => setNewRoom(e.target.value)}
            >
              {roomPresets.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <Button onClick={addItem} className="h-11">
              <Plus className="w-4 h-4 mr-1" /> Position
            </Button>
          </div>

          {itemList.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Noch keine Positionen. Wählen Sie einen Raum und tippen Sie „Position".
            </p>
          ) : (
            <div className="space-y-4">
              {itemList.map((item) => {
                const itemPhotos = photoList.filter((p) => p.item_id === item.id);
                return (
                  <div key={item.id} className="border rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium px-2 py-1 bg-secondary rounded-full">{item.room}</span>
                      <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => deleteItem(item.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <Input
                      placeholder="Element (z.B. Parkett Wohnzimmer, Küchenabdeckung...)"
                      defaultValue={item.element}
                      onBlur={(e) => e.target.value !== item.element && updateItem(item.id, { element: e.target.value })}
                      className="h-11"
                    />

                    {/* Zustand */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {conditionOptions.map((c) => (
                        <button
                          key={c.value}
                          onClick={() => updateItem(item.id, { condition: c.value })}
                          className={`text-xs font-medium px-2 py-2 rounded-lg border transition-colors ${
                            item.condition === c.value ? c.cls : "bg-background text-muted-foreground border-border hover:bg-secondary/50"
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>

                    {(item.condition !== "good") && (
                      <>
                        <Textarea
                          placeholder="Beschreibung des Mangels (z.B. 3 cm² Wasserfleck unter Nordfenster)"
                          defaultValue={item.description ?? ""}
                          onBlur={(e) => (e.target.value !== (item.description ?? "")) && updateItem(item.id, { description: e.target.value })}
                          rows={2}
                        />
                        <Input
                          placeholder="Kostenträger (Mieter / Vermieter / geteilt)"
                          defaultValue={item.cost_bearer ?? ""}
                          onBlur={(e) => (e.target.value !== (item.cost_bearer ?? "")) && updateItem(item.id, { cost_bearer: e.target.value })}
                          className="h-11"
                        />
                      </>
                    )}

                    {/* Fotos */}
                    {itemPhotos.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {itemPhotos.map((p) => (
                          <div key={p.id} className="relative w-20 h-20 rounded-lg overflow-hidden border group">
                            {p.signedUrl ? (
                              <img src={p.signedUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-muted">
                                <ImageIcon className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                            <button
                              onClick={() => deletePhoto(p)}
                              className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5"
                            >
                              <X className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button
                      variant="outline"
                      className="w-full h-11"
                      onClick={() => triggerPhoto(item.id)}
                      disabled={uploadingFor === item.id}
                    >
                      {uploadingFor === item.id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4 mr-2" />
                      )}
                      Foto aufnehmen
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notizen */}
      <Card className="mb-6">
        <CardHeader><CardTitle className="text-lg">Bemerkungen</CardTitle></CardHeader>
        <CardContent>
          <Textarea
            placeholder="Weitere Vereinbarungen, Fristen zur Mängelbehebung, Kostenübernahme..."
            value={header.notes}
            onChange={(e) => setHeader({ ...header, notes: e.target.value })}
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Aktionen – sticky unten für mobil */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t py-3 -mx-4 px-4 flex gap-3">
        <Button variant="outline" className="flex-1 h-12" onClick={() => saveHeader(false)} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Speichern
        </Button>
        <Button className="flex-1 h-12" onClick={() => saveHeader(true)} disabled={saving}>
          <CheckCircle className="w-4 h-4 mr-2" />
          Abschliessen
        </Button>
      </div>
    </PropertyManagementLayout>
  );
};

export default HandoverEditor;
