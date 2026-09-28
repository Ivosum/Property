import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import OffMarketLayout from "@/components/off-market/OffMarketLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Home, MapPin, Hammer, FileText, MessageSquare, Upload, Send, 
  ArrowLeft, Clock, CheckCircle, AlertCircle, User 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import FinancingDocumentUpload from "@/components/financing/FinancingDocumentUpload";
import FinancingCustomerDataForm from "@/components/financing/FinancingCustomerDataForm";

const FinancingRequest = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [newMessage, setNewMessage] = useState("");

  // Fetch request details
  const { data: request, isLoading } = useQuery({
    queryKey: ["financing-request", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financing_requests")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  // Fetch messages
  const { data: messages } = useQuery({
    queryKey: ["financing-messages", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financing_messages")
        .select("*")
        .eq("financing_request_id", id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  // Subscribe to new messages
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`financing-messages-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "financing_messages",
          filter: `financing_request_id=eq.${id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["financing-messages", id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Submit request mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("financing_requests")
        .update({
          status: "submitted",
          submitted_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financing-request", id] });
      toast.success("Anfrage eingereicht! Wir werden Sie bald kontaktieren.");
    },
    onError: () => {
      toast.error("Fehler beim Einreichen der Anfrage");
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase
        .from("financing_messages")
        .insert({
          financing_request_id: id,
          sender_id: user!.id,
          sender_type: "customer",
          content,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["financing-messages", id] });
    },
    onError: () => {
      toast.error("Fehler beim Senden der Nachricht");
    },
  });

  const handleSubmit = () => {
    submitMutation.mutate();
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage);
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
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      draft: { label: "Entwurf", variant: "outline", icon: <Clock className="w-3 h-3" /> },
      submitted: { label: "Eingereicht", variant: "secondary", icon: <CheckCircle className="w-3 h-3" /> },
      in_review: { label: "In Bearbeitung", variant: "default", icon: <Clock className="w-3 h-3" /> },
      approved: { label: "Genehmigt", variant: "default", icon: <CheckCircle className="w-3 h-3" /> },
      rejected: { label: "Abgelehnt", variant: "destructive", icon: <AlertCircle className="w-3 h-3" /> },
      completed: { label: "Abgeschlossen", variant: "default", icon: <CheckCircle className="w-3 h-3" /> },
    };
    const config = statusConfig[status] || statusConfig.draft;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "mortgage":
        return <Home className="w-5 h-5" />;
      case "land":
        return <MapPin className="w-5 h-5" />;
      case "construction":
        return <Hammer className="w-5 h-5" />;
      default:
        return <Home className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "mortgage":
        return "Hypothek";
      case "land":
        return "Baulandfinanzierung";
      case "construction":
        return "Baufinanzierung";
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <OffMarketLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </OffMarketLayout>
    );
  }

  if (!request) {
    return (
      <OffMarketLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Anfrage nicht gefunden</h3>
          <Button onClick={() => navigate("/off-market/financing")}>
            Zurück zur Übersicht
          </Button>
        </div>
      </OffMarketLayout>
    );
  }

  const isDraft = request.status === "draft";

  return (
    <OffMarketLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/off-market/financing")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                {getTypeIcon(request.financing_type)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl font-bold">
                    {request.request_number || "Neue Anfrage"}
                  </h1>
                  {getStatusBadge(request.status)}
                </div>
                <p className="text-muted-foreground">
                  {getTypeLabel(request.financing_type)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="data">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="data">
              <User className="w-4 h-4 mr-2" />
              Daten
            </TabsTrigger>
            <TabsTrigger value="calculation">
              <FileText className="w-4 h-4 mr-2" />
              Berechnung
            </TabsTrigger>
            <TabsTrigger value="documents">
              <Upload className="w-4 h-4 mr-2" />
              Dokumente
            </TabsTrigger>
            <TabsTrigger value="chat">
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat
              {messages && messages.length > 0 && (
                <Badge variant="secondary" className="ml-2">{messages.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Customer Data Tab */}
          <TabsContent value="data" className="space-y-6">
            <FinancingCustomerDataForm 
              requestId={id!}
              initialData={{
                property_address: request.property_address || "",
                property_city: request.property_city || "",
                property_canton: request.property_canton || "",
                property_type: request.property_type || "",
                annual_income: request.annual_income || undefined,
                notes: request.notes || "",
              }}
              disabled={!isDraft}
            />

            {/* Submit Button */}
            {isDraft && (
              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <h3 className="font-semibold text-lg">Anfrage einreichen</h3>
                    <p className="text-muted-foreground text-sm">
                      Wenn Sie alle Daten und Dokumente erfasst haben, können Sie die Anfrage einreichen.
                      Unser Team wird sich dann mit Ihnen in Verbindung setzen.
                    </p>
                    <Button onClick={handleSubmit} size="lg" className="px-8">
                      <Send className="w-4 h-4 mr-2" />
                      Anfrage einreichen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Calculation Summary Tab */}
          <TabsContent value="calculation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Berechnungsübersicht</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Kaufpreis</p>
                    <p className="text-lg font-semibold">{formatCurrency(request.purchase_price)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Eigenkapital</p>
                    <p className="text-lg font-semibold">{formatCurrency(request.equity_amount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Kreditbetrag</p>
                    <p className="text-lg font-semibold">{formatCurrency(request.loan_amount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Monatliche Rate</p>
                    <p className="text-lg font-semibold">{formatCurrency(request.monthly_payment)}</p>
                  </div>
                </div>
                {request.interest_rate && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">Zinssatz</p>
                    <p className="text-lg font-semibold">{request.interest_rate}%</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <FinancingDocumentUpload 
              requestId={id!} 
              disabled={!isDraft}
            />
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat">
            <Card className="h-[500px] flex flex-col">
              <CardHeader className="border-b">
                <CardTitle className="text-lg">Chat mit dem Finanzierungsteam</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4">
                {messages && messages.length > 0 ? (
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const isOwnMessage = message.sender_id === user?.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[70%] p-3 rounded-lg ${
                              isOwnMessage
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p className={`text-xs mt-1 ${isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
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
                    <p className="text-sm">Starten Sie eine Konversation mit unserem Team</p>
                  </div>
                )}
              </CardContent>
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Nachricht eingeben..."
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  />
                  <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </OffMarketLayout>
  );
};

export default FinancingRequest;
