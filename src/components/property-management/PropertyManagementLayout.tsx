import { ReactNode } from "react";
import PropertyManagementSidebar from "./PropertyManagementSidebar";

interface PropertyManagementLayoutProps {
  children: ReactNode;
}

const PropertyManagementLayout = ({ children }: PropertyManagementLayoutProps) => {
  return (
    <div className="flex min-h-screen bg-background">
      <PropertyManagementSidebar />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
};

export default PropertyManagementLayout;
