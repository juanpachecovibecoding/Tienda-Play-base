import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Promotion } from '../types';
import { Plus, Edit2, Trash2, X, AlertCircle } from 'lucide-react';

export default function Promotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [formData, setFormData] = useState({ name: '', discountPercentage: 0, active: true });
  const [errorMsg, setErrorMsg] = useState('');

  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'promotions'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const results: Promotion[] = [];
      snap.forEach(doc => {
        results.push({ id: doc.id, ...doc.data() } as Promotion);
      });
      setPromotions(results);
    } catch (error) {
      console.error("Error fetching promotions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      setErrorMsg("El nombre es requerido.");
      return;
    }
    if (formData.discountPercentage < 0 || formData.discountPercentage > 100) {
      setErrorMsg("El descuento debe estar entre 0 y 100.");
      return;
    }

    try {
      if (editingPromotion) {
        const ref = doc(db, 'promotions', editingPromotion.id);
        await updateDoc(ref, {
          name: formData.name,
          discountPercentage: formData.discountPercentage,
          active: formData.active
        });
      } else {
        await addDoc(collection(db, 'promotions'), {
          name: formData.name,
          discountPercentage: formData.discountPercentage,
          active: formData.active,
          createdAt: Date.now()
        });
      }
      setIsModalOpen(false);
      fetchPromotions();
    } catch (error) {
      console.error("Error guardando promocion", error);
      setErrorMsg("Error al guardar la promoción");
    }
  };

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setFormData({ name: promotion.name, discountPercentage: promotion.discountPercentage, active: promotion.active });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("¿Estás seguro de eliminar esta promoción?")) {
      try {
        await deleteDoc(doc(db, 'promotions', id));
        fetchPromotions();
      } catch (error) {
        console.error("Error al eliminar", error);
      }
    }
  };

  const toggleActive = async (promotion: Promotion) => {
    try {
      const ref = doc(db, 'promotions', promotion.id);
      await updateDoc(ref, { active: !promotion.active });
      fetchPromotions();
    } catch (error) {
      console.error("Error al actualizar estado", error);
    }
  };

  const openNewModal = () => {
    setEditingPromotion(null);
    setFormData({ name: '', discountPercentage: 0, active: true });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col gap-6 h-full min-h-0 relative">
      <div className="flex justify-between items-center bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Promociones</h1>
          <p className="text-sm text-slate-500">Gestiona los descuentos para ventas</p>
        </div>
        <button
          onClick={openNewModal}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-medium shadow-sm flex items-center gap-2"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Nueva Promoción</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex-1 flex flex-col">
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 tracking-wider sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4">Nombre</th>
                <th className="px-6 py-4">Descuento (%)</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium">Cargando promociones...</td></tr>
              ) : promotions.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium">No se encontraron promociones.</td></tr>
              ) : promotions.map(promo => (
                <tr key={promo.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">{promo.name}</td>
                  <td className="px-6 py-4 text-slate-600 font-semibold">{promo.discountPercentage}%</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleActive(promo)}
                      className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                        promo.active 
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {promo.active ? 'Activa' : 'Inactiva'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleEdit(promo)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(promo.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-2xl w-full max-w-md relative flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-lg">
                {editingPromotion ? 'Editar Promoción' : 'Nueva Promoción'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-slate-50 p-1.5 rounded-full hover:bg-slate-100 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5">
              {errorMsg && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl flex items-center gap-2 text-sm">
                  <AlertCircle size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Nombre de Promoción</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="Ej. campeones"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Descuento (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.discountPercentage}
                    onChange={(e) => setFormData({ ...formData, discountPercentage: parseFloat(e.target.value) })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                  />
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="checkbox"
                    id="promoActive"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <label htmlFor="promoActive" className="text-sm font-medium text-slate-700">Promoción Activa</label>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-colors"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
