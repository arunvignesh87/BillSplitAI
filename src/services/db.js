import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, query, where, getDocs, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

// --- Subscriptions ---
export const addSubscription = (userId, data) =>
  addDoc(collection(db, 'subscriptions'), {
    ...data,
    userId,
    createdAt: serverTimestamp(),
  });

export const updateSubscription = (id, data) =>
  updateDoc(doc(db, 'subscriptions', id), data);

export const deleteSubscription = (id) =>
  deleteDoc(doc(db, 'subscriptions', id));

export const getUserSubscriptions = async (userId) => {
  const q = query(
    collection(db, 'subscriptions'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// --- Groups (Bill Split) ---
export const createGroup = (userId, data) =>
  addDoc(collection(db, 'groups'), {
    ...data,
    createdBy: userId,
    members: [userId],
    createdAt: serverTimestamp(),
  });

export const getUserGroups = async (userId) => {
  const q = query(
    collection(db, 'groups'),
    where('createdBy', '==', userId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addExpense = (groupId, data) =>
  addDoc(collection(db, `groups/${groupId}/expenses`), {
    ...data,
    createdAt: serverTimestamp(),
  });

export const getGroupExpenses = async (groupId) => {
  const q = query(
    collection(db, `groups/${groupId}/expenses`),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const deleteGroup = (id) => deleteDoc(doc(db, 'groups', id));
