import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Search, Heart, MessageCircle, Shield, Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const BuyerDashboard = () => {
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
                  Vervollständigen Sie Ihre KYC-Prüfung für Zugang zu allen Immobilien
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
            <CardDescription>Verfügbare Immobilien</CardDescription>
            <CardTitle className="text-3xl">--</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Exklusive Off-Market Objekte</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Favoriten</CardDescription>
            <CardTitle className="text-3xl">0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Gespeicherte Immobilien</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Anfragen</CardDescription>
            <CardTitle className="text-3xl">0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Aktive Interessensbekundungen</p>
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
              <Search className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Immobilien suchen</CardTitle>
            <CardDescription>
              Durchsuchen Sie exklusive Off-Market Objekte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/off-market/search">Suche starten</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
              <Heart className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Suchprofil erstellen</CardTitle>
            <CardDescription>
              Erhalten Sie passende Empfehlungen per KI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/off-market/settings">Profil einrichten</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
              <MessageCircle className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Nachrichten</CardTitle>
            <CardDescription>
              Kommunizieren Sie mit Verkäufern und Maklern
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/off-market/messages">Nachrichten öffnen</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recommended Properties Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Empfohlene Immobilien
          </CardTitle>
          <CardDescription>
            Basierend auf Ihrem Suchprofil und KI-Matching
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            {isVerified ? (
              <p>Keine Immobilien verfügbar. Erstellen Sie ein Suchprofil für personalisierte Empfehlungen.</p>
            ) : (
              <p>Vervollständigen Sie Ihre Verifizierung, um Immobilien zu sehen.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BuyerDashboard;
