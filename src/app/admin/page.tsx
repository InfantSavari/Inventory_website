'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

interface Metrics {
  totalInventoryValue: number;
  lowStockCount: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  approvedOrders: number;
  totalProducts: number;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  baseUnit: string;
  basePrice: number;
  inventoryQuantity: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const resMetrics = await fetch('/api/admin/metrics');
      if (resMetrics.ok) {
        const data = await resMetrics.json();
        setMetrics(data.metrics);
      }

      const resProds = await fetch('/api/products');
      if (resProds.ok) {
        const data = await resProds.json();
        const allProds = data.products as Product[];
        
        const lowStock = allProds.filter(prod => {
          const qty = Number(prod.inventoryQuantity);
          const threshold = prod.baseUnit === 'g' || prod.baseUnit === 'mL' ? 1000 : 10;
          return qty < threshold;
        });
        setLowStockProducts(lowStock);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val);
  };

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading dashboard metrics...</div>;
  }

  return (
    <div>
      <div className="flex-between mb-6">
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Welcome, {user?.name}</h1>
          <p>Here is the status of your inventory and sales quotations.</p>
        </div>
        <button id="admin-refresh-metrics-btn" onClick={fetchData} className="btn-secondary">
          Refresh Metrics
        </button>
      </div>

      <div className="dashboard-grid">
        <div className="glass-card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
          <h3>Total Inventory Value</h3>
          <div className="stat-value">{formatCurrency(metrics?.totalInventoryValue || 0)}</div>
          <p>Valuation of stock in base rates</p>
        </div>

        <div className="glass-card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
          <h3>Low Stock Warnings</h3>
          <div className="stat-value text-warning">{metrics?.lowStockCount || 0}</div>
          <p>Products below warning thresholds</p>
        </div>

        <div className="glass-card" style={{ borderLeft: '4px solid var(--color-success)' }}>
          <h3>Pending Orders</h3>
          <div className="stat-value text-success">{metrics?.pendingOrders || 0}</div>
          <p>Quotations awaiting review</p>
        </div>

        <div className="glass-card" style={{ borderLeft: '4px solid rgba(255, 255, 255, 0.2)' }}>
          <h3>Total Products</h3>
          <div className="stat-value">{metrics?.totalProducts || 0}</div>
          <p>Active items in catalog</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="glass-card" style={{ gridColumn: 'span 2' }}>
          <h2 className="mb-4">Low Stock Alerts</h2>
          {lowStockProducts.length === 0 ? (
            <p className="text-success">All product stocks are at healthy levels.</p>
          ) : (
            <div className="table-container" style={{ margin: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Current Stock</th>
                    <th>Base Price</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockProducts.map(prod => (
                    <tr key={prod.id}>
                      <td style={{ fontWeight: 600 }}>{prod.sku}</td>
                      <td>{prod.name}</td>
                      <td>{prod.category || 'N/A'}</td>
                      <td className="text-danger" style={{ fontWeight: 600 }}>
                        {Number(prod.inventoryQuantity).toFixed(4)} {prod.baseUnit}
                      </td>
                      <td>{formatCurrency(Number(prod.basePrice))} per {prod.baseUnit}</td>
                      <td>
                        <span className="badge badge-danger">Critical</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
