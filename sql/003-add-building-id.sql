ALTER TABLE bars ADD COLUMN IF NOT EXISTS building_id TEXT;
CREATE INDEX IF NOT EXISTS idx_bars_building_id ON bars(building_id);
