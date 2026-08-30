import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { logout } from '../services/auth';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import styles from './Layout.module.css';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '🏠', end: true },
  { path: '/subscriptions', label: 'Subscriptions', icon: '📋' },
  { path: '/billsplit', label: 'Bill Split', icon: '🤝' },
  { path: '/insights', label: 'AI Insights', icon: '🤖' },
  { path: '/profile', label: 'Profile', icon: '👤' },
];

export default function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div className={styles.wrapper}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>💸</span>
          <span className={styles.logoText}>BillSplit AI</span>
        </div>
        <nav className={styles.nav}>
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className={styles.sidebarBottom}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>
              {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
            </div>
            <div className={styles.userDetails}>
              <div className={styles.userName}>{user?.displayName || 'User'}</div>
              <div className={styles.userEmail}>{user?.email}</div>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={styles.main}>
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className={styles.mobileNav}>
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `${styles.mobileNavItem} ${isActive ? styles.mobileActive : ''}`
            }
          >
            <span className={styles.mobileIcon}>{item.icon}</span>
            <span className={styles.mobileLabel}>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
