import { Button } from "@/components/ui/button";
import { Building2, Shield, TrendingUp, ChevronDown } from "lucide-react";
import heroImage from "@/assets/hero-alps.jpg";

const valueProps = [
  { icon: Building2, label: "Off-Market Immobilien" },
  { icon: Shield, label: "Immobilienverwaltung" },
  { icon: TrendingUp, label: "Finanzierungen" },
];

const Hero = () => {
  return (
    <section 
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      aria-label="Willkommen bei Property Network"
    >
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img 
          src={heroImage} 
          alt="Schweizer Alpen Panorama" 
          className="w-full h-full object-cover scale-105"
          loading="eager"
        />
        <div className="absolute inset-0 hero-overlay" />
        {/* Gradient accent */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-transparent" />
      </div>

      {/* Floating decorative elements */}
      <div className="absolute top-1/4 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 left-10 w-96 h-96 bg-gold/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 lg:px-8 text-center">
        <div className="max-w-5xl mx-auto">
          {/* Animated Badge */}
          <div 
            className="inline-flex items-center gap-3 px-6 py-3 glass rounded-full mb-10 animate-fade-in" 
            style={{ animationDelay: "0.2s" }}
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
            <span className="text-foreground font-medium">
              Die All-in-One Immobilienplattform der Schweiz
            </span>
          </div>

          {/* Main Heading with Gradient */}
          <h1 
            className="font-display text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-white leading-[1.1] mb-8 animate-fade-in-up opacity-0" 
            style={{ animationDelay: "0.4s" }}
          >
            Property
            <span className="block text-gradient bg-gradient-to-r from-primary via-copper-light to-gold bg-clip-text text-transparent">
              Network
            </span>
          </h1>

          {/* Subtitle */}
          <p 
            className="text-xl md:text-2xl text-white/85 mb-10 max-w-3xl mx-auto animate-fade-in-up opacity-0 leading-relaxed font-light" 
            style={{ animationDelay: "0.6s" }}
          >
            Kaufen, Verkaufen, Verwalten und Finanzieren – 
            <span className="text-white font-medium"> alles auf einer Plattform.</span>
          </p>

          {/* Value Props with Glass Effect */}
          <div 
            className="flex flex-wrap justify-center gap-4 lg:gap-6 mb-12 animate-fade-in-up opacity-0" 
            style={{ animationDelay: "0.7s" }}
          >
            {valueProps.map((prop, index) => (
              <div 
                key={prop.label}
                className="flex items-center gap-3 px-5 py-3 glass-dark rounded-xl"
              >
                <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                  <prop.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-white font-medium">{prop.label}</span>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div 
            className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up opacity-0" 
            style={{ animationDelay: "0.8s" }}
          >
            <Button 
              asChild 
              size="lg" 
              className="px-10 py-7 text-lg font-semibold shadow-2xl shadow-primary/30 hover:shadow-primary/50 hover:scale-105 transition-all duration-300 animate-pulse-glow"
            >
              <a href="#platforms">Jetzt starten</a>
            </Button>
            <Button 
              asChild 
              size="lg" 
              variant="outline" 
              className="glass border-white/30 text-foreground hover:bg-white px-10 py-7 text-lg font-semibold hover:scale-105 transition-all duration-300"
            >
              <a href="#features">Mehr erfahren</a>
            </Button>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <a 
        href="#features"
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/60 hover:text-white transition-colors"
      >
        <span className="text-sm font-medium tracking-wider uppercase">Entdecken</span>
        <ChevronDown className="w-6 h-6 animate-bounce" />
      </a>
    </section>
  );
};

export default Hero;
