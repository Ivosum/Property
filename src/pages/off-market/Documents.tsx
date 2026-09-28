import OffMarketLayout from "@/components/off-market/OffMarketLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Download, Eye, Trash2, CheckCircle, Clock } from "lucide-react";

const Documents = () => {
  // Mock documents
  const documents = [
    {
      id: "1",
      name: "Personalausweis.pdf",
      type: "KYC - Ausweis",
      uploadedAt: "15.01.2025",
      verified: true,
    },
    {
      id: "2",
      name: "Finanzierungsbestätigung.pdf",
      type: "Finanznachweis",
      uploadedAt: "15.01.2025",
      verified: false,
    },
  ];

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
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">KYC-Dokumente</p>
                <p className="text-sm text-muted-foreground">1 von 2 hochgeladen</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Finanznachweise</p>
                <p className="text-sm text-muted-foreground">1 hochgeladen</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Immobilienunterlagen</p>
                <p className="text-sm text-muted-foreground">0 hochgeladen</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Alle Dokumente</CardTitle>
          <CardDescription>Übersicht über alle hochgeladenen Unterlagen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{doc.name}</p>
                    <p className="text-sm text-muted-foreground">{doc.type} • {doc.uploadedAt}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {doc.verified ? (
                    <span className="flex items-center gap-1 text-sm text-primary">
                      <CheckCircle className="w-4 h-4" />
                      Verifiziert
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      In Prüfung
                    </span>
                  )}
                  <Button variant="ghost" size="icon">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </OffMarketLayout>
  );
};

export default Documents;
