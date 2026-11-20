import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus, Globe, Clock, Loader2, ImageIcon, Users, ExternalLink, Pause, Send, Loader,
} from "lucide-react";
import { toast } from "sonner";
import ListingDialog from "@/components/property-management/ListingDialog";
import FeatureGate from "@/components/property-management/FeatureGate";
import {
  getAllListingChannels, publishToPortal, pauseChannel, PORTALS,
} from "@/lib/pmData";

const sb = supabase as any;

const statusLabels: Record<string, string> = { draft: "Entwurf", active: "Aktiv", paused: "Pausiert", rented: "Vermietet" };
const portalLabel: Record<string, string> = { flatfox: "Flatfox", homegate: "Homegate" };

const formatCHF = (n: number) =>
  new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF", maximumFractionDigits: 0 }).format(n);

const Listings = () => {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["pm-listings"],
    queryFn: async () => {
      const [{ data: listings }, { data: apps }, channels] = await Promise.all([
        sb.from("pm_listings").select("id, title, unit_id, rent_display, utilities, rooms, living_area, floor_label, city, status, views_count, images, created_at").order("created_at", { ascending: false }),
        sb.from("pm_listing_applications").select("id, applicant_name, listing_id, status, created_at").order("created_at", { ascending: false }),
        getAllListingChannels(),
      ]);
      const appsByListing = new Map<string, number>();
      (apps ?? []).forEach((a: any) => appsByListing.set(a.listing_id, (appsByListing.get(a.listing_id) ?? 0) + 1));
      const chByListing = new Map<string, any[]>();
      channels.forEach((c: any) => { const arr = chByListing.get(c.listing_id) ?? []; arr.push(c); chByListing.set(c.listing_id, arr); });

      const rows = (listings ?? []).map((l: any) => ({
        ...l,
        applications: appsByListing.get(l.id) ?? 0,
        channels: chByListing.get(l.id) ?? [],
        cover: (l.images ?? [])[0] ?? null,
      }));
      return { rows, apps: apps ?? [] };
    },
  });

  const rows = data?.rows ?? [];
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["pm-listings"] });

  const publish = async (listingId: string, portal: string) => {
    setBusy(`${listingId}-${portal}`);
    try {
      const r = await publishToPortal(listingId, portal);
      if (r.ok) toast.success(`Auf ${portalLabel[portal]} veröffentlicht`);
      else toast.error(r.message ?? "Veröffentlichung fehlgeschlagen");
      refresh();
    } finally { setBusy(null); }
  };

  const pause = async (listingId: string, portal: string) => {
    setBusy(`${listingId}-${portal}`);
    try { await pauseChannel(listingId, portal); toast.success(`${portalLabel[portal]} pausiert`); refresh(); }
    finally { setBusy(null); }
  };

  const channelOf = (listing: any, portal: string) => listing.channels.find((c: any) => c.portal === portal);

  return (
    <PropertyManagementLayout>
      <FeatureGate feature="listings">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Inserierung</h1>
          <p className="text-muted-foreground mt-1">Inserate erstellen und direkt auf Homegate und Flatfox veröffentlichen</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Neues Inserat
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Inserate werden geladen...
        </div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <Globe className="w-10 h-10 mb-3 opacity-40" />
          <p className="font-medium text-foreground">Noch kein Inserat</p>
          <p className="text-sm mt-1 max-w-sm">Erstellen Sie ein Inserat: Liegenschaft und Einheit wählen, Bilder hochladen und auf den Portalen veröffentlichen – alles hier.</p>
          <Button className="mt-4" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4 mr-2" /> Inserat erstellen</Button>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {rows.map((l: any) => (
            <div key={l.id} className="rounded-xl border bg-card overflow-hidden flex flex-col">
              {/* Cover */}
              <div className="relative aspect-[16/9] bg-muted">
                {l.cover ? (
                  <img src={l.cover} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="w-8 h-8 opacity-40" />
                  </div>
                )}
                <span className={`absolute top-3 left-3 text-xs px-2 py-1 rounded-full backdrop-blur ${
                  l.status === "active" ? "bg-emerald-600/90 text-white" :
                  l.status === "draft" ? "bg-amber-500/90 text-white" :
                  l.status === "rented" ? "bg-slate-600/90 text-white" : "bg-black/60 text-white"
                }`}>{statusLabels[l.status] ?? l.status}</span>
                {(l.images?.length ?? 0) > 1 && (
                  <span className="absolute top-3 right-3 text-xs px-2 py-1 rounded-full bg-black/60 text-white">{l.images.length} Bilder</span>
                )}
              </div>

              <div className="p-4 flex-1 flex flex-col">
                <p className="font-medium leading-snug">{l.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {[l.rooms && `${l.rooms} Zi.`, l.living_area && `${l.living_area} m²`, l.floor_label, l.city].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-2 font-semibold tabular-nums">
                  {formatCHF(l.rent_display)}<span className="text-sm font-normal text-muted-foreground">/Mt.{l.utilities ? ` + ${formatCHF(l.utilities)} NK` : ""}</span>
                </p>

                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {l.applications} Bewerbungen</span>
                  <span>{l.views_count ?? 0} Aufrufe</span>
                </div>

                {/* Portal-Kanäle */}
                <div className="mt-4 pt-3 border-t space-y-2">
                  {PORTALS.map((p) => {
                    const ch = channelOf(l, p.value);
                    const key = `${l.id}-${p.value}`;
                    const published = ch?.status === "published";
                    return (
                      <div key={p.value} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            published ? "bg-emerald-500" : ch?.status === "error" ? "bg-rose-500" : ch?.status === "paused" ? "bg-slate-400" : ch?.status === "queued" ? "bg-amber-400" : "bg-muted-foreground/30"
                          }`} />
                          <span className="text-sm">{p.label}</span>
                          {published && ch.external_url && (
                            <a href={ch.external_url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-0.5 hover:underline">
                              ansehen <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          {ch?.status === "error" && <span className="text-xs text-rose-600 truncate">{ch.error_msg}</span>}
                        </div>
                        {published ? (
                          <Button variant="ghost" size="sm" onClick={() => pause(l.id, p.value)} disabled={busy === key}>
                            {busy === key ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Pause className="w-3.5 h-3.5" />}
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => publish(l.id, p.value)} disabled={busy === key}>
                            {busy === key ? <Loader className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                            {ch?.status === "paused" ? "Wieder aktiv" : "Veröffentlichen"}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bewerbungen */}
      {(data?.apps.length ?? 0) > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Aktuelle Bewerbungen</h2>
          <div className="rounded-xl border bg-card divide-y">
            {data!.apps.slice(0, 8).map((a: any) => (
              <div key={a.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary text-sm font-semibold">{a.applicant_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</span>
                  </div>
                  <span className="font-medium truncate">{a.applicant_name}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(a.created_at).toLocaleDateString("de-CH")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ListingDialog open={addOpen} onOpenChange={setAddOpen} onSaved={refresh} />
      </FeatureGate>
    </PropertyManagementLayout>
  );
};

export default Listings;
