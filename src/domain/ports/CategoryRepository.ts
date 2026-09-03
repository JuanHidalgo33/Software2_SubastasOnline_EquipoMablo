import { Category } from '../entities/Category';

export interface CategoryRepository {
  findAll(): Promise<Category[]>;
  findById(id: string): Promise<Category | undefined>;
}