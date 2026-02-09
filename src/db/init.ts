import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let initialized = false;

export function ensureDb() {
  if (initialized) return;
  initialized = true;

  const dbPath = process.env.DATABASE_URL || './data/tidyhouse.db';
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      avatar_emoji TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS chores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL REFERENCES rooms(id),
      name TEXT NOT NULL,
      frequency_days INTEGER NOT NULL,
      effort TEXT NOT NULL DEFAULT 'medium',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS chore_completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chore_id INTEGER NOT NULL REFERENCES chores(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      completed_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'backlog',
      priority TEXT NOT NULL DEFAULT 'medium',
      target_date TEXT,
      created_at TEXT NOT NULL,
      created_by INTEGER REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      notes TEXT,
      category TEXT,
      due_date TEXT,
      assignee_id INTEGER REFERENCES users(id),
      project_id INTEGER REFERENCES projects(id),
      completed INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      completed_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL,
      created_by INTEGER REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS project_assignees (
      project_id INTEGER NOT NULL REFERENCES projects(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      PRIMARY KEY (project_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS project_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id),
      tag TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS project_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id),
      content_md TEXT NOT NULL,
      created_at TEXT NOT NULL,
      created_by INTEGER REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS project_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id),
      title TEXT NOT NULL,
      assignee_id INTEGER REFERENCES users(id),
      due_date TEXT,
      status TEXT NOT NULL DEFAULT 'todo',
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS project_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id),
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Seed if empty
  const count = sqlite.prepare('SELECT COUNT(*) as c FROM users').get() as any;
  if (count.c === 0) {
    sqlite.exec(`
      INSERT INTO users (id, name, avatar_emoji) VALUES (1, 'User 1', '👨'), (2, 'User 2', '👩');
      INSERT INTO rooms (name, icon, sort_order) VALUES
        ('Kitchen', '🍳', 1), ('Bathroom', '🚿', 2), ('Living Room', '🛋️', 3),
        ('Bedroom', '🛏️', 4), ('Hallway', '🚪', 5), ('Laundry', '👕', 6);
    `);

    const roomRows = sqlite.prepare('SELECT id, name FROM rooms').all() as any[];
    const rm = Object.fromEntries(roomRows.map((r: any) => [r.name, r.id]));
    const now = new Date().toISOString();

    const choreInsert = sqlite.prepare('INSERT INTO chores (room_id, name, frequency_days, effort, created_at) VALUES (?, ?, ?, ?, ?)');
    const choresList = [
      [rm['Kitchen'], 'Wash dishes', 1, 'medium'],
      [rm['Kitchen'], 'Clean countertops', 2, 'quick'],
      [rm['Kitchen'], 'Clean stovetop', 3, 'medium'],
      [rm['Kitchen'], 'Mop floor', 7, 'intensive'],
      [rm['Kitchen'], 'Clean fridge', 14, 'intensive'],
      [rm['Kitchen'], 'Clean oven', 30, 'intensive'],
      [rm['Bathroom'], 'Clean toilet', 3, 'medium'],
      [rm['Bathroom'], 'Clean shower', 7, 'intensive'],
      [rm['Bathroom'], 'Clean sink', 3, 'quick'],
      [rm['Bathroom'], 'Mop floor', 7, 'medium'],
      [rm['Bathroom'], 'Wash towels', 7, 'medium'],
      [rm['Living Room'], 'Vacuum', 3, 'medium'],
      [rm['Living Room'], 'Dust surfaces', 7, 'medium'],
      [rm['Living Room'], 'Clean windows', 30, 'intensive'],
      [rm['Living Room'], 'Tidy up', 1, 'quick'],
      [rm['Bedroom'], 'Make bed', 1, 'quick'],
      [rm['Bedroom'], 'Change sheets', 7, 'medium'],
      [rm['Bedroom'], 'Vacuum', 7, 'medium'],
      [rm['Bedroom'], 'Dust', 14, 'medium'],
      [rm['Hallway'], 'Vacuum', 7, 'medium'],
      [rm['Hallway'], 'Mop', 14, 'medium'],
      [rm['Hallway'], 'Organize shoes', 7, 'quick'],
      [rm['Laundry'], 'Do laundry', 3, 'medium'],
      [rm['Laundry'], 'Iron clothes', 7, 'intensive'],
      [rm['Laundry'], 'Clean machine', 30, 'medium'],
    ];
    for (const [roomId, name, freq, effort] of choresList) {
      choreInsert.run(roomId, name, freq, effort, now);
    }
  }

  // Migrations for existing databases
  try {
    sqlite.exec(`ALTER TABLE todos ADD COLUMN category TEXT`);
  } catch (e) {
    // Column already exists
  }

  // Migration: add content_html column to project_notes and updated_at
  try {
    sqlite.exec(`ALTER TABLE project_notes ADD COLUMN content_html TEXT`);
  } catch (e) {
    // Column already exists
  }
  try {
    sqlite.exec(`ALTER TABLE project_notes ADD COLUMN updated_at TEXT`);
  } catch (e) {
    // Column already exists
  }
  // Migrate existing markdown notes to HTML (simple conversion)
  try {
    const mdNotes = sqlite.prepare(`SELECT id, content_md FROM project_notes WHERE content_html IS NULL AND content_md IS NOT NULL`).all() as any[];
    const updateStmt = sqlite.prepare(`UPDATE project_notes SET content_html = ? WHERE id = ?`);
    for (const note of mdNotes) {
      // Simple conversion: wrap in paragraph tags
      const html = note.content_md.split('\n').map((line: string) => line ? `<p>${line}</p>` : '').join('');
      updateStmt.run(html || '<p></p>', note.id);
    }
  } catch (e) {
    // ignore
  }

  // Migration: add priority column to todos
  try {
    sqlite.exec(`ALTER TABLE todos ADD COLUMN priority TEXT`);
  } catch (e) {
    // Column already exists
  }

  // Migration: add show_in_todos column to project_tasks
  try {
    sqlite.exec(`ALTER TABLE project_tasks ADD COLUMN show_in_todos INTEGER NOT NULL DEFAULT 0`);
  } catch (e) {
    // Column already exists
  }

  sqlite.close();
}
