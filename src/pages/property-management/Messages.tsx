import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Send, Inbox, Loader2 } from "lucide-react";

interface MessageRow {
  id: string;
  from: string;
  subject: string;
  preview: string;
  date: string;
  unread: boolean;
}

const Messages = () => {
  const { user } = useAuth();

  const { data: messages, isLoading } = useQuery({
    queryKey: ["pm-messages", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: msgs } = await supabase
        .from("pm_messages")
        .select("id, subject, content, sender_id, sender_tenant_id, recipient_id, read_at, created_at")
        .eq("recipient_id", user!.id)
        .order("created_at", { ascending: false });

      const senderIds = Array.from(new Set((msgs ?? []).map((m) => m.sender_id).filter(Boolean))) as string[];
      const tenantIds = Array.from(new Set((msgs ?? []).map((m) => m.sender_tenant_id).filter(Boolean))) as string[];

      const [{ data: profiles }, { data: tenants }] = await Promise.all([
        senderIds.length
          ? supabase.from("profiles").select("user_id, first_name, last_name").in("user_id", senderIds)
          : Promise.resolve({ data: [] as any[] }),
        tenantIds.length
          ? supabase.from("pm_tenants").select("id, first_name, last_name").in("id", tenantIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const profileName = new Map((profiles ?? []).map((p) => [p.user_id, [p.first_name, p.last_name].filter(Boolean).join(" ") || "Nutzer"]));
      const tenantName = new Map((tenants ?? []).map((t) => [t.id, [t.first_name, t.last_name].filter(Boolean).join(" ") || "Mieter"]));

      return (msgs ?? []).map((m) => ({
        id: m.id,
        from: m.sender_tenant_id ? tenantName.get(m.sender_tenant_id) ?? "Mieter" : m.sender_id ? profileName.get(m.sender_id) ?? "Nutzer" : "Unbekannt",
        subject: m.subject,
        preview: m.content.slice(0, 80),
        date: new Date(m.created_at).toLocaleString("de-CH", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
        unread: !m.read_at,
      })) as MessageRow[];
    },
  });

  const list = messages ?? [];
  const unreadCount = list.filter((m) => m.unread).length;

  return (
    <PropertyManagementLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Kommunikation</h1>
          <p className="text-muted-foreground mt-1">Nachrichten und Korrespondenz</p>
        </div>
        <Button>
          <Send className="w-4 h-4 mr-2" />
          Neue Nachricht
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="space-y-2">
          <Button variant="secondary" className="w-full justify-start gap-2">
            <Inbox className="w-4 h-4" />
            Posteingang
            {unreadCount > 0 && (
              <span className="ml-auto bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </Button>
        </div>

        {/* Messages List */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Posteingang ({list.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Nachrichten werden geladen...
              </div>
            ) : list.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Inbox className="w-10 h-10 mb-3 opacity-40" />
                <p>Keine Nachrichten im Posteingang.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {list.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${
                      msg.unread ? "bg-primary/5 border-l-4 border-primary" : "bg-secondary/30 hover:bg-secondary/50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium ${msg.unread ? "text-foreground" : "text-muted-foreground"}`}>
                            {msg.from}
                          </p>
                          {msg.unread && <span className="w-2 h-2 bg-primary rounded-full" />}
                        </div>
                        <p className={`text-sm ${msg.unread ? "font-medium" : ""}`}>{msg.subject}</p>
                        <p className="text-sm text-muted-foreground truncate mt-1">{msg.preview}</p>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-nowrap ml-4">{msg.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PropertyManagementLayout>
  );
};

export default Messages;
