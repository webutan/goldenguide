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
