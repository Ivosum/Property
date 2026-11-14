import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { extractReceipt } from "@/lib/receiptOcr";
import { createEntry, formatCHF, type Account, type JournalLine } from "@/lib/accounting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Upload, Loader2, ScanLine, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  propertyId: string;
  accounts: Account[];
  onBooked: () => void;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

const ReceiptUpload = ({ propertyId, accounts, onBooked }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [booking, setBooking] = useState(false);

  // Felder (nach OCR vorausgefüllt, editierbar)
  const [vendor, setVendor] = useState("");
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState("");
  const [expenseAcc, setExpenseAcc] = useState("");
  const [payAcc, setPayAcc] = useState("");

  // sinnvolle Default-Konten vorwählen
  const defaultExpense = accounts.find((a) => a.code === "6400");
  const defaultPay = accounts.find((a) => a.code === "1020");

  const expenseAccounts = accounts.filter((a) => a.type === "expense");
  const payAccounts = accounts.filter((a) => a.type === "asset" || a.type === "liability");

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setFile(f);
    setExpenseAcc(defaultExpense?.id ?? "");
    setPayAcc(defaultPay?.id ?? "");

    // OCR nur für Bilder (PDF-OCR ist im Browser unzuverlässig)
    if (f.type.startsWith("image/")) {
      setScanning(true);
      setProgress(0);
      try {
        const res = await extractReceipt(f, setProgress);
        if (res.vendor) setVendor(res.vendor);
        if (res.date) setDate(res.date);
        if (res.amount) setAmount(res.amount.toFixed(2));
        toast.success("Beleg ausgelesen – bitte prüfen");
      } catch {
        toast.message("Automatische Erkennung nicht möglich – bitte manuell erfassen");
      } finally {
        setScanning(false);
      }
    } else {
      toast.message("PDF hochgeladen – bitte Felder manuell erfassen");
    }
  };

  const book = async () => {
    const amt = Number(amount);
    if (!file) return toast.error("Bitte einen Beleg wählen.");
    if (!amt || amt <= 0) return toast.error("Bitte einen gültigen Betrag angeben.");
    if (!expenseAcc || !payAcc) return toast.error("Bitte Aufwands- und Zahlungskonto wählen.");

    setBooking(true);
    try {
      // 1) Beleg in Storage ablegen
      const ext = file.name.split(".").pop() || "dat";
      const path = `${propertyId}/belege/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("pm-documents").upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (upErr) throw upErr;

      // 2) pm_documents-Eintrag
      const { data: authData } = await supabase.auth.getUser();
      const docName = vendor ? `Beleg ${vendor} ${date}` : `Beleg ${date}`;
      const { data: doc } = await supabase
        .from("pm_documents")
        .insert({
          name: docName,
          document_type: "receipt",
          file_url: path,
          file_size: file.size,
          property_id: propertyId,
          uploaded_by: authData?.user?.id ?? null,
        })
        .select("id")
        .single();

      // 3) Buchung: Soll Aufwand / Haben Zahlungskonto, mit Beleg verknüpft
      const lines: JournalLine[] = [
        { account_id: expenseAcc, debit: amt, credit: 0, line_text: vendor || null },
        { account_id: payAcc, debit: 0, credit: amt },
      ];
      await createEntry({
        property_id: propertyId,
        entry_date: date,
        description: vendor ? `Rechnung ${vendor}` : "Beleg",
        reference: null,
        document_id: doc?.id ?? null,
        source: "receipt",
        lines,
      });

      toast.success("Beleg abgelegt und verbucht");
      onBooked();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fehler beim Verbuchen");
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="space-y-4">
      <input ref={fileRef} type="file" accept="image/*,application/pdf" capture="environment" className="hidden" onChange={onPick} />

      {!file ? (
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-20 flex-col" onClick={() => fileRef.current?.click()}>
            <Camera className="w-6 h-6 mb-1" />
            Scannen / Foto
          </Button>
          <Button variant="outline" className="h-20 flex-col" onClick={() => fileRef.current?.click()}>
            <Upload className="w-6 h-6 mb-1" />
            Datei wählen
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm p-3 bg-secondary/40 rounded-lg">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <span className="truncate flex-1">{file.name}</span>
          <Button variant="ghost" size="sm" onClick={() => { setFile(null); setVendor(""); setAmount(""); }}>
            Ändern
          </Button>
        </div>
      )}

      {scanning && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ScanLine className="w-4 h-4 animate-pulse" />
          Beleg wird ausgelesen... {progress}%
        </div>
      )}

      {file && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Lieferant</Label>
              <Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="z.B. Gebäudeversicherung" />
            </div>
            <div className="space-y-2">
              <Label>Datum</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Betrag (CHF)</Label>
            <Input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Aufwandskonto</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={expenseAcc} onChange={(e) => setExpenseAcc(e.target.value)}>
                <option value="">Wählen...</option>
                {expenseAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Bezahlt ab</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={payAcc} onChange={(e) => setPayAcc(e.target.value)}>
                <option value="">Wählen...</option>
                {payAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
              </select>
            </div>
          </div>
          {amount && Number(amount) > 0 && (
            <p className="text-xs text-muted-foreground">
              Bucht {formatCHF(Number(amount))}: Soll Aufwand / Haben Zahlungskonto. Beleg wird abgelegt und verknüpft.
            </p>
          )}
          <Button className="w-full" onClick={book} disabled={booking || scanning}>
            {booking && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Ablegen & verbuchen
          </Button>
        </>
      )}
    </div>
  );
};

export default ReceiptUpload;
