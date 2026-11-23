import React, { useState, useEffect } from 'react';
import { 
  RiLineChartLine, 
  RiCarLine, 
  RiMoneyDollarCircleLine, 
  RiToolsLine, 
  RiFileList3Line, 
  RiCloseLine,
  RiArrowRightSLine,
  RiArrowLeftSLine,
  RiInformationLine
} from 'react-icons/ri';
import translations from '../translations';
import './Management.css';

const PerformanceModal = ({ car, onClose, language, t, getImageUrl }) => {
  const netProfit = car.totalRevenue - car.totalExpenses;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="detail-modal-compact" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header-premium">
          <RiLineChartLine className="lock-icon" />
          <h3>{t.car_performance_analysis}</h3>
          <button onClick={onClose} className="close-btn-round"><RiCloseLine /></button>
        </div>
        
        <div className="modal-body-premium">
          <div className="car-header-flex">
            <div className="car-visual-medium">
              {car.image ? <img src={getImageUrl(car.image)} alt={car.brand} /> : <RiCarLine />}
            </div>
            <div className="car-title-info">
              <h4>{car.brand} {car.model}</h4>
              <span className="plate-tag-premium" dir="ltr">{car.plateNumber}</span>
            </div>
          </div>

          <div className="specs-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
            <div className="spec-item">
              <span><RiFileList3Line /> {t.rental_count}</span>
              <strong>{car.rentalCount}</strong>
            </div>
            <div className="spec-item">
              <span>{t.rental_days}</span>
              <strong>{Math.round(car.totalDays || 0)} {t.days}</strong>
            </div>
            <div className="spec-item">
              <span><RiMoneyDollarCircleLine /> {t.car_revenue}</span>
              <strong style={{ color: 'var(--success)' }}>{car.totalRevenue.toLocaleString()} DH</strong>
            </div>
            <div className="spec-item">
              <span><RiToolsLine /> {t.car_expenses}</span>
              <strong style={{ color: 'var(--danger)' }}>{car.totalExpenses.toLocaleString()} DH</strong>
            </div>
            <div className="spec-item" style={{ 
              backgroundColor: netProfit >= 0 ? '#ecfdf5' : '#fef2f2',
              border: `1px solid ${netProfit >= 0 ? '#10b981' : '#ef4444'}`
            }}>
              <span style={{ color: netProfit >= 0 ? '#10b981' : '#ef4444' }}>{t.net_profit_loss}</span>
              <strong style={{ color: netProfit >= 0 ? '#10b981' : '#ef4444' }}>{netProfit.toLocaleString()} DH</strong>
            </div>
            <div className="spec-item" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#475569' }}>{t.current_mileage}</span>
              <strong style={{ color: '#334155' }}>{car.mileage || 0} KM</strong>
            </div>
          </div>

          <div className="info-alert" style={{ marginTop: '20px', background: '#f0f9ff', color: '#0369a1', border: 'none' }}>
            <RiInformationLine />
            <p style={{ fontSize: '13px' }}>
              {t.profits_are_calculated_based_o}
            </p>
          </div>
        </div>
        
        <div className="form-footer-premium">
          <button className="btn-primary" onClick={onClose}>{t.close}</button>
        </div>
      </div>
    </div>
  );
};

const CarPerformance = ({ language = 'ar' }) => {
  const t = translations[language] || translations.ar;
  const [performanceData, setPerformanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCar, setSelectedCar] = useState(null);
  const [serverUrl, setServerUrl] = useState('http://localhost:3001');

  useEffect(() => {
    loadPerformance();
    loadServerUrl();
  }, []);

  const loadServerUrl = async () => {
    if (window.electron) {
      const url = await window.electron.getServerUrl();
      setServerUrl(url);
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    return `${serverUrl}/files/${imagePath}`;
  };

  const loadPerformance = async () => {
    try {
      setLoading(true);
      if (window.electron) {
        const result = await window.electron.getCarPerformance();
        if (result.success) {
          setPerformanceData(result.data || []);
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading performance data:', error);
      setLoading(false);
    }
  };


  return (
    <div className="management-container">
      <div className="management-header">
        <h2><RiLineChartLine /> {t.car_performance}</h2>
        <button className="btn-primary" onClick={loadPerformance}>
          <RiFileList3Line /> {t.update_data}
        </button>
      </div>

      <div className="table-container-premium">
        <table>
          <thead>
            <tr>
              <th><RiCarLine /> {t.brand} / {t.model}</th>
              <th>{t.plate_number}</th>
              <th>{t.net_profit_loss}</th>
              <th style={{ width: '50px' }}></th>
            </tr>
          </thead>
          <tbody>
            {performanceData.length > 0 ? (
              performanceData.map((car) => {
                const netProfit = car.totalRevenue - car.totalExpenses;
                return (
                  <tr key={car.id} onClick={() => setSelectedCar(car)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div className="flex-cell">
                        <div className="car-icon-small">
                          {car.image ? <img src={getImageUrl(car.image)} alt="" /> : <RiCarLine />}
                        </div>
                        <div style={{ textAlign: t.left }}>
                          <div style={{ fontWeight: '800' }}>{car.brand}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{car.model}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="plate-tag-premium" dir="ltr">{car.plateNumber}</span></td>
                    <td>
                      <div style={{ 
                        fontWeight: '800',
                        color: netProfit >= 0 ? '#10b981' : '#ef4444'
                      }}>
                        {netProfit.toLocaleString()} DH
                      </div>
                    </td>
                    <td>
                      {language === 'ar' ? <RiArrowLeftSLine style={{ color: '#cbd5e1' }} /> : <RiArrowRightSLine style={{ color: '#cbd5e1' }} />}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '50px' }}>
                  {loading ? (t.loading) : (t.no_data_available)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedCar && (
        <PerformanceModal 
          car={selectedCar} 
          onClose={() => setSelectedCar(null)} 
          language={language}
          t={t}
          getImageUrl={getImageUrl}
        />
      )}
    </div>
  );
};

export default CarPerformance;
