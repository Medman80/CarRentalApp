import React, { useState } from 'react';
import { 
  RiDashboardLine, 
  RiCarLine, 
  RiUserSharedLine, 
  RiCalendarCheckLine, 
  RiMoneyDollarCircleLine, 
  RiPieChartLine, 
  RiSettings4Line, 
  RiMenuLine, 
  RiCloseLine,
  RiMoneyDollarBoxLine,
  RiToolsLine,
  RiLineChartLine,
  RiTimeLine
} from 'react-icons/ri';
import { VscChromeMinimize, VscChromeMaximize, VscChromeClose } from 'react-icons/vsc';
import translations from '../translations';
import './Navigation.css';

const Navigation = ({ currentPage, onPageChange, appStatus, language }) => {
  const t = translations[language] || translations.ar;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', icon: RiDashboardLine, label: t.dashboard },
    { id: 'cars', icon: RiCarLine, label: t.cars },
    { id: 'customers', icon: RiUserSharedLine, label: t.customers },
    { id: 'rentals', icon: RiCalendarCheckLine, label: t.rentals },
    { id: 'payments', icon: RiMoneyDollarCircleLine, label: t.payments },
    { id: 'expenses', icon: RiMoneyDollarBoxLine, label: t.expenses },
    { id: 'maintenance', icon: RiToolsLine, label: t.maintenance },
    { id: 'car_performance', icon: RiLineChartLine, label: t.car_performance },
    { id: 'reports', icon: RiPieChartLine, label: t.reports },
    { id: 'settings', icon: RiSettings4Line, label: t.settings },
  ];

  const handleMenuClick = (pageId) => {
    onPageChange(pageId);
    setMobileMenuOpen(false);
  };

  const getTrialText = () => {
    if (!appStatus) return t.active;
    if (appStatus.daysRemaining !== undefined && appStatus.daysRemaining !== null) {
      return (
        <span style={{ fontFamily: 'monospace', fontSize: '1.2em', letterSpacing: '1px' }}>
          {String(appStatus?.daysRemaining || 0).padStart(2, '0')}
          <span style={{ animation: 'blink 1s step-end infinite' }}>:</span>
          {String(appStatus?.hoursRemaining || 0).padStart(2, '0')}
          <span style={{ animation: 'blink 1s step-end infinite' }}>:</span>
          {String(appStatus?.minutesRemaining || 0).padStart(2, '0')}
          <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
        </span>
      );
    }
    return t.active;
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
    <>
      <button
        className="mobile-menu-toggle"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <RiCloseLine /> : <RiMenuLine />}
      </button>

      <nav className={`navbar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="navbar-container">
          <div className="navbar-header-premium">
            <div className="navbar-brand">
              <div className="logo-wrapper">
                <img src="assets/logo.png" alt="Logo" className="navbar-logo" />
                <div className="logo-glow"></div>
              </div>
              <div className="brand-text">
                <h1>Cars Pod</h1>
                <span>{t.premium_rental_system}</span>
              </div>
            </div>
          </div>

          {appStatus && appStatus.daysRemaining && (
            <div className="trial-section">
              <div className="trial-card">
                <RiTimeLine className="timer-icon" />
                <div className="timer-info">
                  <label>{t.trial_version}</label>
                  <span className="timer-val">{getTrialText()}</span>
                </div>
              </div>
            </div>
          )}

          <div className="navbar-menu">
            <div className="menu-section-label">{t.main_menu}</div>
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`nav-item-premium ${currentPage === item.id ? 'active' : ''}`}
                  onClick={() => handleMenuClick(item.id)}
                >
                  <div className="icon-box">
                    <Icon />
                  </div>
                  <span className="nav-label">{item.label}</span>
                  {currentPage === item.id && <div className="active-indicator" />}
                </button>
              );
            })}
          </div>

          <div className="navbar-footer-premium">
            <div className="user-profile-mini">
              <div className="avatar">A</div>
              <div className="user-info">
                <strong>Admin</strong>
                <span>{t.super_admin}</span>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navigation;