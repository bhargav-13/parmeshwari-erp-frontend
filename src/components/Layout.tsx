import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import './Layout.css';

const Layout: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  return (
    <div className="layout">
      <Sidebar isOpen={isMobileSidebarOpen} onClose={closeMobileSidebar} />
      <div className="main-content">
        <Header onMenuClick={toggleMobileSidebar} />
        <div className="content">
          <Outlet />
        </div>
      </div>
      {isMobileSidebarOpen && (
        <div className="sidebar-overlay" onClick={closeMobileSidebar} />
      )}
    </div>
  );
};

export default Layout;
