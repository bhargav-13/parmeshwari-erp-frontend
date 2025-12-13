import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';
import Logo from '../assets/parmeshwari-logo.svg';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/crm', icon: '💍', label: 'CRM & Sales' },
    { path: '/inventory', icon: '📦', label: 'Inventory' },
    { path: '/orders', icon: '🛒', label: 'Order Management' },
    { path: '/subcontracting', icon: '💼', label: 'Subcontracting' },
    { path: '/invoices', icon: '📄', label: 'Invoices' },
    { path: '/payment-reminder', icon: '⏰', label: 'Payment Reminder' },
    { path: '/settings', icon: '⚙️', label: 'Setting' },
  ];

  return (
    <div className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <div className="logo">
          <img src={Logo} alt="Parmeshwari Brass Industries" className="logo-img" />
        </div>
        <button
          type="button"
          className="mobile-close-btn"
          onClick={onClose}
          aria-label="Close menu"
        >
          ✕
        </button>
      </div>

      <div className="sidebar-divider"></div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={onClose}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar">
            <span className="avatar-icon">👤</span>
          </div>
          <span className="user-name">Admin</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
