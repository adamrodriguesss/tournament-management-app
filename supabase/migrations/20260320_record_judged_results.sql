-- Migration: Add record_judged_results RPC function
-- Usage: supabase db push or execute via Supabase SQL Editor

CREATE OR REPLACE FUNCTION record_judged_results(
  p_event_id UUID,
  p_first_team_id UUID,
  p_second_team_id UUID,
  p_third_team_id UUID,
  p_recorded_by UUID
)
RETURNS VOID AS $$
DECLARE
  v_points_first INT;
  v_points_second INT;
  v_points_third INT;
  v_format event_format;
BEGIN
  -- Validate event and get points
  SELECT format, points_first, points_second, points_third 
  INTO v_format, v_points_first, v_points_second, v_points_third
  FROM events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found.';
  END IF;

  IF v_format != 'judged' THEN
    RAISE EXCEPTION 'Event format must be judged.';
  END IF;

  -- 1st Place (Required)
  INSERT INTO event_results (event_id, team_id, position, points_awarded, recorded_at, recorded_by)
  VALUES (p_event_id, p_first_team_id, 1, v_points_first, NOW(), p_recorded_by)
  ON CONFLICT (event_id, position) DO UPDATE 
  SET team_id = EXCLUDED.team_id, points_awarded = EXCLUDED.points_awarded, recorded_at = NOW(), recorded_by = EXCLUDED.recorded_by;
  
  -- Cleanup any existing duplicate team logic (if a team used to be 1st but is now 2nd)
  DELETE FROM event_results WHERE event_id = p_event_id AND team_id = p_first_team_id AND position != 1;

  -- 2nd Place (Optional)
  IF p_second_team_id IS NOT NULL THEN
    INSERT INTO event_results (event_id, team_id, position, points_awarded, recorded_at, recorded_by)
    VALUES (p_event_id, p_second_team_id, 2, v_points_second, NOW(), p_recorded_by)
    ON CONFLICT (event_id, position) DO UPDATE 
    SET team_id = EXCLUDED.team_id, points_awarded = EXCLUDED.points_awarded, recorded_at = NOW(), recorded_by = EXCLUDED.recorded_by;
    
    DELETE FROM event_results WHERE event_id = p_event_id AND team_id = p_second_team_id AND position != 2;
  ELSE
    DELETE FROM event_results WHERE event_id = p_event_id AND position = 2;
  END IF;

  -- 3rd Place (Optional)
  IF p_third_team_id IS NOT NULL THEN
    INSERT INTO event_results (event_id, team_id, position, points_awarded, recorded_at, recorded_by)
    VALUES (p_event_id, p_third_team_id, 3, v_points_third, NOW(), p_recorded_by)
    ON CONFLICT (event_id, position) DO UPDATE 
    SET team_id = EXCLUDED.team_id, points_awarded = EXCLUDED.points_awarded, recorded_at = NOW(), recorded_by = EXCLUDED.recorded_by;

    DELETE FROM event_results WHERE event_id = p_event_id AND team_id = p_third_team_id AND position != 3;
  ELSE
    DELETE FROM event_results WHERE event_id = p_event_id AND position = 3;
  END IF;

END;
$$ LANGUAGE plpgsql;
