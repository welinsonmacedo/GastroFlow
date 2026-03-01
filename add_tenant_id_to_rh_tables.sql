ALTER TABLE rh_thirteenth_payments ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE rh_vacations ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE rh_vacation_schedules ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE rh_terminations ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_rh_thirteenth_tenant ON rh_thirteenth_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rh_vacations_tenant ON rh_vacations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rh_vacation_schedules_tenant ON rh_vacation_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rh_terminations_tenant ON rh_terminations(tenant_id);
