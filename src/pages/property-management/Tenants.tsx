import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Mail, Phone, Building2 } from "lucide-react";

const Tenants = () => {
  const tenants = [
    { id: 1, name: "Hans Müller", email: "h.mueller@email.ch", phone: "+41 79 123 45 67", unit: "Bahnhofstr. 12, 2.OG", rent: "CHF 1'850", status: "Aktiv" },
    { id: 2, name: "Anna Schmidt", email: "a.schmidt@email.ch", phone: "+41 79 234 56 78", unit: "Seestrasse 45, 3.OG", rent: "CHF 2'200", status: "Aktiv" },
    { id: 3, name: "Thomas Weber", email: "t.weber@email.ch", phone: "+41 79 345 67 89", unit: "Hauptstrasse 8, 1.OG", rent: "CHF 1'650", status: "Kündigung" },
    { id: 4, name: "Maria Keller", email: "m.keller@email.ch", phone: "+41 79 456 78 90", unit: "Bergweg 23, EG", rent: "CHF 1'400", status: "Aktiv" },
  ];

  return (
    <PropertyManagementLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Mieter</h1>
          <p className="text-muted-foreground mt-1">Übersicht aller Mietverhältnisse</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Mieter hinzufügen
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Mieter suchen..." className="pl-10" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alle Mieter ({tenants.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tenants.map((tenant) => (
              <div key={tenant.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary font-semibold">{tenant.name.split(' ').map(n => n[0]).join('')}</span>
                  </div>
                  <div>
                    <p className="font-medium">{tenant.name}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {tenant.unit}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="font-semibold">{tenant.rent}</p>
                    <p className="text-xs text-muted-foreground">Monatsmiete</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    tenant.status === "Aktiv" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                  }`}>
                    {tenant.status}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon">
                      <Mail className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Phone className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PropertyManagementLayout>
  );
};

export default Tenants;
