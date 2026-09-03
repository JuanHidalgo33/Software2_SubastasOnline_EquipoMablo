import { Category } from '../../domain/entities/Category';
import { CategoryRepository } from '../../domain/ports/CategoryRepository';

const SEED_CATEGORIES: Category[] = [
  { id: 'cat-electronics', name: 'Electronics' },
  { id: 'cat-home', name: 'Home' },
  { id: 'cat-vehicles', name: 'Vehicles' },
];

export class InMemoryCategoryRepository implements CategoryRepository {
  private readonly categories = new Map<string, Category>(
    SEED_CATEGORIES.map((category) => [category.id, category]),
  );

  async findAll(): Promise<Category[]> {
    return [...this.categories.values()];
  }

  async findById(id: string): Promise<Category | undefined> {
    return this.categories.get(id);
  }
}