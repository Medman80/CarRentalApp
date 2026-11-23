import React, { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import Navigation from './components/Navigation';
import CarsManagement from './components/CarsManagement';
import CustomersManagement from './components/CustomersManagement';
import RentalsManagement from './components/RentalsManagement';
import PaymentsManagement from './components/PaymentsManagement';
import ExpensesManagement from './components/ExpensesManagement';
import MaintenanceManagement from './components/MaintenanceManagement';
import Reports from './components/Reports';
import Settings from './components/Settings';
import CarPerformance from './components/CarPerformance';

function App() {
  const [appStatus, setAppStatus] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('ar');

  useEffect(() => {
    checkAppStatus();
  }, []);

  const checkAppStatus = async () => {
    try {
      if (window.electron) {
        const status = await window.electron.getAppStatus();
        setAppStatus(status);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error checking app status:', error);
      setLoading(false);
    }
  };

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>{language === 'ar' ? 'جاري التحميل...' : language === 'fr' ? 'Chargement...' : 'Loading...'}</p>
      </div>
    );
  }

  const renderPage = () => {
    const props = { language };
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard {...props} />;
      case 'cars':
        return <CarsManagement {...props} />;
      case 'customers':
        return <CustomersManagement {...props} />;
      case 'rentals':
        return <RentalsManagement {...props} />;
      case 'payments':
        return <PaymentsManagement {...props} />;
      case 'expenses':
        return <ExpensesManagement {...props} />;
      case 'maintenance':
        return <MaintenanceManagement {...props} />;
      case 'reports':
        return <Reports {...props} />;
      case 'car_performance':
        return <CarPerformance {...props} />;
      case 'settings':
        return <Settings onLanguageChange={handleLanguageChange} appStatus={appStatus} {...props} />;
      default:
        return <Dashboard {...props} />;
    }
  };

  const handleMinimize = () => {
    if (window.electron) window.electron.minimize();
  };

  const handleMaximize = () => {
    if (window.electron) window.electron.maximize();
  };

  const handleClose = () => {
    if (window.electron) window.electron.closeWindow();
  };

  return (
    <div className="app-container" dir={language === 'ar' ? 'rtl' : language === 'fr' ? 'ltr' : 'ltr'}>
      <div className="app-title-bar">
        <div className="title-bar-drag-area">
          <span className="app-title-mini">Cars Pod System</span>
        </div>
        <div className="title-bar-actions">
          <button className="title-btn minimize" onClick={handleMinimize}><VscChromeMinimize /></button>
          <button className="title-btn maximize" onClick={handleMaximize}><VscChromeMaximize /></button>
          <button className="title-btn close" onClick={handleClose}><VscChromeClose /></button>
        </div>
      </div>
      
      <div className="app-body">
        <Navigation 
          currentPage={currentPage} 
          onPageChange={setCurrentPage}
          appStatus={appStatus}
          language={language}
        />
        <main className="main-content">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

import { VscChromeMinimize, VscChromeMaximize, VscChromeClose } from 'react-icons/vsc';

export default App;