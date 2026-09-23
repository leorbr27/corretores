-- Execute once in Neon SQL Editor against database "corretores".
-- This setup keeps public submission possible while restricting read/write
-- access to authenticated administrative users.

ALTER TABLE public.briefings_corretor ENABLE ROW LEVEL SECURITY;

-- Public form: can only create a briefing.
GRANT INSERT ON TABLE public.briefings_corretor TO anon;

DROP POLICY IF EXISTS briefings_public_insert ON public.briefings_corretor;
CREATE POLICY briefings_public_insert
ON public.briefings_corretor
FOR INSERT
TO anon
WITH CHECK (true);

-- Administrative area: authenticated Neon Auth users can manage briefings.
-- After creating the administrator account, disable public sign-up in Neon Auth.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.briefings_corretor TO authenticated;

DROP POLICY IF EXISTS briefings_authenticated_manage ON public.briefings_corretor;
CREATE POLICY briefings_authenticated_manage
ON public.briefings_corretor
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
