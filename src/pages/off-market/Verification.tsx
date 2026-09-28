import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import OffMarketLayout from "@/components/off-market/OffMarketLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Upload, CheckCircle, Clock, XCircle, FileCheck } from "lucide-react";
import { toast } from "sonner";

type DbDocumentType =
  | "kyc_id"
  | "kyc_proof_of_address"
  | "financial_proof"
  | "property_deed"
  | "floor_plan"
  | "energy_certificate"
  | "other";

interface RequiredDoc {
  type: string;
  dbType: DbDocumentType;
  label: string;
  description: string;
  required: boolean;
}

const Verification = () => {
  const { user, profile, role, refreshProfile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<Record<string, File | null>>({});

  const getStatusIcon = () => {
    switch (profile?.kyc_status) {
      case "verified":
        return <CheckCircle className="w-16 h-16 text-green-500" />;
      case "submitted":
        return <Clock className="w-16 h-16 text-yellow-500" />;
      case "rejected":
        return <XCircle className="w-16 h-16 text-red-500" />;
      default:
        return <Shield className="w-16 h-16 text-muted-foreground" />;
    }
  };

  const getStatusMessage = () => {
    switch (profile?.kyc_status) {
      case "verified":
        return {
          title: "Verifizierung abgeschlossen",
          description:
            "Ihre Identität wurde erfolgreich verifiziert. Sie haben vollen Zugang zur Plattform.",
        };
      case "submitted":
        return {
          title: "In Bearbeitung",
          description:
            "Ihre Dokumente werden geprüft. Dies dauert in der Regel 1-2 Werktage.",
        };
      case "rejected":
        return {
          title: "Verifizierung abgelehnt",
          description:
            "Bitte laden Sie Ihre Dokumente erneut hoch oder kontaktieren Sie den Support.",
        };
      default:
        return {
          title: "Verifizierung erforderlich",
          description:
            "Laden Sie Ihre Dokumente hoch, um Zugang zu allen Funktionen zu erhalten.",
        };
    }
  };

  const requiredDocs: RequiredDoc[] = [
    {
      type: "kyc_id",
      dbType: "kyc_id",
      label: "Ausweis / Pass",
      description: "Gültiger Personalausweis oder Reisepass",
      required: true,
    },
    {
      type: "kyc_proof_of_address",
      dbType: "kyc_proof_of_address",
      label: "Adressnachweis",
      description: "Rechnung oder Kontoauszug (nicht älter als 3 Monate)",
      required: true,
    },
    ...(role === "buyer"
      ? [
          {
            type: "financial_proof",
            dbType: "financial_proof" as DbDocumentType,
            label: "Finanznachweis",
            description: "Bankbestätigung oder Finanzierungszusage",
            required: true,
          },
        ]
      : []),
    ...(role === "broker"
      ? [
          {
            type: "broker_license",
            dbType: "other" as DbDocumentType,
            label: "Maklerlizenz",
            description: "Gültige Maklerlizenz oder Gewerbeanmeldung",
            required: true,
          },
        ]
      : []),
  ];

  const handleFileChange = (docType: string, file: File | null) => {
    setFiles((prev) => ({ ...prev, [docType]: file }));
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Nicht angemeldet", {
        description: "Bitte melden Sie sich erneut an.",
      });
      return;
    }

    const missing = requiredDocs.filter((doc) => doc.required && !files[doc.type]);
    if (missing.length > 0) {
      toast.error("Dokumente fehlen", {
        description: `Bitte laden Sie folgende Dokumente hoch: ${missing
          .map((d) => d.label)
          .join(", ")}`,
      });
      return;
    }

    setUploading(true);

    try {
      for (const doc of requiredDocs) {
        const file = files[doc.type];
        if (!file) continue;

        const fileExt = file.name.split(".").pop();
        const filePath = `${user.id}/${doc.type}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(filePath, file, { upsert: true });

        if (uploadError) {
          throw new Error(`Upload fehlgeschlagen (${doc.label}): ${uploadError.message}`);
        }

        const { error: insertError } = await supabase.from("documents").insert({
          user_id: user.id,
          document_type: doc.dbType,
          file_url: filePath,
          file_name: file.name,
        });

        if (insertError) {
          throw new Error(
            `Speichern fehlgeschlagen (${doc.label}): ${insertError.message}`
          );
        }
      }

      const { error: statusError } = await supabase
        .from("profiles")
        .update({ kyc_status: "submitted" })
        .eq("user_id", user.id);

      if (statusError) {
        throw new Error(`Status-Update fehlgeschlagen: ${statusError.message}`);
      }

      await refreshProfile();
      setFiles({});

      toast.success("Verifizierung eingereicht", {
        description: "Ihre Dokumente werden nun geprüft.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      toast.error("Fehler beim Einreichen", { description: message });
    } finally {
      setUploading(false);
    }
  };

  const status = getStatusMessage();

  return (
    <OffMarketLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold">Verifizierung</h1>
          <p className="text-muted-foreground mt-1">
            KYC-Prüfung für sicheren Immobilienhandel
          </p>
        </div>

        <Card className="mb-8">
          <CardContent className="flex flex-col items-center py-8">
            {getStatusIcon()}
            <h2 className="font-display text-xl font-bold mt-4">{status.title}</h2>
            <p className="text-muted-foreground text-center mt-2 max-w-md">
              {status.description}
            </p>
          </CardContent>
        </Card>

        {profile?.kyc_status !== "verified" && profile?.kyc_status !== "submitted" && (
          <div className="space-y-4">
            <h3 className="font-display text-lg font-semibold">Erforderliche Dokumente</h3>

            {requiredDocs.map((doc) => (
              <Card key={doc.type}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{doc.label}</CardTitle>
                      <CardDescription>{doc.description}</CardDescription>
                    </div>
                    {doc.required && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        Erforderlich
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="flex-1"
                      disabled={uploading}
                      onChange={(e) =>
                        handleFileChange(doc.type, e.target.files?.[0] ?? null)
                      }
                    />
                    {files[doc.type] && (
                      <FileCheck className="w-5 h-5 text-green-500 shrink-0" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="pt-4">
              <Button
                className="w-full"
                size="lg"
                disabled={uploading}
                onClick={handleSubmit}
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? "Wird eingereicht..." : "Verifizierung einreichen"}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Ihre Daten werden verschlüsselt übertragen und sicher gespeichert.
              </p>
            </div>
          </div>
        )}
      </div>
    </OffMarketLayout>
  );
};

export default Verification;
