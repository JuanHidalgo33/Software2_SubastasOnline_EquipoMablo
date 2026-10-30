import { Category } from '../../../domain/entities/Category';
import { CategoryRepository } from '../../../domain/ports/CategoryRepository';
import { SqliteDatabase } from './database';

export class SqliteCategoryRepository implements CategoryRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async findAll(): Promise<Category[]> {
    return this.db.prepare('SELECT id, name FROM categories ORDER BY name').all() as Category[];
  }

  async findById(id: string): Promise<Category | undefined> {
    return this.db.prepare('SELECT id, name FROM categories WHERE id = ?').get(id) as Category | undefined;
  }
}