import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, History, Upload, CheckCircle2, ShieldCheck, Car, User, IdCard } from "lucide-react";
import { toast } from "sonner";
import {
  getMyTenantProfile, getMyFieldHistory, updateMyTenantProfile, uploadTenantIdFile,
  type TenantProfile, type FieldHistoryEntry,
} from "@/lib/pmData";

const MARITAL = [
  { v: "ledig", l: "Ledig" },
  { v: "verheiratet", l: "Verheiratet" },
  { v: "eingetragene_partnerschaft", l: "Eingetragene Partnerschaft" },
  { v: "getrennt", l: "Getrennt lebend" },
  { v: "geschieden", l: "Geschieden" },
  { v: "verwitwet", l: "Verwitwet" },
];
const maritalLabel = (v: string | null | undefined) => MARITAL.find((m) => m.v === v)?.l ?? (v || "");

// Historie-Zeile: alter Wert durchgestrichen, darunter wann geändert
const FieldHistory = ({ entries }: { entries: FieldHistoryEntry[] }) => {
  if (entries.length === 0) return null;
  return (
    <div className="mt-1 space-y-0.5">
      {entries.map((h) => (
        <p key={h.id} className="text-xs text-muted-foreground flex items-center gap-1">
          <History className="w-3 h-3 shrink-0" />
          <span className="line-through">{h.old_value || "—"}</span>
          <span className="opacity-60">· geändert {new Date(h.changed_at).toLocaleDateString("de-CH")}</span>
        </p>
      ))}
    </div>
  );
};

interface Props { onChanged?: () => void; }

const TenantProfileSection = ({ onChanged }: Props) => {
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [history, setHistory] = useState<FieldHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Formular-Entwurf
  const [f, setF] = useState<Record<string, string>>({});
  const [partner, setPartner] = useState<{ first_name?: string; last_name?: string; date_of_birth?: string }>({});
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const load = async () => {
    setLoading(true);
    try {
      const p = await getMyTenantProfile();
      setProfile(p);
      if (p) {
        setF({
          phone: p.phone ?? "",
          current_address: p.current_address ?? "",
          marital_status: p.marital_status ?? "",
          has_liability_insurance: p.has_liability_insurance == null ? "" : p.has_liability_insurance ? "ja" : "nein",
          liability_company: p.liability_company ?? "",
          liability_policy_no: p.liability_policy_no ?? "",
          garage_brand: p.garage_brand ?? "",
          garage_plate: p.garage_plate ?? "",
        });
        setPartner(p.partner && typeof p.partner === "object" ? p.partner : {});
        const h = await getMyFieldHistory(p.id);
        setHistory(h);
      }
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const histFor = (field: string) => history.filter((h) => h.field === field);

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const patch: Record<string, unknown> = {
        phone: f.phone,
        current_address: f.current_address,
        marital_status: f.marital_status,
        liability_company: f.liability_company,
        liability_policy_no: f.liability_policy_no,
        garage_brand: f.garage_brand,
        garage_plate: f.garage_plate,
        partner: (partner.first_name || partner.last_name || partner.date_of_birth) ? partner : null,
      };
      if (f.has_liability_insurance === "ja") patch.has_liability_insurance = "true";
      else if (f.has_liability_insurance === "nein") patch.has_liability_insurance = "false";

      await updateMyTenantProfile(patch);
      toast.success("Angaben gespeichert");
      onChanged?.();
      await load();
    } catch (e) {
      toast.error("Konnte nicht gespeichert werden. " + (e instanceof Error ? e.message : ""));
    } finally { setSaving(false); }
  };

  if (loading) {
    return <Card><CardContent className="py-10 flex items-center justify-center text-muted-foreground">
      <Loader2 className="w-5 h-5 animate-spin mr-2" /> Angaben werden geladen...
    </CardContent></Card>;
  }
  if (!profile) return null;

  return (
    <div className="space-y-6">
      {/* Persönliche Angaben */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> Persönliche Angaben</CardTitle>
          <CardDescription>Änderungen überschreiben den bisherigen Wert – der alte bleibt als Verlauf sichtbar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Telefon</Label>
              <Input value={f.phone} onChange={(e) => set("phone", e.target.value)} />
              <FieldHistory entries={histFor("phone")} />
            </div>
            <div>
              <Label>Zivilstand</Label>
              <Select value={f.marital_status || undefined} onValueChange={(v) => set("marital_status", v)}>
                <SelectTrigger><SelectValue placeholder="Bitte wählen" /></SelectTrigger>
                <SelectContent>{MARITAL.map((m) => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}</SelectContent>
              </Select>
              <FieldHistory entries={histFor("marital_status").map((h) => ({ ...h, old_value: maritalLabel(h.old_value) }))} />
            </div>
          </div>
          <div>
            <Label>Aktuelle Adresse</Label>
            <Input value={f.current_address} onChange={(e) => set("current_address", e.target.value)} placeholder="Strasse Nr., PLZ Ort" />
            <FieldHistory entries={histFor("current_address")} />
          </div>
        </CardContent>
      </Card>

      {/* Privathaftpflicht */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> Privathaftpflicht</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>Vorhanden?</Label>
              <Select value={f.has_liability_insurance || undefined} onValueChange={(v) => set("has_liability_insurance", v)}>
                <SelectTrigger><SelectValue placeholder="Bitte wählen" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ja">Ja</SelectItem>
                  <SelectItem value="nein">Nein</SelectItem>
                </SelectContent>
              </Select>
              <FieldHistory entries={histFor("has_liability_insurance").map((h) => ({ ...h, old_value: h.old_value === "true" ? "Ja" : h.old_value === "false" ? "Nein" : h.old_value }))} />
            </div>
            <div>
              <Label>Gesellschaft</Label>
              <Input value={f.liability_company} onChange={(e) => set("liability_company", e.target.value)} placeholder="z.B. AXA, Zurich …" />
              <FieldHistory entries={histFor("liability_company")} />
            </div>
            <div>
              <Label>Policen-Nr.</Label>
              <Input value={f.liability_policy_no} onChange={(e) => set("liability_policy_no", e.target.value)} />
              <FieldHistory entries={histFor("liability_policy_no")} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fahrzeug / Garage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Car className="w-5 h-5" /> Fahrzeug (Garage / Parkplatz)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Marke / Modell</Label>
            <Input value={f.garage_brand} onChange={(e) => set("garage_brand", e.target.value)} placeholder="z.B. VW Golf" />
            <FieldHistory entries={histFor("garage_brand")} />
          </div>
          <div>
            <Label>Kontrollschild</Label>
            <Input value={f.garage_plate} onChange={(e) => set("garage_plate", e.target.value)} placeholder="z.B. AG 123456" />
            <FieldHistory entries={histFor("garage_plate")} />
          </div>
        </CardContent>
      </Card>

      {/* Partner */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> Partner / Mitbewohner</CardTitle>
          <CardDescription>Optionale Angaben zur zweiten im Haushalt lebenden Person.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><Label>Vorname</Label><Input value={partner.first_name ?? ""} onChange={(e) => setPartner((p) => ({ ...p, first_name: e.target.value }))} /></div>
            <div><Label>Nachname</Label><Input value={partner.last_name ?? ""} onChange={(e) => setPartner((p) => ({ ...p, last_name: e.target.value }))} /></div>
            <div><Label>Geburtsdatum</Label><Input type="date" value={partner.date_of_birth ?? ""} onChange={(e) => setPartner((p) => ({ ...p, date_of_birth: e.target.value }))} /></div>
          </div>
          <FieldHistory entries={histFor("partner").map((h) => ({ ...h, old_value: "frühere Angaben" }))} />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Angaben speichern
        </Button>
      </div>

      {/* Ausweis-Uploads – separat, da Datei-Upload */}
      <IdUploads profile={profile} onUploaded={load} />
    </div>
  );
};

// Ausweis-Uploads: Mieter lädt hoch, sieht danach nur "hochgeladen".
const IdUploads = ({ profile, onUploaded }: { profile: TenantProfile; onUploaded: () => void }) => {
  const slots: { kind: "id_front" | "id_back" | "partner_id_front" | "partner_id_back"; label: string; has: boolean }[] = [
    { kind: "id_front", label: "Ausweis Vorderseite", has: !!profile.id_front_path },
    { kind: "id_back", label: "Ausweis Rückseite", has: !!profile.id_back_path },
    { kind: "partner_id_front", label: "Partner-Ausweis Vorderseite", has: !!profile.partner_id_front_path },
    { kind: "partner_id_back", label: "Partner-Ausweis Rückseite", has: !!profile.partner_id_back_path },
  ];
  const [busy, setBusy] = useState<string | null>(null);
  const refs = useRef<Record<string, HTMLInputElement | null>>({});

  const pathField: Record<string, string> = {
    id_front: "id_front_path", id_back: "id_back_path",
    partner_id_front: "partner_id_front_path", partner_id_back: "partner_id_back_path",
  };

  const handle = async (kind: typeof slots[number]["kind"], file: File) => {
    setBusy(kind);
    try {
      const path = await uploadTenantIdFile(profile.id, kind, file);
      await updateMyTenantProfile({ [pathField[kind]]: path });
      toast.success("Hochgeladen");
      onUploaded();
    } catch (e) {
      toast.error("Upload fehlgeschlagen. " + (e instanceof Error ? e.message : ""));
    } finally { setBusy(null); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><IdCard className="w-5 h-5" /> Ausweis-Dokumente</CardTitle>
        <CardDescription>
          Foto von Vorder- und Rückseite. Aus Datenschutzgründen sind hochgeladene Ausweise nur für Ihre Verwaltung einsehbar.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {slots.map((s) => (
          <div key={s.kind} className="flex items-center justify-between gap-2 p-3 rounded-lg border">
            <span className="text-sm">{s.label}</span>
            <div className="flex items-center gap-2">
              {s.has && <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400"><CheckCircle2 className="w-3.5 h-3.5" /> hochgeladen</span>}
              <input ref={(el) => (refs.current[s.kind] = el)} type="file" accept="image/*,application/pdf" capture="environment"
                className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handle(s.kind, file); e.currentTarget.value = ""; }} />
              <Button variant="outline" size="sm" onClick={() => refs.current[s.kind]?.click()} disabled={busy === s.kind}>
                {busy === s.kind ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                {s.has ? "Ersetzen" : "Hochladen"}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default TenantProfileSection;
