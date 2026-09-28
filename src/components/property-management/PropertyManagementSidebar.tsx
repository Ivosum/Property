import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  Home,
  Building2,
  Users,
  FileText,
  CreditCard,
  AlertTriangle,
  Settings,
  LogOut,
  ClipboardList,
  Calendar,
  BarChart3,
  Mail,
  Key,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/property-management", icon: <Home className="w-5 h-5" /> },
  { label: "Liegenschaften", href: "/property-management/properties", icon: <Building2 className="w-5 h-5" /> },
  { label: "Mieter", href: "/property-management/tenants", icon: <Users className="w-5 h-5" /> },
  { label: "Mietverträge", href: "/property-management/contracts", icon: <ClipboardList className="w-5 h-5" /> },
  { label: "Finanzen", href: "/property-management/finances", icon: <CreditCard className="w-5 h-5" /> },
  { label: "Mängelmeldungen", href: "/property-management/defects", icon: <AlertTriangle className="w-5 h-5" /> },
  { label: "Dokumente", href: "/property-management/documents", icon: <FileText className="w-5 h-5" /> },
  { label: "Nebenkostenabr.", href: "/property-management/utility-billing", icon: <Calendar className="w-5 h-5" /> },
  { label: "Kommunikation", href: "/property-management/messages", icon: <Mail className="w-5 h-5" /> },
  { label: "Inserierung", href: "/property-management/listings", icon: <Key className="w-5 h-5" /> },
  { label: "Berichte", href: "/property-management/reports", icon: <BarChart3 className="w-5 h-5" /> },
  { label: "Einstellungen", href: "/property-management/settings", icon: <Settings className="w-5 h-5" /> },
];

const PropertyManagementSidebar = () => {
  const location = useLocation();
  const { profile, signOut } = useAuth();

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-4 border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <span className="font-display font-semibold text-sm block">Verwaltung</span>
            <span className="text-xs text-muted-foreground">Property Management</span>
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
            <p className="text-xs text-muted-foreground">Administrator</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {navItems.map((item) => {
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

export default PropertyManagementSidebar;
