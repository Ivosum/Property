import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import OffMarketLayout from "@/components/off-market/OffMarketLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Users, Search, Plus, Phone, Mail, Building2, Loader2, Send, QrCode, Pencil, Trash2, UserPlus,
} from "lucide-react";
import LeadDialog from "@/components/off-market/LeadDialog";
import SharePropertiesDialog from "@/components/off-market/SharePropertiesDialog";
import BrokerQrDialog from "@/components/off-market/BrokerQrDialog";
import { getMyLeads, deleteLead, type OmLead } from "@/lib/omData";

const sb = supabase as any;

const statusBadge = (s: string) =>
  s === "konto" ? "bg-green-100 text-green-700"
  : s === "interessiert" ? "bg-blue-100 text-blue-700"
  : s === "kontaktiert" ? "bg-amber-100 text-amber-700"
  : "bg-secondary text-muted-foreground";
const statusLabel = (s: string) =>
  s === "konto" ? "Konto" : s === "interessiert" ? "Interessiert" : s === "kontaktiert" ? "Kontaktiert" : "Neu";

const Clients = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"leads" | "registered">("leads");
  const [search, setSearch] = useState("");
  const [leadDialog, setLeadDialog] = useState(false);
  const [editLead, setEditLead] = useState<OmLead | null>(null);
  const [shareFor, setShareFor] = useState<{ id: string | null; name?: string } | null>(null);
  const [qrOpen, setQrOpen] = useState(false);

  // Eigene Leads
  const { data: leads, isLoading: leadsLoading } = useQuery({
    queryKey: ["om-leads"],
    queryFn: getMyLeads,
  });

  // Registrierte Kunden (bestehende Nutzer)
  const { data: registered, isLoading: regLoading } = useQuery({
    queryKey: ["off-market-clients"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        sb.from("profiles").select("user_id, first_name, last_name, phone, company_name, kyc_status"),
        sb.from("user_roles").select("user_id, role"),
      ]);
      const roleByUser = new Map<string, string>();
      (roles ?? []).forEach((r: any) => { if (!roleByUser.has(r.user_id)) roleByUser.set(r.user_id, r.role); });
      return (profiles ?? []).map((p: any) => {
        const role = roleByUser.get(p.user_id) ?? "buyer";
        if (role === "admin") return null;
        return {
          id: p.user_id,
          name: [p.first_name, p.last_name].filter(Boolean).join(" ") || "Unbenannt",
          phone: p.phone, company: p.company_name, type: role, kyc: p.kyc_status ?? "pending",
        };
      }).filter(Boolean);
    },
  });

  const refreshLeads = () => queryClient.invalidateQueries({ queryKey: ["om-leads"] });

  const removeLead = async (l: OmLead) => {
    if (!confirm(`Kontakt „${l.first_name} ${l.last_name ?? ""}" löschen?`)) return;
    try { await deleteLead(l.id); toast.success("Gelöscht"); refreshLeads(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Fehler"); }
  };

  const term = search.trim().toLowerCase();
  const leadList = (leads ?? []).filter((l) => !term || `${l.first_name} ${l.last_name ?? ""} ${l.email ?? ""}`.toLowerCase().includes(term));
  const regList = (registered ?? []).filter((c: any) => !term || c.name.toLowerCase().includes(term));

  return (
    <OffMarketLayout>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">Kunden</h1>
          <p className="text-muted-foreground mt-1">Eigene Kontakte erfassen, Immobilien senden und Kunden verwalten.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setQrOpen(true)}><QrCode className="w-4 h-4 mr-2" /> Mein Werbe-QR</Button>
          <Button variant="outline" onClick={() => setShareFor({ id: null })}><Send className="w-4 h-4 mr-2" /> Immobilien senden</Button>
          <Button onClick={() => { setEditLead(null); setLeadDialog(true); }}><Plus className="w-4 h-4 mr-2" /> Kunde erfassen</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-5">
        <button onClick={() => setTab("leads")}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${tab === "leads" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-secondary"}`}>
          <UserPlus className="w-4 h-4" /> Meine Kontakte ({leads?.length ?? 0})
        </button>
        <button onClick={() => setTab("registered")}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${tab === "registered" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-secondary"}`}>
          <Users className="w-4 h-4" /> Registrierte Kunden
        </button>
      </div>

      {/* Suche */}
      <div className="mb-5 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Suchen..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Leads-Tab */}
      {tab === "leads" && (
        <Card><CardContent className="p-0">
          {leadsLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Lädt...</div>
          ) : leadList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <UserPlus className="w-10 h-10 mb-3 opacity-40" />
              <p className="font-medium text-foreground">Noch keine Kontakte</p>
              <p className="mt-1 max-w-sm">Erfassen Sie Interessenten und senden Sie ihnen passende Immobilien, um Interesse zu wecken.</p>
              <Button className="mt-4" onClick={() => { setEditLead(null); setLeadDialog(true); }}><Plus className="w-4 h-4 mr-2" /> Ersten Kontakt erfassen</Button>
            </div>
          ) : (
            <div className="divide-y">
              {leadList.map((l) => (
                <div key={l.id} className="p-4 hover:bg-muted/40 transition-colors">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-primary font-semibold">{l.first_name[0]}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{[l.first_name, l.last_name].filter(Boolean).join(" ")}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(l.status)}`}>{statusLabel(l.status)}</span>
                        </div>
                        <div className="flex items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1 flex-wrap">
                          {l.email && <a href={`mailto:${l.email}`} className="flex items-center gap-1 hover:text-foreground"><Mail className="w-3 h-3" />{l.email}</a>}
                          {l.phone && <a href={`tel:${l.phone}`} className="flex items-center gap-1 hover:text-foreground"><Phone className="w-3 h-3" />{l.phone}</a>}
                        </div>
                        {l.notes && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{l.notes}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => setShareFor({ id: l.id, name: l.first_name })}>
                        <Send className="w-3.5 h-3.5 mr-1" /> Immobilien
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditLead(l); setLeadDialog(true); }}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => removeLead(l)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent></Card>
      )}

      {/* Registrierte-Tab */}
      {tab === "registered" && (
        <Card><CardContent className="p-0">
          {regLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Lädt...</div>
          ) : regList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Users className="w-10 h-10 mb-3 opacity-40" /><p>Keine Kunden gefunden.</p>
            </div>
          ) : (
            <div className="divide-y">
              {regList.map((c: any) => (
                <div key={c.id} className="p-4 hover:bg-muted/40 transition-colors flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-primary font-semibold">{c.name[0]}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{c.name}</p>
                        <Badge variant={c.type === "buyer" ? "default" : "secondary"}>
                          {c.type === "buyer" ? "Käufer" : c.type === "seller" ? "Verkäufer" : "Makler"}
                        </Badge>
                        {c.kyc !== "verified" && <Badge variant="outline">Nicht verifiziert</Badge>}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                        {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                        {c.company && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{c.company}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent></Card>
      )}

      <LeadDialog open={leadDialog} onOpenChange={setLeadDialog} lead={editLead} onSaved={refreshLeads} />
      <SharePropertiesDialog open={!!shareFor} onOpenChange={(o) => { if (!o) setShareFor(null); }}
        leadId={shareFor?.id ?? null} leadName={shareFor?.name} />
      <BrokerQrDialog open={qrOpen} onOpenChange={setQrOpen} />
    </OffMarketLayout>
  );
};

export default Clients;
