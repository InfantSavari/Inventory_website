'use client';

import React, { useEffect, useState } from 'react';

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  dimension: 'WEIGHT' | 'VOLUME' | 'COUNT';
  baseUnit: string;
  basePrice: number;
  inventoryQuantity: number;
}

const DIMENSION_UNITS = {
  WEIGHT: ['g', 'kg'],
  VOLUME: ['mL', 'L'],
  COUNT: ['item'],
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category: '',
    dimension: 'WEIGHT' as 'WEIGHT' | 'VOLUME' | 'COUNT',
    baseUnit: 'kg',
    basePrice: '',
    inventoryQuantity: '',
  });

  // Notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchProducts = async () => {
    try {
      const url = new URL('/api/products', window.location.origin);
      if (search) url.searchParams.set('search', search);
      if (categoryFilter) url.searchParams.set('category', categoryFilter);

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products);
        
        // Extract unique categories
        const cats: string[] = Array.from(
          new Set(data.products.map((p: Product) => p.category).filter(Boolean))
        ) as string[];
        setCategories(cats);
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, categoryFilter]);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData({
      sku: '',
      name: '',
      description: '',
      category: '',
      dimension: 'WEIGHT',
      baseUnit: 'kg',
      basePrice: '',
      inventoryQuantity: '',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      name: product.name,
      description: product.description || '',
      category: product.category || '',
      dimension: product.dimension,
      baseUnit: product.baseUnit,
      basePrice: product.basePrice.toString(),
      inventoryQuantity: product.inventoryQuantity.toString(),
    });
    setModalOpen(true);
  };

  const handleDimensionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const dim = e.target.value as 'WEIGHT' | 'VOLUME' | 'COUNT';
    const defaultUnit = DIMENSION_UNITS[dim][0];
    setFormData({
      ...formData,
      dimension: dim,
      baseUnit: defaultUnit,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
    if (!formData.sku || !formData.name || !formData.basePrice || !formData.inventoryQuantity) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    const payload = {
      ...formData,
      basePrice: Number(formData.basePrice),
      inventoryQuantity: Number(formData.inventoryQuantity),
    };

    try {
      let res;
      if (editingProduct) {
        // Edit product
        res = await fetch(`/api/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // Create product
        res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save product');
      }

      showToast(`Product ${editingProduct ? 'updated' : 'created'} successfully!`, 'success');
      setModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete product. It might be referenced in placed orders.');
      }

      showToast('Product deleted successfully', 'success');
      fetchProducts();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div>
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <span style={{ fontWeight: 600 }}>{toast.type === 'success' ? 'Success' : 'Error'}:</span>
          <span>{toast.message}</span>
        </div>
      )}

      <div className="flex-between mb-6">
        <div>
          <h1>Manage Products</h1>
          <p>Configure catalog items, base units, rates, and track physical inventory levels.</p>
        </div>
        <button id="add-product-btn" onClick={handleOpenCreate}>
          Create New Product
        </button>
      </div>

      <div className="search-bar-container">
        <input
          id="product-search-input"
          type="text"
          placeholder="Search by SKU, name, or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        <select
          id="category-filter-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="filter-select"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p>Loading products list...</p>
      ) : products.length === 0 ? (
        <div className="glass-card flex-center" style={{ minHeight: '200px' }}>
          <p>No products found matching your search. Create one to get started!</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>Category</th>
                <th>Dimension</th>
                <th>Base Unit</th>
                <th>Base Price</th>
                <th>Inventory</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.sku}</td>
                  <td>
                    <div>
                      <div style={{ fontWeight: 500 }}>{p.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {p.description || 'No description'}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-primary">{p.category || 'Default'}</span>
                  </td>
                  <td>{p.dimension}</td>
                  <td>
                    <span style={{ fontFamily: 'monospace' }}>{p.baseUnit}</span>
                  </td>
                  <td>{formatCurrency(Number(p.basePrice))}</td>
                  <td style={{ fontWeight: 600 }} className={Number(p.inventoryQuantity) < (p.baseUnit === 'g' || p.baseUnit === 'mL' ? 1000 : 10) ? 'text-danger' : ''}>
                    {Number(p.inventoryQuantity).toFixed(4)} {p.baseUnit}
                  </td>
                  <td className="text-right">
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                        onClick={() => handleOpenEdit(p)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-danger"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                        onClick={() => handleDelete(p.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingProduct ? 'Edit Product' : 'Create Product'}</h2>
              <button
                className="btn-secondary"
                style={{ padding: '0.25rem 0.5rem', borderRadius: '50%' }}
                onClick={() => setModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid-2">
                  <div className="form-group">
                    <label htmlFor="modal-sku">SKU *</label>
                    <input
                      id="modal-sku"
                      type="text"
                      placeholder="e.g. RICE-KG-01"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="modal-name">Product Name *</label>
                    <input
                      id="modal-name"
                      type="text"
                      placeholder="e.g. Basmati Rice"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label htmlFor="modal-category">Category</label>
                    <input
                      id="modal-category"
                      type="text"
                      placeholder="e.g. Grocery"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="modal-dimension">Dimension *</label>
                    <select
                      id="modal-dimension"
                      value={formData.dimension}
                      onChange={handleDimensionChange}
                    >
                      <option value="WEIGHT">WEIGHT (g, kg)</option>
                      <option value="VOLUME">VOLUME (mL, L)</option>
                      <option value="COUNT">COUNT (item)</option>
                    </select>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label htmlFor="modal-unit">Base Storage Unit *</label>
                    <select
                      id="modal-unit"
                      value={formData.baseUnit}
                      onChange={(e) => setFormData({ ...formData, baseUnit: e.target.value })}
                    >
                      {DIMENSION_UNITS[formData.dimension].map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="modal-price">Base Price (₹ per unit) *</label>
                    <input
                      id="modal-price"
                      type="number"
                      step="0.00000001"
                      placeholder="0.00"
                      value={formData.basePrice}
                      onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="modal-qty">Initial Inventory Quantity (in Base Unit) *</label>
                  <input
                    id="modal-qty"
                    type="number"
                    step="0.00000001"
                    placeholder="0.00"
                    value={formData.inventoryQuantity}
                    onChange={(e) => setFormData({ ...formData, inventoryQuantity: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="modal-desc">Description</label>
                  <textarea
                    id="modal-desc"
                    placeholder="Describe the product details..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button id="modal-submit-btn" type="submit">
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
