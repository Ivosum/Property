import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getUnits, UNIT_TYPE_LABEL, FLOOR_LABELS, type UnitRow } from "@/lib/pmData";
import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import UnitDialog from "@/components/property-management/UnitDialog";
import ImportDialog from "@/components/property-management/ImportDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { insertUnits } from "@/lib/pmData";
import { downloadTemplate, normalizeUnitType } from "@/lib/importMapping";
import { ArrowLeft, Plus, Loader2, Home, Warehouse, Car, Package, Link2, MapPin, Upload, Download, FileSpreadsheet, ChevronDown } from "lucide-react";

const sb = supabase as any;

const formatCHF = (n: number) =>
  new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF", maximumFractionDigits: 0 }).format(n);

const docTypeLabel = (t: string) =>
  t === "contract" ? "Mietvertrag"
  : t === "handover_protocol" ? "Abnahmeprotokoll"
  : t === "utility_bill" ? "Nebenkostenabrechnung"
  : t === "receipt" ? "Beleg"
  : t === "correspondence" ? "Korrespondenz" : "Dokument";

const typeIcon = (t: string) => {
  if (t === "wohnung" || t === "gewerbe") return Home;
  if (t === "keller" || t === "lager") return Package;
  if (t === "garage") return Warehouse;
  if (t === "aussenparkplatz") return Car;
  return Home;
};

// Sortierung der Stockwerke: UG < EG < 1.OG < 2.OG … < DG < Attika
const floorRank = (label: string | null) => {
  if (!label) return 999;
  const i = FLOOR_LABELS.indexOf(label);
  return i >= 0 ? i : 500;
};

const statusBadge = (s: string) =>
  s === "occupied" ? "bg-green-100 text-green-700"
  : s === "maintenance" ? "bg-orange-100 text-orange-700"
  : s === "reserved" ? "bg-blue-100 text-blue-700"
  : "bg-muted text-muted-foreground";
const statusLabel = (s: string) =>
  s === "occupied" ? "Vermietet" : s === "maintenance" ? "Unterhalt" : s === "reserved" ? "Reserviert" : "Frei";

const PropertyDetail = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [unitOpen, setUnitOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [tab, setTab] = useState<"einheiten" | "mieter" | "buchhaltung" | "dokumente">("einheiten");

  const { data: property } = useQuery({
    queryKey: ["pm-property", propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const { data } = await sb.from("pm_properties")
        .select("id, name, address, postal_code, city, canton, property_type, owner_ref_id, pm_owners:owner_ref_id(id, name, owner_type, email, phone)")
        .eq("id", propertyId).single();
      return data;
    },
  });

  const { data: units, isLoading } = useQuery({
    queryKey: ["pm-property-units", propertyId],
    enabled: !!propertyId,
    queryFn: () => getUnits(propertyId!),
  });

  // Verknüpfte Daten: Mieter, Buchhaltung, Dokumente, Mängel dieser Liegenschaft
  const { data: linked } = useQuery({
    queryKey: ["pm-property-linked", propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const unitsP = await getUnits(propertyId!);
      const unitIds = unitsP.map((u) => u.id);
      const [{ data: contracts }, { data: tenants }, { data: docs }, { data: defects }] = await Promise.all([
        sb.from("pm_contracts").select("id, unit_id, tenant_id, base_rent, status, start_date, end_date"),
        sb.from("pm_tenants").select("id, first_name, last_name, email, phone"),
        sb.from("pm_documents").select("id, name, document_type, file_url, created_at").eq("property_id", propertyId),
        unitIds.length ? sb.from("pm_defects").select("id, unit_id, status").in("unit_id", unitIds) : Promise.resolve({ data: [] }),
      ]);
      const tenantById = new Map((tenants ?? []).map((t: any) => [t.id, t]));
      const unitById = new Map(unitsP.map((u) => [u.id, u]));
      // aktive Mietverhältnisse dieser Liegenschaft
      const activeContracts = (contracts ?? []).filter((c: any) => unitById.has(c.unit_id) && c.status === "active");
      const tenantsHere = new Map<string, { tenant: any; units: string[] }>();
      activeContracts.forEach((c: any) => {
        const t = tenantById.get(c.tenant_id);
        if (!t) return;
        const u = unitById.get(c.unit_id);
        const label = u ? [u.floor_label, u.unit_number].filter(Boolean).join(" ") : "";
        const rec = tenantsHere.get(c.tenant_id) ?? { tenant: t, units: [] };
        if (label) rec.units.push(label);
        tenantsHere.set(c.tenant_id, rec);
      });
      const openDefects = (defects ?? []).filter((d: any) => d.status === "open" || d.status === "in_progress").length;
      return {
        tenants: [...tenantsHere.values()],
        documents: docs ?? [],
        openDefects,
        docCount: (docs ?? []).length,
      };
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["pm-property-units", propertyId] });
    queryClient.invalidateQueries({ queryKey: ["pm-property-linked", propertyId] });
  };

  const unitList = units ?? [];
  const flatName = new Map(unitList.map((u) => [u.id, [u.floor_label, u.unit_number].filter(Boolean).join(" ")]));

  // Gruppieren nach Stockwerk
  const byFloor = new Map<string, UnitRow[]>();
  unitList.forEach((u) => {
    const key = u.floor_label ?? "—";
    const arr = byFloor.get(key) ?? [];
    arr.push(u);
    byFloor.set(key, arr);
  });
  const floors = [...byFloor.entries()].sort((a, b) => floorRank(a[0]) - floorRank(b[0]));

  const flatCount = unitList.filter((u) => u.unit_type === "wohnung" || u.unit_type === "gewerbe").length;
  const occupied = unitList.filter((u) => u.status === "occupied").length;

  return (
    <PropertyManagementLayout>
      <button onClick={() => navigate("/property-management/properties")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Zurück zu Liegenschaften
      </button>

      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">{property?.name ?? "Liegenschaft"}</h1>
          {property && (
            <p className="text-muted-foreground mt-1 flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {property.address}, {property.postal_code} {property.city} ({property.canton})
            </p>
          )}
          <p className="text-sm text-muted-foreground mt-2">
            {unitList.length} Objekte · {flatCount} Wohn-/Gewerbeeinheiten · {occupied} vermietet
          </p>
          {property?.pm_owners && (
            <p className="text-sm mt-1">
              <span className="text-muted-foreground">Eigentümer: </span>
              <span className="font-medium">{property.pm_owners.name}</span>
              {property.pm_owners.email && <span className="text-muted-foreground"> · {property.pm_owners.email}</span>}
            </p>
          )}
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
                <Upload className="w-4 h-4 mr-2" /> Einheiten aus Excel/CSV
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => downloadTemplate("units")}>
                <Download className="w-4 h-4 mr-2" /> Vorlage herunterladen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setUnitOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Einheit hinzufügen
          </Button>
        </div>
      </div>

      {/* Tab-Leiste: alle verknüpften Daten der Liegenschaft */}
      <div className="flex gap-2 mb-6 flex-wrap border-b">
        {([
          ["einheiten", `Einheiten (${unitList.length})`],
          ["mieter", `Mieter (${linked?.tenants.length ?? 0})`],
          ["buchhaltung", "Buchhaltung"],
          ["dokumente", `Dokumente (${linked?.docCount ?? 0})`],
        ] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            {label}
          </button>
        ))}
        {linked && linked.openDefects > 0 && (
          <button onClick={() => navigate("/property-management/defects")}
            className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-orange-600 hover:text-orange-700 -mb-px">
            {linked.openDefects} offene Mängel
          </button>
        )}
      </div>

      {/* Buchhaltung-Tab */}
      {tab === "buchhaltung" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6 flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="font-medium">Separate Buchhaltung dieser Liegenschaft</p>
                <p className="text-sm text-muted-foreground">Mietzahlungen werden automatisch gebucht; Belege & Mängelkosten fliessen hier ein.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate(`/property-management/accounting/${propertyId}`)}>
                  Buchhaltung öffnen
                </Button>
                <Button variant="outline" onClick={() => navigate("/property-management/utility-billing")}>
                  Nebenkostenabrechnung
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mieter-Tab */}
      {tab === "mieter" && (
        <Card>
          <CardContent className="p-4">
            {!linked || linked.tenants.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Keine aktiven Mietverhältnisse.</p>
            ) : (
              <div className="divide-y">
                {linked.tenants.map(({ tenant, units: tu }) => (
                  <button key={tenant.id}
                    onClick={() => navigate(`/property-management/tenants/${tenant.id}`)}
                    className="w-full flex items-center justify-between py-3 px-2 text-left hover:bg-secondary/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold">
                        {[tenant.first_name, tenant.last_name].filter(Boolean).map((n: string) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium">{[tenant.first_name, tenant.last_name].filter(Boolean).join(" ")}</p>
                        <p className="text-xs text-muted-foreground">{tu.join(", ")}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{tenant.email ?? tenant.phone ?? ""}</span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dokumente-Tab */}
      {tab === "dokumente" && (
        <Card>
          <CardContent className="p-4">
            {!linked || linked.documents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Noch keine Dokumente zu dieser Liegenschaft.</p>
            ) : (
              <div className="divide-y">
                {linked.documents.map((d: any) => (
                  <a key={d.id} href={d.file_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between py-3 px-2 hover:bg-secondary/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{docTypeLabel(d.document_type)} · {new Date(d.created_at).toLocaleDateString("de-CH")}</p>
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-muted-foreground" />
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Einheiten-Tab (Standard) */}
      {tab === "einheiten" && (isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Einheiten werden geladen...
        </div>
      ) : unitList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Home className="w-10 h-10 text-muted-foreground mb-3" />
          <h3 className="font-display text-lg font-semibold">Noch keine Einheiten</h3>
          <p className="text-muted-foreground mt-1 max-w-md">
            Erfassen Sie Wohnungen (EG, 1.OG, TOP1 …), Keller und Parkplätze.
          </p>
          <Button className="mt-5" onClick={() => setUnitOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Einheit hinzufügen
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {floors.map(([floor, floorUnits]) => (
            <div key={floor}>
              <h2 className="font-display text-lg font-semibold mb-3">{floor === "—" ? "Ohne Stockwerk" : floor}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {floorUnits
                  .slice()
                  .sort((a, b) => a.unit_number.localeCompare(b.unit_number, "de"))
                  .map((u) => {
                    const Icon = typeIcon(u.unit_type);
                    return (
                      <Card key={u.id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <Icon className="w-5 h-5 text-primary" />
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${statusBadge(u.status)}`}>
                              {statusLabel(u.status)}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <CardTitle className="text-base">{u.unit_number}</CardTitle>
                          <p className="text-xs text-muted-foreground mb-2">{UNIT_TYPE_LABEL[u.unit_type] ?? u.unit_type}</p>
                          <div className="text-sm text-muted-foreground space-y-1">
                            {(u.unit_type === "wohnung" || u.unit_type === "gewerbe") && (
                              <p>{u.rooms ? `${u.rooms} Zi.` : ""}{u.rooms && u.living_area_sqm ? " · " : ""}{u.living_area_sqm ? `${u.living_area_sqm} m²` : ""}</p>
                            )}
                            {u.parent_unit_id && flatName.get(u.parent_unit_id) && (
                              <p className="flex items-center gap-1 text-xs"><Link2 className="w-3 h-3" /> {flatName.get(u.parent_unit_id)}</p>
                            )}
                            <p className="font-medium text-foreground pt-1">{formatCHF(Number(u.base_rent) || 0)}
                              {u.utilities_advance ? <span className="text-xs text-muted-foreground"> + {formatCHF(Number(u.utilities_advance))} NK</span> : null}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      ))}

      <UnitDialog open={unitOpen} onOpenChange={setUnitOpen} propertyId={propertyId!} onSaved={refresh} />
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        schema="units"
        onImport={(rows) => insertUnits(
          propertyId!,
          rows.map((r) => ({ ...r, unit_type: normalizeUnitType(r.unit_type) })),
        )}
        onDone={refresh}
      />
    </PropertyManagementLayout>
  );
};

export default PropertyDetail;
