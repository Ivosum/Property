import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Upload, Building2, Eye, MessageCircle, Shield, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const SellerDashboard = () => {
  const { profile } = useAuth();
  const isVerified = profile?.kyc_status === "verified";

  return (
    <div className="space-y-6">
      {/* Verification Alert */}
      {!isVerified && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              <div>
                <p className="font-medium">Verifizierung erforderlich</p>
                <p className="text-sm text-muted-foreground">
                  Vervollständigen Sie Ihre KYC-Prüfung, um Immobilien zu listen
                </p>
              </div>
            </div>
            <Button asChild>
              <Link to="/off-market/verification">Jetzt verifizieren</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Meine Immobilien</CardDescription>
            <CardTitle className="text-3xl">0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Aktive Listings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ansichten</CardDescription>
            <CardTitle className="text-3xl">0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Letzte 30 Tage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Anfragen</CardDescription>
            <CardTitle className="text-3xl">0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Von Interessenten</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Nachrichten</CardDescription>
            <CardTitle className="text-3xl">0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Ungelesene Nachrichten</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Immobilie hinzufügen</CardTitle>
            <CardDescription>
              Listen Sie eine neue Immobilie auf der Plattform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant={isVerified ? "default" : "outline"} className="w-full" disabled={!isVerified}>
              <Link to="/off-market/add-property">
                {isVerified ? "Jetzt hinzufügen" : "Verifizierung erforderlich"}
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Meine Immobilien</CardTitle>
            <CardDescription>
              Verwalten Sie Ihre gelisteten Objekte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/off-market/my-properties">Übersicht öffnen</Link>
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
              Laden Sie Unterlagen für Ihre Immobilien hoch
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/off-market/documents">Dokumente verwalten</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Letzte Aktivitäten
          </CardTitle>
          <CardDescription>
            Anfragen und Interaktionen mit Ihren Immobilien
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p>Keine Aktivitäten vorhanden.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SellerDashboard;
