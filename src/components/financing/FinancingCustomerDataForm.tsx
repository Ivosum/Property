import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { User, Home, Save, Phone, Mail, Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface CustomerData {
  // Personal info
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  companyName: string;
  // Property info
  propertyAddress: string;
  propertyCity: string;
  propertyCanton: string;
  propertyType: string;
  // Financial info
  annualIncome: number | null;
  employmentType: string;
  employer: string;
  // Notes
  notes: string;
}

interface FinancingCustomerDataFormProps {
  requestId: string;
  initialData?: Partial<CustomerData & {
    property_address?: string;
    property_city?: string;
    property_canton?: string;
    property_type?: string;
    annual_income?: number;
  }>;
  disabled?: boolean;
  onSave?: () => void;
}

const cantons = [
  "AG", "AI", "AR", "BE", "BL", "BS", "FR", "GE", "GL", "GR",
  "JU", "LU", "NE", "NW", "OW", "SG", "SH", "SO", "SZ", "TG",
  "TI", "UR", "VD", "VS", "ZG", "ZH"
];

const propertyTypes = [
  { value: "apartment", label: "Eigentumswohnung" },
  { value: "house", label: "Einfamilienhaus" },
  { value: "multi_family", label: "Mehrfamilienhaus" },
  { value: "land", label: "Bauland" },
  { value: "commercial", label: "Gewerbeimmobilie" },
];

const employmentTypes = [
  { value: "employed", label: "Angestellt" },
  { value: "self_employed", label: "Selbständig" },
  { value: "retired", label: "Pensioniert" },
  { value: "other", label: "Sonstiges" },
];

const FinancingCustomerDataForm = ({ 
  requestId, 
  initialData, 
  disabled = false,
  onSave 
}: FinancingCustomerDataFormProps) => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<CustomerData>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    companyName: "",
    propertyAddress: "",
    propertyCity: "",
    propertyCanton: "",
    propertyType: "",
    annualIncome: null,
    employmentType: "",
    employer: "",
    notes: "",
  });

  // Initialize form with profile and request data
  useEffect(() => {
    if (profile || initialData) {
      setFormData({
        firstName: profile?.first_name || "",
        lastName: profile?.last_name || "",
        phone: profile?.phone || "",
        email: user?.email || "",
        companyName: profile?.company_name || "",
        propertyAddress: initialData?.property_address || "",
        propertyCity: initialData?.property_city || "",
        propertyCanton: initialData?.property_canton || "",
        propertyType: initialData?.property_type || "",
        annualIncome: initialData?.annual_income || null,
        employmentType: "",
        employer: "",
        notes: initialData?.notes || "",
      });
    }
  }, [profile, initialData, user]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          company_name: formData.companyName,
        })
        .eq("user_id", user!.id);

      if (profileError) throw profileError;

      // Update financing request
      const { error: requestError } = await supabase
        .from("financing_requests")
        .update({
          property_address: formData.propertyAddress,
          property_city: formData.propertyCity,
          property_canton: formData.propertyCanton,
          property_type: formData.propertyType,
          annual_income: formData.annualIncome,
          notes: formData.notes,
        })
        .eq("id", requestId);

      if (requestError) throw requestError;
    },
    onSuccess: () => {
      toast.success("Daten gespeichert");
      queryClient.invalidateQueries({ queryKey: ["financing-request", requestId] });
      onSave?.();
    },
    onError: () => {
      toast.error("Fehler beim Speichern");
    },
  });

  const handleChange = (field: keyof CustomerData, value: string | number | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Persönliche Angaben
          </CardTitle>
          <CardDescription>
            Ihre Kontaktdaten für die Finanzierungsanfrage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Vorname *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleChange("firstName", e.target.value)}
                placeholder="Max"
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nachname *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleChange("lastName", e.target.value)}
                placeholder="Muster"
                disabled={disabled}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  className="pl-9"
                  disabled
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="+41 79 123 45 67"
                  className="pl-9"
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyName">Firma (optional)</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => handleChange("companyName", e.target.value)}
                placeholder="Musterfirma AG"
                className="pl-9"
                disabled={disabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Property Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="w-5 h-5" />
            Objektinformationen
          </CardTitle>
          <CardDescription>
            Angaben zur zu finanzierenden Immobilie
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="propertyType">Objektart *</Label>
            <Select 
              value={formData.propertyType} 
              onValueChange={(v) => handleChange("propertyType", v)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Objektart auswählen" />
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
          <div className="space-y-2">
            <Label htmlFor="propertyAddress">Adresse *</Label>
            <Input
              id="propertyAddress"
              value={formData.propertyAddress}
              onChange={(e) => handleChange("propertyAddress", e.target.value)}
              placeholder="Musterstrasse 123"
              disabled={disabled}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="propertyCity">Ort *</Label>
              <Input
                id="propertyCity"
                value={formData.propertyCity}
                onChange={(e) => handleChange("propertyCity", e.target.value)}
                placeholder="Zürich"
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="propertyCanton">Kanton *</Label>
              <Select 
                value={formData.propertyCanton} 
                onValueChange={(v) => handleChange("propertyCanton", v)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kanton" />
                </SelectTrigger>
                <SelectContent>
                  {cantons.map((canton) => (
                    <SelectItem key={canton} value={canton}>
                      {canton}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Information */}
      <Card>
        <CardHeader>
          <CardTitle>Finanzielle Angaben</CardTitle>
          <CardDescription>
            Informationen zu Ihrem Einkommen und Beschäftigung
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="annualIncome">Jährliches Bruttoeinkommen (CHF) *</Label>
              <Input
                id="annualIncome"
                type="number"
                value={formData.annualIncome || ""}
                onChange={(e) => handleChange("annualIncome", e.target.value ? Number(e.target.value) : null)}
                placeholder="120000"
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employmentType">Beschäftigungsart</Label>
              <Select 
                value={formData.employmentType} 
                onValueChange={(v) => handleChange("employmentType", v)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Beschäftigungsart" />
                </SelectTrigger>
                <SelectContent>
                  {employmentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="employer">Arbeitgeber</Label>
            <Input
              id="employer"
              value={formData.employer}
              onChange={(e) => handleChange("employer", e.target.value)}
              placeholder="Muster AG"
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Additional Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Zusätzliche Angaben</CardTitle>
          <CardDescription>
            Weitere Informationen oder Anmerkungen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            placeholder="z.B. Besondere Umstände, Fragen, etc."
            rows={4}
            disabled={disabled}
          />
        </CardContent>
      </Card>

      {/* Save Button */}
      {!disabled && (
        <Button 
          onClick={() => saveMutation.mutate()} 
          className="w-full"
          disabled={saveMutation.isPending}
        >
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? "Wird gespeichert..." : "Änderungen speichern"}
        </Button>
      )}
    </div>
  );
};

export default FinancingCustomerDataForm;
