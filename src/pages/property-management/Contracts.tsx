import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Download, Eye } from "lucide-react";

const Contracts = () => {
  const contracts = [
    { id: 1, tenant: "Hans Müller", unit: "Bahnhofstr. 12, 2.OG", start: "01.01.2023", end: "Unbefristet", rent: "CHF 1'850", status: "Aktiv" },
    { id: 2, tenant: "Anna Schmidt", unit: "Seestrasse 45, 3.OG", start: "01.06.2022", end: "Unbefristet", rent: "CHF 2'200", status: "Aktiv" },
    { id: 3, tenant: "Thomas Weber", unit: "Hauptstrasse 8, 1.OG", start: "01.03.2021", end: "28.02.2026", rent: "CHF 1'650", status: "Kündigung eingereicht" },
    { id: 4, tenant: "Maria Keller", unit: "Bergweg 23, EG", start: "01.09.2024", end: "Unbefristet", rent: "CHF 1'400", status: "Aktiv" },
  ];

  return (
    <PropertyManagementLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Mietverträge</h1>
          <p className="text-muted-foreground mt-1">Verwalten und erstellen Sie Mietverträge</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Vertrag erstellen
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Alle Mietverträge
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Mieter</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Einheit</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Beginn</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Ende</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Miete</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr key={contract.id} className="border-b hover:bg-secondary/30">
                    <td className="py-3 px-4 font-medium">{contract.tenant}</td>
                    <td className="py-3 px-4 text-muted-foreground">{contract.unit}</td>
                    <td className="py-3 px-4">{contract.start}</td>
                    <td className="py-3 px-4">{contract.end}</td>
                    <td className="py-3 px-4 font-medium">{contract.rent}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        contract.status === "Aktiv" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                      }`}>
                        {contract.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </PropertyManagementLayout>
  );
};

export default Contracts;
