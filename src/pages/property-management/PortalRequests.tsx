import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2, KeyRound, Check, X, Mail, Phone, Building2, Home, Clock, CheckCircle2, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { getPortalRequests, decidePortalRequest } from "@/lib/pmData";

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const PortalRequests = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [busy, setBusy] = useState<string | null>(null);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["pm-portal-requests", filter],
    queryFn: () => getPortalRequests(filter),
  });

  const decide = async (id: string, action: "approve" | "reject") => {
    setBusy(id);
    try {
      await decidePortalRequest(id, action);
      toast.success(action === "approve" ? "Zugang freigeschaltet" : "Anfrage abgelehnt");
      queryClient.invalidateQueries({ queryKey: ["pm-portal-requests"] });
      queryClient.invalidateQueries({ queryKey: ["pm-tenants"] });
    } catch (e) {
      toast.error("Aktion fehlgeschlagen", { description: e instanceof Error ? e.message : "" });
    } finally {
      setBusy(null);
    }
  };

  const tabs: { key: typeof filter; label: string; icon: React.ReactNode }[] = [
    { key: "pending", label: "Offen", icon: <Clock className="w-4 h-4" /> },
    { key: "approved", label: "Freigeschaltet", icon: <CheckCircle2 className="w-4 h-4" /> },
    { key: "rejected", label: "Abgelehnt", icon: <XCircle className="w-4 h-4" /> },
  ];

  return (
    <PropertyManagementLayout>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <KeyRound className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Portal-Anfragen</h1>
          <p className="text-sm text-muted-foreground">Mieter-Selbstanmeldungen prüfen und Zugang freischalten.</p>
        </div>
      </div>

      <div className="flex gap-1.5 my-5">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              filter === t.key ? "bg-primary text-primary-foreground border-primary" : "hover:bg-secondary"
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Anfragen werden geladen...
        </div>
      ) : !requests || requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <KeyRound className="w-10 h-10 text-muted-foreground mb-3" />
          <h3 className="font-display text-lg font-semibold">
            {filter === "pending" ? "Keine offenen Anfragen" : filter === "approved" ? "Noch nichts freigeschaltet" : "Nichts abgelehnt"}
          </h3>
          <p className="text-muted-foreground mt-1 max-w-md">
            Mieter melden sich über den QR-Code ihrer Wohnung an. Neue Anfragen erscheinen hier zur Freigabe.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{r.first_name} {r.last_name}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {r.property_name}</span>
                    <span className="flex items-center gap-1"><Home className="w-3.5 h-3.5" /> {r.unit_label}</span>
                    <a href={`mailto:${r.email}`} className="flex items-center gap-1 hover:text-foreground"><Mail className="w-3.5 h-3.5" /> {r.email}</a>
                    {r.phone && <a href={`tel:${r.phone}`} className="flex items-center gap-1 hover:text-foreground"><Phone className="w-3.5 h-3.5" /> {r.phone}</a>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Eingegangen {formatDate(r.created_at)}</p>
                  {r.message && <p className="text-sm mt-2 bg-secondary/40 rounded-lg p-2">{r.message}</p>}
                </div>
                {r.status === "pending" ? (
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive"
                      onClick={() => decide(r.id, "reject")} disabled={busy === r.id}>
                      {busy === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4 mr-1" />} Ablehnen
                    </Button>
                    <Button size="sm" onClick={() => decide(r.id, "approve")} disabled={busy === r.id}>
                      {busy === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />} Freischalten
                    </Button>
                  </div>
                ) : (
                  <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${
                    r.status === "approved" ? "bg-green-100 text-green-700" : "bg-destructive/15 text-destructive"
                  }`}>
                    {r.status === "approved" ? "Freigeschaltet" : "Abgelehnt"}
                  </span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PropertyManagementLayout>
  );
};

export default PortalRequests;
