import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getUnits, UNIT_TYPE_LABEL, FLOOR_LABELS, type UnitRow } from "@/lib/pmData";
import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import UnitDialog from "@/components/property-management/UnitDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Loader2, Home, Warehouse, Car, Package, Link2, MapPin } from "lucide-react";

const sb = supabase as any;

const formatCHF = (n: number) =>
  new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF", maximumFractionDigits: 0 }).format(n);

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

  const { data: property } = useQuery({
    queryKey: ["pm-property", propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const { data } = await sb.from("pm_properties")
        .select("id, name, address, postal_code, city, canton, property_type")
        .eq("id", propertyId).single();
      return data;
    },
  });

  const { data: units, isLoading } = useQuery({
    queryKey: ["pm-property-units", propertyId],
    enabled: !!propertyId,
    queryFn: () => getUnits(propertyId!),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["pm-property-units", propertyId] });

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
        </div>
        <Button onClick={() => setUnitOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Einheit hinzufügen
        </Button>
      </div>

      {isLoading ? (
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
      )}

      <UnitDialog open={unitOpen} onOpenChange={setUnitOpen} propertyId={propertyId!} onSaved={refresh} />
    </PropertyManagementLayout>
  );
};

export default PropertyDetail;
