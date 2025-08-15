ALTER TABLE targets
ADD COLUMN job_subcategory TEXT;

UPDATE targets
SET job_subcategory = 'direct'
WHERE category = 'jobs';