-- Create an enum type for action status if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'action_status') THEN
        CREATE TYPE action_status AS ENUM ('not_started', 'in_progress', 'completed', 'blocked', 'at_risk');
    END IF;
END $$;

-- Create function to handle high severity issues and needs
CREATE OR REPLACE FUNCTION handle_high_severity_status()
    RETURNS trigger AS
$$
BEGIN
    -- For issues table
    IF TG_TABLE_NAME = 'action_issues' THEN
        IF NEW.severity = 'high' THEN
            UPDATE actions
            SET status = 'at_risk'::action_status
            WHERE id = NEW.action_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for action_issues table
DROP TRIGGER IF EXISTS update_action_status_on_high_severity_issue ON action_issues;
CREATE TRIGGER update_action_status_on_high_severity_issue
    AFTER INSERT OR UPDATE
    ON action_issues
    FOR EACH ROW
    EXECUTE FUNCTION handle_high_severity_status();
