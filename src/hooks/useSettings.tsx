import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Settings {
  appName: string;
  appSubtitle: string;
  logoUrl: string;
}

const defaultSettings: Settings = {
  appName: 'TiendaPlay',
  appSubtitle: 'Sistema de Gestión y Punto de Venta',
  logoUrl: '',
};

interface SettingsContextType {
  settings: Settings;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType>({ settings: defaultSettings, loading: true });

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings({ ...defaultSettings, ...docSnap.data() } as Settings);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error loading settings:", error);
      setLoading(false);
    });
    
    return () => unsub();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};
