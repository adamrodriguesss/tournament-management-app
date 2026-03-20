-- Add next_match_id to matches table to allow programmatic advancing
ALTER TABLE matches 
ADD COLUMN next_match_id UUID REFERENCES matches(id) ON DELETE SET NULL;
