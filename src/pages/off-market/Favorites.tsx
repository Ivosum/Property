import OffMarketLayout from "@/components/off-market/OffMarketLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Search } from "lucide-react";
import { Link } from "react-router-dom";

const Favorites = () => {
  // Empty state - no favorites yet
  const favorites: any[] = [];

  return (
    <OffMarketLayout>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Favoriten</h1>
        <p className="text-muted-foreground mt-1">
          Ihre gespeicherten Immobilien
        </p>
      </div>

      {favorites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Heart className="w-8 h-8 text-muted-foreground" />
            </div>
            <CardTitle className="text-xl mb-2">Keine Favoriten vorhanden</CardTitle>
            <CardDescription className="text-center max-w-md mb-6">
              Speichern Sie interessante Immobilien, um sie später leicht wiederzufinden.
            </CardDescription>
            <Button asChild>
              <Link to="/off-market/search">
                <Search className="w-4 h-4 mr-2" />
                Immobilien durchsuchen
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Favorites would be displayed here */}
        </div>
      )}
    </OffMarketLayout>
  );
};

export default Favorites;
