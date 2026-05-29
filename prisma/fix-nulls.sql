UPDATE valida1_results SET response_json = '{}'::jsonb WHERE response_json IS NULL;
UPDATE valida1_results SET request_json  = '{}'::jsonb WHERE request_json  IS NULL;
