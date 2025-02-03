-- Add cascade delete constraints for intervention-related tables
DO $$ BEGIN
  -- First check if the constraint exists before trying to drop it
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'intervention_comments_intervention_id_fkey'
  ) THEN
    ALTER TABLE intervention_comments 
    DROP CONSTRAINT intervention_comments_intervention_id_fkey;
  END IF;

  -- Add the constraint back with CASCADE
  ALTER TABLE intervention_comments
  ADD CONSTRAINT intervention_comments_intervention_id_fkey
  FOREIGN KEY (intervention_id)
  REFERENCES interventions(id)
  ON DELETE CASCADE;

  -- Repeat for other tables
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'intervention_documents_intervention_id_fkey'
  ) THEN
    ALTER TABLE intervention_documents
    DROP CONSTRAINT intervention_documents_intervention_id_fkey;
  END IF;

  ALTER TABLE intervention_documents
  ADD CONSTRAINT intervention_documents_intervention_id_fkey
  FOREIGN KEY (intervention_id)
  REFERENCES interventions(id)
  ON DELETE CASCADE;

  -- Add cascade delete for intervention objectives
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'intervention_objectives_intervention_id_fkey'
  ) THEN
    ALTER TABLE intervention_objectives
    DROP CONSTRAINT intervention_objectives_intervention_id_fkey;
  END IF;

  ALTER TABLE intervention_objectives
  ADD CONSTRAINT intervention_objectives_intervention_id_fkey
  FOREIGN KEY (intervention_id)
  REFERENCES interventions(id)
  ON DELETE CASCADE;

  -- Add cascade delete for intervention resources
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'intervention_resources_intervention_id_fkey'
  ) THEN
    ALTER TABLE intervention_resources
    DROP CONSTRAINT intervention_resources_intervention_id_fkey;
  END IF;

  ALTER TABLE intervention_resources
  ADD CONSTRAINT intervention_resources_intervention_id_fkey
  FOREIGN KEY (intervention_id)
  REFERENCES interventions(id)
  ON DELETE CASCADE;

  -- Add cascade delete for intervention success criteria
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'intervention_success_criteria_intervention_id_fkey'
  ) THEN
    ALTER TABLE intervention_success_criteria
    DROP CONSTRAINT intervention_success_criteria_intervention_id_fkey;
  END IF;

  ALTER TABLE intervention_success_criteria
  ADD CONSTRAINT intervention_success_criteria_intervention_id_fkey
  FOREIGN KEY (intervention_id)
  REFERENCES interventions(id)
  ON DELETE CASCADE;

  -- Add cascade delete for intervention activities
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'intervention_activities_intervention_id_fkey'
  ) THEN
    ALTER TABLE intervention_activities
    DROP CONSTRAINT intervention_activities_intervention_id_fkey;
  END IF;

  ALTER TABLE intervention_activities
  ADD CONSTRAINT intervention_activities_intervention_id_fkey
  FOREIGN KEY (intervention_id)
  REFERENCES interventions(id)
  ON DELETE CASCADE;

END $$;