-- Função para reabrir a folha de pagamento
CREATE OR REPLACE FUNCTION public.reopen_payroll(
    p_payroll_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_tenant_id UUID;
    v_payroll RECORD;
BEGIN
    -- 1. Identifica Tenant
    SELECT tenant_id INTO v_tenant_id FROM public.staff WHERE auth_user_id = auth.uid() LIMIT 1;
    IF v_tenant_id IS NULL THEN SELECT id INTO v_tenant_id FROM public.restaurants LIMIT 1; END IF;
    
    -- 2. Busca a folha fechada
    SELECT * INTO v_payroll FROM public.rh_closed_payrolls 
    WHERE id = p_payroll_id AND tenant_id = v_tenant_id;

    IF v_payroll IS NULL THEN
        RAISE EXCEPTION 'Folha não encontrada ou acesso negado.';
    END IF;

    -- 3. Remove os eventos gerados automaticamente (Horas Extras e DSR) para permitir recálculo
    -- Nota: Mantemos eventos manuais, mas removemos os de sistema para evitar duplicação ao fechar novamente
    DELETE FROM public.rh_payroll_events 
    WHERE tenant_id = v_tenant_id 
      AND month = v_payroll.month 
      AND year = v_payroll.year
      AND (description ILIKE '%Hora Extra%' OR description ILIKE '%DSR%');

    -- 4. Remove o registro de fechamento
    DELETE FROM public.rh_closed_payrolls WHERE id = p_payroll_id;

    RETURN jsonb_build_object('success', TRUE, 'message', 'Folha reaberta com sucesso.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
