
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  fullname       TEXT NOT NULL,
  nickname       TEXT NOT NULL UNIQUE,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  birthdate      DATE NOT NULL,
  created_at   DATETIME NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f','now','localtime')),
  post_count     INTEGER NOT NULL DEFAULT 0,
  is_admin       BOOLEAN NOT NULL DEFAULT FALSE,
  image_path     TEXT,
  bio            TEXT
);

CREATE TABLE IF NOT EXISTS categories (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS threads (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  author_id    INTEGER NOT NULL,
  category_id  INTEGER NOT NULL,
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,
  created_at   DATETIME NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f','now','localtime')),
  is_edited    BOOLEAN NOT NULL DEFAULT FALSE,
  click_count_total   INTEGER NOT NULL DEFAULT 0,
  click_count_daily   INTEGER NOT NULL DEFAULT 0,
  click_count_weekly  INTEGER NOT NULL DEFAULT 0,
  click_count_monthly INTEGER NOT NULL DEFAULT 0,
  like_count   INTEGER NOT NULL DEFAULT 0,
  dislike_count INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(author_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id        INTEGER NOT NULL,
  author_id        INTEGER NOT NULL,
  parent_post_id   INTEGER,    -- NULL = direct thread reply
  content          TEXT NOT NULL,
  created_at       DATETIME NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f','now','localtime')),
  is_edited        BOOLEAN NOT NULL DEFAULT FALSE,
  like_count       INTEGER NOT NULL DEFAULT 0,
  dislike_count   INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(thread_id)      REFERENCES threads(id) ON DELETE CASCADE,
  FOREIGN KEY(author_id)      REFERENCES users(id)   ON DELETE CASCADE,
  FOREIGN KEY(parent_post_id) REFERENCES posts(id)   ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id    INTEGER NOT NULL,
  receiver_id  INTEGER NOT NULL,
  content      TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'sent',
  created_at   DATETIME NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f','now','localtime')),
  is_edited    BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted   BOOLEAN NOT NULL DEFAULT FALSE,
  FOREIGN KEY(sender_id)   REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL,    -- recipient
  actor_id      INTEGER NOT NULL,    -- who caused it
  type          TEXT    NOT NULL,    -- 'reply' or 'thread_post'
  entity_type   TEXT    NOT NULL,    -- always 'post' here
  entity_id     INTEGER NOT NULL,    -- the post.id
  is_read       INTEGER NOT NULL DEFAULT 0,
  created_at   DATETIME NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f','now','localtime')),
  FOREIGN KEY(user_id)  REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS post_votes (
  user_id     INTEGER NOT NULL,
  post_id     INTEGER NOT NULL,
  vote        INTEGER NOT NULL CHECK(vote IN (1, -1)),
  created_at  DATETIME NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f','now','localtime')),
  PRIMARY KEY (user_id, post_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS thread_votes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id    INTEGER NOT NULL,
  user_id      INTEGER NOT NULL,
  vote         INTEGER NOT NULL CHECK (vote IN (1, -1)),
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(thread_id, user_id),
  FOREIGN KEY(thread_id) REFERENCES threads(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id)   REFERENCES users(id)   ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS thread_views (
  user_id    INTEGER NOT NULL,
  thread_id  INTEGER NOT NULL,
  view_date  DATE    NOT NULL,
  PRIMARY KEY (user_id, thread_id, view_date),
  FOREIGN KEY(user_id)   REFERENCES users(id)   ON DELETE CASCADE,
  FOREIGN KEY(thread_id) REFERENCES threads(id) ON DELETE CASCADE
);


-- Trigger: notify a post’s parent-post author when someone replies to their post
CREATE TRIGGER IF NOT EXISTS notify_on_reply
AFTER INSERT ON posts
FOR EACH ROW
WHEN NEW.parent_post_id IS NOT NULL
BEGIN
  -- Avoid notifying oneself
  INSERT INTO notifications(user_id, actor_id, type, entity_type, entity_id, created_at)
  SELECT
    p.author_id,
    NEW.author_id,
    'reply',
    'post',
    NEW.id,
    STRFTIME('%Y-%m-%d %H:%M:%f','now','localtime')
  FROM posts AS p
  WHERE p.id = NEW.parent_post_id
    AND p.author_id != NEW.author_id;
END;

-- Trigger: notify a thread owner when anyone (other than themselves) posts in their thread
CREATE TRIGGER IF NOT EXISTS notify_thread_owner
AFTER INSERT ON posts
FOR EACH ROW
WHEN (SELECT author_id FROM threads WHERE id = NEW.thread_id) != NEW.author_id
BEGIN
  INSERT INTO notifications(user_id, actor_id, type, entity_type, entity_id, created_at)
  VALUES (
    (SELECT author_id FROM threads WHERE id = NEW.thread_id),
    NEW.author_id,
    'thread_post',
    'post',
    NEW.id,
    STRFTIME('%Y-%m-%d %H:%M:%f','now','localtime')
  );
END;

-- Trigger: notify a user when they receive a new private message
CREATE TRIGGER IF NOT EXISTS notify_on_message
AFTER INSERT ON messages
FOR EACH ROW
WHEN NEW.sender_id != NEW.receiver_id
BEGIN
  INSERT INTO notifications (
    user_id,        
    actor_id,       
    type,           
    entity_type,    
    entity_id,      
    created_at
  ) VALUES (
    NEW.receiver_id,
    NEW.sender_id,
    'message',
    'message',
    NEW.id,
    STRFTIME('%Y-%m-%d %H:%M:%f','now','localtime')
  );
END;

-- Trigger: clear message content when a message is marked as deleted
CREATE TRIGGER IF NOT EXISTS clear_deleted_message_content
AFTER UPDATE OF is_deleted ON messages
FOR EACH ROW
WHEN NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE
BEGIN
  UPDATE messages 
  SET content = NULL 
  WHERE id = NEW.id;
END;

