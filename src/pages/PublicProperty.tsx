import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Maximize, DoorOpen, Home as HomeIcon, Building2, ArrowRight } from "lucide-react";
import { getPublicProperty, formatCHF, PROPERTY_TYPE_LABEL } from "@/lib/omData";

const PublicProperty = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [p, setP] = useState<any | null>(null);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    getPublicProperty(token).then(setP).finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return <div className="min-h-screen bg-secondary/30 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>;
  }

  if (!p) {
    return <div className="min-h-screen bg-secondary/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md"><CardContent className="py-10 text-center">
        <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <p className="font-medium">Objekt nicht gefunden</p>
        <p className="text-sm text-muted-foreground mt-1">Dieser Link ist ungültig oder nicht mehr verfügbar.</p>
      </CardContent></Card>
    </div>;
  }

  const facts = [
    p.living_area_sqm && { icon: Maximize, label: "Wohnfläche", value: `${p.living_area_sqm} m²` },
    p.plot_area_sqm && { icon: MapPin, label: "Grundstück", value: `${p.plot_area_sqm} m²` },
    p.rooms && { icon: DoorOpen, label: "Zimmer", value: `${p.rooms}` },
    { icon: HomeIcon, label: "Typ", value: PROPERTY_TYPE_LABEL[p.property_type] ?? p.property_type },
  ].filter(Boolean) as { icon: any; label: string; value: string }[];

  const regUrl = p.broker_ref_code ? `/auth?ref=${p.broker_ref_code}` : "/auth";

  return (
    <div className="min-h-screen bg-secondary/30">
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <Card className="overflow-hidden">
          {p.featured_image_url ? (
            <div className="aspect-[16/10] bg-muted">
              <img src={p.featured_image_url} alt={p.title} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="aspect-[16/10] bg-primary/5 flex items-center justify-center">
              <Building2 className="w-14 h-14 text-primary/30" />
            </div>
          )}
          <CardContent className="p-5 sm:p-6">
            <p className="text-xs uppercase tracking-wide text-primary font-medium">Off-Market Angebot</p>
            <h1 className="font-display text-2xl font-bold mt-1">{p.title}</h1>
            <p className="text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="w-4 h-4" /> {p.city} ({p.canton})
            </p>

            <p className="text-3xl font-bold mt-4 tabular-nums">{formatCHF(Number(p.price), p.currency)}</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              {facts.map((f) => (
                <div key={f.label} className="rounded-lg border p-3 text-center">
                  <f.icon className="w-5 h-5 mx-auto text-primary mb-1" />
                  <p className="font-semibold text-sm">{f.value}</p>
                  <p className="text-xs text-muted-foreground">{f.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-5 border-t">
              <p className="text-sm text-muted-foreground">
                {p.broker_name
                  ? <>Angeboten über <span className="font-medium text-foreground">{p.broker_name}</span>. Registrieren Sie sich, um alle Details und weitere Off-Market-Objekte zu sehen.</>
                  : <>Registrieren Sie sich, um alle Details und weitere Off-Market-Objekte zu sehen.</>}
              </p>
              <Button className="w-full mt-3" onClick={() => navigate(regUrl)}>
                Jetzt registrieren & Details ansehen <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground mt-4">Property Network · Schweizer Off-Market Plattform</p>
      </div>
    </div>
  );
};

export default PublicProperty;
