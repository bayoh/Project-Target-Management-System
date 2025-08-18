-- Create entity_type enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE entity_type AS ENUM (
        'cluster',
        'pathway', 
        'intervention',
        'action',
        'task',
        'indicator',
        'indicator_report',
        'user',
        'help_section',
        'help_content',
        'navigation',
        'comment'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- If the enum already exists, add 'comment' to it
DO $$ BEGIN
    ALTER TYPE entity_type ADD VALUE IF NOT EXISTS 'comment';
EXCEPTION
    WHEN others THEN null;
END $$;

-- Update user_activity_logs table to use the entity_type enum if not already using it
DO $$ BEGIN
    -- Check if the column exists and is not already using the enum
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_activity_logs' 
        AND column_name = 'entity_type' 
        AND data_type = 'text'
    ) THEN
        -- Convert the text column to use the enum
        ALTER TABLE user_activity_logs 
        ALTER COLUMN entity_type TYPE entity_type USING entity_type::entity_type;
    END IF;
EXCEPTION
    WHEN others THEN null;
END $$;