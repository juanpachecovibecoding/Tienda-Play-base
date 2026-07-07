import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';
import { Users as UsersIcon, Shield, Edit2, Check, X, Clock, CheckCircle } from 'lucide-react';

export default function Users() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<'admin' | 'seller'>('seller');
  const [editStatus, setEditStatus] = useState<'pending' | 'active'>('pending');

  const fetchUsers = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, 'users'));
    const results: UserProfile[] = [];
    snap.forEach(doc => {
      results.push({ id: doc.id, ...doc.data() } as UserProfile);
    });
    setUsers(results);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEdit = (user: UserProfile) => {
    // Root admin protection
    if (user.email === 'juanpacheco@playcode.com.ar') {
      alert('No puedes editar al administrador principal.');
      return;
    }
    setEditingId(user.id);
    setEditRole(user.role as 'admin' | 'seller');
    setEditStatus(user.status || 'pending');
  };

  const saveChanges = async (id: string) => {
    try {
      await updateDoc(doc(db, 'users', id), {
        role: editRole,
        status: editStatus
      });
      setEditingId(null);
      fetchUsers();
    } catch (error) {
      console.error(error);
      alert('Error al actualizar el usuario');
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 h-full min-h-0">
      <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex gap-3 items-start">
        <Shield className="h-5 w-5 text-indigo-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-indigo-800 font-medium leading-relaxed">
          Los nuevos usuarios se agregan automáticamente como "vendedor" con estado "pendiente". Debes activar su cuenta y asignarles un rol para que puedan ingresar al sistema.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex-1 flex flex-col">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Gestión de Usuarios</h3>
        </div>
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 tracking-wider sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3">Usuario</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Rol</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">Cargando...</td></tr>
              ) : users.map(user => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-500">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                        ) : (
                          user.name?.charAt(0) || user.email.charAt(0)
                        )}
                      </div>
                      <div className="font-medium text-slate-800">{user.name || 'Sin Nombre'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {user.email}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === user.id ? (
                      <select 
                        className="border border-slate-200 rounded-lg text-xs font-semibold p-1.5 focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-700 bg-white"
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as 'admin' | 'seller')}
                      >
                        <option value="seller">Vendedor</option>
                        <option value="admin">Administrador</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        user.role === 'superadmin' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {user.role === 'superadmin' ? 'Superadmin' : user.role === 'admin' ? 'Admin' : 'Vendedor'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === user.id ? (
                      <select 
                        className="border border-slate-200 rounded-lg text-xs font-semibold p-1.5 focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-700 bg-white"
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as 'pending' | 'active')}
                      >
                        <option value="pending">Pendiente</option>
                        <option value="active">Activo</option>
                      </select>
                    ) : (
                      <div className={`flex items-center gap-1.5 text-xs font-bold ${user.status === 'active' || user.role === 'superadmin' ? 'text-emerald-600' : 'text-amber-500'}`}>
                        {user.status === 'active' || user.role === 'superadmin' ? <CheckCircle size={14} /> : <Clock size={14} />}
                        {user.status === 'active' || user.role === 'superadmin' ? 'Activo' : 'Pendiente'}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {editingId === user.id ? (
                      <div className="flex justify-end space-x-2">
                        <button onClick={() => saveChanges(user.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check size={16} /></button>
                        <button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X size={16} /></button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleEdit(user)} 
                        className="text-slate-400 hover:text-indigo-600 transition-colors disabled:opacity-30 disabled:hover:text-slate-400"
                        disabled={user.email === 'juanpacheco@playcode.com.ar'}
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
