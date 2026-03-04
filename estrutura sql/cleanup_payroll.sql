-- Script de Limpeza de Duplicatas e Correção Definitiva

-- 1. Função para limpar eventos de horas extras duplicados ou travados
CREATE OR REPLACE FUNCTION public.cleanup_payroll_overtime(
    p_month INTEGER,
    p_year INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_tenant_id UUID;
    v_count INTEGER;
BEGIN
    -- Identifica Tenant
    SELECT tenant_id INTO v_tenant_id FROM public.staff WHERE auth_user_id = auth.uid() LIMIT 1;
    IF v_tenant_id IS NULL THEN SELECT id INTO v_tenant_id FROM public.restaurants LIMIT 1; END IF;

    -- Deleta eventos de Horas Extras e DSR da tabela de eventos
    -- Fazemos um JOIN para garantir que estamos pegando pelo NOME do tipo de evento, não só pela descrição
    DELETE FROM public.rh_payroll_events pe
    USING public.rh_event_types et
    WHERE pe.type::uuid = et.id
      AND pe.tenant_id = v_tenant_id
      AND pe.month = p_month
      AND pe.year = p_year
      AND (
          et.name ILIKE '%Hora Extra%' OR 
          et.name ILIKE '%H.E.%' OR 
          et.name ILIKE '%DSR%' OR
          pe.description ILIKE '%Hora Extra%' OR
          pe.description ILIKE '%H.E.%' OR
          pe.description ILIKE '%DSR%'
      );

    GET DIAGNOSTICS v_count = ROW_COUNT;

    -- Também remove o fechamento se existir, para garantir que o sistema volte para "Prévia"
    DELETE FROM public.rh_closed_payrolls 
    WHERE tenant_id = v_tenant_id AND month = p_month AND year = p_year;

    RETURN jsonb_build_object('success', TRUE, 'deleted_count', v_count, 'message', 'Limpeza realizada com sucesso.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Atualiza a função reopen_payroll para usar a mesma lógica robusta
CREATE OR REPLACE FUNCTION public.reopen_payroll(
    p_payroll_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_tenant_id UUID;
    v_payroll RECORD;
BEGIN
    -- Identifica Tenant
    SELECT tenant_id INTO v_tenant_id FROM public.staff WHERE auth_user_id = auth.uid() LIMIT 1;
    IF v_tenant_id IS NULL THEN SELECT id INTO v_tenant_id FROM public.restaurants LIMIT 1; END IF;
    
    -- Busca a folha fechada
    SELECT * INTO v_payroll FROM public.rh_closed_payrolls 
    WHERE id = p_payroll_id AND tenant_id = v_tenant_id;

    IF v_payroll IS NULL THEN
        RAISE EXCEPTION 'Folha não encontrada ou acesso negado.';
    END IF;

    -- Remove eventos de Horas Extras e DSR (JOIN com tipos para garantir)
    DELETE FROM public.rh_payroll_events pe
    USING public.rh_event_types et
    WHERE pe.type::uuid = et.id
      AND pe.tenant_id = v_tenant_id
      AND pe.month = v_payroll.month 
      AND pe.year = v_payroll.year
      AND (
          et.name ILIKE '%Hora Extra%' OR 
          et.name ILIKE '%H.E.%' OR 
          et.name ILIKE '%DSR%' OR
          pe.description ILIKE '%Hora Extra%' OR
          pe.description ILIKE '%H.E.%' OR
          pe.description ILIKE '%DSR%'
      );

    -- Remove o registro de fechamento
    DELETE FROM public.rh_closed_payrolls WHERE id = p_payroll_id;

    RETURN jsonb_build_object('success', TRUE, 'message', 'Folha reaberta e limpa com sucesso.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
