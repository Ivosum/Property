import { Link } from "react-router-dom";
import { Mail, Phone, MapPin } from "lucide-react";
import logo from "@/assets/logo.png";

const footerLinks = {
  platform: [
    { label: "Features", href: "#features" },
    { label: "Für Verkäufer", href: "/auth" },
    { label: "Für Käufer", href: "/auth" },
    { label: "Für Makler", href: "/auth" },
  ],
  company: [
    { label: "Über uns", href: "#" },
    { label: "Karriere", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Presse", href: "#" },
  ],
  legal: [
    { label: "Datenschutz", href: "#" },
    { label: "AGB", href: "#" },
    { label: "Impressum", href: "#" },
    { label: "Cookies", href: "#" },
  ],
};

const socialLinks = [
  { label: "LinkedIn", href: "#" },
  { label: "Instagram", href: "#" },
  { label: "Twitter", href: "#" },
];

const Footer = () => {
  return (
    <footer 
      id="contact" 
      className="py-16 bg-foreground text-white/80 relative overflow-hidden"
      role="contentinfo"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className="relative max-w-[1200px] mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-5">
              <img src={logo} alt="Property Network Logo" className="h-10 w-auto" />
              <span className="font-display font-bold text-xl text-white">
                Property Network
              </span>
            </Link>
            <p className="text-white/60 text-sm leading-relaxed mb-6 max-w-sm">
              Ihre All-in-One Lösung für Immobilien in der Schweiz – Vermittlung, Verwaltung und Finanzierung unter einem Dach.
            </p>
            
            {/* Contact info */}
            <div className="space-y-3">
              <a href="mailto:info@propertynetwork.ch" className="flex items-center gap-3 text-sm hover:text-primary transition-colors">
                <Mail className="w-4 h-4 text-primary" />
                info@propertynetwork.ch
              </a>
              <a href="tel:+41441234567" className="flex items-center gap-3 text-sm hover:text-primary transition-colors">
                <Phone className="w-4 h-4 text-primary" />
                +41 44 123 45 67
              </a>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-primary" />
                Zürich, Schweiz
              </div>
            </div>
          </div>

          {/* Platform Links */}
          <nav aria-label="Plattform Navigation">
            <h4 className="font-semibold text-white mb-4">Plattform</h4>
            <ul className="space-y-3">
              {footerLinks.platform.map((link) => (
                <li key={link.label}>
                  <a 
                    href={link.href} 
                    className="text-white/60 hover:text-primary transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Company Links */}
          <nav aria-label="Unternehmen Navigation">
            <h4 className="font-semibold text-white mb-4">Unternehmen</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <a 
                    href={link.href} 
                    className="text-white/60 hover:text-primary transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Legal Links */}
          <nav aria-label="Rechtliches Navigation">
            <h4 className="font-semibold text-white mb-4">Rechtliches</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <a 
                    href={link.href} 
                    className="text-white/60 hover:text-primary transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-8" />

        {/* Bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/50 text-sm">
            © {new Date().getFullYear()} Property Network. Alle Rechte vorbehalten.
          </p>
          <nav aria-label="Social Media Links" className="flex items-center gap-6">
            {socialLinks.map((link) => (
              <a 
                key={link.label}
                href={link.href} 
                className="text-white/50 hover:text-primary transition-colors text-sm"
                rel="noopener noreferrer"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
