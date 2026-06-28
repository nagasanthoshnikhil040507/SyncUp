import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getMyInvitations } from '../api/invitationApi';

// ── Nav link helper ─────────────────────────────────────────────────────────
const NavItem = ({ to, children }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `text-sm font-medium px-3 py-1.5 rounded-lg transition-colors duration-200
      ${isActive
        ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
      }`
    }
  >
    {children}
  </NavLink>
);

// ── Invitation Badge ─────────────────────────────────────────────────────────
const InviteBadge = ({ count }) => {
  if (!count || count === 0) return null;
  return (
    <span className="ml-1 inline-flex items-center justify-center
      min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold
      bg-primary-600 text-white leading-none">
      {count > 9 ? '9+' : count}
    </span>
  );
};

// ── Avatar initials ─────────────────────────────────────────────────────────
const getInitials = (name = '') =>
  name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

// ── Navbar ──────────────────────────────────────────────────────────────────
const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const dropdownRef = useRef(null);

  // Fetch pending invitation count on mount
  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const res = await getMyInvitations();
        if (res.data.success) {
          const pending = res.data.invitations.filter((inv) => inv.status === 'Pending');
          setPendingCount(pending.length);
        }
      } catch {
        // Silently ignore — badge is non-critical
      }
    };
    if (user) fetchPendingCount();
  }, [user, location.pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 glass border-b border-gray-200/60 dark:border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

        {/* ── Logo ── */}
        <Link
          to="/dashboard"
          className="flex items-center gap-2 shrink-0 group"
        >
          <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center
            group-hover:scale-105 transition-transform duration-200">
            <span className="text-white text-xs font-bold">S</span>
          </div>
          <span className="font-bold text-gray-900 dark:text-white text-base tracking-tight">
            SyncUp
          </span>
        </Link>

        {/* ── Nav links ── */}
        <nav className="hidden sm:flex items-center gap-1">
          <NavItem to="/dashboard">Dashboard</NavItem>
          <NavItem to="/projects">Projects</NavItem>
          <NavLink
            to="/invitations"
            id="nav-invitations"
            className={({ isActive }) =>
              `inline-flex items-center text-sm font-medium px-3 py-1.5 rounded-lg transition-colors duration-200
              ${isActive
                ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
              }`
            }
          >
            Invitations
            <InviteBadge count={pendingCount} />
          </NavLink>
          <NavItem to="/settings">Settings</NavItem>
        </nav>

        {/* ── Right side: avatar dropdown ── */}
        <div className="relative flex items-center" ref={dropdownRef}>
          <button
            id="user-menu-btn"
            onClick={() => setDropdownOpen((o) => !o)}
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
            className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5
              hover:bg-gray-100 dark:hover:bg-white/5 transition-colors duration-200"
          >
            {/* Avatar circle */}
            <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center
              text-white text-xs font-semibold shrink-0 select-none">
              {getInitials(user?.name)}
            </div>
            {/* Name (hidden on small screens) */}
            <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-200 max-w-[120px] truncate">
              {user?.name || 'Account'}
            </span>
            {/* Chevron */}
            <motion.svg
              animate={{ rotate: dropdownOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="w-4 h-4 text-gray-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </motion.svg>
          </button>

          {/* ── Dropdown menu ── */}
          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-52 glass-card py-1.5 shadow-xl"
                role="menu"
              >
                {/* User info header */}
                <div className="px-4 py-2.5 border-b border-gray-200/60 dark:border-white/5 mb-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {user?.name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                </div>

                {/* Menu items */}
                {[
                  { to: '/profile', label: 'Profile', icon: '👤' },
                  { to: '/settings', label: 'Settings', icon: '⚙️' },
                ].map(({ to, label, icon }) => (
                  <Link
                    key={to}
                    to={to}
                    role="menuitem"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700
                      dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5
                      transition-colors duration-150"
                  >
                    <span>{icon}</span>
                    {label}
                  </Link>
                ))}

                {/* Divider + Logout */}
                <div className="border-t border-gray-200/60 dark:border-white/5 mt-1 pt-1">
                  <button
                    id="logout-btn"
                    role="menuitem"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-500
                      hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors duration-150"
                  >
                    <span>🚪</span>
                    Logout
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Mobile nav (shows below sm) ── */}
      <nav className="sm:hidden flex items-center gap-1 px-4 pb-2 overflow-x-auto">
        <NavItem to="/dashboard">Dashboard</NavItem>
        <NavItem to="/projects">Projects</NavItem>
        <NavLink
          to="/invitations"
          className={({ isActive }) =>
            `inline-flex items-center text-sm font-medium px-3 py-1.5 rounded-lg transition-colors duration-200
            ${isActive
              ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
            }`
          }
        >
          Invitations
          <InviteBadge count={pendingCount} />
        </NavLink>
        <NavItem to="/settings">Settings</NavItem>
      </nav>
    </header>
  );
};

export default Navbar;
