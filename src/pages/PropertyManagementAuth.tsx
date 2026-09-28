import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, ArrowLeft, Shield, UserCog, Users } from "lucide-react";

type PMRole = "pm_admin" | "pm_manager" | "pm_employee";

const roleOptions: { value: PMRole; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: "pm_admin",
    label: "Administrator",
    icon: <Shield className="w-6 h-6" />,
    description: "Vollzugriff auf alle Funktionen",
  },
  {
    value: "pm_manager",
    label: "Bewirtschafter",
    icon: <UserCog className="w-6 h-6" />,
    description: "Verwaltung zugewiesener Objekte",
  },
  {
    value: "pm_employee",
    label: "Mitarbeiter",
    icon: <Users className="w-6 h-6" />,
    description: "Unterstützung bei Aufgaben",
  },
];

const PropertyManagementAuth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [selectedRole, setSelectedRole] = useState<PMRole>("pm_admin");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (authError) {
        toast.error("Anmeldung fehlgeschlagen", {
          description: authError.message,
        });
        setLoading(false);
        return;
      }

      // Check if user has PM role
      const { data: pmRole, error: pmRoleError } = await supabase
        .from("pm_user_roles")
        .select("role")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (pmRoleError || !pmRole) {
        await supabase.auth.signOut();
        toast.error("Kein Verwaltungskonto gefunden", {
          description: "Dieses Konto ist nicht für die Immobilienverwaltung registriert.",
        });
        setLoading(false);
        return;
      }

      toast.success("Willkommen in der Immobilienverwaltung!");
      navigate("/property-management");
    } catch (error) {
      toast.error("Ein Fehler ist aufgetreten");
    }

    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (signupPassword !== signupConfirmPassword) {
      toast.error("Passwörter stimmen nicht überein");
      return;
    }

    if (signupPassword.length < 6) {
      toast.error("Passwort muss mindestens 6 Zeichen lang sein");
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Bitte geben Sie Ihren Vor- und Nachnamen ein");
      return;
    }

    setLoading(true);

    try {
      // Create the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: window.location.origin + "/pm-auth",
          data: {
            first_name: firstName,
            last_name: lastName,
            company_name: companyName,
          },
        },
      });

      if (authError) {
        toast.error("Registrierung fehlgeschlagen", {
          description: authError.message,
        });
        setLoading(false);
        return;
      }

      if (authData.user) {
        // Add PM role
        const { error: roleError } = await supabase
          .from("pm_user_roles")
          .insert({ user_id: authData.user.id, role: selectedRole });

        if (roleError) {
          console.error("Error assigning PM role:", roleError);
          toast.error("Fehler bei der Rollenzuweisung", {
            description: "Bitte kontaktieren Sie den Support.",
          });
          setLoading(false);
          return;
        }

        // Update profile with name and company
        await supabase
          .from("profiles")
          .update({
            first_name: firstName,
            last_name: lastName,
            company_name: companyName,
          })
          .eq("user_id", authData.user.id);

        toast.success("Registrierung erfolgreich!", {
          description: "Bitte bestätigen Sie Ihre E-Mail-Adresse, um sich anzumelden.",
        });

        // Reset form
        setSignupEmail("");
        setSignupPassword("");
        setSignupConfirmPassword("");
        setFirstName("");
        setLastName("");
        setCompanyName("");
      }
    } catch (error) {
      console.error("Signup error:", error);
      toast.error("Ein Fehler ist aufgetreten");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-secondary/30 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold">Immobilienverwaltung</h1>
          <p className="text-muted-foreground mt-2">
            Professionelle Verwaltung Ihrer Liegenschaften
          </p>
        </div>

        <Card className="border-border/50">
          <Tabs defaultValue="login">
            <CardHeader>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Anmelden</TabsTrigger>
                <TabsTrigger value="signup">Registrieren</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">E-Mail</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="ihre@verwaltung.ch"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Passwort</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Wird angemeldet..." : "Anmelden"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Vorname *</Label>
                      <Input
                        id="firstName"
                        placeholder="Max"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nachname *</Label>
                      <Input
                        id="lastName"
                        placeholder="Muster"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyName">Firma / Verwaltung</Label>
                    <Input
                      id="companyName"
                      placeholder="Muster Verwaltung AG"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">E-Mail *</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="ihre@verwaltung.ch"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Ihre Rolle *</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {roleOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setSelectedRole(option.value)}
                          className={`p-3 rounded-lg border-2 transition-all text-center ${
                            selectedRole === option.value
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="flex justify-center mb-2 text-primary">
                            {option.icon}
                          </div>
                          <div className="font-medium text-xs">{option.label}</div>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {roleOptions.find((r) => r.value === selectedRole)?.description}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Passwort *</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Passwort bestätigen *</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Wird registriert..." : "Registrieren"}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Mit der Registrierung akzeptieren Sie unsere AGB und Datenschutzrichtlinien.
                  </p>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
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

export default PropertyManagementAuth;
