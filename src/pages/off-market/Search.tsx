import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import OffMarketLayout from "@/components/off-market/OffMarketLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search as SearchIcon, MapPin, Home, Bed, Maximize, Building2, SlidersHorizontal, Loader2 } from "lucide-react";

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
  created_at: string;
}

const typeLabels: Record<string, string> = {
  apartment: "Wohnung",
  house: "Haus",
  commercial: "Gewerbe",
  land: "Bauland",
  other: "Objekt",
};

type SortKey = "newest" | "price_asc" | "price_desc";

const Search = () => {
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRooms, setMinRooms] = useState("");
  const [propType, setPropType] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");

  const { data: properties, isLoading } = useQuery({
    queryKey: ["off-market-search"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, title, city, canton, price, rooms, living_area_sqm, property_type, featured_image_url, created_at")
        .eq("is_off_market", true);
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
  const minP = minPrice ? Number(minPrice) : null;
  const maxP = maxPrice ? Number(maxPrice) : null;
  const minR = minRooms ? Number(minRooms) : null;

  const results = (properties ?? [])
    .filter((p) => {
      if (term && !(
        p.title?.toLowerCase().includes(term) ||
        p.city?.toLowerCase().includes(term) ||
        p.canton?.toLowerCase().includes(term)
      )) return false;
      if (minP != null && p.price < minP) return false;
      if (maxP != null && p.price > maxP) return false;
      if (minR != null && (p.rooms ?? 0) < minR) return false;
      if (propType && p.property_type !== propType) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === "price_asc") return a.price - b.price;
      if (sort === "price_desc") return b.price - a.price;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <OffMarketLayout>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Immobilien suchen</h1>
        <p className="text-muted-foreground mt-1">
          Finden Sie Ihre Traumimmobilie
        </p>
      </div>

      {/* Search Bar */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Ort, Kanton oder Stichwort..."
                className="pl-12 h-12 text-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              className="h-12"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="w-5 h-5 mr-2" />
              Filter
            </Button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Min. Preis</Label>
                <Input type="number" placeholder="500000" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Max. Preis</Label>
                <Input type="number" placeholder="5000000" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Min. Zimmer</Label>
                <Input type="number" step="0.5" placeholder="3" value={minRooms} onChange={(e) => setMinRooms(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Objektart</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3"
                  value={propType}
                  onChange={(e) => setPropType(e.target.value)}
                >
                  <option value="">Alle</option>
                  <option value="apartment">Wohnung</option>
                  <option value="house">Haus</option>
                  <option value="commercial">Gewerbe</option>
                  <option value="land">Bauland</option>
                  <option value="other">Objekt</option>
                </select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">{results.length}</span> Immobilien gefunden
        </p>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
        >
          <option value="newest">Neueste zuerst</option>
          <option value="price_asc">Preis aufsteigend</option>
          <option value="price_desc">Preis absteigend</option>
        </select>
      </div>

      {/* Search Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Immobilien werden geladen...
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-display text-lg font-semibold">Keine Treffer</h3>
          <p className="text-muted-foreground mt-1 max-w-md">
            Passen Sie Ihre Suchkriterien an oder entfernen Sie Filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((property) => (
            <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
              <div className="relative h-48 bg-muted">
                {property.featured_image_url ? (
                  <img
                    src={property.featured_image_url}
                    alt={property.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="w-10 h-10 text-muted-foreground/40" />
                  </div>
                )}
                <Badge className="absolute top-3 left-3 bg-primary">Off-Market</Badge>
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{property.title}</CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {property.city}, {property.canton}
                </CardDescription>
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
                      {property.rooms} Zi.
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

export default Search;
