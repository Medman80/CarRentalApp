import React, { useState, useEffect } from 'react';
import { 
  RiAddLine, 
  RiEditLine, 
  RiDeleteBinLine, 
  RiUserLine, 
  RiSmartphoneLine, 
  RiMailLine, 
  RiFingerprintLine, 
  RiMapPinLine, 
  RiCloseLine,
  RiLockLine,
  RiInformationLine,
  RiHistoryLine,
  RiSearchLine
} from 'react-icons/ri';
import translations from '../translations';
import './Management.css';
import { showMessage, showConfirm } from '../utils/dialogs';

const CustomerDetailModal = ({ customer, onClose, language, t }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="detail-modal-compact" onClick={e => e.stopPropagation()}>
      <div className="modal-header-premium">
        <RiLockLine className="lock-icon" />
        <h3>{t.customer_profile}</h3>
        <button onClick={onClose} className="close-btn-round"><RiCloseLine /></button>
      </div>
      <div className="modal-body-premium">
        <div className="car-header-flex">
          <div className="car-visual"><RiUserLine /></div>
          <div className="car-title-info">
            <h4>{customer.name}</h4>
            <span className="plate-tag-premium">{customer.cin}</span>
          </div>
        </div>
        <div className="specs-grid">
          <div className="spec-item"><span>{t.phone}</span><strong>{customer.phone}</strong></div>
          <div className="spec-item"><span>{t.license_number}</span><strong>{customer.licenseNumber || '--'}</strong></div>
          <div className="spec-item"><span>{t.email}</span><strong>{customer.email || '--'}</strong></div>
          <div className="spec-item-full"><span>{t.address}</span><strong>{customer.address || '--'}</strong></div>
        </div>
      </div>
    </div>
  </div>
);

const CustomersManagement = ({ language = 'ar' }) => {
  const t = translations[language] || translations.ar;
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', cin: '', licenseNumber: '', email: '', address: '' });
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadCustomers();
  }, [searchTerm]);

  const loadCustomers = async () => {
    try {
      const result = await window.electron.getCustomers({ searchTerm });
      if (result.success) setCustomers(result.data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let result = editingId 
        ? await window.electron.updateCustomer({ ...formData, id: editingId })
        : await window.electron.addCustomer(formData);

      if (result.success) {
        loadCustomers();
        setShowForm(false);
        resetForm();
        await showMessage(t.saved_successfully);
      }
    } catch (error) {
      console.error('Error saving customer:', error);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', cin: '', licenseNumber: '', email: '', address: '' });
    setEditingId(null);
  };

  const handleEdit = (customer, e) => {
    e.stopPropagation();
    setFormData({ ...customer });
    setEditingId(customer.id);
    setShowForm(true);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (await showConfirm(t.confirm_delete)) {
      await window.electron.deleteCustomer(id);
      loadCustomers();
    }
  };


  return (
    <div className="management-container-premium">
      <div className="management-header-compact">
        <div className="header-title">
          <h2>{t.manage_customers}</h2>
          <p>{customers.length} {t.registered_customers}</p>
        </div>

        <div className="header-controls-flex">
          <div className="search-box-mini">
            <RiSearchLine />
            <input 
              type="text" 
              placeholder={t.search_customer} 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <button className="btn-add-premium" onClick={() => { setShowForm(true); resetForm(); }}>
            <RiAddLine /> {t.add_customer}
          </button>
        </div>
      </div>

      <div className="cars-grid-compact">
        {customers.map(customer => (
          <div key={customer.id} className="car-card-mini" onClick={() => setSelectedCustomer(customer)}>
            <div className="car-image-container" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #ede9fe 100%)' }}>
              <RiUserLine style={{ fontSize: '60px', color: '#6366f1' }} />
              <div className="car-status-badge-mini available" style={{ background: '#6366f1' }}>
                {t.customer}
              </div>
            </div>
            
            <div className="car-card-info-content">
              <div className="car-card-header-flex">
                <h4>{customer.name}</h4>
                <div className="car-actions-mini-inline">
                  <button className="mini-action-btn" onClick={(e) => handleEdit(customer, e)} title={t.edit}><RiEditLine /></button>
                  <button className="mini-action-btn delete" onClick={(e) => handleDelete(customer.id, e)} title={t.delete}><RiDeleteBinLine /></button>
                </div>
              </div>
              
              <div className="plate-text-pill">{customer.cin}</div>
              
              <div className="car-card-footer-flex">
                <span className="price-tag-mini" style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  <RiSmartphoneLine style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  {customer.phone}
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
              <h3>{editingId ? t.update : t.add_customer}</h3>
              <button type="button" className="close-btn-premium" onClick={() => setShowForm(false)}><RiCloseLine /></button>
            </div>
            <div className="form-scrollable">
              <div className="form-section-premium">
                <h4><RiInformationLine /> {t.customer_info}</h4>
                <div className="grid-2-col">
                  <div className="input-box"><label>{t.customer_name}</label><input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder={t.customer_name} required /></div>
                  <div className="input-box"><label>{t.phone}</label><input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="06XXXXXXXX" required /></div>
                  <div className="input-box"><label>{t.cin}</label><input type="text" value={formData.cin} onChange={e => setFormData({...formData, cin: e.target.value})} placeholder="AB123456" required /></div>
                  <div className="input-box"><label>{t.license_number}</label><input type="text" value={formData.licenseNumber} onChange={e => setFormData({...formData, licenseNumber: e.target.value})} placeholder="12/34567" /></div>
                  <div className="input-box"><label>{t.email}</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="example@mail.com" /></div>
                </div>
                <div className="input-box full-width" style={{marginTop: '20px'}}>
                  <label>{t.address}</label>
                  <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} rows="3" style={{width: '100%', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '12px'}}></textarea>
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

      {selectedCustomer && (
        <CustomerDetailModal 
          customer={selectedCustomer} 
          onClose={() => setSelectedCustomer(null)} 
          language={language}
          t={t}
        />
      )}
    </div>
  );
};

export default CustomersManagement;
