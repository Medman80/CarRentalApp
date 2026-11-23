import React, { useState, useEffect } from 'react';
import {
  RiAddLine,
  RiDeleteBinLine,
  RiToolsLine,
  RiCarLine,
  RiMoneyDollarCircleLine,
  RiCalendarLine,
  RiRoadMapLine,
  RiCloseLine,
  RiInformationLine
} from 'react-icons/ri';
import translations from '../translations';
import './Management.css';
import { showConfirm } from '../utils/dialogs';

const formatDateValue = (dateValue) => {
  if (!dateValue) return '--';
  const clean = String(dateValue).split('T')[0];
  const parts = clean.split('-');
  let d;
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    d = new Date(year, month, day);
  } else {
    d = new Date(dateValue);
  }
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const getMaintenanceTypeLabelText = (type, language) => {
  const t = translations[language] || translations.ar;
  const types = {
    oil: t.oil_change,
    repair: t.repair,
    parts: t.parts,
    tires: t.tires,
    other: t.other
  };
  return types[type] || type;
};

const MaintenanceDetailModal = ({ record, onClose, language, t }) => {
  if (!record) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="detail-modal-compact" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
        <div className="modal-header-premium">
          <RiToolsLine style={{ color: '#4f46e5' }} />
          <h3>{t.maintenance_details}</h3>
          <button onClick={onClose} className="close-btn-round"><RiCloseLine /></button>
        </div>

        <div className="modal-body-premium">
          <div className="car-header-flex">
            <div className="car-visual"><RiCarLine /></div>
            <div className="car-title-info">
              <h4>{record.brand} {record.model}</h4>
              <span className="plate-tag-premium" dir="ltr">{record.plateNumber}</span>
              <span className="status-pill-compact active">{getMaintenanceTypeLabelText(record.type, language)}</span>
            </div>
          </div>

          <div className="specs-grid">
            <div className="spec-item">
              <span>{t.maintenance_type}</span>
              <strong>{getMaintenanceTypeLabelText(record.type, language)}</strong>
            </div>
            <div className="spec-item">
              <span>{t.date}</span>
              <strong>{formatDateValue(record.date)}</strong>
            </div>
            <div className="spec-item">
              <span>{t.cost}</span>
              <strong>{record.cost} DH</strong>
            </div>
            <div className="spec-item">
              <span>{t.record_id}</span>
              <strong>#{record.id}</strong>
            </div>
          </div>

          <div className="notes-box-premium" style={{ marginTop: '18px' }}>
            <p style={{ marginTop: 0, marginBottom: 0 }}>
              <strong>{t.description}:</strong> {record.description || '--'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const MaintenanceManagement = ({ language = 'ar' }) => {
  const t = translations[language] || translations.ar;
  const [records, setRecords] = useState([]);
  const [cars, setCars] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [formData, setFormData] = useState({
    carId: '',
    type: 'oil',
    description: '',
    cost: '',
    date: new Date().toISOString().split('T')[0],
    nextServiceMileage: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [recordsRes, carsRes] = await Promise.all([
        window.electron.getMaintenanceRecords(),
        window.electron.getCars()
      ]);
      if (recordsRes.success) setRecords(recordsRes.data || []);
      if (carsRes.success) setCars(carsRes.data || []);
    } catch (error) {
      console.error('Error loading maintenance data:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await window.electron.addMaintenanceRecord(formData);
      if (result.success) {
        if (formData.type === 'oil') {
          const car = cars.find(c => c.id === parseInt(formData.carId, 10));
          if (car) {
            await window.electron.updateCar({
              ...car,
              lastOilChange: car.mileage,
              nextOilChange: (parseFloat(car.mileage) || 0) + 10000
            });
          }
        }
        setShowForm(false);
        setSelectedRecord(null);
        setFormData({
          carId: '',
          type: 'oil',
          description: '',
          cost: '',
          date: new Date().toISOString().split('T')[0],
          nextServiceMileage: ''
        });
        loadData();
      }
    } catch (error) {
      console.error('Error adding maintenance:', error);
    }
  };

  const handleDelete = async (id) => {
    if (await showConfirm(t.confirm_delete)) {
      await window.electron.deleteMaintenanceRecord(id);
      setSelectedRecord(prev => (prev && prev.id === id ? null : prev));
      loadData();
    }
  };

  return (
    <div className="management-container-premium">
      <div className="management-header-compact">
        <div className="header-title">
          <h2>{t.manage_maintenance}</h2>
          <p>{records.length} {t.maintenance_records}</p>
        </div>
        <button className="btn-add-premium" onClick={() => setShowForm(true)}>
          <RiAddLine /> {t.add_maintenance}
        </button>
      </div>

      <div className="table-container-premium">
        <table>
          <thead>
            <tr>
              <th>{t.cars}</th>
              <th>{t.maintenance_type}</th>
              <th>{t.date}</th>
              <th>{t.cost}</th>
              <th>{t.actions}</th>
            </tr>
          </thead>
          <tbody>
            {records.map(record => (
              <tr
                key={record.id}
                onClick={() => setSelectedRecord(record)}
                style={{ cursor: 'pointer' }}
              >
                <td>
                  <div className="flex-cell">
                    <RiCarLine className="cell-icon" />
                    <strong>{record.brand} {record.model}</strong>
                  </div>
                </td>
                <td>
                  <span className={`status-pill-compact ${record.type === 'oil' ? 'active' : 'completed'}`}>
                    {getMaintenanceTypeLabelText(record.type, language)}
                  </span>
                </td>
                <td>{formatDateValue(record.date)}</td>
                <td>
                  <span className="price-tag-compact" style={{ background: '#fef2f2', color: '#dc2626' }}>
                    {record.cost} DH
                  </span>
                </td>
                <td>
                  <button
                    className="mini-action-btn delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(record.id);
                    }}
                  >
                    <RiDeleteBinLine />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <form onSubmit={handleSubmit} className="form-container-premium">
            <div className="form-header-premium">
              <h3>{t.add_maintenance}</h3>
              <button type="button" className="close-btn-premium" onClick={() => setShowForm(false)}>
                <RiCloseLine />
              </button>
            </div>
            <div className="form-scrollable">
              <div className="form-section-premium">
                <h4><RiInformationLine /> {t.maintenance_details}</h4>
                <div className="grid-2-col">
                  <div className="input-box">
                    <label>{t.cars}</label>
                    <select
                      value={formData.carId}
                      onChange={e => setFormData({ ...formData, carId: e.target.value })}
                      required
                    >
                      <option value="">--</option>
                      {cars.map(c => (
                        <option key={c.id} value={c.id}>{c.brand} {c.model}</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-box">
                    <label>{t.maintenance_type}</label>
                    <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                      <option value="oil">{getMaintenanceTypeLabelText('oil', language)}</option>
                      <option value="repair">{getMaintenanceTypeLabelText('repair', language)}</option>
                      <option value="parts">{getMaintenanceTypeLabelText('parts', language)}</option>
                      <option value="tires">{getMaintenanceTypeLabelText('tires', language)}</option>
                      <option value="other">{getMaintenanceTypeLabelText('other', language)}</option>
                    </select>
                  </div>
                  <div className="input-box">
                    <label>{t.cost}</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9.]*"
                      value={formData.cost}
                      onChange={e => setFormData({ ...formData, cost: e.target.value.replace(/[^0-9.]/g, '') })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="input-box">
                    <label>{t.date}</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="input-box full-width" style={{ marginTop: '20px' }}>
                  <label>{t.description}</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    rows="3"
                    style={{ width: '100%', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '12px' }}
                  />
                </div>
              </div>
            </div>
            <div className="form-footer-premium">
              <button type="submit" className="btn-save-premium">{t.save}</button>
              <button type="button" className="btn-cancel-premium" onClick={() => setShowForm(false)}>
                {t.cancel}
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedRecord && (
        <MaintenanceDetailModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          language={language}
          t={t}
        />
      )}
    </div>
  );
};

export default MaintenanceManagement;
