import { type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlan } from "@/components/property-management/PlanContext";
import { FEATURE_LABELS, type FeatureKey } from "@/lib/plan";

// Sperrt den Inhalt, wenn die Funktion nicht im aktuellen Plan enthalten ist.
const FeatureGate = ({ feature, children }: { feature: FeatureKey; children: ReactNode }) => {
  const { can, loading, plan } = usePlan();
  const navigate = useNavigate();

  if (loading || can(feature)) return <>{children}</>;

  const label = FEATURE_LABELS.find((f) => f.key === feature)?.label ?? "Diese Funktion";

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-md w-full text-center rounded-2xl border bg-card p-8">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6 text-primary" />
        </div>
        <h2 className="font-display text-xl font-bold">{label} ist nicht im {plan?.name ?? "aktuellen"}-Plan</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Schalten Sie diese Funktion mit einem höheren Plan frei – inklusive weiterer Werkzeuge für Ihre Verwaltung.
        </p>
        <Button className="mt-5" onClick={() => navigate("/property-management/subscription")}>
          <Sparkles className="w-4 h-4 mr-2" /> Pläne ansehen
        </Button>
      </div>
    </div>
  );
};

export default FeatureGate;
