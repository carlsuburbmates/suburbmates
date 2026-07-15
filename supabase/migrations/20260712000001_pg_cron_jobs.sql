-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create the 180-Day Inactivity Pruner job
-- This job runs daily at midnight to archive free-tier vendors who have not logged in for 180 days.
-- Archiving preserves the URL to prevent 404s (saving programmatic SEO), but allows the frontend to hide their contact details.

SELECT cron.schedule(
    'prune-inactive-free-vendors', 
    '0 0 * * *', 
    $$
    UPDATE public.vendors 
    SET tier = 'archived' 
    WHERE tier = 'free' 
    AND last_active_at < (NOW() - INTERVAL '180 days');
    $$
);
