import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Building2, MapPin, Users } from "lucide-react";

const Properties = () => {
  const properties = [
    { id: 1, name: "Bahnhofstrasse 12", city: "Zürich", units: 12, occupied: 11, type: "Mehrfamilienhaus" },
    { id: 2, name: "Seestrasse 45", city: "Zürich", units: 8, occupied: 8, type: "Mehrfamilienhaus" },
    { id: 3, name: "Hauptstrasse 8", city: "Winterthur", units: 6, occupied: 5, type: "Geschäftshaus" },
    { id: 4, name: "Bergweg 23", city: "Bern", units: 4, occupied: 4, type: "Mehrfamilienhaus" },
  ];

  return (
    <PropertyManagementLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Liegenschaften</h1>
          <p className="text-muted-foreground mt-1">Verwalten Sie Ihr Immobilienportfolio</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Liegenschaft hinzufügen
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property) => (
          <Card key={property.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <span className="text-xs px-2 py-1 bg-secondary rounded-full">{property.type}</span>
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
                    style={{ width: `${(property.occupied / property.units) * 100}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PropertyManagementLayout>
  );
};

export default Properties;
