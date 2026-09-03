import { Category } from '../../domain/entities/Category';
import { CategoryRepository } from '../../domain/ports/CategoryRepository';

export class ListCategoriesUseCase {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(): Promise<Category[]> {
    return this.categoryRepository.findAll();
  }
}