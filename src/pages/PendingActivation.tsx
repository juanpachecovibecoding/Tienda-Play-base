import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { logout } from '../lib/firebase';
import { ShieldAlert, LogOut } from 'lucide-react';

export default function PendingActivation() {
  const { profile } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white max-w-md w-full rounded-3xl shadow-xl overflow-hidden border border-slate-100 text-center p-8">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="text-amber-600" size={40} />
        </div>
        
        <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Cuenta Pendiente</h2>
        
        <p className="text-slate-500 mb-8">
          Hola <strong>{profile?.name || profile?.email}</strong>, tu cuenta ha sido creada exitosamente pero aún está pendiente de activación. Un superadministrador debe aprobar tu acceso.
        </p>
        
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
        >
          <LogOut size={20} />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
