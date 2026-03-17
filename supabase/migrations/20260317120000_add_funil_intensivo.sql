-- Add 'funil_intensivo' as a valid SDR type
ALTER TABLE public.sdrs DROP CONSTRAINT IF EXISTS sdrs_type_check;
ALTER TABLE public.sdrs ADD CONSTRAINT sdrs_type_check CHECK (type IN ('sdr', 'social_selling', 'funil_intensivo'));

-- Insert SDR Carlos for Funil Intensivo
INSERT INTO public.sdrs (name, type)
VALUES ('Carlos', 'funil_intensivo');
