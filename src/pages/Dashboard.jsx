import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserSubscriptions } from '../services/db';
import { getUserGroups } from '../services/db';
import { scheduleRenewalNotifications } from '../services/notifications';
import SMSScannerModal from '../components/SMSScannerModal';
import { differenceInDays, addMonths, format } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Link } from 'react-router-dom';
import styles from './Dashboard.module.css';

const COLORS = ['#6c63ff', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#ec4899', '#8b5cf6'];

const CATEGORY_ICONS = {
  Entertainment: '🎬', Music: '🎵', Software: '💻', Gaming: '🎮',
  Health: '💪', Food: '🍔', Shopping: '🛍️', News: '📰',
  Education: '📚', Finance: '💰', Other: '📦'
};

export default function Dashboard() {
  const { user, currency } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [subs, grps] = await Promise.all([
        getUserSubscriptions(user.uid),
        getUserGroups(user.uid)
      ]);
      setSubscriptions(subs);
      setGroups(grps);
      // Auto-trigger 1-day-before renewal alerts
      scheduleRenewalNotifications(subs);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const totalMonthly = subscriptions.reduce((s, sub) => s + (sub.cost || 0), 0);
  const totalYearly = totalMonthly * 12;

  const upcomingRenewals = subscriptions
    .filter(s => s.renewalDate)
    .map(s => {
      const days = differenceInDays(new Date(s.renewalDate), new Date());
      return { ...s, daysLeft: days };
    })
    .filter(s => s.daysLeft >= 0 && s.daysLeft <= 14)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const categoryData = subscriptions.reduce((acc, s) => {
    const cat = s.category || 'Other';
    const existing = acc.find(a => a.name === cat);
    if (existing) existing.value += s.cost || 0;
    else acc.push({ name: cat, value: s.cost || 0 });
    return acc;
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) return (
    <div className={styles.loadingState}>
      <div className={styles.loadSpinner}></div>
    </div>
  );

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.greeting}>
            {greeting()}, {user?.displayName?.split(' ')[0] || 'there'} 👋
          </h1>
          <p className={styles.subGreeting}>Here's your financial overview</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowScanner(true)}
            style={{
              padding: '10px 16px',
              background: 'rgba(108,99,255,0.15)',
              border: '1px solid rgba(108,99,255,0.4)',
              borderRadius: '10px',
              color: '#a78bfa',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>📱</span> Scan SMS
          </button>
          <Link to="/subscriptions" className={styles.addBtn}>+ Add Subscription</Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>💸</div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>{currency.symbol}{totalMonthly.toFixed(2)}</div>
            <div className={styles.statLabel}>Monthly spend ({currency.code})</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📅</div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>{currency.symbol}{totalYearly.toFixed(0)}</div>
            <div className={styles.statLabel}>Yearly spend</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📋</div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>{subscriptions.length}</div>
            <div className={styles.statLabel}>Active subscriptions</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>🤝</div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>{groups.length}</div>
            <div className={styles.statLabel}>Split groups</div>
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Spending by Category Chart */}
        <div className={styles.chartCard}>
          <h2 className={styles.cardTitle}>Spending by Category</h2>
          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => [`${currency.symbol}${v.toFixed(2)}`, 'Monthly']}
                    contentStyle={{ background: '#1e1e35', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}
                    labelStyle={{ color: '#f8fafc' }}
                    itemStyle={{ color: '#94a3b8' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className={styles.legend}>
                {categoryData.map((c, i) => (
                  <div key={c.name} className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: COLORS[i % COLORS.length] }}></span>
                    <span className={styles.legendName}>{c.name}</span>
                    <span className={styles.legendVal}>{currency.symbol}{c.value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className={styles.emptyState}>
              <span>📊</span>
              <p>Add subscriptions to see spending breakdown</p>
              <Link to="/subscriptions" className={styles.emptyLink}>Add now →</Link>
            </div>
          )}
        </div>

        {/* Upcoming Renewals */}
        <div className={styles.renewalCard}>
          <h2 className={styles.cardTitle}>⏰ Upcoming Renewals</h2>
          {upcomingRenewals.length > 0 ? (
            <div className={styles.renewalList}>
              {upcomingRenewals.map(sub => (
                <div key={sub.id} className={styles.renewalItem}>
                  <div className={styles.renewalIcon}>
                    {CATEGORY_ICONS[sub.category] || '📦'}
                  </div>
                  <div className={styles.renewalInfo}>
                    <div className={styles.renewalName}>{sub.name}</div>
                    <div className={styles.renewalDate}>
                      {sub.daysLeft === 0 ? 'Today!' : `${sub.daysLeft} days`}
                    </div>
                  </div>
                  <div className={styles.renewalCost}>{currency.symbol}{sub.cost}/mo</div>
                  {sub.daysLeft <= 3 && (
                    <span className={styles.urgentBadge}>⚠️</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <span>🎉</span>
              <p>No renewals in the next 14 days</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Subscriptions */}
      <div className={styles.recentCard}>
        <div className={styles.recentHeader}>
          <h2 className={styles.cardTitle}>Recent Subscriptions</h2>
          <Link to="/subscriptions" className={styles.viewAll}>View all →</Link>
        </div>
        {subscriptions.length > 0 ? (
          <div className={styles.subList}>
            {subscriptions.slice(0, 5).map(sub => (
              <div key={sub.id} className={styles.subItem}>
                <div className={styles.subIcon}>{CATEGORY_ICONS[sub.category] || '📦'}</div>
                <div className={styles.subInfo}>
                  <div className={styles.subName}>{sub.name}</div>
                  <div className={styles.subCat}>{sub.category}</div>
                </div>
                <div className={styles.subCost}>
                  <span className={styles.costAmount}>{currency.symbol}{sub.cost}</span>
                  <span className={styles.costPeriod}>/mo</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <span>📋</span>
            <p>No subscriptions yet. Start tracking your expenses!</p>
            <Link to="/subscriptions" className={styles.emptyLink}>Add your first subscription →</Link>
          </div>
        )}
      </div>

      {/* AI Insight Teaser */}
      <div className={styles.aiTeaser}>
        <div className={styles.aiTeaserLeft}>
          <span className={styles.aiIcon}>🤖</span>
          <div>
            <div className={styles.aiTitle}>Get AI-Powered Insights</div>
            <div className={styles.aiDesc}>
              Let Gemini AI analyze your spending and find ways to save money
            </div>
          </div>
        </div>
        <Link to="/insights" className={styles.aiBtn}>Analyze Now →</Link>
      </div>

      {/* SMS Scanner Modal */}
      <SMSScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onImportSuccess={load}
      />
    </div>
  );
}
