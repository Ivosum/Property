import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Mail, MessageCircle, Send, Loader2, Users, ExternalLink, Save, Link2 } from "lucide-react";
import { toast } from "sonner";
import { getPropertyContacts, setWhatsappGroupUrl } from "@/lib/pmData";

// Telefonnummer -> wa.me-Format (nur Ziffern, CH-Default +41)
const toWaNumber = (phone: string | null): string | null => {
  if (!phone) return null;
  let d = phone.replace(/[^\d+]/g, "");
  if (d.startsWith("00")) d = "+" + d.slice(2);
  if (d.startsWith("0")) d = "+41" + d.slice(1);      // CH Mobilnummer ohne Ländercode
  d = d.replace(/\D/g, "");
  return d.length >= 8 ? d : null;
};

const Messages = () => {
  const queryClient = useQueryClient();
  const { data: properties, isLoading } = useQuery({
    queryKey: ["pm-contacts"],
    queryFn: getPropertyContacts,
  });

  const list = properties ?? [];
  const [propId, setPropId] = useState("");

  // erste Liegenschaft vorwählen
  useEffect(() => { if (!propId && list.length) setPropId(list[0].id); }, [list, propId]);
  const current = list.find((p) => p.id === propId);

  // --- E-Mail ---
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const emailRecipients = useMemo(
    () => (current?.contacts ?? []).filter((c) => c.email).map((c) => c.email as string),
    [current],
  );

  const openMail = () => {
    if (emailRecipients.length === 0) { toast.error("Keine Mieter mit E-Mail in dieser Liegenschaft."); return; }
    // Empfänger als BCC (Datenschutz unter Mietern), Betreff & Text vorausgefüllt
    const params = new URLSearchParams();
    params.set("bcc", emailRecipients.join(","));
    if (subject) params.set("subject", subject);
    if (body) params.set("body", body);
    window.location.href = `mailto:?${params.toString()}`;
  };

  // --- WhatsApp ---
  const [waUrl, setWaUrl] = useState("");
  const [savingWa, setSavingWa] = useState(false);
  useEffect(() => { setWaUrl(current?.whatsapp_group_url ?? ""); }, [current]);

  const saveWa = async () => {
    if (!current) return;
    setSavingWa(true);
    try {
      await setWhatsappGroupUrl(current.id, waUrl.trim() || null);
      toast.success("WhatsApp-Gruppe gespeichert");
      queryClient.invalidateQueries({ queryKey: ["pm-contacts"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Fehler"); }
    finally { setSavingWa(false); }
  };

  return (
    <PropertyManagementLayout>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Kommunikation</h1>
        <p className="text-muted-foreground mt-1">E-Mail und WhatsApp mit Ihren Mietern – je Liegenschaft</p>
      </div>

      {/* Liegenschaft wählen */}
      <div className="mb-6 max-w-sm">
        <Label>Liegenschaft</Label>
        <Select value={propId} onValueChange={setPropId}>
          <SelectTrigger><SelectValue placeholder={list.length ? "Wählen" : "Keine Liegenschaften"} /></SelectTrigger>
          <SelectContent>{list.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} · {p.city}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Kontakte werden geladen...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ---------- Spalte E-Mail / Outlook ---------- */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Mail className="w-5 h-5 text-primary" /> E-Mail / Outlook</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                {emailRecipients.length} Mieter mit E-Mail in {current?.name ?? "–"}
              </div>
              {emailRecipients.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {(current?.contacts ?? []).filter((c) => c.email).map((c) => (
                    <span key={c.id} className="text-xs bg-secondary px-2 py-1 rounded-full">{c.name}</span>
                  ))}
                </div>
              )}
              <div>
                <Label>Betreff</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="z.B. Information zur Heizungswartung" />
              </div>
              <div>
                <Label>Nachricht</Label>
                <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} placeholder="Ihre Nachricht an alle Mieter dieser Liegenschaft..." />
              </div>
              <Button onClick={openMail} className="w-full">
                <Send className="w-4 h-4 mr-2" /> In Outlook / Mail öffnen
              </Button>
              <p className="text-xs text-muted-foreground">
                Öffnet Ihr Mailprogramm mit allen Mietern als BCC, Betreff und Text vorausgefüllt – Sie senden direkt aus Ihrem Konto.
              </p>
            </CardContent>
          </Card>

          {/* ---------- Spalte WhatsApp ---------- */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MessageCircle className="w-5 h-5 text-green-600" /> WhatsApp</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Gruppenlink je Liegenschaft */}
              <div>
                <Label>WhatsApp-Gruppe dieser Liegenschaft</Label>
                <div className="flex gap-2">
                  <Input value={waUrl} onChange={(e) => setWaUrl(e.target.value)} placeholder="https://chat.whatsapp.com/..." />
                  <Button variant="outline" onClick={saveWa} disabled={savingWa}>
                    {savingWa ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Einladungslink aus WhatsApp (Gruppe → Teilnehmer einladen → Link kopieren).</p>
              </div>
              {current?.whatsapp_group_url && (
                <a href={current.whatsapp_group_url} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    <ExternalLink className="w-4 h-4 mr-2" /> Gruppe öffnen
                  </Button>
                </a>
              )}

              {/* Direktchats mit einzelnen Mietern */}
              <div>
                <p className="text-sm font-medium mb-2">Direktchat mit Mietern</p>
                {(current?.contacts ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Keine aktiven Mieter.</p>
                ) : (
                  <div className="space-y-2">
                    {(current?.contacts ?? []).map((c) => {
                      const wa = toWaNumber(c.phone);
                      return (
                        <div key={c.id} className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{c.name}</p>
                            <p className="text-xs text-muted-foreground">{c.phone ?? "keine Nummer"}</p>
                          </div>
                          {wa ? (
                            <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700">
                                <MessageCircle className="w-4 h-4 mr-1" /> Chat
                              </Button>
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">–</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PropertyManagementLayout>
  );
};

export default Messages;
