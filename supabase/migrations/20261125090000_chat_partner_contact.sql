-- Kontaktdaten (Telefon + E-Mail) eines Chat-Partners – nur wenn man mit ihm
-- tatsächlich Nachrichten ausgetauscht hat (für WhatsApp/Outlook-Direktkontakt).
CREATE OR REPLACE FUNCTION public.chat_partner_contact(_partner_id UUID)
RETURNS TABLE (phone TEXT, email TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT pr.phone, au.email
  FROM public.profiles pr
  LEFT JOIN auth.users au ON au.id = pr.user_id
  WHERE pr.user_id = _partner_id
    AND EXISTS (
      SELECT 1 FROM public.messages m
      WHERE (m.sender_id = auth.uid() AND m.receiver_id = _partner_id)
         OR (m.sender_id = _partner_id AND m.receiver_id = auth.uid())
    )
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.chat_partner_contact(UUID) TO authenticated;
