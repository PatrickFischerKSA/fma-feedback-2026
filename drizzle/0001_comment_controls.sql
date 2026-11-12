CREATE TABLE IF NOT EXISTS comment_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  is_open INTEGER NOT NULL CHECK (is_open IN (0, 1))
);
INSERT OR IGNORE INTO comment_settings(id, is_open) VALUES (1, 1);
CREATE TABLE IF NOT EXISTS comment_likes (
  feedback_id INTEGER NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
  voter TEXT NOT NULL,
  PRIMARY KEY (feedback_id, voter)
);
