CREATE TABLE IF NOT EXISTS decks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS movies (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS deck_movies (
  deck_id TEXT NOT NULL,
  movie_id TEXT NOT NULL,
  fun REAL NOT NULL,
  good REAL NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (deck_id, movie_id),
  FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE,
  FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_deck_movies_deck_id ON deck_movies(deck_id);
