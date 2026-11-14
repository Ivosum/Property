import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Clock, CheckCircle, Wrench, Loader2, Plus, Receipt } from "lucide-react";
import { toast } from "sonner";
import { createDefect, updateDefectStatus, resolveDefectWithCost } from "@/lib/defects";

const sb = supabase as any;

const priorityLabels: Record<string, string> = { low: "Niedrig", normal: "Normal", urgent: "Dringend" };
const statusLabels: Record<string, string> = { open: "Offen", in_progress: "In Bearbeitung", resolved: "Erledigt", closed: "Geschlossen" };
const formatCHF = (n: number) =>
  new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF", maximumFractionDigits: 0 }).format(n);

const Defects = () => {
  const queryClient = useQueryClient();
  const [reportOpen, setReportOpen] = useState(false);
  const [resolveFor, setResolveFor] = useState<{ id: string; unitId: string; title: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["pm-defects"],
    queryFn: async () => {
      const [{ data: defects }, { data: units }, { data: props }] = await Promise.all([
        sb.from("pm_defects").select("id, unit_id, title, description, reported_by_name, priority, status, cost, created_at").order("created_at", { ascending: false }),
        sb.from("pm_units").select("id, unit_number, floor_label, property_id"),
        sb.from("pm_properties").select("id, name"),
      ]);
      const propName = new Map((props ?? []).map((p: any) => [p.id, p.name]));
      const unitById = new Map((units ?? []).map((u: any) => [u.id, u]));

      const rows = (defects ?? []).map((d: any) => {
        const u = unitById.get(d.unit_id);
        return {
          id: d.id,
          unitId: d.unit_id,
          unit: u ? `${propName.get(u.property_id) ?? ""} · ${[u.floor_label, u.unit_number].filter(Boolean).join(" ")}` : "–",
          issue: d.title,
          reporter: d.reported_by_name ?? "Unbekannt",
          date: new Date(d.created_at).toLocaleDateString("de-CH"),
          cost: d.cost ? Number(d.cost) : null,
          priority: priorityLabels[d.priority] ?? d.priority,
          status: statusLabels[d.status] ?? d.status,
          rawPriority: d.priority,
          rawStatus: d.status,
        };
      });

      const urgent = (defects ?? []).filter((d: any) => d.priority === "urgent" && d.status !== "resolved" && d.status !== "closed").length;
      const open = (defects ?? []).filter((d: any) => d.status === "open").length;
      const inProgress = (defects ?? []).filter((d: any) => d.status === "in_progress").length;
      const resolved = (defects ?? []).filter((d: any) => d.status === "resolved" || d.status === "closed").length;

      return { rows, urgent, open, inProgress, resolved };
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["pm-defects"] });
    queryClient.invalidateQueries({ queryKey: ["accounting-journal"] });
    queryClient.invalidateQueries({ queryKey: ["accounting-overview"] });
  };

  const setStatus = async (id: string, status: string) => {
    try { await updateDefectStatus(id, status); toast.success("Status aktualisiert"); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Fehler"); }
  };

  const rows = data?.rows ?? [];

  const getStatusIcon = (raw: string) => {
    switch (raw) {
      case "open": return <Clock className="w-4 h-4" />;
      case "in_progress": return <Wrench className="w-4 h-4" />;
      case "resolved":
      case "closed": return <CheckCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <PropertyManagementLayout>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Mängelmeldungen</h1>
          <p className="text-muted-foreground mt-1">Mängel erfassen, bearbeiten und Reparaturkosten direkt buchen</p>
        </div>
        <Button onClick={() => setReportOpen(true)}><Plus className="w-4 h-4 mr-2" /> Mangel melden</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-destructive/10 border-destructive/20">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-destructive" />
            <div><p className="text-2xl font-bold">{isLoading ? "–" : data?.urgent ?? 0}</p><p className="text-sm text-muted-foreground">Dringend offen</p></div>
          </CardContent>
        </Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Clock className="w-8 h-8 text-orange-500" />
          <div><p className="text-2xl font-bold">{isLoading ? "–" : data?.open ?? 0}</p><p className="text-sm text-muted-foreground">Offen</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Wrench className="w-8 h-8 text-primary" />
          <div><p className="text-2xl font-bold">{isLoading ? "–" : data?.inProgress ?? 0}</p><p className="text-sm text-muted-foreground">In Bearbeitung</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <CheckCircle className="w-8 h-8 text-green-500" />
          <div><p className="text-2xl font-bold">{isLoading ? "–" : data?.resolved ?? 0}</p><p className="text-sm text-muted-foreground">Erledigt</p></div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Alle Mängelmeldungen ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Mängel werden geladen...
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <CheckCircle className="w-10 h-10 mb-3 opacity-40" />
              <p>Keine Mängelmeldungen vorhanden.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rows.map((defect) => (
                <div key={defect.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg flex-wrap gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      defect.rawPriority === "urgent" ? "bg-destructive/20" :
                      defect.rawPriority === "normal" ? "bg-orange-100" : "bg-secondary"
                    }`}>
                      <AlertTriangle className={`w-5 h-5 ${
                        defect.rawPriority === "urgent" ? "text-destructive" :
                        defect.rawPriority === "normal" ? "text-orange-600" : "text-muted-foreground"
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium">{defect.issue}</p>
                      <p className="text-sm text-muted-foreground">{defect.unit}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Gemeldet von {defect.reporter} am {defect.date}
                        {defect.cost != null && <> · Kosten {formatCHF(defect.cost)}</>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                      defect.rawStatus === "open" ? "bg-orange-100 text-orange-700" :
                      defect.rawStatus === "in_progress" ? "bg-primary/20 text-primary" :
                      "bg-green-100 text-green-700"
                    }`}>
                      {getStatusIcon(defect.rawStatus)} {defect.status}
                    </span>
                    {defect.rawStatus === "open" && (
                      <Button variant="ghost" size="sm" onClick={() => setStatus(defect.id, "in_progress")}>
                        <Wrench className="w-4 h-4 mr-1" /> In Bearbeitung
                      </Button>
                    )}
                    {(defect.rawStatus === "open" || defect.rawStatus === "in_progress") && (
                      <Button variant="outline" size="sm" onClick={() => setResolveFor({ id: defect.id, unitId: defect.unitId, title: defect.issue })}>
                        <CheckCircle className="w-4 h-4 mr-1" /> Erledigen
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ReportDefectDialog open={reportOpen} onOpenChange={setReportOpen} onSaved={refresh} />
      {resolveFor && (
        <ResolveDialog
          defect={resolveFor}
          onClose={() => setResolveFor(null)}
          onDone={() => { setResolveFor(null); refresh(); }}
        />
      )}
    </PropertyManagementLayout>
  );
};

// --- Mangel melden ---
function ReportDefectDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const [unitId, setUnitId] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState("normal");
  const [saving, setSaving] = useState(false);

  const { data: units } = useQuery({
    queryKey: ["defect-units", open],
    enabled: open,
    queryFn: async () => {
      const [{ data: u }, { data: p }] = await Promise.all([
        sb.from("pm_units").select("id, unit_number, floor_label, property_id"),
        sb.from("pm_properties").select("id, name"),
      ]);
      const pn = new Map((p ?? []).map((x: any) => [x.id, x.name]));
      return (u ?? []).map((x: any) => ({ id: x.id, label: `${pn.get(x.property_id) ?? ""} · ${[x.floor_label, x.unit_number].filter(Boolean).join(" ")}` }));
    },
  });

  const save = async () => {
    if (!unitId) return toast.error("Bitte eine Einheit wählen.");
    if (!title.trim()) return toast.error("Bitte einen Titel angeben.");
    setSaving(true);
    try {
      await createDefect({ unit_id: unitId, title: title.trim(), description: desc.trim() || title.trim(), priority });
      toast.success("Mangel erfasst");
      setUnitId(""); setTitle(""); setDesc(""); setPriority("normal");
      onOpenChange(false); onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Fehler"); }
    finally { setSaving(false); }
  };

  const unitList = units ?? [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Mangel melden</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Einheit *</Label>
            <Select value={unitId} onValueChange={setUnitId}>
              <SelectTrigger><SelectValue placeholder={unitList.length ? "Einheit wählen" : "Keine Einheiten"} /></SelectTrigger>
              <SelectContent>{unitList.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Titel *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z.B. Wasserhahn tropft" /></div>
          <div><Label>Beschreibung</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} /></div>
          <div>
            <Label>Priorität</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Niedrig</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="urgent">Dringend</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Abbrechen</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Speichern</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Erledigen mit Kosten + Buchung ---
function ResolveDialog({ defect, onClose, onDone }: { defect: { id: string; unitId: string; title: string }; onClose: () => void; onDone: () => void }) {
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [book, setBook] = useState(true);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const { booked } = await resolveDefectWithCost({
        defectId: defect.id,
        unitId: defect.unitId,
        title: defect.title,
        cost: cost ? Number(cost) : 0,
        resolutionNotes: notes.trim() || null,
        bookExpense: book,
      });
      toast.success(booked ? "Erledigt & als Aufwand gebucht" : "Mangel als erledigt markiert");
      onDone();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Fehler"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Mangel erledigen</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{defect.title}</p>
          <div><Label>Reparaturkosten CHF (optional)</Label><Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" /></div>
          <div><Label>Notiz zur Behebung</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={book} onChange={(e) => setBook(e.target.checked)} />
            <Receipt className="w-4 h-4 text-muted-foreground" />
            Kosten direkt in der Buchhaltung verbuchen (Unterhalt &amp; Reparaturen)
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Abbrechen</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Erledigen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default Defects;
