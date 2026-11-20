import { useEffect, useState } from "react";
import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Building2, Users, Bell, Shield, BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getReminderSettings, saveReminderSettings } from "@/lib/pmData";

interface ReminderSettings {
  fee_stage_1: number; fee_stage_2: number; fee_stage_3: number; fee_stage_4: number;
  days_until_overdue: number; days_between_stages: number; grace_days_terminate: number;
}

const DunningSettings = () => {
  const [s, setS] = useState<ReminderSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getReminderSettings().then((d) => setS({
      fee_stage_1: Number(d.fee_stage_1), fee_stage_2: Number(d.fee_stage_2),
      fee_stage_3: Number(d.fee_stage_3), fee_stage_4: Number(d.fee_stage_4),
      days_until_overdue: Number(d.days_until_overdue),
      days_between_stages: Number(d.days_between_stages),
      grace_days_terminate: Number(d.grace_days_terminate),
    }));
  }, []);

  const set = (k: keyof ReminderSettings, v: string) =>
    setS((p) => p ? { ...p, [k]: Number(v) || 0 } : p);

  const save = async () => {
    if (!s) return;
    setSaving(true);
    try {
      await saveReminderSettings(s as unknown as Record<string, number>);
      toast.success("Mahnwesen-Einstellungen gespeichert");
    } catch (e) {
      toast.error("Konnte nicht gespeichert werden. " + (e instanceof Error ? e.message : ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="w-5 h-5" /> Mahnwesen
        </CardTitle>
        <CardDescription>Gebühren und Fristen für Zahlungserinnerungen und Mahnungen</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!s ? (
          <div className="flex items-center py-6 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Lädt...</div>
        ) : (
          <>
            <div>
              <p className="text-sm font-medium mb-2">Mahngebühren (CHF)</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1"><Label className="text-xs">1. Erinnerung</Label><Input type="number" value={s.fee_stage_1} onChange={(e) => set("fee_stage_1", e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">2. Erinnerung</Label><Input type="number" value={s.fee_stage_2} onChange={(e) => set("fee_stage_2", e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Mahnung</Label><Input type="number" value={s.fee_stage_3} onChange={(e) => set("fee_stage_3", e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Betreibung</Label><Input type="number" value={s.fee_stage_4} onChange={(e) => set("fee_stage_4", e.target.value)} /></div>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Fristen (Tage)</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1"><Label className="text-xs">Fällig → überfällig</Label><Input type="number" value={s.days_until_overdue} onChange={(e) => set("days_until_overdue", e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Frist zwischen Stufen</Label><Input type="number" value={s.days_between_stages} onChange={(e) => set("days_between_stages", e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Frist Kündigung (Art. 257d OR)</Label><Input type="number" value={s.grace_days_terminate} onChange={(e) => set("grace_days_terminate", e.target.value)} /></div>
              </div>
            </div>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Speichern
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

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

        {/* Mahnwesen */}
        <DunningSettings />

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
