-- Test-Seed: 2 Liegenschaften mit je 12 Wohnungen + 12 Parkplätzen + 12 Keller
-- und 12 Mietern mit aktiven Verträgen und Mietzins-Zahlungen.
-- Idempotent genug für eine Testumgebung: legt frische Datensätze an.
DO $$
DECLARE
  v_prop   UUID;
  v_unit   UUID;
  v_tenant UUID;
  v_contract UUID;
  i        INTEGER;
  m        INTEGER;
  v_floor  TEXT;
  v_rent   NUMERIC;
  v_nk     NUMERIC;
  v_due    DATE;
  v_status payment_status;
  props    JSONB := '[
    {"name":"Wohnpark Seefeld","address":"Seefeldstrasse 112","city":"Zürich","plz":"8008","canton":"ZH"},
    {"name":"Residenz Lindenhof","address":"Lindenweg 7","city":"Luzern","plz":"6003","canton":"LU"}
  ]';
  p        JSONB;
  firstnames TEXT[] := ARRAY['Hans','Petra','Marco','Sandra','Thomas','Nicole','Daniel','Laura','Stefan','Andrea','Michael','Claudia'];
  lastnames  TEXT[] := ARRAY['Müller','Meier','Schmid','Keller','Weber','Huber','Steiner','Baumann','Graf','Frei','Suter','Moser'];
BEGIN
FOR p IN SELECT * FROM jsonb_array_elements(props)
LOOP
  INSERT INTO public.pm_properties (name, address, city, postal_code, canton, property_type, year_built, total_units)
  VALUES (p->>'name', p->>'address', p->>'city', p->>'plz', p->>'canton', 'Mehrfamilienhaus', 1998, 12)
  RETURNING id INTO v_prop;

  FOR i IN 1..12 LOOP
    -- Stockwerk: EG für 1-2, dann 1.OG..5.OG je 2 Wohnungen
    v_floor := CASE
      WHEN i <= 2 THEN 'EG'
      ELSE ((i-1)/2)::text || '.OG'
    END;
    v_rent := 1400 + (i * 50);
    v_nk   := 220 + (i * 5);

    -- Wohnung
    INSERT INTO public.pm_units (property_id, unit_number, floor_label, unit_type, floor, rooms, living_area_sqm, base_rent, utilities_advance, status)
    VALUES (v_prop, 'TOP' || i, v_floor, 'wohnung', GREATEST(0,(i-1)/2), 2.5 + ((i % 3) * 0.5), 60 + i*3, v_rent, v_nk, 'occupied')
    RETURNING id INTO v_unit;

    -- Mieter
    INSERT INTO public.pm_tenants (first_name, last_name, email, phone)
    VALUES (firstnames[i], lastnames[i],
            lower(firstnames[i] || '.' || lastnames[i]) || '@example.ch',
            '+41 79 ' || (100 + i) || ' ' || (10 + i) || ' ' || (20 + i))
    RETURNING id INTO v_tenant;

    -- Vertrag (aktiv, unbefristet, Start vor 10 Monaten)
    INSERT INTO public.pm_contracts (unit_id, tenant_id, contract_number, start_date, base_rent, utilities_advance, deposit_amount, deposit_paid, status)
    VALUES (v_unit, v_tenant, 'V-' || substr(v_prop::text,1,4) || '-' || i,
            (CURRENT_DATE - INTERVAL '10 months')::date, v_rent, v_nk, v_rent * 2, true, 'active')
    RETURNING id INTO v_contract;

    -- Mietzins-Zahlungen der letzten 6 Monate (ältere bezahlt, aktueller teils offen)
    FOR m IN 0..5 LOOP
      v_due := (date_trunc('month', CURRENT_DATE) - (m || ' months')::interval)::date;
      -- die meisten bezahlt; bei 2 Mietern der laufende Monat offen/überfällig
      v_status := CASE
        WHEN m = 0 AND i IN (4, 9) THEN 'overdue'::payment_status
        WHEN m = 0 AND i IN (5, 11) THEN 'pending'::payment_status
        ELSE 'paid'::payment_status
      END;
      INSERT INTO public.pm_payments (contract_id, tenant_id, amount, payment_type, due_date, paid_date, status, reference)
      VALUES (v_contract, v_tenant, v_rent + v_nk, 'rent', v_due,
              CASE WHEN v_status = 'paid' THEN v_due + 2 ELSE NULL END,
              v_status,
              '21 00000 00000 ' || lpad(i::text,5,'0') || ' ' || to_char(v_due,'YYYYMM'));
    END LOOP;

    -- Parkplatz (UG) zur Wohnung
    INSERT INTO public.pm_units (property_id, unit_number, floor_label, unit_type, base_rent, utilities_advance, status, parent_unit_id)
    VALUES (v_prop, 'PP ' || i, 'UG', 'garage', 120, 0, 'occupied', v_unit);

    -- Keller (UG) zur Wohnung
    INSERT INTO public.pm_units (property_id, unit_number, floor_label, unit_type, base_rent, utilities_advance, status, parent_unit_id)
    VALUES (v_prop, 'Keller ' || i, 'UG', 'keller', 0, 0, 'occupied', v_unit);
  END LOOP;

  -- total_units aktualisieren (12 Wohnungen zählen als Hauptnutzung)
  UPDATE public.pm_properties SET total_units = 12 WHERE id = v_prop;
END LOOP;
END $$;

-- Kurzkontrolle
SELECT
  (SELECT count(*) FROM pm_properties) AS properties,
  (SELECT count(*) FROM pm_units WHERE unit_type='wohnung') AS wohnungen,
  (SELECT count(*) FROM pm_units WHERE unit_type='garage') AS parkplaetze,
  (SELECT count(*) FROM pm_units WHERE unit_type='keller') AS keller,
  (SELECT count(*) FROM pm_tenants) AS mieter,
  (SELECT count(*) FROM pm_contracts WHERE status='active') AS vertraege,
  (SELECT count(*) FROM pm_payments) AS zahlungen;
