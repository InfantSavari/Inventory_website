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
  type: 'PURCHASE' | 'SALE' | 'QUOTATION';
  totalAmount: number;
  createdAt: string;
  user: {
    name: string;
    email: string;
    role: string;
  };
  items: OrderItem[];
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Notification state
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

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update status');
      }

      showToast(`Order status updated to ${newStatus}`, 'success');
      fetchOrders();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

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

  const filteredOrders = statusFilter === 'ALL' 
    ? orders 
    : orders.filter(o => o.status === statusFilter);

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
          <h1>Review Sales Orders</h1>
          <p>Audit quotation line conversions, verify rates, and approve/complete/reject incoming seller orders.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['ALL', 'PENDING', 'APPROVED', 'COMPLETED', 'REJECTED'].map((status) => (
            <button
              key={status}
              className={statusFilter === status ? 'btn' : 'btn-secondary'}
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
              onClick={() => setStatusFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p>Loading orders audit list...</p>
      ) : filteredOrders.length === 0 ? (
        <div className="glass-card flex-center" style={{ minHeight: '200px' }}>
          <p>No orders found for the selected status.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {filteredOrders.map((order) => (
            <div key={order.id} className="glass-card" style={{ padding: '2rem' }}>
              <div className="flex-between mb-4" style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'monospace' }}>{order.orderNumber}</h2>
                    <span className={`badge ${getStatusBadgeClass(order.status)}`}>{order.status}</span>
                    <span className={`badge ${order.type === 'PURCHASE' ? 'badge-primary' : order.type === 'SALE' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.75rem' }}>
                      {order.type === 'PURCHASE' ? 'Buy Order (Purchase)' : order.type === 'SALE' ? 'Direct Sale' : 'Sales Quotation'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Placed on: {new Date(order.createdAt).toLocaleString('en-IN')} by{' '}
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{order.user?.name}</span> ({order.user?.email})
                  </div>
                </div>

                <div className="flex-gap-2">
                  <label htmlFor={`status-select-${order.id}`} style={{ marginRight: '0.5rem' }}>Update Status:</label>
                  <select
                    id={`status-select-${order.id}`}
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    disabled={updatingId === order.id}
                    style={{ width: '150px', padding: '0.4rem' }}
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
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
                      <th>Conversion Math Audit Breakdown</th>
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
                  {order.type === 'PURCHASE' ? 'Total Buy Value:' : order.type === 'SALE' ? 'Total Sale Value:' : 'Total Quotation Value:'}
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
