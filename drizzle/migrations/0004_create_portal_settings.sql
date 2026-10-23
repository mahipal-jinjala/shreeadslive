CREATE TABLE public.portal_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  upi_id text NOT NULL DEFAULT 'mahipaljinjala@oksbi',
  whatsapp_number text NOT NULL DEFAULT '919265106657',
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.portal_settings TO anon;
GRANT SELECT, UPDATE ON public.portal_settings TO authenticated;
GRANT ALL ON public.portal_settings TO service_role;

ALTER TABLE public.portal_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read portal settings"
ON public.portal_settings
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Only admins can update portal settings"
ON public.portal_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.portal_settings (id, upi_id, whatsapp_number)
VALUES (true, 'mahipaljinjala@oksbi', '919265106657');