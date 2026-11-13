import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import OffMarketLayout from "@/components/off-market/OffMarketLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, MapPin, Home, Bed, Maximize, Building2, Loader2 } from "lucide-react";

interface PropertyRow {
  id: string;
  title: string;
  city: string;
  canton: string;
  price: number;
  rooms: number | null;
  living_area_sqm: number | null;
  property_type: string;
  featured_image_url: string | null;
  status: string;
}

const typeLabels: Record<string, string> = {
  apartment: "Wohnung",
  house: "Haus",
  commercial: "Gewerbe",
  land: "Bauland",
  other: "Objekt",
};

const Properties = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: properties, isLoading } = useQuery({
    queryKey: ["off-market-properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, title, city, canton, price, rooms, living_area_sqm, property_type, featured_image_url, status")
        .eq("is_off_market", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PropertyRow[];
    },
  });

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("de-CH", {
      style: "currency",
      currency: "CHF",
      maximumFractionDigits: 0,
    }).format(price);

  const term = searchTerm.trim().toLowerCase();
  const filtered = (properties ?? []).filter((p) => {
    if (!term) return true;
    return (
      p.title?.toLowerCase().includes(term) ||
      p.city?.toLowerCase().includes(term) ||
      p.canton?.toLowerCase().includes(term)
    );
  });

  return (
    <OffMarketLayout>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Off-Market Immobilien</h1>
        <p className="text-muted-foreground mt-1">
          Exklusive Objekte, die nicht öffentlich gelistet sind
        </p>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Suche nach Ort, Titel..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Immobilien werden geladen...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-display text-lg font-semibold">Noch keine Immobilien</h3>
          <p className="text-muted-foreground mt-1 max-w-md">
            {term
              ? "Keine Immobilien entsprechen Ihrer Suche."
              : "Sobald Objekte eingestellt und freigeschaltet sind, erscheinen sie hier."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((property) => (
            <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
              <div className="relative h-48 bg-muted">
                {property.featured_image_url ? (
                  <img
                    src={property.featured_image_url}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="w-10 h-10 text-muted-foreground/40" />
                  </div>
                )}
                <Badge className="absolute top-3 left-3 bg-primary">Off-Market</Badge>
              </div>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{property.title}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {property.city}, {property.canton}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary mb-3">
                  {formatPrice(property.price)}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Home className="w-4 h-4" />
                    {typeLabels[property.property_type] ?? property.property_type}
                  </span>
                  {property.rooms != null && (
                    <span className="flex items-center gap-1">
                      <Bed className="w-4 h-4" />
                      {property.rooms} Zimmer
                    </span>
                  )}
                  {property.living_area_sqm != null && (
                    <span className="flex items-center gap-1">
                      <Maximize className="w-4 h-4" />
                      {property.living_area_sqm} m²
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </OffMarketLayout>
  );
};

export default Properties;
