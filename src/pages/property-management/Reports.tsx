import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Download, FileText, TrendingUp, PieChart } from "lucide-react";

const Reports = () => {
  const reports = [
    { name: "Monatsübersicht Februar 2026", type: "Finanzübersicht", date: "05.02.2026", icon: BarChart3 },
    { name: "Auslastungsreport Q1 2026", type: "Belegung", date: "01.02.2026", icon: PieChart },
    { name: "Mängelstatistik 2025", type: "Wartung", date: "15.01.2026", icon: FileText },
    { name: "Jahresabschluss 2025", type: "Jahresbericht", date: "10.01.2026", icon: TrendingUp },
  ];

  return (
    <PropertyManagementLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Berichte</h1>
          <p className="text-muted-foreground mt-1">Analysen und automatisierte Reports</p>
        </div>
        <Button>
          <BarChart3 className="w-4 h-4 mr-2" />
          Report erstellen
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">98%</p>
                <p className="text-sm text-muted-foreground">Auslastung</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">CHF 2.9M</p>
                <p className="text-sm text-muted-foreground">Jahreseinnahmen 2025</p>
              </div>
              <BarChart3 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">156</p>
                <p className="text-sm text-muted-foreground">Aktive Mietverhältnisse</p>
              </div>
              <PieChart className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle>Verfügbare Berichte</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reports.map((report, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <report.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{report.name}</p>
                    <p className="text-sm text-muted-foreground">{report.type} • {report.date}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Herunterladen
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PropertyManagementLayout>
  );
};

export default Reports;
