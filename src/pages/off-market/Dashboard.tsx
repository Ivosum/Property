import { useAuth } from "@/contexts/AuthContext";
import OffMarketLayout from "@/components/off-market/OffMarketLayout";
import BuyerDashboard from "@/components/off-market/dashboards/BuyerDashboard";
import SellerDashboard from "@/components/off-market/dashboards/SellerDashboard";
import BrokerDashboard from "@/components/off-market/dashboards/BrokerDashboard";
import AdminDashboard from "@/components/off-market/dashboards/AdminDashboard";

const Dashboard = () => {
  const { role, profile } = useAuth();

  const renderDashboard = () => {
    switch (role) {
      case "buyer":
        return <BuyerDashboard />;
      case "seller":
        return <SellerDashboard />;
      case "broker":
        return <BrokerDashboard />;
      case "admin":
        return <AdminDashboard />;
      default:
        return (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Laden...</p>
          </div>
        );
    }
  };

  return (
    <OffMarketLayout>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">
          Willkommen{profile?.first_name ? `, ${profile.first_name}` : ""}
        </h1>
        <p className="text-muted-foreground mt-1">
          Ihr persönliches Off-Market Dashboard
        </p>
      </div>
      {renderDashboard()}
    </OffMarketLayout>
  );
};

export default Dashboard;
