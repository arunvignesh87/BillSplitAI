import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getUserSubscriptions, addSubscription, updateSubscription, deleteSubscription
} from '../services/db';
import SMSScannerModal from '../components/SMSScannerModal';
import toast from 'react-hot-toast';
import styles from './Subscriptions.module.css';

const CATEGORIES = [
  'Entertainment', 'Music', 'Software', 'Gaming', 'Health',
  'Food', 'Shopping', 'News', 'Education', 'Finance', 'Other'
];

const CATEGORY_ICONS = {
  Entertainment: '🎬', Music: '🎵', Software: '💻', Gaming: '🎮',
  Health: '💪', Food: '🍔', Shopping: '🛍️', News: '📰',
  Education: '📚', Finance: '💰', Other: '📦'
};

const POPULAR = [
  { name: 'Netflix', cost: 15.49, category: 'Entertainment' },
  { name: 'Spotify', cost: 9.99, category: 'Music' },
  { name: 'YouTube Premium', cost: 13.99, category: 'Entertainment' },
  { name: 'Apple iCloud', cost: 2.99, category: 'Software' },
  { name: 'ChatGPT Plus', cost: 20, category: 'Software' },
  { name: 'Amazon Prime', cost: 14.99, category: 'Shopping' },
  { name: 'Disney+', cost: 7.99, category: 'Entertainment' },
  { name: 'Adobe CC', cost: 54.99, category: 'Software' },
];

const emptyForm = {
  name: '', cost: '', category: 'Entertainment', renewalDate: '', notes: ''
};

export default function Subscriptions() {
  const { user, currency } = useAuth();
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [editSub, setEditSub] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getUserSubscriptions(user.uid);
      setSubs(data);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditSub(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (sub) => {
    setEditSub(sub);
    setForm({
      name: sub.name, cost: sub.cost, category: sub.category,
      renewalDate: sub.renewalDate || '', notes: sub.notes || ''
    });
    setShowModal(true);
  };

  const handleQuickAdd = (p) => {
    setForm({ ...emptyForm, name: p.name, cost: p.cost, category: p.category });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.cost) return toast.error('Name and cost are required');
    setSaving(true);
    try {
      const data = { ...form, cost: parseFloat(form.cost) };
      if (editSub) {
        await updateSubscription(editSub.id, data);
        toast.success('Subscription updated!');
      } else {
        await addSubscription(user.uid, data);
        toast.success('Subscription added!');
      }
      setShowModal(false);
      load();
    } catch (err) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this subscription?')) return;
    await deleteSubscription(id);
    toast.success('Deleted');
    load();
  };

  const filtered = subs.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'All' || s.category === filterCat;
    return matchSearch && matchCat;
  });

  const totalMonthly = subs.reduce((sum, s) => sum + (s.cost || 0), 0);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Subscriptions</h1>
          <p className={styles.subtitle}>
            {subs.length} active · <strong>{currency.symbol}{totalMonthly.toFixed(2)}/month</strong>
          </p>
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
          <button className={styles.addBtn} onClick={openAdd}>+ Add Subscription</button>
        </div>
      </div>

      {/* Quick-add popular */}
      <div className={styles.popularSection}>
        <h3 className={styles.sectionLabel}>Quick Add Popular Services</h3>
        <div className={styles.popularGrid}>
          {POPULAR.map(p => (
            <button key={p.name} className={styles.popularItem} onClick={() => handleQuickAdd(p)}>
              <span>{CATEGORY_ICONS[p.category]}</span>
              <span className={styles.popularName}>{p.name}</span>
              <span className={styles.popularCost}>{currency.symbol}{p.cost}/mo</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <input
          className={styles.search}
          type="text"
          placeholder="🔍  Search subscriptions..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className={styles.catFilter}>
          {['All', ...CATEGORIES].map(c => (
            <button
              key={c}
              className={`${styles.catBtn} ${filterCat === c ? styles.catActive : ''}`}
              onClick={() => setFilterCat(c)}
            >
              {c !== 'All' && CATEGORY_ICONS[c]} {c}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className={styles.loadState}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <span>📋</span>
          <p>{subs.length === 0 ? 'No subscriptions yet!' : 'No results found'}</p>
          {subs.length === 0 && <p>Add your first subscription above</p>}
        </div>
      ) : (
        <div className={styles.subGrid}>
          {filtered.map(sub => (
            <div key={sub.id} className={styles.subCard}>
              <div className={styles.subCardTop}>
                <div className={styles.subCardIcon}>{CATEGORY_ICONS[sub.category] || '📦'}</div>
                <div className={styles.subCardInfo}>
                  <div className={styles.subCardName}>{sub.name}</div>
                  <div className={styles.subCardCat}>{sub.category}</div>
                </div>
                <div className={styles.subCardCost}>{currency.symbol}{(sub.cost || 0).toFixed(2)}<span>/mo</span></div>
              </div>
              {sub.renewalDate && (
                <div className={styles.subCardRenewal}>
                  📅 Renews {new Date(sub.renewalDate).toLocaleDateString()}
                </div>
              )}
              {sub.notes && <div className={styles.subCardNotes}>{sub.notes}</div>}
              <div className={styles.subCardActions}>
                <button className={styles.editBtn} onClick={() => openEdit(sub)}>✏️ Edit</button>
                <button className={styles.deleteBtn} onClick={() => handleDelete(sub.id)}>🗑️ Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className={styles.overlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editSub ? 'Edit Subscription' : 'Add Subscription'}</h2>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.field}>
                <label>Service Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Netflix" />
              </div>
              <div className={styles.field}>
                <label>Monthly Cost ({currency.code}) *</label>
                <input type="number" min="0" step="0.01" value={form.cost}
                  onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} placeholder={`e.g. ${currency.symbol === '$' ? '15.49' : '499'}`} />
              </div>
              <div className={styles.field}>
                <label>Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label>Next Renewal Date</label>
                <input type="date" value={form.renewalDate}
                  onChange={e => setForm(f => ({ ...f, renewalDate: e.target.value }))} />
              </div>
              <div className={styles.field}>
                <label>Notes (optional)</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="e.g. Family plan shared with 3 people" />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editSub ? 'Save Changes' : 'Add Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SMS Scanner Modal */}
      <SMSScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onImportSuccess={load}
      />
    </div>
  );
}
