import { request } from './client';
import type { LoginResponse, User } from './types';

export function registerUser(data: { name: string; email: string; password: string }): Promise<User> {
  return request<User>('/users', { method: 'POST', body: data });
}

export function login(data: { email: string; password: string }): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', { method: 'POST', body: data });
}