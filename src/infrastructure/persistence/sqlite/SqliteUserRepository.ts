import { User } from '../../../domain/entities/User';
import { UserRepository } from '../../../domain/ports/UserRepository';
import { Email } from '../../../domain/value-objects/Email';
import { SqliteDatabase } from './database';

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  registered_at: string;
}

export class SqliteUserRepository implements UserRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async save(user: User): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO users (id, name, email, password_hash, registered_at)
         VALUES (@id, @name, @email, @passwordHash, @registeredAt)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, email = excluded.email, password_hash = excluded.password_hash`,
      )
      .run({
        id: user.id,
        name: user.name,
        email: user.email.value,
        passwordHash: user.passwordHash,
        registeredAt: user.registeredAt.toISOString(),
      });
  }

  async findById(id: string): Promise<User | undefined> {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
    return row ? toUser(row) : undefined;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const row = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
    return row ? toUser(row) : undefined;
  }
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: Email.of(row.email),
    passwordHash: row.password_hash,
    registeredAt: new Date(row.registered_at),
  };
}