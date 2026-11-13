import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ClipboardCheck, Plus, LogIn, LogOut, Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const typeLabels: Record<string, string> = { move_in: "Einzug", move_out: "Auszug" };
const statusLabels: Record<string, string> = { draft: "Entwurf", completed: "Abgeschlossen", signed: "Unterschrieben" };

const Handover = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [unitId, setUnitId] = useState("");
  const [type, setType] = useState<"move_in" | "move_out">("move_in");

  // Protokolle laden
  const { data: protocols, isLoading } = useQuery({
    queryKey: ["handover-protocols"],
    queryFn: async () => {
      const [{ data: protos }, { data: units }, { data: tenants }] = await Promise.all([
        supabase
          .from("pm_handover_protocols")
          .select("id, unit_id, tenant_id, type, status, handover_date")
          .order("handover_date", { ascending: false }),
        supabase.from("pm_units").select("id, unit_number, property_id"),
        supabase.from("pm_tenants").select("id, first_name, last_name"),
      ]);
      const unitLabel = new Map((units ?? []).map((u) => [u.id, u.unit_number]));
      const tenantLabel = new Map((tenants ?? []).map((t) => [t.id, [t.first_name, t.last_name].filter(Boolean).join(" ")]));
      return (protos ?? []).map((p) => ({
        id: p.id,
        unit: unitLabel.get(p.unit_id) ? `Einheit ${unitLabel.get(p.unit_id)}` : "–",
        tenant: p.tenant_id ? tenantLabel.get(p.tenant_id) ?? "–" : "–",
        type: p.type,
        status: p.status,
        date: new Date(p.handover_date).toLocaleDateString("de-CH"),
      }));
    },
  });

  // Einheiten für die Auswahl
  const { data: units } = useQuery({
    queryKey: ["handover-units"],
    queryFn: async () => {
      const [{ data: unitRows }, { data: props }] = await Promise.all([
        supabase.from("pm_units").select("id, unit_number, property_id").order("unit_number"),
        supabase.from("pm_properties").select("id, name"),
      ]);
      const propName = new Map((props ?? []).map((p) => [p.id, p.name]));
      return (unitRows ?? []).map((u) => ({
        id: u.id,
        label: `${propName.get(u.property_id) ?? "Liegenschaft"} – Einheit ${u.unit_number}`,
      }));
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!unitId) throw new Error("Bitte Einheit wählen");
      // Aktiven Mieter/Vertrag der Einheit ermitteln (optional)
      const { data: contract } = await supabase
        .from("pm_contracts")
        .select("id, tenant_id")
        .eq("unit_id", unitId)
        .eq("status", "active")
        .maybeSingle();

      const { data, error } = await supabase
        .from("pm_handover_protocols")
        .insert({
          unit_id: unitId,
          tenant_id: contract?.tenant_id ?? null,
          contract_id: contract?.id ?? null,
          type,
          status: "draft",
          created_by: user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      setDialogOpen(false);
      setUnitId("");
      queryClient.invalidateQueries({ queryKey: ["handover-protocols"] });
      navigate(`/property-management/handover/${id}`);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Fehler beim Erstellen"),
  });

  const list = protocols ?? [];

  return (
    <PropertyManagementLayout>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Wohnungsabnahme</h1>
          <p className="text-muted-foreground mt-1">Abnahmeprotokolle für Ein- und Auszug</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Neue Abnahme
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neues Abnahmeprotokoll</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Einheit</Label>
                <Select value={unitId} onValueChange={setUnitId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Einheit wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(units ?? []).map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Art der Abnahme</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={type === "move_in" ? "default" : "outline"}
                    onClick={() => setType("move_in")}
                    className="justify-start"
                  >
                    <LogIn className="w-4 h-4 mr-2" /> Einzug
                  </Button>
                  <Button
                    type="button"
                    variant={type === "move_out" ? "default" : "outline"}
                    onClick={() => setType("move_out")}
                    className="justify-start"
                  >
                    <LogOut className="w-4 h-4 mr-2" /> Auszug
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!unitId || createMutation.isPending}
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Protokoll starten
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alle Protokolle ({list.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Protokolle werden geladen...
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <ClipboardCheck className="w-10 h-10 mb-3 opacity-40" />
              <p>Noch keine Abnahmeprotokolle.</p>
              <p className="text-sm mt-1">Starten Sie über „Neue Abnahme".</p>
            </div>
          ) : (
            <div className="divide-y">
              {list.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/property-management/handover/${p.id}`)}
                  className="w-full flex items-center justify-between py-4 text-left hover:bg-secondary/30 transition-colors px-2 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                      {p.type === "move_in" ? <LogIn className="w-5 h-5 text-primary" /> : <LogOut className="w-5 h-5 text-primary" />}
                    </div>
                    <div>
                      <p className="font-medium">{p.unit} · {typeLabels[p.type]}</p>
                      <p className="text-sm text-muted-foreground">{p.tenant} · {p.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      p.status === "signed" ? "bg-green-100 text-green-700" :
                      p.status === "completed" ? "bg-primary/20 text-primary" :
                      "bg-orange-100 text-orange-700"
                    }`}>
                      {statusLabels[p.status]}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PropertyManagementLayout>
  );
};

export default Handover;
