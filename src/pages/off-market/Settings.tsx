import { useState } from "react";
import OffMarketLayout from "@/components/off-market/OffMarketLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { User, Bell, Shield, Palette } from "lucide-react";

const Settings = () => {
  const { profile, role } = useAuth();
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      toast.success("Einstellungen gespeichert");
      setSaving(false);
    }, 1000);
  };

  return (
    <OffMarketLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold">Einstellungen</h1>
          <p className="text-muted-foreground mt-1">
            Verwalten Sie Ihr Profil und Ihre Präferenzen
          </p>
        </div>

        <div className="space-y-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                <CardTitle>Profil</CardTitle>
              </div>
              <CardDescription>Ihre persönlichen Informationen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Vorname</Label>
                  <Input id="firstName" defaultValue={profile?.first_name || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nachname</Label>
                  <Input id="lastName" defaultValue={profile?.last_name || ""} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Firma (optional)</Label>
                <Input id="company" defaultValue={profile?.company_name || ""} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input id="phone" defaultValue={profile?.phone || ""} placeholder="+41 79 123 45 67" />
              </div>
            </CardContent>
          </Card>

          {/* Buyer Preferences */}
          {role === "buyer" && (
            <Card>
              <CardHeader>
                <CardTitle>Suchprofil</CardTitle>
                <CardDescription>Ihre Präferenzen für KI-Matching</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minPrice">Min. Preis (CHF)</Label>
                    <Input id="minPrice" type="number" placeholder="500000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxPrice">Max. Preis (CHF)</Label>
                    <Input id="maxPrice" type="number" placeholder="2000000" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minRooms">Min. Zimmer</Label>
                    <Input id="minRooms" type="number" step="0.5" placeholder="3" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxRooms">Max. Zimmer</Label>
                    <Input id="maxRooms" type="number" step="0.5" placeholder="6" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cantons">Bevorzugte Kantone</Label>
                  <Input id="cantons" placeholder="ZH, ZG, SZ..." />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <CardTitle>Benachrichtigungen</CardTitle>
              </div>
              <CardDescription>Wie möchten Sie informiert werden?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">E-Mail Benachrichtigungen</p>
                  <p className="text-sm text-muted-foreground">Neue Nachrichten und Updates</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Neue Immobilien</p>
                  <p className="text-sm text-muted-foreground">Passende Objekte zu Ihrem Suchprofil</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Marketing</p>
                  <p className="text-sm text-muted-foreground">Newsletter und Angebote</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <CardTitle>Sicherheit</CardTitle>
              </div>
              <CardDescription>Passwort und Zugangsdaten</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline">Passwort ändern</Button>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Wird gespeichert..." : "Einstellungen speichern"}
            </Button>
          </div>
        </div>
      </div>
    </OffMarketLayout>
  );
};

export default Settings;
