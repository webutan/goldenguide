import pool from './db.js'

const MIGRATIONS = [
  {
    name: '001-schema',
    sql: `
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
      CREATE INDEX IF NOT EXISTS idx_bars_slug       ON bars(slug);
      CREATE INDEX IF NOT EXISTS idx_bars_street     ON bars(street);
      CREATE INDEX IF NOT EXISTS idx_bar_tags_bar    ON bar_tags(bar_id);
      CREATE INDEX IF NOT EXISTS idx_bar_tags_tag    ON bar_tags(tag_id);
      CREATE INDEX IF NOT EXISTS idx_photos_bar      ON photos(bar_id);
      CREATE INDEX IF NOT EXISTS idx_visited_user    ON visited(user_id);
    `,
  },
  {
    name: '002-seed-tags',
    sql: `
      INSERT INTO tags (id, label, icon, color) VALUES
        ('smoking',       'Smoking OK',       '/icons/tags/smoking.png',    '#888'),
        ('no-smoking',    'No Smoking',       '/icons/tags/no-smoking.png', '#4CAF50'),
        ('english-ok',    'English OK',       '/icons/tags/english.png',    '#2196F3'),
        ('japanese-only', 'Japanese Only',    '/icons/tags/japanese.png',   '#F44336'),
        ('members-only',  'Members Only',     '/icons/tags/lock.png',       '#9E9E9E'),
        ('walk-in-ok',    'Walk-in OK',       '/icons/tags/lock-open.png',  '#8BC34A'),
        ('otoshi',        'Otoshi Included',  '/icons/tags/otoshi.png',     '#795548'),
        ('bottle-keep',   'Bottle Keep',      '/icons/tags/bottle.png',     '#FF9800'),
        ('karaoke',       'Karaoke',          '/icons/tags/karaoke.png',    '#E91E63'),
        ('cash-only',     'Cash Only',        '/icons/tags/cash.png',       '#FFC107')
      ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, icon = EXCLUDED.icon, color = EXCLUDED.color;
    `,
  },
  {
    name: '003-add-building-id',
    sql: `
      ALTER TABLE bars ADD COLUMN IF NOT EXISTS building_id TEXT;
      CREATE INDEX IF NOT EXISTS idx_bars_building_id ON bars(building_id);
    `,
  },
  {
    name: '004-add-drink-cash-columns',
    sql: `
      ALTER TABLE bars ADD COLUMN IF NOT EXISTS drink_price TEXT;
      ALTER TABLE bars ADD COLUMN IF NOT EXISTS cash_only BOOLEAN;
    `,
  },
  {
    name: '005-add-google-link',
    sql: `ALTER TABLE bars ADD COLUMN IF NOT EXISTS google_link TEXT;`,
  },
  {
    name: '006-add-schedule',
    sql: `ALTER TABLE bars ADD COLUMN IF NOT EXISTS schedule JSONB DEFAULT '{}';`,
  },
  {
    name: '007-annotations',
    sql: `
      CREATE TABLE IF NOT EXISTS annotations (
        id        TEXT PRIMARY KEY,
        text_en   TEXT NOT NULL DEFAULT '',
        text_jp   TEXT NOT NULL DEFAULT '',
        x         REAL NOT NULL DEFAULT 0,
        y         REAL NOT NULL DEFAULT 0,
        font_size REAL NOT NULL DEFAULT 50,
        color     TEXT NOT NULL DEFAULT '#8a6540',
        rotation  REAL NOT NULL DEFAULT 0
      );
    `,
  },
  {
    name: '008-cache-table',
    sql: `
      CREATE TABLE IF NOT EXISTS cache (
        key        TEXT PRIMARY KEY,
        data       JSONB NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL
      );
    `,
  },
  {
    name: '009-update-tag-icons',
    sql: `
      INSERT INTO tags (id, label, icon, color) VALUES
        ('smoking',       'Smoking OK',       '/icons/tags/smoking.ico',     '#888'),
        ('no-smoking',    'No Smoking',       '/icons/tags/nosmoking.ico',   '#4CAF50'),
        ('english-ok',    'English OK',       '/icons/tags/uk.ico',          '#2196F3'),
        ('japanese-only', 'Japanese Only',    '/icons/tags/japan.ico',       '#F44336'),
        ('members-only',  'Members Only',     '/icons/tags/key_padlock.ico', '#9E9E9E'),
        ('otoshi',        'Otoshi Included',  '/icons/tags/otoshi.ico',      '#795548'),
        ('bottle-keep',   'Bottle Keep',      '/icons/tags/bottle.ico',      '#FF9800'),
        ('card',          'Credit Card OK',   '/icons/tags/card.ico',        '#9141ac'),
        ('karaoke',       'Karaoke',          '/icons/tags/microphone.ico',  '#9C27B0'),
        ('cash-only',     'Cash Only',        '/icons/tags/money.ico',       '#F44336')
      ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, icon = EXCLUDED.icon, color = EXCLUDED.color;
      DELETE FROM bar_tags WHERE tag_id = 'walk-in-ok';
      DELETE FROM tags WHERE id = 'walk-in-ok';
    `,
  },
  {
    name: '010-label-jp-other-links',
    sql: `
      ALTER TABLE tags ADD COLUMN IF NOT EXISTS label_jp TEXT;
      ALTER TABLE bars ADD COLUMN IF NOT EXISTS other_links JSONB DEFAULT '[]';
      UPDATE tags SET label_jp = 'Smoking OK'       WHERE id = 'smoking'       AND label_jp IS NULL;
      UPDATE tags SET label_jp = '禁煙'              WHERE id = 'no-smoking'    AND label_jp IS NULL;
      UPDATE tags SET label_jp = '英語OK'            WHERE id = 'english-ok'    AND label_jp IS NULL;
      UPDATE tags SET label_jp = '日本語のみ'        WHERE id = 'japanese-only' AND label_jp IS NULL;
      UPDATE tags SET label_jp = '会員制'            WHERE id = 'members-only'  AND label_jp IS NULL;
      UPDATE tags SET label_jp = 'お通し込み'        WHERE id = 'otoshi'        AND label_jp IS NULL;
      UPDATE tags SET label_jp = 'ボトルキープ'      WHERE id = 'bottle-keep'   AND label_jp IS NULL;
      UPDATE tags SET label_jp = 'カード払いOK'      WHERE id = 'card'          AND label_jp IS NULL;
      UPDATE tags SET label_jp = 'カラオケ'          WHERE id = 'karaoke'       AND label_jp IS NULL;
      UPDATE tags SET label_jp = '現金のみ'          WHERE id = 'cash-only'     AND label_jp IS NULL;
    `,
  },
]

export async function runMigrations() {
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id         SERIAL PRIMARY KEY,
        name       TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)

    const { rows } = await client.query('SELECT name FROM _migrations')
    const applied = new Set(rows.map(r => r.name))

    for (const migration of MIGRATIONS) {
      if (applied.has(migration.name)) continue

      console.log(`Applying migration: ${migration.name}`)
      await client.query('BEGIN')
      try {
        await client.query(migration.sql)
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [migration.name])
        await client.query('COMMIT')
        console.log(`  ✓ ${migration.name}`)
      } catch (err) {
        await client.query('ROLLBACK')
        throw new Error(`Migration ${migration.name} failed: ${err.message}`)
      }
    }

    console.log('Migrations complete.')
  } finally {
    client.release()
  }
}
