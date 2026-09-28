import { Link } from "react-router-dom";
import { Building2, Home, ArrowRight, Users, FileText, CreditCard, User, LogIn, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const platforms = [
  {
    id: "off-market",
    icon: Home,
    title: "Off-Market Plattform",
    description: "Exklusiver Zugang zu nicht öffentlich gelisteten Immobilien. Für Käufer, Verkäufer und professionelle Makler.",
    features: ["Diskrete Transaktionen", "Qualifizierte Käufer", "Professionelle Makler", "Schweizweites Netzwerk"],
    href: "/off-market",
    authHref: "/auth",
    badge: "Beliebt",
  },
  {
    id: "property-management",
    icon: Building2,
    title: "Immobilienverwaltung",
    description: "Umfassende Lösung für die professionelle Bewirtschaftung Ihres Immobilienportfolios.",
    features: ["Mieterverwaltung", "Nebenkostenabrechnung", "Dokumentenmanagement", "Automatisierung"],
    href: "/property-management",
    authHref: "/auth",
    badge: "Neu",
  },
];

const infoCards = [
  {
    icon: Users,
    title: "Multi-Mandanten",
    description: "Separate Zugänge für alle Parteien",
  },
  {
    icon: FileText,
    title: "Automatisierung",
    description: "Verträge & Abrechnungen automatisch",
  },
  {
    icon: CreditCard,
    title: "Finanzbuchhaltung",
    description: "Integrierte Zahlungsverwaltung",
  },
];

const PlatformAccess = () => {
  return (
    <section 
      id="platforms" 
      className="py-24 lg:py-32 section-warm relative overflow-hidden"
      aria-labelledby="platforms-heading"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 w-full h-full bg-gradient-to-bl from-primary/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-[1200px] mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <header className="section-header">
          <p className="section-label">Jetzt starten</p>
          <h2 id="platforms-heading" className="section-title">
            Wählen Sie Ihren
            <span className="text-gradient"> Zugang</span>
          </h2>
          <p className="section-description">
            Melden Sie sich an und nutzen Sie die volle Leistungsfähigkeit von Property Network
          </p>
        </header>

        {/* Platform Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          {platforms.map((platform, index) => (
            <article 
              key={platform.id}
              className="group relative card-premium p-8 hover-lift animate-fade-in opacity-0"
              style={{ animationDelay: `${0.15 * index}s` }}
            >
              {/* Badge */}
              {platform.badge && (
                <div className="absolute top-6 right-6 badge-primary">
                  <Star className="w-3 h-3" />
                  <span>{platform.badge}</span>
                </div>
              )}

              {/* Icon */}
              <div className="icon-container mb-6 w-16 h-16">
                <platform.icon className="w-8 h-8" />
              </div>

              {/* Content */}
              <h3 className="font-display font-bold text-2xl mb-3 group-hover:text-primary transition-colors">
                {platform.title}
              </h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                {platform.description}
              </p>

              {/* Features */}
              <ul className="space-y-2.5 mb-8">
                {platform.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-gold" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTAs */}
              <div className="flex gap-3">
                <Link to={platform.authHref}>
                  <Button size="sm" className="px-5 shadow-lg shadow-primary/20 hover:shadow-primary/30">
                    <LogIn className="w-4 h-4 mr-1.5" />
                    Login
                  </Button>
                </Link>
                <Link to={platform.href}>
                  <Button size="sm" variant="outline" className="px-5 group/btn">
                    Demo
                    <ArrowRight className="w-4 h-4 ml-1.5 group-hover/btn:translate-x-0.5 transition-transform" />
                  </Button>
                </Link>
              </div>

              {/* Hover gradient overlay */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 via-transparent to-gold/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            </article>
          ))}
        </div>

        {/* Tenant Portal */}
        <div className="glass rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 mb-12 animate-fade-in opacity-0" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-primary/10 to-gold/10 rounded-xl flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg">Mieterportal</h3>
              <p className="text-sm text-muted-foreground">
                Für Mieter: Zahlungen, Mängelmeldungen, Dokumente abrufen
              </p>
            </div>
          </div>
          <Link to="/tenant-auth">
            <Button size="sm" variant="outline" className="px-5 shadow-sm">
              <LogIn className="w-4 h-4 mr-1.5" />
              Login
            </Button>
          </Link>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {infoCards.map((card, index) => (
            <div 
              key={card.title}
              className="flex items-center gap-4 p-5 glass rounded-xl animate-fade-in opacity-0"
              style={{ animationDelay: `${0.1 * index + 0.4}s` }}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-gold/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <card.icon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{card.title}</p>
                <p className="text-sm text-muted-foreground">{card.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PlatformAccess;
