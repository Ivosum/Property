import { ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, Building2 } from "lucide-react";
import PropertyManagementSidebar from "./PropertyManagementSidebar";
import { PlanProvider } from "./PlanContext";

interface PropertyManagementLayoutProps {
  children: ReactNode;
}

const PropertyManagementLayout = ({ children }: PropertyManagementLayoutProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <PlanProvider>
      <div className="flex min-h-screen bg-background">
        <PropertyManagementSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Mobile-Topbar mit Menü-Button (nur < lg) */}
          <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 h-14 px-4 bg-card border-b border-border">
            <button onClick={() => setMobileOpen(true)} aria-label="Menü öffnen" className="p-1 -ml-1">
              <Menu className="w-6 h-6" />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Building2 className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display font-semibold text-sm">Verwaltung</span>
            </Link>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </PlanProvider>
  );
};

export default PropertyManagementLayout;
