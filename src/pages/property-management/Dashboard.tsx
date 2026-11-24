import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, CreditCard, AlertTriangle, Loader2, DoorOpen } from "lucide-react";

const formatCHF = (n: number) =>
  new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF", maximumFractionDigits: 0 }).format(n);

const priorityLabels: Record<string, string> = { low: "Niedrig", normal: "Normal", urgent: "Dringend" };

const Dashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["pm-dashboard"],
    queryFn: async () => {
      const [propsRes, unitsRes, tenantsRes, defectsRes, paymentsRes] = await Promise.all([
        supabase.from("pm_properties").select("id", { count: "exact", head: true }),
        supabase.from("pm_units").select("status"),
        supabase.from("pm_tenants").select("id", { count: "exact", head: true }),
        supabase.from("pm_defects").select("id, unit_id, title, priority, status, created_at").in("status", ["open", "in_progress"]).order("created_at", { ascending: false }).limit(5),
        supabase.from("pm_payments").select("id, tenant_id, amount, due_date, status").in("status", ["pending", "overdue"]).order("due_date", { ascending: true }).limit(5),
      ]);

      const units = unitsRes.data ?? [];
      const occupied = units.filter((u) => u.status === "occupied").length;
      const vacant = units.filter((u) => u.status === "vacant").length;
      const occupancyRate = units.length > 0 ? Math.round((occupied / units.length) * 100) : 0;

      const urgentDefects = (defectsRes.data ?? []).filter((d) => d.priority === "urgent").length;

      // Namen/Einheiten für die Listen
      const unitIds = (defectsRes.data ?? []).map((d) => d.unit_id);
      const tenantIds = (paymentsRes.data ?? []).map((p) => p.tenant_id);
      const [{ data: unitRows }, { data: tenantRows }] = await Promise.all([
        unitIds.length ? supabase.from("pm_units").select("id, unit_number").in("id", unitIds) : Promise.resolve({ data: [] as any[] }),
        tenantIds.length ? supabase.from("pm_tenants").select("id, first_name, last_name").in("id", tenantIds) : Promise.resolve({ data: [] as any[] }),
      ]);
      const unitLabel = new Map((unitRows ?? []).map((u) => [u.id, `Einheit ${u.unit_number}`]));
      const tenantLabel = new Map((tenantRows ?? []).map((t) => [t.id, [t.first_name, t.last_name].filter(Boolean).join(" ") || "Mieter"]));

      const monthlyIncome = (paymentsRes.data ?? []).reduce((s, p) => s + p.amount, 0);

      return {
        propertyCount: propsRes.count ?? 0,
        tenantCount: tenantsRes.count ?? 0,
        occupancyRate,
        vacant,
        openDefectCount: defectsRes.data?.length ?? 0,
        urgentDefects,
        defects: (defectsRes.data ?? []).map((d) => ({
          id: d.id,
          unit: unitLabel.get(d.unit_id) ?? "–",
          issue: d.title,
          priority: priorityLabels[d.priority] ?? d.priority,
          rawPriority: d.priority,
          date: new Date(d.created_at).toLocaleDateString("de-CH"),
        })),
        payments: (paymentsRes.data ?? []).map((p) => ({
          id: p.id,
          tenant: tenantLabel.get(p.tenant_id) ?? "Mieter",
          amount: p.amount,
          due: p.due_date,
          overdue: p.status === "overdue",
        })),
        outstanding: monthlyIncome,
      };
    },
  });

  const stats = [
    { label: "Verwaltete Objekte", value: data ? String(data.propertyCount) : "–", icon: Building2, to: "/property-management/properties" },
    { label: "Aktive Mieter", value: data ? String(data.tenantCount) : "–", icon: Users, sub: data ? `${data.occupancyRate}% Auslastung` : undefined, to: "/property-management/tenants" },
    { label: "Leerstände", value: data ? String(data.vacant) : "–", icon: DoorOpen, sub: data && data.vacant > 0 ? "zu vermieten" : undefined, to: "/property-management/properties" },
    { label: "Offene Mängel", value: data ? String(data.openDefectCount) : "–", icon: AlertTriangle, sub: data && data.urgentDefects > 0 ? `${data.urgentDefects} dringend` : undefined, to: "/property-management/defects" },
    { label: "Offene Zahlungen", value: data ? formatCHF(data.outstanding) : "–", icon: CreditCard, to: "/property-management/finances" },
  ];

  return (
    <PropertyManagementLayout>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">
          Willkommen{profile?.first_name ? `, ${profile.first_name}` : ""}
        </h1>
        <p className="text-muted-foreground mt-1">
          Ihr Immobilienverwaltungs-Dashboard
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label} onClick={() => navigate(stat.to)} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
              </div>
              <p className="text-lg sm:text-2xl font-bold leading-tight tabular-nums whitespace-nowrap">{stat.value}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
              {stat.sub && <p className="text-xs text-primary mt-1">{stat.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Offene Mängelmeldungen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : (data?.defects.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Keine offenen Mängel.</p>
            ) : (
              <div className="space-y-3">
                {data!.defects.map((item) => (
                  <div key={item.id} onClick={() => navigate("/property-management/defects")} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg cursor-pointer hover:bg-secondary/70">
                    <div>
                      <p className="font-medium text-sm">{item.unit}</p>
                      <p className="text-sm text-muted-foreground">{item.issue}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        item.rawPriority === "urgent" ? "bg-destructive/20 text-destructive" :
                        item.rawPriority === "normal" ? "bg-orange-100 text-orange-700" :
                        "bg-secondary text-muted-foreground"
                      }`}>
                        {item.priority}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">{item.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Ausstehende Zahlungen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : (data?.payments.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Keine ausstehenden Zahlungen.</p>
            ) : (
              <div className="space-y-3">
                {data!.payments.map((item) => (
                  <div key={item.id} onClick={() => navigate("/property-management/finances")} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg cursor-pointer hover:bg-secondary/70">
                    <div>
                      <p className="font-medium text-sm">{item.tenant}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{formatCHF(item.amount)}</p>
                      <p className={`text-xs ${item.overdue ? "text-destructive" : "text-muted-foreground"}`}>
                        {item.overdue ? "Überfällig: " : "Fällig: "}{new Date(item.due).toLocaleDateString("de-CH")}
                      </p>
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

export default Dashboard;
