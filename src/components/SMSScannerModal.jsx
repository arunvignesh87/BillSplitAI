import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { parseSubscriptionsFromSMS } from '../services/gemini';
import { addSubscription } from '../services/db';
import { isNativeAndroid, getNativeInboxMessages } from '../services/smsNative';
import toast from 'react-hot-toast';

const SAMPLE_MESSAGES = [
  `Dear Customer, INR 649.00 debited from your A/C for NETFLIX recurring subscription on 25-Aug-2026. Next billing date 25-Sep-2026.`,
  `Alert: USD 11.99 charged to card ending in 4242 for SPOTIFY USA on 15-Aug-2026. Your monthly auto-renewal is active.`,
  `Your AMAZON PRIME membership has been renewed for Rs 1499/year. Next renewal: 2027-08-20.`,
  `Payment of $20.00 for OPENAI CHATGPT PLUS was successful on card 8812. Next invoice on Sep 20, 2026.`
].join('\n\n');

export default function SMSScannerModal({ isOpen, onClose, onImportSuccess }) {
  const { user, currency } = useAuth();
  const [smsText, setSmsText] = useState('');
  const [scanning, setScanning] = useState(false);
  const [extractedSubs, setExtractedSubs] = useState([]);
  const [importing, setImporting] = useState(false);
  const isAndroid = isNativeAndroid();

  const handleAutoReadNativeSMS = async () => {
    setScanning(true);
    setExtractedSubs([]);
    try {
      toast.loading('Reading SMS from phone inbox...', { id: 'sms-read' });
      const msgs = await getNativeInboxMessages();
      toast.dismiss('sms-read');
      if (!msgs || msgs.length === 0) {
        toast.error('No SMS messages found in inbox.');
        setScanning(false);
        return;
      }
      const combined = msgs.map(m => `[From: ${m.address}] ${m.body}`).join('\n\n');
      setSmsText(combined);
      toast.loading('Gemini AI is analyzing transactions...', { id: 'sms-ai' });
      const results = await parseSubscriptionsFromSMS(combined);
      toast.dismiss('sms-ai');
      if (!results || results.length === 0) {
        toast.error('No recurring subscriptions detected in recent messages.');
      } else {
        setExtractedSubs(results);
        toast.success(`Detected ${results.length} subscription(s)! 🎉`);
      }
    } catch (err) {
      console.error(err);
      toast.dismiss('sms-read');
      toast.dismiss('sms-ai');
      toast.error('Could not access SMS. Make sure SMS permission is allowed in settings.');
    } finally {
      setScanning(false);
    }
  };

  if (!isOpen) return null;

  const handleScan = async () => {
    if (!smsText.trim()) return toast.error('Please paste or enter message text to scan');
    setScanning(true);
    setExtractedSubs([]);
    try {
      const results = await parseSubscriptionsFromSMS(smsText);
      if (!results || results.length === 0) {
        toast.error('No subscriptions detected in this text. Try another message.');
      } else {
        setExtractedSubs(results);
        toast.success(`Found ${results.length} subscription(s)! 🎉`);
      }
    } catch (err) {
      console.error(err);
      toast.error('AI scanning failed. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  const handleImportAll = async () => {
    if (!user || extractedSubs.length === 0) return;
    setImporting(true);
    try {
      for (const sub of extractedSubs) {
        await addSubscription(user.uid, {
          name: sub.name,
          cost: Number(sub.cost) || 0,
          category: sub.category || 'Other',
          renewalDate: sub.renewalDate || '',
          notes: sub.notes ? `[Scanned from SMS] ${sub.notes}` : '[Scanned from SMS]',
        });
      }
      toast.success(`Imported ${extractedSubs.length} subscription(s) successfully!`);
      if (onImportSuccess) onImportSuccess();
      onClose();
    } catch {
      toast.error('Failed to import subscriptions');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(6px)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }} onClick={onClose}>
      <div style={{
        background: '#1e1e35',
        border: '1px solid rgba(108,99,255,0.4)',
        borderRadius: '18px',
        padding: '28px',
        maxWidth: '560px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
      }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.8rem' }}>📱</span>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                AI Message & SMS Scanner
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Powered by Gemini AI extraction
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.4rem', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '14px', lineHeight: 1.5 }}>
          Paste bank SMS alerts, debit card messages, or subscription confirmation emails. Gemini AI will automatically extract and calculate all your subscription details.
        </p>

        {/* Text Area */}
        <textarea
          rows={5}
          value={smsText}
          onChange={e => setSmsText(e.target.value)}
          placeholder="Paste your bank / credit card SMS here... e.g. 'Rs 649 debited for Netflix subscription renewal...'"
          style={{
            width: '100%',
            padding: '12px',
            background: '#161628',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            color: '#f8fafc',
            fontSize: '0.85rem',
            resize: 'vertical',
            outline: 'none',
            fontFamily: 'inherit',
            marginBottom: '10px'
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <button
            onClick={() => setSmsText(SAMPLE_MESSAGES)}
            style={{
              background: 'none',
              border: 'none',
              color: '#a78bfa',
              fontSize: '0.78rem',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            🧪 Load sample bank SMS messages
          </button>
          {smsText && (
            <button
              onClick={() => setSmsText('')}
              style={{
                background: 'none',
                border: 'none',
                color: '#ef4444',
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* If on Android, offer direct one-click scan of native inbox */}
        {isAndroid && (
          <button
            onClick={handleAutoReadNativeSMS}
            disabled={scanning}
            style={{
              width: '100%',
              padding: '13px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: scanning ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '14px',
              boxShadow: '0 4px 15px rgba(16,185,129,0.3)'
            }}
          >
            📲 Auto-Scan Phone SMS (Android)
          </button>
        )}

        {/* Scan Button */}
        <button
          onClick={handleScan}
          disabled={scanning}
          style={{
            width: '100%',
            padding: '12px',
            background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
            border: 'none',
            borderRadius: '10px',
            color: 'white',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: scanning ? 'not-allowed' : 'pointer',
            opacity: scanning ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: extractedSubs.length > 0 ? '20px' : '0'
          }}
        >
          {scanning ? (
            <>
              <span style={{
                width: '14px',
                height: '14px',
                border: '2px solid white',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin 0.8s linear infinite'
              }} />
              Scanning with Gemini AI...
            </>
          ) : (
            '🔍 Scan & Extract Subscriptions'
          )}
        </button>

        {/* Extracted Results List */}
        {extractedSubs.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#10b981', marginBottom: '10px' }}>
              ✅ Detected {extractedSubs.length} Subscription(s):
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {extractedSubs.map((sub, idx) => (
                <div key={idx} style={{
                  background: '#161628',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f8fafc' }}>
                      {sub.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {sub.category} · Renews: {sub.renewalDate || 'Monthly'}
                    </div>
                    {sub.notes && (
                      <div style={{ fontSize: '0.7rem', color: '#a78bfa', marginTop: '2px' }}>
                        {sub.notes}
                      </div>
                    )}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#10b981' }}>
                    {currency.symbol}{Number(sub.cost).toFixed(2)}/mo
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleImportAll}
              disabled={importing}
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #10b981, #34d399)',
                border: 'none',
                borderRadius: '10px',
                color: '#0f0f1a',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: importing ? 'not-allowed' : 'pointer'
              }}
            >
              {importing ? 'Saving to Database...' : `📥 Add All ${extractedSubs.length} to Subscriptions`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
