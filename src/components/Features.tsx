import { 
  Home, 
  Brain, 
  Calendar, 
  FileText, 
  CreditCard, 
  MessageCircle, 
  BarChart3, 
  Shield,
  ArrowRight
} from "lucide-react";
import swissProperty from "@/assets/swiss-property.jpg";
import consultationImg from "@/assets/consultation.jpg";

const features = [
  {
    icon: Home,
    title: "Off-Market Immobilien",
    description: "Exklusiver Zugang zu Premium-Immobilien vor Markteinführung. KI-gestütztes Matching für diskrete Transaktionen.",
    highlights: ["Diskret", "Schweizweit", "Vorab-Zugang"],
  },
  {
    icon: Brain,
    title: "Intelligentes Matching",
    description: "Unser Algorithmus findet automatisch passende Immobilien basierend auf Ihren Präferenzen.",
    highlights: ["KI-basiert", "Personalisiert", "Effizient"],
  },
  {
    icon: Calendar,
    title: "Besichtigungsmanagement",
    description: "Digitale Terminkoordination mit automatischen Erinnerungen und Kalenderintegration.",
    highlights: ["Terminplanung", "Automatisiert", "Koordiniert"],
  },
  {
    icon: FileText,
    title: "Dokumenten-Workflow",
    description: "Zentrale Dokumentenverwaltung mit digitalen Freigabeprozessen für schnelle Transaktionen.",
    highlights: ["Zentral", "Digital", "Sicher"],
  },
  {
    icon: CreditCard,
    title: "Finanzierungscheck",
    description: "Direkte Finanzierungsprüfung mit Verbindung zu Schweizer Banken für beste Konditionen.",
    highlights: ["Hypothekenrechner", "Bankpartner", "Vorqualifizierung"],
  },
  {
    icon: MessageCircle,
    title: "Zentrale Kommunikation",
    description: "Ein Kommunikationskanal für alle Beteiligten mit vollständiger Nachverfolgung.",
    highlights: ["Zentraler Hub", "Transparent", "Nachverfolgbar"],
  },
  {
    icon: BarChart3,
    title: "Analysen & Reports",
    description: "Detaillierte Marktanalysen und automatisierte Berichte für fundierte Entscheidungen.",
    highlights: ["Marktdaten", "Preistrends", "Automatisiert"],
  },
  {
    icon: Shield,
    title: "Datensicherheit",
    description: "Höchste Schweizer Standards: DSGVO-konform mit Datenhaltung in der Schweiz.",
    highlights: ["DSGVO", "Verschlüsselt", "Swiss Hosting"],
  },
];

const stats = [
  { value: "500+", label: "Off-Market Objekte" },
  { value: "98%", label: "Kundenzufriedenheit" },
  { value: "2 Mrd+", label: "CHF Volumen" },
  { value: "24/7", label: "Verfügbar" },
];

const Features = () => {
  return (
    <section 
      id="features" 
      className="py-24 lg:py-32 section-warm relative overflow-hidden"
      aria-labelledby="features-heading"
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-primary/5 to-transparent" />
      <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-gradient-to-tr from-gold/5 to-transparent" />

      <div className="relative max-w-[1400px] mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <header className="section-header">
          <p className="section-label">Was wir anbieten</p>
          <h2 id="features-heading" className="section-title">
            Ihre komplette
            <span className="text-gradient"> Immobilienlösung</span>
          </h2>
          <p className="section-description">
            Property Network vereint alle Immobiliendienstleistungen auf einer Plattform – 
            von der Vermittlung über die Finanzierung bis zur Verwaltung.
          </p>
        </header>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <article 
              key={feature.title}
              className="group card-premium p-6 hover-lift animate-fade-in opacity-0"
              style={{ animationDelay: `${0.05 * index}s` }}
            >
              <div className="icon-container mb-5">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="font-display font-semibold text-xl mb-3 group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                {feature.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {feature.highlights.map((highlight) => (
                  <span 
                    key={highlight}
                    className="text-xs px-2.5 py-1 bg-primary/10 text-primary rounded-lg font-medium"
                  >
                    {highlight}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>

        {/* Image + Stats Section */}
        <div className="mt-20 grid lg:grid-cols-2 gap-8 items-center">
          {/* Image */}
          <div className="relative rounded-2xl overflow-hidden shadow-2xl animate-fade-in opacity-0" style={{ animationDelay: '0.3s' }}>
            <img 
              src={swissProperty} 
              alt="Modernes Schweizer Wohngebäude" 
              className="w-full h-64 lg:h-80 object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <p className="text-white font-display font-bold text-lg">Premium Immobilien</p>
              <p className="text-white/80 text-sm">Exklusiver Zugang zu Off-Market Objekten</p>
            </div>
          </div>

          {/* Stats */}
          <div className="py-10 px-8 glass rounded-3xl">
            <div className="grid grid-cols-2 gap-8 text-center">
              {stats.map((stat, index) => (
                <div 
                  key={stat.label}
                  className="animate-fade-in opacity-0"
                  style={{ animationDelay: `${0.1 * index + 0.4}s` }}
                >
                  <p className="font-display text-3xl lg:text-4xl font-bold text-gradient mb-2">
                    {stat.value}
                  </p>
                  <p className="text-muted-foreground font-medium text-sm">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
