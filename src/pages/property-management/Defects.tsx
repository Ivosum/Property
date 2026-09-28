import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, CheckCircle, Wrench } from "lucide-react";

const Defects = () => {
  const defects = [
    { id: 1, unit: "Bahnhofstrasse 12, 3.OG links", issue: "Heizung defekt", reporter: "Meier Stefan", date: "03.02.2026", priority: "Dringend", status: "Offen" },
    { id: 2, unit: "Seestrasse 45, 1.OG", issue: "Wasserhahn tropft", reporter: "Müller Anna", date: "30.01.2026", priority: "Normal", status: "In Bearbeitung" },
    { id: 3, unit: "Hauptstrasse 8, EG", issue: "Fenster klemmt", reporter: "Weber Thomas", date: "25.01.2026", priority: "Niedrig", status: "Offen" },
    { id: 4, unit: "Bergweg 23, 2.OG", issue: "Steckdose defekt", reporter: "Keller Maria", date: "20.01.2026", priority: "Normal", status: "Erledigt" },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Offen": return <Clock className="w-4 h-4" />;
      case "In Bearbeitung": return <Wrench className="w-4 h-4" />;
      case "Erledigt": return <CheckCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <PropertyManagementLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Mängelmeldungen</h1>
          <p className="text-muted-foreground mt-1">Verwalten Sie gemeldete Mängel und Reparaturen</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-destructive/10 border-destructive/20">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-destructive" />
            <div>
              <p className="text-2xl font-bold">3</p>
              <p className="text-sm text-muted-foreground">Dringend</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">5</p>
              <p className="text-sm text-muted-foreground">Offen</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Wrench className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">2</p>
              <p className="text-sm text-muted-foreground">In Bearbeitung</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">48</p>
              <p className="text-sm text-muted-foreground">Erledigt (Monat)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alle Mängelmeldungen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {defects.map((defect) => (
              <div key={defect.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    defect.priority === "Dringend" ? "bg-destructive/20" :
                    defect.priority === "Normal" ? "bg-orange-100" : "bg-secondary"
                  }`}>
                    <AlertTriangle className={`w-5 h-5 ${
                      defect.priority === "Dringend" ? "text-destructive" :
                      defect.priority === "Normal" ? "text-orange-600" : "text-muted-foreground"
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium">{defect.issue}</p>
                    <p className="text-sm text-muted-foreground">{defect.unit}</p>
                    <p className="text-xs text-muted-foreground mt-1">Gemeldet von {defect.reporter} am {defect.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                    defect.status === "Offen" ? "bg-orange-100 text-orange-700" :
                    defect.status === "In Bearbeitung" ? "bg-primary/20 text-primary" :
                    "bg-green-100 text-green-700"
                  }`}>
                    {getStatusIcon(defect.status)}
                    {defect.status}
                  </span>
                  <Button variant="outline" size="sm">Details</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PropertyManagementLayout>
  );
};

export default Defects;
