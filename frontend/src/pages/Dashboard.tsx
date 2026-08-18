import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { DashboardData } from '../types';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  Package,
  AlertTriangle,
  Users,
  ShoppingCart,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/dashboard');
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Real-time overview of business performance today</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchDashboard} className="btn-secondary text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <Link to="/pos" className="btn-primary text-xs">
            <ShoppingCart className="h-3.5 w-3.5" /> New POS Sale
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales */}
        <div className="card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Today's Sales</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">
              ${stats?.today_sales.toFixed(2) || '0.00'}
            </span>
            <p className="text-xs text-slate-500 mt-1">{stats?.today_transactions || 0} transactions</p>
          </div>
        </div>

        {/* Expenses */}
        <div className="card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Today's Expenses</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">
              ${stats?.today_expenses.toFixed(2) || '0.00'}
            </span>
            <p className="text-xs text-slate-500 mt-1">Operational costs</p>
          </div>
        </div>

        {/* Estimated Profit */}
        <div className="card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Today's Profit</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className={`text-2xl font-bold ${(stats?.today_profit || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              ${stats?.today_profit.toFixed(2) || '0.00'}
            </span>
            <p className="text-xs text-slate-500 mt-1">Sales minus expenses</p>
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Low Stock Alerts</span>
            <div className={`p-2 rounded-lg ${(stats?.low_stock_count || 0) > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-500'}`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className={`text-2xl font-bold ${(stats?.low_stock_count || 0) > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {stats?.low_stock_count || 0}
            </span>
            <p className="text-xs text-slate-500 mt-1">Items at or below minimum</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Low stock + Recent Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Table */}
        <div className="card lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Low Stock Warnings
            </h3>
            <Link to="/inventory" className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              Manage Stock <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {!data?.low_stock || data.low_stock.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">All products are healthy in stock.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-slate-400 font-semibold">
                    <th className="py-2">Product</th>
                    <th className="py-2">Current Stock</th>
                    <th className="py-2">Min Required</th>
                    <th className="py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.low_stock.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="py-3 font-medium text-slate-900">{item.name}</td>
                      <td className="py-3">
                        <span className="badge bg-rose-50 text-rose-700 border border-rose-200">
                          {item.stock_quantity} {item.unit}
                        </span>
                      </td>
                      <td className="py-3 text-slate-500">{item.minimum_stock} {item.unit}</td>
                      <td className="py-3 text-right">
                        <Link
                          to="/inventory"
                          className="text-xs text-emerald-600 hover:underline font-medium"
                        >
                          Stock In
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Selling Products */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Package className="h-4 w-4 text-emerald-600" />
            Top Selling Today
          </h3>

          {!data?.top_products || data.top_products.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">No sales recorded today yet.</p>
          ) : (
            <div className="space-y-3">
              {data.top_products.map((item) => (
                <div key={item.product_id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{item.name}</p>
                    <p className="text-[11px] text-slate-500">{item.total_quantity} sold</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-600">
                    ${item.total_revenue.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Recent Completed Invoices</h3>
          <Link to="/reports" className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
            View All Reports <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {!data?.recent_sales || data.recent_sales.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">No recent invoices recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-400 font-semibold">
                  <th className="py-2">Invoice #</th>
                  <th className="py-2">Date & Time</th>
                  <th className="py-2">Total Amount</th>
                  <th className="py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recent_sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/50">
                    <td className="py-3 font-mono font-medium text-slate-800">{sale.invoice_number}</td>
                    <td className="py-3 text-slate-500 text-xs">
                      {new Date(sale.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 font-semibold text-slate-900">${sale.total.toFixed(2)}</td>
                    <td className="py-3 text-right">
                      <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Completed
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
