import { ReactNode, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import OffMarketSidebar from "./OffMarketSidebar";
import logo from "@/assets/logo.png";

interface OffMarketLayoutProps {
  children: ReactNode;
}

const OffMarketLayout = ({ children }: OffMarketLayoutProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-background">
      <OffMarketSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 h-14 px-4 bg-card border-b border-border">
          <button onClick={() => setMobileOpen(true)} aria-label="Menü öffnen" className="p-1 -ml-1">
            <Menu className="w-6 h-6" />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Property Network" className="h-7 w-auto" />
            <span className="font-display font-semibold text-sm">Off-Market</span>
          </Link>
        </header>
        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default OffMarketLayout;
