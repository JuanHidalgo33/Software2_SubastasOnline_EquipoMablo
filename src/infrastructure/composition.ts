import { config } from './config';
import { SystemClock } from './SystemClock';
import { UuidIdGenerator } from './UuidIdGenerator';
import { BcryptPasswordHasher } from './security/BcryptPasswordHasher';
import { JwtTokenService } from './security/JwtTokenService';
import { InMemoryUserRepository } from './persistence/InMemoryUserRepository';
import { InMemoryAuctionRepository } from './persistence/InMemoryAuctionRepository';
import { InMemoryCategoryRepository } from './persistence/InMemoryCategoryRepository';

import { RegisterUserUseCase } from '../application/use-cases/RegisterUserUseCase';
import { LoginUseCase } from '../application/use-cases/LoginUseCase';
import { GetProfileUseCase } from '../application/use-cases/GetProfileUseCase';
import { PublishAuctionUseCase } from '../application/use-cases/PublishAuctionUseCase';
import { ListAuctionsUseCase } from '../application/use-cases/ListAuctionsUseCase';
import { GetAuctionDetailUseCase } from '../application/use-cases/GetAuctionDetailUseCase';
import { CancelAuctionUseCase } from '../application/use-cases/CancelAuctionUseCase';
import { PlaceBidUseCase } from '../application/use-cases/PlaceBidUseCase';
import { ListCategoriesUseCase } from '../application/use-cases/ListCategoriesUseCase';

import { createApp } from './http/app';

export function buildApp() {
  const clock = new SystemClock();
  const idGenerator = new UuidIdGenerator();
  const passwordHasher = new BcryptPasswordHasher(config.bcryptSaltRounds);
  const tokenService = new JwtTokenService(config.jwtSecret, config.jwtExpiresIn);

  const userRepository = new InMemoryUserRepository();
  const auctionRepository = new InMemoryAuctionRepository();
  const categoryRepository = new InMemoryCategoryRepository();

  return createApp({
    registerUserUseCase: new RegisterUserUseCase(userRepository, passwordHasher, idGenerator, clock),
    loginUseCase: new LoginUseCase(userRepository, passwordHasher, tokenService),
    getProfileUseCase: new GetProfileUseCase(userRepository, auctionRepository),
    publishAuctionUseCase: new PublishAuctionUseCase(auctionRepository, categoryRepository, clock, idGenerator),
    listAuctionsUseCase: new ListAuctionsUseCase(auctionRepository, clock, idGenerator),
    getAuctionDetailUseCase: new GetAuctionDetailUseCase(auctionRepository, clock, idGenerator),
    cancelAuctionUseCase: new CancelAuctionUseCase(auctionRepository, idGenerator, clock),
    placeBidUseCase: new PlaceBidUseCase(auctionRepository, idGenerator, clock),
    listCategoriesUseCase: new ListCategoriesUseCase(categoryRepository),
    tokenService,
  });
}