-- 42_allow_staff_admins_update_tenant.sql
-- Objetivo: Permitir que Admins (na tabela staff) atualizem seu próprio tenant (tabela tenants).

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'tenants' AND policyname = 'Staff Admins can update own tenant'
    ) THEN
        CREATE POLICY "Staff Admins can update own tenant" ON tenants
        FOR UPDATE
        TO authenticated
        USING (
            id IN (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN'))
        )
        WITH CHECK (
            id IN (SELECT tenant_id FROM staff WHERE auth_user_id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN'))
        );
    END IF;
END
$$;
