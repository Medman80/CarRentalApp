import React, { useState, useEffect } from 'react';
import {
  RiAddLine,
  RiEditLine,
  RiDeleteBinLine,
  RiInformationLine,
  RiCarLine,
  RiCheckDoubleLine,
  RiCloseLine,
  RiLockLine,
  RiMoneyDollarCircleLine,
  RiDashboardLine,
  RiSearchLine,
  RiStickyNoteLine
} from 'react-icons/ri';
import translations from '../translations';
import './Management.css';
import { showMessage, showConfirm } from '../utils/dialogs';

const CarDetailModal = ({ car, onClose, language, t, getImageUrl }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="detail-modal-compact" onClick={e => e.stopPropagation()}>
      <div className="modal-header-premium">
        <RiLockLine className="lock-icon" />
        <h3>{t.technical_data_sheet}</h3>
        <button onClick={onClose} className="close-btn-round"><RiCloseLine /></button>
      </div>
      <div className="modal-body-premium">
        <div className="car-header-flex">
          <div className="car-visual">
            {car.image ? <img src={getImageUrl(car.image)} alt={car.brand} /> : <RiCarLine />}
          </div>
          <div className="car-title-info">
            <h4>{car.brand} {car.model}</h4>
            <span className="plate-tag-premium" dir="ltr">{car.plateNumber}</span>
            <span className={`status-pill ${car.status}`}>
              {car.status === 'available' ? t.available : t.rented}
            </span>
          </div>
        </div>
        <div className="specs-grid">
          <div className="spec-item"><span>{t.daily_price}</span><strong>{car.dailyPrice} DH</strong></div>
          <div className="spec-item"><span>{t.mileage}</span><strong>{car.mileage} Km</strong></div>
          <div className="spec-item"><span>{t.insurance_expiry}</span><strong>{car.insuranceExpiry || '--'}</strong></div>
          <div className="spec-item"><span>{t.tax_expiry}</span><strong>{car.taxExpiry || '--'}</strong></div>
          <div className="spec-item"><span>{t.tech_expiry}</span><strong>{car.techControlExpiry || '--'}</strong></div>
          <div className="spec-item"><span>{t.fuel_type}</span><strong>{car.fuelType || 'Diesel'}</strong></div>
        </div>
        {car.legalNotes && (
          <div className="notes-box-premium">
            <RiStickyNoteLine />
            <p>{car.legalNotes}</p>
          </div>
        )}
      </div>
    </div>
  </div>
);

const CarsManagement = ({ language = 'ar' }) => {
  const t = translations[language] || translations.ar;
  const [cars, setCars] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedCar, setSelectedCar] = useState(null);
  const [formData, setFormData] = useState({
    brand: '', model: '', plateNumber: '', dailyPrice: '',
    insuranceExpiry: '', taxExpiry: '', lastOilChange: '',
    nextOilChange: '', techControlExpiry: '', legalNotes: '',
    image: '', fuelType: 'Diesel', mileage: 0
  });
  const [editingId, setEditingId] = useState(null);
  const [serverUrl, setServerUrl] = useState('http://localhost:3001');
  const [filters, setFilters] = useState({ status: '', searchTerm: '' });

  useEffect(() => {
    loadCars();
    loadServerUrl();
  }, [filters]);

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

  const loadCars = async () => {
    try {
      const result = await window.electron.getCars(filters);
      if (result.success) setCars(result.data || []);
    } catch (error) {
      console.error('Error loading cars:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('Sending car data:', formData);
      let result = editingId
        ? await window.electron.updateCar({ ...formData, id: editingId })
        : await window.electron.addCar(formData);

      if (result.success) {
        loadCars();
        setShowForm(false);
        resetForm();
        await showMessage(t.saved_successfully);
      } else {
        console.error('Save failed:', result.error);
        const errorMessage = `${t.save_failed}: ${result.error || t.unknown_error}`;
        await showMessage(errorMessage);
      }
    } catch (error) {
      console.error('Error saving car:', error);
      await showMessage('Error: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      brand: '', model: '', plateNumber: '', dailyPrice: '',
      insuranceExpiry: '', taxExpiry: '', lastOilChange: '',
      nextOilChange: '', techControlExpiry: '', legalNotes: '',
      image: '', fuelType: 'Diesel', mileage: 0
    });
    setEditingId(null);
  };

  const handleEdit = (car, e) => {
    e.stopPropagation();
    setFormData({
      brand: car.brand || '',
      model: car.model || '',
      plateNumber: car.plateNumber || '',
      dailyPrice: car.dailyPrice || '',
      insuranceExpiry: car.insuranceExpiry || '',
      taxExpiry: car.taxExpiry || '',
      lastOilChange: car.lastOilChange || '',
      nextOilChange: car.nextOilChange || '',
      techControlExpiry: car.techControlExpiry || '',
      legalNotes: car.legalNotes || '',
      image: car.image || '',
      fuelType: car.fuelType || 'Diesel',
      mileage: car.mileage || 0
    });
    setEditingId(car.id);
    setShowForm(true);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (await showConfirm(t.confirm_delete)) {
      await window.electron.deleteCar(id);
      loadCars();
    }
  };



  return (
    <div className="management-container-premium">
      <div className="management-header-compact">
        <div className="header-title">
          <h2>{t.manage_cars}</h2>
          <p>{cars.length} {t.cars_in_fleet}</p>
        </div>

        <div className="header-controls-flex">
          <div className="search-box-mini">
            <RiSearchLine />
            <input
              type="text"
              placeholder={t.search}
              value={filters.searchTerm}
              onChange={e => setFilters({ ...filters, searchTerm: e.target.value })}
            />
          </div>

          <select
            className="filter-select-mini"
            value={filters.status}
            onChange={e => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">{t.all_status}</option>
            <option value="available">{t.available}</option>
            <option value="rented">{t.rented}</option>
          </select>

          <button className="btn-add-premium" onClick={() => { setShowForm(true); resetForm(); }}>
            <RiAddLine /> {t.add_car}
          </button>
        </div>
      </div>

      <div className="cars-grid-compact">
        {cars.map(car => (
          <div key={car.id} className={`car-card-mini ${car.status}`} onClick={() => setSelectedCar(car)}>
            <div className="car-image-container">
              {car.image ? (
                <img src={getImageUrl(car.image)} alt={`${car.brand} ${car.model}`} />
              ) : (
                <RiCarLine />
              )}
              <div className={`car-status-badge-mini ${car.status}`}>
                {car.status === 'available' ? t.available : t.rented}
              </div>
            </div>

            <div className="car-card-info-content">
              <div className="car-card-header-flex">
                <h4>{car.brand} {car.model}</h4>
                <div className="car-actions-mini-inline">
                  <button className="mini-action-btn" onClick={(e) => handleEdit(car, e)} title={t.edit}><RiEditLine /></button>
                  <button className="mini-action-btn delete" onClick={(e) => handleDelete(car.id, e)} title={t.delete}><RiDeleteBinLine /></button>
                </div>
              </div>

              <div className="plate-text-pill" dir="ltr">{car.plateNumber}</div>

              <div className="car-card-footer-flex">
                <span className="price-tag-mini">{car.dailyPrice.toLocaleString()} DH</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                  / {t.day}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="modal-overlay">
          <form onSubmit={handleSubmit} className="form-container-premium">
            <div className="form-header-premium">
              <h3>{editingId ? t.edit_car : t.add_car}</h3>
              <button type="button" className="close-btn-premium" onClick={() => setShowForm(false)}><RiCloseLine /></button>
            </div>
            <div className="form-scrollable">
              <div className="form-section-premium">
                <h4><RiInformationLine /> {t.basic_info}</h4>
                <div className="grid-2-col">
                  <div className="input-box"><label>{t.brand}</label><input type="text" value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} placeholder={t.brand} required /></div>
                  <div className="input-box"><label>{t.model}</label><input type="text" value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} placeholder={t.model} required /></div>
                  <div className="input-box"><label>{t.plate_number}</label><input type="text" dir="ltr" value={formData.plateNumber} onChange={e => setFormData({ ...formData, plateNumber: e.target.value })} placeholder="12345 | A | 12" required /></div>
                  <div className="input-box"><label>{t.daily_price}</label><input type="text" inputMode="numeric" pattern="[0-9.]*" value={formData.dailyPrice} onChange={e => setFormData({ ...formData, dailyPrice: e.target.value.replace(/[^0-9.]/g, '') })} placeholder="300" required /></div>
                  <div className="input-box">
                    <label>{t.fuel_type}</label>
                    <select value={formData.fuelType} onChange={e => setFormData({ ...formData, fuelType: e.target.value })} className="select-premium-input">
                      <option value="Diesel">Diesel</option>
                      <option value="Essence">Essence</option>
                      <option value="Electric">Electric</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="form-section-premium">
                <h4><RiDashboardLine /> {t.car_image}</h4>
                <div className="input-box full-width">
                  <div
                    className="image-picker-area"
                    onClick={async () => {
                      const result = await window.electron.pickAndSaveImage();
                      if (result.success) setFormData({ ...formData, image: result.path });
                    }}
                    style={{
                      border: '2px dashed #cbd5e1',
                      borderRadius: '16px',
                      padding: '20px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: '#f8fafc'
                    }}
                  >
                    {formData.image ? (
                      <img src={getImageUrl(formData.image)} alt="Preview" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '12px' }} />
                    ) : (
                      <div>
                        <RiAddLine style={{ fontSize: '24px', color: '#64748b' }} />
                        <p>{t.click_to_select_an_image}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="form-section-premium">
                <h4><RiLockLine /> {t.legal_documents}</h4>
                <div className="grid-2-col">
                  <div className="input-box"><label>{t.insurance_expiry}</label><input type="date" value={formData.insuranceExpiry} onChange={e => setFormData({ ...formData, insuranceExpiry: e.target.value })} /></div>
                  <div className="input-box"><label>{t.tax_expiry}</label><input type="date" value={formData.taxExpiry} onChange={e => setFormData({ ...formData, taxExpiry: e.target.value })} /></div>
                  <div className="input-box"><label>{t.tech_expiry}</label><input type="date" value={formData.techControlExpiry} onChange={e => setFormData({ ...formData, techControlExpiry: e.target.value })} /></div>
                </div>
              </div>
              <div className="form-section-premium">
                <h4><RiInformationLine /> {t.notes}</h4>
                <div className="input-box full-width">
                  <textarea value={formData.legalNotes} onChange={e => setFormData({ ...formData, legalNotes: e.target.value })} style={{ width: '100%', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '12px' }} rows="3"></textarea>
                </div>
              </div>
            </div>
            <div className="form-footer-premium">
              <button type="submit" className="btn-save-premium">{t.save}</button>
              <button type="button" className="btn-cancel-premium" onClick={() => setShowForm(false)}>{t.cancel}</button>
            </div>
          </form>
        </div>
      )}

      {selectedCar && (
        <CarDetailModal
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

export default CarsManagement;
