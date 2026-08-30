import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

const AuthContext = createContext(null);

export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);
  const [profile, setProfile] = useState(null);

  const loadProfile = useCallback(async (uid) => {
    // 1. Check local cache first for instantaneous startup
    try {
      const cached = localStorage.getItem(`profile_${uid}`);
      if (cached) {
        setProfile(JSON.parse(cached));
      }
    } catch {}

    // 2. Fetch from Firestore with timeout protection
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Firestore timeout')), 4000)
      );
      const snap = await Promise.race([
        getDoc(doc(db, 'users', uid)),
        timeoutPromise
      ]);

      if (snap && snap.exists && snap.exists()) {
        const data = snap.data();
        setProfile(data);
        try { localStorage.setItem(`profile_${uid}`, JSON.stringify(data)); } catch {}
      } else {
        const defaults = { currency: 'USD', notificationsEnabled: false, currencySet: false };
        setDoc(doc(db, 'users', uid), defaults).catch(() => {});
        setProfile(prev => prev || defaults);
      }
    } catch (err) {
      console.warn('Firestore load profile error, using local defaults:', err);
      setProfile(prev => prev || { currency: 'USD', notificationsEnabled: false, currencySet: false });
    }
  }, []);

  const updateProfile = useCallback(async (data) => {
    const updated = { ...(profile || {}), ...data };
    
    // 1. Instant optimistic update so UI never hangs
    setProfile(updated);

    // 2. Persist locally
    if (user?.uid) {
      try {
        localStorage.setItem(`profile_${user.uid}`, JSON.stringify(updated));
      } catch {}
    }

    // 3. Background sync to Firestore with timeout
    if (user) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Firestore timeout')), 4000)
        );
        await Promise.race([
          setDoc(doc(db, 'users', user.uid), updated, { merge: true }),
          timeoutPromise
        ]);
      } catch (err) {
        console.warn('Firestore profile sync warning (saved locally):', err);
      }
    }
  }, [user, profile]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) loadProfile(u.uid);
      else setProfile(null);
    });
    return unsub;
  }, [loadProfile]);

  const currency = CURRENCIES.find(c => c.code === profile?.currency) || CURRENCIES[0];

  return (
    <AuthContext.Provider value={{ user, profile, currency, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
