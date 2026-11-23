import React, { useState, useEffect } from 'react';
import { 
  RiCarLine, 
  RiCalendarCheckLine, 
  RiMoneyDollarCircleLine, 
  RiUserSharedLine, 
  RiAlertLine,
  RiTimeLine,
  RiCheckboxCircleLine,
  RiRefreshLine,
  RiArrowRightUpLine,
  RiCalendarLine,
  RiCloseLine,
  RiLockLine,
  RiErrorWarningLine,
  RiBarChartBoxLine,
  RiPieChartLine
} from 'react-icons/ri';
import translations from '../translations';
import './Dashboard.css';

const StatCard = ({ icon: Icon, title, value, color }) => (
  <div className={`stat-card-compact stat-${color}`}>
    <div className="stat-icon-small"><Icon /></div>
    <div className="stat-info">
      <h3>{title}</h3>
      <p className="stat-val">{value}</p>
    </div>
  </div>
);

const AlertModal = ({ alert, onClose, language, t }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="alert-detail-modal" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <RiLockLine className="lock-icon" />
        <h3>{t.alert_details}</h3>
        <button onClick={onClose} className="close-btn-premium"><RiCloseLine /></button>
      </div>
      <div className="modal-body">
        <div className="car-brief">
          <RiCarLine className="car-icon-large" />
          <div>
            <h4>{alert.car.brand} {alert.car.model}</h4>
            <p className="plate-badge" dir="ltr">{alert.car.plateNumber}</p>
          </div>
        </div>
        <div className="alert-reason">
          <RiErrorWarningLine />
          <div>
            <h5>{t.reason}</h5>
            <p>{alert.reason}</p>
            <p className="date-val">{alert.date}</p>
          </div>
        </div>
        <div className="car-stats-mini">
          <div className="mini-stat"><span>{t.mileage}</span><strong>{alert.car.mileage} Km</strong></div>
          <div className="mini-stat"><span>{t.status}</span><strong className={alert.car.status}>{alert.car.status === 'available' ? t.available : t.rented}</strong></div>
        </div>
      </div>
    </div>
  </div>
);

const Dashboard = ({ language = 'ar' }) => {
  const t = translations[language] || translations.ar;
  const [stats, setStats] = useState({
    availableCars: 0,
    totalCars: 0,
    activeRentals: 0,
    totalCustomers: 0,
    todayRevenue: 0,
    monthlyRevenue: 0,
    annualRevenue: 0
  });
  const [alerts, setAlerts] = useState({
    insurance: [],
    tax: [],
    oil: [],
    techControl: []
  });
  const [loading, setLoading] = useState(true);
  const [activeRentalsDetails, setActiveRentalsDetails] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const carsResult = await window.electron.getCars();
      const allCars = carsResult.data || [];
      const availableCars = allCars.filter(c => c.status === 'available').length;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tenDaysFromNow = new Date(today);
      tenDaysFromNow.setDate(today.getDate() + 10);

      const parseDateSafe = (dateStr) => {
        if (!dateStr) return null;
        const parts = String(dateStr).split('T')[0].split('-');
        if (parts.length === 3) {
          return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        }
        return new Date(dateStr);
      };

      const insuranceAlerts = allCars.filter(c => c.insuranceExpiry && parseDateSafe(c.insuranceExpiry) <= tenDaysFromNow);
      const taxAlerts = allCars.filter(c => c.taxExpiry && parseDateSafe(c.taxExpiry) <= tenDaysFromNow);
      const techAlerts = allCars.filter(c => c.techControlExpiry && parseDateSafe(c.techControlExpiry) <= tenDaysFromNow);
      
      const oilAlerts = allCars.filter(c => {
        const nextOil = parseFloat(c.nextOilChange);
        const currentMileage = parseFloat(c.mileage);
        if (isNaN(nextOil) || isNaN(currentMileage) || nextOil === 0) return false;
        return (nextOil - currentMileage) <= 1000;
      });

      setAlerts({
        insurance: insuranceAlerts,
        tax: taxAlerts,
        oil: oilAlerts,
        techControl: techAlerts
      });

      const dateStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
      const reportResult = await window.electron.getDailyReport(dateStr);
      const report = reportResult.data || {};
      const customersResult = await window.electron.getCustomers();
      const rentalsResult = await window.electron.getRentals({ status: 'active' });
      const activeRentals = rentalsResult.data || [];

      setStats({
        availableCars,
        totalCars: allCars.length,
        activeRentals: activeRentals.length,
        totalCustomers: (customersResult.data || []).length,
        todayRevenue: report.income || 0,
        monthlyRevenue: report.monthlyIncome || 0,
        annualRevenue: report.annualIncome || 0
      });
      setActiveRentalsDetails(activeRentals);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header-compact">
        <h2>{t.dashboard}</h2>
        <div className="header-actions">
          <p className="date-display">{new Date().toLocaleDateString(t.en_us)}</p>
          <button onClick={loadDashboardData} className="refresh-btn-small"><RiRefreshLine /></button>
        </div>
      </div>

      <div className="stats-row-compact">
        <StatCard icon={RiCarLine} title={t.fleet} value={`${stats.availableCars}/${stats.totalCars}`} color="indigo" />
        <StatCard icon={RiCalendarCheckLine} title={t.rentals} value={stats.activeRentals} color="violet" />
        <StatCard icon={RiUserSharedLine} title={t.customers} value={stats.totalCustomers} color="blue" />
        <StatCard icon={RiMoneyDollarCircleLine} title={t.today_revenue} value={`${stats.todayRevenue.toLocaleString()} DH`} color="emerald" />
        <StatCard icon={RiBarChartBoxLine} title={t.monthly_revenue} value={`${stats.monthlyRevenue.toLocaleString()} DH`} color="indigo" />
        <StatCard icon={RiPieChartLine} title={t.annual_revenue} value={`${stats.annualRevenue.toLocaleString()} DH`} color="violet" />
      </div>

      <div className="dashboard-main-content">
        <div className="dashboard-grid-2">
          <section className="alerts-strip">
            <div className="strip-header">
              <h3><RiAlertLine /> {t.important_alerts}</h3>
            </div>
            <div className="alerts-vertical">
              {alerts.insurance.map(c => (
                <div key={`ins-${c.id}`} className="mini-alert warning" onClick={() => setSelectedAlert({ car: c, reason: t.insurance_alert, date: c.insuranceExpiry })}>
                  <span className="dot"></span> {c.brand} ({t.insurance_alert})
                </div>
              ))}
              {alerts.oil.map(c => (
                <div key={`oil-${c.id}`} className="mini-alert danger" onClick={() => setSelectedAlert({ car: c, reason: t.oil_alert, date: `${Math.round(c.nextOilChange - c.mileage)} Km left` })}>
                  <span className="dot"></span> {c.brand} ({t.oil_alert})
                </div>
              ))}
              {alerts.tax.map(c => (
                <div key={`tax-${c.id}`} className="mini-alert warning" onClick={() => setSelectedAlert({ car: c, reason: t.tax_alert, date: c.taxExpiry })}>
                  <span className="dot"></span> {c.brand} ({t.tax_alert})
                </div>
              ))}
              {alerts.techControl.map(c => (
                <div key={`tech-${c.id}`} className="mini-alert warning" onClick={() => setSelectedAlert({ car: c, reason: t.tech_alert, date: c.techControlExpiry })}>
                  <span className="dot"></span> {c.brand} ({t.tech_alert})
                </div>
              ))}
              {(alerts.insurance.length + alerts.tax.length + alerts.oil.length + alerts.techControl.length) === 0 && <p className="all-clear">{t.no_alerts}</p>}
            </div>
          </section>

          <section className="active-rentals-section">
            <div className="section-header">
              <h3><RiCalendarCheckLine /> {t.cars_currently_in_rental}</h3>
            </div>
            <div className="rentals-list-compact">
              {activeRentalsDetails.length > 0 ? (
                activeRentalsDetails.map(rental => (
                  <div key={rental.id} className="rental-card-mini">
                    <div className="rental-car-info">
                      <RiCarLine />
                      <div>
                        <h4>{rental.brand} {rental.model}</h4>
                        <span dir="ltr">{rental.plateNumber}</span>
                      </div>
                    </div>
                    <div className="rental-customer-info">
                      <RiUserSharedLine />
                      <p>{rental.customerName}</p>
                    </div>
                    <div className="rental-status-badge">
                      {t.rented}
                    </div>
                  </div>
                ))
              ) : (
                <p className="empty-msg">{t.no_cars_currently_in_rental}</p>
              )}
            </div>
          </section>
        </div>
      </div>

      {selectedAlert && <AlertModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} language={language} t={t} />}
    </div>
  );
};

export default Dashboard;