-- Add 'comment' to entity_type enum for comprehensive activity tracking
-- Migration: Add comment entity type to support comment action logging

-- Add 'comment' to the existing entity_type enum
ALTER TYPE entity_type ADD VALUE 'comment';

-- Add comment for documentation
COMMENT ON TYPE entity_type IS 'Enum defining all trackable entity types including comment for comprehensive activity logging';