import { 
  Home, 
  Search, 
  Wallet, 
  Building2, 
  FileCheck,
  Key,
  ArrowRight,
  Sparkles
} from "lucide-react";
import consultationImg from "@/assets/consultation.jpg";

const services = [
  {
    icon: Home,
    title: "Immobilie verkaufen",
    description: "Diskret und zum besten Preis über unser exklusives Off-Market Netzwerk verkaufen.",
    steps: ["Bewertung", "Vermarktung", "Verkauf"],
    gradient: "from-primary to-copper-dark",
  },
  {
    icon: Search,
    title: "Immobilie suchen",
    description: "Traumimmobilie finden bevor sie auf den Markt kommt. Exklusiver Zugang schweizweit.",
    steps: ["Präferenzen", "Matching", "Besichtigung"],
    gradient: "from-copper-dark to-primary",
  },
  {
    icon: Wallet,
    title: "Finanzierung sichern",
    description: "Hypothek berechnen und beste Konditionen von Schweizer Bankpartnern erhalten.",
    steps: ["Berechnung", "Antrag", "Zusage"],
    gradient: "from-primary via-copper-light to-gold",
  },
  {
    icon: Building2,
    title: "Immobilie verwalten",
    description: "Professionelle Verwaltung: Mieter, Nebenkostenabrechnungen und Instandhaltung.",
    steps: ["Onboarding", "Verwaltung", "Reporting"],
    gradient: "from-gold via-copper-light to-primary",
  },
];

const processSteps = [
  {
    number: "01",
    icon: FileCheck,
    title: "Registrieren",
    description: "Kostenloses Konto erstellen und Verifizierung durchlaufen.",
  },
  {
    number: "02",
    icon: Search,
    title: "Service wählen",
    description: "Verkauf, Suche, Finanzierung oder Verwaltung auswählen.",
  },
  {
    number: "03",
    icon: Key,
    title: "Erfolg erleben",
    description: "Von Netzwerk und Expertise für erfolgreiche Transaktionen profitieren.",
  },
];

const HowItWorks = () => {
  return (
    <section 
      id="how-it-works" 
      className="py-24 lg:py-32 section-light relative"
      aria-labelledby="services-heading"
    >
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <header className="section-header">
          <p className="section-label">Unsere Dienstleistungen</p>
          <h2 id="services-heading" className="section-title">
            Alles aus
            <span className="text-gradient"> einer Hand</span>
          </h2>
          <p className="section-description">
            Property Network bietet ein vollständiges Ökosystem für alle Ihre Immobilienbedürfnisse.
          </p>
        </header>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 mb-20">
          {services.map((service, index) => (
            <article 
              key={service.title}
              className="group card-premium overflow-hidden hover-lift animate-fade-in opacity-0"
              style={{ animationDelay: `${0.08 * index}s` }}
            >
              {/* Gradient Header */}
              <div className={`bg-gradient-to-br ${service.gradient} p-6 text-white relative overflow-hidden`}>
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                <div className="relative">
                  <service.icon className="w-10 h-10 mb-4" />
                  <h3 className="font-display font-bold text-xl">
                    {service.title}
                  </h3>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-6">
                <p className="text-muted-foreground text-sm leading-relaxed mb-5">
                  {service.description}
                </p>
                
                {/* Process Steps */}
                <div className="flex items-center gap-2 text-xs">
                  {service.steps.map((step, stepIndex) => (
                    <div key={step} className="flex items-center gap-2">
                      <span className="px-3 py-1.5 bg-secondary rounded-lg font-medium text-foreground/80 border border-border/50">
                        {step}
                      </span>
                      {stepIndex < service.steps.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-primary/50" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Process Section with Image */}
        <div className="grid lg:grid-cols-5 gap-8 items-center">
          {/* Image - takes 2 columns */}
          <div className="lg:col-span-2 relative rounded-2xl overflow-hidden shadow-2xl animate-fade-in opacity-0" style={{ animationDelay: '0.2s' }}>
            <img 
              src={consultationImg} 
              alt="Professionelle Immobilienberatung" 
              className="w-full h-72 lg:h-96 object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5">
              <p className="text-white font-display font-bold text-xl mb-1">Persönliche Beratung</p>
              <p className="text-white/80 text-sm">Experten an Ihrer Seite bei jedem Schritt</p>
            </div>
          </div>

          {/* Process Steps - takes 3 columns */}
          <div className="lg:col-span-3 relative">
            <div className="absolute inset-0 gradient-warm rounded-3xl" />
            
            <div className="relative glass rounded-3xl p-8 lg:p-10">
              <header className="text-center mb-10">
                <div className="badge-primary mx-auto mb-4">
                  <Sparkles className="w-4 h-4" />
                  <span>Einfacher Start</span>
                </div>
                <h3 className="font-display text-2xl md:text-3xl font-bold">
                  In 3 Schritten zum Erfolg
                </h3>
              </header>

              <div className="grid gap-6">
                {processSteps.map((step, index) => (
                  <article 
                    key={step.number} 
                    className="flex items-start gap-4 animate-fade-in opacity-0"
                    style={{ animationDelay: `${0.15 * index + 0.3}s` }}
                  >
                    {/* Step Icon */}
                    <div className="relative flex-shrink-0">
                      <div className="w-14 h-14 bg-gradient-to-br from-primary to-copper-dark rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                        <step.icon className="w-6 h-6 text-white" />
                      </div>
                      <span className="absolute -top-1 -right-1 w-6 h-6 bg-gold text-foreground rounded-full flex items-center justify-center text-xs font-bold shadow">
                        {step.number}
                      </span>
                    </div>

                    {/* Content */}
                    <div>
                      <h4 className="font-display font-bold text-lg mb-1">
                        {step.title}
                      </h4>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
