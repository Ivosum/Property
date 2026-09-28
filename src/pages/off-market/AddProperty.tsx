import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import OffMarketLayout from "@/components/off-market/OffMarketLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const cantons = [
  "AG", "AI", "AR", "BE", "BL", "BS", "FR", "GE", "GL", "GR",
  "JU", "LU", "NE", "NW", "OW", "SG", "SH", "SO", "SZ", "TG",
  "TI", "UR", "VD", "VS", "ZG", "ZH"
];

const propertyTypes = [
  { value: "wohnung", label: "Wohnung" },
  { value: "haus", label: "Einfamilienhaus" },
  { value: "mehrfamilienhaus", label: "Mehrfamilienhaus" },
  { value: "villa", label: "Villa" },
  { value: "chalet", label: "Chalet" },
  { value: "gewerbe", label: "Gewerbe" },
  { value: "bauland", label: "Bauland / Grundstück" },
];

// Property type specific field configurations
const propertyTypeFields: Record<string, {
  showRooms: boolean;
  showLivingArea: boolean;
  showPlotArea: boolean;
  showBathrooms: boolean;
  showYearBuilt: boolean;
  showFloor: boolean;
  showBalcony: boolean;
  showElevator: boolean;
  showGarage: boolean;
  showUnits: boolean;
  showRentalIncome: boolean;
  showCommercialArea: boolean;
  showBuildableArea: boolean;
  showZoning: boolean;
  showPool: boolean;
  showGardenSize: boolean;
}> = {
  wohnung: {
    showRooms: true,
    showLivingArea: true,
    showPlotArea: false,
    showBathrooms: true,
    showYearBuilt: true,
    showFloor: true,
    showBalcony: true,
    showElevator: true,
    showGarage: true,
    showUnits: false,
    showRentalIncome: false,
    showCommercialArea: false,
    showBuildableArea: false,
    showZoning: false,
    showPool: false,
    showGardenSize: false,
  },
  haus: {
    showRooms: true,
    showLivingArea: true,
    showPlotArea: true,
    showBathrooms: true,
    showYearBuilt: true,
    showFloor: false,
    showBalcony: true,
    showElevator: false,
    showGarage: true,
    showUnits: false,
    showRentalIncome: false,
    showCommercialArea: false,
    showBuildableArea: false,
    showZoning: false,
    showPool: false,
    showGardenSize: true,
  },
  mehrfamilienhaus: {
    showRooms: false,
    showLivingArea: true,
    showPlotArea: true,
    showBathrooms: false,
    showYearBuilt: true,
    showFloor: false,
    showBalcony: false,
    showElevator: true,
    showGarage: true,
    showUnits: true,
    showRentalIncome: true,
    showCommercialArea: false,
    showBuildableArea: false,
    showZoning: false,
    showPool: false,
    showGardenSize: false,
  },
  villa: {
    showRooms: true,
    showLivingArea: true,
    showPlotArea: true,
    showBathrooms: true,
    showYearBuilt: true,
    showFloor: false,
    showBalcony: true,
    showElevator: false,
    showGarage: true,
    showUnits: false,
    showRentalIncome: false,
    showCommercialArea: false,
    showBuildableArea: false,
    showZoning: false,
    showPool: true,
    showGardenSize: true,
  },
  chalet: {
    showRooms: true,
    showLivingArea: true,
    showPlotArea: true,
    showBathrooms: true,
    showYearBuilt: true,
    showFloor: false,
    showBalcony: true,
    showElevator: false,
    showGarage: true,
    showUnits: false,
    showRentalIncome: false,
    showCommercialArea: false,
    showBuildableArea: false,
    showZoning: false,
    showPool: false,
    showGardenSize: true,
  },
  gewerbe: {
    showRooms: false,
    showLivingArea: false,
    showPlotArea: true,
    showBathrooms: true,
    showYearBuilt: true,
    showFloor: true,
    showBalcony: false,
    showElevator: true,
    showGarage: true,
    showUnits: false,
    showRentalIncome: true,
    showCommercialArea: true,
    showBuildableArea: false,
    showZoning: false,
    showPool: false,
    showGardenSize: false,
  },
  bauland: {
    showRooms: false,
    showLivingArea: false,
    showPlotArea: true,
    showBathrooms: false,
    showYearBuilt: false,
    showFloor: false,
    showBalcony: false,
    showElevator: false,
    showGarage: false,
    showUnits: false,
    showRentalIncome: false,
    showCommercialArea: false,
    showBuildableArea: true,
    showZoning: true,
    showPool: false,
    showGardenSize: false,
  },
};

const zoningTypes = [
  "Wohnzone",
  "Kernzone",
  "Gewerbezone",
  "Industriezone",
  "Mischzone",
  "Landwirtschaftszone",
];

const propertyTypeToDb: Record<string, string> = {
  wohnung: "apartment",
  haus: "house",
  mehrfamilienhaus: "house",
  villa: "house",
  chalet: "house",
  gewerbe: "commercial",
  bauland: "land",
};

const AddProperty = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [propertyType, setPropertyType] = useState<string>("");
  const [canton, setCanton] = useState<string>("");
  const [zoning, setZoning] = useState<string>("");
  const [amenities, setAmenities] = useState<Record<string, boolean>>({
    balcony: false,
    elevator: false,
    garage: false,
    pool: false,
  });

  const currentFields = propertyType ? propertyTypeFields[propertyType] : null;

  const toggleAmenity = (key: string, value: boolean) =>
    setAmenities((prev) => ({ ...prev, [key]: value }));

  const getVal = (form: HTMLFormElement, id: string): string => {
    const el = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`);
    return el?.value?.trim() ?? "";
  };
  const getNum = (form: HTMLFormElement, id: string): number | null => {
    const v = getVal(form, id);
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user) {
      toast.error("Nicht angemeldet", { description: "Bitte melden Sie sich erneut an." });
      return;
    }
    if (!propertyType || !currentFields) {
      toast.error("Immobilienart fehlt", { description: "Bitte wählen Sie eine Immobilienart." });
      return;
    }
    if (!canton) {
      toast.error("Kanton fehlt", { description: "Bitte wählen Sie einen Kanton." });
      return;
    }

    const form = e.currentTarget;
    setLoading(true);

    try {
      const extras: string[] = [];
      const floor = getNum(form, "floor");
      const units = getNum(form, "units");
      const rentalIncome = getNum(form, "rental_income");
      const commercialArea = getNum(form, "commercial_area");
      const buildableArea = getNum(form, "buildable_area");
      const gardenSize = getNum(form, "garden_size");

      if (currentFields.showFloor && floor !== null) extras.push(`Stockwerk: ${floor}`);
      if (currentFields.showUnits && units !== null) extras.push(`Wohneinheiten: ${units}`);
      if (currentFields.showRentalIncome && rentalIncome !== null)
        extras.push(`Jährl. Mieteinnahmen: CHF ${rentalIncome.toLocaleString("de-CH")}`);
      if (currentFields.showCommercialArea && commercialArea !== null)
        extras.push(`Nutzfläche: ${commercialArea} m²`);
      if (currentFields.showBuildableArea && buildableArea !== null)
        extras.push(`Nutzbare Baufläche: ${buildableArea} m²`);
      if (currentFields.showGardenSize && gardenSize !== null)
        extras.push(`Gartenfläche: ${gardenSize} m²`);
      if (currentFields.showZoning && zoning) extras.push(`Zonentyp: ${zoning}`);

      const amenityLabels: string[] = [];
      if (currentFields.showBalcony && amenities.balcony) amenityLabels.push("Balkon/Terrasse");
      if (currentFields.showElevator && amenities.elevator) amenityLabels.push("Lift");
      if (currentFields.showGarage && amenities.garage) amenityLabels.push("Garage/Parkplatz");
      if (currentFields.showPool && amenities.pool) amenityLabels.push("Pool");
      if (amenityLabels.length) extras.push(`Ausstattung: ${amenityLabels.join(", ")}`);

      const baseDescription = getVal(form, "description");
      const description = [baseDescription, extras.join("\n")]
        .filter(Boolean)
        .join(baseDescription && extras.length ? "\n\n" : "");

      const price = getNum(form, "price");
      if (price === null) {
        toast.error("Preis fehlt", { description: "Bitte geben Sie einen gültigen Preis an." });
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("properties").insert({
        owner_id: user.id,
        title: getVal(form, "title"),
        description: description || null,
        property_type: propertyTypeToDb[propertyType] ?? "other",
        address: getVal(form, "address"),
        city: getVal(form, "city"),
        canton,
        postal_code: getVal(form, "postal_code"),
        price,
        living_area_sqm: currentFields.showLivingArea ? getNum(form, "living_area") : null,
        plot_area_sqm: currentFields.showPlotArea ? getNum(form, "plot_area") : null,
        rooms: currentFields.showRooms ? getNum(form, "rooms") : null,
        bathrooms: currentFields.showBathrooms ? getNum(form, "bathrooms") : null,
        year_built: currentFields.showYearBuilt ? getNum(form, "year_built") : null,
        status: "draft",
        is_off_market: true,
      });

      if (error) throw new Error(error.message);

      toast.success("Immobilie erstellt", {
        description: "Ihre Immobilie wird geprüft und freigeschaltet.",
      });
      navigate("/off-market/my-properties");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      toast.error("Fehler beim Erstellen", { description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <OffMarketLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold">Neue Immobilie hinzufügen</h1>
          <p className="text-muted-foreground mt-1">
            Listen Sie Ihre Immobilie exklusiv auf der Off-Market Plattform
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Property Type Selection - First */}
          <Card>
            <CardHeader>
              <CardTitle>Immobilienart</CardTitle>
              <CardDescription>Wählen Sie zuerst die Art der Immobilie - die weiteren Felder passen sich entsprechend an</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="type">Art der Immobilie *</Label>
                <Select value={propertyType} onValueChange={setPropertyType} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Bitte wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {propertyTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Show remaining fields only after type is selected */}
          {propertyType && currentFields && (
            <>
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Grundinformationen</CardTitle>
                  <CardDescription>Allgemeine Angaben zur Immobilie</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Titel *</Label>
                    <Input 
                      id="title" 
                      placeholder={
                        propertyType === "wohnung" ? "z.B. Moderne 4.5-Zimmer-Wohnung mit Balkon" :
                        propertyType === "mehrfamilienhaus" ? "z.B. Renditeobjekt mit 6 Wohnungen" :
                        propertyType === "bauland" ? "z.B. Bauland mit Seesicht, erschlossen" :
                        propertyType === "gewerbe" ? "z.B. Bürofläche im Zentrum" :
                        "z.B. Luxusvilla mit Seesicht"
                      } 
                      required 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Beschreibung</Label>
                    <Textarea id="description" placeholder="Beschreiben Sie die Immobilie..." rows={4} />
                  </div>
                </CardContent>
              </Card>

              {/* Location */}
              <Card>
                <CardHeader>
                  <CardTitle>Standort</CardTitle>
                  <CardDescription>Adresse und Lage der Immobilie</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">Adresse *</Label>
                    <Input id="address" placeholder="Strasse und Hausnummer" required />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="postal_code">PLZ *</Label>
                      <Input id="postal_code" placeholder="8000" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">Ort *</Label>
                      <Input id="city" placeholder="Zürich" required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="canton">Kanton *</Label>
                    <Select value={canton} onValueChange={setCanton} required>
                      <SelectTrigger>
              <SelectValue placeholder="Bitte wählen..." />
            </SelectTrigger>
            <SelectContent>
              {cantons.map((canton) => (
                          <SelectItem key={canton} value={canton}>{canton}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Dynamic Details based on property type */}
              <Card>
                <CardHeader>
                  <CardTitle>Details zur {propertyTypes.find(t => t.value === propertyType)?.label}</CardTitle>
                  <CardDescription>Spezifische Angaben je nach Immobilienart</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Price - always shown */}
                  <div className="space-y-2">
                    <Label htmlFor="price">Preis (CHF) *</Label>
                    <Input id="price" type="number" placeholder="1500000" required />
                  </div>

                  {/* Rooms & Living Area Row */}
                  {(currentFields.showRooms || currentFields.showLivingArea) && (
                    <div className="grid grid-cols-2 gap-4">
                      {currentFields.showRooms && (
                        <div className="space-y-2">
                          <Label htmlFor="rooms">Zimmer</Label>
                          <Input id="rooms" type="number" step="0.5" placeholder="4.5" />
                        </div>
                      )}
                      {currentFields.showLivingArea && (
                        <div className="space-y-2">
                          <Label htmlFor="living_area">Wohnfläche (m²)</Label>
                          <Input id="living_area" type="number" placeholder="150" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Plot Area & Buildable Area Row */}
                  {(currentFields.showPlotArea || currentFields.showBuildableArea) && (
                    <div className="grid grid-cols-2 gap-4">
                      {currentFields.showPlotArea && (
                        <div className="space-y-2">
                          <Label htmlFor="plot_area">Grundstücksfläche (m²)</Label>
                          <Input id="plot_area" type="number" placeholder="500" />
                        </div>
                      )}
                      {currentFields.showBuildableArea && (
                        <div className="space-y-2">
                          <Label htmlFor="buildable_area">Nutzbare Baufläche (m²)</Label>
                          <Input id="buildable_area" type="number" placeholder="300" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bathrooms & Year Built Row */}
                  {(currentFields.showBathrooms || currentFields.showYearBuilt) && (
                    <div className="grid grid-cols-2 gap-4">
                      {currentFields.showBathrooms && (
                        <div className="space-y-2">
                          <Label htmlFor="bathrooms">Badezimmer</Label>
                          <Input id="bathrooms" type="number" placeholder="2" />
                        </div>
                      )}
                      {currentFields.showYearBuilt && (
                        <div className="space-y-2">
                          <Label htmlFor="year_built">Baujahr</Label>
                          <Input id="year_built" type="number" placeholder="2020" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Floor & Commercial Area Row (Wohnung / Gewerbe) */}
                  {(currentFields.showFloor || currentFields.showCommercialArea) && (
                    <div className="grid grid-cols-2 gap-4">
                      {currentFields.showFloor && (
                        <div className="space-y-2">
                          <Label htmlFor="floor">Stockwerk</Label>
                          <Input id="floor" type="number" placeholder="3" />
                        </div>
                      )}
                      {currentFields.showCommercialArea && (
                        <div className="space-y-2">
                          <Label htmlFor="commercial_area">Nutzfläche (m²)</Label>
                          <Input id="commercial_area" type="number" placeholder="200" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Multi-family house specific */}
                  {currentFields.showUnits && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="units">Anzahl Wohneinheiten</Label>
                        <Input id="units" type="number" placeholder="6" />
                      </div>
                      {currentFields.showRentalIncome && (
                        <div className="space-y-2">
                          <Label htmlFor="rental_income">Jährliche Mieteinnahmen (CHF)</Label>
                          <Input id="rental_income" type="number" placeholder="120000" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Commercial rental income (without units) */}
                  {currentFields.showRentalIncome && !currentFields.showUnits && (
                    <div className="space-y-2">
                      <Label htmlFor="rental_income">Jährliche Mieteinnahmen (CHF)</Label>
                      <Input id="rental_income" type="number" placeholder="60000" />
                    </div>
                  )}

                  {/* Villa/House specific - Pool & Garden */}
                  {(currentFields.showPool || currentFields.showGardenSize) && (
                    <div className="grid grid-cols-2 gap-4">
                      {currentFields.showGardenSize && (
                        <div className="space-y-2">
                          <Label htmlFor="garden_size">Gartenfläche (m²)</Label>
                          <Input id="garden_size" type="number" placeholder="300" />
                        </div>
                      )}
                      {currentFields.showPool && (
                        <div className="flex items-center space-x-2 pt-6">
                          <Checkbox id="pool" checked={amenities.pool} onCheckedChange={(v) => toggleAmenity("pool", v === true)} />
                          <Label htmlFor="pool" className="font-normal">Pool vorhanden</Label>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Land/Building lot specific - Zoning */}
                  {currentFields.showZoning && (
                    <div className="space-y-2">
                      <Label htmlFor="zoning">Zonentyp</Label>
                      <Select value={zoning} onValueChange={setZoning}>
                        <SelectTrigger>
              <SelectValue placeholder="Bitte wählen..." />
            </SelectTrigger>
            <SelectContent>
              {zoningTypes.map((zone) => (
                            <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Checkboxes for amenities */}
                  <div className="space-y-3 pt-4 border-t">
                    <Label>Ausstattung</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {currentFields.showBalcony && (
                        <div className="flex items-center space-x-2">
                          <Checkbox id="balcony" checked={amenities.balcony} onCheckedChange={(v) => toggleAmenity("balcony", v === true)} />
                          <Label htmlFor="balcony" className="font-normal">Balkon / Terrasse</Label>
                        </div>
                      )}
                      {currentFields.showElevator && (
                        <div className="flex items-center space-x-2">
                          <Checkbox id="elevator" checked={amenities.elevator} onCheckedChange={(v) => toggleAmenity("elevator", v === true)} />
                          <Label htmlFor="elevator" className="font-normal">Lift vorhanden</Label>
                        </div>
                      )}
                      {currentFields.showGarage && (
                        <div className="flex items-center space-x-2">
                          <Checkbox id="garage" checked={amenities.garage} onCheckedChange={(v) => toggleAmenity("garage", v === true)} />
                          <Label htmlFor="garage" className="font-normal">Garage / Parkplatz</Label>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Images */}
              <Card>
                <CardHeader>
                  <CardTitle>Bilder</CardTitle>
                  <CardDescription>Laden Sie Bilder Ihrer Immobilie hoch</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                    <Input type="file" accept="image/*" multiple className="hidden" id="images" />
                    <Label htmlFor="images" className="cursor-pointer">
                      <div className="text-muted-foreground">
                        <p className="mb-2">Klicken Sie hier oder ziehen Sie Bilder hierher</p>
                        <p className="text-sm">Unterstützte Formate: JPG, PNG (max. 10MB)</p>
                      </div>
                    </Label>
                  </div>
                </CardContent>
              </Card>

              {/* Submit */}
              <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                  Abbrechen
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? "Wird erstellt..." : "Immobilie einreichen"}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Nach dem Einreichen wird Ihre Immobilie geprüft und innerhalb von 24 Stunden freigeschaltet.
              </p>
            </>
          )}

          {/* Prompt to select type first */}
          {!propertyType && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>Bitte wählen Sie zuerst eine Immobilienart aus, um die passenden Eingabefelder anzuzeigen.</p>
              </CardContent>
            </Card>
          )}
        </form>
      </div>
    </OffMarketLayout>
  );
};

export default AddProperty;
