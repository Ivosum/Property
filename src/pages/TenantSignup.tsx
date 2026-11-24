import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Home, ArrowLeft, Loader2, CheckCircle2, Building2, MapPin } from "lucide-react";
import { toast } from "sonner";

const sb = supabase as any;

interface UnitCtx {
  unit_id: string;
  unit_number: string;
  floor_label: string | null;
  property_name: string;
  property_address: string;
}

const TenantSignup = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";

  const [loadingCtx, setLoadingCtx] = useState(true);
  const [ctx, setCtx] = useState<UnitCtx | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ existing: boolean } | null>(null);

  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "", password: "", password2: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    (async () => {
      if (!token) { setLoadingCtx(false); return; }
      const { data, error } = await sb.rpc("portal_unit_by_token", { _token: token });
      const row = Array.isArray(data) ? data[0] : data;
      if (!error && row?.unit_id) setCtx(row as UnitCtx);
      setLoadingCtx(false);
    })();
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) { toast.error("Bitte Vor- und Nachnamen angeben."); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) { toast.error("Bitte eine gültige E-Mail-Adresse angeben."); return; }
    if (form.password.length < 8) { toast.error("Das Passwort muss mindestens 8 Zeichen haben."); return; }
    if (form.password !== form.password2) { toast.error("Die Passwörter stimmen nicht überein."); return; }

    setSubmitting(true);
    try {
      const { data, error } = await sb.functions.invoke("tenant-signup", {
        body: {
          token,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          password: form.password,
        },
      });
      if (error) {
        let msg = error.message || "Anmeldung fehlgeschlagen";
        try { const ctx = (error as any).context; if (ctx?.body) { const b = JSON.parse(ctx.body); if (b?.error) msg = b.error; } } catch { /* */ }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      setDone({ existing: !!data?.existing_account });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Anmeldung fehlgeschlagen");
    } finally {
      setSubmitting(false);
    }
  };

  // Kein Token / ungültig
  if (!loadingCtx && !ctx) {
    return (
      <div className="min-h-screen bg-secondary/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50">
          <CardHeader>
            <CardTitle>Ungültiger Link</CardTitle>
            <CardDescription>
              Dieser Anmelde-Link ist ungültig oder abgelaufen. Bitte scannen Sie den aktuellen
              QR-Code Ihrer Hausverwaltung oder wenden Sie sich an diese.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => navigate("/tenant-auth")}>
              Zum Mieter-Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Erfolg
  if (done) {
    return (
      <div className="min-h-screen bg-secondary/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50">
          <CardHeader className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 dark:bg-green-900/40 rounded-2xl mb-3 mx-auto">
              <CheckCircle2 className="w-7 h-7 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Anfrage eingegangen</CardTitle>
            <CardDescription>
              Vielen Dank! Ihre Anmeldung für {ctx?.property_name} – {[ctx?.floor_label, ctx?.unit_number].filter(Boolean).join(" ")} wurde übermittelt.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ihre Hausverwaltung prüft die Anfrage und schaltet Ihren Zugang frei. Sobald er aktiv ist,
              können Sie sich im Mieterportal anmelden
              {done.existing ? " – mit Ihrem bestehenden Passwort." : " – mit der E-Mail und dem Passwort, die Sie gerade gewählt haben."}
            </p>
            <Button className="w-full" onClick={() => navigate("/tenant-auth")}>
              Zum Mieter-Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
            <Home className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold">Mieterportal-Zugang</h1>
          <p className="text-muted-foreground mt-2">Registrieren Sie sich für Ihre Wohnung</p>
        </div>

        {/* Kontext der Einheit */}
        {loadingCtx ? (
          <Card className="border-border/50 mb-4"><CardContent className="py-6 flex items-center justify-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Lädt...
          </CardContent></Card>
        ) : ctx && (
          <Card className="border-border/50 mb-4 bg-secondary/30">
            <CardContent className="py-4 space-y-1">
              <p className="flex items-center gap-2 font-medium"><Building2 className="w-4 h-4 text-primary" /> {ctx.property_name}</p>
              <p className="flex items-center gap-2 text-sm text-muted-foreground"><Home className="w-4 h-4" /> {[ctx.floor_label, ctx.unit_number].filter(Boolean).join(" ")}</p>
              <p className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="w-4 h-4" /> {ctx.property_address}</p>
            </CardContent>
          </Card>
        )}

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Ihre Daten</CardTitle>
            <CardDescription>Nach dem Absenden prüft die Verwaltung Ihre Anfrage und schaltet den Zugang frei.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Vorname</Label><Input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} required /></div>
                <div className="space-y-2"><Label>Nachname</Label><Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} required /></div>
              </div>
              <div className="space-y-2"><Label>E-Mail</Label><Input type="email" placeholder="ihre@email.ch" value={form.email} onChange={(e) => set("email", e.target.value)} required /></div>
              <div className="space-y-2"><Label>Telefon (optional)</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+41 ..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Passwort</Label><Input type="password" placeholder="••••••••" value={form.password} onChange={(e) => set("password", e.target.value)} required /></div>
                <div className="space-y-2"><Label>Wiederholen</Label><Input type="password" placeholder="••••••••" value={form.password2} onChange={(e) => set("password2", e.target.value)} required /></div>
              </div>
              <p className="text-xs text-muted-foreground">Mindestens 8 Zeichen. Falls Sie bereits ein Konto mit dieser E-Mail haben, gilt Ihr bestehendes Passwort.</p>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Zugang beantragen
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Button variant="ghost" onClick={() => navigate("/tenant-auth")} className="text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" /> Ich habe bereits einen Zugang
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TenantSignup;
