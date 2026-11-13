import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, CheckCircle, Wrench, Loader2 } from "lucide-react";

interface DefectRow {
  id: string;
  unit: string;
  issue: string;
  reporter: string;
  date: string;
  priority: string;
  status: string;
}

const priorityLabels: Record<string, string> = { low: "Niedrig", normal: "Normal", urgent: "Dringend" };
const statusLabels: Record<string, string> = { open: "Offen", in_progress: "In Bearbeitung", resolved: "Erledigt", closed: "Geschlossen" };

const Defects = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["pm-defects"],
    queryFn: async () => {
      const [{ data: defects }, { data: units }] = await Promise.all([
        supabase.from("pm_defects").select("id, unit_id, title, description, reported_by_name, priority, status, created_at").order("created_at", { ascending: false }),
        supabase.from("pm_units").select("id, unit_number"),
      ]);
      const unitById = new Map((units ?? []).map((u) => [u.id, u.unit_number]));

      const rows = (defects ?? []).map((d) => ({
        id: d.id,
        unit: unitById.get(d.unit_id) ? `Einheit ${unitById.get(d.unit_id)}` : "–",
        issue: d.title,
        reporter: d.reported_by_name ?? "Unbekannt",
        date: new Date(d.created_at).toLocaleDateString("de-CH"),
        priority: priorityLabels[d.priority] ?? d.priority,
        status: statusLabels[d.status] ?? d.status,
        rawPriority: d.priority,
        rawStatus: d.status,
      }));

      const urgent = (defects ?? []).filter((d) => d.priority === "urgent").length;
      const open = (defects ?? []).filter((d) => d.status === "open").length;
      const inProgress = (defects ?? []).filter((d) => d.status === "in_progress").length;
      const resolved = (defects ?? []).filter((d) => d.status === "resolved" || d.status === "closed").length;

      return { rows, urgent, open, inProgress, resolved };
    },
  });

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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Mängelmeldungen</h1>
          <p className="text-muted-foreground mt-1">Verwalten Sie gemeldete Mängel und Reparaturen</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-destructive/10 border-destructive/20">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-destructive" />
            <div>
              <p className="text-2xl font-bold">{isLoading ? "–" : data?.urgent ?? 0}</p>
              <p className="text-sm text-muted-foreground">Dringend</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">{isLoading ? "–" : data?.open ?? 0}</p>
              <p className="text-sm text-muted-foreground">Offen</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Wrench className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{isLoading ? "–" : data?.inProgress ?? 0}</p>
              <p className="text-sm text-muted-foreground">In Bearbeitung</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{isLoading ? "–" : data?.resolved ?? 0}</p>
              <p className="text-sm text-muted-foreground">Erledigt</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alle Mängelmeldungen ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Mängel werden geladen...
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
                      <p className="text-xs text-muted-foreground mt-1">Gemeldet von {defect.reporter} am {defect.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                      defect.rawStatus === "open" ? "bg-orange-100 text-orange-700" :
                      defect.rawStatus === "in_progress" ? "bg-primary/20 text-primary" :
                      "bg-green-100 text-green-700"
                    }`}>
                      {getStatusIcon(defect.rawStatus)}
                      {defect.status}
                    </span>
                    <Button variant="outline" size="sm">Details</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PropertyManagementLayout>
  );
};

export default Defects;
