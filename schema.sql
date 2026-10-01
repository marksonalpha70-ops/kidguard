-- KidGuard Database Schema
-- Cloudflare D1 (SQLite)

-- =====================
-- PARENTS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS parents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- CHILDREN TABLE
-- =====================
CREATE TABLE IF NOT EXISTS children (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  avatar TEXT DEFAULT 'default',
  daily_limit_minutes INTEGER DEFAULT 120,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE
);

-- =====================
-- SCREEN TIME LOGS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS screen_time_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  date DATE NOT NULL,
  minutes_used INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- =====================
-- REWARDS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  points_required INTEGER DEFAULT 10,
  is_claimed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- =====================
-- POINTS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  points INTEGER DEFAULT 0,
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- =====================
-- INDEXES
-- =====================
CREATE INDEX IF NOT EXISTS idx_children_parent_id 
  ON children(parent_id);

CREATE INDEX IF NOT EXISTS idx_screen_time_child_id 
  ON screen_time_logs(child_id);

CREATE INDEX IF NOT EXISTS idx_screen_time_date 
  ON screen_time_logs(date);

CREATE INDEX IF NOT EXISTS idx_rewards_child_id 
  ON rewards(child_id);

CREATE INDEX IF NOT EXISTS idx_points_child_id 
  ON points(child_id);
