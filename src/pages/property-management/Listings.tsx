import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Key, Eye, Globe, Clock, XCircle, Loader2, CheckCircle } from "lucide-react";

interface ListingRow {
  id: string;
  title: string;
  unit: string;
  rent: number;
  rooms: number | null;
  status: string;
  views: number;
  applications: number;
}

interface ApplicationRow {
  id: string;
  name: string;
  listing: string;
  date: string;
  status: string;
}

const listingStatusLabels: Record<string, string> = {
  draft: "Entwurf",
  active: "Aktiv",
  paused: "Pausiert",
  rented: "Vermietet",
};

const formatCHF = (n: number) =>
  new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF", maximumFractionDigits: 0 }).format(n);

const Listings = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["pm-listings"],
    queryFn: async () => {
      const [{ data: listings }, { data: apps }, { data: units }] = await Promise.all([
        supabase.from("pm_listings").select("id, title, unit_id, rent_display, status, views_count, created_at"),
        supabase.from("pm_listing_applications").select("id, applicant_name, listing_id, status, created_at").order("created_at", { ascending: false }),
        supabase.from("pm_units").select("id, unit_number, rooms"),
      ]);

      const unitById = new Map((units ?? []).map((u) => [u.id, u]));
      const appsByListing = new Map<string, number>();
      (apps ?? []).forEach((a) => appsByListing.set(a.listing_id, (appsByListing.get(a.listing_id) ?? 0) + 1));
      const listingTitleById = new Map((listings ?? []).map((l) => [l.id, l.title]));

      const listingRows = (listings ?? []).map((l) => {
        const u = unitById.get(l.unit_id);
        return {
          id: l.id,
          title: l.title,
          unit: u ? `Einheit ${u.unit_number}` : "–",
          rent: l.rent_display,
          rooms: u?.rooms ?? null,
          status: listingStatusLabels[l.status] ?? l.status,
          rawStatus: l.status,
          views: l.views_count ?? 0,
          applications: appsByListing.get(l.id) ?? 0,
        };
      });

      const appRows = (apps ?? []).map((a) => ({
        id: a.id,
        name: a.applicant_name,
        listing: listingTitleById.get(a.listing_id) ?? "–",
        date: new Date(a.created_at).toLocaleDateString("de-CH"),
        status: a.status,
      }));

      return { listingRows, appRows };
    },
  });

  const listings = data?.listingRows ?? [];
  const applications = data?.appRows ?? [];

  const appBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("reject") || s.includes("abgelehnt")) return { cls: "bg-destructive/20 text-destructive", icon: <XCircle className="w-3 h-3" /> };
    if (s.includes("review") || s.includes("prüf")) return { cls: "bg-orange-100 text-orange-700", icon: <Eye className="w-3 h-3" /> };
    if (s.includes("accept") || s.includes("zusag") || s.includes("approved")) return { cls: "bg-green-100 text-green-700", icon: <CheckCircle className="w-3 h-3" /> };
    return { cls: "bg-primary/20 text-primary", icon: <Clock className="w-3 h-3" /> };
  };

  return (
    <PropertyManagementLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Inserierung</h1>
          <p className="text-muted-foreground mt-1">Verwalten Sie Ihre Online-Inserate und Bewerbungen</p>
        </div>
        <Button>
          <Key className="w-4 h-4 mr-2" />
          Neues Inserat
        </Button>
      </div>

      {/* Active Listings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Inserate ({listings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Inserate werden geladen...
            </div>
          ) : listings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <Globe className="w-10 h-10 mb-3 opacity-40" />
              <p>Noch keine Inserate erstellt.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {listings.map((listing) => (
                <div key={listing.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg flex-wrap gap-4">
                  <div>
                    <p className="font-medium">{listing.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {listing.unit}{listing.rooms != null ? ` • ${listing.rooms} Zimmer` : ""} • {formatCHF(listing.rent)}/Monat
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="font-semibold">{listing.views}</p>
                      <p className="text-xs text-muted-foreground">Aufrufe</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">{listing.applications}</p>
                      <p className="text-xs text-muted-foreground">Bewerbungen</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      listing.rawStatus === "active" ? "bg-green-100 text-green-700" :
                      listing.rawStatus === "draft" ? "bg-orange-100 text-orange-700" :
                      "bg-secondary text-muted-foreground"
                    }`}>
                      {listing.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Applications */}
      <Card>
        <CardHeader>
          <CardTitle>Aktuelle Bewerbungen ({applications.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Bewerbungen werden geladen...
            </div>
          ) : applications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <Clock className="w-10 h-10 mb-3 opacity-40" />
              <p>Noch keine Bewerbungen eingegangen.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => {
                const badge = appBadge(app.status);
                return (
                  <div key={app.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-primary font-semibold">
                          {app.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{app.name}</p>
                        <p className="text-sm text-muted-foreground">{app.listing}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-sm text-muted-foreground">{app.date}</p>
                      <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${badge.cls}`}>
                        {badge.icon}
                        {app.status}
                      </span>
                      <Button variant="outline" size="sm">Details</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </PropertyManagementLayout>
  );
};

export default Listings;
