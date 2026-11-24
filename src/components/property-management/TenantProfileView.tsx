import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, History, ShieldCheck, Car, User, IdCard, Eye, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  getTenantProfileById, getMyFieldHistory, getTenantIdSignedUrl,
  type TenantProfile, type FieldHistoryEntry,
} from "@/lib/pmData";

const maritalLabel = (v: string | null | undefined) => ({
  ledig: "Ledig", verheiratet: "Verheiratet", eingetragene_partnerschaft: "Eingetragene Partnerschaft",
  getrennt: "Getrennt lebend", geschieden: "Geschieden", verwitwet: "Verwitwet",
} as Record<string, string>)[v ?? ""] ?? (v || "–");

const Row = ({ label, value, history }: { label: string; value: React.ReactNode; history?: FieldHistoryEntry[] }) => (
  <div className="py-2 border-b last:border-0">
    <div className="flex justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value || "–"}</span>
    </div>
    {history && history.length > 0 && (
      <div className="mt-1 space-y-0.5 text-right">
        {history.map((h) => (
          <p key={h.id} className="text-xs text-muted-foreground flex items-center justify-end gap-1">
            <History className="w-3 h-3" />
            <span className="line-through">{h.old_value || "—"}</span>
            <span className="opacity-60">· {new Date(h.changed_at).toLocaleDateString("de-CH")}</span>
          </p>
        ))}
      </div>
    )}
  </div>
);

const TenantProfileView = ({ tenantId }: { tenantId: string }) => {
  const [p, setP] = useState<TenantProfile | null>(null);
  const [hist, setHist] = useState<FieldHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const prof = await getTenantProfileById(tenantId);
        setP(prof);
        if (prof) setHist(await getMyFieldHistory(prof.id));
      } finally { setLoading(false); }
    })();
  }, [tenantId]);

  const hf = (field: string, map?: (v: string | null) => string | null) =>
    hist.filter((h) => h.field === field).map((h) => map ? { ...h, old_value: map(h.old_value) } : h);

  const openId = async (path: string | null) => {
    if (!path) return;
    const url = await getTenantIdSignedUrl(path);
    if (url) window.open(url, "_blank", "noopener");
    else toast.error("Dokument konnte nicht geöffnet werden.");
  };

  if (loading) return <Card><CardContent className="py-8 flex items-center justify-center text-muted-foreground">
    <Loader2 className="w-5 h-5 animate-spin mr-2" /> Profil wird geladen...</CardContent></Card>;
  if (!p) return null;

  const partner = p.partner && typeof p.partner === "object" ? p.partner : null;
  const idDocs: { label: string; path: string | null }[] = [
    { label: "Ausweis Vorderseite", path: p.id_front_path },
    { label: "Ausweis Rückseite", path: p.id_back_path },
    { label: "Partner-Ausweis Vorderseite", path: p.partner_id_front_path },
    { label: "Partner-Ausweis Rückseite", path: p.partner_id_back_path },
  ].filter((d) => d.path);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4" /> Persönliche Angaben</CardTitle></CardHeader>
        <CardContent className="py-2">
          <Row label="Geburtsdatum" value={p.date_of_birth ? new Date(p.date_of_birth).toLocaleDateString("de-CH") : "–"} history={hf("date_of_birth", (v) => v ? new Date(v).toLocaleDateString("de-CH") : v)} />
          <Row label="Aktuelle Adresse" value={p.current_address} history={hf("current_address")} />
          <Row label="Zivilstand" value={maritalLabel(p.marital_status)} history={hf("marital_status", (v) => maritalLabel(v))} />
          <Row label="Telefon" value={p.phone} history={hf("phone")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Privathaftpflicht</CardTitle></CardHeader>
        <CardContent className="py-2">
          <Row label="Vorhanden" value={p.has_liability_insurance == null ? "–" : p.has_liability_insurance ? "Ja" : "Nein"}
            history={hf("has_liability_insurance", (v) => v === "true" ? "Ja" : v === "false" ? "Nein" : v)} />
          <Row label="Gesellschaft" value={p.liability_company} history={hf("liability_company")} />
          <Row label="Policen-Nr." value={p.liability_policy_no} history={hf("liability_policy_no")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Car className="w-4 h-4" /> Fahrzeug</CardTitle></CardHeader>
        <CardContent className="py-2">
          <Row label="Marke / Modell" value={p.garage_brand} history={hf("garage_brand")} />
          <Row label="Kontrollschild" value={p.garage_plate} history={hf("garage_plate")} />
        </CardContent>
      </Card>

      {partner && (partner.first_name || partner.last_name) && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4" /> Partner / Mitbewohner</CardTitle></CardHeader>
          <CardContent className="py-2">
            <Row label="Name" value={[partner.first_name, partner.last_name].filter(Boolean).join(" ")} />
            <Row label="Geburtsdatum" value={partner.date_of_birth ? new Date(partner.date_of_birth).toLocaleDateString("de-CH") : "–"} />
          </CardContent>
        </Card>
      )}

      {idDocs.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><IdCard className="w-4 h-4" /> Ausweis-Dokumente</CardTitle></CardHeader>
          <CardContent className="py-2 space-y-2">
            {idDocs.map((d) => (
              <div key={d.label} className="flex items-center justify-between gap-2 p-2 rounded-lg border">
                <span className="flex items-center gap-2 text-sm"><FileText className="w-4 h-4 text-muted-foreground" /> {d.label}</span>
                <Button variant="outline" size="sm" onClick={() => openId(d.path)}><Eye className="w-4 h-4 mr-1" /> Ansehen</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TenantProfileView;
