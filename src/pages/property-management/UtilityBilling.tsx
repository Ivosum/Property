import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calculator, FileText, Send, CheckCircle } from "lucide-react";

const UtilityBilling = () => {
  const billings = [
    { property: "Bahnhofstrasse 12", period: "2025", units: 12, status: "Erstellt", sent: "10/12" },
    { property: "Seestrasse 45", period: "2025", units: 8, status: "In Bearbeitung", sent: "0/8" },
    { property: "Hauptstrasse 8", period: "2025", units: 6, status: "Ausstehend", sent: "0/6" },
    { property: "Bergweg 23", period: "2024", units: 4, status: "Abgeschlossen", sent: "4/4" },
  ];

  return (
    <PropertyManagementLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Nebenkostenabrechnung</h1>
          <p className="text-muted-foreground mt-1">Erstellen und verwalten Sie Nebenkostenabrechnungen</p>
        </div>
        <Button>
          <Calculator className="w-4 h-4 mr-2" />
          Neue Abrechnung
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">30</p>
                <p className="text-sm text-muted-foreground">Abrechnungen 2025</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Send className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">14</p>
                <p className="text-sm text-muted-foreground">Noch zu versenden</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">16</p>
                <p className="text-sm text-muted-foreground">Versendet</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Abrechnungsübersicht</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {billings.map((billing, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <div>
                  <p className="font-medium">{billing.property}</p>
                  <p className="text-sm text-muted-foreground">Abrechnungszeitraum: {billing.period} • {billing.units} Einheiten</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      billing.status === "Abgeschlossen" ? "bg-green-100 text-green-700" :
                      billing.status === "Erstellt" ? "bg-primary/20 text-primary" :
                      billing.status === "In Bearbeitung" ? "bg-orange-100 text-orange-700" :
                      "bg-secondary text-muted-foreground"
                    }`}>
                      {billing.status}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">Versendet: {billing.sent}</p>
                  </div>
                  <Button variant="outline" size="sm">Bearbeiten</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PropertyManagementLayout>
  );
};

export default UtilityBilling;
