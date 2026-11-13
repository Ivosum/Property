import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import OffMarketLayout from "@/components/off-market/OffMarketLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Search, Send, Loader2 } from "lucide-react";

interface MessageRow {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  read_at: string | null;
}

interface Conversation {
  partnerId: string;
  name: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
}

const Messages = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");

  // Alle Nachrichten des Nutzers laden
  const { data: messages, isLoading } = useQuery({
    queryKey: ["off-market-messages", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, content, sender_id, receiver_id, created_at, read_at")
        .or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MessageRow[];
    },
  });

  // Namen der Gesprächspartner auflösen
  const partnerIds = Array.from(
    new Set(
      (messages ?? []).map((m) => (m.sender_id === user?.id ? m.receiver_id : m.sender_id))
    )
  );

  const { data: names } = useQuery({
    queryKey: ["message-partner-names", partnerIds.sort().join(",")],
    enabled: partnerIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", partnerIds);
      const map = new Map<string, string>();
      (data ?? []).forEach((p) => {
        map.set(p.user_id, [p.first_name, p.last_name].filter(Boolean).join(" ") || "Unbekannt");
      });
      return map;
    },
  });

  const nameOf = (id: string) => names?.get(id) ?? "Unbekannt";

  // Konversationen aufbauen
  const conversations: Conversation[] = partnerIds
    .map((pid) => {
      const msgs = (messages ?? []).filter(
        (m) => m.sender_id === pid || m.receiver_id === pid
      );
      const last = msgs[msgs.length - 1];
      const unread = msgs.filter(
        (m) => m.receiver_id === user?.id && !m.read_at
      ).length;
      return {
        partnerId: pid,
        name: nameOf(pid),
        lastMessage: last?.content ?? "",
        lastAt: last?.created_at ?? "",
        unread,
      };
    })
    .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());

  const term = search.trim().toLowerCase();
  const filteredConvs = conversations.filter((c) => !term || c.name.toLowerCase().includes(term));

  const activeMsgs = (messages ?? []).filter(
    (m) => m.sender_id === selected || m.receiver_id === selected
  );

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user || !selected) throw new Error("Kein Empfänger");
      const { error } = await supabase.from("messages").insert({
        content,
        sender_id: user.id,
        receiver_id: selected,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["off-market-messages", user?.id] });
    },
  });

  const formatTime = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("de-CH");
  };

  return (
    <OffMarketLayout>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Nachrichten</h1>
        <p className="text-muted-foreground mt-1">
          Kommunikation mit Käufern, Verkäufern und Maklern
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Conversations List */}
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader className="pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Suchen..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground px-4">
                <MessageCircle className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">Noch keine Konversationen.</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredConvs.map((conv) => (
                  <button
                    key={conv.partnerId}
                    onClick={() => setSelected(conv.partnerId)}
                    className={`w-full p-4 text-left hover:bg-muted transition-colors ${
                      selected === conv.partnerId ? "bg-muted" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-primary font-semibold">{conv.name[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium truncate">{conv.name}</p>
                          <span className="text-xs text-muted-foreground shrink-0 ml-2">
                            {formatTime(conv.lastAt)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                          {conv.unread > 0 && (
                            <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full shrink-0">
                              {conv.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-2 flex flex-col">
          {selected ? (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary font-semibold">{nameOf(selected)[0]}</span>
                  </div>
                  <div>
                    <CardTitle className="text-lg">{nameOf(selected)}</CardTitle>
                    <CardDescription>{activeMsgs.length} Nachrichten</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-4">
                  {activeMsgs.map((m) => {
                    const mine = m.sender_id === user?.id;
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`rounded-lg p-3 max-w-[70%] ${
                            mine ? "bg-primary text-primary-foreground" : "bg-muted"
                          }`}
                        >
                          <p className="text-sm">{m.content}</p>
                          <p className={`text-xs mt-1 ${mine ? "opacity-70" : "text-muted-foreground"}`}>
                            {formatTime(m.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Nachricht schreiben..."
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && draft.trim() && !sendMutation.isPending) {
                        sendMutation.mutate(draft.trim());
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    disabled={!draft.trim() || sendMutation.isPending}
                    onClick={() => sendMutation.mutate(draft.trim())}
                  >
                    {sendMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <CardContent className="flex-1 flex flex-col items-center justify-center text-center">
              <MessageCircle className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Wählen Sie eine Konversation aus, um Nachrichten zu lesen
              </p>
            </CardContent>
          )}
        </Card>
      </div>
    </OffMarketLayout>
  );
};

export default Messages;
