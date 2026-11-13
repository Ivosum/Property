import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import OffMarketLayout from "@/components/off-market/OffMarketLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Search, Plus, Phone, Building2, Loader2 } from "lucide-react";

interface Client {
  id: string;
  name: string;
  phone: string | null;
  company: string | null;
  type: "buyer" | "seller" | "broker";
  kyc: string;
  properties: number;
}

const Clients = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: clients, isLoading } = useQuery({
    queryKey: ["off-market-clients"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }, { data: props }] = await Promise.all([
        supabase.from("profiles").select("user_id, first_name, last_name, phone, company_name, kyc_status"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("properties").select("owner_id"),
      ]);

      const roleByUser = new Map<string, string>();
      (roles ?? []).forEach((r) => {
        if (!roleByUser.has(r.user_id)) roleByUser.set(r.user_id, r.role);
      });

      const propCount = new Map<string, number>();
      (props ?? []).forEach((p) => {
        if (p.owner_id) propCount.set(p.owner_id, (propCount.get(p.owner_id) ?? 0) + 1);
      });

      return (profiles ?? [])
        .map((p) => {
          const role = (roleByUser.get(p.user_id) ?? "buyer") as string;
          if (role === "admin") return null; // Admins sind keine Kunden
          return {
            id: p.user_id,
            name: [p.first_name, p.last_name].filter(Boolean).join(" ") || "Unbenannt",
            phone: p.phone,
            company: p.company_name,
            type: role as Client["type"],
            kyc: p.kyc_status ?? "pending",
            properties: propCount.get(p.user_id) ?? 0,
          };
        })
        .filter(Boolean) as Client[];
    },
  });

  const list = clients ?? [];
  const term = searchTerm.trim().toLowerCase();
  const filtered = list.filter((c) => !term || c.name.toLowerCase().includes(term));

  const total = list.length;
  const buyers = list.filter((c) => c.type === "buyer").length;
  const sellers = list.filter((c) => c.type === "seller").length;
  const pending = list.filter((c) => c.kyc !== "verified").length;

  return (
    <OffMarketLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Kunden</h1>
          <p className="text-muted-foreground mt-1">
            Verwalten Sie Ihre Käufer und Verkäufer
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Kunde hinzufügen
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Gesamt", value: total },
          { label: "Käufer", value: buyers },
          { label: "Verkäufer", value: sellers },
          { label: "Nicht verifiziert", value: pending },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold">{isLoading ? "–" : s.value}</p>
                </div>
                <Users className="w-8 h-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Kunde suchen..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Clients List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Kunden werden geladen...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Users className="w-10 h-10 mb-3 opacity-40" />
              <p>Keine Kunden gefunden.</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((client) => (
                <div key={client.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-primary font-semibold text-lg">{client.name[0]}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{client.name}</p>
                          <Badge variant={client.type === "buyer" ? "default" : "secondary"}>
                            {client.type === "buyer" ? "Käufer" : client.type === "seller" ? "Verkäufer" : "Makler"}
                          </Badge>
                          {client.kyc !== "verified" && (
                            <Badge variant="outline">Nicht verifiziert</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                          {client.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {client.phone}
                            </span>
                          )}
                          {client.company && (
                            <span>{client.company}</span>
                          )}
                          {client.properties > 0 && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {client.properties} Immobilien
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Details</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </OffMarketLayout>
  );
};

export default Clients;
