import React, { useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, Sale } from '../types';
import { useAuth } from '../hooks/useAuth';
import { AlertTriangle, TrendingUp, Package, DollarSign } from 'lucide-react';

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    todaySalesCount: 0,
    todaySalesTotal: 0,
  });
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const productsSnap = await getDocs(collection(db, 'products'));
        let totalProds = 0;
        let lowStockCount = 0;
        
        productsSnap.forEach(doc => {
          totalProds++;
          const data = doc.data() as Product;
          if (data.stock <= data.lowStockThreshold) {
            lowStockCount++;
          }
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const salesQuery = query(
          collection(db, 'sales'),
          where('date', '>=', today.getTime()),
          orderBy('date', 'desc')
        );
        
        const salesSnap = await getDocs(salesQuery);
        let todaySalesCount = 0;
        let todaySalesTotal = 0;
        
        salesSnap.forEach(doc => {
          todaySalesCount++;
          todaySalesTotal += (doc.data() as Sale).total;
        });

        setStats({
          totalProducts: totalProds,
          lowStock: lowStockCount,
          todaySalesCount,
          todaySalesTotal,
        });

        // Recent sales
        const recentQuery = query(collection(db, 'sales'), orderBy('date', 'desc'), limit(5));
        const recentSnap = await getDocs(recentQuery);
        const recent: Sale[] = [];
        recentSnap.forEach(doc => {
          recent.push({ id: doc.id, ...doc.data() } as Sale);
        });
        setRecentSales(recent);

      } catch (error) {
        console.error("Error fetching dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <div>Cargando panel...</div>;
  }

  return (
    <div className="flex-1 flex flex-col gap-6 h-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Artículos</p>
          <p className="text-2xl font-bold">{stats.totalProducts}</p>
          <p className="text-[10px] text-slate-400 font-bold mt-1">En Inventario</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
          {stats.lowStock > 0 && (
            <div className="absolute top-0 right-0 p-2">
              <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div>
            </div>
          )}
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Stock Bajo</p>
          <p className={`text-2xl font-bold ${stats.lowStock > 0 ? 'text-rose-500' : 'text-slate-800'}`}>{stats.lowStock}</p>
          <p className={`text-[10px] font-bold mt-1 ${stats.lowStock > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
            {stats.lowStock > 0 ? 'Acción requerida' : 'Todo en orden'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Transacciones Hoy</p>
          <p className="text-2xl font-bold">{stats.todaySalesCount}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Ventas Hoy</p>
          <p className="text-2xl font-bold">${stats.todaySalesTotal.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden min-h-[300px]">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold">Últimas Ventas</h3>
        </div>
        {recentSales.length > 0 ? (
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <tr>
                  <th className="px-6 py-3">Fecha</th>
                  <th className="px-6 py-3">Vendedor</th>
                  <th className="px-6 py-3">Artículos</th>
                  <th className="px-6 py-3">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {recentSales.map(sale => (
                  <tr key={sale.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {new Date(sale.date).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {sale.sellerEmail}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {sale.items.length}
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-slate-800">
                      ${sale.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex-1 p-6 flex items-center justify-center text-slate-400 text-sm font-medium">
            No hay ventas recientes.
          </div>
        )}
      </div>
    </div>
  );
}
