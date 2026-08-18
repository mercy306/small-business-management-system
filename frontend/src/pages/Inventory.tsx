import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { InventoryOverviewItem, InventoryTransaction, Product, Supplier } from '../types';
import {
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  Sliders,
  History,
  AlertTriangle,
  Search,
  Plus,
  RefreshCw,
} from 'lucide-react';

export const Inventory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions'>('overview');
  const [overviewItems, setOverviewItems] = useState<InventoryOverviewItem[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Stock Adjustment Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | undefined>();
  const [txType, setTxType] = useState<'stock_in' | 'stock_out' | 'adjustment'>('stock_in');
  const [txQty, setTxQty] = useState('10');
  const [txNote, setTxNote] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | undefined>();
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, txRes, pRes, sRes] = await Promise.all([
        api.get(`/api/inventory?low_stock_only=${lowStockOnly}&limit=200`),
        api.get('/api/inventory/transactions?limit=100'),
        api.get('/api/products?limit=200'),
        api.get('/api/suppliers?limit=100'),
      ]);
      if (invRes.data.success) setOverviewItems(invRes.data.data);
      if (txRes.data.success) setTransactions(txRes.data.data);
      if (pRes.data.success) setProducts(pRes.data.data);
      if (sRes.data.success) setSuppliers(sRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [lowStockOnly]);

  const openStockModal = (productId?: number, defaultType: 'stock_in' | 'stock_out' | 'adjustment' = 'stock_in') => {
    setSelectedProductId(productId || products[0]?.id);
    setTxType(defaultType);
    setTxQty('10');
    setTxNote('');
    setError(null);
    setIsModalOpen(true);
  };

  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedProductId) return;

    try {
      const qtyNum = parseInt(txQty) || 0;
      // Adjust sign for stock_out
      const signedQty = txType === 'stock_out' ? -Math.abs(qtyNum) : Math.abs(qtyNum);

      await api.post('/api/inventory/transactions', {
        product_id: selectedProductId,
        type: txType,
        quantity: signedQty,
        reference_type: txType === 'stock_in' && selectedSupplierId ? 'supplier' : null,
        reference_id: txType === 'stock_in' && selectedSupplierId ? selectedSupplierId : null,
        note: txNote || null,
      });

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to record stock transaction.');
    }
  };

  const filteredOverview = overviewItems.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory Management</h1>
          <p className="text-sm text-slate-500">Track stock quantities, record shipments, and view audit history</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openStockModal(undefined, 'stock_in')} className="btn-primary text-xs">
            <ArrowDownLeft className="h-3.5 w-3.5" /> Stock In (Receive)
          </button>
          <button onClick={() => openStockModal(undefined, 'adjustment')} className="btn-secondary text-xs">
            <Sliders className="h-3.5 w-3.5" /> Stock Adjustment
          </button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex border-b border-slate-200 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Current Stock Overview
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'transactions'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Transaction History Log ({transactions.length})
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search stock..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-8 !py-1 text-xs"
              />
            </div>
            <button
              onClick={() => setLowStockOnly(!lowStockOnly)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors shrink-0 ${
                lowStockOnly
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <AlertTriangle className="h-3 w-3 inline mr-1" /> Low Stock Only
            </button>
          </div>
        )}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="card !p-0 overflow-hidden">
          {loading ? (
            <div className="py-16 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
            </div>
          ) : filteredOverview.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Boxes className="h-10 w-10 mx-auto stroke-1 mb-2 opacity-50" />
              <p className="text-sm font-medium text-slate-600">No inventory records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase text-slate-400 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Current Stock</th>
                    <th className="py-3 px-4">Min Stock Alert</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Quick Stock Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOverview.map((item) => (
                    <tr key={item.product_id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-semibold text-slate-900">{item.name}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-500">{item.sku || '—'}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {item.stock_quantity} {item.unit}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{item.minimum_stock} {item.unit}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`badge ${
                            item.stock_quantity <= 0
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : item.is_low_stock
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {item.stock_quantity <= 0 ? 'Out of Stock' : item.is_low_stock ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openStockModal(item.product_id, 'stock_in')}
                          className="btn-secondary !py-1 text-xs !px-2.5"
                        >
                          <Plus className="h-3 w-3" /> Add Stock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Transaction History */}
      {activeTab === 'transactions' && (
        <div className="card !p-0 overflow-hidden">
          {transactions.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <History className="h-10 w-10 mx-auto stroke-1 mb-2 opacity-50" />
              <p className="text-sm font-medium text-slate-600">No transactions recorded yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase text-slate-400 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Product ID</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Qty Change</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 text-xs text-slate-500 font-mono">
                        {new Date(tx.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">#{tx.product_id}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`badge uppercase text-[10px] ${
                            tx.type === 'stock_in' || tx.type === 'return'
                              ? 'bg-emerald-50 text-emerald-700'
                              : tx.type === 'sale'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-xs">
                        <span className={tx.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {tx.reference_type ? `${tx.reference_type} #${tx.reference_id || ''}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">{tx.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Stock Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Record Stock Transaction</h3>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleStockSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Product</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(Number(e.target.value))}
                  className="input text-xs"
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Current: {p.stock_quantity} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Transaction Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'stock_in', label: 'Stock In (+)' },
                    { id: 'stock_out', label: 'Stock Out (-)' },
                    { id: 'adjustment', label: 'Adjustment' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTxType(t.id as any)}
                      className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        txType === t.id
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {txType === 'stock_in' && suppliers.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Supplier (Optional)</label>
                  <select
                    value={selectedSupplierId || ''}
                    onChange={(e) => setSelectedSupplierId(e.target.value ? Number(e.target.value) : undefined)}
                    className="input text-xs"
                  >
                    <option value="">None / Direct</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={txQty}
                  onChange={(e) => setTxQty(e.target.value)}
                  className="input text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Note / Reference</label>
                <input
                  type="text"
                  value={txNote}
                  onChange={(e) => setTxNote(e.target.value)}
                  placeholder="e.g. PO-9843 / damaged items / batch 2"
                  className="input text-xs"
                />
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
                  Save Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
