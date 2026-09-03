import { Request, Response } from 'express';
import { RegisterUserUseCase } from '../../../application/use-cases/RegisterUserUseCase';
import { LoginUseCase } from '../../../application/use-cases/LoginUseCase';
import { GetProfileUseCase } from '../../../application/use-cases/GetProfileUseCase';
import { toUserResponse, toAuctionResponse } from '../mappers';
import { AuthenticatedRequest } from '../middlewares/authentication';

export function registerUser(useCase: RegisterUserUseCase) {
  return async (req: Request, res: Response): Promise<void> => {
    const user = await useCase.execute(req.body);
    res.status(201).json(toUserResponse(user));
  };
}

export function login(useCase: LoginUseCase) {
  return async (req: Request, res: Response): Promise<void> => {
    const result = await useCase.execute(req.body);
    res.status(200).json({ token: result.token, user: toUserResponse(result.user) });
  };
}

export function getProfile(useCase: GetProfileUseCase) {
  return async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const profile = await useCase.execute(req.userId!);
    res.status(200).json({
      user: toUserResponse(profile.user),
      publishedAuctions: profile.publishedAuctions.map(toAuctionResponse),
      participatedAuctions: profile.participatedAuctions.map(toAuctionResponse),
    });
  };
}