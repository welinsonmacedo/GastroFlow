-- Adicionar coluna 'reason' na tabela 'service_calls' se ela não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='service_calls' AND column_name='reason') THEN
        ALTER TABLE public.service_calls ADD COLUMN reason TEXT;
    END IF;
END $$;
