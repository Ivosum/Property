import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, Mail, Phone, Building2, Loader2, Users, Upload, Download, FileSpreadsheet, ChevronDown } from "lucide-react";
import TenantDialog from "@/components/property-management/TenantDialog";
import ImportDialog from "@/components/property-management/ImportDialog";
import { insertTenants, type TenantInput } from "@/lib/pmData";
import { downloadTemplate } from "@/lib/importMapping";

interface TenantRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  unit: string | null;
  rent: number | null;
  status: string;
}

const formatCHF = (n: number) =>
  new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF", maximumFractionDigits: 0 }).format(n);

const Tenants = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["pm-tenants"] });
    queryClient.invalidateQueries({ queryKey: ["pm-properties"] });
    queryClient.invalidateQueries({ queryKey: ["pm-contracts"] });
    queryClient.invalidateQueries({ queryKey: ["pm-finances"] });
  };

  const { data: tenants, isLoading } = useQuery({
    queryKey: ["pm-tenants"],
    queryFn: async () => {
      const [{ data: ten }, { data: contracts }, { data: units }] = await Promise.all([
        supabase.from("pm_tenants").select("id, first_name, last_name, email, phone"),
        supabase.from("pm_contracts").select("tenant_id, unit_id, base_rent, status"),
        supabase.from("pm_units").select("id, unit_number, property_id"),
      ]);

      const unitById = new Map((units ?? []).map((u) => [u.id, u]));
      // aktiven/jüngsten Vertrag je Mieter
      const contractByTenant = new Map<string, { unit_id: string; base_rent: number; status: string }>();
      (contracts ?? []).forEach((c) => {
        const existing = contractByTenant.get(c.tenant_id);
        if (!existing || c.status === "active") {
          contractByTenant.set(c.tenant_id, { unit_id: c.unit_id, base_rent: c.base_rent, status: c.status });
        }
      });

      return (ten ?? []).map((t) => {
        const c = contractByTenant.get(t.id);
        const u = c ? unitById.get(c.unit_id) : undefined;
        return {
          id: t.id,
          name: [t.first_name, t.last_name].filter(Boolean).join(" ") || "Unbenannt",
          email: t.email,
          phone: t.phone,
          unit: u ? `Einheit ${u.unit_number}` : null,
          rent: c?.base_rent ?? null,
          status: c?.status === "active" ? "Aktiv" : c?.status === "terminated" ? "Kündigung" : c ? "Vertrag" : "Kein Vertrag",
        };
      }) as TenantRow[];
    },
  });

  const list = tenants ?? [];
  const term = searchTerm.trim().toLowerCase();
  const filtered = list.filter((t) => !term || t.name.toLowerCase().includes(term));

  return (
    <PropertyManagementLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Mieter</h1>
          <p className="text-muted-foreground mt-1">Übersicht aller Mietverhältnisse</p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <FileSpreadsheet className="w-4 h-4 mr-2" /> Import / Vorlage <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setImportOpen(true)}>
                <Upload className="w-4 h-4 mr-2" /> Excel/CSV importieren
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => downloadTemplate("tenants")}>
                <Download className="w-4 h-4 mr-2" /> Vorlage herunterladen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Mieter hinzufügen
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Mieter suchen..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alle Mieter ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Mieter werden geladen...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Users className="w-10 h-10 mb-3 opacity-40" />
              <p>Keine Mieter gefunden.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((tenant) => (
                <div key={tenant.id} onClick={() => navigate(`/property-management/tenants/${tenant.id}`)} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-primary font-semibold">
                        {tenant.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        {tenant.unit && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {tenant.unit}
                          </span>
                        )}
                        {tenant.email && <span className="truncate">{tenant.email}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="font-semibold">{tenant.rent != null ? formatCHF(tenant.rent) : "–"}</p>
                      <p className="text-xs text-muted-foreground">Monatsmiete</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      tenant.status === "Aktiv"
                        ? "bg-green-100 text-green-700"
                        : tenant.status === "Kündigung"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {tenant.status}
                    </span>
                    <div className="flex gap-2">
                      {tenant.email && (
                        <Button variant="ghost" size="icon" asChild onClick={(e) => e.stopPropagation()}>
                          <a href={`mailto:${tenant.email}`}><Mail className="w-4 h-4" /></a>
                        </Button>
                      )}
                      {tenant.phone && (
                        <Button variant="ghost" size="icon" asChild onClick={(e) => e.stopPropagation()}>
                          <a href={`tel:${tenant.phone}`}><Phone className="w-4 h-4" /></a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TenantDialog open={addOpen} onOpenChange={setAddOpen} onSaved={refresh} />
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        schema="tenants"
        onImport={(rows) => insertTenants(rows as unknown as TenantInput[])}
        onDone={refresh}
      />
    </PropertyManagementLayout>
  );
};

export default Tenants;
