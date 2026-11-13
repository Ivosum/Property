import OffMarketLayout from "@/components/off-market/OffMarketLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, Building2, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

// Demo-Daten für die Diagramme (Beispielwerte zur Darstellung)
const registrationsData = [
  { monat: "Jul", nutzer: 12 },
  { monat: "Aug", nutzer: 19 },
  { monat: "Sep", nutzer: 15 },
  { monat: "Okt", nutzer: 27 },
  { monat: "Nov", nutzer: 31 },
  { monat: "Dez", nutzer: 23 },
];

const activityData = [
  { monat: "Jul", listings: 8, transaktionen: 2 },
  { monat: "Aug", listings: 11, transaktionen: 3 },
  { monat: "Sep", listings: 9, transaktionen: 1 },
  { monat: "Okt", listings: 14, transaktionen: 4 },
  { monat: "Nov", listings: 17, transaktionen: 5 },
  { monat: "Dez", listings: 12, transaktionen: 3 },
];

// Bronze/Primary-Farbe passend zum Design
const PRIMARY = "hsl(25 75% 47%)";
const GOLD = "hsl(42 87% 55%)";

const AdminAnalytics = () => {
  return (
    <OffMarketLayout>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Analysen</h1>
        <p className="text-muted-foreground mt-1">
          Übersicht über alle Plattform-Aktivitäten
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gesamte Nutzer</p>
                <p className="text-3xl font-bold mt-1">127</p>
                <div className="flex items-center gap-1 text-sm text-primary mt-1">
                  <ArrowUpRight className="w-4 h-4" />
                  <span>+12% diesen Monat</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktive Immobilien</p>
                <p className="text-3xl font-bold mt-1">45</p>
                <div className="flex items-center gap-1 text-sm text-primary mt-1">
                  <ArrowUpRight className="w-4 h-4" />
                  <span>+8% diesen Monat</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Transaktionen</p>
                <p className="text-3xl font-bold mt-1">8</p>
                <div className="flex items-center gap-1 text-sm text-destructive mt-1">
                  <ArrowDownRight className="w-4 h-4" />
                  <span>-3% diesen Monat</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Umsatz (CHF)</p>
                <p className="text-3xl font-bold mt-1">285K</p>
                <div className="flex items-center gap-1 text-sm text-primary mt-1">
                  <ArrowUpRight className="w-4 h-4" />
                  <span>+24% diesen Monat</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Nutzer-Registrierungen</CardTitle>
            <CardDescription>Neue Nutzer pro Monat</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={registrationsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PRIMARY} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={PRIMARY} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 90%)" />
                  <XAxis dataKey="monat" tick={{ fontSize: 12, fill: "hsl(220 9% 46%)" }} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(220 9% 46%)" }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(220 14% 90%)", fontSize: 13 }}
                    labelStyle={{ color: "hsl(222 47% 11%)" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="nutzer"
                    name="Neue Nutzer"
                    stroke={PRIMARY}
                    strokeWidth={2}
                    fill="url(#userGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Immobilien-Aktivität</CardTitle>
            <CardDescription>Listings und Transaktionen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 90%)" />
                  <XAxis dataKey="monat" tick={{ fontSize: 12, fill: "hsl(220 9% 46%)" }} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(220 9% 46%)" }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(220 14% 90%)", fontSize: 13 }}
                    labelStyle={{ color: "hsl(222 47% 11%)" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="listings" name="Listings" fill={PRIMARY} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="transaktionen" name="Transaktionen" fill={GOLD} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Nutzerverteilung</CardTitle>
            <CardDescription>Nach Rolle</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Käufer</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="w-[60%] h-full bg-primary rounded-full" />
                  </div>
                  <span className="text-sm font-medium">76</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>Verkäufer</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="w-[30%] h-full bg-primary rounded-full" />
                  </div>
                  <span className="text-sm font-medium">38</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>Makler</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="w-[10%] h-full bg-primary rounded-full" />
                  </div>
                  <span className="text-sm font-medium">13</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>KYC Status</CardTitle>
            <CardDescription>Verifizierungsstatus</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-primary">Verifiziert</span>
                <span className="font-medium">89</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-amber-600">In Prüfung</span>
                <span className="font-medium">23</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Ausstehend</span>
                <span className="font-medium">15</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Kantone</CardTitle>
            <CardDescription>Nach Immobilien</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Zürich (ZH)</span>
                <span className="font-medium">18</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Genf (GE)</span>
                <span className="font-medium">12</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Wallis (VS)</span>
                <span className="font-medium">8</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Basel (BS)</span>
                <span className="font-medium">7</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </OffMarketLayout>
  );
};

export default AdminAnalytics;
