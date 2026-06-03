'use client';

import React, { useEffect, useState } from 'react';
import { formatConversionDetails } from '@/utils/unitConversion';

interface OrderItem {
  id: string;
  productId: string;
  orderedUnit: string;
  orderedQuantity: number;
  quantityInBaseUnit: number;
  pricePerOrderedUnit: number;
  totalPrice: number;
  product: {
    sku: string;
    name: string;
    baseUnit: string;
    basePrice: number;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED';
  type: 'PURCHASE' | 'QUOTATION';
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
}

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Toast Notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'badge-warning';
      case 'APPROVED':
        return 'badge-primary';
      case 'COMPLETED':
        return 'badge-success';
      case 'REJECTED':
        return 'badge-danger';
      default:
        return '';
    }
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
          <h1>My Orders & Quotations</h1>
          <p>View historical purchases and quotations, check approval status, and inspect transaction conversions.</p>
        </div>
        <button id="seller-refresh-orders" onClick={fetchOrders} className="btn-secondary">
          Refresh List
        </button>
      </div>

      {loading ? (
        <p>Loading orders list...</p>
      ) : orders.length === 0 ? (
        <div className="glass-card flex-center" style={{ minHeight: '200px' }}>
          <p>You have not placed any orders yet. Visit the catalog to create your first order!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {orders.map((order) => (
            <div key={order.id} className="glass-card" style={{ padding: '2rem' }}>
              <div className="flex-between mb-4" style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'monospace' }}>{order.orderNumber}</h2>
                    <span className={`badge ${getStatusBadgeClass(order.status)}`}>{order.status}</span>
                    <span className={`badge ${order.type === 'PURCHASE' ? 'badge-success' : 'badge-primary'}`} style={{ fontSize: '0.75rem' }}>
                      {order.type === 'PURCHASE' ? 'Direct Purchase' : 'Sales Quotation'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Submitted on: {new Date(order.createdAt).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div className="table-container" style={{ margin: '1rem 0 1.5rem 0', background: 'rgba(15, 23, 42, 0.3)' }}>
                <table>
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Product</th>
                      <th className="text-right">Ordered Qty</th>
                      <th className="text-right">Quantity (Base)</th>
                      <th className="text-right">Base Price</th>
                      <th>Calculated Math Breakdown</th>
                      <th className="text-right">Total Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{item.product?.sku}</td>
                        <td>{item.product?.name}</td>
                        <td className="text-right" style={{ fontWeight: 600 }}>
                          {Number(item.orderedQuantity).toFixed(4)} {item.orderedUnit}
                        </td>
                        <td className="text-right" style={{ color: 'var(--text-secondary)' }}>
                          {Number(item.quantityInBaseUnit).toFixed(4)} {item.product?.baseUnit}
                        </td>
                        <td className="text-right">
                          {formatCurrency(Number(item.product?.basePrice))} / {item.product?.baseUnit}
                        </td>
                        <td>
                          <div className="conversion-math" style={{ background: 'rgba(0,0,0,0.2)', padding: '0.25rem 0.5rem', borderRadius: '4px', display: 'inline-block' }}>
                            {formatConversionDetails(
                              Number(item.orderedQuantity),
                              item.orderedUnit,
                              Number(item.quantityInBaseUnit),
                              item.product?.baseUnit,
                              Number(item.product?.basePrice),
                              Number(item.totalPrice)
                            )}
                          </div>
                        </td>
                        <td className="text-right" style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                          {formatCurrency(Number(item.totalPrice))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="checkout-section">
                <span className="total-label">
                  {order.type === 'PURCHASE' ? 'Total Purchase Value:' : 'Total Quotation Value:'}
                </span>
                <span className="total-amount">{formatCurrency(Number(order.totalAmount))}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
