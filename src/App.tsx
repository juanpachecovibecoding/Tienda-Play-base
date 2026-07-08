/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { SettingsProvider } from './hooks/useSettings';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import POS from './pages/POS';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Customers from './pages/Customers';
import Settings from './pages/Settings';

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="pos" element={<POS />} />
              <Route path="customers" element={<Customers />} />
              
              <Route path="reports" element={<ProtectedRoute adminOnly><Reports /></ProtectedRoute>} />
              <Route path="users" element={<ProtectedRoute superAdminOnly><Users /></ProtectedRoute>} />
              <Route path="settings" element={<ProtectedRoute adminOnly><Settings /></ProtectedRoute>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </SettingsProvider>
    </AuthProvider>
  );
}
