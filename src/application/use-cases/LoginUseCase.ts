import { UserRepository } from '../../domain/ports/UserRepository';
import { PasswordHasher } from '../ports/PasswordHasher';
import { TokenService } from '../ports/TokenService';
import { User } from '../../domain/entities/User';
import { ApplicationError } from '../errors/ApplicationError';

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginOutput {
  token: string;
  user: User;
}

export class LoginUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    const user = await this.userRepository.findByEmail(input.email);

    // Mismo error tanto si el correo no existe como si la contraseña no coincide.
    if (!user) {
      throw new ApplicationError('INVALID_CREDENTIALS', 'Email or password is incorrect.', 401);
    }

    const passwordMatches = await this.passwordHasher.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new ApplicationError('INVALID_CREDENTIALS', 'Email or password is incorrect.', 401);
    }

    const token = this.tokenService.generate(user.id);
    return { token, user };
  }
}