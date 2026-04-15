const Database = require('better-sqlite3')
const db = new Database('site.db')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    createdAt TEXT DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS heroes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    attribute TEXT CHECK (attribute IN ('str', 'agl', 'int')),
    str INT NOT NULL,
    agl INT NOT NULL,
    int INT NOT NULL,
    movementSpeed INT NOT NULL,
    hp INT NOT NULL,
    description TEXT  NOT NULL,
    createdBy INTEGER NOT NULL,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS spell (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    heroesId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    title TEXT NOT NULL,
    key TEXT CHECK (key IN ('q', 'w', 'e', 'd', 'f', 'r')),
    manaCost INTEGER NOT NULL,
    cooldown INTEGER NOT NULL,
    description TEXT  NOT NULL,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (heroesId) REFERENCES heroes(id) ON DELETE CASCADE
  );
`);

module.exports = db