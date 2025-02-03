-- Add job tracking columns to action_targets table
ALTER TABLE action_targets
ADD COLUMN category text,
ADD COLUMN women_target numeric,
ADD COLUMN women_current numeric DEFAULT 0,
ADD COLUMN youth_target numeric,
ADD COLUMN youth_current numeric DEFAULT 0;

-- Add comment to explain the category column
COMMENT ON COLUMN action_targets.category IS 'Type of target (e.g., jobs, other)';

-- Add indexes for better query performance
CREATE INDEX idx_action_targets_category ON action_targets(category);