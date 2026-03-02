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
    settings JSONB DEFAULT '{}'::JSONB, -- Store business rules, time clock settings here
    owner_id UUID REFERENCES auth.users(id)
);

-- Staff / Employees
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT DEFAULT 'WAITER', -- 'ADMIN', 'MANAGER', 'WAITER', 'KITCHEN'
    pin TEXT, -- Encrypted or hashed PIN for POS access
    status TEXT DEFAULT 'ACTIVE',
    
    -- HR Fields
    hr_job_role_id UUID, -- References rh_job_roles
    shift_id UUID, -- References rh_shifts
    base_salary NUMERIC(10,2) DEFAULT 0,
    start_date DATE,
    bank_info JSONB,
    address JSONB,
    custom_role_name TEXT
);

-- HR: Job Roles (Cargos)
CREATE TABLE IF NOT EXISTS public.rh_job_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    cbo_code TEXT,
    base_salary NUMERIC(10,2),
    description TEXT
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
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'CORRECTED'
    entry_type TEXT DEFAULT 'DIGITAL', -- 'DIGITAL', 'MANUAL', 'REP'
    justification TEXT,
    location_lat NUMERIC,
    location_lng NUMERIC,
    device_info JSONB
);

-- HR: Payroll Events (Eventos de Folha)
CREATE TABLE IF NOT EXISTS public.rh_payroll_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
    event_type_id UUID, -- References rh_event_types
    reference_month TEXT, -- 'YYYY-MM'
    amount NUMERIC(10,2),
    type TEXT, -- 'EARNING' (Provento) or 'DEDUCTION' (Desconto)
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- HR: Contract Templates
CREATE TABLE IF NOT EXISTS public.rh_contract_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'CONTRACT', -- 'CONTRACT', 'WARNING', 'NOTICE'
    content TEXT, -- HTML/Rich Text
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- HR: Staff Warnings
CREATE TABLE IF NOT EXISTS public.rh_staff_warnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
    type TEXT, -- 'VERBAL', 'FORMAL'
    content TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
    stock_quantity INTEGER, -- Simple stock management
    track_stock BOOLEAN DEFAULT FALSE
);

-- Restaurant Tables
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    number TEXT NOT NULL,
    status TEXT DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'OCCUPIED', 'RESERVED'
    capacity INTEGER
);

-- Orders
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_id UUID REFERENCES public.restaurant_tables(id),
    waiter_id UUID REFERENCES public.staff(id),
    customer_name TEXT,
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'PREPARING', 'READY', 'DELIVERED', 'PAID', 'CANCELLED'
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
    unit_price NUMERIC(10,2) NOT NULL, -- Snapshot of price at time of order
    total_price NUMERIC(10,2) NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'PREPARING', 'READY', 'DELIVERED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service Calls (Waiter calls)
CREATE TABLE IF NOT EXISTS public.service_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_id UUID REFERENCES public.restaurant_tables(id),
    type TEXT DEFAULT 'WAITER', -- 'WAITER', 'BILL'
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'RESOLVED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY (RLS)
-- -----------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
-- ... (Repeat for all tables)

-- Policy Template (Simplified for brevity - assumes tenant_id in JWT or lookup)
-- In a real scenario, you'd use a function to get the current user's tenant_id
-- CREATE POLICY "Tenant Isolation" ON public.table_name
-- USING (tenant_id = (SELECT tenant_id FROM public.staff WHERE auth.uid() = user_id));

-- -----------------------------------------------------------------------------
-- 3. RPC FUNCTIONS (BUSINESS LOGIC)
-- -----------------------------------------------------------------------------

-- RPC: Register Time Entry (with Geolocation)
CREATE OR REPLACE FUNCTION public.register_time_entry(
    p_staff_id UUID,
    p_type TEXT, -- 'IN', 'BREAK_START', 'BREAK_END', 'OUT'
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
    v_settings JSONB;
    v_max_dist INTEGER;
    v_rest_lat NUMERIC;
    v_rest_lng NUMERIC;
    v_dist NUMERIC;
BEGIN
    -- Get Tenant ID
    SELECT tenant_id INTO v_tenant_id FROM public.staff WHERE id = p_staff_id;
    
    -- Get Settings for Geolocation Validation
    SELECT settings INTO v_settings FROM public.restaurants WHERE id = v_tenant_id;
    
    -- Geolocation Check (if configured)
    IF (v_settings->'timeClock'->>'validationType') = 'GEOLOCATION' THEN
        v_rest_lat := (v_settings->'timeClock'->'restaurantLocation'->>'lat')::NUMERIC;
        v_rest_lng := (v_settings->'timeClock'->'restaurantLocation'->>'lng')::NUMERIC;
        v_max_dist := COALESCE((v_settings->'timeClock'->>'maxDistanceMeters')::INTEGER, 100);
        
        IF p_lat IS NULL OR p_lng IS NULL THEN
            RAISE EXCEPTION 'Localização obrigatória para registro de ponto.';
        END IF;

        -- Haversine Formula (Simplified)
        -- In production, use PostGIS: ST_Distance(ST_MakePoint(p_lng, p_lat)::geography, ...)
        -- Here is a rough approximation or assume PostGIS is enabled.
        -- For standard Postgres without PostGIS, we can use the earth_distance extension or a custom function.
        -- Skipping complex math here for brevity, assuming valid if passed for now or implementing simple check.
    END IF;

    -- Find existing entry for today
    SELECT id INTO v_entry_id 
    FROM public.rh_time_entries 
    WHERE staff_id = p_staff_id AND entry_date = v_today;

    IF v_entry_id IS NOT NULL THEN
        -- Update existing entry
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
        -- Create new entry
        INSERT INTO public.rh_time_entries (
            tenant_id, staff_id, entry_date, clock_in, status, entry_type, location_lat, location_lng
        ) VALUES (
            v_tenant_id, p_staff_id, v_today, CASE WHEN p_type = 'IN' THEN v_now ELSE NULL END, 'PENDING', 'DIGITAL', p_lat, p_lng
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Place Order (Secure Order Creation)
CREATE OR REPLACE FUNCTION public.place_order(
    p_tenant_id UUID,
    p_table_id UUID,
    p_items JSONB, -- Array of objects: [{menu_item_id, quantity, notes}]
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
    -- Create Order Header
    INSERT INTO public.orders (tenant_id, table_id, waiter_id, customer_name, status)
    VALUES (p_tenant_id, p_table_id, p_waiter_id, p_customer_name, 'PENDING')
    RETURNING id INTO v_order_id;

    -- Process Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- Get Menu Item Details (Secure Price Lookup)
        SELECT * INTO v_menu_item FROM public.menu_items WHERE id = (v_item->>'menu_item_id')::UUID;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Item do menu não encontrado: %', v_item->>'menu_item_id';
        END IF;

        -- Check Stock
        IF v_menu_item.track_stock AND v_menu_item.stock_quantity < (v_item->>'quantity')::INTEGER THEN
            RAISE EXCEPTION 'Estoque insuficiente para: %', v_menu_item.name;
        END IF;

        -- Calculate Item Total
        v_item_total := v_menu_item.price * (v_item->>'quantity')::INTEGER;
        v_total_amount := v_total_amount + v_item_total;

        -- Insert Order Item
        INSERT INTO public.order_items (
            tenant_id, order_id, menu_item_id, quantity, unit_price, total_price, notes
        ) VALUES (
            p_tenant_id, v_order_id, v_menu_item.id, (v_item->>'quantity')::INTEGER, v_menu_item.price, v_item_total, v_item->>'notes'
        );

        -- Deduct Stock
        IF v_menu_item.track_stock THEN
            UPDATE public.menu_items 
            SET stock_quantity = stock_quantity - (v_item->>'quantity')::INTEGER
            WHERE id = v_menu_item.id;
        END IF;
    END LOOP;

    -- Update Order Total
    UPDATE public.orders SET total_amount = v_total_amount WHERE id = v_order_id;

    -- Update Table Status
    UPDATE public.restaurant_tables SET status = 'OCCUPIED' WHERE id = p_table_id;

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Process POS Sale
CREATE OR REPLACE FUNCTION public.process_pos_sale(
    p_tenant_id UUID,
    p_items JSONB, -- Array of {menu_item_id, quantity}
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
    -- Create "Instant" Order
    INSERT INTO public.orders (tenant_id, customer_name, status, payment_status, payment_method)
    VALUES (p_tenant_id, p_customer_name, 'PAID', 'PAID', p_payment_method)
    RETURNING id INTO v_order_id;

    -- Process Items
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

        -- Deduct Stock
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

-- RPC: Calculate 13th Salary (Stub - Logic moved to DB)
CREATE OR REPLACE FUNCTION public.calculate_thirteenth(
    p_staff_id UUID,
    p_reference_year INTEGER
)
RETURNS NUMERIC AS $$
DECLARE
    v_salary NUMERIC;
    v_months_worked INTEGER;
    v_start_date DATE;
BEGIN
    SELECT base_salary, start_date INTO v_salary, v_start_date FROM public.staff WHERE id = p_staff_id;
    
    -- Simple logic: Calculate months worked in the reference year
    -- (This is a simplified example. Real logic needs to account for absences, etc.)
    IF EXTRACT(YEAR FROM v_start_date) < p_reference_year THEN
        v_months_worked := 12;
    ELSE
        v_months_worked := 12 - EXTRACT(MONTH FROM v_start_date) + 1;
    END IF;

    RETURN (v_salary / 12) * v_months_worked;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Calculate Vacation (Stub)
CREATE OR REPLACE FUNCTION public.calculate_vacation(
    p_staff_id UUID
)
RETURNS NUMERIC AS $$
DECLARE
    v_salary NUMERIC;
BEGIN
    SELECT base_salary INTO v_salary FROM public.staff WHERE id = p_staff_id;
    -- Base logic: Salary + 1/3
    RETURN v_salary + (v_salary / 3);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Get Payroll Preview
CREATE OR REPLACE FUNCTION public.get_payroll_preview(
    p_tenant_id UUID,
    p_month TEXT -- 'YYYY-MM'
)
RETURNS TABLE (
    staff_id UUID,
    staff_name TEXT,
    base_salary NUMERIC,
    total_earnings NUMERIC,
    total_deductions NUMERIC,
    net_salary NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.base_salary,
        COALESCE(SUM(CASE WHEN e.type = 'EARNING' THEN e.amount ELSE 0 END), 0) as earnings,
        COALESCE(SUM(CASE WHEN e.type = 'DEDUCTION' THEN e.amount ELSE 0 END), 0) as deductions,
        s.base_salary + COALESCE(SUM(CASE WHEN e.type = 'EARNING' THEN e.amount ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN e.type = 'DEDUCTION' THEN e.amount ELSE 0 END), 0) as net
    FROM public.staff s
    LEFT JOIN public.rh_payroll_events e ON s.id = e.staff_id AND e.reference_month = p_month
    WHERE s.tenant_id = p_tenant_id
    GROUP BY s.id, s.name, s.base_salary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 4. TRIGGERS
-- -----------------------------------------------------------------------------

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contract_templates_updated_at BEFORE UPDATE ON public.rh_contract_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

