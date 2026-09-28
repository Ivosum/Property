import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Users, Building2, MessageCircle, BarChart3, Shield, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const BrokerDashboard = () => {
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
                <p className="font-medium">Makler-Verifizierung erforderlich</p>
                <p className="text-sm text-muted-foreground">
                  Laden Sie Ihre Maklerlizenz und Unterlagen hoch
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
            <CardDescription>Aktive Kunden</CardDescription>
            <CardTitle className="text-3xl">0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Käufer & Verkäufer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Vermittelte Immobilien</CardDescription>
            <CardTitle className="text-3xl">0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Aktive Mandate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Laufende Verhandlungen</CardDescription>
            <CardTitle className="text-3xl">0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Offene Transaktionen</p>
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
              <Users className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Kunden verwalten</CardTitle>
            <CardDescription>
              Übersicht über alle Ihre Kunden und deren Status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/off-market/clients">Kunden öffnen</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Immobilien</CardTitle>
            <CardDescription>
              Alle vermittelten Objekte auf einen Blick
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
              <MessageCircle className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Nachrichten</CardTitle>
            <CardDescription>
              Kommunikation mit Käufern und Verkäufern
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/off-market/messages">Nachrichten öffnen</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Aktuelle Transaktionen
          </CardTitle>
          <CardDescription>
            Übersicht über laufende Vermittlungen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p>Keine aktiven Transaktionen.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BrokerDashboard;
