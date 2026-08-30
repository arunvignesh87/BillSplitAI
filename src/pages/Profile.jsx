import { useState, useEffect } from 'react';
import { useAuth, CURRENCIES } from '../context/AuthContext';
import { updateProfile as updateAuthProfile } from 'firebase/auth';
import { logout } from '../services/auth';
import { auth } from '../services/firebase';
import { requestNotificationPermission, getNotificationPermission, showNotification } from '../services/notifications';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import styles from './Profile.module.css';

export default function Profile() {
  const { user, profile, currency, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [selectedCurrency, setSelectedCurrency] = useState(profile?.currency || 'USD');
  const [notifPermission, setNotifPermission] = useState(getNotificationPermission());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.currency) setSelectedCurrency(profile.currency);
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (auth.currentUser && displayName !== user?.displayName) {
        await updateAuthProfile(auth.currentUser, { displayName });
      }
      await updateProfile({
        displayName,
        currency: selectedCurrency,
        currencySet: true,
      });
      toast.success('Profile & currency updated!');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotifPermission(granted ? 'granted' : 'denied');
    if (granted) {
      toast.success('Renewal alerts enabled!');
      showNotification('🔔 Alerts Active', 'We will alert you 1 day before any subscription renews.');
      await updateProfile({ notificationsEnabled: true });
    } else {
      toast.error('Notification permission was not granted in browser settings');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Profile & Settings</h1>
        <p className={styles.subtitle}>Manage your account</p>
      </div>

      <div className={styles.grid}>
        {/* Profile */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>👤 Your Profile</h2>
          <div className={styles.avatarSection}>
            <div className={styles.avatar}>
              {(user?.displayName || user?.email || '?')[0].toUpperCase()}
            </div>
            <div>
              <div className={styles.userName}>{user?.displayName || 'User'}</div>
              <div className={styles.userEmail}>{user?.email}</div>
            </div>
          </div>
          <div className={styles.field}>
            <label>Display Name</label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className={styles.field}>
            <label>Email</label>
            <input value={user?.email} disabled />
          </div>
          <div className={styles.field}>
            <label>Preferred Currency</label>
            <select
              value={selectedCurrency}
              onChange={e => setSelectedCurrency(e.target.value)}
              className={styles.select}
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Notifications & Reminders */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>🔔 Renewal Reminders (1 Day Before)</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '14px' }}>
            Get an automatic push notification 24 hours before any subscription renews so you can cancel in time and save money!
          </p>
          <div className={styles.infoRow} style={{ marginBottom: '16px' }}>
            <span>Status</span>
            <span className={styles.badge} style={{
              background: notifPermission === 'granted' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: notifPermission === 'granted' ? '#10b981' : '#ef4444',
              borderColor: notifPermission === 'granted' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'
            }}>
              {notifPermission === 'granted' ? 'Active ✅' : 'Inactive ❌'}
            </span>
          </div>
          {notifPermission !== 'granted' ? (
            <button
              className={styles.saveBtn}
              onClick={handleEnableNotifications}
              style={{ background: 'linear-gradient(135deg, #10b981, #34d399)' }}
            >
              🔔 Enable 1-Day-Before Alerts
            </button>
          ) : (
            <button
              className={styles.saveBtn}
              onClick={() => showNotification('⏰ Test Alert', 'Your Netflix subscription will renew tomorrow for $15.49.')}
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              🧪 Send Test Notification
            </button>
          )}
        </div>

        {/* Stats */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>📊 Account Info</h2>
          <div className={styles.infoList}>
            <div className={styles.infoRow}>
              <span>Account Type</span>
              <span className={styles.badge}>Free Plan</span>
            </div>
            <div className={styles.infoRow}>
              <span>Member since</span>
              <span>{user?.metadata?.creationTime
                ? new Date(user.metadata.creationTime).toLocaleDateString()
                : 'N/A'
              }</span>
            </div>
            <div className={styles.infoRow}>
              <span>Sign-in method</span>
              <span>{user?.providerData?.[0]?.providerId === 'google.com' ? '🔵 Google' : '📧 Email'}</span>
            </div>
          </div>

          {/* Premium card */}
          <div className={styles.premiumCard}>
            <div className={styles.premiumIcon}>⭐</div>
            <div>
              <div className={styles.premiumTitle}>Upgrade to Premium</div>
              <div className={styles.premiumDesc}>PDF exports, advanced analytics, and more</div>
            </div>
            <button className={styles.premiumBtn}>$2.99/mo</button>
          </div>
        </div>

        {/* About */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>ℹ️ About BillSplit AI</h2>
          <div className={styles.aboutList}>
            {[
              { icon: '💸', label: 'Track subscriptions', desc: 'Monitor all your recurring expenses' },
              { icon: '🤝', label: 'Split bills', desc: 'Fair settlement calculation with friends' },
              { icon: '🤖', label: 'AI Insights', desc: 'Gemini AI powered spending analysis' },
              { icon: '🔒', label: 'Secure', desc: 'Your data is encrypted and private' },
            ].map(f => (
              <div key={f.label} className={styles.aboutRow}>
                <span className={styles.aboutIcon}>{f.icon}</span>
                <div>
                  <div className={styles.aboutLabel}>{f.label}</div>
                  <div className={styles.aboutDesc}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.version}>Version 1.0.0 · Built with ❤️ + Gemini AI</div>
        </div>

        {/* Danger zone */}
        <div className={`${styles.card} ${styles.dangerCard}`}>
          <h2 className={styles.cardTitle}>⚠️ Account Actions</h2>
          <p className={styles.dangerDesc}>Signing out will end your current session.</p>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            🚪 Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
