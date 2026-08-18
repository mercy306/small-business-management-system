import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { BarChart3, TrendingUp, DollarSign, Calendar, Boxes, ArrowDownToLine, FileText } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';

export const Reports: React.FC = () => {
  const [activeReport, setActiveReport] = useState<'sales' | 'profit-loss' | 'inventory'>('profit-loss');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);

  // Report data states
  const [salesReport, setSalesReport] = useState<any[]>([]);
  const [plReport, setPlReport] = useState<any | null>(null);
  const [invReport, setInvReport] = useState<any[]>([]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);

      if (activeReport === 'sales') {
        const res = await api.get(`/api/reports/sales?${params.toString()}`);
        if (res.data.success) setSalesReport(res.data.data);
      } else if (activeReport === 'profit-loss') {
        const res = await api.get(`/api/reports/profit-loss?${params.toString()}`);
        if (res.data.success) setPlReport(res.data.data);
      } else if (activeReport === 'inventory') {
        const res = await api.get('/api/reports/inventory');
        if (res.data.success) setInvReport(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeReport]);

  const totalSalesVal = salesReport.reduce((acc, r) => acc + r.total_sales, 0);
  const totalInvValue = invReport.reduce((acc, i) => acc + i.stock_value, 0);

  const handleExportExcel = () => {
    const date = new Date().toISOString().slice(0, 10);
    if (activeReport === 'profit-loss' && plReport) {
      exportToExcel([
        { Metric: 'Gross Sales Revenue', Value: `$${plReport.total_revenue.toFixed(2)}` },
        { Metric: 'Cost of Goods Sold (COGS)', Value: `-$${plReport.total_cogs.toFixed(2)}` },
        { Metric: 'Gross Profit', Value: `$${plReport.gross_profit.toFixed(2)}` },
        { Metric: 'Total Operating Expenses', Value: `-$${plReport.total_expenses.toFixed(2)}` },
        { Metric: 'Net Operating Profit', Value: `$${plReport.net_profit.toFixed(2)}` },
        { Metric: 'Total Transactions', Value: plReport.total_transactions },
      ], `PnL_Report_${date}`, 'Profit & Loss');
    } else if (activeReport === 'sales') {
      exportToExcel(salesReport.map(r => ({
        Date: r.date,
        Transactions: r.transaction_count,
        'Total Sales ($)': Number(r.total_sales).toFixed(2),
      })), `Sales_Report_${date}`, 'Sales by Date');
    } else if (activeReport === 'inventory') {
      exportToExcel(invReport.map(i => ({
        Product: i.product_name,
        SKU: i.sku || '',
        Category: i.category || '',
        'Stock Qty': i.stock_quantity,
        Unit: i.unit,
        'Cost Price ($)': Number(i.cost_price).toFixed(2),
        'Stock Value ($)': Number(i.stock_value).toFixed(2),
      })), `Inventory_Valuation_${date}`, 'Inventory');
    }
  };

  const handleExportPDF = () => {
    const date = new Date().toISOString().slice(0, 10);
    if (activeReport === 'profit-loss' && plReport) {
      exportToPDF(
        'Profit & Loss Statement',
        `Business Financial Report`,
        [
          { header: 'Metric', dataKey: 'metric' },
          { header: 'Amount', dataKey: 'value' },
        ],
        [
          { metric: 'Gross Sales Revenue', value: `$${plReport.total_revenue.toFixed(2)}` },
          { metric: 'Cost of Goods Sold (COGS)', value: `-$${plReport.total_cogs.toFixed(2)}` },
          { metric: 'Gross Profit', value: `$${plReport.gross_profit.toFixed(2)}` },
          { metric: 'Total Operating Expenses', value: `-$${plReport.total_expenses.toFixed(2)}` },
          { metric: 'Net Operating Profit', value: `$${plReport.net_profit.toFixed(2)}` },
          { metric: 'Total Transactions', value: String(plReport.total_transactions) },
        ],
        `PnL_Report_${date}`,
        [
          { label: 'Net Profit', value: `$${plReport.net_profit.toFixed(2)}` },
          { label: 'Total Revenue', value: `$${plReport.total_revenue.toFixed(2)}` },
          { label: 'Total Expenses', value: `$${plReport.total_expenses.toFixed(2)}` },
        ]
      );
    } else if (activeReport === 'sales') {
      exportToPDF(
        'Sales Report by Date',
        `Period: ${dateFrom || 'All time'} to ${dateTo || 'Today'}`,
        [
          { header: 'Date', dataKey: 'date' },
          { header: 'Transactions', dataKey: 'transaction_count' },
          { header: 'Total Sales ($)', dataKey: 'total_sales_fmt' },
        ],
        salesReport.map(r => ({ ...r, total_sales_fmt: `$${Number(r.total_sales).toFixed(2)}` })),
        `Sales_Report_${date}`,
        [{ label: 'Total Revenue', value: `$${totalSalesVal.toFixed(2)}` }]
      );
    } else if (activeReport === 'inventory') {
      exportToPDF(
        'Inventory Valuation Report',
        'Current stock value based on cost prices',
        [
          { header: 'Product', dataKey: 'product_name' },
          { header: 'SKU', dataKey: 'sku' },
          { header: 'Qty', dataKey: 'stock_quantity' },
          { header: 'Unit', dataKey: 'unit' },
          { header: 'Cost ($)', dataKey: 'cost_price' },
          { header: 'Value ($)', dataKey: 'stock_value_fmt' },
        ],
        invReport.map(i => ({ ...i, stock_value_fmt: `$${Number(i.stock_value).toFixed(2)}` })),
        `Inventory_Valuation_${date}`,
        [{ label: 'Total Inventory Value', value: `$${totalInvValue.toFixed(2)}` }]
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics & Reports</h1>
          <p className="text-sm text-slate-500">Business performance metrics, profit/loss statements, and inventory valuation</p>
        </div>
        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="btn-secondary text-xs flex items-center gap-1.5 !py-2"
            title="Export to Excel"
          >
            <ArrowDownToLine className="h-3.5 w-3.5" />
            Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="btn-secondary text-xs flex items-center gap-1.5 !py-2"
            title="Export to PDF"
          >
            <FileText className="h-3.5 w-3.5" />
            PDF
          </button>
        </div>
      </div>

      {/* Report Selector Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex border-b border-slate-200 w-full sm:w-auto">
          <button
            onClick={() => setActiveReport('profit-loss')}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeReport === 'profit-loss'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Profit & Loss Summary
          </button>
          <button
            onClick={() => setActiveReport('sales')}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeReport === 'sales'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Sales by Date
          </button>
          <button
            onClick={() => setActiveReport('inventory')}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeReport === 'inventory'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Inventory Valuation
          </button>
        </div>

        {/* Date Filter (for sales & PL) */}
        {activeReport !== 'inventory' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input !py-1 text-xs"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input !py-1 text-xs"
            />
            <button onClick={fetchReport} className="btn-secondary !py-1 text-xs shrink-0">
              Filter
            </button>
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="py-20 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
        </div>
      )}

      {/* 1. Profit & Loss Statement */}
      {!loading && activeReport === 'profit-loss' && plReport && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card">
              <span className="text-xs font-semibold text-slate-500 uppercase">Gross Sales Revenue</span>
              <div className="text-2xl font-bold text-slate-900 mt-2">${plReport.total_revenue.toFixed(2)}</div>
              <p className="text-xs text-slate-400 mt-1">Total customer invoices</p>
            </div>
            <div className="card">
              <span className="text-xs font-semibold text-slate-500 uppercase">Cost of Goods (COGS)</span>
              <div className="text-2xl font-bold text-slate-700 mt-2">${plReport.total_cogs.toFixed(2)}</div>
              <p className="text-xs text-slate-400 mt-1">Product purchase cost</p>
            </div>
            <div className="card">
              <span className="text-xs font-semibold text-slate-500 uppercase">Estimated Net Profit</span>
              <div
                className={`text-2xl font-bold mt-2 ${
                  plReport.net_profit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                ${plReport.net_profit.toFixed(2)}
              </div>
              <p className="text-xs text-slate-400 mt-1">Gross profit minus expenses</p>
            </div>
          </div>

          <div className="card max-w-2xl mx-auto space-y-4">
            <h3 className="font-bold text-slate-900 text-center border-b border-slate-100 pb-3">
              Income Statement Breakdown
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between font-semibold text-slate-800">
                <span>Total Revenue (Sales)</span>
                <span>${plReport.total_revenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 pl-4 text-xs">
                <span>Less: Cost of Goods Sold (COGS)</span>
                <span>-${plReport.total_cogs.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 border-t border-slate-100 pt-2">
                <span>Gross Profit</span>
                <span>${plReport.gross_profit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 pl-4 text-xs">
                <span>Less: Operating Expenses</span>
                <span>-${plReport.total_expenses.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-base border-t-2 border-slate-900 pt-3">
                <span>Net Operating Profit</span>
                <span className={plReport.net_profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                  ${plReport.net_profit.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Sales by Date */}
      {!loading && activeReport === 'sales' && (
        <div className="card !p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-200/80 flex justify-between items-center bg-slate-50/50">
            <span className="text-xs font-semibold text-slate-700">
              Total Recorded Sales: <b className="text-emerald-600">${totalSalesVal.toFixed(2)}</b>
            </span>
          </div>
          {salesReport.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <BarChart3 className="h-10 w-10 mx-auto stroke-1 mb-2 opacity-50" />
              <p className="text-sm font-medium text-slate-600">No sales recorded for this date range</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase text-slate-400 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Transactions</th>
                    <th className="py-3 px-4 text-right">Daily Sales Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesReport.map((row) => (
                    <tr key={row.date} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">{row.date}</td>
                      <td className="py-3 px-4 text-slate-500">{row.transactions} invoices</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ${row.total_sales.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. Inventory Valuation */}
      {!loading && activeReport === 'inventory' && (
        <div className="card !p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-200/80 flex justify-between items-center bg-slate-50/50">
            <span className="text-xs font-semibold text-slate-700">
              Total Stock Asset Value: <b className="text-emerald-600">${totalInvValue.toFixed(2)}</b>
            </span>
          </div>
          {invReport.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Boxes className="h-10 w-10 mx-auto stroke-1 mb-2 opacity-50" />
              <p className="text-sm font-medium text-slate-600">No products found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase text-slate-400 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Stock Qty</th>
                    <th className="py-3 px-4">Cost Price</th>
                    <th className="py-3 px-4">Selling Price</th>
                    <th className="py-3 px-4 text-right">Asset Value (COGS)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invReport.map((item) => (
                    <tr key={item.product_id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-semibold text-slate-900">{item.name}</td>
                      <td className="py-3 px-4 text-xs text-slate-500">{item.category || '—'}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{item.stock_quantity}</td>
                      <td className="py-3 px-4 text-slate-500">${item.cost_price.toFixed(2)}</td>
                      <td className="py-3 px-4 text-slate-800 font-medium">${item.selling_price.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ${item.stock_value.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
