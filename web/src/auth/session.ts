import type { User } from '../api/types';

const STORAGE_KEY = 'subastas.session';

export interface Session {
  token: string;
  user: User;
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    return isExpired(session.token) ? null : session;
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.warn('Could not save the session.', error);
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Could not clear the session.', error);
  }
}

function isExpired(token: string): boolean {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64)) as { exp?: number };
    return payload.exp !== undefined && payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}