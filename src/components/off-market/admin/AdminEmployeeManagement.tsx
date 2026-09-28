import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Shield, Edit, Trash2, Mail, Phone } from "lucide-react";
import { toast } from "sonner";

interface AdminEmployee {
  id: string;
  user_id: string;
  role: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  can_manage_users: boolean;
  can_verify_documents: boolean;
  can_view_financials: boolean;
  can_manage_properties: boolean;
  is_active: boolean;
  created_at: string;
}

const AdminEmployeeManagement = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<AdminEmployee | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    role: "admin_employee",
    can_manage_users: false,
    can_verify_documents: true,
    can_view_financials: false,
    can_manage_properties: false,
  });
  const queryClient = useQueryClient();

  const { data: employees, isLoading } = useQuery({
    queryKey: ["admin-employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_employees")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AdminEmployee[];
    },
  });

  const createEmployeeMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Note: In a real app, you'd create the auth user first via an edge function
      // For now, we'll just create the employee record with a placeholder user_id
      const { error } = await supabase.from("admin_employees").insert({
        user_id: crypto.randomUUID(), // Placeholder - should come from auth user creation
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone || null,
        role: data.role as any,
        can_manage_users: data.can_manage_users,
        can_verify_documents: data.can_verify_documents,
        can_view_financials: data.can_view_financials,
        can_manage_properties: data.can_manage_properties,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-employees"] });
      toast.success("Mitarbeiter erfolgreich angelegt");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error(error);
      toast.error("Fehler beim Anlegen des Mitarbeiters");
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: {
      email?: string;
      first_name?: string;
      last_name?: string;
      phone?: string | null;
      role?: "admin_manager" | "admin_employee";
      can_manage_users?: boolean;
      can_verify_documents?: boolean;
      can_view_financials?: boolean;
      can_manage_properties?: boolean;
    } }) => {
      const { error } = await supabase
        .from("admin_employees")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-employees"] });
      toast.success("Mitarbeiter aktualisiert");
      setIsDialogOpen(false);
      setEditingEmployee(null);
      resetForm();
    },
    onError: () => {
      toast.error("Fehler beim Aktualisieren");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("admin_employees")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-employees"] });
      toast.success("Status aktualisiert");
    },
  });

  const resetForm = () => {
    setFormData({
      email: "",
      first_name: "",
      last_name: "",
      phone: "",
      role: "admin_employee",
      can_manage_users: false,
      can_verify_documents: true,
      can_view_financials: false,
      can_manage_properties: false,
    });
  };

  const handleEdit = (employee: AdminEmployee) => {
    setEditingEmployee(employee);
    setFormData({
      email: employee.email,
      first_name: employee.first_name,
      last_name: employee.last_name,
      phone: employee.phone || "",
      role: employee.role,
      can_manage_users: employee.can_manage_users,
      can_verify_documents: employee.can_verify_documents,
      can_view_financials: employee.can_view_financials,
      can_manage_properties: employee.can_manage_properties,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingEmployee) {
      updateEmployeeMutation.mutate({
        id: editingEmployee.id,
        data: {
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone || null,
          role: formData.role as any,
          can_manage_users: formData.can_manage_users,
          can_verify_documents: formData.can_verify_documents,
          can_view_financials: formData.can_view_financials,
          can_manage_properties: formData.can_manage_properties,
        },
      });
    } else {
      createEmployeeMutation.mutate(formData);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin_manager":
        return <Badge className="bg-primary">Manager</Badge>;
      case "admin_employee":
        return <Badge variant="secondary">Mitarbeiter</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Mitarbeiterverwaltung</CardTitle>
          <CardDescription>
            Verwalten Sie Ihre Admin-Mitarbeiter und deren Berechtigungen
          </CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingEmployee(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" /> Mitarbeiter hinzufügen
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? "Mitarbeiter bearbeiten" : "Neuer Mitarbeiter"}
              </DialogTitle>
              <DialogDescription>
                {editingEmployee
                  ? "Bearbeiten Sie die Mitarbeiterdaten und Berechtigungen"
                  : "Legen Sie einen neuen Mitarbeiter mit spezifischen Berechtigungen an"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Vorname</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="Max"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Nachname</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Mustermann"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="max@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefon (optional)</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+41 79 123 45 67"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Rolle</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin_manager">Manager</SelectItem>
                    <SelectItem value="admin_employee">Mitarbeiter</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Berechtigungen
                </h4>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Benutzer verwalten</Label>
                    <p className="text-xs text-muted-foreground">
                      Kann Kunden anlegen und bearbeiten
                    </p>
                  </div>
                  <Switch
                    checked={formData.can_manage_users}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, can_manage_users: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Dokumente verifizieren</Label>
                    <p className="text-xs text-muted-foreground">
                      Kann KYC-Dokumente prüfen
                    </p>
                  </div>
                  <Switch
                    checked={formData.can_verify_documents}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, can_verify_documents: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Finanzdaten einsehen</Label>
                    <p className="text-xs text-muted-foreground">
                      Zugriff auf Finanzierungsanfragen
                    </p>
                  </div>
                  <Switch
                    checked={formData.can_view_financials}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, can_view_financials: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Immobilien verwalten</Label>
                    <p className="text-xs text-muted-foreground">
                      Kann Immobilien bearbeiten
                    </p>
                  </div>
                  <Switch
                    checked={formData.can_manage_properties}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, can_manage_properties: checked })
                    }
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleSubmit}>
                {editingEmployee ? "Speichern" : "Anlegen"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Lade Mitarbeiter...</div>
        ) : employees?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Keine Mitarbeiter vorhanden</p>
            <p className="text-sm">Fügen Sie Ihren ersten Mitarbeiter hinzu</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Kontakt</TableHead>
                <TableHead>Rolle</TableHead>
                <TableHead>Berechtigungen</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees?.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <span className="font-medium">
                      {employee.first_name} {employee.last_name}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="w-3 h-3" /> {employee.email}
                      </div>
                      {employee.phone && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="w-3 h-3" /> {employee.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(employee.role)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {employee.can_manage_users && (
                        <Badge variant="outline" className="text-xs">Benutzer</Badge>
                      )}
                      {employee.can_verify_documents && (
                        <Badge variant="outline" className="text-xs">Dokumente</Badge>
                      )}
                      {employee.can_view_financials && (
                        <Badge variant="outline" className="text-xs">Finanzen</Badge>
                      )}
                      {employee.can_manage_properties && (
                        <Badge variant="outline" className="text-xs">Immobilien</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={employee.is_active}
                      onCheckedChange={(checked) =>
                        toggleActiveMutation.mutate({ id: employee.id, isActive: checked })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(employee)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminEmployeeManagement;
