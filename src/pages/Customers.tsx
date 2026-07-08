import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Customer } from '../types';
import { useAuth } from '../hooks/useAuth';
import { Users, Search, Plus, Edit2, Trash2, X, Phone, MapPin, Mail, Save } from 'lucide-react';

export default function Customers() {
  const { profile } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    email: ''
  });

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'customers'), orderBy('firstName', 'asc'));
      const snap = await getDocs(q);
      const results: Customer[] = [];
      snap.forEach(doc => {
        results.push({ id: doc.id, ...doc.data() } as Customer);
      });
      setCustomers(results);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        address: customer.address || '',
        email: customer.email || ''
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        firstName: '',
        lastName: '',
        phone: '',
        address: '',
        email: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      if (editingCustomer) {
        await updateDoc(doc(db, 'customers', editingCustomer.id), formData);
      } else {
        await addDoc(collection(db, 'customers'), {
          ...formData,
          createdAt: Date.now()
        });
      }
      handleCloseModal();
      fetchCustomers();
    } catch (error) {
      console.error(error);
      alert('Error al guardar el cliente');
    }
  };

  const handleDelete = async (customer: Customer) => {
    if (window.confirm(`¿Estás seguro que deseas eliminar al cliente ${customer.firstName} ${customer.lastName}?`)) {
      try {
        await deleteDoc(doc(db, 'customers', customer.id));
        fetchCustomers();
      } catch (error) {
        console.error(error);
        alert('Error al eliminar el cliente');
      }
    }
  };

  const filteredCustomers = customers.filter(c => 
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery) ||
    c.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col gap-6 h-full min-h-0 relative">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, teléfono, o dirección..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder-slate-400"
          />
        </div>
        
        <button 
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap w-full sm:w-auto justify-center"
        >
          <Plus size={18} />
          Nuevo Cliente
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex-1 flex flex-col">
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 tracking-wider sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Contacto</th>
                <th className="px-6 py-4">Dirección</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium">Cargando...</td></tr>
              ) : filteredCustomers.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium">No se encontraron clientes.</td></tr>
              ) : filteredCustomers.map(customer => (
                <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-800">{customer.firstName} {customer.lastName}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center text-slate-600 gap-1.5 font-medium">
                        <Phone size={14} className="text-slate-400" /> {customer.phone}
                      </div>
                      {customer.email && (
                        <div className="flex items-center text-slate-500 gap-1.5 text-xs">
                          <Mail size={14} className="text-slate-400" /> {customer.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {customer.address ? (
                      <div className="flex items-center text-slate-600 gap-1.5">
                        <MapPin size={14} className="text-slate-400" /> 
                        <span className="truncate max-w-[200px]">{customer.address}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-xs">Sin dirección</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button 
                        onClick={() => handleOpenModal(customer)} 
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors rounded-lg"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(customer)} 
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors rounded-lg"
                      >
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={handleCloseModal}></div>
          <div className="bg-white rounded-3xl w-full max-w-xl relative flex flex-col max-h-[90vh] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg leading-tight">{editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">Complete la información del cliente</p>
                </div>
              </div>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-full hover:bg-slate-200 transition-colors shadow-sm border border-slate-100">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="customerForm" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Nombre</label>
                    <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} placeholder="Ej: Juan" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Apellido</label>
                    <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} placeholder="Ej: Pérez" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Teléfono</label>
                  <input required type="tel" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="Ej: +54 9 11 1234 5678" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Dirección</label>
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Calle Principal 123" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email (Opcional)</label>
                  <input type="email" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="ejemplo@correo.com" />
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-3xl">
              <button type="button" onClick={handleCloseModal} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button type="submit" form="customerForm" className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center gap-2">
                <Save size={16} />
                {editingCustomer ? 'Actualizar' : 'Guardar Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
