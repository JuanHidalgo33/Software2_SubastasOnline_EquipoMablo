import { Request, Response } from 'express';
import { HandlePaymentNotificationUseCase } from '../../../application/use-cases/HandlePaymentNotificationUseCase';

export function receivePaymentNotification(useCase: HandlePaymentNotificationUseCase) {
  return async (req: Request, res: Response): Promise<void> => {
    const result = await useCase.execute(req.body);
    res.status(200).json(result);
  };
}
