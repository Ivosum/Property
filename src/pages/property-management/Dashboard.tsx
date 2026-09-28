import { useAuth } from "@/contexts/AuthContext";
import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, FileText, CreditCard, AlertTriangle, TrendingUp } from "lucide-react";

const Dashboard = () => {
  const { profile } = useAuth();

  const stats = [
    { label: "Verwaltete Objekte", value: "24", icon: Building2, change: "+2 diesen Monat" },
    { label: "Aktive Mieter", value: "156", icon: Users, change: "98% Auslastung" },
    { label: "Offene Mängel", value: "8", icon: AlertTriangle, change: "3 dringend" },
    { label: "Monatliche Einnahmen", value: "CHF 245'000", icon: CreditCard, change: "+5.2%" },
  ];

  return (
    <PropertyManagementLayout>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">
          Willkommen{profile?.first_name ? `, ${profile.first_name}` : ""}
        </h1>
        <p className="text-muted-foreground mt-1">
          Ihr Immobilienverwaltungs-Dashboard
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-xs text-primary mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Offene Mängelmeldungen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { unit: "Bahnhofstrasse 12, 3.OG links", issue: "Heizung defekt", priority: "Dringend", date: "vor 2 Tagen" },
                { unit: "Seestrasse 45, 1.OG", issue: "Wasserhahn tropft", priority: "Normal", date: "vor 5 Tagen" },
                { unit: "Hauptstrasse 8, EG", issue: "Fenster klemmt", priority: "Niedrig", date: "vor 1 Woche" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{item.unit}</p>
                    <p className="text-sm text-muted-foreground">{item.issue}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      item.priority === "Dringend" ? "bg-destructive/20 text-destructive" :
                      item.priority === "Normal" ? "bg-orange-100 text-orange-700" :
                      "bg-secondary text-muted-foreground"
                    }`}>
                      {item.priority}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">{item.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Ausstehende Zahlungen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { tenant: "Müller Hans", unit: "Bahnhofstrasse 12, 2.OG", amount: "CHF 1'850", due: "Fällig: 01.02.2026" },
                { tenant: "Schmidt Anna", unit: "Seestrasse 45, 3.OG", amount: "CHF 2'200", due: "Fällig: 01.02.2026" },
                { tenant: "Weber Thomas", unit: "Hauptstrasse 8, 1.OG", amount: "CHF 1'650", due: "Überfällig: 15.01.2026" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{item.tenant}</p>
                    <p className="text-sm text-muted-foreground">{item.unit}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{item.amount}</p>
                    <p className={`text-xs ${item.due.includes("Überfällig") ? "text-destructive" : "text-muted-foreground"}`}>
                      {item.due}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PropertyManagementLayout>
  );
};

export default Dashboard;
