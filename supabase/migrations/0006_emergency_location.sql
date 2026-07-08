-- Add latitude and longitude to emergency_events

ALTER TABLE emergency_events
ADD COLUMN latitude NUMERIC(10, 8),
ADD COLUMN longitude NUMERIC(11, 8);
