import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Expense } from '../types';
import { Receipt, Plus, Search, Tag, DollarSign, Trash2 } from 'lucide-react';

const COMMON_CATEGORIES = ['Rent', 'Utilities', 'Salaries', 'Supplies', 'Marketing', 'Maintenance', 'Taxes', 'Other'];

export const Expenses: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [category, setCategory] = useState('Supplies');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [reference, setReference] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/expenses?limit=200');
      if (res.data.success) setExpenses(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/expenses', {
        category,
        description: description || null,
        amount: parseFloat(amount) || 0,
        payment_method: paymentMethod,
        reference: reference || null,
      });

      setIsModalOpen(false);
      setDescription('');
      setAmount('');
      setReference('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record expense.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await api.delete(`/api/expenses/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete expense.');
    }
  };

  const filtered = expenses.filter((e) => {
    const matchesSearch =
      e.category.toLowerCase().includes(search.toLowerCase()) ||
      (e.description && e.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = selectedCategory ? e.category === selectedCategory : true;
    return matchesSearch && matchesCat;
  });

  const totalExpenses = filtered.reduce((acc, e) => acc + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Expenses</h1>
          <p className="text-sm text-slate-500">Track and categorize operating expenses</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary text-xs">
          <Plus className="h-3.5 w-3.5" /> Record Expense
        </button>
      </div>

      {/* Summary card & filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <span className="text-xs font-semibold text-slate-500 uppercase">Total Filtered Expenses</span>
          <div className="text-2xl font-bold text-slate-900 mt-2">${totalExpenses.toFixed(2)}</div>
          <span className="text-xs text-slate-400">{filtered.length} entries</span>
        </div>

        <div className="card sm:col-span-2 flex flex-col sm:flex-row items-center gap-3 justify-between">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 !py-1.5 text-xs"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 ${
                selectedCategory === '' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              All
            </button>
            {COMMON_CATEGORIES.slice(0, 4).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 ${
                  selectedCategory === cat ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="card !p-0 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Receipt className="h-10 w-10 mx-auto stroke-1 mb-2 opacity-50" />
            <p className="text-sm font-medium text-slate-600">No expenses found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase text-slate-400 font-semibold">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 text-xs font-mono text-slate-500">
                      {new Date(e.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="badge bg-slate-100 text-slate-700">{e.category}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-800">{e.description || '—'}</td>
                    <td className="py-3 px-4 text-xs text-slate-500 capitalize">{e.payment_method}</td>
                    <td className="py-3 px-4 font-bold text-rose-600">${Number(e.amount).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Record Business Expense</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input text-xs"
                >
                  {COMMON_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="input text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Office electricity bill for August"
                  className="input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="input text-xs"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="transfer">Bank Transfer</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Reference / Receipt #</label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="REC-102"
                    className="input text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary text-xs">
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
