import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import SubcontractingPage from './pages/SubcontractingPage';
import OrderManagementPage from './pages/OrderManagementPage';
import InventoryPage from './pages/InventoryPage';
import ProductCatalogPage from './pages/ProductCatalogPage';
import './App.css';

const PrivateRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/catalog" element={<ProductCatalogPage />} />

          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/inventory" replace />} />
            <Route path="dashboard" element={<div className="placeholder">Dashboard Coming Soon</div>} />
            <Route path="crm" element={<div className="placeholder">CRM & Sales Coming Soon</div>} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="orders" element={<OrderManagementPage />} />
            <Route path="subcontracting" element={<SubcontractingPage />} />
            <Route path="invoices" element={<div className="placeholder">Invoices Coming Soon</div>} />
            <Route path="payment-reminder" element={<div className="placeholder">Payment Reminder Coming Soon</div>} />
            <Route path="settings" element={<div className="placeholder">Settings Coming Soon</div>} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
