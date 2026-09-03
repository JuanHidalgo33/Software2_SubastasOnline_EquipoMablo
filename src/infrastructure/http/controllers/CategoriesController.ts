import { Request, Response } from 'express';
import { ListCategoriesUseCase } from '../../../application/use-cases/ListCategoriesUseCase';
import { toCategoryResponse } from '../mappers';

export function listCategories(useCase: ListCategoriesUseCase) {
  return async (_req: Request, res: Response): Promise<void> => {
    const categories = await useCase.execute();
    res.status(200).json(categories.map(toCategoryResponse));
  };
}