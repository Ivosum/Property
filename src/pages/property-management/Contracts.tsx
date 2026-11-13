import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Download, Eye, Loader2 } from "lucide-react";

interface ContractRow {
  id: string;
  tenant: string;
  unit: string;
  start: string;
  end: string;
  rent: number;
  status: string;
  documentUrl: string | null;
}

const statusLabels: Record<string, string> = {
  draft: "Entwurf",
  active: "Aktiv",
  terminated: "Gekündigt",
  expired: "Abgelaufen",
};

const formatCHF = (n: number) =>
  new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF", maximumFractionDigits: 0 }).format(n);
const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("de-CH") : "Unbefristet");

const Contracts = () => {
  const { data: contracts, isLoading } = useQuery({
    queryKey: ["pm-contracts"],
    queryFn: async () => {
      const [{ data: cons }, { data: tenants }, { data: units }] = await Promise.all([
        supabase.from("pm_contracts").select("id, tenant_id, unit_id, base_rent, start_date, end_date, status, document_url"),
        supabase.from("pm_tenants").select("id, first_name, last_name"),
        supabase.from("pm_units").select("id, unit_number"),
      ]);
      const tenantById = new Map((tenants ?? []).map((t) => [t.id, [t.first_name, t.last_name].filter(Boolean).join(" ") || "Unbenannt"]));
      const unitById = new Map((units ?? []).map((u) => [u.id, u.unit_number]));
      return (cons ?? []).map((c) => ({
        id: c.id,
        tenant: tenantById.get(c.tenant_id) ?? "Unbekannt",
        unit: unitById.get(c.unit_id) ? `Einheit ${unitById.get(c.unit_id)}` : "–",
        start: formatDate(c.start_date),
        end: formatDate(c.end_date),
        rent: c.base_rent,
        status: statusLabels[c.status] ?? c.status,
        documentUrl: c.document_url,
      })) as ContractRow[];
    },
  });

  const list = contracts ?? [];

  return (
    <PropertyManagementLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Mietverträge</h1>
          <p className="text-muted-foreground mt-1">Verwalten und erstellen Sie Mietverträge</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Vertrag erstellen
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Alle Mietverträge ({list.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Verträge werden geladen...
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <FileText className="w-10 h-10 mb-3 opacity-40" />
              <p>Noch keine Mietverträge erfasst.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Mieter</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Einheit</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Beginn</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Ende</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Miete</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((contract) => (
                    <tr key={contract.id} className="border-b hover:bg-secondary/30">
                      <td className="py-3 px-4 font-medium">{contract.tenant}</td>
                      <td className="py-3 px-4 text-muted-foreground">{contract.unit}</td>
                      <td className="py-3 px-4">{contract.start}</td>
                      <td className="py-3 px-4">{contract.end}</td>
                      <td className="py-3 px-4 font-medium">{formatCHF(contract.rent)}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          contract.status === "Aktiv"
                            ? "bg-green-100 text-green-700"
                            : contract.status === "Gekündigt"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {contract.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          {contract.documentUrl ? (
                            <>
                              <Button variant="ghost" size="icon" asChild>
                                <a href={contract.documentUrl} target="_blank" rel="noopener noreferrer"><Eye className="w-4 h-4" /></a>
                              </Button>
                              <Button variant="ghost" size="icon" asChild>
                                <a href={contract.documentUrl} download><Download className="w-4 h-4" /></a>
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">Kein Dokument</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </PropertyManagementLayout>
  );
};

export default Contracts;
