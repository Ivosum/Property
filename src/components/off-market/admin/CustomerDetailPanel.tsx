import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, FileText, Building2, MessageCircle, Clock, CheckCircle, XCircle, Eye, Download, Calendar, Phone, Mail, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

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

interface CustomerDetailPanelProps {
  customer: CustomerData;
  open: boolean;
  onClose: () => void;
}

const CustomerDetailPanel = ({ customer, open, onClose }: CustomerDetailPanelProps) => {
  // Fetch customer documents
  const { data: documents } = useQuery({
    queryKey: ["customer-documents", customer.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", customer.user_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch customer properties (if seller)
  const { data: properties } = useQuery({
    queryKey: ["customer-properties", customer.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("owner_id", customer.user_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: open && customer.role === "seller",
  });

  // Fetch customer interests (if buyer)
  const { data: interests } = useQuery({
    queryKey: ["customer-interests", customer.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_interests")
        .select("*, properties(*)")
        .eq("buyer_id", customer.user_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: open && customer.role === "buyer",
  });

  // Fetch financing requests
  const { data: financingRequests } = useQuery({
    queryKey: ["customer-financing", customer.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financing_requests")
        .select("*")
        .eq("user_id", customer.user_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch activity log
  const { data: activityLog } = useQuery({
    queryKey: ["customer-activity", customer.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_activity_log")
        .select("*")
        .eq("customer_user_id", customer.user_id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

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
          <Badge className="bg-primary">
            <CheckCircle className="w-3 h-3 mr-1" /> Verifiziert
          </Badge>
        );
      case "submitted":
        return (
          <Badge variant="secondary" className="bg-accent text-accent-foreground">
            <Clock className="w-3 h-3 mr-1" /> In Prüfung
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" /> Abgelehnt
          </Badge>
        );
      default:
        return <Badge variant="outline">Ausstehend</Badge>;
    }
  };

  const getDocTypeName = (type: string) => {
    const names: Record<string, string> = {
      kyc_id: "Ausweis",
      kyc_proof_of_address: "Adressnachweis",
      financial_proof: "Finanznachweis",
      property_deed: "Grundbuchauszug",
      floor_plan: "Grundriss",
      energy_certificate: "Energieausweis",
      other: "Sonstiges",
    };
    return names[type] || type;
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-primary font-bold text-2xl">
                {customer.first_name?.[0] || "?"}
              </span>
            </div>
            <div>
              <SheetTitle className="text-2xl">
                {customer.first_name} {customer.last_name}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2 mt-1">
                {getRoleBadge(customer.role)}
                {getKycBadge(customer.kyc_status)}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Contact Info */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" /> Kontaktdaten
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {customer.company_name && (
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                {customer.company_name}
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                {customer.phone}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              Registriert: {format(new Date(customer.created_at), "dd.MM.yyyy", { locale: de })}
            </div>
          </CardContent>
        </Card>

        {/* Tabs for different sections */}
        <Tabs defaultValue="documents" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="documents">
              <FileText className="w-4 h-4 mr-1" /> Dokumente
            </TabsTrigger>
            {customer.role === "seller" && (
              <TabsTrigger value="properties">
                <Building2 className="w-4 h-4 mr-1" /> Immobilien
              </TabsTrigger>
            )}
            {customer.role === "buyer" && (
              <TabsTrigger value="interests">
                <Building2 className="w-4 h-4 mr-1" /> Interessen
              </TabsTrigger>
            )}
            <TabsTrigger value="financing">Finanzierung</TabsTrigger>
            <TabsTrigger value="activity">Aktivität</TabsTrigger>
          </TabsList>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dokumente ({documents?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {documents?.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    Keine Dokumente hochgeladen
                  </p>
                ) : (
                  <div className="space-y-2">
                    {documents?.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-primary" />
                          <div>
                            <p className="font-medium text-sm">{getDocTypeName(doc.document_type)}</p>
                            <p className="text-xs text-muted-foreground">{doc.file_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.verified ? (
                            <Badge variant="outline" className="text-primary border-primary">
                              <CheckCircle className="w-3 h-3 mr-1" /> Geprüft
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-600">
                              <Clock className="w-3 h-3 mr-1" /> Offen
                            </Badge>
                          )}
                          <Button variant="ghost" size="sm" asChild>
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                              <Eye className="w-4 h-4" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Properties Tab (Seller) */}
          {customer.role === "seller" && (
            <TabsContent value="properties">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Immobilien ({properties?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                  {properties?.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">
                      Keine Immobilien gelistet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {properties?.map((property) => (
                        <div key={property.id} className="p-3 bg-muted rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{property.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {property.city}, {property.canton}
                              </p>
                            </div>
                            <Badge variant={property.status === "active" ? "default" : "secondary"}>
                              {property.status}
                            </Badge>
                          </div>
                          <div className="mt-2 text-sm">
                            <span className="font-semibold">
                              CHF {property.price?.toLocaleString()}
                            </span>
                            <span className="text-muted-foreground">
                              {" · "}
                              {property.rooms} Zimmer · {property.living_area_sqm}m²
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Interests Tab (Buyer) */}
          {customer.role === "buyer" && (
            <TabsContent value="interests">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Interessen ({interests?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                  {interests?.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">
                      Keine Interessen bekundet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {interests?.map((interest: any) => (
                        <div key={interest.id} className="p-3 bg-muted rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{interest.properties?.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {interest.properties?.city}, {interest.properties?.canton}
                              </p>
                            </div>
                            <Badge>{interest.status}</Badge>
                          </div>
                          {interest.message && (
                            <p className="mt-2 text-sm text-muted-foreground">
                              "{interest.message}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Financing Tab */}
          <TabsContent value="financing">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Finanzierungsanfragen ({financingRequests?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {financingRequests?.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    Keine Finanzierungsanfragen
                  </p>
                ) : (
                  <div className="space-y-3">
                    {financingRequests?.map((req) => (
                      <div key={req.id} className="p-3 bg-muted rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{req.request_number || "Entwurf"}</p>
                            <p className="text-sm text-muted-foreground">
                              {req.financing_type === "mortgage"
                                ? "Hypothek"
                                : req.financing_type === "land"
                                ? "Bauland"
                                : "Baukredit"}
                            </p>
                          </div>
                          <Badge
                            variant={
                              req.status === "approved"
                                ? "default"
                                : req.status === "rejected"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {req.status}
                          </Badge>
                        </div>
                        <div className="mt-2 text-sm">
                          <span className="font-semibold">
                            CHF {req.loan_amount?.toLocaleString()}
                          </span>
                          <span className="text-muted-foreground">
                            {" · "}
                            Kaufpreis: CHF {req.purchase_price?.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Letzte Aktivitäten</CardTitle>
              </CardHeader>
              <CardContent>
                {activityLog?.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    Keine Aktivitäten aufgezeichnet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {activityLog?.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 text-sm border-l-2 border-border pl-4 py-1"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{activity.activity_type}</p>
                          {activity.activity_description && (
                            <p className="text-muted-foreground">
                              {activity.activity_description}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(activity.created_at), "dd.MM.yy HH:mm", { locale: de })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default CustomerDetailPanel;
