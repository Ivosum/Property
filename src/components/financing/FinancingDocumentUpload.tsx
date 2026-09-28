import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, FileText, Trash2, Download, CheckCircle, 
  File, Image, FileSpreadsheet, AlertCircle 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface FinancingDocumentUploadProps {
  requestId: string;
  disabled?: boolean;
}

const documentTypes = [
  { value: "lohnausweis", label: "Lohnausweis", required: true },
  { value: "steuererklaerung", label: "Steuererklärung", required: true },
  { value: "ausweis", label: "Ausweis/Pass", required: true },
  { value: "kaufvertrag", label: "Kaufvertrag (Entwurf)", required: false },
  { value: "eigenkapitalnachweis", label: "Eigenkapitalnachweis", required: true },
  { value: "pensionskasse", label: "PK-Ausweis (2. Säule)", required: false },
  { value: "saeule3a", label: "Säule 3a Nachweis", required: false },
  { value: "betreibungsauszug", label: "Betreibungsauszug", required: true },
  { value: "sonstiges", label: "Sonstiges Dokument", required: false },
];

const FinancingDocumentUpload = ({ requestId, disabled = false }: FinancingDocumentUploadProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("lohnausweis");

  // Fetch existing documents
  const { data: documents, isLoading } = useQuery({
    queryKey: ["financing-documents", requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financing_documents")
        .select("*")
        .eq("financing_request_id", requestId)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!requestId && !!user,
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Die Datei ist zu gross (max. 10 MB)");
      return;
    }

    // Check file type
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast.error("Ungültiger Dateityp. Erlaubt: PDF, Bilder, Word, Excel");
      return;
    }

    setUploading(true);

    try {
      // Generate unique file name
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${requestId}/${selectedType}_${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("financing-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("financing-documents")
        .getPublicUrl(fileName);

      // Save document record
      const { error: insertError } = await supabase
        .from("financing_documents")
        .insert({
          financing_request_id: requestId,
          user_id: user.id,
          document_type: selectedType,
          file_name: file.name,
          file_url: fileName, // Store path, not full URL
          file_size: file.size,
        });

      if (insertError) throw insertError;

      toast.success("Dokument hochgeladen");
      queryClient.invalidateQueries({ queryKey: ["financing-documents", requestId] });
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Fehler beim Hochladen");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (documentId: string, filePath: string) => {
    try {
      // Delete from storage
      await supabase.storage
        .from("financing-documents")
        .remove([filePath]);

      // Delete record
      const { error } = await supabase
        .from("financing_documents")
        .delete()
        .eq("id", documentId);

      if (error) throw error;

      toast.success("Dokument gelöscht");
      queryClient.invalidateQueries({ queryKey: ["financing-documents", requestId] });
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Fehler beim Löschen");
    }
  };

  const getDocumentIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return <FileText className="w-5 h-5 text-red-500" />;
    if (["jpg", "jpeg", "png", "webp"].includes(ext || "")) return <Image className="w-5 h-5 text-blue-500" />;
    if (["xls", "xlsx"].includes(ext || "")) return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
    return <File className="w-5 h-5 text-muted-foreground" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDocumentTypeLabel = (type: string) => {
    return documentTypes.find((t) => t.value === type)?.label || type;
  };

  // Check which required documents are missing
  const uploadedTypes = documents?.map((d) => d.document_type) || [];
  const missingRequired = documentTypes
    .filter((t) => t.required && !uploadedTypes.includes(t.value));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Dokumente
        </CardTitle>
        <CardDescription>
          Laden Sie die erforderlichen Dokumente für Ihre Finanzierungsanfrage hoch
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Required Documents Checklist */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-3">Erforderliche Dokumente</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {documentTypes.filter((t) => t.required).map((type) => {
              const isUploaded = uploadedTypes.includes(type.value);
              return (
                <div key={type.value} className="flex items-center gap-2 text-sm">
                  {isUploaded ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                  )}
                  <span className={isUploaded ? "text-muted-foreground" : ""}>
                    {type.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upload Section */}
        {!disabled && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {documentTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex-1"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                    Wird hochgeladen...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Dokument auswählen
                  </>
                )}
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Erlaubte Formate: PDF, Bilder (JPG, PNG), Word, Excel. Max. 10 MB pro Datei.
            </p>
          </div>
        )}

        {/* Uploaded Documents List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : documents && documents.length > 0 ? (
          <div className="space-y-2">
            <h4 className="font-medium">Hochgeladene Dokumente</h4>
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50"
              >
                {getDocumentIcon(doc.file_name)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{doc.file_name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {getDocumentTypeLabel(doc.document_type)}
                    </Badge>
                    <span>{formatFileSize(doc.file_size)}</span>
                    <span>•</span>
                    <span>{new Date(doc.uploaded_at).toLocaleDateString("de-CH")}</span>
                  </div>
                </div>
                {!disabled && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(doc.id, doc.file_url)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Noch keine Dokumente hochgeladen</p>
          </div>
        )}

        {/* Warning for missing required documents */}
        {missingRequired.length > 0 && !disabled && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 mt-0.5" />
              <div>
                <p className="font-medium">Fehlende Pflichtdokumente</p>
                <p className="text-sm">
                  Bitte laden Sie folgende Dokumente hoch: {missingRequired.map((t) => t.label).join(", ")}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FinancingDocumentUpload;
