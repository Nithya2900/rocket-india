import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
  }
});

// Helper for promise-based queries
export function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Initialize tables based on ER diagram
export async function initDb() {
  await run(`PRAGMA foreign_keys = ON;`);

  // User entity
  await run(`
    CREATE TABLE IF NOT EXISTS User (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT DEFAULT 'participant'
    );
  `);

  // Event entity
  await run(`
    CREATE TABLE IF NOT EXISTS Event (
      eid INTEGER PRIMARY KEY AUTOINCREMENT,
      ename TEXT NOT NULL,
      datetime TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      seats INTEGER NOT NULL,
      status TEXT CHECK(status IN ('open', 'closed')) DEFAULT 'open'
    );
  `);

  // organiser entity (links User as Organiser to Event)
  await run(`
    CREATE TABLE IF NOT EXISTS organiser (
      orgid INTEGER PRIMARY KEY AUTOINCREMENT,
      id INTEGER NOT NULL,
      eid INTEGER NOT NULL,
      ename TEXT NOT NULL,
      FOREIGN KEY (id) REFERENCES User(id) ON DELETE CASCADE,
      FOREIGN KEY (eid) REFERENCES Event(eid) ON DELETE CASCADE
    );
  `);

  // Registration entity
  await run(`
    CREATE TABLE IF NOT EXISTS Registration (
      reg_id INTEGER PRIMARY KEY AUTOINCREMENT,
      id INTEGER NOT NULL,
      eid INTEGER NOT NULL,
      status TEXT DEFAULT 'confirmed',
      FOREIGN KEY (id) REFERENCES User(id) ON DELETE CASCADE,
      FOREIGN KEY (eid) REFERENCES Event(eid) ON DELETE CASCADE
    );
  `);

  // Participants entity
  await run(`
    CREATE TABLE IF NOT EXISTS Participants (
      pid INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      eid INTEGER NOT NULL,
      ename TEXT NOT NULL,
      regid INTEGER NOT NULL,
      status TEXT DEFAULT 'registered',
      FOREIGN KEY (eid) REFERENCES Event(eid) ON DELETE CASCADE,
      FOREIGN KEY (regid) REFERENCES Registration(reg_id) ON DELETE CASCADE
    );
  `);

  // Check in entity
  await run(`
    CREATE TABLE IF NOT EXISTS CheckIn (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reg_id INTEGER NOT NULL,
      eid INTEGER NOT NULL,
      checkin_status TEXT CHECK(checkin_status IN ('pending', 'checked_in')) DEFAULT 'pending',
      FOREIGN KEY (reg_id) REFERENCES Registration(reg_id) ON DELETE CASCADE,
      FOREIGN KEY (eid) REFERENCES Event(eid) ON DELETE CASCADE
    );
  `);

  // Seed sample data if empty
  const userCount = await get(`SELECT COUNT(*) as count FROM User`);
  if (userCount.count === 0) {
    console.log('Seeding initial data...');

    // Users
    const u1 = await run(`INSERT INTO User (name, email, role) VALUES ('Alice Organiser', 'alice@techconf.org', 'organiser')`);
    const u2 = await run(`INSERT INTO User (name, email, role) VALUES ('Bob Dev', 'bob@developer.io', 'participant')`);
    const u3 = await run(`INSERT INTO User (name, email, role) VALUES ('Charlie Engineer', 'charlie@code.com', 'participant')`);

    // Events
    const e1 = await run(`INSERT INTO Event (ename, datetime, capacity, seats, status) VALUES ('AI & Cloud Summit 2026', '2026-10-15 10:00', 50, 48, 'open')`);
    const e2 = await run(`INSERT INTO Event (ename, datetime, capacity, seats, status) VALUES ('FullStack Developers Meetup', '2026-10-20 18:30', 2, 0, 'closed')`);

    // Organiser link
    await run(`INSERT INTO organiser (id, eid, ename) VALUES (?, ?, ?)`, [u1.lastID, e1.lastID, 'AI & Cloud Summit 2026']);

    // Registrations & Participants & Check-ins for Bob
    const reg1 = await run(`INSERT INTO Registration (id, eid, status) VALUES (?, ?, 'confirmed')`, [u2.lastID, e1.lastID]);
    await run(`INSERT INTO Participants (name, eid, ename, regid, status) VALUES ('Bob Dev', ?, 'AI & Cloud Summit 2026', ?, 'registered')`, [e1.lastID, reg1.lastID]);
    await run(`INSERT INTO CheckIn (reg_id, eid, checkin_status) VALUES (?, ?, 'pending')`, [reg1.lastID, e1.lastID]);

    // Registrations & Participants & Check-ins for Charlie
    const reg2 = await run(`INSERT INTO Registration (id, eid, status) VALUES (?, ?, 'confirmed')`, [u3.lastID, e1.lastID]);
    await run(`INSERT INTO Participants (name, eid, ename, regid, status) VALUES ('Charlie Engineer', ?, 'AI & Cloud Summit 2026', ?, 'checked_in')`, [e1.lastID, reg2.lastID]);
    await run(`INSERT INTO CheckIn (reg_id, eid, checkin_status) VALUES (?, ?, 'checked_in')`, [reg2.lastID, e1.lastID]);

    console.log('Seeding complete.');
  }
}

export default db;
