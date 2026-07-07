import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { logout } from '../lib/firebase';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  FileText, 
  Users, 
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  Store
} from 'lucide-react';

export default function Layout() {
  const { profile } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} />, adminOnly: false },
    { to: '/pos', label: 'Punto de Venta', icon: <ShoppingCart size={20} />, adminOnly: false },
    { to: '/inventory', label: 'Inventario', icon: <Package size={20} />, adminOnly: false },
    { to: '/reports', label: 'Reportes', icon: <FileText size={20} />, adminOnly: true },
    { to: '/users', label: 'Usuarios', icon: <Users size={20} />, adminOnly: true },
    { to: '/settings', label: 'Ajustes', icon: <SettingsIcon size={20} />, adminOnly: true },
  ];

  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || profile?.role === 'admin'
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col md:flex-row font-sans overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 text-white border-b border-slate-800 shadow-xl">
        <div className="flex items-center gap-3 font-semibold tracking-tight text-xl">
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-contain bg-white/10" />
          ) : (
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-lg">
              {settings.appName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col">
            <span className="leading-tight">{settings.appName}</span>
            {settings.appSubtitle && <span className="text-[10px] font-normal text-slate-400 truncate max-w-[150px] leading-tight">{settings.appSubtitle}</span>}
          </div>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-slate-300 hover:text-white transition-colors">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`${
          mobileMenuOpen ? 'block' : 'hidden'
        } md:block w-full md:w-64 bg-slate-900 text-white shadow-xl flex-shrink-0 flex flex-col md:sticky md:top-0 md:h-screen transition-all`}
      >
        <div className="p-6 hidden md:flex items-center gap-3 border-b border-slate-800">
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-contain bg-white/10" />
          ) : (
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-lg">
              {settings.appName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col overflow-hidden">
            <span className="font-semibold tracking-tight text-lg truncate leading-tight">{settings.appName}</span>
            {settings.appSubtitle && <span className="text-[10px] text-slate-400 truncate w-full leading-tight mt-0.5">{settings.appSubtitle}</span>}
          </div>
        </div>
        <nav className="p-4 flex-1 space-y-2">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `p-3 rounded-lg flex items-center gap-3 transition-colors ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-400'
                    : 'hover:bg-slate-800 text-slate-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`flex items-center ${isActive ? '' : 'text-slate-400'}`}>{item.icon}</span>
                  <span className={`text-sm font-medium ${isActive ? '' : 'text-slate-300'}`}>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        
        <div className="p-4 mt-auto border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt="Profile" className="w-10 h-10 rounded-full border-2 border-indigo-500/50" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-indigo-400 overflow-hidden border-2 border-indigo-500/50 flex items-center justify-center text-xs font-bold text-white">
                {profile?.name?.substring(0, 2).toUpperCase() || profile?.email?.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold truncate">{profile?.name || 'Usuario'}</p>
              <p className="text-[10px] text-slate-400 truncate uppercase">{profile?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center px-4 py-2 text-sm font-medium rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors w-full"
          >
            <LogOut size={16} className="mr-3" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-2 text-slate-500">
            <span className="text-sm">Sistema</span>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-semibold text-slate-800">{settings.appName}</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              <span className="text-xs font-medium text-slate-600 hidden sm:inline-block">Firebase Sincronizado</span>
            </div>
          </div>
        </header>
        
        {/* Scrollable Content */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
