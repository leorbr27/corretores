-- RLS para o formulário público e área administrativa do projeto Corretores.
-- Execute este arquivo uma vez no SQL Editor do Neon, no banco "corretores".

ALTER TABLE public.briefings_corretor ENABLE ROW LEVEL SECURITY;

-- Formulário público: somente INSERT.
-- No Neon Data API, o papel de acesso sem autenticação é "anonymous".
GRANT INSERT ON TABLE public.briefings_corretor TO anonymous;

DROP POLICY IF EXISTS briefings_public_insert ON public.briefings_corretor;
CREATE POLICY briefings_public_insert
ON public.briefings_corretor
FOR INSERT
TO anonymous
WITH CHECK (true);

-- Área administrativa: usuários autenticados podem gerenciar os briefings.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.briefings_corretor TO authenticated;

DROP POLICY IF EXISTS briefings_authenticated_manage ON public.briefings_corretor;
CREATE POLICY briefings_authenticated_manage
ON public.briefings_corretor
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Permissões necessárias para IDs gerados por sequence, se a tabela usar sequence.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anonymous;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
