import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserSubscriptions } from '../services/db';
import { analyzeSubscriptions } from '../services/gemini';
import toast from 'react-hot-toast';
import styles from './AIInsights.module.css';

function MarkdownText({ text }) {
  const lines = text.split('\n');
  return (
    <div className={styles.markdown}>
      {lines.map((line, i) => {
        if (line.startsWith('## ') || line.startsWith('# ')) {
          return <h3 key={i}>{line.replace(/^#+\s/, '')}</h3>;
        }
        if (line.startsWith('**') && line.endsWith('**')) {
          return <h4 key={i}>{line.replace(/\*\*/g, '')}</h4>;
        }
        if (line.match(/^\d+\.\s\*\*/)) {
          const clean = line.replace(/^\d+\.\s/, '').replace(/\*\*/g, '');
          const [bold, ...rest] = clean.split(' - ');
          return (
            <div key={i} className={styles.tip}>
              <span className={styles.tipTitle}>{bold}</span>
              {rest.length > 0 && <span> - {rest.join(' - ')}</span>}
            </div>
          );
        }
        if (line.startsWith('- ') || line.startsWith('• ')) {
          const content = line.replace(/^[-•]\s/, '').replace(/\*\*/g, '');
          return <li key={i}>{content}</li>;
        }
        if (line.trim() === '') return <br key={i} />;
        return <p key={i}>{line.replace(/\*\*/g, '')}</p>;
      })}
    </div>
  );
}

export default function AIInsights() {
  const { user, currency } = useAuth();
  const [insights, setInsights] = useState('');
  const [loading, setLoading] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [analyzed, setAnalyzed] = useState(false);

  const handleAnalyze = useCallback(async () => {
    setLoading(true);
    setInsights('');
    try {
      const subs = await getUserSubscriptions(user.uid);
      setSubscriptions(subs);
      if (subs.length === 0) {
        toast.error('Add some subscriptions first!');
        setLoading(false);
        return;
      }
      const result = await analyzeSubscriptions(subs, currency.code);
      setInsights(result);
      setAnalyzed(true);
      toast.success('Analysis complete!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to analyze. Check your Gemini API key.');
    } finally {
      setLoading(false);
    }
  }, [user, currency]);

  const totalMonthly = subscriptions.reduce((s, sub) => s + (sub.cost || 0), 0);
  const potentialSaving = totalMonthly * 0.3;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>🤖 AI Insights</h1>
          <p className={styles.subtitle}>Powered by Google Gemini 2.0 Flash</p>
        </div>
      </div>

      {/* Hero card */}
      <div className={styles.heroCard}>
        <div className={styles.heroLeft}>
          <div className={styles.heroIcon}>✨</div>
          <div>
            <h2 className={styles.heroTitle}>Get Smart Financial Analysis</h2>
            <p className={styles.heroDesc}>
              Gemini AI will analyze your subscriptions and find personalized ways to save money,
              identify waste, and suggest cheaper alternatives.
            </p>
            {analyzed && subscriptions.length > 0 && (
              <div className={styles.heroStats}>
                <div className={styles.heroStat}>
                  <span className={styles.heroStatVal}>{subscriptions.length}</span>
                  <span className={styles.heroStatLbl}>subs analyzed</span>
                </div>
                <div className={styles.heroStat}>
                  <span className={styles.heroStatVal}>{currency.symbol}{totalMonthly.toFixed(0)}/mo</span>
                  <span className={styles.heroStatLbl}>total spend</span>
                </div>
                <div className={styles.heroStat}>
                  <span className={styles.heroStatVal} style={{ color: '#10b981' }}>~{currency.symbol}{potentialSaving.toFixed(0)}/mo</span>
                  <span className={styles.heroStatLbl}>est. savings</span>
                </div>
              </div>
            )}
          </div>
        </div>
        <button
          className={`${styles.analyzeBtn} ${loading ? styles.loading : ''}`}
          onClick={handleAnalyze}
          disabled={loading}
        >
          {loading ? (
            <><span className={styles.spinner}></span> Analyzing...</>
          ) : (
            analyzed ? '🔄 Re-analyze' : '🚀 Analyze My Spending'
          )}
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className={styles.loadingCard}>
          <div className={styles.aiThinking}>
            <div className={styles.thinkingDots}>
              <span></span><span></span><span></span>
            </div>
            <p>Gemini AI is analyzing your subscriptions...</p>
          </div>
        </div>
      )}

      {/* Results */}
      {insights && !loading && (
        <div className={styles.resultsCard}>
          <div className={styles.resultsHeader}>
            <span className={styles.resultsIcon}>🤖</span>
            <div>
              <h2 className={styles.resultsTitle}>Your Personalized Analysis</h2>
              <p className={styles.resultsSubtitle}>Generated by Gemini 2.0 Flash</p>
            </div>
          </div>
          <div className={styles.resultsBody}>
            <MarkdownText text={insights} />
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !insights && (
        <div className={styles.tipsGrid}>
          {[
            { icon: '🔍', title: 'Subscription Scanner', desc: 'AI identifies which subscriptions you might not be using' },
            { icon: '💡', title: 'Smart Alternatives', desc: 'Get free or cheaper alternatives to expensive services' },
            { icon: '⚠️', title: 'Waste Alerts', desc: 'Spot subscriptions that are costing you money without value' },
            { icon: '📈', title: 'Savings Estimate', desc: 'See exactly how much you could save per month and per year' },
          ].map(tip => (
            <div key={tip.title} className={styles.tipCard}>
              <div className={styles.tipIcon}>{tip.icon}</div>
              <h3 className={styles.tipTitle2}>{tip.title}</h3>
              <p className={styles.tipDesc}>{tip.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
