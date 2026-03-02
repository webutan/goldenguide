CREATE TABLE IF NOT EXISTS bars (
  id          INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  slug        TEXT NOT NULL UNIQUE,
  name_jp     TEXT NOT NULL,
  name_en     TEXT,
  street      TEXT,
  floor       INTEGER NOT NULL DEFAULT 1,
  map_x       REAL,
  map_y       REAL,
  lat         REAL,
  lng         REAL,
  address     TEXT,
  plus_code   TEXT,
  charge      TEXT,
  male_charge TEXT,
  seats       INTEGER,
  phone       TEXT,
  hours       TEXT,
  closed_days TEXT,
  description TEXT,
  sns         TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tags (
  id    TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  icon  TEXT,
  color TEXT
);

CREATE TABLE IF NOT EXISTS bar_tags (
  bar_id INTEGER NOT NULL REFERENCES bars(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (bar_id, tag_id)
);

CREATE TABLE IF NOT EXISTS photos (
  id          INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  bar_id      INTEGER NOT NULL REFERENCES bars(id) ON DELETE CASCADE,
  filename    TEXT NOT NULL,
  photo_type  TEXT NOT NULL DEFAULT 'general',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  username      TEXT NOT NULL UNIQUE,
  email         TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS visited (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bar_id     INTEGER NOT NULL REFERENCES bars(id) ON DELETE CASCADE,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, bar_id)
);

CREATE INDEX IF NOT EXISTS idx_bars_slug ON bars(slug);
CREATE INDEX IF NOT EXISTS idx_bars_street ON bars(street);
CREATE INDEX IF NOT EXISTS idx_bar_tags_bar ON bar_tags(bar_id);
CREATE INDEX IF NOT EXISTS idx_bar_tags_tag ON bar_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_photos_bar ON photos(bar_id);
CREATE INDEX IF NOT EXISTS idx_visited_user ON visited(user_id);
