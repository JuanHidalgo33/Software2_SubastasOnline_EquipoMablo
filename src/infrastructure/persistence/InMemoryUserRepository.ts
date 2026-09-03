import { User } from '../../domain/entities/User';
import { UserRepository } from '../../domain/ports/UserRepository';

export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  async save(user: User): Promise<void> {
    this.users.set(user.id, user);
  }

  async findById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return [...this.users.values()].find((user) => user.email.value === email);
  }
}