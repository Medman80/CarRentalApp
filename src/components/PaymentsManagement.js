import React, { useState, useEffect } from 'react';
import { RiMoneyDollarCircleLine, RiBankCardLine, RiWalletLine, RiCarLine, RiUserLine, RiCloseLine, RiShieldCheckLine, RiDeleteBinLine } from 'react-icons/ri';
import translations from '../translations';
import './Management.css';
import { showMessage, showConfirm } from '../utils/dialogs';

const formatPaymentDate = (paymentDateLocal, paymentDateRaw) => {
  const source = paymentDateLocal || paymentDateRaw;
  if (!source) return '--';

  const clean = String(source).split('.')[0].replace('T', ' ');
  const [datePart] = clean.split(' ');
  const parts = datePart?.split('-') || [];
  let d;
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    d = new Date(year, month, day);
  } else {
    d = new Date(source);
  }
  const dayStr = String(d.getDate()).padStart(2, '0');
  const monthStr = String(d.getMonth() + 1).padStart(2, '0');
  const yearStr = d.getFullYear();
  return `${dayStr}/${monthStr}/${yearStr}`;
};

const formatContractDate = (dateValue) => {
  if (!dateValue) return '--';
  const parts = String(dateValue).split('T')[0].split('-');
  let d;
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    d = new Date(year, month, day);
  } else {
    d = new Date(dateValue);
  }
  const dayStr = String(d.getDate()).padStart(2, '0');
  const monthStr = String(d.getMonth() + 1).padStart(2, '0');
  const yearStr = d.getFullYear();
  return `${dayStr}/${monthStr}/${yearStr}`;
};

const getMethodLabelText = (type, language) => {
  const t = translations[language] || translations.ar;
  const methods = {
    cash: t.cash,
    card: t.card,
    transfer: t.transfer,
    deposit: t.deposit
  };
  return methods[type] || type;
};

const DepositDetailModal = ({ payment, onClose, language }) => {
  if (!payment) return null;

  const t = translations[language] || translations.ar;
  const methodLabel = payment.rentalDepositMethod || payment.paymentType || '--';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="detail-modal-compact" onClick={e => e.stopPropagation()} style={{ maxWidth: '620px' }}>
        <div className="modal-header-premium">
          <RiShieldCheckLine style={{ color: '#4f46e5' }} />
          <h3>{t.deposit_details}</h3>
          <button onClick={onClose} className="close-btn-round"><RiCloseLine /></button>
        </div>

        <div className="modal-body-premium">
          <div className="car-header-flex">
            <div className="car-visual"><RiUserLine /></div>
            <div className="car-title-info">
              <h4>{payment.customerName}</h4>
              <span className="plate-tag-premium">
                {payment.carBrand} {payment.carModel}
              </span>
              <span className="status-pill-compact active" dir="ltr">
                {payment.plateNumber}
              </span>
            </div>
          </div>

          <div className="specs-grid">
            <div className="spec-item">
              <span>{t.deposit_amount}</span>
              <strong>{payment.amount} DH</strong>
            </div>
            <div className="spec-item">
              <span>{t.payment_method}</span>
              <strong>{methodLabel}</strong>
            </div>
            <div className="spec-item">
              <span>{t.start_date}</span>
              <strong>{formatContractDate(payment.startDate)}</strong>
            </div>
            <div className="spec-item">
              <span>{t.end_date}</span>
              <strong>{payment.endDate ? formatContractDate(payment.endDate) : '--'}</strong>
            </div>
          </div>

          <div className="notes-box-premium">
            <p>
              <strong>{t.transaction_type}:</strong> {getMethodLabelText(payment.paymentType, language)}
            </p>
            {payment.linkedPaymentId && (
              <p>
                <strong>{t.linked_payment}:</strong> #{payment.linkedPaymentId}
              </p>
            )}
            <p>
              <strong>{t.record_status}:</strong> {payment.status === 'paid' ? (t.paid) : (t.pending)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const PaymentsManagement = ({ language = 'ar' }) => {
  const t = translations[language] || translations.ar;
  const [payments, setPayments] = useState([]);
  const [selectedDeposit, setSelectedDeposit] = useState(null);
  const [activeSection, setActiveSection] = useState('payments');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      if (window.electron) {
        const result = await window.electron.getPayments();
        if (result.success) setPayments(result.data || []);
      }
    } catch (error) {
      console.error('Error loading payments:', error);
    }
  };

  const handleDeletePayment = async (id, e) => {
    e.stopPropagation();
    if (await showConfirm(t.confirm_delete || 'Are you sure you want to delete this payment?')) {
      if (window.electron) {
        const result = await window.electron.deletePayment(id);
        if (result.success) {
          loadData();
          await showMessage(t.deleted_successfully || 'Deleted successfully');
        } else {
          await showMessage('Delete failed: ' + (result.error || 'Unknown error'));
        }
      }
    }
  };

  const getPaymentIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'card': return <RiBankCardLine />;
      case 'cash': return <RiWalletLine />;
      default: return <RiMoneyDollarCircleLine />;
    }
  };

  const getMethodLabel = (type) => {
    return getMethodLabelText(type, language);
  };

  const regularPayments = payments.filter(payment => payment.paymentType !== 'deposit');
  const depositPayments = payments.filter(payment => payment.paymentType === 'deposit');
  const activeCount = activeSection === 'payments' ? regularPayments.length : depositPayments.length;

  return (
    <div className="management-container-premium">
      <div className="management-header-compact">
        <div className="header-title">
          <h2>
            {activeSection === 'payments'
              ? (t.payments_collections)
              : (t.deposits)}
          </h2>
          <p>{activeCount} {t.records_in_this_section}</p>
        </div>
      </div>

      <div className="payments-switcher" role="tablist" aria-label={t.payment_sections}>
        <button
          type="button"
          className={`payments-switcher-btn ${activeSection === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveSection('payments')}
          role="tab"
          aria-selected={activeSection === 'payments'}
        >
          <RiMoneyDollarCircleLine />
          <span>{t.payment_history}</span>
          <strong>{regularPayments.length}</strong>
        </button>
        <button
          type="button"
          className={`payments-switcher-btn ${activeSection === 'deposits' ? 'active' : ''}`}
          onClick={() => setActiveSection('deposits')}
          role="tab"
          aria-selected={activeSection === 'deposits'}
        >
          <RiShieldCheckLine />
          <span>{t.deposits}</span>
          <strong>{depositPayments.length}</strong>
        </button>
      </div>

      {activeSection === 'payments' && (
        <div className="table-container-premium">
          <table>
            <thead>
              <tr>
                <th>{t.customer || (t.customer)}</th>
                <th>{t.amount}</th>
                <th>{t.method}</th>
                <th>{t.date}</th>
                <th>{t.status}</th>
                <th>{t.actions || 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {regularPayments.length > 0 ? regularPayments.map(payment => (
                <tr key={payment.id}>
                  <td><div className="flex-cell"><strong>{payment.customerName}</strong></div></td>
                  <td><span className="price-tag-compact" style={{background: '#ecfdf5', color: '#059669'}}>{payment.amount} DH</span></td>
                  <td>
                    <div className="flex-cell">
                      <span className="cell-icon">{getPaymentIcon(payment.paymentType)}</span>
                      {getMethodLabel(payment.paymentType)}
                    </div>
                  </td>
                  <td>{formatPaymentDate(payment.paymentDateLocal, payment.paymentDate)}</td>
                  <td>
                    <span className={`status-pill-compact ${payment.status === 'paid' ? 'active' : 'completed'}`} style={{background: payment.status === 'paid' ? '#ecfdf5' : '#fef2f2', color: payment.status === 'paid' ? '#059669' : '#dc2626'}}>
                      {payment.status === 'paid' ? (t.paid) : (t.pending)}
                    </span>
                  </td>
                  <td>
                    <button className="mini-action-btn delete" onClick={(e) => handleDeletePayment(payment.id, e)} title={t.delete || 'Delete'}>
                      <RiDeleteBinLine />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: '#64748b' }}>
                    {t.no_recorded_payments}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeSection === 'deposits' && (
        <div className="table-container-premium">
          <table>
            <thead>
              <tr>
                <th>{t.customer}</th>
                <th>{t.car}</th>
                <th>{t.deposit}</th>
                <th>{t.method}</th>
                <th>{t.date}</th>
                <th>{t.actions || 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {depositPayments.length > 0 ? depositPayments.map(payment => (
                <tr key={payment.id} onClick={() => setSelectedDeposit(payment)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div className="flex-cell">
                      <span className="cell-icon"><RiUserLine /></span>
                      <strong>{payment.customerName}</strong>
                    </div>
                  </td>
                  <td>
                    <div className="flex-cell">
                      <span className="cell-icon"><RiCarLine /></span>
                      {payment.carBrand} {payment.carModel}
                      <small dir="ltr" style={{ marginInlineStart: '6px', color: '#64748b' }}>({payment.plateNumber})</small>
                    </div>
                  </td>
                  <td>
                    <span className="price-tag-compact" style={{background: '#eff6ff', color: '#2563eb'}}>
                      {payment.amount} DH
                    </span>
                  </td>
                  <td>{payment.rentalDepositMethod || getMethodLabel(payment.paymentType)}</td>
                  <td>{formatPaymentDate(payment.paymentDateLocal, payment.paymentDate)}</td>
                  <td>
                    <button className="mini-action-btn delete" onClick={(e) => handleDeletePayment(payment.id, e)} title={t.delete || 'Delete'}>
                      <RiDeleteBinLine />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: '#64748b' }}>
                    {t.no_recorded_deposits}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedDeposit && (
        <DepositDetailModal
          payment={selectedDeposit}
          onClose={() => setSelectedDeposit(null)}
          language={language}
        />
      )}
    </div>
  );
};

export default PaymentsManagement;
