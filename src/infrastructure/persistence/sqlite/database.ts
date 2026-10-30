import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { SEED_CATEGORIES } from '../InMemoryCategoryRepository';

export type SqliteDatabase = Database.Database;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    registered_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categories (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS auctions (
    id               TEXT PRIMARY KEY,
    seller_id        TEXT NOT NULL REFERENCES users(id),
    category_id      TEXT NOT NULL REFERENCES categories(id),
    item_name        TEXT NOT NULL,
    item_description TEXT NOT NULL,
    item_condition   TEXT NOT NULL,
    base_price       INTEGER NOT NULL,
    min_increment    INTEGER NOT NULL,
    published_at     TEXT NOT NULL,
    closes_at        TEXT NOT NULL,
    status           TEXT NOT NULL,
    winner_id        TEXT
  );

  CREATE TABLE IF NOT EXISTS bids (
    id         TEXT PRIMARY KEY,
    auction_id TEXT NOT NULL REFERENCES auctions(id),
    user_id    TEXT NOT NULL,
    amount     INTEGER NOT NULL,
    date       TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rejected_bid_attempts (
    id               TEXT PRIMARY KEY,
    auction_id       TEXT NOT NULL REFERENCES auctions(id),
    user_id          TEXT NOT NULL,
    attempted_amount NUMERIC,
    reason_code      TEXT NOT NULL,
    reason_message   TEXT NOT NULL,
    date             TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS payment_orders (
    id             TEXT PRIMARY KEY,
    auction_id     TEXT NOT NULL UNIQUE REFERENCES auctions(id),
    winner_id      TEXT NOT NULL,
    amount         INTEGER NOT NULL,
    generated_at   TEXT NOT NULL,
    payment_due_at TEXT NOT NULL,
    status         TEXT NOT NULL
  );
`;

export function openDatabase(filePath: string): SqliteDatabase {
  if (filePath !== ':memory:') {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }

  const db = new Database(filePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);

  const seed = db.prepare('INSERT OR IGNORE INTO categories (id, name) VALUES (?, ?)');
  for (const category of SEED_CATEGORIES) {
    seed.run(category.id, category.name);
  }

  return db;
}