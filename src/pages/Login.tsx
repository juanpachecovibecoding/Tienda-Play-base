import React from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithGoogle } from '../lib/firebase';
import { Store, LogIn } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';

export default function Login() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useSettings();
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {settings.logoUrl ? (
          <img src={settings.logoUrl} alt="Logo" className="mx-auto h-16 w-auto object-contain rounded-xl" />
        ) : (
          <Store size={48} className="mx-auto text-indigo-600" />
        )}
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">{settings.appName}</h2>
        <p className="mt-2 text-sm text-gray-600">
          {settings.appSubtitle || 'Sistema de Gestión y Punto de Venta'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}
          <button
            onClick={handleLogin}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <LogIn className="mr-2" size={20} />
            Ingresar con Google
          </button>
        </div>
      </div>
    </div>
  );
}
