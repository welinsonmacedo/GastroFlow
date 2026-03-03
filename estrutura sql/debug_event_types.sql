-- Check table structure and data for rh_event_types
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'rh_event_types';

-- Check sample data
SELECT * FROM rh_event_types LIMIT 5;
