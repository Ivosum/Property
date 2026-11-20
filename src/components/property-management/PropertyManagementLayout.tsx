import { ReactNode } from "react";
import PropertyManagementSidebar from "./PropertyManagementSidebar";
import { PlanProvider } from "./PlanContext";

interface PropertyManagementLayoutProps {
  children: ReactNode;
}

const PropertyManagementLayout = ({ children }: PropertyManagementLayoutProps) => {
  return (
    <PlanProvider>
      <div className="flex min-h-screen bg-background">
        <PropertyManagementSidebar />
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </PlanProvider>
  );
};

export default PropertyManagementLayout;
