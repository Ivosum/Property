import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2, ChevronDown, ChevronRight, Mail, Phone, CircleCheck, CircleAlert, CircleX,
} from "lucide-react";
import { formatCHF } from "@/lib/accounting";
import { getOpenItems, type DebtorOpenItems, type HealthColor } from "@/lib/openItems";

interface Props {
  propertyId?: string;   // leer = alle Liegenschaften
  showProperty?: boolean;
}

const healthDot: Record<HealthColor, { cls: string; icon: typeof CircleCheck; label: string }> = {
  green: { cls: "text-emerald-600", icon: CircleCheck, label: "Pünktlich" },
  amber: { cls: "text-amber-500", icon: CircleAlert, label: "Beobachten" },
  red: { cls: "text-rose-600", icon: CircleX, label: "Risiko" },
};

const AgingBar = ({ d }: { d: DebtorOpenItems }) => {
  const total = d.total || 1;
  const seg = [
    { v: d.current, c: "bg-slate-300" },
    { v: d.d30, c: "bg-amber-300" },
    { v: d.d60, c: "bg-orange-400" },
    { v: d.d90, c: "bg-rose-500" },
  ];
  return (
    <div className="h-1.5 w-full rounded-full overflow-hidden flex bg-muted">
      {seg.map((s, i) => s.v > 0 && (
        <div key={i} className={s.c} style={{ width: `${(s.v / total) * 100}%` }} />
      ))}
    </div>
  );
};

const OpenItemsPanel = ({ propertyId, showProperty = true }: Props) => {
  const [open, setOpen] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["open-items", propertyId ?? "all"],
    queryFn: () => getOpenItems(propertyId),
  });

  const toggle = (id: string) => setOpen((s) => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  if (isLoading) {
    return <Card><CardContent className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Offene Posten werden geladen...</CardContent></Card>;
  }

  const debtors = data?.debtors ?? [];
  const s = data?.summary;

  return (
    <div className="space-y-5">
      {/* Aging-Übersicht */}
      {s && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">Offen gesamt</p>
            <p className="text-xl font-semibold tabular-nums">{formatCHF(s.total)}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.debtorCount} Debitoren</p>
          </div>
          <AgingTile label="Nicht fällig" value={s.current} dot="bg-slate-300" />
          <AgingTile label="1–30 Tage" value={s.d30} dot="bg-amber-300" />
          <AgingTile label="31–60 Tage" value={s.d60} dot="bg-orange-400" />
          <AgingTile label="über 60 Tage" value={s.d90} dot="bg-rose-500" accent />
        </div>
      )}

      {/* Ampel-Zusammenfassung */}
      {s && (s.green + s.amber + s.red) > 0 && (
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5"><CircleCheck className="w-4 h-4 text-emerald-600" /> {s.green} pünktlich</span>
          <span className="flex items-center gap-1.5"><CircleAlert className="w-4 h-4 text-amber-500" /> {s.amber} beobachten</span>
          <span className="flex items-center gap-1.5"><CircleX className="w-4 h-4 text-rose-600" /> {s.red} Risiko</span>
        </div>
      )}

      {/* Debitorenliste */}
      {debtors.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-14 text-center text-muted-foreground">
          <CircleCheck className="w-10 h-10 mb-3 text-emerald-500/70" />
          <p className="font-medium text-foreground">Keine offenen Posten</p>
          <p className="text-sm mt-1">Alle Mieten sind beglichen.</p>
        </CardContent></Card>
      ) : (
        <div className="rounded-xl border bg-card divide-y">
          {debtors.map((d) => {
            const H = healthDot[d.health];
            const isOpen = open.has(d.tenantId);
            return (
              <div key={d.tenantId}>
                <button
                  onClick={() => toggle(d.tenantId)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                >
                  {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <H.icon className={`w-4 h-4 shrink-0 ${H.cls}`} aria-label={H.label} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{d.tenantName}</span>
                      {d.oldestDays > 0 && (
                        <span className="text-xs text-rose-600 shrink-0">{d.oldestDays} Tage</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {showProperty && <span className="truncate">{d.propertyName}</span>}
                      {d.unit && <span className="truncate">· {d.unit}</span>}
                      <span>· {d.items.length} Posten</span>
                    </div>
                    <div className="mt-2 max-w-xs"><AgingBar d={d} /></div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold tabular-nums">{formatCHF(d.total)}</p>
                    <p className="text-xs text-muted-foreground">{H.label}</p>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 pl-11 space-y-2">
                    {d.items.map((it) => (
                      <div key={it.paymentId} className="flex items-center justify-between text-sm py-1.5 border-b border-dashed last:border-0">
                        <span className="text-muted-foreground">
                          Fällig {new Date(it.dueDate).toLocaleDateString("de-CH")}
                          {it.daysOverdue > 0 && <span className="text-rose-600"> · {it.daysOverdue} Tage überfällig</span>}
                          {it.reminderStage > 0 && <span className="text-amber-600"> · Mahnstufe {it.reminderStage}</span>}
                        </span>
                        <span className="font-medium tabular-nums">{formatCHF(it.amount)}</span>
                      </div>
                    ))}
                    <div className="flex gap-2 pt-1">
                      {d.email && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={`mailto:${d.email}`}><Mail className="w-3.5 h-3.5 mr-1.5" /> E-Mail</a>
                        </Button>
                      )}
                      {d.phone && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={`tel:${d.phone}`}><Phone className="w-3.5 h-3.5 mr-1.5" /> Anrufen</a>
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const AgingTile = ({ label, value, dot, accent }: { label: string; value: number; dot: string; accent?: boolean }) => (
  <div className={`rounded-xl border p-4 ${accent && value > 0 ? "border-rose-200 bg-rose-50/50" : "bg-card"}`}>
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
    <p className="text-xl font-semibold tabular-nums mt-1">{formatCHF(value)}</p>
  </div>
);

export default OpenItemsPanel;
