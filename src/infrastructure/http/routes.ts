import { Router } from 'express';
import { asyncHandler } from './asyncHandler';
import { authenticate } from './middlewares/authentication';
import * as UsersController from './controllers/UsersController';
import * as AuctionsController from './controllers/AuctionsController';
import * as CategoriesController from './controllers/CategoriesController';
import { RegisterUserUseCase } from '../../application/use-cases/RegisterUserUseCase';
import { LoginUseCase } from '../../application/use-cases/LoginUseCase';
import { GetProfileUseCase } from '../../application/use-cases/GetProfileUseCase';
import { PublishAuctionUseCase } from '../../application/use-cases/PublishAuctionUseCase';
import { ListAuctionsUseCase } from '../../application/use-cases/ListAuctionsUseCase';
import { GetAuctionDetailUseCase } from '../../application/use-cases/GetAuctionDetailUseCase';
import { CancelAuctionUseCase } from '../../application/use-cases/CancelAuctionUseCase';
import { PlaceBidUseCase } from '../../application/use-cases/PlaceBidUseCase';
import { ListCategoriesUseCase } from '../../application/use-cases/ListCategoriesUseCase';
import { TokenService } from '../../application/ports/TokenService';

export interface RouterDependencies {
  registerUserUseCase: RegisterUserUseCase;
  loginUseCase: LoginUseCase;
  getProfileUseCase: GetProfileUseCase;
  publishAuctionUseCase: PublishAuctionUseCase;
  listAuctionsUseCase: ListAuctionsUseCase;
  getAuctionDetailUseCase: GetAuctionDetailUseCase;
  cancelAuctionUseCase: CancelAuctionUseCase;
  placeBidUseCase: PlaceBidUseCase;
  listCategoriesUseCase: ListCategoriesUseCase;
  tokenService: TokenService;
}

export function buildRouter(deps: RouterDependencies): Router {
  const router = Router();
  const requireAuth = authenticate(deps.tokenService);

  router.post('/users', asyncHandler(UsersController.registerUser(deps.registerUserUseCase)));
  router.post('/auth/login', asyncHandler(UsersController.login(deps.loginUseCase)));
  router.get('/users/profile', requireAuth, asyncHandler(UsersController.getProfile(deps.getProfileUseCase)));

  router.get('/categories', asyncHandler(CategoriesController.listCategories(deps.listCategoriesUseCase)));

  router.post('/auctions', requireAuth, asyncHandler(AuctionsController.publishAuction(deps.publishAuctionUseCase)));
  router.get('/auctions', asyncHandler(AuctionsController.listAuctions(deps.listAuctionsUseCase)));
  router.get('/auctions/:id', asyncHandler(AuctionsController.getAuctionDetail(deps.getAuctionDetailUseCase)));
  router.post('/auctions/:id/cancel', requireAuth, asyncHandler(AuctionsController.cancelAuction(deps.cancelAuctionUseCase)));
  router.post('/auctions/:id/bids', requireAuth, asyncHandler(AuctionsController.placeBid(deps.placeBidUseCase)));

  return router;
}