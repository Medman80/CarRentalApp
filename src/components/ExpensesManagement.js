import React, { useState, useEffect } from 'react';
import {
  RiAddLine,
  RiDeleteBinLine,
  RiMoneyDollarBoxLine,
  RiCalendarLine,
  RiPriceTag3Line,
  RiStickyNoteLine,
  RiCloseLine,
  RiInformationLine,
  RiCarLine
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

const getCategoryLabelText = (cat, language) => {
  const t = translations[language] || translations.ar;
  const categories = {
    other: t.other,
    rent: t.rent,
    utilities: t.utilities,
    salaries: t.salaries,
    marketing: t.marketing,
    insurance: t.insurance,
    car_docs: t.car_documents
  };
  return categories[cat] || cat;
};

const getDocTypeLabelText = (type, language) => {
  const t = translations[language] || translations.ar;
  const types = {
    insurance: t.insurance,
    tax: t.tax,
    tech: t.technical_inspection
  };
  return types[type] || type || '--';
};

const ExpenseDetailModal = ({ expense, onClose, language, t }) => {
  if (!expense) return null;
  const isCarDoc = expense.category === 'car_docs';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="detail-modal-compact" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
        <div className="modal-header-premium">
          <RiMoneyDollarBoxLine style={{ color: '#dc2626' }} />
          <h3>{t.expense_details}</h3>
          <button onClick={onClose} className="close-btn-round"><RiCloseLine /></button>
        </div>

        <div className="modal-body-premium">
          <div className="car-header-flex">
            <div className="car-visual"><RiPriceTag3Line /></div>
            <div className="car-title-info">
              <h4>{expense.title}</h4>
              <span className="plate-tag-premium">{getCategoryLabelText(expense.category, language)}</span>
              <span className="status-pill-compact active">{expense.amount} DH</span>
            </div>
          </div>

          <div className="specs-grid">
            <div className="spec-item">
              <span>{t.amount}</span>
              <strong>{expense.amount} DH</strong>
            </div>
            <div className="spec-item">
              <span>{t.date}</span>
              <strong>{formatDateValue(expense.date)}</strong>
            </div>
            <div className="spec-item">
              <span>{t.category}</span>
              <strong>{getCategoryLabelText(expense.category, language)}</strong>
            </div>
            <div className="spec-item">
              <span>{t.record_id}</span>
              <strong>#{expense.id}</strong>
            </div>
          </div>

          {isCarDoc && (
            <div className="notes-box-premium" style={{ marginTop: '18px' }}>
              <p style={{ marginTop: 0, marginBottom: '10px' }}>
                <strong>{t.car_info}:</strong>{' '}
                {expense.carBrand ? <span dir="ltr">{expense.carBrand} {expense.carModel} ({expense.plateNumber})</span> : '--'}
              </p>
              <p style={{ marginTop: 0, marginBottom: '10px' }}>
                <strong>{t.document_type}:</strong>{' '}
                {getDocTypeLabelText(expense.docType, language)}
              </p>
              <p style={{ marginTop: 0 }}>
                <strong>{t.new_expiry_date}:</strong>{' '}
                {formatDateValue(expense.newExpiryDate)}
              </p>
            </div>
          )}

          <div className="notes-box-premium" style={{ marginTop: '18px' }}>
            <p style={{ margin: 0 }}>
              <strong>{t.notes || (t.notes)}:</strong>{' '}
              {expense.notes || '--'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ExpensesManagement = ({ language = 'ar' }) => {
  const t = translations[language] || translations.ar;
  const [expenses, setExpenses] = useState([]);
  const [cars, setCars] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'other',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    carId: '',
    docType: 'insurance',
    newExpiryDate: ''
  });

  useEffect(() => {
    loadExpenses();
    loadCars();
  }, []);

  const loadCars = async () => {
    try {
      const result = await window.electron.getCars();
      if (result.success) setCars(result.data || []);
    } catch (error) {
      console.error('Error loading cars:', error);
    }
  };

  const loadExpenses = async () => {
    try {
      const result = await window.electron.getExpenses();
      if (result.success) setExpenses(result.data || []);
    } catch (error) {
      console.error('Error loading expenses:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await window.electron.addExpense(formData);
      if (result.success) {
        if (formData.category === 'car_docs' && formData.carId && formData.newExpiryDate) {
          const car = cars.find(c => c.id === parseInt(formData.carId, 10));
          if (car) {
            const updatedCar = { ...car };
            if (formData.docType === 'insurance') updatedCar.insuranceExpiry = formData.newExpiryDate;
            else if (formData.docType === 'tax') updatedCar.taxExpiry = formData.newExpiryDate;
            else if (formData.docType === 'tech') updatedCar.techControlExpiry = formData.newExpiryDate;

            await window.electron.updateCar(updatedCar);
          }
        }

        setShowForm(false);
        setSelectedExpense(null);
        setFormData({
          title: '',
          amount: '',
          category: 'other',
          date: new Date().toISOString().split('T')[0],
          notes: '',
          carId: '',
          docType: 'insurance',
          newExpiryDate: ''
        });
        loadExpenses();
      }
    } catch (error) {
      console.error('Error adding expense:', error);
    }
  };

  const handleDelete = async (id) => {
    if (await showConfirm(t.confirm_delete)) {
      await window.electron.deleteExpense(id);
      setSelectedExpense(prev => (prev && prev.id === id ? null : prev));
      loadExpenses();
    }
  };

  return (
    <div className="management-container-premium">
      <div className="management-header-compact">
        <div className="header-title">
          <h2>{t.manage_expenses}</h2>
          <p>{expenses.length} {t.recorded_expenses}</p>
        </div>
        <button className="btn-add-premium" onClick={() => setShowForm(true)}>
          <RiAddLine /> {t.add_expense}
        </button>
      </div>

      <div className="table-container-premium">
        <table>
          <thead>
            <tr>
              <th>{t.title}</th>
              <th>{t.category}</th>
              <th>{t.date}</th>
              <th>{t.amount}</th>
              <th>{t.actions}</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map(expense => (
              <tr
                key={expense.id}
                onClick={() => setSelectedExpense(expense)}
                style={{ cursor: 'pointer' }}
              >
                <td><div className="flex-cell"><strong>{expense.title}</strong></div></td>
                <td>
                  <div className="flex-cell">
                    <RiPriceTag3Line className="cell-icon" />
                    {getCategoryLabelText(expense.category, language)}
                  </div>
                </td>
                <td>{formatDateValue(expense.date)}</td>
                <td>
                  <span className="price-tag-compact" style={{ background: '#fef2f2', color: '#dc2626' }}>
                    {expense.amount} DH
                  </span>
                </td>
                <td>
                  <button
                    className="mini-action-btn delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(expense.id);
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
              <h3>{t.add_expense}</h3>
              <button type="button" className="close-btn-premium" onClick={() => setShowForm(false)}>
                <RiCloseLine />
              </button>
            </div>
            <div className="form-scrollable">
              <div className="form-section-premium">
                <h4><RiInformationLine /> {t.expense_details}</h4>
                <div className="grid-2-col">
                  <div className="input-box">
                    <label>{t.title}</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="input-box">
                    <label>{t.amount}</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9.]*"
                      value={formData.amount}
                      onChange={e => setFormData({ ...formData, amount: e.target.value.replace(/[^0-9.]/g, '') })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="input-box">
                    <label>{t.category}</label>
                    <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                      <option value="other">{getCategoryLabelText('other', language)}</option>
                      <option value="rent">{getCategoryLabelText('rent', language)}</option>
                      <option value="utilities">{getCategoryLabelText('utilities', language)}</option>
                      <option value="salaries">{getCategoryLabelText('salaries', language)}</option>
                      <option value="marketing">{getCategoryLabelText('marketing', language)}</option>
                      <option value="insurance">{getCategoryLabelText('insurance', language)}</option>
                      <option value="car_docs">{getCategoryLabelText('car_docs', language)}</option>
                    </select>
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

                {formData.category === 'car_docs' && (
                  <div
                    className="form-section-premium"
                    style={{ marginTop: '20px', padding: '15px', background: '#f0f9ff', borderRadius: '16px', border: '1px solid #bae6fd' }}
                  >
                    <h4 style={{ color: '#0369a1', marginBottom: '15px' }}>
                      <RiCarLine /> {t.car_document_renewal}
                    </h4>
                    <div className="grid-2-col">
                      <div className="input-box">
                        <label>{t.cars}</label>
                        <select value={formData.carId} onChange={e => setFormData({ ...formData, carId: e.target.value })} required>
                          <option value="">--</option>
                          {cars.map(c => (
                            <option key={c.id} value={c.id} dir="ltr">
                              {c.brand} {c.model} ({c.plateNumber})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="input-box">
                        <label>{t.document_type}</label>
                        <select value={formData.docType} onChange={e => setFormData({ ...formData, docType: e.target.value })}>
                          <option value="insurance">{t.insurance_expiry}</option>
                          <option value="tax">{t.tax_expiry}</option>
                          <option value="tech">{t.tech_expiry}</option>
                        </select>
                      </div>
                      <div className="input-box">
                        <label>{t.new_expiry_date}</label>
                        <input
                          type="date"
                          value={formData.newExpiryDate}
                          onChange={e => setFormData({ ...formData, newExpiryDate: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="input-box full-width" style={{ marginTop: '20px' }}>
                  <label>{t.notes}</label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
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

      {selectedExpense && (
        <ExpenseDetailModal
          expense={selectedExpense}
          onClose={() => setSelectedExpense(null)}
          language={language}
          t={t}
        />
      )}
    </div>
  );
};

export default ExpensesManagement;
