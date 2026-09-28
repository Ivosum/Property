import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, TrendingUp, TrendingDown, DollarSign, AlertCircle } from "lucide-react";

const Finances = () => {
  const payments = [
    { id: 1, tenant: "Hans Müller", amount: "CHF 1'850", date: "01.02.2026", status: "Bezahlt" },
    { id: 2, tenant: "Anna Schmidt", amount: "CHF 2'200", date: "01.02.2026", status: "Ausstehend" },
    { id: 3, tenant: "Thomas Weber", amount: "CHF 1'650", date: "15.01.2026", status: "Überfällig" },
    { id: 4, tenant: "Maria Keller", amount: "CHF 1'400", date: "01.02.2026", status: "Bezahlt" },
  ];

  return (
    <PropertyManagementLayout>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Finanzen</h1>
        <p className="text-muted-foreground mt-1">Übersicht über Einnahmen und Ausgaben</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-primary" />
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold">CHF 245'000</p>
            <p className="text-sm text-muted-foreground">Monatliche Einnahmen</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <CreditCard className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold">CHF 238'500</p>
            <p className="text-sm text-muted-foreground">Bezahlte Mieten</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-2xl font-bold">CHF 6'500</p>
            <p className="text-sm text-muted-foreground">Ausstehend</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingDown className="w-5 h-5 text-destructive" />
            </div>
            <p className="text-2xl font-bold">CHF 45'000</p>
            <p className="text-sm text-muted-foreground">Monatliche Ausgaben</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Aktuelle Zahlungen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <div>
                  <p className="font-medium">{payment.tenant}</p>
                  <p className="text-sm text-muted-foreground">Fällig: {payment.date}</p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-semibold">{payment.amount}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    payment.status === "Bezahlt" ? "bg-green-100 text-green-700" :
                    payment.status === "Ausstehend" ? "bg-orange-100 text-orange-700" :
                    "bg-destructive/20 text-destructive"
                  }`}>
                    {payment.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PropertyManagementLayout>
  );
};

export default Finances;
