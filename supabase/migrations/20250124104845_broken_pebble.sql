/*
  # Remove status fields from clusters and pathways

  1. Changes
    - Remove status column from clusters table
    - Remove status column from pathways table

  2. Notes
    - Uses safe ALTER TABLE commands
    - Maintains existing data
*/

-- Remove status column from clusters
ALTER TABLE clusters DROP COLUMN IF EXISTS status;

-- Remove status column from pathways
ALTER TABLE pathways DROP COLUMN IF EXISTS status;