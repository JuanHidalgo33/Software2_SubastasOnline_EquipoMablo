import { Email } from '../../domain/value-objects/Email';
import { User } from '../../domain/entities/User';
import { UserRepository } from '../../domain/ports/UserRepository';
import { Clock } from '../../domain/ports/Clock';
import { IdGenerator } from '../../domain/ports/IdGenerator';
import { PasswordHasher } from '../ports/PasswordHasher';
import { DomainError } from '../../domain/errors/DomainError';

export interface RegisterUserInput {
  name: string;
  email: string;
  password: string;
}

export class RegisterUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: RegisterUserInput): Promise<User> {
    const email = Email.of(input.email);

    const existingUser = await this.userRepository.findByEmail(email.value);
    if (existingUser) {
      throw new DomainError('EMAIL_ALREADY_REGISTERED', 'This email is already registered (RN-22).');
    }

    const passwordHash = await this.passwordHasher.hash(input.password);

    const user: User = {
      id: this.idGenerator.generate(),
      name: input.name,
      email,
      passwordHash,
      registeredAt: this.clock.now(),
    };

    await this.userRepository.save(user);
    return user;
  }
}