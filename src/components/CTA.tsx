import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

const benefits = [
  "Kostenlose Registrierung",
  "Keine versteckten Gebühren",
  "Schweizer Datenschutz",
];

const CTA = () => {
  return (
    <section 
      className="py-24 lg:py-32 section-dark relative overflow-hidden"
      aria-labelledby="cta-heading"
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-gold/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className="relative max-w-[1000px] mx-auto px-4 lg:px-8">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-sm rounded-full mb-8 border border-white/10">
            <Sparkles className="w-4 h-4 text-gold" />
            <span className="text-white/90 font-medium">
              Starten Sie noch heute
            </span>
          </div>

          <h2 
            id="cta-heading"
            className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight"
          >
            Bereit für
            <span className="block text-gradient bg-gradient-to-r from-primary via-copper-light to-gold bg-clip-text text-transparent">
              Property Network?
            </span>
          </h2>
          <p className="text-white/70 text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            Vereinfachen Sie Ihre Immobiliengeschäfte – von der Suche über die Verwaltung 
            bis zur Finanzierung, alles an einem Ort.
          </p>

          {/* Benefits */}
          <div className="flex flex-wrap justify-center gap-6 mb-12">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-2.5 text-white/80">
                <div className="w-5 h-5 rounded-full bg-gradient-to-r from-primary to-gold flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
                <span className="font-medium">{benefit}</span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <Button 
              asChild
              size="lg" 
              className="px-8 py-6 text-base font-semibold bg-gradient-to-r from-primary to-copper-dark shadow-2xl shadow-primary/50 hover:shadow-primary/70 hover:scale-105 transition-all duration-300 animate-pulse-glow border-2 border-primary/50"
            >
              <a href="/auth">
                Jetzt registrieren
                <ArrowRight className="ml-2 w-5 h-5" />
              </a>
            </Button>
            <Button 
              asChild
              size="lg" 
              variant="outline"
              className="px-8 py-6 text-base font-semibold bg-white/10 border-2 border-white/40 text-white hover:bg-white hover:text-foreground hover:border-white transition-all duration-300 backdrop-blur-md"
            >
              <a href="#features">Mehr erfahren</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
