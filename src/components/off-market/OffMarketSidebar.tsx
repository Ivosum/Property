import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  Home,
  Building2,
  Search,
  Heart,
  MessageCircle,
  FileText,
  Upload,
  Users,
  Settings,
  Shield,
  BarChart3,
  LogOut,
  Calculator,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/off-market", icon: <Home className="w-5 h-5" />, roles: ["buyer", "seller", "broker", "admin"] },
  { label: "Immobilien", href: "/off-market/properties", icon: <Building2 className="w-5 h-5" />, roles: ["buyer", "broker", "admin"] },
  { label: "Suche", href: "/off-market/search", icon: <Search className="w-5 h-5" />, roles: ["buyer"] },
  { label: "Favoriten", href: "/off-market/favorites", icon: <Heart className="w-5 h-5" />, roles: ["buyer"] },
  { label: "Finanzierung", href: "/off-market/financing", icon: <Calculator className="w-5 h-5" />, roles: ["buyer", "seller"] },
  { label: "Finanzierungsanfragen", href: "/off-market/financing/admin", icon: <Calculator className="w-5 h-5" />, roles: ["broker", "admin"] },
  { label: "Meine Immobilien", href: "/off-market/my-properties", icon: <Building2 className="w-5 h-5" />, roles: ["seller"] },
  { label: "Immobilie hinzufügen", href: "/off-market/add-property", icon: <Upload className="w-5 h-5" />, roles: ["seller"] },
  { label: "Kunden", href: "/off-market/clients", icon: <Users className="w-5 h-5" />, roles: ["broker"] },
  { label: "Nachrichten", href: "/off-market/messages", icon: <MessageCircle className="w-5 h-5" />, roles: ["buyer", "seller", "broker", "admin"] },
  { label: "Dokumente", href: "/off-market/documents", icon: <FileText className="w-5 h-5" />, roles: ["buyer", "seller", "broker", "admin"] },
  { label: "Verifizierung", href: "/off-market/verification", icon: <Shield className="w-5 h-5" />, roles: ["buyer", "seller", "broker"] },
  { label: "CRM", href: "/off-market/crm", icon: <Briefcase className="w-5 h-5" />, roles: ["admin"] },
  { label: "Analysen", href: "/off-market/analytics", icon: <BarChart3 className="w-5 h-5" />, roles: ["admin"] },
  { label: "Benutzerverwaltung", href: "/off-market/users", icon: <Users className="w-5 h-5" />, roles: ["admin"] },
  { label: "Einstellungen", href: "/off-market/settings", icon: <Settings className="w-5 h-5" />, roles: ["buyer", "seller", "broker", "admin"] },
];

const OffMarketSidebar = () => {
  const location = useLocation();
  const { role, profile, signOut } = useAuth();

  const filteredItems = navItems.filter((item) => role && item.roles.includes(role));

  const getRoleLabel = () => {
    switch (role) {
      case "buyer": return "Käufer";
      case "seller": return "Verkäufer";
      case "broker": return "Makler";
      case "admin": return "Administrator";
      default: return "Nutzer";
    }
  };

  const getKycBadge = () => {
    if (!profile) return null;
    
    switch (profile.kyc_status) {
      case "verified":
        return <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Verifiziert</span>;
      case "submitted":
        return <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full">In Prüfung</span>;
      case "rejected":
        return <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">Abgelehnt</span>;
      default:
        return <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Nicht verifiziert</span>;
    }
  };

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-4 border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Property Network Logo" className="h-9 w-auto" />
          <div>
            <span className="font-display font-semibold text-sm block">Off-Market</span>
            <span className="text-xs text-muted-foreground">Property Network</span>
          </div>
        </Link>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="text-primary font-semibold">
              {profile?.first_name?.[0] || "U"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">
              {profile?.first_name} {profile?.last_name}
            </p>
            <p className="text-xs text-muted-foreground">{getRoleLabel()}</p>
          </div>
        </div>
        <div className="mt-2">{getKycBadge()}</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {filteredItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {item.icon}
                  <span className="text-sm">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Sign Out */}
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={signOut}
        >
          <LogOut className="w-5 h-5" />
          <span>Abmelden</span>
        </Button>
      </div>
    </aside>
  );
};

export default OffMarketSidebar;
