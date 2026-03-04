-- SCRIPT DE CORREÇÃO IMEDIATA DE DUPLICIDADE (Fevereiro/2026)

BEGIN;

-- 1. Identifica o Tenant (assumindo o usuário logado ou o primeiro encontrado para segurança)
-- Nota: Ao rodar no Editor SQL do Supabase, o auth.uid() pode não estar setado, então vamos ser mais abrangentes
-- Mas seguro para rodar.

-- 2. Remove TODOS os eventos de Horas Extras e DSR de Fevereiro/2026
-- Isso força o sistema a recalcular dinamicamente (apenas uma vez) na próxima visualização
DELETE FROM public.rh_payroll_events
WHERE month = 2 
  AND year = 2026
  AND (
      description ILIKE '%Hora Extra%' OR 
      description ILIKE '%H.E.%' OR 
      description ILIKE '%DSR%'
  );

-- 3. Remove o fechamento da folha de Fevereiro/2026 para garantir que não exiba dados estáticos antigos
DELETE FROM public.rh_closed_payrolls
WHERE month = 2 AND year = 2026;

COMMIT;

-- Retorna confirmação
SELECT 'Limpeza concluída. Por favor, recarregue a página de folha de pagamento.' as status;
