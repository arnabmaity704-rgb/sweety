import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <span className="brand">🩸 Sweety</span>
        {user && (
          <nav className="nav-links">
            <NavLink to="/readings">Readings</NavLink>
            <NavLink to="/reports">Reports</NavLink>
            <span className="nav-user">Hi, {user.name}</span>
            <button type="button" className="btn btn-small" onClick={logout}>
              Log out
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
