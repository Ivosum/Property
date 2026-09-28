import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Users, Building2, Shield, BarChart3, FileText, AlertCircle } from "lucide-react";

const AdminDashboard = () => {
  return (
    <div className="space-y-6">
      {/* Admin Notice */}
      <Card className="border-primary bg-primary/5">
        <CardContent className="flex items-center gap-3 p-4">
          <Shield className="w-8 h-8 text-primary" />
          <div>
            <p className="font-medium">Administrator-Zugang</p>
            <p className="text-sm text-muted-foreground">
              Sie haben vollständigen Zugriff auf alle Plattform-Funktionen
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gesamte Nutzer</CardDescription>
            <CardTitle className="text-3xl">0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Käufer, Verkäufer, Makler</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Aktive Immobilien</CardDescription>
            <CardTitle className="text-3xl">0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Gelistete Objekte</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pendente Verifizierungen</CardDescription>
            <CardTitle className="text-3xl">0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">KYC-Prüfungen offen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Transaktionen</CardDescription>
            <CardTitle className="text-3xl">0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Diesen Monat</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Items Alert */}
      <Card className="border-yellow-500/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-yellow-600">
            <AlertCircle className="w-5 h-5" />
            Ausstehende Aktionen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-muted rounded">
              <span className="text-sm">KYC-Verifizierungen</span>
              <span className="text-sm font-medium">0 ausstehend</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted rounded">
              <span className="text-sm">Immobilien-Prüfungen</span>
              <span className="text-sm font-medium">0 ausstehend</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted rounded">
              <span className="text-sm">Dokumente zur Prüfung</span>
              <span className="text-sm font-medium">0 ausstehend</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Benutzerverwaltung</CardTitle>
            <CardDescription>
              Nutzer verwalten und Rollen zuweisen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/off-market/users">Benutzer öffnen</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Alle Immobilien</CardTitle>
            <CardDescription>
              Übersicht aller Listings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/off-market/properties">Immobilien öffnen</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Dokumente</CardTitle>
            <CardDescription>
              KYC und Unterlagen prüfen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/off-market/documents">Dokumente öffnen</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Analysen</CardTitle>
            <CardDescription>
              Plattform-Statistiken
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/off-market/analytics">Analysen öffnen</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
