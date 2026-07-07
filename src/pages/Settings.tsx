import React, { useState, useEffect, useRef } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useSettings, Settings as SettingsType } from '../hooks/useSettings';
import { SettingsIcon, Save, Upload, Trash2 } from 'lucide-react';

export default function Settings() {
  const { settings } = useSettings();
  const [formData, setFormData] = useState<SettingsType>(settings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) { // Limit size to 500KB to avoid Firestore doc size limits (base64 increases size by ~33%)
        setMessage({ type: 'error', text: 'La imagen es demasiado grande. El tamaño máximo es 500KB.' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setFormData({ ...formData, logoUrl: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await setDoc(doc(db, 'settings', 'general'), formData, { merge: true });
      setMessage({ type: 'success', text: 'Ajustes guardados correctamente.' });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Error al guardar los ajustes. Comprueba el tamaño de la imagen.' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 h-full min-h-0 max-w-3xl">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <SettingsIcon className="text-slate-400" />
          <h3 className="font-bold text-slate-800 text-lg">Ajustes del Sistema</h3>
        </div>
        
        <div className="p-6">
          {message && (
            <div className={`p-4 rounded-lg mb-6 text-sm font-medium ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Nombre de la Aplicación</label>
              <input
                type="text"
                required
                value={formData.appName}
                onChange={(e) => setFormData({ ...formData, appName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="Ej. TiendaPlay"
              />
              <p className="text-xs text-slate-500 mt-2">Este nombre se mostrará en el login y en el menú lateral para todos los usuarios.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Subtítulo de la Aplicación</label>
              <input
                type="text"
                required
                value={formData.appSubtitle || ''}
                onChange={(e) => setFormData({ ...formData, appSubtitle: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="Ej. Sistema de Gestión y Punto de Venta"
              />
              <p className="text-xs text-slate-500 mt-2">Este subtítulo se mostrará debajo del nombre en la pantalla de inicio de sesión.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Logo de la Aplicación (Opcional)</label>
              
              <div className="flex items-start gap-6">
                <div className="flex-1">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 bg-slate-100 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors"
                    >
                      <Upload size={16} />
                      Subir Imagen
                    </button>
                    {formData.logoUrl && (
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="flex items-center gap-2 bg-rose-50 text-rose-600 border border-rose-100 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-rose-100 transition-colors"
                      >
                        <Trash2 size={16} />
                        Quitar Logo
                      </button>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <p className="text-xs text-slate-500 mt-2">Sube una imagen desde tu dispositivo. Se recomienda formato cuadrado o transparente con un tamaño máximo de 500KB.</p>
                </div>

                {formData.logoUrl && (
                  <div className="p-4 border border-slate-100 rounded-xl bg-slate-50 flex flex-col items-center">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 w-full text-center">Vista Previa</p>
                    <img src={formData.logoUrl} alt="Logo Preview" className="h-16 w-auto object-contain rounded-lg" onError={(e) => {
                      (e.target as HTMLImageElement).src = '';
                      (e.target as HTMLImageElement).alt = 'Error al cargar imagen';
                    }} />
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 disabled:opacity-50 transition-all"
              >
                <Save size={18} />
                {saving ? 'Guardando...' : 'Guardar Ajustes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
