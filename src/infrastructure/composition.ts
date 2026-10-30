import { config } from './config';
import { SystemClock } from './SystemClock';
import { UuidIdGenerator } from './UuidIdGenerator';
import { BcryptPasswordHasher } from './security/BcryptPasswordHasher';
import { JwtTokenService } from './security/JwtTokenService';
import { InMemoryUserRepository } from './persistence/InMemoryUserRepository';
import { InMemoryAuctionRepository } from './persistence/InMemoryAuctionRepository';
import { InMemoryCategoryRepository } from './persistence/InMemoryCategoryRepository';
import { openDatabase } from './persistence/sqlite/database';
import { SqliteUserRepository } from './persistence/sqlite/SqliteUserRepository';
import { SqliteAuctionRepository } from './persistence/sqlite/SqliteAuctionRepository';
import { SqliteCategoryRepository } from './persistence/sqlite/SqliteCategoryRepository';

import { RegisterUserUseCase } from '../application/use-cases/RegisterUserUseCase';
import { LoginUseCase } from '../application/use-cases/LoginUseCase';
import { GetProfileUseCase } from '../application/use-cases/GetProfileUseCase';
import { PublishAuctionUseCase } from '../application/use-cases/PublishAuctionUseCase';
import { ListAuctionsUseCase } from '../application/use-cases/ListAuctionsUseCase';
import { GetAuctionDetailUseCase } from '../application/use-cases/GetAuctionDetailUseCase';
import { CancelAuctionUseCase } from '../application/use-cases/CancelAuctionUseCase';
import { PlaceBidUseCase } from '../application/use-cases/PlaceBidUseCase';
import { ListCategoriesUseCase } from '../application/use-cases/ListCategoriesUseCase';

import { ConsoleEventPublisher } from './events/ConsoleEventPublisher';
import { WebSocketEventPublisher } from './events/WebSocketEventPublisher';
import { CompositeEventPublisher } from './events/CompositeEventPublisher';
import { AuctionRealtimeHub } from './realtime/AuctionRealtimeHub';
import { createApp } from './http/app';


function buildRepositories() {
  if (config.persistence === 'memory') {
    return {
      userRepository: new InMemoryUserRepository(),
      auctionRepository: new InMemoryAuctionRepository(),
      categoryRepository: new InMemoryCategoryRepository(),
    };
  }

  const db = openDatabase(config.databasePath);
  return {
    userRepository: new SqliteUserRepository(db),
    auctionRepository: new SqliteAuctionRepository(db),
    categoryRepository: new SqliteCategoryRepository(db),
  };
}

export function buildApp() {
  const clock = new SystemClock();
  const idGenerator = new UuidIdGenerator();
  const passwordHasher = new BcryptPasswordHasher(config.bcryptSaltRounds);
  const tokenService = new JwtTokenService(config.jwtSecret, config.jwtExpiresIn);

  const realtimeHub = new AuctionRealtimeHub(tokenService);
  const eventPublisher = new CompositeEventPublisher([
    new ConsoleEventPublisher(),
    new WebSocketEventPublisher(realtimeHub, idGenerator),
  ]);

  const { userRepository, auctionRepository, categoryRepository } = buildRepositories();

  const app = createApp({
    registerUserUseCase: new RegisterUserUseCase(userRepository, passwordHasher, idGenerator, clock),
    loginUseCase: new LoginUseCase(userRepository, passwordHasher, tokenService),
    getProfileUseCase: new GetProfileUseCase(userRepository, auctionRepository, clock, idGenerator, eventPublisher),
    publishAuctionUseCase: new PublishAuctionUseCase(auctionRepository, categoryRepository, clock, idGenerator),
    listAuctionsUseCase: new ListAuctionsUseCase(auctionRepository, clock, idGenerator, eventPublisher),
    getAuctionDetailUseCase: new GetAuctionDetailUseCase(auctionRepository, clock, idGenerator, eventPublisher),
    cancelAuctionUseCase: new CancelAuctionUseCase(auctionRepository, idGenerator, clock, eventPublisher),
    placeBidUseCase: new PlaceBidUseCase(auctionRepository, idGenerator, clock, eventPublisher),
    listCategoriesUseCase: new ListCategoriesUseCase(categoryRepository),
    tokenService,
  });

  return { app, realtimeHub };
}