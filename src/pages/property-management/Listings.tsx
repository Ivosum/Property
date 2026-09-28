import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Key, Eye, Globe, Clock, CheckCircle, XCircle } from "lucide-react";

const Listings = () => {
  const listings = [
    { unit: "Bahnhofstrasse 12, 2.OG rechts", rent: "CHF 1'950", rooms: "3.5", status: "Aktiv", views: 234, applications: 12 },
    { unit: "Seestrasse 45, 4.OG", rent: "CHF 2'400", rooms: "4.5", status: "Entwurf", views: 0, applications: 0 },
    { unit: "Hauptstrasse 8, 2.OG", rent: "CHF 1'750", rooms: "3.0", status: "Vermietet", views: 456, applications: 28 },
  ];

  const applications = [
    { name: "Peter Huber", unit: "Bahnhofstrasse 12, 2.OG", date: "03.02.2026", status: "Neu" },
    { name: "Sandra Meier", unit: "Bahnhofstrasse 12, 2.OG", date: "02.02.2026", status: "In Prüfung" },
    { name: "Michael Frei", unit: "Bahnhofstrasse 12, 2.OG", date: "01.02.2026", status: "Abgelehnt" },
  ];

  return (
    <PropertyManagementLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Inserierung</h1>
          <p className="text-muted-foreground mt-1">Verwalten Sie Ihre Online-Inserate und Bewerbungen</p>
        </div>
        <Button>
          <Key className="w-4 h-4 mr-2" />
          Neues Inserat
        </Button>
      </div>

      {/* Active Listings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Aktive Inserate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {listings.map((listing, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <div>
                  <p className="font-medium">{listing.unit}</p>
                  <p className="text-sm text-muted-foreground">{listing.rooms} Zimmer • {listing.rent}/Monat</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="font-semibold">{listing.views}</p>
                    <p className="text-xs text-muted-foreground">Aufrufe</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold">{listing.applications}</p>
                    <p className="text-xs text-muted-foreground">Bewerbungen</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    listing.status === "Aktiv" ? "bg-green-100 text-green-700" :
                    listing.status === "Entwurf" ? "bg-orange-100 text-orange-700" :
                    "bg-secondary text-muted-foreground"
                  }`}>
                    {listing.status}
                  </span>
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-1" />
                    Ansehen
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Applications */}
      <Card>
        <CardHeader>
          <CardTitle>Aktuelle Bewerbungen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {applications.map((app, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary font-semibold">{app.name.split(' ').map(n => n[0]).join('')}</span>
                  </div>
                  <div>
                    <p className="font-medium">{app.name}</p>
                    <p className="text-sm text-muted-foreground">{app.unit}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-sm text-muted-foreground">{app.date}</p>
                  <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                    app.status === "Neu" ? "bg-primary/20 text-primary" :
                    app.status === "In Prüfung" ? "bg-orange-100 text-orange-700" :
                    "bg-destructive/20 text-destructive"
                  }`}>
                    {app.status === "Neu" && <Clock className="w-3 h-3" />}
                    {app.status === "In Prüfung" && <Eye className="w-3 h-3" />}
                    {app.status === "Abgelehnt" && <XCircle className="w-3 h-3" />}
                    {app.status}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Details</Button>
                    {app.status !== "Abgelehnt" && (
                      <Button size="sm">Zusagen</Button>
                    )}
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

export default Listings;
