import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import OffMarketLayout from "@/components/off-market/OffMarketLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle, XCircle, Clock, Loader2, Users as UsersIcon } from "lucide-react";

interface UserRow {
  id: string;
  name: string;
  role: string;
  kyc_status: string;
  created_at: string;
}

const AdminUsers = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
        supabase.from("profiles").select("user_id, first_name, last_name, kyc_status, created_at"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (pErr) throw pErr;
      if (rErr) throw rErr;
      const roleByUser = new Map<string, string>();
      (roles ?? []).forEach((r) => {
        // admin hat Vorrang in der Anzeige
        if (!roleByUser.has(r.user_id) || r.role === "admin") roleByUser.set(r.user_id, r.role);
      });
      return (profiles ?? []).map((p) => ({
        id: p.user_id,
        name: [p.first_name, p.last_name].filter(Boolean).join(" ") || "Unbenannt",
        role: roleByUser.get(p.user_id) ?? "buyer",
        kyc_status: p.kyc_status ?? "pending",
        created_at: p.created_at
          ? new Date(p.created_at).toLocaleDateString("de-CH")
          : "-",
      })) as UserRow[];
    },
  });

  const term = searchTerm.trim().toLowerCase();
  const filtered = (users ?? []).filter(
    (u) => !term || u.name.toLowerCase().includes(term)
  );

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
        return <span className="flex items-center gap-1 text-amber-600"><Clock className="w-4 h-4" /> In Prüfung</span>;
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
          <Input
            placeholder="Benutzer suchen..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Alle Benutzer</CardTitle>
          <CardDescription>{filtered.length} registrierte Nutzer</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Benutzer werden geladen...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <UsersIcon className="w-10 h-10 mb-3 opacity-40" />
              <p>Keine Benutzer gefunden.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Name</th>
                    <th className="text-left py-3 px-4 font-medium">Rolle</th>
                    <th className="text-left py-3 px-4 font-medium">KYC Status</th>
                    <th className="text-left py-3 px-4 font-medium">Registriert</th>
                    <th className="text-left py-3 px-4 font-medium">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-primary font-semibold text-sm">{user.name[0]}</span>
                          </div>
                          {user.name}
                        </div>
                      </td>
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
          )}
        </CardContent>
      </Card>
    </OffMarketLayout>
  );
};

export default AdminUsers;
