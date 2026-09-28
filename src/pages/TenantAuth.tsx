import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Home, ArrowLeft } from "lucide-react";

const TenantAuth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        toast.error("Anmeldung fehlgeschlagen", {
          description: authError.message,
        });
        setLoading(false);
        return;
      }

      // Check if user is a tenant
      const { data: tenant, error: tenantError } = await supabase
        .from("pm_tenants")
        .select("id")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (tenantError || !tenant) {
        await supabase.auth.signOut();
        toast.error("Kein Mieter-Konto gefunden", {
          description: "Dieses Konto ist nicht mit einem Mietverhältnis verknüpft.",
        });
        setLoading(false);
        return;
      }

      toast.success("Willkommen im Mieterportal!");
      navigate(`/tenant-portal`);
    } catch (error) {
      toast.error("Ein Fehler ist aufgetreten");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-secondary/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
            <Home className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold">Mieterportal</h1>
          <p className="text-muted-foreground mt-2">
            Melden Sie sich an, um Ihr Mietverhältnis zu verwalten
          </p>
        </div>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Anmelden</CardTitle>
            <CardDescription>
              Verwenden Sie Ihre registrierten Zugangsdaten
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ihre@email.ch"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Passwort</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Wird angemeldet..." : "Anmelden"}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground text-center mb-4">
                Sie haben Fragen zu Ihrem Zugang?
              </p>
              <p className="text-xs text-muted-foreground text-center">
                Kontaktieren Sie Ihre Hausverwaltung für Unterstützung.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Button variant="ghost" onClick={() => navigate("/")} className="text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück zur Startseite
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TenantAuth;
