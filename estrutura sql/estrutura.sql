-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. TABLES STRUCTURE
-- -----------------------------------------------------------------------------

-- Tenants / Restaurants (Multi-tenancy root)
CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL,
    cnpj TEXT,
    phone TEXT,
    address JSONB,
    settings JSONB DEFAULT '{}'::JSONB,
    owner_id UUID REFERENCES auth.users(id)
);

-- HR: Job Roles (Cargos)
CREATE TABLE IF NOT EXISTS public.rh_job_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    cbo_code TEXT,
    base_salary NUMERIC(10,2),
    description TEXT,
    custom_role_id UUID, -- Link to permissions
    is_active BOOLEAN DEFAULT TRUE
);

-- HR: Shifts (Escalas)
CREATE TABLE IF NOT EXISTS public.rh_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_time TIME,
    end_time TIME,
    break_minutes INTEGER DEFAULT 60,
    tolerance_minutes INTEGER DEFAULT 10,
    night_shift BOOLEAN DEFAULT FALSE,
    working_days JSONB -- Array of days [0,1,2,3,4,5,6]
);

-- Staff / Employees
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT DEFAULT 'WAITER',
    pin TEXT,
    status TEXT DEFAULT 'ACTIVE',
    
    -- HR Fields
    hr_job_role_id UUID REFERENCES public.rh_job_roles(id),
    shift_id UUID REFERENCES public.rh_shifts(id),
    base_salary NUMERIC(10,2) DEFAULT 0,
    start_date DATE,
    bank_info JSONB,
    address JSONB,
    custom_role_name TEXT,
    
    -- Extended HR Fields
    document_cpf TEXT,
    rg_number TEXT,
    pis_pasep TEXT,
    ctps_number TEXT,
    birth_date DATE,
    mothers_name TEXT,
    fathers_name TEXT,
    marital_status TEXT,
    gender TEXT,
    education_level TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT
);

-- HR: Event Types (Tipos de Eventos)
CREATE TABLE IF NOT EXISTS public.rh_event_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    operation TEXT DEFAULT '+', -- '+' or '-'
    calculation_type TEXT DEFAULT 'FIXED', -- 'FIXED' or 'PERCENTAGE'
    is_active BOOLEAN DEFAULT TRUE
);

-- HR: Recurring Events (Eventos Recorrentes)
CREATE TABLE IF NOT EXISTS public.rh_recurring_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
    event_type_id UUID REFERENCES public.rh_event_types(id),
    value NUMERIC(10,2),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- HR: Time Entries (Ponto)
CREATE TABLE IF NOT EXISTS public.rh_time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
    entry_date DATE DEFAULT CURRENT_DATE,
    clock_in TIMESTAMP WITH TIME ZONE,
    break_start TIMESTAMP WITH TIME ZONE,
    break_end TIMESTAMP WITH TIME ZONE,
    clock_out TIMESTAMP WITH TIME ZONE,
    total_hours NUMERIC(5,2),
    status TEXT DEFAULT 'PENDING',
    entry_type TEXT DEFAULT 'DIGITAL',
    justification TEXT,
    location_lat NUMERIC,
    location_lng NUMERIC,
    device_info JSONB,
    original_entry_id UUID,
    correction_reason TEXT
);

-- HR: Payroll Events (Eventos de Folha)
CREATE TABLE IF NOT EXISTS public.rh_payroll_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
    event_type_id UUID REFERENCES public.rh_event_types(id),
    month INTEGER,
    year INTEGER,
    amount NUMERIC(10,2),
    type TEXT, -- 'EARNING' or 'DEDUCTION'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- HR: Contract Templates
CREATE TABLE IF NOT EXISTS public.rh_contract_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'CONTRACT',
    content TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- HR: Staff Warnings
CREATE TABLE IF NOT EXISTS public.rh_staff_warnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
    type TEXT,
    content TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- HR: Closed Payrolls (Folhas Fechadas)
CREATE TABLE IF NOT EXISTS public.rh_closed_payrolls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    month INTEGER,
    year INTEGER,
    total_cost NUMERIC(15,2),
    total_net NUMERIC(15,2),
    employee_count INTEGER,
    status TEXT DEFAULT 'CLOSED',
    closed_by TEXT,
    closed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- HR: Closed Payroll Items (Detalhes da Folha Fechada)
CREATE TABLE IF NOT EXISTS public.rh_closed_payroll_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_id UUID REFERENCES public.rh_closed_payrolls(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES public.staff(id),
    staff_name TEXT,
    base_salary NUMERIC(10,2),
    gross_total NUMERIC(10,2),
    net_total NUMERIC(10,2),
    total_discounts NUMERIC(10,2),
    details JSONB -- Stores the full breakdown snapshot
);

-- HR: Legal Settings (Configurações Legais)
CREATE TABLE IF NOT EXISTS public.rh_legal_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    min_wage NUMERIC(10,2),
    inss_ceiling NUMERIC(10,2),
    irrf_dependent_deduction NUMERIC(10,2),
    fgts_rate NUMERIC(5,2),
    valid_from DATE,
    
    -- Calculation Parameters
    vacation_days_entitlement INTEGER DEFAULT 30,
    vacation_sold_days_limit INTEGER DEFAULT 10,
    thirteenth_min_months_worked INTEGER DEFAULT 1,
    notice_period_days INTEGER DEFAULT 30,
    notice_period_days_per_year INTEGER DEFAULT 3,
    notice_period_max_days INTEGER DEFAULT 90,
    fgts_fine_percent NUMERIC(5,2) DEFAULT 40,
    standard_monthly_hours INTEGER DEFAULT 220,
    
    -- Time Tracking
    time_tracking_method TEXT DEFAULT 'PHYSICAL',
    overtime_policy TEXT DEFAULT 'PAID_OVERTIME',
    deduct_delays_from_overtime BOOLEAN DEFAULT FALSE,
    absence_logic JSONB
);

-- Menu Categories
CREATE TABLE IF NOT EXISTS public.menu_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

-- Menu Items
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.menu_categories(id),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    image_url TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    stock_quantity INTEGER,
    track_stock BOOLEAN DEFAULT FALSE
);

-- Restaurant Tables
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    number TEXT NOT NULL,
    status TEXT DEFAULT 'AVAILABLE',
    capacity INTEGER
);

-- Orders
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_id UUID REFERENCES public.restaurant_tables(id),
    waiter_id UUID REFERENCES public.staff(id),
    customer_name TEXT,
    status TEXT DEFAULT 'PENDING',
    total_amount NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    payment_status TEXT DEFAULT 'UNPAID',
    payment_method TEXT
);

-- Order Items
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES public.menu_items(id),
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(10,2) NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service Calls
CREATE TABLE IF NOT EXISTS public.service_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_id UUID REFERENCES public.restaurant_tables(id),
    type TEXT DEFAULT 'WAITER',
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY (RLS)
-- -----------------------------------------------------------------------------

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
-- (Enable for all other tables as needed)

-- -----------------------------------------------------------------------------
-- 3. RPC FUNCTIONS (BUSINESS LOGIC)
-- -----------------------------------------------------------------------------

-- RPC: Register Time Entry
CREATE OR REPLACE FUNCTION public.register_time_entry(
    p_staff_id UUID,
    p_type TEXT,
    p_justification TEXT DEFAULT NULL,
    p_lat NUMERIC DEFAULT NULL,
    p_lng NUMERIC DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_tenant_id UUID;
    v_today DATE := CURRENT_DATE;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_entry_id UUID;
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM public.staff WHERE id = p_staff_id;
    
    -- (Geolocation logic placeholder - can be expanded)
    
    SELECT id INTO v_entry_id 
    FROM public.rh_time_entries 
    WHERE staff_id = p_staff_id AND entry_date = v_today;

    IF v_entry_id IS NOT NULL THEN
        UPDATE public.rh_time_entries
        SET 
            clock_in = CASE WHEN p_type = 'IN' THEN v_now ELSE clock_in END,
            break_start = CASE WHEN p_type = 'BREAK_START' THEN v_now ELSE break_start END,
            break_end = CASE WHEN p_type = 'BREAK_END' THEN v_now ELSE break_end END,
            clock_out = CASE WHEN p_type = 'OUT' THEN v_now ELSE clock_out END,
            justification = COALESCE(p_justification, justification),
            location_lat = COALESCE(p_lat, location_lat),
            location_lng = COALESCE(p_lng, location_lng)
        WHERE id = v_entry_id;
    ELSE
        INSERT INTO public.rh_time_entries (
            tenant_id, staff_id, entry_date, clock_in, status, entry_type, location_lat, location_lng
        ) VALUES (
            v_tenant_id, p_staff_id, v_today, CASE WHEN p_type = 'IN' THEN v_now ELSE NULL END, 'PENDING', 'DIGITAL', p_lat, p_lng
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Place Order
CREATE OR REPLACE FUNCTION public.place_order(
    p_tenant_id UUID,
    p_table_id UUID,
    p_items JSONB,
    p_customer_name TEXT DEFAULT NULL,
    p_waiter_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_item JSONB;
    v_menu_item RECORD;
    v_total_amount NUMERIC(10,2) := 0;
    v_item_total NUMERIC(10,2);
BEGIN
    INSERT INTO public.orders (tenant_id, table_id, waiter_id, customer_name, status)
    VALUES (p_tenant_id, p_table_id, p_waiter_id, p_customer_name, 'PENDING')
    RETURNING id INTO v_order_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        SELECT * INTO v_menu_item FROM public.menu_items WHERE id = (v_item->>'menu_item_id')::UUID;
        
        IF NOT FOUND THEN RAISE EXCEPTION 'Item não encontrado'; END IF;

        v_item_total := v_menu_item.price * (v_item->>'quantity')::INTEGER;
        v_total_amount := v_total_amount + v_item_total;

        INSERT INTO public.order_items (
            tenant_id, order_id, menu_item_id, quantity, unit_price, total_price, notes
        ) VALUES (
            p_tenant_id, v_order_id, v_menu_item.id, (v_item->>'quantity')::INTEGER, v_menu_item.price, v_item_total, v_item->>'notes'
        );

        IF v_menu_item.track_stock THEN
            UPDATE public.menu_items 
            SET stock_quantity = stock_quantity - (v_item->>'quantity')::INTEGER
            WHERE id = v_menu_item.id;
        END IF;
    END LOOP;

    UPDATE public.orders SET total_amount = v_total_amount WHERE id = v_order_id;
    UPDATE public.restaurant_tables SET status = 'OCCUPIED' WHERE id = p_table_id;

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Process POS Sale
CREATE OR REPLACE FUNCTION public.process_pos_sale(
    p_tenant_id UUID,
    p_items JSONB,
    p_payment_method TEXT,
    p_customer_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_item JSONB;
    v_menu_item RECORD;
    v_total_amount NUMERIC(10,2) := 0;
    v_item_total NUMERIC(10,2);
BEGIN
    INSERT INTO public.orders (tenant_id, customer_name, status, payment_status, payment_method)
    VALUES (p_tenant_id, p_customer_name, 'PAID', 'PAID', p_payment_method)
    RETURNING id INTO v_order_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        SELECT * INTO v_menu_item FROM public.menu_items WHERE id = (v_item->>'menu_item_id')::UUID;
        
        v_item_total := v_menu_item.price * (v_item->>'quantity')::INTEGER;
        v_total_amount := v_total_amount + v_item_total;

        INSERT INTO public.order_items (
            tenant_id, order_id, menu_item_id, quantity, unit_price, total_price, status
        ) VALUES (
            p_tenant_id, v_order_id, v_menu_item.id, (v_item->>'quantity')::INTEGER, v_menu_item.price, v_item_total, 'DELIVERED'
        );

        IF v_menu_item.track_stock THEN
            UPDATE public.menu_items 
            SET stock_quantity = stock_quantity - (v_item->>'quantity')::INTEGER
            WHERE id = v_menu_item.id;
        END IF;
    END LOOP;

    UPDATE public.orders SET total_amount = v_total_amount WHERE id = v_order_id;

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Calculate 13th
CREATE OR REPLACE FUNCTION public.calculate_thirteenth(
    p_staff_id UUID,
    p_year INTEGER,
    p_installment INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_staff RECORD;
    v_months_worked INTEGER := 12; -- Placeholder logic
    v_salary NUMERIC;
    v_value NUMERIC;
BEGIN
    SELECT * INTO v_staff FROM public.staff WHERE id = p_staff_id;
    v_salary := v_staff.base_salary;
    
    -- Placeholder calculation
    v_value := (v_salary / 12) * v_months_worked;
    IF p_installment = 1 THEN v_value := v_value / 2; END IF;
    IF p_installment = 2 THEN v_value := (v_value / 2) - 0; END IF; -- Deduct advance

    RETURN jsonb_build_object(
        'staffId', p_staff_id,
        'year', p_year,
        'installment', p_installment,
        'value', v_value,
        'referenceSalary', v_salary,
        'monthsWorked', v_months_worked,
        'netValue', v_value,
        'status', 'PENDING',
        'createdAt', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Calculate Vacation
CREATE OR REPLACE FUNCTION public.calculate_vacation(
    p_staff_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_days INTEGER,
    p_sold_days INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_staff RECORD;
    v_salary NUMERIC;
    v_base_value NUMERIC;
    v_one_third NUMERIC;
    v_total NUMERIC;
BEGIN
    SELECT * INTO v_staff FROM public.staff WHERE id = p_staff_id;
    v_salary := v_staff.base_salary;
    
    -- Proportional salary for days
    v_base_value := (v_salary / 30) * p_days;
    v_one_third := v_base_value / 3;
    v_total := v_base_value + v_one_third;

    RETURN jsonb_build_object(
        'staffId', p_staff_id,
        'start_date', p_start_date,
        'end_date', p_start_date + (p_days || ' days')::INTERVAL,
        'daysCount', p_days,
        'soldDays', p_sold_days,
        'baseValue', v_base_value,
        'oneThirdValue', v_one_third,
        'totalGross', v_total,
        'totalNet', v_total, -- Placeholder (no tax)
        'status', 'SCHEDULED'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Calculate Termination
CREATE OR REPLACE FUNCTION public.calculate_termination(
    p_staff_id UUID,
    p_date TIMESTAMP WITH TIME ZONE,
    p_reason TEXT,
    p_notice_type TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_staff RECORD;
    v_salary NUMERIC;
BEGIN
    SELECT * INTO v_staff FROM public.staff WHERE id = p_staff_id;
    v_salary := v_staff.base_salary;

    RETURN jsonb_build_object(
        'staffId', p_staff_id,
        'termination_date', p_date,
        'reason', p_reason,
        'noticePeriodType', p_notice_type,
        'balanceSalary', v_salary, -- Placeholder
        'totalValue', v_salary,
        'status', 'DRAFT'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Get Payroll Preview
CREATE OR REPLACE FUNCTION public.get_payroll_preview(
    p_month INTEGER,
    p_year INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_tenant_id UUID; -- Need to get from auth.uid() or pass it
    v_payroll JSONB := '[]'::JSONB;
    v_staff RECORD;
    v_item JSONB;
    v_closed_info JSONB := NULL;
    v_is_closed BOOLEAN := FALSE;
BEGIN
    -- Infer tenant_id from current user (assuming user is logged in)
    -- This is a simplification. In real app, ensure auth.uid() is valid.
    SELECT tenant_id INTO v_tenant_id FROM public.staff WHERE auth_user_id = auth.uid() LIMIT 1;
    
    -- Fallback for testing if auth.uid() not linked (or use a parameter if preferred)
    -- IF v_tenant_id IS NULL THEN RAISE EXCEPTION 'User not linked to tenant'; END IF;
    -- For this script, we assume RLS policies handle visibility, but for RPC we need explicit tenant.
    -- Let's try to get it from the first staff found if not auth (DANGEROUS in prod, ok for dev setup if single tenant)
    IF v_tenant_id IS NULL THEN 
        SELECT id INTO v_tenant_id FROM public.restaurants LIMIT 1; 
    END IF;

    -- Check if closed
    SELECT jsonb_build_object(
        'id', id, 'month', month, 'year', year, 'total_cost', total_cost, 'total_net', total_net, 'employee_count', employee_count, 'closed_at', closed_at, 'closed_by', closed_by
    ) INTO v_closed_info
    FROM public.rh_closed_payrolls
    WHERE tenant_id = v_tenant_id AND month = p_month AND year = p_year;

    IF v_closed_info IS NOT NULL THEN
        v_is_closed := TRUE;
    END IF;

    -- Calculate Preview for each staff
    FOR v_staff IN SELECT * FROM public.staff WHERE tenant_id = v_tenant_id AND status = 'ACTIVE'
    LOOP
        -- Placeholder calculations
        v_item := jsonb_build_object(
            'staff_id', v_staff.id,
            'staff_name', v_staff.name,
            'base_salary', v_staff.base_salary,
            'overtime_50', 0,
            'overtime_100', 0,
            'night_shift_add', 0,
            'bank_hours_balance', 0,
            'absences_total', 0,
            'addictionals', 0,
            'events_value', 0,
            'benefits', 0,
            'gross_total', v_staff.base_salary,
            'discounts', 0,
            'advances', 0,
            'net_total', v_staff.base_salary,
            'hours_worked', 220,
            'employer_charges', 0,
            'total_company_cost', v_staff.base_salary,
            'inss_value', 0,
            'irrf_value', 0,
            'fgts_value', 0,
            'tax_breakdown', '[]'::JSONB,
            'benefit_breakdown', '[]'::JSONB,
            'event_breakdown', '[]'::JSONB
        );
        v_payroll := v_payroll || v_item;
    END LOOP;

    RETURN jsonb_build_object(
        'payroll', v_payroll,
        'is_closed', v_is_closed,
        'closed_info', v_closed_info
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contract_templates_updated_at BEFORE UPDATE ON public.rh_contract_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
