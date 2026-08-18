import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Product, Category } from '../types';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  FolderPlus,
  Filter,
  CheckCircle,
  AlertCircle,
  Tag,
  ImagePlus,
} from 'lucide-react';

export const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formCategoryId, setFormCategoryId] = useState<number | undefined>();
  const [formCostPrice, setFormCostPrice] = useState('0.00');
  const [formSellingPrice, setFormSellingPrice] = useState('0.00');
  const [formMinStock, setFormMinStock] = useState('5');
  const [formUnit, setFormUnit] = useState('pcs');
  const [formDesc, setFormDesc] = useState('');
  const [formImageUrl, setFormImageUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Category form
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        api.get('/api/products?limit=200'),
        api.get('/api/categories'),
      ]);
      if (pRes.data.success) setProducts(pRes.data.data);
      if (cRes.data.success) setCategories(cRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormName(product.name);
      setFormSku(product.sku || '');
      setFormBarcode(product.barcode || '');
      setFormCategoryId(product.category_id);
      setFormCostPrice(String(product.cost_price));
      setFormSellingPrice(String(product.selling_price));
      setFormMinStock(String(product.minimum_stock));
      setFormUnit(product.unit || 'pcs');
      setFormDesc(product.description || '');
      setFormImageUrl((product as any).image_url || null);
    } else {
      setEditingProduct(null);
      setFormName('');
      setFormSku('');
      setFormBarcode('');
      setFormCategoryId(categories[0]?.id);
      setFormCostPrice('0.00');
      setFormSellingPrice('0.00');
      setFormMinStock('5');
      setFormUnit('pcs');
      setFormDesc('');
      setFormImageUrl(null);
    }
    setError(null);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        name: formName,
        sku: formSku || null,
        barcode: formBarcode || null,
        category_id: formCategoryId || null,
        cost_price: parseFloat(formCostPrice) || 0,
        selling_price: parseFloat(formSellingPrice) || 0,
        minimum_stock: parseInt(formMinStock) || 0,
        unit: formUnit,
        description: formDesc || null,
      };

      if (editingProduct) {
        await api.put(`/api/products/${editingProduct.id}`, payload);
      } else {
        await api.post('/api/products', payload);
      }

      setIsProductModalOpen(false);
      fetchData();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        (Array.isArray(err.response?.data?.detail)
          ? err.response.data.detail.map((d: any) => `${d.loc?.slice(-1)[0]}: ${d.msg}`).join(', ')
          : null) ||
        'Failed to save product. Please check your inputs.';
      setError(msg);
    }
  };

  const handleImageUpload = async (productId: number, file: File) => {
    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post(`/api/products/${productId}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        setFormImageUrl(res.data.data.image_url);
        fetchData();
      }
    } catch (err: any) {
      setError('Image upload failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setImageUploading(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/categories', { name: newCatName, description: newCatDesc || null });
      setNewCatName('');
      setNewCatDesc('');
      setIsCategoryModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create category.');
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm('Are you sure you want to archive this product?')) return;
    try {
      await api.delete(`/api/products/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to archive product.');
    }
  };

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = selectedCategory ? p.category_id === selectedCategory : true;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products Catalog</h1>
          <p className="text-sm text-slate-500">Manage your product catalog, categories, and prices</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsCategoryModalOpen(true)} className="btn-secondary text-xs">
            <FolderPlus className="h-3.5 w-3.5" /> New Category
          </button>
          <button onClick={() => openProductModal()} className="btn-primary text-xs">
            <Plus className="h-3.5 w-3.5" /> Add Product
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card !p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 !py-1.5 text-xs"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCategory(undefined)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
              selectedCategory === undefined
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Categories ({products.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                selectedCategory === c.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="card !p-0 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Package className="h-10 w-10 mx-auto stroke-1 mb-2 opacity-50" />
            <p className="text-sm font-medium text-slate-600">No products found</p>
            <p className="text-xs mt-1">Click "Add Product" above to create your first product.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase text-slate-400 font-semibold">
                <tr>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Cost Price</th>
                  <th className="py-3 px-4">Selling Price</th>
                  <th className="py-3 px-4">In Stock</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => {
                  const isLow = p.stock_quantity <= p.minimum_stock;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        {p.description && <div className="text-[11px] text-slate-400 truncate max-w-xs">{p.description}</div>}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-500">{p.sku || '—'}</td>
                      <td className="py-3 px-4">
                        <span className="badge bg-slate-100 text-slate-700">
                          {p.category?.name || 'Uncategorized'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">${Number(p.cost_price).toFixed(2)}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">${Number(p.selling_price).toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`badge ${
                            p.stock_quantity <= 0
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : isLow
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {p.stock_quantity} {p.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openProductModal(p)}
                            title="Edit"
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            title="Archive"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h3>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Wireless Ergonomic Mouse"
                  className="input text-xs"
                />
              </div>

              {/* Image Upload (only when editing an existing product) */}
              {editingProduct && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Product Image</label>
                  <div
                    className="relative border-2 border-dashed border-slate-200 rounded-xl overflow-hidden cursor-pointer hover:border-emerald-400 transition-colors"
                    style={{ height: 100 }}
                    onClick={() => imageInputRef.current?.click()}
                  >
                    {formImageUrl ? (
                      <img src={formImageUrl} alt="Product" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-1">
                        <ImagePlus className="h-6 w-6" />
                        <span className="text-xs">{imageUploading ? 'Uploading...' : 'Click to upload image'}</span>
                      </div>
                    )}
                    {imageUploading && (
                      <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                        <div className="h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && editingProduct) handleImageUpload(editingProduct.id, file);
                    }}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">SKU</label>
                  <input
                    type="text"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    placeholder="WEM-001"
                    className="input text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Category</label>
                  <select
                    value={formCategoryId || ''}
                    onChange={(e) => setFormCategoryId(e.target.value ? Number(e.target.value) : undefined)}
                    className="input text-xs"
                  >
                    <option value="">None</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Cost Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formCostPrice}
                    onChange={(e) => setFormCostPrice(e.target.value)}
                    className="input text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Selling Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formSellingPrice}
                    onChange={(e) => setFormSellingPrice(e.target.value)}
                    className="input text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Min Stock Threshold</label>
                  <input
                    type="number"
                    required
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(e.target.value)}
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Unit of Measure</label>
                  <input
                    type="text"
                    required
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    placeholder="pcs, kg, box, etc."
                    className="input text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Optional product notes..."
                  className="input text-xs"
                ></textarea>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="flex-1 btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary text-xs">
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">New Category</h3>
            <form onSubmit={handleCreateCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Beverages, Electronics"
                  className="input text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Description</label>
                <input
                  type="text"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="Optional description..."
                  className="input text-xs"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="flex-1 btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary text-xs">
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
