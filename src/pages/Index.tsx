import Header from "@/components/Header";
import Hero from "@/components/Hero";
import PlatformAccess from "@/components/PlatformAccess";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import FinancingCalculator from "@/components/FinancingCalculator";
import PricingTeaser from "@/components/PricingTeaser";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <PlatformAccess />
        <FinancingCalculator />
        <PricingTeaser />
        <CTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;