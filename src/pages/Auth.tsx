import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { User, Building2, Briefcase, BadgeCheck } from "lucide-react";
import { resolveBrokerByCode } from "@/lib/omData";

const sb = supabase as any;

type AppRole = "buyer" | "seller" | "broker";

const roleOptions: { value: AppRole; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: "buyer",
    label: "Käufer",
    icon: <User className="w-6 h-6" />,
    description: "Immobilien suchen und kaufen",
  },
  {
    value: "seller",
    label: "Verkäufer",
    icon: <Building2 className="w-6 h-6" />,
    description: "Immobilien verkaufen",
  },
  {
    value: "broker",
    label: "Makler",
    icon: <Briefcase className="w-6 h-6" />,
    description: "Kunden und Immobilien verwalten",
  },
];

const Auth = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { signIn, signUp } = useAuth();
  const [loading, setLoading] = useState(false);

  // Makler-Referral (?ref=CODE): fest zugeordnet, nicht änderbar
  const refCode = (params.get("ref") || "").trim().toUpperCase();
  const [broker, setBroker] = useState<{ broker_id: string; broker_name: string | null } | null>(null);
  useEffect(() => {
    if (!refCode) return;
    resolveBrokerByCode(refCode).then(setBroker).catch(() => setBroker(null));
  }, [refCode]);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole>("buyer");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(loginEmail, loginPassword);

    if (error) {
      toast.error("Anmeldung fehlgeschlagen", {
        description: error.message,
      });
      setLoading(false);
      return;
    }

    // Check if user has PM role (redirect to property management)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: pmRole } = await supabase
        .from("pm_user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      // Users with PM role go to property management
      // Exception: admin@test.ch goes to off-market (super admin with access to both)
      if (pmRole && loginEmail !== "admin@test.ch") {
        toast.success("Willkommen in der Immobilienverwaltung!");
        navigate("/property-management");
        setLoading(false);
        return;
      }
    }

    toast.success("Willkommen zurück!");
    navigate("/off-market");
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

    setLoading(true);

    const { error } = await signUp(signupEmail, signupPassword, selectedRole, firstName, lastName, broker?.broker_id ?? null);

    if (error) {
      toast.error("Registrierung fehlgeschlagen", {
        description: error.message,
      });
    } else {
      toast.success("Registrierung erfolgreich!", {
        description: "Bitte bestätigen Sie Ihre E-Mail-Adresse.",
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-secondary/30 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-2xl">S</span>
            </div>
          </a>
          <h1 className="font-display text-2xl font-bold mt-4">Off-Market Plattform</h1>
          <p className="text-muted-foreground mt-2">
            Zugang zu exklusiven Immobilien
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
                      placeholder="ihre@email.ch"
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
                {refCode && (
                  <div className={`mb-4 rounded-lg border p-3 flex items-start gap-2 ${broker ? "bg-primary/5 border-primary/20" : "bg-amber-50 border-amber-200"}`}>
                    <BadgeCheck className={`w-5 h-5 shrink-0 ${broker ? "text-primary" : "text-amber-500"}`} />
                    <div className="text-sm">
                      {broker ? (
                        <>
                          <p className="font-medium">Empfohlen von {broker.broker_name || "Ihrem Makler"}</p>
                          <p className="text-muted-foreground">Sie werden fest diesem Makler zugeordnet (nicht änderbar).</p>
                        </>
                      ) : (
                        <p className="text-amber-700">Der Makler-Code „{refCode}" wurde nicht gefunden. Sie können sich trotzdem registrieren.</p>
                      )}
                    </div>
                  </div>
                )}
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Vorname</Label>
                      <Input
                        id="firstName"
                        placeholder="Max"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nachname</Label>
                      <Input
                        id="lastName"
                        placeholder="Muster"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">E-Mail</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="ihre@email.ch"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Ich bin ein...</Label>
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
                          <div className="font-medium text-sm">{option.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Passwort</Label>
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
                    <Label htmlFor="confirm-password">Passwort bestätigen</Label>
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
      </div>
    </div>
  );
};

export default Auth;
