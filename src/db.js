import Database from 'better-sqlite3';

// initialize the database
const db = new Database('db/history.db');


// create the table if it doesn't exist
db.prepare(`CREATE TABLE IF NOT EXISTS history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT,
  title TEXT,
  timestamp TEXT
)`).run();


export function insertHistory(url, title) {
    const latest = getHistory(1),
        timestamp = new Date().toISOString();

    if (latest?.at(0)?.url === url) return;
    const stmt = db.prepare(`INSERT INTO history (url, title, timestamp) VALUES (?, ?, ?)`);
    stmt.run(url, title, timestamp);
}


export function deleteHistory(id) {
    const stmt = db.prepare(`DELETE FROM history WHERE id = ?`);
    stmt.run(id);
}


export function editHistory(id, newUrl, newTitle) {
    const stmt = db.prepare(`UPDATE history SET url = ?, title = ? WHERE id = ?`);
    stmt.run(newUrl, newTitle, id);
}


export function getHistory(limit = 50, offset = 0) {
    const stmt = db.prepare(`SELECT * FROM history ORDER BY timestamp DESC LIMIT ? OFFSET ?`);
    return stmt.all(limit, offset);
}
