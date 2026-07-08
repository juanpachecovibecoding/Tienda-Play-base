import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Sale } from '../types';
import { useAuth } from '../hooks/useAuth';
import { Receipt, Search, Eye, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Sales() {
  const { profile } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'sales'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      const results: Sale[] = [];
      snap.forEach(doc => {
        results.push({ id: doc.id, ...doc.data() } as Sale);
      });
      setSales(results);
    } catch (error) {
      console.error("Error fetching sales:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const filteredSales = sales.filter(s => 
    s.sellerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col gap-6 h-full min-h-0 relative">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por vendedor o ID de venta..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder-slate-400"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex-1 flex flex-col">
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 tracking-wider sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4">ID Venta</th>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Vendedor</th>
                <th className="px-6 py-4">Método de Pago</th>
                <th className="px-6 py-4">Artículos</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4 text-right">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">Cargando ventas...</td></tr>
              ) : filteredSales.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">No se encontraron ventas.</td></tr>
              ) : filteredSales.map(sale => (
                <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs text-slate-500">{sale.id.slice(-6).toUpperCase()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-800">{format(new Date(sale.date), 'dd/MM/yyyy')}</div>
                    <div className="text-xs text-slate-500">{format(new Date(sale.date), 'HH:mm')}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-600 font-medium">{sale.sellerEmail}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold">
                      {sale.paymentMethod || 'Efectivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">
                    {sale.items.reduce((acc, item) => acc + item.quantity, 0)} items
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">${sale.total.toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setSelectedSale(sale)} 
                      className="p-2 text-indigo-600 hover:bg-indigo-50 transition-colors rounded-lg inline-flex items-center"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedSale(null)}></div>
          <div className="bg-white rounded-3xl w-full max-w-2xl relative flex flex-col max-h-[90vh] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                  <Receipt size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg leading-tight">Detalle de Venta</h3>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">ID: {selectedSale.id}</p>
                </div>
              </div>
              <button onClick={() => setSelectedSale(null)} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-full hover:bg-slate-200 transition-colors shadow-sm border border-slate-100">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Fecha y Hora</p>
                  <p className="font-semibold text-slate-800">{format(new Date(selectedSale.date), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Vendedor</p>
                  <p className="font-semibold text-slate-800 truncate">{selectedSale.sellerEmail}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Método de Pago</p>
                  <p className="font-semibold text-slate-800">{selectedSale.paymentMethod || 'Efectivo'}</p>
                </div>
                {selectedSale.change !== undefined && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Vuelto</p>
                    <p className="font-semibold text-slate-800">${selectedSale.change.toFixed(2)}</p>
                  </div>
                )}
              </div>

              <h4 className="font-bold text-slate-800 mb-3">Artículos</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Producto</th>
                      <th className="px-4 py-3 text-center">Cant.</th>
                      <th className="px-4 py-3 text-right">Precio Unit.</th>
                      <th className="px-4 py-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedSale.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-slate-600">${item.priceAtSale.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">${(item.quantity * item.priceAtSale).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right font-bold text-slate-600 uppercase text-[10px] tracking-wider">Total</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 text-base">${selectedSale.total.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 flex justify-end bg-slate-50 rounded-b-3xl">
              <button type="button" onClick={() => setSelectedSale(null)} className="px-6 py-2.5 text-sm font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
