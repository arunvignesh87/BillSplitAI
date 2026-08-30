import { useState } from 'react';
import { useAuth, CURRENCIES } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function CurrencyModal() {
  const { profile, updateProfile } = useAuth();
  const [selected, setSelected] = useState('USD');
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Show only if profile loaded, currencySet is false/missing, and not dismissed
  if (dismissed || !profile || profile.currencySet) return null;

  const handleSave = async () => {
    // 1. Immediately close modal so user is NEVER blocked
    setDismissed(true);
    toast.success(`Currency set to ${selected}!`);

    try {
      await updateProfile({
        currency: selected,
        currencySet: true,
      });
    } catch (err) {
      console.warn('Background profile update:', err);
    }
  };

  const handleSkip = () => {
    setDismissed(true);
    updateProfile({ currencySet: true }).catch(() => {});
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(6px)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        position: 'relative',
        background: '#1e1e35',
        border: '1px solid rgba(108,99,255,0.3)',
        borderRadius: '16px',
        padding: '28px',
        maxWidth: '420px',
        width: '100%',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        textAlign: 'center'
      }}>
        <button
          onClick={handleSkip}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: '#64748b',
            fontSize: '1.2rem',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '6px'
          }}
          title="Close"
        >
          ✕
        </button>

        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>💱</div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '8px', color: '#f8fafc' }}>
          Select Your Currency
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '20px', lineHeight: 1.5 }}>
          Welcome to BillSplit AI! Choose your local currency to track subscriptions and split bills accurately.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          maxHeight: '220px',
          overflowY: 'auto',
          padding: '4px',
          marginBottom: '20px'
        }}>
          {CURRENCIES.map(c => (
            <button
              key={c.code}
              onClick={() => setSelected(c.code)}
              style={{
                padding: '10px 6px',
                borderRadius: '8px',
                border: selected === c.code ? '2px solid #6c63ff' : '1px solid rgba(255,255,255,0.08)',
                background: selected === c.code ? 'rgba(108,99,255,0.2)' : '#161628',
                color: selected === c.code ? '#a78bfa' : '#f8fafc',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px'
              }}
            >
              <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{c.symbol}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{c.code}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%',
            padding: '12px',
            background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
            border: 'none',
            borderRadius: '10px',
            color: 'white',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
            marginBottom: '10px'
          }}
        >
          {saving ? 'Saving...' : `Continue with ${selected}`}
        </button>

        <button
          onClick={handleSkip}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            fontSize: '0.85rem',
            cursor: 'pointer',
            padding: '6px',
            textDecoration: 'underline'
          }}
        >
          Skip for now (default USD)
        </button>
      </div>
    </div>
  );
}
