import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Download, Folder, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface DocRow {
  id: string;
  name: string;
  document_type: string;
  file_url: string;
  file_size: number | null;
  created_at: string;
}

const typeLabels: Record<string, string> = {
  contract: "Mietverträge",
  utility: "Nebenkostenabrechnungen",
  handover: "Wohnungsabnahmen",
  correspondence: "Korrespondenz",
  other: "Sonstiges",
};

const formatSize = (bytes: number | null) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Öffnet ein Dokument: direkte URL oder (bei Storage-Pfad) signierte URL aus 'pm-documents'
const openDocument = async (fileUrl: string) => {
  if (/^https?:\/\//i.test(fileUrl)) {
    window.open(fileUrl, "_blank", "noopener");
    return;
  }
  const { data } = await supabase.storage.from("pm-documents").createSignedUrl(fileUrl, 3600);
  if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
};

const Documents = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: documents, isLoading } = useQuery({
    queryKey: ["pm-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pm_documents")
        .select("id, name, document_type, file_url, file_size, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DocRow[];
    },
  });

  const docs = documents ?? [];
  const term = searchTerm.trim().toLowerCase();
  const filtered = docs.filter((d) => !term || d.name.toLowerCase().includes(term));

  // Ordner nach Typ aggregieren
  const folderCounts = new Map<string, number>();
  docs.forEach((d) => folderCounts.set(d.document_type, (folderCounts.get(d.document_type) ?? 0) + 1));
  const folders = [...folderCounts.entries()].map(([type, count]) => ({
    name: typeLabels[type] ?? type,
    count,
  }));

  return (
    <PropertyManagementLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Dokumente</h1>
          <p className="text-muted-foreground mt-1">Zentrale Dokumentenverwaltung</p>
        </div>
        <Button>
          <Upload className="w-4 h-4 mr-2" />
          Dokument hochladen
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Dokumente suchen..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Folders */}
      {folders.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {folders.map((folder) => (
            <Card key={folder.name} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Folder className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{folder.name}</p>
                  <p className="text-sm text-muted-foreground">{folder.count} Dokumente</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recent Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Alle Dokumente ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Dokumente werden geladen...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <FileText className="w-10 h-10 mb-3 opacity-40" />
              <p>Noch keine Dokumente vorhanden.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-destructive" />
                    <div>
                      <p className="font-medium text-sm">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[formatSize(doc.file_size), new Date(doc.created_at).toLocaleDateString("de-CH")].filter(Boolean).join(" • ")}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => openDocument(doc.file_url)}>
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PropertyManagementLayout>
  );
};

export default Documents;
