import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Sale } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Download, FileText, TrendingUp, Calendar as CalendarIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Reports() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const fetchSales = async (date: Date) => {
    setLoading(true);
    const start = startOfMonth(date).getTime();
    const end = endOfMonth(date).getTime();

    const q = query(
      collection(db, 'sales'),
      where('date', '>=', start),
      where('date', '<=', end),
      orderBy('date', 'asc')
    );

    const snapshot = await getDocs(q);
    const results: Sale[] = [];
    snapshot.forEach(doc => {
      results.push({ id: doc.id, ...doc.data() } as Sale);
    });
    
    setSales(results);
    setLoading(false);
  };

  useEffect(() => {
    fetchSales(selectedMonth);
  }, [selectedMonth]);

  const generatePDF = () => {
    const doc = new jsPDF();
    const monthName = format(selectedMonth, 'MMMM yyyy', { locale: es });
    
    doc.setFontSize(20);
    doc.text(`Reporte de Ventas - ${monthName}`, 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Total de Ventas: $${totalRevenue.toFixed(2)}`, 14, 32);
    doc.text(`Transacciones: ${sales.length}`, 14, 40);

    const tableData = sales.map(s => [
      format(new Date(s.date), 'dd/MM/yyyy HH:mm'),
      s.sellerEmail,
      s.items.length.toString(),
      s.paymentMethod || 'No registrado',
      s.change !== undefined ? `$${s.change.toFixed(2)}` : '-',
      `$${s.total.toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['Fecha', 'Vendedor', 'Artículos', 'Método Pago', 'Vuelto', 'Total']],
      body: tableData,
    });

    doc.save(`Reporte_Ventas_${monthName.replace(' ', '_')}.pdf`);
  };

  const totalRevenue = sales.reduce((acc, curr) => acc + curr.total, 0);

  // Group by day for chart
  const chartData = sales.reduce((acc: any[], curr) => {
    const day = format(new Date(curr.date), 'dd/MM');
    const existing = acc.find(item => item.name === day);
    if (existing) {
      existing.total += curr.total;
    } else {
      acc.push({ name: day, total: curr.total });
    }
    return acc;
  }, []);

  return (
    <div className="flex-1 flex flex-col gap-6 h-full min-h-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-3">
          <CalendarIcon className="text-slate-400" size={18} />
          <input 
            type="month" 
            value={format(selectedMonth, 'yyyy-MM')}
            onChange={(e) => {
              if (e.target.value) {
                const [year, month] = e.target.value.split('-');
                setSelectedMonth(new Date(parseInt(year), parseInt(month) - 1, 1));
              }
            }}
            className="outline-none border-none text-sm font-semibold text-slate-800 bg-transparent cursor-pointer"
          />
        </div>
        
        <button 
          onClick={generatePDF}
          disabled={sales.length === 0}
          className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <Download size={16} className="mr-2" />
          Exportar PDF
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Ingresos del Mes</p>
          <p className="text-3xl font-bold text-slate-800">${totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Transacciones</p>
          <p className="text-3xl font-bold text-slate-800">{sales.length}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex-1 flex flex-col min-h-[300px]">
        <h3 className="font-bold text-slate-800 mb-6">Tendencia de Ingresos</h3>
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm font-medium">Cargando gráfico...</div>
        ) : chartData.length > 0 ? (
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dx={-10} tickFormatter={(value) => `$${value}`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '12px' }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Ingresos']}
                  labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                />
                <Line type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={3} dot={{r: 4, fill: '#4f46e5', strokeWidth: 0}} activeDot={{r: 6, strokeWidth: 0}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm font-medium">No hay datos para este mes.</div>
        )}
      </div>
    </div>
  );
}
