import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import OffMarketLayout from "@/components/off-market/OffMarketLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Download, Eye, CheckCircle, Clock, Loader2 } from "lucide-react";

interface DocRow {
  id: string;
  file_name: string;
  file_url: string;
  document_type: string;
  verified: boolean | null;
  created_at: string;
}

const typeLabels: Record<string, string> = {
  kyc_id: "KYC – Ausweis",
  kyc_proof_of_address: "KYC – Adressnachweis",
  financial_proof: "Finanznachweis",
  property_deed: "Grundbuchauszug",
  floor_plan: "Grundriss",
  energy_certificate: "Energieausweis",
  other: "Sonstiges",
};

const Documents = () => {
  const { user } = useAuth();

  const { data: documents, isLoading } = useQuery({
    queryKey: ["off-market-documents", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, file_name, file_url, document_type, verified, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DocRow[];
    },
  });

  const docs = documents ?? [];
  const kycCount = docs.filter((d) => d.document_type.startsWith("kyc")).length;
  const finCount = docs.filter((d) => d.document_type === "financial_proof").length;
  const propCount = docs.filter((d) =>
    ["property_deed", "floor_plan", "energy_certificate"].includes(d.document_type)
  ).length;

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("de-CH");

  return (
    <OffMarketLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Dokumente</h1>
          <p className="text-muted-foreground mt-1">
            Verwalten Sie Ihre Unterlagen und Nachweise
          </p>
        </div>
        <Button>
          <Upload className="w-4 h-4 mr-2" />
          Dokument hochladen
        </Button>
      </div>

      {/* Document Categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: "KYC-Dokumente", count: kycCount },
          { label: "Finanznachweise", count: finCount },
          { label: "Immobilienunterlagen", count: propCount },
        ].map((cat) => (
          <Card key={cat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{cat.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {isLoading ? "…" : `${cat.count} hochgeladen`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Alle Dokumente</CardTitle>
          <CardDescription>Übersicht über alle hochgeladenen Unterlagen</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Dokumente werden geladen...
            </div>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <FileText className="w-10 h-10 mb-3 opacity-40" />
              <p>Noch keine Dokumente hochgeladen.</p>
            </div>
          ) : (
            <div className="divide-y">
              {docs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{doc.file_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {typeLabels[doc.document_type] ?? doc.document_type} • {formatDate(doc.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.verified ? (
                      <span className="flex items-center gap-1 text-sm text-primary">
                        <CheckCircle className="w-4 h-4" />
                        Verifiziert
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-sm text-amber-600">
                        <Clock className="w-4 h-4" />
                        In Prüfung
                      </span>
                    )}
                    <Button variant="ghost" size="icon" asChild>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <Eye className="w-4 h-4" />
                      </a>
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                      <a href={doc.file_url} download>
                        <Download className="w-4 h-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </OffMarketLayout>
  );
};

export default Documents;
