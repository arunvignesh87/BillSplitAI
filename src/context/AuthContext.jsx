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
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        setProfile(snap.data());
      } else {
        // Default profile
        const defaults = { currency: 'USD', notificationsEnabled: false };
        await setDoc(doc(db, 'users', uid), defaults);
        setProfile(defaults);
      }
    } catch {
      setProfile({ currency: 'USD', notificationsEnabled: false });
    }
  }, []);

  const updateProfile = useCallback(async (data) => {
    if (!user) return;
    const updated = { ...profile, ...data };
    await setDoc(doc(db, 'users', user.uid), updated, { merge: true });
    setProfile(updated);
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
