import { Link, NavLink, Outlet } from 'react-router-dom';
import logo from '../assets/logo.png';
import { useAuth } from '../auth/AuthContext';
import { ThemeToggle } from './ThemeToggle';

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">
          <img src={logo} alt="" className="brand-logo" />
          <span>Mablo Auctions</span>
        </Link>
        <nav>
          {user ? (
            <>
              <NavLink to="/" end>
                Auctions
              </NavLink>
              <NavLink to="/auctions/new">Publish</NavLink>
              <span className="user">{user.name}</span>
              <button type="button" className="secondary" onClick={logout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/" end>
                Auctions
              </NavLink>
              <NavLink to="/login">Log in</NavLink>
              <NavLink to="/register">Sign up</NavLink>
            </>
          )}
          <ThemeToggle />
        </nav>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </>
  );
}