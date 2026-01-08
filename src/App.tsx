import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import SubcontractingPage from './pages/SubcontractingPage';
import InventoryGroundFloorPage from './pages/InventoryGroundFloorPage';
import InventoryFirstFloorPage from './pages/InventoryFirstFloorPage';
import RawInventoryPage from './pages/RawInventoryPage';
import OrderGroundFloorPage from './pages/OrderGroundFloorPage';
import OrderFirstFloorPage from './pages/OrderFirstFloorPage';
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
            <Route index element={<Navigate to="/inventory/ground-floor" replace />} />
            <Route path="dashboard" element={<div className="placeholder">Dashboard Coming Soon</div>} />
            <Route path="crm" element={<div className="placeholder">CRM & Sales Coming Soon</div>} />
            <Route path="inventory/ground-floor" element={<InventoryGroundFloorPage />} />
            <Route path="inventory/first-floor" element={<InventoryFirstFloorPage />} />
            <Route path="inventory/raw-materials" element={<RawInventoryPage />} />
            <Route path="orders/ground-floor" element={<OrderGroundFloorPage />} />
            <Route path="orders/first-floor" element={<OrderFirstFloorPage />} />
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
