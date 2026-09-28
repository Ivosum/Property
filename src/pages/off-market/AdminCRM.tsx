import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import OffMarketLayout from "@/components/off-market/OffMarketLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Users, UserCheck, FileText, Building2, Clock, CheckCircle, XCircle, Eye, UserPlus, Mail, Phone, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import AdminEmployeeManagement from "@/components/off-market/admin/AdminEmployeeManagement";
import CustomerDetailPanel from "@/components/off-market/admin/CustomerDetailPanel";

interface CustomerData {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: string;
  kyc_status: string;
  created_at: string;
  company_name: string | null;
}

const AdminCRM = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch all customers with their roles and profiles
  const { data: customers, isLoading } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      // Get all user_roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .neq("role", "admin");

      if (rolesError) throw rolesError;

      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*");

      if (profilesError) throw profilesError;

      // Combine data
      const customerList: CustomerData[] = roles.map((role) => {
        const profile = profiles.find((p) => p.user_id === role.user_id);
        return {
          user_id: role.user_id,
          email: "", // Will be filled from auth if needed
          first_name: profile?.first_name || null,
          last_name: profile?.last_name || null,
          phone: profile?.phone || null,
          role: role.role,
          kyc_status: profile?.kyc_status || "pending",
          created_at: profile?.created_at || role.created_at,
          company_name: profile?.company_name || null,
        };
      });

      return customerList;
    },
  });

  // Fetch all documents for verification
  const { data: pendingDocuments } = useQuery({
    queryKey: ["admin-pending-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("verified", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch customer assignments
  const { data: assignments } = useQuery({
    queryKey: ["customer-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_assignments")
        .select("*");

      if (error) throw error;
      return data;
    },
  });

  // Fetch admin employees
  const { data: employees } = useQuery({
    queryKey: ["admin-employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_employees")
        .select("*")
        .eq("is_active", true);

      if (error) throw error;
      return data;
    },
  });

  // Update KYC status mutation
  const updateKycMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          kyc_status: status as any,
          kyc_verified_at: status === "verified" ? new Date().toISOString() : null
        })
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
      toast.success("KYC-Status aktualisiert");
    },
    onError: () => {
      toast.error("Fehler beim Aktualisieren des Status");
    },
  });

  // Verify document mutation
  const verifyDocumentMutation = useMutation({
    mutationFn: async ({ docId, verified }: { docId: string; verified: boolean }) => {
      const { error } = await supabase
        .from("documents")
        .update({ 
          verified,
          verified_at: verified ? new Date().toISOString() : null,
        })
        .eq("id", docId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-documents"] });
      toast.success("Dokument aktualisiert");
    },
  });

  // Assign customer to employee mutation
  const assignCustomerMutation = useMutation({
    mutationFn: async ({ customerId, employeeId }: { customerId: string; employeeId: string }) => {
      const { error } = await supabase
        .from("customer_assignments")
        .upsert({ 
          customer_user_id: customerId,
          assigned_employee_id: employeeId,
        }, { onConflict: "customer_user_id" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-assignments"] });
      toast.success("Kunde zugewiesen");
    },
  });

  // Filter customers
  const filteredCustomers = customers?.filter((customer) => {
    const matchesSearch =
      customer.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === "all" || customer.role === selectedRole;
    return matchesSearch && matchesRole;
  }) || [];

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "buyer":
        return <Badge variant="default">Käufer</Badge>;
      case "seller":
        return <Badge variant="secondary">Verkäufer</Badge>;
      case "broker":
        return <Badge variant="outline">Makler</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };

  const getKycBadge = (status: string) => {
    switch (status) {
      case "verified":
        return (
          <span className="flex items-center gap-1 text-primary text-sm">
            <CheckCircle className="w-4 h-4" /> Verifiziert
          </span>
        );
      case "submitted":
        return (
          <span className="flex items-center gap-1 text-amber-600 text-sm">
            <Clock className="w-4 h-4" /> In Prüfung
          </span>
        );
      case "rejected":
        return (
          <span className="flex items-center gap-1 text-destructive text-sm">
            <XCircle className="w-4 h-4" /> Abgelehnt
          </span>
        );
      default:
        return <span className="text-muted-foreground text-sm">Ausstehend</span>;
    }
  };

  const handleOpenCustomerDetail = (customer: CustomerData) => {
    setSelectedCustomer(customer);
    setDetailPanelOpen(true);
  };

  // Stats
  const buyerCount = customers?.filter((c) => c.role === "buyer").length || 0;
  const sellerCount = customers?.filter((c) => c.role === "seller").length || 0;
  const brokerCount = customers?.filter((c) => c.role === "broker").length || 0;
  const pendingVerifications = customers?.filter((c) => c.kyc_status === "submitted").length || 0;

  return (
    <OffMarketLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold">CRM - Kundenverwaltung</h1>
          <p className="text-muted-foreground mt-1">
            Übersicht aller Kunden, Dokumente und Verifizierungen
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Käufer</CardDescription>
              <CardTitle className="text-3xl text-primary">{buyerCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Verkäufer</CardDescription>
              <CardTitle className="text-3xl">{sellerCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Makler</CardDescription>
              <CardTitle className="text-3xl">{brokerCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pendente Verifizierungen</CardDescription>
              <CardTitle className="text-3xl text-accent-foreground">{pendingVerifications}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Ungeprüfte Dokumente</CardDescription>
              <CardTitle className="text-3xl text-destructive">{pendingDocuments?.length || 0}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="customers" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="customers" className="gap-2">
              <Users className="w-4 h-4" /> Kunden
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="w-4 h-4" /> Dokumente
            </TabsTrigger>
            <TabsTrigger value="employees" className="gap-2">
              <UserCheck className="w-4 h-4" /> Mitarbeiter
            </TabsTrigger>
            <TabsTrigger value="assignments" className="gap-2">
              <UserPlus className="w-4 h-4" /> Zuweisungen
            </TabsTrigger>
          </TabsList>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Kunden suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Alle Rollen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Rollen</SelectItem>
                  <SelectItem value="buyer">Käufer</SelectItem>
                  <SelectItem value="seller">Verkäufer</SelectItem>
                  <SelectItem value="broker">Makler</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Rolle</TableHead>
                      <TableHead>KYC-Status</TableHead>
                      <TableHead>Zugewiesen an</TableHead>
                      <TableHead>Registriert</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          Lade Kunden...
                        </TableCell>
                      </TableRow>
                    ) : filteredCustomers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Keine Kunden gefunden
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCustomers.map((customer) => {
                        const assignment = assignments?.find(
                          (a) => a.customer_user_id === customer.user_id
                        );
                        const assignedEmployee = employees?.find(
                          (e) => e.id === assignment?.assigned_employee_id
                        );

                        return (
                          <TableRow key={customer.user_id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
                                  <span className="text-primary font-semibold text-sm">
                                    {customer.first_name?.[0] || "?"}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium">
                                    {customer.first_name} {customer.last_name}
                                  </p>
                                  {customer.company_name && (
                                    <p className="text-xs text-muted-foreground">
                                      {customer.company_name}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{getRoleBadge(customer.role)}</TableCell>
                            <TableCell>{getKycBadge(customer.kyc_status)}</TableCell>
                            <TableCell>
                              {assignedEmployee ? (
                                <span className="text-sm">
                                  {assignedEmployee.first_name} {assignedEmployee.last_name}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {format(new Date(customer.created_at), "dd.MM.yyyy", { locale: de })}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenCustomerDetail(customer)}
                                >
                                  <Eye className="w-4 h-4 mr-1" /> Details
                                </Button>
                                {customer.kyc_status === "submitted" && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        updateKycMutation.mutate({
                                          userId: customer.user_id,
                                          status: "verified",
                                        })
                                      }
                                    >
                                      Verifizieren
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() =>
                                        updateKycMutation.mutate({
                                          userId: customer.user_id,
                                          status: "rejected",
                                        })
                                      }
                                    >
                                      Ablehnen
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Dokumente zur Prüfung</CardTitle>
                <CardDescription>
                  {pendingDocuments?.length || 0} Dokumente warten auf Verifizierung
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingDocuments?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Keine ausstehenden Dokumente</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dokumenttyp</TableHead>
                        <TableHead>Dateiname</TableHead>
                        <TableHead>Hochgeladen</TableHead>
                        <TableHead className="text-right">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingDocuments?.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell>
                            <Badge variant="outline">{doc.document_type}</Badge>
                          </TableCell>
                          <TableCell>{doc.file_name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(doc.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" asChild>
                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                  <Eye className="w-4 h-4 mr-1" /> Ansehen
                                </a>
                              </Button>
                              <Button
                                size="sm"
                                onClick={() =>
                                  verifyDocumentMutation.mutate({ docId: doc.id, verified: true })
                                }
                              >
                                <CheckCircle className="w-4 h-4 mr-1" /> OK
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Employees Tab */}
          <TabsContent value="employees">
            <AdminEmployeeManagement />
          </TabsContent>

          {/* Assignments Tab */}
          <TabsContent value="assignments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Kundenzuweisungen</CardTitle>
                <CardDescription>
                  Weisen Sie Kunden an Mitarbeiter zu
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kunde</TableHead>
                      <TableHead>Rolle</TableHead>
                      <TableHead>Zugewiesen an</TableHead>
                      <TableHead className="text-right">Aktion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => {
                      const assignment = assignments?.find(
                        (a) => a.customer_user_id === customer.user_id
                      );

                      return (
                        <TableRow key={customer.user_id}>
                          <TableCell>
                            <span className="font-medium">
                              {customer.first_name} {customer.last_name}
                            </span>
                          </TableCell>
                          <TableCell>{getRoleBadge(customer.role)}</TableCell>
                          <TableCell>
                            <Select
                              value={assignment?.assigned_employee_id || ""}
                              onValueChange={(value) =>
                                assignCustomerMutation.mutate({
                                  customerId: customer.user_id,
                                  employeeId: value,
                                })
                              }
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder="Mitarbeiter wählen" />
                              </SelectTrigger>
                              <SelectContent>
                                {employees?.map((emp) => (
                                  <SelectItem key={emp.id} value={emp.id}>
                                    {emp.first_name} {emp.last_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenCustomerDetail(customer)}
                            >
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Customer Detail Panel */}
      {selectedCustomer && (
        <CustomerDetailPanel
          customer={selectedCustomer}
          open={detailPanelOpen}
          onClose={() => setDetailPanelOpen(false)}
        />
      )}
    </OffMarketLayout>
  );
};

export default AdminCRM;
