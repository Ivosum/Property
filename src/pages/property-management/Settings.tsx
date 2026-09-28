import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Building2, Users, Bell, Shield } from "lucide-react";

const Settings = () => {
  return (
    <PropertyManagementLayout>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Einstellungen</h1>
        <p className="text-muted-foreground mt-1">Verwalten Sie Ihre Kontoeinstellungen</p>
      </div>

      <div className="grid gap-6 max-w-3xl">
        {/* Company Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Unternehmensdaten
            </CardTitle>
            <CardDescription>Informationen zu Ihrer Immobilienverwaltung</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Firmenname</Label>
                <Input defaultValue="Swiss Property Management AG" />
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input defaultValue="+41 44 123 45 67" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Adresse</Label>
              <Input defaultValue="Bahnhofstrasse 100, 8001 Zürich" />
            </div>
            <Button>Speichern</Button>
          </CardContent>
        </Card>

        {/* Team */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team & Mitarbeiter
            </CardTitle>
            <CardDescription>Verwalten Sie Zugriffsrechte für Ihr Team</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: "Max Mustermann", role: "Administrator", email: "m.mustermann@company.ch" },
                { name: "Anna Beispiel", role: "Bewirtschafter", email: "a.beispiel@company.ch" },
                { name: "Peter Muster", role: "Buchhalter", email: "p.muster@company.ch" },
              ].map((member, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-primary text-sm font-semibold">{member.name.split(' ').map(n => n[0]).join('')}</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 bg-secondary rounded-full">{member.role}</span>
                </div>
              ))}
            </div>
            <Button variant="outline" className="mt-4">Mitarbeiter einladen</Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Benachrichtigungen
            </CardTitle>
            <CardDescription>Konfigurieren Sie Ihre Benachrichtigungen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">E-Mail bei neuen Mängelmeldungen</p>
                <p className="text-sm text-muted-foreground">Erhalten Sie sofort eine E-Mail</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Zahlungserinnerungen</p>
                <p className="text-sm text-muted-foreground">Automatische Erinnerungen bei überfälligen Zahlungen</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Wöchentlicher Report</p>
                <p className="text-sm text-muted-foreground">Zusammenfassung per E-Mail jeden Montag</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Sicherheit
            </CardTitle>
            <CardDescription>Schützen Sie Ihr Konto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline">Passwort ändern</Button>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Zwei-Faktor-Authentifizierung</p>
                <p className="text-sm text-muted-foreground">Zusätzliche Sicherheit für Ihr Konto</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>
      </div>
    </PropertyManagementLayout>
  );
};

export default Settings;
