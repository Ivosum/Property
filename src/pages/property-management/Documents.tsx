import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Download, Folder, File, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const Documents = () => {
  const folders = [
    { name: "Mietverträge", count: 156, icon: FileText },
    { name: "Nebenkostenabrechnungen", count: 48, icon: File },
    { name: "Wohnungsabnahmen", count: 32, icon: File },
    { name: "Korrespondenz", count: 245, icon: Folder },
  ];

  const recentDocs = [
    { name: "Mietvertrag_Mueller_2026.pdf", type: "PDF", size: "245 KB", date: "03.02.2026" },
    { name: "NK_Abrechnung_2025_Bahnhofstr12.pdf", type: "PDF", size: "1.2 MB", date: "01.02.2026" },
    { name: "Wohnungsabnahme_Schmidt.pdf", type: "PDF", size: "890 KB", date: "28.01.2026" },
    { name: "Mahnung_Weber_Jan2026.pdf", type: "PDF", size: "120 KB", date: "25.01.2026" },
  ];

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
        <Input placeholder="Dokumente suchen..." className="pl-10" />
      </div>

      {/* Folders */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {folders.map((folder) => (
          <Card key={folder.name} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <folder.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{folder.name}</p>
                <p className="text-sm text-muted-foreground">{folder.count} Dokumente</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Zuletzt hinzugefügt</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentDocs.map((doc, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-destructive" />
                  <div>
                    <p className="font-medium text-sm">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{doc.size} • {doc.date}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PropertyManagementLayout>
  );
};

export default Documents;
