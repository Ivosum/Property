import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Plus, Building2, MapPin, Users, Loader2, Upload, Download, FileSpreadsheet, ChevronDown, Home } from "lucide-react";
import PropertyDialog from "@/components/property-management/PropertyDialog";
import UnitDialog from "@/components/property-management/UnitDialog";
import ImportDialog from "@/components/property-management/ImportDialog";
import { insertProperties, type PropertyInput } from "@/lib/pmData";
import { downloadTemplate } from "@/lib/importMapping";

interface PmProperty {
  id: string;
  name: string;
  city: string;
  property_type: string;
  units: number;
  occupied: number;
}

const Properties = () => {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [unitFor, setUnitFor] = useState<string | null>(null);

  const { data: properties, isLoading } = useQuery({
    queryKey: ["pm-properties"],
    queryFn: async () => {
      const [{ data: props, error: pErr }, { data: units, error: uErr }] = await Promise.all([
        supabase.from("pm_properties").select("id, name, city, property_type, total_units"),
        supabase.from("pm_units").select("property_id, status"),
      ]);
      if (pErr) throw pErr;
      if (uErr) throw uErr;

      const unitsByProp = new Map<string, { total: number; occupied: number }>();
      (units ?? []).forEach((u) => {
        const rec = unitsByProp.get(u.property_id) ?? { total: 0, occupied: 0 };
        rec.total++;
        if (u.status === "occupied") rec.occupied++;
        unitsByProp.set(u.property_id, rec);
      });

      return (props ?? []).map((p) => {
        const u = unitsByProp.get(p.id);
        return {
          id: p.id,
          name: p.name,
          city: p.city,
          property_type: p.property_type,
          units: u?.total ?? p.total_units ?? 0,
          occupied: u?.occupied ?? 0,
        };
      }) as PmProperty[];
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["pm-properties"] });

  const list = properties ?? [];

  return (
    <PropertyManagementLayout>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Liegenschaften</h1>
          <p className="text-muted-foreground mt-1">Verwalten Sie Ihr Immobilienportfolio</p>
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
              <DropdownMenuItem onClick={() => downloadTemplate("properties")}>
                <Download className="w-4 h-4 mr-2" /> Vorlage herunterladen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Liegenschaft hinzufügen
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Liegenschaften werden geladen...
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-display text-lg font-semibold">Noch keine Liegenschaften</h3>
          <p className="text-muted-foreground mt-1 max-w-md">
            Fügen Sie Ihre erste Liegenschaft hinzu oder importieren Sie eine Excel-Liste.
          </p>
          <div className="flex gap-2 mt-5">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="w-4 h-4 mr-2" /> Excel importieren
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Liegenschaft hinzufügen
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {list.map((property) => (
            <Card key={property.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-xs px-2 py-1 bg-secondary rounded-full">{property.property_type}</span>
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg mb-2">{property.name}</CardTitle>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                  <MapPin className="w-4 h-4" />
                  {property.city}
                </div>
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-1 text-sm">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>{property.occupied}/{property.units} belegt</span>
                  </div>
                  <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${property.units > 0 ? (property.occupied / property.units) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => setUnitFor(property.id)}>
                  <Home className="w-4 h-4 mr-2" /> Einheit hinzufügen
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PropertyDialog open={addOpen} onOpenChange={setAddOpen} onSaved={refresh} />
      {unitFor && (
        <UnitDialog
          open={!!unitFor}
          onOpenChange={(o) => { if (!o) setUnitFor(null); }}
          propertyId={unitFor}
          onSaved={refresh}
        />
      )}
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        schema="properties"
        onImport={(rows) => insertProperties(rows as unknown as PropertyInput[])}
        onDone={refresh}
      />
    </PropertyManagementLayout>
  );
};

export default Properties;
