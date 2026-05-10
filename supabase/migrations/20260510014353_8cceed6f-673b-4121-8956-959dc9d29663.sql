-- Remove auth requirement: drop user_id columns and open up RLS
ALTER TABLE public.uploads DROP CONSTRAINT IF EXISTS uploads_user_id_fkey;
ALTER TABLE public.trades DROP CONSTRAINT IF EXISTS trades_user_id_fkey;
ALTER TABLE public.uploads ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.trades ALTER COLUMN user_id DROP NOT NULL;

DROP POLICY IF EXISTS "uploads self all" ON public.uploads;
DROP POLICY IF EXISTS "trades self all" ON public.trades;

CREATE POLICY "uploads public all" ON public.uploads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "trades public all" ON public.trades FOR ALL USING (true) WITH CHECK (true);

-- Open up storage policies for reports bucket
DROP POLICY IF EXISTS "reports read own" ON storage.objects;
DROP POLICY IF EXISTS "reports insert own" ON storage.objects;
DROP POLICY IF EXISTS "reports update own" ON storage.objects;
DROP POLICY IF EXISTS "reports delete own" ON storage.objects;

CREATE POLICY "reports read public" ON storage.objects FOR SELECT USING (bucket_id = 'reports');
CREATE POLICY "reports insert public" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'reports');
CREATE POLICY "reports update public" ON storage.objects FOR UPDATE USING (bucket_id = 'reports');
CREATE POLICY "reports delete public" ON storage.objects FOR DELETE USING (bucket_id = 'reports');