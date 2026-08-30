import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { createGroup, getUserGroups, addExpense, getGroupExpenses, deleteGroup } from '../services/db';
import toast from 'react-hot-toast';
import styles from './BillSplit.module.css';

function calculateSettlements(expenses, members) {
  const balance = {};
  members.forEach(m => balance[m] = 0);
  expenses.forEach(e => {
    const paidBy = e.paidBy;
    const amount = e.amount || 0;
    const splitAmount = amount / members.length;
    if (balance[paidBy] !== undefined) balance[paidBy] += amount;
    members.forEach(m => {
      if (balance[m] !== undefined) balance[m] -= splitAmount;
    });
  });
  const settlements = [];
  const debtors = Object.entries(balance).filter(([, v]) => v < -0.01).sort((a, b) => a[1] - b[1]);
  const creditors = Object.entries(balance).filter(([, v]) => v > 0.01).sort((a, b) => b[1] - a[1]);
  let i = 0, j = 0;
  const d = debtors.map(([k, v]) => [k, -v]);
  const c = [...creditors];
  while (i < d.length && j < c.length) {
    const amt = Math.min(d[i][1], c[j][1]);
    settlements.push({ from: d[i][0], to: c[j][0], amount: amt });
    d[i][1] -= amt;
    c[j][1] -= amt;
    if (d[i][1] < 0.01) i++;
    if (c[j][1] < 0.01) j++;
  }
  return settlements;
}

export default function BillSplit() {
  const { user, currency } = useAuth();
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', members: '' });
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', paidBy: '' });
  const [saving, setSaving] = useState(false);

  const loadGroups = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getUserGroups(user.uid);
      setGroups(data);
      if (data.length > 0 && !selectedGroup) {
        setSelectedGroup(data[0]);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadExpenses = useCallback(async () => {
    if (!selectedGroup) return;
    const data = await getGroupExpenses(selectedGroup.id);
    setExpenses(data);
  }, [selectedGroup]);

  useEffect(() => { loadGroups(); }, [loadGroups]);
  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  const handleCreateGroup = async () => {
    if (!groupForm.name) return toast.error('Group name required');
    const memberList = groupForm.members.split(',').map(m => m.trim()).filter(Boolean);
    if (memberList.length === 0) return toast.error('Add at least one member name');
    setSaving(true);
    try {
      await createGroup(user.uid, {
        name: groupForm.name,
        memberNames: memberList,
        createdByName: user.displayName || user.email,
      });
      toast.success('Group created!');
      setShowGroupModal(false);
      setGroupForm({ name: '', members: '' });
      loadGroups();
    } catch { toast.error('Failed to create group'); }
    finally { setSaving(false); }
  };

  const handleAddExpense = async () => {
    if (!expenseForm.description || !expenseForm.amount || !expenseForm.paidBy)
      return toast.error('All fields required');
    setSaving(true);
    try {
      await addExpense(selectedGroup.id, {
        description: expenseForm.description,
        amount: parseFloat(expenseForm.amount),
        paidBy: expenseForm.paidBy,
      });
      toast.success('Expense added!');
      setShowExpenseModal(false);
      setExpenseForm({ description: '', amount: '', paidBy: '' });
      loadExpenses();
    } catch { toast.error('Failed to add expense'); }
    finally { setSaving(false); }
  };

  const handleDeleteGroup = async (id) => {
    if (!confirm('Delete this group?')) return;
    await deleteGroup(id);
    toast.success('Group deleted');
    setSelectedGroup(null);
    setExpenses([]);
    loadGroups();
  };

  const members = selectedGroup?.memberNames || [];
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const settlements = selectedGroup ? calculateSettlements(expenses, [
    selectedGroup.createdByName, ...members
  ].filter((v, i, a) => a.indexOf(v) === i)) : [];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Bill Split</h1>
          <p className={styles.subtitle}>Split expenses fairly with friends & family</p>
        </div>
        <button className={styles.addBtn} onClick={() => setShowGroupModal(true)}>+ New Group</button>
      </div>

      {loading ? (
        <div className={styles.loadState}>Loading...</div>
      ) : groups.length === 0 ? (
        <div className={styles.emptyFull}>
          <span>🤝</span>
          <h2>No groups yet</h2>
          <p>Create a group to start splitting bills with friends, roommates, or family</p>
          <button className={styles.addBtn} onClick={() => setShowGroupModal(true)}>Create First Group</button>
        </div>
      ) : (
        <div className={styles.layout}>
          {/* Group sidebar */}
          <div className={styles.groupList}>
            <h3 className={styles.sectionLabel}>Your Groups</h3>
            {groups.map(g => (
              <div
                key={g.id}
                className={`${styles.groupItem} ${selectedGroup?.id === g.id ? styles.groupActive : ''}`}
                onClick={() => setSelectedGroup(g)}
              >
                <div className={styles.groupIcon}>🏠</div>
                <div className={styles.groupInfo}>
                  <div className={styles.groupName}>{g.name}</div>
                  <div className={styles.groupMeta}>{g.memberNames?.length || 0} members</div>
                </div>
              </div>
            ))}
          </div>

          {/* Group detail */}
          {selectedGroup && (
            <div className={styles.groupDetail}>
              <div className={styles.detailHeader}>
                <div>
                  <h2 className={styles.detailTitle}>{selectedGroup.name}</h2>
                  <div className={styles.detailMembers}>
                    👥 {[selectedGroup.createdByName, ...(selectedGroup.memberNames || [])].filter((v, i, a) => a.indexOf(v) === i).join(', ')}
                  </div>
                </div>
                <div className={styles.detailActions}>
                  <button className={styles.expenseBtn} onClick={() => setShowExpenseModal(true)}>+ Add Expense</button>
                  <button className={styles.deleteBtnSm} onClick={() => handleDeleteGroup(selectedGroup.id)}>🗑️</button>
                </div>
              </div>

              {/* Stats */}
              <div className={styles.groupStats}>
                 <div className={styles.groupStat}>
                   <div className={styles.statVal}>{currency.symbol}{totalExpenses.toFixed(2)}</div>
                   <div className={styles.statLbl}>Total expenses</div>
                 </div>
                 <div className={styles.groupStat}>
                   <div className={styles.statVal}>{expenses.length}</div>
                   <div className={styles.statLbl}>Transactions</div>
                 </div>
                 <div className={styles.groupStat}>
                   <div className={styles.statVal}>
                     {currency.symbol}{(totalExpenses / Math.max(1, [...new Set([selectedGroup.createdByName, ...(selectedGroup.memberNames || [])])].length)).toFixed(2)}
                   </div>
                   <div className={styles.statLbl}>Per person</div>
                 </div>
               </div>

               {/* Settlements */}
               {settlements.length > 0 && (
                 <div className={styles.settlementCard}>
                   <h3 className={styles.settlementTitle}>💰 Who Owes Who</h3>
                   {settlements.map((s, i) => (
                     <div key={i} className={styles.settlementRow}>
                       <span className={styles.debtor}>{s.from}</span>
                       <span className={styles.arrow}>owes</span>
                       <span className={styles.creditor}>{s.to}</span>
                       <span className={styles.amount}>{currency.symbol}{s.amount.toFixed(2)}</span>
                     </div>
                   ))}
                 </div>
               )}

               {/* Expenses list */}
               <div className={styles.expenseList}>
                 <h3 className={styles.sectionLabel}>Expenses</h3>
                 {expenses.length === 0 ? (
                   <div className={styles.noExpenses}>No expenses yet. Add the first one!</div>
                 ) : (
                   expenses.map(e => (
                     <div key={e.id} className={styles.expenseItem}>
                       <div className={styles.expenseDesc}>{e.description}</div>
                       <div className={styles.expenseBy}>Paid by {e.paidBy}</div>
                       <div className={styles.expenseAmt}>{currency.symbol}{(e.amount || 0).toFixed(2)}</div>
                     </div>
                   ))
                 )}
               </div>
             </div>
           )}
         </div>
       )}

       {/* Create Group Modal */}
       {showGroupModal && (
         <div className={styles.overlay} onClick={() => setShowGroupModal(false)}>
           <div className={styles.modal} onClick={e => e.stopPropagation()}>
             <div className={styles.modalHeader}>
               <h2>Create Group</h2>
               <button className={styles.closeBtn} onClick={() => setShowGroupModal(false)}>✕</button>
             </div>
             <div className={styles.modalBody}>
               <div className={styles.field}>
                 <label>Group Name *</label>
                 <input value={groupForm.name} onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))}
                   placeholder="e.g. Apartment, Goa Trip, Office Lunch" />
               </div>
               <div className={styles.field}>
                 <label>Member Names * (comma-separated)</label>
                 <input value={groupForm.members} onChange={e => setGroupForm(f => ({ ...f, members: e.target.value }))}
                   placeholder="e.g. Alice, Bob, Charlie" />
               </div>
               <p className={styles.hint}>You are automatically added as a member</p>
             </div>
             <div className={styles.modalFooter}>
               <button className={styles.cancelBtn} onClick={() => setShowGroupModal(false)}>Cancel</button>
               <button className={styles.saveBtn} onClick={handleCreateGroup} disabled={saving}>
                 {saving ? 'Creating...' : 'Create Group'}
               </button>
             </div>
           </div>
         </div>
       )}

       {/* Add Expense Modal */}
       {showExpenseModal && selectedGroup && (
         <div className={styles.overlay} onClick={() => setShowExpenseModal(false)}>
           <div className={styles.modal} onClick={e => e.stopPropagation()}>
             <div className={styles.modalHeader}>
               <h2>Add Expense</h2>
               <button className={styles.closeBtn} onClick={() => setShowExpenseModal(false)}>✕</button>
             </div>
             <div className={styles.modalBody}>
               <div className={styles.field}>
                 <label>Description *</label>
                 <input value={expenseForm.description}
                   onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))}
                   placeholder="e.g. Dinner, Groceries, Rent" />
               </div>
               <div className={styles.field}>
                 <label>Amount ({currency.code}) *</label>
                 <input type="number" min="0" step="0.01" value={expenseForm.amount}
                   onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))}
                   placeholder="0.00" />
               </div>
              <div className={styles.field}>
                <label>Paid By *</label>
                <select value={expenseForm.paidBy}
                  onChange={e => setExpenseForm(f => ({ ...f, paidBy: e.target.value }))}>
                  <option value="">Select who paid</option>
                  {[selectedGroup.createdByName, ...(selectedGroup.memberNames || [])]
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowExpenseModal(false)}>Cancel</button>
              <button className={styles.saveBtn} onClick={handleAddExpense} disabled={saving}>
                {saving ? 'Adding...' : 'Add Expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
