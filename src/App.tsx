import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import TenantAuth from "./pages/TenantAuth";
import PropertyManagementAuth from "./pages/PropertyManagementAuth";

// Off-Market Routes
import Dashboard from "./pages/off-market/Dashboard";
import Verification from "./pages/off-market/Verification";
import Properties from "./pages/off-market/Properties";
import MyProperties from "./pages/off-market/MyProperties";
import AddProperty from "./pages/off-market/AddProperty";
import Messages from "./pages/off-market/Messages";
import Documents from "./pages/off-market/Documents";
import Settings from "./pages/off-market/Settings";
import Clients from "./pages/off-market/Clients";
import AdminUsers from "./pages/off-market/AdminUsers";
import AdminAnalytics from "./pages/off-market/AdminAnalytics";
import AdminCRM from "./pages/off-market/AdminCRM";
import Search from "./pages/off-market/Search";
import Favorites from "./pages/off-market/Favorites";
import Financing from "./pages/off-market/Financing";
import FinancingRequest from "./pages/off-market/FinancingRequest";
import FinancingAdmin from "./pages/off-market/FinancingAdmin";

// Property Management Routes
import PMDashboard from "./pages/property-management/Dashboard";
import PMProperties from "./pages/property-management/Properties";
import PMTenants from "./pages/property-management/Tenants";
import PMContracts from "./pages/property-management/Contracts";
import PMFinances from "./pages/property-management/Finances";
import PMDefects from "./pages/property-management/Defects";
import PMDocuments from "./pages/property-management/Documents";
import PMUtilityBilling from "./pages/property-management/UtilityBilling";
import PMMessages from "./pages/property-management/Messages";
import PMListings from "./pages/property-management/Listings";
import PMReports from "./pages/property-management/Reports";
import PMSettings from "./pages/property-management/Settings";
import TenantPortal from "./pages/property-management/TenantPortal";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/tenant-auth" element={<TenantAuth />} />
            <Route path="/pm-auth" element={<PropertyManagementAuth />} />
            
            {/* Off-Market Platform Routes */}
            <Route path="/off-market" element={<Dashboard />} />
            <Route path="/off-market/verification" element={<Verification />} />
            <Route path="/off-market/properties" element={<Properties />} />
            <Route path="/off-market/my-properties" element={<MyProperties />} />
            <Route path="/off-market/add-property" element={<AddProperty />} />
            <Route path="/off-market/search" element={<Search />} />
            <Route path="/off-market/favorites" element={<Favorites />} />
            <Route path="/off-market/financing" element={<Financing />} />
            <Route path="/off-market/financing/admin" element={<FinancingAdmin />} />
            <Route path="/off-market/financing/:id" element={<FinancingRequest />} />
            <Route path="/off-market/messages" element={<Messages />} />
            <Route path="/off-market/documents" element={<Documents />} />
            <Route path="/off-market/settings" element={<Settings />} />
            <Route path="/off-market/clients" element={<Clients />} />
            <Route path="/off-market/users" element={<AdminUsers />} />
            <Route path="/off-market/crm" element={<AdminCRM />} />
            <Route path="/off-market/analytics" element={<AdminAnalytics />} />
            
            {/* Property Management Routes */}
            <Route path="/property-management" element={<PMDashboard />} />
            <Route path="/property-management/properties" element={<PMProperties />} />
            <Route path="/property-management/tenants" element={<PMTenants />} />
            <Route path="/property-management/contracts" element={<PMContracts />} />
            <Route path="/property-management/finances" element={<PMFinances />} />
            <Route path="/property-management/defects" element={<PMDefects />} />
            <Route path="/property-management/documents" element={<PMDocuments />} />
            <Route path="/property-management/utility-billing" element={<PMUtilityBilling />} />
            <Route path="/property-management/messages" element={<PMMessages />} />
            <Route path="/property-management/listings" element={<PMListings />} />
            <Route path="/property-management/reports" element={<PMReports />} />
            <Route path="/property-management/settings" element={<PMSettings />} />
            <Route path="/tenant-portal" element={<TenantPortal />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
