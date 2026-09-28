import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import OffMarketLayout from "@/components/off-market/OffMarketLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Home, MapPin, Hammer, FileText, MessageSquare, Search, 
  Clock, CheckCircle, AlertCircle, User, Send, Eye, Download,
  File, Image, FileSpreadsheet, Phone, Mail, Building2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const FinancingAdmin = () => {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");

  // Fetch all financing requests (admin/broker)
  const { data: requests, isLoading } = useQuery({
    queryKey: ["admin-financing-requests", statusFilter, typeFilter],
    queryFn: async () => {
      let query = supabase
        .from("financing_requests")
        .select(`
          *,
          profiles:user_id (first_name, last_name, company_name)
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as "draft" | "submitted" | "in_review" | "approved" | "rejected" | "completed");
      }
      if (typeFilter !== "all") {
        query = query.eq("financing_type", typeFilter as "mortgage" | "land" | "construction");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user && (role === "admin" || role === "broker"),
  });

  // Fetch selected request details
  const { data: requestDetails } = useQuery({
    queryKey: ["financing-request-detail", selectedRequest],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financing_requests")
        .select(`
          *,
          profiles:user_id (first_name, last_name, company_name, phone, kyc_status)
        `)
        .eq("id", selectedRequest)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!selectedRequest,
  });

  // Fetch messages for selected request
  const { data: messages } = useQuery({
    queryKey: ["financing-messages", selectedRequest],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financing_messages")
        .select("*")
        .eq("financing_request_id", selectedRequest)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedRequest,
  });

  // Fetch documents for selected request
  const { data: requestDocuments } = useQuery({
    queryKey: ["financing-documents-admin", selectedRequest],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financing_documents")
        .select("*")
        .eq("financing_request_id", selectedRequest)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedRequest,
  });

  // Subscribe to new messages
  useEffect(() => {
    if (!selectedRequest) return;

    const channel = supabase
      .channel(`financing-admin-messages-${selectedRequest}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "financing_messages",
          filter: `financing_request_id=eq.${selectedRequest}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["financing-messages", selectedRequest] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedRequest, queryClient]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      type FinancingStatus = "approved" | "completed" | "draft" | "in_review" | "rejected" | "submitted";
      const updateData: {
        status: FinancingStatus;
        reviewed_by: string | undefined;
        reviewed_at: string;
        review_notes?: string;
      } = {
        status: status as FinancingStatus,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      };
      if (notes) {
        updateData.review_notes = notes;
      }

      const { error } = await supabase
        .from("financing_requests")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-financing-requests"] });
      queryClient.invalidateQueries({ queryKey: ["financing-request-detail", selectedRequest] });
      toast.success("Status aktualisiert");
    },
    onError: () => {
      toast.error("Fehler beim Aktualisieren");
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase
        .from("financing_messages")
        .insert({
          financing_request_id: selectedRequest,
          sender_id: user!.id,
          sender_type: role === "admin" ? "admin" : "staff",
          content,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["financing-messages", selectedRequest] });
    },
    onError: () => {
      toast.error("Fehler beim Senden der Nachricht");
    },
  });

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedRequest) return;
    sendMessageMutation.mutate(newMessage);
  };

  const handleStatusChange = (status: string) => {
    if (!selectedRequest) return;
    updateStatusMutation.mutate({ id: selectedRequest, status, notes: reviewNotes });
    setReviewNotes("");
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat("de-CH", {
      style: "currency",
      currency: "CHF",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      draft: { label: "Entwurf", variant: "outline" },
      submitted: { label: "Eingereicht", variant: "secondary" },
      in_review: { label: "In Bearbeitung", variant: "default" },
      approved: { label: "Genehmigt", variant: "default" },
      rejected: { label: "Abgelehnt", variant: "destructive" },
      completed: { label: "Abgeschlossen", variant: "default" },
    };
    const config = statusConfig[status] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "mortgage":
        return <Home className="w-4 h-4" />;
      case "land":
        return <MapPin className="w-4 h-4" />;
      case "construction":
        return <Hammer className="w-4 h-4" />;
      default:
        return <Home className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "mortgage":
        return "Hypothek";
      case "land":
        return "Bauland";
      case "construction":
        return "Baufinanzierung";
      default:
        return type;
    }
  };

  const filteredRequests = requests?.filter((req) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      req.request_number?.toLowerCase().includes(searchLower) ||
      (req.profiles as { first_name?: string; last_name?: string })?.first_name?.toLowerCase().includes(searchLower) ||
      (req.profiles as { first_name?: string; last_name?: string })?.last_name?.toLowerCase().includes(searchLower)
    );
  });

  // Stats
  const stats = {
    total: requests?.length || 0,
    submitted: requests?.filter((r) => r.status === "submitted").length || 0,
    inReview: requests?.filter((r) => r.status === "in_review").length || 0,
    approved: requests?.filter((r) => r.status === "approved").length || 0,
  };

  if (role !== "admin" && role !== "broker") {
    return (
      <OffMarketLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Zugriff verweigert</h3>
          <p className="text-muted-foreground">Sie haben keine Berechtigung, diese Seite anzuzeigen.</p>
        </div>
      </OffMarketLayout>
    );
  }

  return (
    <OffMarketLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Finanzierungsanfragen</h1>
            <p className="text-muted-foreground mt-1">
              Verwalten Sie alle eingehenden Finanzierungsanfragen
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-muted-foreground">Gesamt</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-accent-foreground">{stats.submitted}</div>
              <p className="text-sm text-muted-foreground">Neu eingereicht</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-primary">{stats.inReview}</div>
              <p className="text-sm text-muted-foreground">In Bearbeitung</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-primary">{stats.approved}</div>
              <p className="text-sm text-muted-foreground">Genehmigt</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Nach Nummer oder Namen suchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  <SelectItem value="submitted">Eingereicht</SelectItem>
                  <SelectItem value="in_review">In Bearbeitung</SelectItem>
                  <SelectItem value="approved">Genehmigt</SelectItem>
                  <SelectItem value="rejected">Abgelehnt</SelectItem>
                  <SelectItem value="completed">Abgeschlossen</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Typ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Typen</SelectItem>
                  <SelectItem value="mortgage">Hypothek</SelectItem>
                  <SelectItem value="land">Bauland</SelectItem>
                  <SelectItem value="construction">Baufinanzierung</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Request List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredRequests && filteredRequests.length > 0 ? (
          <div className="space-y-3">
            {filteredRequests.map((request) => {
              const profile = request.profiles as { first_name?: string; last_name?: string; company_name?: string } | null;
              return (
                <Card 
                  key={request.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedRequest(request.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {getTypeIcon(request.financing_type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{request.request_number || "Entwurf"}</span>
                            {getStatusBadge(request.status)}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{getTypeLabel(request.financing_type)}</span>
                            <span>•</span>
                            <span>{formatCurrency(request.loan_amount)}</span>
                            <span>•</span>
                            <span>{profile?.first_name} {profile?.last_name}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {new Date(request.created_at).toLocaleDateString("de-CH")}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">Keine Anfragen gefunden</h3>
              <p className="text-muted-foreground">
                Es gibt keine Finanzierungsanfragen mit den ausgewählten Filtern.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Request Detail Dialog */}
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                {requestDetails && getTypeIcon(requestDetails.financing_type)}
                {requestDetails?.request_number || "Anfrage"}
                {requestDetails && getStatusBadge(requestDetails.status)}
              </DialogTitle>
              <DialogDescription>
                {requestDetails && getTypeLabel(requestDetails.financing_type)} - 
                {requestDetails && formatCurrency(requestDetails.loan_amount)}
              </DialogDescription>
            </DialogHeader>

            {requestDetails && (
              <Tabs defaultValue="overview" className="flex-1 overflow-hidden flex flex-col">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Übersicht</TabsTrigger>
                  <TabsTrigger value="documents">Dokumente</TabsTrigger>
                  <TabsTrigger value="chat">
                    Chat
                    {messages && messages.length > 0 && (
                      <Badge variant="secondary" className="ml-2">{messages.length}</Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="flex-1 overflow-y-auto space-y-4">
                  {/* Customer Info */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Antragsteller</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">
                            {(requestDetails.profiles as { first_name?: string; last_name?: string })?.first_name}{" "}
                            {(requestDetails.profiles as { first_name?: string; last_name?: string })?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            KYC: {(requestDetails.profiles as { kyc_status?: string })?.kyc_status === "verified" ? "✓ Verifiziert" : "Nicht verifiziert"}
                          </p>
                        </div>
                      </div>
                      {(requestDetails.profiles as { phone?: string })?.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span>{(requestDetails.profiles as { phone?: string })?.phone}</span>
                        </div>
                      )}
                      {(requestDetails.profiles as { company_name?: string })?.company_name && (
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <span>{(requestDetails.profiles as { company_name?: string })?.company_name}</span>
                        </div>
                      )}
                      {requestDetails.annual_income && (
                        <div className="pt-2 border-t">
                          <p className="text-sm text-muted-foreground">Jährliches Einkommen</p>
                          <p className="font-semibold">{formatCurrency(requestDetails.annual_income)}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Calculation Summary */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Berechnung</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Kaufpreis</p>
                          <p className="font-semibold">{formatCurrency(requestDetails.purchase_price)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Eigenkapital</p>
                          <p className="font-semibold">{formatCurrency(requestDetails.equity_amount)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Kreditbetrag</p>
                          <p className="font-semibold">{formatCurrency(requestDetails.loan_amount)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Monatliche Rate</p>
                          <p className="font-semibold">{formatCurrency(requestDetails.monthly_payment)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Property Info */}
                  {requestDetails.property_address && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Immobilie</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p>{requestDetails.property_address}</p>
                        <p className="text-muted-foreground">
                          {requestDetails.property_city}
                          {requestDetails.property_canton && `, ${requestDetails.property_canton}`}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Notes */}
                  {requestDetails.notes && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Anmerkungen des Kunden</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{requestDetails.notes}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Status Actions */}
                  {requestDetails.status !== "draft" && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Status ändern</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Textarea
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          placeholder="Interne Notizen (optional)"
                          rows={2}
                        />
                        <div className="flex gap-2 flex-wrap">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleStatusChange("in_review")}
                          >
                            In Bearbeitung
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => handleStatusChange("approved")}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Genehmigen
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleStatusChange("rejected")}
                          >
                            <AlertCircle className="w-4 h-4 mr-1" />
                            Ablehnen
                          </Button>
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => handleStatusChange("completed")}
                          >
                            Abschliessen
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="documents" className="flex-1 overflow-y-auto space-y-4">
                  {requestDocuments && requestDocuments.length > 0 ? (
                    <div className="space-y-2">
                      {requestDocuments.map((doc) => {
                        const ext = doc.file_name.split(".").pop()?.toLowerCase();
                        const getIcon = () => {
                          if (ext === "pdf") return <FileText className="w-5 h-5 text-destructive" />;
                          if (["jpg", "jpeg", "png", "webp"].includes(ext || "")) return <Image className="w-5 h-5 text-blue-500" />;
                          if (["xls", "xlsx"].includes(ext || "")) return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
                          return <File className="w-5 h-5 text-muted-foreground" />;
                        };
                        const getTypeLabel = (type: string) => {
                          const types: Record<string, string> = {
                            lohnausweis: "Lohnausweis",
                            steuererklaerung: "Steuererklärung",
                            ausweis: "Ausweis/Pass",
                            kaufvertrag: "Kaufvertrag",
                            eigenkapitalnachweis: "Eigenkapitalnachweis",
                            pensionskasse: "PK-Ausweis",
                            saeule3a: "Säule 3a",
                            betreibungsauszug: "Betreibungsauszug",
                            sonstiges: "Sonstiges",
                          };
                          return types[type] || type;
                        };
                        const formatFileSize = (bytes: number | null) => {
                          if (!bytes) return "-";
                          if (bytes < 1024) return `${bytes} B`;
                          if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
                          return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
                        };

                        return (
                          <Card key={doc.id}>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                {getIcon()}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{doc.file_name}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Badge variant="outline" className="text-xs">
                                      {getTypeLabel(doc.document_type)}
                                    </Badge>
                                    <span>{formatFileSize(doc.file_size)}</span>
                                    <span>•</span>
                                    <span>{new Date(doc.uploaded_at).toLocaleDateString("de-CH")}</span>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    const { data } = await supabase.storage
                                      .from("financing-documents")
                                      .createSignedUrl(doc.file_url, 3600);
                                    if (data?.signedUrl) {
                                      window.open(data.signedUrl, "_blank");
                                    }
                                  }}
                                >
                                  <Download className="w-4 h-4 mr-1" />
                                  Öffnen
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Keine Dokumente hochgeladen</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="chat" className="flex-1 overflow-hidden flex flex-col">
                  <Card className="flex-1 flex flex-col overflow-hidden">
                    <CardContent className="flex-1 overflow-y-auto p-4">
                      {messages && messages.length > 0 ? (
                        <div className="space-y-4">
                          {messages.map((message) => {
                            const isStaffMessage = message.sender_type !== "customer";
                            return (
                              <div
                                key={message.id}
                                className={`flex ${isStaffMessage ? "justify-end" : "justify-start"}`}
                              >
                                <div
                                  className={`max-w-[70%] p-3 rounded-lg ${
                                    isStaffMessage
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted"
                                  }`}
                                >
                                  {!isStaffMessage && (
                                    <div className="flex items-center gap-2 mb-1">
                                      <User className="w-3 h-3" />
                                      <span className="text-xs font-medium">Kunde</span>
                                    </div>
                                  )}
                                  <p className="text-sm">{message.content}</p>
                                  <p className={`text-xs mt-1 ${isStaffMessage ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                    {new Date(message.created_at).toLocaleString("de-CH")}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                          <div ref={messagesEndRef} />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                          <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
                          <p>Noch keine Nachrichten</p>
                        </div>
                      )}
                    </CardContent>
                    <div className="p-4 border-t">
                      <div className="flex gap-2">
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Nachricht schreiben..."
                          onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                        />
                        <Button onClick={handleSendMessage} disabled={sendMessageMutation.isPending}>
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </OffMarketLayout>
  );
};

export default FinancingAdmin;
