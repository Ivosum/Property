import OffMarketLayout from "@/components/off-market/OffMarketLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Shield, CheckCircle, XCircle, Clock } from "lucide-react";

const AdminUsers = () => {
  // Mock users data
  const users = [
    {
      id: "1",
      name: "Max Muster",
      email: "max@example.com",
      role: "buyer",
      kyc_status: "verified",
      created_at: "10.01.2025",
    },
    {
      id: "2",
      name: "Anna Schmidt",
      email: "anna@example.com",
      role: "seller",
      kyc_status: "submitted",
      created_at: "12.01.2025",
    },
    {
      id: "3",
      name: "Peter Weber",
      email: "peter@example.com",
      role: "broker",
      kyc_status: "verified",
      created_at: "08.01.2025",
    },
    {
      id: "4",
      name: "Lisa Huber",
      email: "lisa@example.com",
      role: "buyer",
      kyc_status: "pending",
      created_at: "15.01.2025",
    },
  ];

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "buyer": return <Badge>Käufer</Badge>;
      case "seller": return <Badge variant="secondary">Verkäufer</Badge>;
      case "broker": return <Badge variant="outline">Makler</Badge>;
      case "admin": return <Badge className="bg-primary">Admin</Badge>;
      default: return null;
    }
  };

  const getKycStatus = (status: string) => {
    switch (status) {
      case "verified":
        return <span className="flex items-center gap-1 text-primary"><CheckCircle className="w-4 h-4" /> Verifiziert</span>;
      case "submitted":
        return <span className="flex items-center gap-1 text-accent-foreground"><Clock className="w-4 h-4" /> In Prüfung</span>;
      case "rejected":
        return <span className="flex items-center gap-1 text-destructive"><XCircle className="w-4 h-4" /> Abgelehnt</span>;
      default:
        return <span className="text-muted-foreground">Ausstehend</span>;
    }
  };

  return (
    <OffMarketLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Benutzerverwaltung</h1>
          <p className="text-muted-foreground mt-1">
            Verwalten Sie alle Nutzer der Plattform
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Benutzer suchen..." className="pl-10" />
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Alle Benutzer</CardTitle>
          <CardDescription>{users.length} registrierte Nutzer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Name</th>
                  <th className="text-left py-3 px-4 font-medium">E-Mail</th>
                  <th className="text-left py-3 px-4 font-medium">Rolle</th>
                  <th className="text-left py-3 px-4 font-medium">KYC Status</th>
                  <th className="text-left py-3 px-4 font-medium">Registriert</th>
                  <th className="text-left py-3 px-4 font-medium">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-primary font-semibold text-sm">{user.name[0]}</span>
                        </div>
                        {user.name}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{user.email}</td>
                    <td className="py-3 px-4">{getRoleBadge(user.role)}</td>
                    <td className="py-3 px-4">{getKycStatus(user.kyc_status)}</td>
                    <td className="py-3 px-4 text-muted-foreground">{user.created_at}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">Details</Button>
                        {user.kyc_status === "submitted" && (
                          <Button size="sm">Verifizieren</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </OffMarketLayout>
  );
};

export default AdminUsers;
