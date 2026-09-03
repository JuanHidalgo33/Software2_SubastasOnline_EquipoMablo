import jwt from 'jsonwebtoken';
import { TokenService } from '../../application/ports/TokenService';

export class JwtTokenService implements TokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string,
  ) {}

  generate(userId: string): string {
    return jwt.sign({ sub: userId }, this.secret, { expiresIn: this.expiresIn } as jwt.SignOptions);
  }

  verify(token: string): { userId: string } | null {
    try {
      const payload = jwt.verify(token, this.secret) as { sub: string };
      return { userId: payload.sub };
    } catch {
      return null; // token vencido, alterado, o inválido: no distinguimos el motivo hacia afuera.
    }
  }
}