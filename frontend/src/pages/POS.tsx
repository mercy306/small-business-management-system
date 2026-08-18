import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import { Product, Customer, Sale } from '../types';
import { BarcodeScanner } from '../components/BarcodeScanner';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  Printer,
  CreditCard,
  UserPlus,
  Receipt,
  RotateCcw,
  Mail,
  Send,
  ScanLine,
} from 'lucide-react';

interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
  discount: number;
}

export const POS: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | undefined>();
  const [saleDiscount, setSaleDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'credit'>('cash');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receiptEmail, setReceiptEmail] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);

  // USB / Bluetooth barcode scanner support
  // Hardware scanners type the barcode rapidly then press Enter.
  // We detect rapid keystrokes (< 50ms apart) followed by Enter as a scan.
  const barcodeBufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);

  const handleBarcodeScanned = useCallback((barcode: string) => {
    const trimmed = barcode.trim();
    if (!trimmed) return;
    // Find product by barcode or SKU
    const found = products.find(
      (p) => p.barcode === trimmed || p.sku === trimmed
    );
    if (found) {
      setCart((prev) => {
        const existing = prev.find((ci) => ci.product.id === found.id);
        if (existing) {
          return prev.map((ci) =>
            ci.product.id === found.id ? { ...ci, quantity: ci.quantity + 1 } : ci
          );
        }
        return [...prev, { product: found, quantity: 1, unit_price: Number(found.selling_price), discount: 0 }];
      });
      setSearch('');
    } else {
      setSearch(trimmed); // show in search so user sees "no match"
    }
  }, [products]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const now = Date.now();
      if (e.key === 'Enter') {
        if (barcodeBufferRef.current.length >= 3) {
          handleBarcodeScanned(barcodeBufferRef.current);
        }
        barcodeBufferRef.current = '';
      } else if (e.key.length === 1) {
        if (now - lastKeyTimeRef.current < 80) {
          barcodeBufferRef.current += e.key;
        } else {
          barcodeBufferRef.current = e.key;
        }
        lastKeyTimeRef.current = now;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleBarcodeScanned]);

  // Fetch products and customers
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pRes, cRes] = await Promise.all([
          api.get('/api/products?is_active=true&limit=200'),
          api.get('/api/customers?limit=100'),
        ]);
        if (pRes.data.success) setProducts(pRes.data.data);
        if (cRes.data.success) setCustomers(cRes.data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  // Filter products
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
      (p.barcode && p.barcode.includes(search))
  );

  // Cart operations
  const addToCart = (product: Product) => {
    if (product.stock_quantity <= 0) {
      setError(`"${product.name}" is out of stock!`);
      return;
    }
    setError(null);
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) {
          setError(`Cannot add more than available stock (${product.stock_quantity})`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        { product, quantity: 1, unit_price: Number(product.selling_price), discount: 0 },
      ];
    });
  };

  const updateQuantity = (productId: number, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    const product = products.find((p) => p.id === productId);
    if (product && qty > product.stock_quantity) {
      setError(`Cannot exceed available stock of ${product.stock_quantity}`);
      return;
    }
    setError(null);
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: qty } : item
      )
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomerId(undefined);
    setSaleDiscount(0);
    setAmountPaid('');
    setPaymentReference('');
    setNotes('');
    setError(null);
  };

  // Totals calculations
  const subtotal = cart.reduce(
    (acc, item) => acc + item.quantity * item.unit_price - item.discount,
    0
  );
  const taxRate = 0; // Default or from business
  const taxableAmount = Math.max(subtotal - saleDiscount, 0);
  const tax = taxableAmount * (taxRate / 100);
  const total = taxableAmount + tax;
  const numericAmountPaid = parseFloat(amountPaid) || 0;
  const changeDue = Math.max(numericAmountPaid - total, 0);
  const balanceDue = Math.max(total - numericAmountPaid, 0);

  // Auto-fill amount paid with total
  useEffect(() => {
    if (total > 0 && !amountPaid) {
      setAmountPaid(total.toFixed(2));
    }
  }, [total]);

  // Submit sale
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      setError('Cart is empty.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const payload = {
        customer_id: selectedCustomerId || null,
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount,
        })),
        discount: saleDiscount,
        amount_paid: numericAmountPaid,
        payment_method: paymentMethod,
        payment_reference: paymentReference || null,
        notes: notes || null,
      };

      const res = await api.post('/api/sales', payload);
      if (res.data.success) {
        setCompletedSale(res.data.data);
        clearCart();
        // Update product stock locally
        setProducts((prev) =>
          prev.map((p) => {
            const sold = cart.find((i) => i.product.id === p.id);
            return sold ? { ...p, stock_quantity: p.stock_quantity - sold.quantity } : p;
          })
        );
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Checkout failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Point of Sale (POS)</h1>
          <p className="text-sm text-slate-500">Scan or search products to process a fast sale</p>
        </div>
        {cart.length > 0 && (
          <button onClick={clearCart} className="btn-secondary text-xs text-rose-600 hover:bg-rose-50">
            <RotateCcw className="h-3.5 w-3.5" /> Clear Cart
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-xs font-bold">✕</button>
        </div>
      )}

      {/* POS Grid: Catalog on left, Cart & Checkout on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Product Catalog (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search bar + Camera Scan Button */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search products by name, SKU, or scan barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
                autoFocus
              />
            </div>
            <button
              type="button"
              onClick={() => setShowCameraScanner(true)}
              className="btn-secondary !px-3.5 flex items-center gap-1.5 shrink-0 text-xs font-semibold"
              title="Open camera to scan barcode"
            >
              <ScanLine className="h-4 w-4 text-emerald-600" />
              <span className="hidden sm:inline">Scan</span>
            </button>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredProducts.map((product) => {
              const inCart = cart.find((i) => i.product.id === product.id);
              const outOfStock = product.stock_quantity <= 0;

              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={outOfStock}
                  className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all relative ${
                    outOfStock
                      ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                      : inCart
                      ? 'bg-emerald-50/50 border-emerald-300 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-emerald-500 hover:shadow-md'
                  }`}
                >
                  {inCart && (
                    <span className="absolute top-2 right-2 badge bg-emerald-600 text-white">
                      {inCart.quantity}
                    </span>
                  )}
                  <div>
                    <h4 className="font-semibold text-slate-900 text-xs sm:text-sm line-clamp-2">
                      {product.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">{product.sku || 'No SKU'}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">
                      ${Number(product.selling_price).toFixed(2)}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        outOfStock
                          ? 'bg-rose-100 text-rose-700'
                          : product.stock_quantity <= product.minimum_stock
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {outOfStock ? 'Out' : `${product.stock_quantity} left`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cart & Checkout (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-emerald-600" />
                Current Cart ({cart.reduce((acc, i) => acc + i.quantity, 0)} items)
              </h3>
              {/* Customer Selector */}
              <select
                value={selectedCustomerId || ''}
                onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : undefined)}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 focus:outline-none"
              >
                <option value="">Walk-in Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Bal: ${Number(c.balance).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            {/* Cart Items List */}
            {cart.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                <ShoppingCart className="h-10 w-10 mx-auto stroke-1 mb-2 opacity-40" />
                Cart is empty. Click a product on the left to start.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="font-semibold text-xs text-slate-800 truncate">{item.product.name}</p>
                      <p className="text-[11px] text-slate-500">${item.unit_price.toFixed(2)} each</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-slate-200 rounded-md bg-white">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="p-1 text-slate-500 hover:bg-slate-100 rounded-l"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-2 text-xs font-bold text-slate-800">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="p-1 text-slate-500 hover:bg-slate-100 rounded-r"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <span className="font-bold text-xs text-slate-900 w-14 text-right">
                        ${(item.quantity * item.unit_price).toFixed(2)}
                      </span>

                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Calculations */}
            {cart.length > 0 && (
              <div className="border-t border-slate-100 pt-3 space-y-2 text-sm">
                <div className="flex justify-between text-slate-500 text-xs">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Discount ($)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={saleDiscount || ''}
                    onChange={(e) => setSaleDiscount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-20 px-2 py-0.5 border border-slate-200 rounded text-right text-xs"
                  />
                </div>

                <div className="flex justify-between font-bold text-base text-slate-900 border-t border-slate-200/80 pt-2">
                  <span>Total Amount</span>
                  <span className="text-emerald-600">${total.toFixed(2)}</span>
                </div>

                {/* Payment Controls */}
                <form onSubmit={handleCheckout} className="space-y-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-4 gap-1.5 text-xs">
                      {(['cash', 'card', 'transfer', 'credit'] as const).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={`py-1.5 rounded-lg font-medium capitalize border transition-all ${
                            paymentMethod === method
                              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                        Amount Paid
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        placeholder={total.toFixed(2)}
                        className="input text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                        Change / Balance
                      </label>
                      <div className="px-3 py-2 bg-slate-100 rounded-lg text-xs font-mono font-semibold text-slate-700">
                        {changeDue > 0 ? `Change: $${changeDue.toFixed(2)}` : `Due: $${balanceDue.toFixed(2)}`}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || cart.length === 0}
                    className="w-full btn-primary py-3 text-sm font-bold shadow-md shadow-emerald-600/20"
                  >
                    {loading ? 'Processing Sale...' : `Complete Sale ($${total.toFixed(2)})`}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sale Completion / Receipt Modal */}
      {completedSale && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="text-center space-y-1">
              <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Sale Completed!</h3>
              <p className="text-xs font-mono text-slate-500">Invoice: {completedSale.invoice_number}</p>
            </div>

            {/* Receipt Summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between font-semibold text-slate-800 border-b border-slate-200 pb-2">
                <span>Item</span>
                <span>Total</span>
              </div>
              {completedSale.items?.map((item) => (
                <div key={item.id} className="flex justify-between text-slate-600">
                  <span>{item.quantity}x {item.product_name || `Product #${item.product_id}`}</span>
                  <span>${Number(item.total).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-slate-200 pt-2 space-y-1 font-semibold">
                <div className="flex justify-between text-slate-700">
                  <span>Subtotal</span>
                  <span>${Number(completedSale.subtotal).toFixed(2)}</span>
                </div>
                {Number(completedSale.discount) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span>
                    <span>-${Number(completedSale.discount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-900 text-sm font-bold pt-1">
                  <span>Total</span>
                  <span className="text-emerald-600">${Number(completedSale.total).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500 font-normal">
                  <span>Amount Paid</span>
                  <span>${Number(completedSale.amount_paid).toFixed(2)}</span>
                </div>
                {Number(completedSale.balance_due) > 0 && (
                  <div className="flex justify-between text-rose-600 font-bold">
                    <span>Balance Due</span>
                    <span>${Number(completedSale.balance_due).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Email Receipt */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-600 uppercase">Send Email Receipt</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={receiptEmail}
                  onChange={(e) => { setReceiptEmail(e.target.value); setEmailSent(false); }}
                  placeholder="customer@email.com"
                  className="input text-xs flex-1"
                />
                <button
                  type="button"
                  disabled={!receiptEmail || emailSending || emailSent}
                  onClick={async () => {
                    if (!completedSale?.id || !receiptEmail) return;
                    setEmailSending(true);
                    try {
                      await api.post(`/api/sales/${completedSale.id}/send-receipt`, { email: receiptEmail });
                      setEmailSent(true);
                    } catch {
                      alert('Failed to send email. Check SMTP settings.');
                    } finally {
                      setEmailSending(false);
                    }
                  }}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    emailSent
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-40'
                  }`}
                >
                  {emailSent ? <CheckCircle className="h-3.5 w-3.5" /> : emailSending ? <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {emailSent ? 'Sent!' : emailSending ? '...' : 'Send'}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 btn-secondary text-xs"
              >
                <Printer className="h-4 w-4" /> Print Receipt
              </button>
              <button
                onClick={() => setCompletedSale(null)}
                className="flex-1 btn-primary text-xs"
              >
                Done / Next Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Barcode Scanner Modal */}
      {showCameraScanner && (
        <BarcodeScanner
          onScan={(code) => handleBarcodeScanned(code)}
          onClose={() => setShowCameraScanner(false)}
        />
      )}
    </div>
  );
};
