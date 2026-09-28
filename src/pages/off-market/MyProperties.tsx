import OffMarketLayout from "@/components/off-market/OffMarketLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plus, Building2 } from "lucide-react";

const MyProperties = () => {
  return (
    <OffMarketLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Meine Immobilien</h1>
          <p className="text-muted-foreground mt-1">
            Verwalten Sie Ihre gelisteten Objekte
          </p>
        </div>
        <Button asChild>
          <Link to="/off-market/add-property">
            <Plus className="w-4 h-4 mr-2" />
            Neue Immobilie
          </Link>
        </Button>
      </div>

      {/* Empty State */}
      <Card>
        <CardContent className="flex flex-col items-center py-16">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl mb-2">Keine Immobilien vorhanden</CardTitle>
          <CardDescription className="text-center max-w-md mb-6">
            Sie haben noch keine Immobilien gelistet. Fügen Sie Ihre erste Immobilie hinzu, um sie exklusiven Käufern anzubieten.
          </CardDescription>
          <Button asChild>
            <Link to="/off-market/add-property">
              <Plus className="w-4 h-4 mr-2" />
              Erste Immobilie hinzufügen
            </Link>
          </Button>
        </CardContent>
      </Card>
    </OffMarketLayout>
  );
};

export default MyProperties;
