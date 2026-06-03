'use client';

import React, { useEffect, useState } from 'react';
import { getConversionFactor, UNITS, Dimension, Unit } from '@/utils/unitConversion';
import { useAuth } from '@/context/AuthContext';

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  dimension: Dimension;
  baseUnit: string;
  basePrice: number;
  inventoryQuantity: number;
}

interface CartItem {
  product: Product;
  orderedUnit: string;
  orderedQuantity: number;
  quantityInBaseUnit: number;
  pricePerOrderedUnit: number;
  totalPrice: number;
}

export default function SellerPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  
  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Local input state per product (using ID as key)
  const [inputs, setInputs] = useState<Record<string, { qty: string; unit: string }>>({});

  // Toast Notification state
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
        
        // Initialize inputs for new products
        const newInputs = { ...inputs };
        data.products.forEach((p: Product) => {
          if (!newInputs[p.id]) {
            newInputs[p.id] = { qty: '1', unit: p.baseUnit };
          }
        });
        setInputs(newInputs);

        // Categories list
        const cats = Array.from(
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

  const handleQtyChange = (productId: string, val: string) => {
    setInputs({
      ...inputs,
      [productId]: { ...inputs[productId], qty: val },
    });
  };

  const handleUnitChange = (productId: string, val: string) => {
    setInputs({
      ...inputs,
      [productId]: { ...inputs[productId], unit: val },
    });
  };

  // Live conversion calculations helper
  const getLivePreview = (product: Product) => {
    const input = inputs[product.id];
    if (!input) return null;

    const qty = Number(input.qty);
    if (isNaN(qty) || qty <= 0) return null;

    try {
      const factor = getConversionFactor(input.unit, product.baseUnit);
      const qtyInBase = qty * factor;
      const subtotal = qtyInBase * Number(product.basePrice);
      const pricePerOrdered = Number(product.basePrice) * factor;

      return {
        qtyInBase,
        subtotal,
        pricePerOrdered,
        needsConversion: input.unit !== product.baseUnit,
      };
    } catch {
      return null;
    }
  };

  const addToCart = (product: Product) => {
    const input = inputs[product.id];
    if (!input) return;

    const qty = Number(input.qty);
    if (isNaN(qty) || qty <= 0) {
      showToast('Please enter a valid positive quantity', 'error');
      return;
    }

    try {
      const factor = getConversionFactor(input.unit, product.baseUnit);
      const qtyInBase = qty * factor;

      // Check current local inventory (including items already in cart)
      const existingInCart = cart.filter(item => item.product.id === product.id);
      const totalInCartBase = existingInCart.reduce((sum, item) => sum + item.quantityInBaseUnit, 0);
      const remainingInventory = Number(product.inventoryQuantity) - totalInCartBase;

      if (qtyInBase > remainingInventory) {
        showToast(`Insufficient stock for "${product.name}". Available: ${remainingInventory.toFixed(4)} ${product.baseUnit}, requested: ${qtyInBase.toFixed(4)} ${product.baseUnit}`, 'error');
        return;
      }

      const itemTotalPrice = qtyInBase * Number(product.basePrice);
      const pricePerOrdered = Number(product.basePrice) * factor;

      // Check if product with same unit exists in cart to merge
      const existingIndex = cart.findIndex(
        item => item.product.id === product.id && item.orderedUnit === input.unit
      );

      if (existingIndex > -1) {
        const updatedCart = [...cart];
        updatedCart[existingIndex].orderedQuantity += qty;
        updatedCart[existingIndex].quantityInBaseUnit += qtyInBase;
        updatedCart[existingIndex].totalPrice += itemTotalPrice;
        setCart(updatedCart);
      } else {
        setCart([
          ...cart,
          {
            product,
            orderedUnit: input.unit,
            orderedQuantity: qty,
            quantityInBaseUnit: qtyInBase,
            pricePerOrderedUnit: pricePerOrdered,
            totalPrice: itemTotalPrice,
          },
        ]);
      }

      showToast(`Added ${qty} ${input.unit} of ${product.name} to cart`, 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const removeFromCart = (index: number) => {
    const item = cart[index];
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
    showToast(`Removed ${item.product.name} from cart`, 'success');
  };

  const handleCheckout = async (orderType: 'PURCHASE' | 'QUOTATION') => {
    if (cart.length === 0) return;

    try {
      const payload = {
        type: orderType,
        items: cart.map(item => ({
          productId: item.product.id,
          orderedUnit: item.orderedUnit,
          orderedQuantity: item.orderedQuantity,
        })),
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to place order');
      }

      const successMsg = orderType === 'PURCHASE'
        ? `Direct Purchase ${data.order.orderNumber} placed successfully!`
        : `Sales Quotation ${data.order.orderNumber} submitted successfully!`;

      showToast(successMsg, 'success');
      setCart([]);
      fetchProducts(); // refresh products stock
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

  const cartTotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '2rem' }}>
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <span style={{ fontWeight: 600 }}>{toast.type === 'success' ? 'Success' : 'Error'}:</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Catalog Column */}
      <div>
        <div className="flex-between mb-6">
          <div>
            <h1>Product Catalog & Ordering</h1>
            <p>
              Search items, see real-time price conversions, and add them to your basket to purchase directly or request a quotation.
            </p>
          </div>
        </div>

        <div className="search-bar-container">
          <input
            id="seller-search-input"
            type="text"
            placeholder="Search by SKU, name, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          <select
            id="seller-category-select"
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
          <p>Loading catalog items...</p>
        ) : products.length === 0 ? (
          <div className="glass-card flex-center" style={{ minHeight: '200px' }}>
            <p>No products found matching filters.</p>
          </div>
        ) : (
          <div className="catalog-grid">
            {products.map((p) => {
              const live = getLivePreview(p);
              const productInput = inputs[p.id] || { qty: '1', unit: p.baseUnit };
              const availableQty = Number(p.inventoryQuantity);
              const isOutOfStock = availableQty <= 0;

              return (
                <div key={p.id} className="glass-card catalog-card">
                  <div>
                    <div className="card-tags">
                      <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>{p.category || 'Item'}</span>
                      <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>{p.dimension}</span>
                    </div>
                    <h2 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{p.name}</h2>
                    <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }} className="mb-2">
                      SKU: {p.sku}
                    </p>
                    <p style={{ fontSize: '0.85rem', marginBottom: '1rem', minHeight: '2.5rem' }}>
                      {p.description || 'No description available.'}
                    </p>
                  </div>

                  <div className="catalog-footer">
                    <div className="flex-between">
                      <div>
                        <div className="price-display">{formatCurrency(Number(p.basePrice))}</div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          per {p.baseUnit}
                        </span>
                      </div>
                      <div className="text-right">
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }} className={isOutOfStock ? 'text-danger' : 'text-success'}>
                          {isOutOfStock ? 'OUT OF STOCK' : `${availableQty.toFixed(2)} ${p.baseUnit} In Stock`}
                        </div>
                      </div>
                    </div>

                    {!isOutOfStock && (
                      <div>
                        <div className="order-selector mb-2">
                          <input
                            id={`qty-input-${p.id}`}
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={productInput.qty}
                            onChange={(e) => handleQtyChange(p.id, e.target.value)}
                            placeholder="Qty"
                            style={{ padding: '0.5rem' }}
                          />
                          <select
                            id={`unit-select-${p.id}`}
                            value={productInput.unit}
                            onChange={(e) => handleUnitChange(p.id, e.target.value)}
                            style={{ padding: '0.5rem' }}
                          >
                            {UNITS[p.dimension].map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Real-time Conversion Preview */}
                        {live && (
                          <div style={{ background: 'rgba(0,0,0,0.15)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.75rem', marginBottom: '0.75rem', border: '1px solid var(--border-color)' }}>
                            <div className="flex-between">
                              <span style={{ color: 'var(--text-secondary)' }}>Equivalent Base:</span>
                              <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                                {live.qtyInBase.toFixed(4)} {p.baseUnit}
                              </span>
                            </div>
                            <div className="flex-between">
                              <span style={{ color: 'var(--text-secondary)' }}>Rate:</span>
                              <span style={{ fontFamily: 'monospace' }}>
                                {formatCurrency(live.pricePerOrdered)} / {productInput.unit}
                              </span>
                            </div>
                            <div className="flex-between" style={{ marginTop: '0.25rem', paddingTop: '0.25rem', borderTop: '1px dashed var(--border-color)', fontWeight: 600 }}>
                              <span>Subtotal:</span>
                              <span className="text-success">{formatCurrency(live.subtotal)}</span>
                            </div>
                          </div>
                        )}

                        <button
                          id={`add-to-cart-${p.id}`}
                          onClick={() => addToCart(p)}
                          style={{ width: '100%', padding: '0.5rem' }}
                        >
                          Add to Basket
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart Column */}
      <div style={{ position: 'sticky', top: '2.5rem', height: 'fit-content' }}>
        <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid var(--border-active)', boxShadow: 'var(--shadow-glow)' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            Your Order Basket
          </h2>

          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
              <p>Your basket is empty.</p>
              <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                Select products on the left and add them to place a purchase or submit a quotation.
              </p>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '350px', overflowY: 'auto', marginBottom: '1.5rem', paddingRight: '0.25rem' }}>
                {cart.map((item, idx) => (
                  <div key={`${item.product.id}-${item.orderedUnit}-${idx}`} className="cart-item">
                    <div style={{ flex: 1, minWidth: 0, marginRight: '0.5rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.product.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {item.orderedQuantity} {item.orderedUnit}
                        {item.orderedUnit !== item.product.baseUnit && (
                          <span style={{ color: 'var(--text-muted)' }}>
                            {' '}
                            ({item.quantityInBaseUnit.toFixed(2)} {item.product.baseUnit})
                          </span>
                        )}
                      </div>
                      <div className="conversion-math">
                        {item.orderedQuantity} × {formatCurrency(item.pricePerOrderedUnit)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{formatCurrency(item.totalPrice)}</span>
                      <button
                        className="btn-danger"
                        style={{ padding: '0.25rem 0.4rem', fontSize: '0.75rem' }}
                        onClick={() => removeFromCart(idx)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="cart-summary">
                <div className="flex-between">
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Line Items:</span>
                  <span style={{ fontWeight: 600 }}>{cart.length}</span>
                </div>
                <div className="flex-between" style={{ marginTop: '0.5rem', fontSize: '1rem', fontWeight: 700 }}>
                  <span>Total Value:</span>
                  <span className="text-success">{formatCurrency(cartTotal)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  id="direct-purchase-btn"
                  onClick={() => handleCheckout('PURCHASE')}
                  style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--color-success)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: 'pointer' }}
                >
                  Place Direct Purchase
                </button>
                <button
                  id="submit-quotation-btn"
                  onClick={() => handleCheckout('QUOTATION')}
                  className="btn-secondary"
                  style={{ width: '100%', padding: '0.75rem', fontWeight: '600' }}
                >
                  Submit Sales Quotation
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
