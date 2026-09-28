import { useState } from "react";
import OffMarketLayout from "@/components/off-market/OffMarketLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, MapPin, Home, Bed, Maximize } from "lucide-react";

// Mock data for demonstration
const mockProperties = [
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
    status: "active",
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
    status: "active",
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
    status: "active",
  },
];

const Properties = () => {
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

      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockProperties.map((property) => (
          <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
            <div className="relative h-48">
              <img
                src={property.featured_image_url}
                alt={property.title}
                className="w-full h-full object-cover"
              />
              <Badge className="absolute top-3 left-3 bg-primary">
                Off-Market
              </Badge>
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
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Home className="w-4 h-4" />
                  {property.property_type}
                </span>
                <span className="flex items-center gap-1">
                  <Bed className="w-4 h-4" />
                  {property.rooms} Zimmer
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

      {/* Empty State for real data */}
      <div className="text-center py-8 text-muted-foreground mt-8 border-t">
        <p className="text-sm">Dies sind Beispiel-Immobilien zur Demonstration.</p>
      </div>
    </OffMarketLayout>
  );
};

export default Properties;
