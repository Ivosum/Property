import { useState } from "react";
import OffMarketLayout from "@/components/off-market/OffMarketLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search as SearchIcon, MapPin, Home, Bed, Maximize, Heart, SlidersHorizontal } from "lucide-react";

// Mock search results
const mockResults = [
  {
    id: "1",
    title: "Luxusvilla mit Seesicht",
    city: "Zürich",
    canton: "ZH",
    price: 4500000,
    rooms: 7,
    living_area_sqm: 320,
    property_type: "Villa",
    featured_image_url: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800",
  },
  {
    id: "2",
    title: "Moderne Stadtwohnung",
    city: "Basel",
    canton: "BS",
    price: 1850000,
    rooms: 4.5,
    living_area_sqm: 145,
    property_type: "Wohnung",
    featured_image_url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
  },
  {
    id: "3",
    title: "Chalet in den Alpen",
    city: "Zermatt",
    canton: "VS",
    price: 3200000,
    rooms: 5,
    living_area_sqm: 210,
    property_type: "Chalet",
    featured_image_url: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800",
  },
];

const Search = () => {
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("de-CH", {
      style: "currency",
      currency: "CHF",
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <OffMarketLayout>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Immobilien suchen</h1>
        <p className="text-muted-foreground mt-1">
          Finden Sie Ihre Traumimmobilie mit unserer KI-gestützten Suche
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
            <Button className="h-12 px-8" size="lg">
              <SearchIcon className="w-5 h-5 mr-2" />
              Suchen
            </Button>
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
                <Input type="number" placeholder="500'000" />
              </div>
              <div className="space-y-2">
                <Label>Max. Preis</Label>
                <Input type="number" placeholder="5'000'000" />
              </div>
              <div className="space-y-2">
                <Label>Min. Zimmer</Label>
                <Input type="number" step="0.5" placeholder="3" />
              </div>
              <div className="space-y-2">
                <Label>Objektart</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3">
                  <option value="">Alle</option>
                  <option value="wohnung">Wohnung</option>
                  <option value="haus">Haus</option>
                  <option value="villa">Villa</option>
                  <option value="chalet">Chalet</option>
                </select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">{mockResults.length}</span> Immobilien gefunden
        </p>
        <select className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="relevance">Relevanz</option>
          <option value="price_asc">Preis aufsteigend</option>
          <option value="price_desc">Preis absteigend</option>
          <option value="newest">Neueste zuerst</option>
        </select>
      </div>

      {/* Search Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockResults.map((property) => (
          <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
            <div className="relative h-48">
              <img
                src={property.featured_image_url}
                alt={property.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <Badge className="absolute top-3 left-3 bg-primary">
                Off-Market
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 bg-background/80 hover:bg-background"
              >
                <Heart className="w-4 h-4" />
              </Button>
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
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Home className="w-4 h-4" />
                  {property.property_type}
                </span>
                <span className="flex items-center gap-1">
                  <Bed className="w-4 h-4" />
                  {property.rooms} Zi.
                </span>
                <span className="flex items-center gap-1">
                  <Maximize className="w-4 h-4" />
                  {property.living_area_sqm} m²
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </OffMarketLayout>
  );
};

export default Search;
