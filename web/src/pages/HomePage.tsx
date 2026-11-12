import { useAuth } from '../auth/AuthContext';

export function HomePage() {
  const { user } = useAuth();
  return (
    <section className="card">
      <h1>Welcome, {user?.name}</h1>
      <p>Your session is active. The auction list will appear here.</p>
    </section>
  );
}