import { Email } from '../value-objects/Email';

export interface User {
  id: string;
  name: string;
  email: Email;

  passwordHash: string;
  registeredAt: Date;
}