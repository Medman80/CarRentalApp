import React, { useState, useEffect } from 'react';
import { 
  RiAddLine, 
  RiCheckLine, 
  RiCalendarLine, 
  RiUserLine, 
  RiCarLine, 
  RiMoneyDollarCircleLine, 
  RiCheckboxCircleLine, 
  RiCloseLine, 
  RiPrinterLine,
  RiInformationLine,
  RiHistoryLine,
  RiLockLine,
  RiImageLine,
  RiQrCodeLine,
  RiShieldCheckLine,
  RiGasStationLine,
  RiErrorWarningLine,
  RiSearchLine
} from 'react-icons/ri';
import QRCode from 'qrcode';
import translations from '../translations';
import './Management.css';
import { showMessage } from '../utils/dialogs';

// Helper: format date string safely without UTC timezone offset issue
// Using 'YYYY-MM-DD' + 'T00:00:00' forces local timezone parsing
const formatDate = (dateStr) => {
  if (!dateStr) return '--';
  // Split date string to avoid UTC offset (e.g. '2025-01-25' -> Jan 24 bug)
  const parts = String(dateStr).split('T')[0].split('-');
  let d;
  if (parts.length === 3) {
    d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  } else {
    d = new Date(dateStr + 'T00:00:00');
  }
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatDateFR = (dateStr) => {
  return formatDate(dateStr);
};

const getTodayLocalISODate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseLocalDate = (dateStr) => {
  const parts = String(dateStr || '').split('T')[0].split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day);
  return Number.isNaN(d.getTime()) ? null : d;
};

// Rental billing uses 24-hour logic:
// same start/end date = 1 day, next day = 1 day, +2 dates = 2 days, etc.
const getRentalDaysBy24Hours = (startDateStr, endDateStr) => {
  const start = parseLocalDate(startDateStr);
  const end = parseLocalDate(endDateStr);
  if (!start || !end) return 1;
  const diffTime = end.getTime() - start.getTime();
  if (diffTime < 0) return 1;
  return Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
};

// Helper: days remaining until rental end
const getDaysUntilEnd = (rental) => {
  if (!rental.endDate || rental.status !== 'active') return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(rental.endDate);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end - today) / (1000 * 60 * 60 * 24));
};

// Sub-components
const MediaPreviewModal = ({ url, isVideo, onClose }) => (
  <div className="modal-overlay" onClick={onClose} style={{zIndex: 4000, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
    <div style={{position: 'relative', width: '90vw', height: '90vh', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
      <button 
        onMouseDown={(e) => { e.stopPropagation(); onClose(); }} 
        onClick={(e) => { e.stopPropagation(); onClose(); }} 
        className="close-btn-round" 
        style={{position: 'absolute', top: '15px', right: '15px', background: 'rgba(255,255,255,0.9)', zIndex: 4002, width: '40px', height: '40px', cursor: 'pointer'}}
      >
        <RiCloseLine size={24} color="#000" />
      </button>
      {isVideo ? (
        <video 
          controls 
          autoPlay 
          crossOrigin="anonymous"
          style={{width: '100%', height: '100%', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', backgroundColor: 'black'}} 
        >
          <source src={url} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      ) : (
        <img 
          src={url} 
          alt="Preview" 
          onMouseDown={(e) => { e.stopPropagation(); onClose(); }}
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          style={{width: '100%', height: '100%', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', backgroundColor: 'transparent', cursor: 'pointer'}} 
        />
      )}
    </div>
  </div>
);

const MediaModal = ({ rental, files, onClose, language, t, serverUrl }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="form-container-premium" style={{maxWidth: '800px', width: '90%'}} onClick={e => e.stopPropagation()}>
      <div className="form-header-premium">
        <h3>{t.car_condition_media}</h3>
        <p style={{margin: '0 15px', fontSize: '12px', color: '#6366f1'}}>{rental.brand} {rental.model} - {rental.customerName}</p>
        <button onClick={onClose} className="close-btn-round"><RiCloseLine /></button>
      </div>
      <div className="form-scrollable">
        {files.includes('signature.png') && (
          <div style={{ marginBottom: '25px', padding: '15px', background: '#f8fafc', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RiCheckLine /> {t.digital_customer_signature}
            </h4>
            <img 
              src={`${serverUrl}/files/rentals/${rental.id}/signature.png`} 
              alt="Signature" 
              style={{ height: '80px', background: 'white', borderRadius: '8px', padding: '5px' }} 
            />
          </div>
        )}
        {files.filter(f => f !== 'signature.png').length > 0 ? (
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px'}}>
            {files.filter(f => f !== 'signature.png').map((file, idx) => {
              const fileUrl = `${serverUrl}/files/rentals/${rental.id}/${file}`;
              const fileLower = file.toLowerCase();
              const isVideo = fileLower.endsWith('.mp4') || fileLower.endsWith('.mov') || fileLower.endsWith('.webm') || fileLower.endsWith('.3gp') || fileLower.endsWith('.m4v') || fileLower.endsWith('.avi');
              return (
                <div key={idx} 
                  style={{borderRadius: '12px', overflow: 'hidden', background: '#000', border: '1px solid #e2e8f0', height: '150px', position: 'relative', cursor: 'pointer'}}
                  onClick={() => {
                    if (window.electron && window.electron.openExternalMedia) {
                      window.electron.openExternalMedia(rental.id, file);
                    }
                  }}
                >
                  {isVideo ? (
                    <video src={fileUrl + '#t=0.001'} preload="metadata" muted playsInline style={{width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none'}} />
                  ) : (
                    <img src={fileUrl} alt="Condition" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                  )}
                  <div style={{position: 'absolute', bottom: '5px', left: '5px', background: 'rgba(0,0,0,0.5)', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '10px'}}>
                    {isVideo ? 'VIDEO' : 'IMAGE'}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{textAlign: 'center', padding: '40px', color: '#64748b'}}>
            <RiImageLine style={{fontSize: '48px', opacity: 0.3}} />
            <p>{t.no_photos_or_videos_for_this_c}</p>
          </div>
        )}
      </div>
      <div className="form-footer-premium">
        <button className="btn-save-premium" onClick={onClose}>{t.confirm}</button>
      </div>
    </div>
  </div>
);

const QRModal = ({ dataUrl, onClose, language, t }) => (
  <div className="modal-overlay">
    <div className="detail-modal-compact" style={{textAlign: 'center', padding: '30px'}}>
      <div className="modal-header-premium">
        <h3>{t.car_inspection}</h3>
        <button onClick={onClose} className="close-btn-round"><RiCloseLine /></button>
      </div>
      <div style={{marginTop: '20px'}}>
        <p>{t.scan_to_inspect_car_with_phone}</p>
        <img src={dataUrl} alt="QR Code" style={{width: '200px', height: '200px', margin: '20px 0'}} />
        <div style={{background: '#f0f4ff', padding: '15px', borderRadius: '12px', fontSize: '13px', color: '#6366f1'}}>
          {t.both_devices_must_be_on_the_sa}
        </div>
      </div>
      <button className="btn-save-premium" style={{width: '100%', marginTop: '20px'}} onClick={onClose}>{t.confirm}</button>
    </div>
  </div>
);

const RentalDetailModal = ({ rental, onClose, language, t }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="detail-modal-compact" onClick={e => e.stopPropagation()}>
      <div className="modal-header-premium">
        <RiLockLine className="lock-icon" />
        <h3>{t.rental_contract_details}</h3>
        <button onClick={onClose} className="close-btn-round"><RiCloseLine /></button>
      </div>
      <div className="modal-body-premium">
        <div className="car-header-flex">
          <div className="car-visual"><RiCalendarLine /></div>
          <div className="car-title-info">
            <h4>{rental.customerName}</h4>
            <span className="plate-tag-premium" dir="ltr">{rental.brand} {rental.model}</span>
            <span className={`status-pill ${rental.status}`}>{rental.status === 'active' ? t.active : t.completed}</span>
          </div>
        </div>
        <div className="specs-grid">
          <div className="spec-item"><span>{t.start_date}</span><strong>{formatDate(rental.startDate)}</strong></div>
          <div className="spec-item"><span>{t.end_date}</span><strong>{rental.endDate ? formatDate(rental.endDate) : '--'}</strong></div>
          <div className="spec-item"><span>{t.total_price}</span><strong>{rental.totalPrice} DH</strong></div>
          <div className="spec-item"><span>{t.deposit}</span><strong>{rental.deposit} DH</strong></div>
        </div>
      </div>
    </div>
  </div>
);

const CustomerSelectorModal = ({ onClose, onSelect, language, t, customers, activeCustomerIds, customerSearchTerm, setCustomerSearchTerm }) => {

  const filteredCustomers = customers.filter(c => 
    !activeCustomerIds.includes(c.id) && (
      (c.name || '').toLowerCase().includes(customerSearchTerm.toLowerCase()) || 
      (c.cin || '').toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
      (c.phone || '').includes(customerSearchTerm)
    )
  );

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 5000 }}>
      <div className="form-container-premium" style={{ maxWidth: '600px', width: '90%' }} onClick={e => e.stopPropagation()}>
        <div className="form-header-premium">
          <h3>{t.select_customer}</h3>
          <button onClick={onClose} className="close-btn-round"><RiCloseLine /></button>
        </div>
        
        <div className="modal-search-sticky" style={{ padding: '20px', background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
          <div className="search-box-mini" style={{ width: '100%', maxWidth: 'none' }}>
            <RiSearchLine />
            <input 
              type="text" 
              placeholder={t.search_by_name_phone_or_cin} 
              value={customerSearchTerm}
              onChange={e => setCustomerSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="form-scrollable" style={{ maxHeight: '400px' }}>
          {filteredCustomers.length > 0 ? (
            <div className="selector-list-premium">
              {filteredCustomers.map(cust => (
                <div 
                  key={cust.id} 
                  className="selector-item-premium" 
                  onClick={() => { onSelect(cust.id); onClose(); }}
                >
                  <div className="selector-item-info">
                    <RiUserLine className="item-icon" />
                    <div>
                      <strong>{cust.name}</strong>
                      <div className="item-meta">
                        <span>CIN: {cust.cin}</span>
                        <span> | </span>
                        <span>{cust.phone}</span>
                      </div>
                    </div>
                  </div>
                  <button className="btn-select-mini">{t.select}</button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <RiUserLine style={{ fontSize: '48px', opacity: 0.3 }} />
              <p>{t.no_results_found}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const RentalsManagement = ({ language = 'ar' }) => {
  const t = translations[language] || translations.ar;
  const [rentals, setRentals] = useState([]);
  const [cars, setCars] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [endingRental, setEndingRental] = useState(null);
  const [selectedRental, setSelectedRental] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeData, setQrCodeData] = useState('');
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [selectedMediaRental, setSelectedMediaRental] = useState(null);
  const [serverUrl, setServerUrl] = useState('http://localhost:3001');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewIsVideo, setPreviewIsVideo] = useState(false);
  const [agencySettings, setAgencySettings] = useState({});
  const [printingRental, setPrintingRental] = useState(null);
  const [contractQrData, setContractQrData] = useState('');
  const [currentSecurityHash, setCurrentSecurityHash] = useState('');
  const [activeCustomerIds, setActiveCustomerIds] = useState([]);
   const [filters, setFilters] = useState({ status: '', searchTerm: '' });
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [additionalCustomers, setAdditionalCustomers] = useState([]);
  const [showAdditionalCustomerSelector, setShowAdditionalCustomerSelector] = useState(false);
  
  const [formData, setFormData] = useState({
    carId: '',
    customerId: '',
    startDate: getTodayLocalISODate(),
    endDate: '',
    totalPrice: 0,
    deposit: 0,
    depositMethod: 'Cash',
    initialCondition: t.good,
    startMileage: '',
    notes: ''
  });

  const [endFormData, setEndFormData] = useState({
    endDate: getTodayLocalISODate(),
    totalPrice: 0,
    mileage: ''
  });

  useEffect(() => {
    loadData();
    loadSettings();
    const fetchUrl = async () => {
      if (window.electron) {
        const url = await window.electron.getServerUrl();
        setServerUrl(url);
      }
    };
    fetchUrl();
  }, [language, filters]);

  const loadSettings = async () => {
    if (window.electron) {
      const res = await window.electron.getSettings();
      if (res.success) setAgencySettings(res.data || {});
    }
  };

  const loadData = async () => {
    try {
      if (window.electron) {
        const [rentalsRes, carsRes, customersRes, allActiveRentalsRes] = await Promise.all([
          window.electron.getRentals(filters),
          window.electron.getCars({ status: 'available' }),
          window.electron.getCustomers(),
          window.electron.getRentals({ status: 'active' })
        ]);

        // Auto-end overdue rentals (endDate is strictly in the past)
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const overdueRentals = (allActiveRentalsRes.data || []).filter(r => {
          if (!r.endDate) return false;
          const end = new Date(r.endDate);
          end.setHours(0, 0, 0, 0);
          return end < todayStart;
        });

        if (overdueRentals.length > 0) {
          for (const r of overdueRentals) {
            await window.electron.endRental(r.id, {
              endDate: r.endDate,
              totalPrice: r.totalPrice || 0,
              totalDays: r.totalDays || 1,
              mileage: ''
            });
          }
          // Reload fresh data after auto-ending
          const [r2, c2, cu2, a2] = await Promise.all([
            window.electron.getRentals(filters),
            window.electron.getCars({ status: 'available' }),
            window.electron.getCustomers(),
            window.electron.getRentals({ status: 'active' })
          ]);
          setRentals(r2.data || []);
          setCars(c2.data || []);
          setCustomers(cu2.data || []);
          setActiveCustomerIds((a2.data || []).map(r => r.customerId));
          return;
        }

        setRentals(rentalsRes.data || []);
        setCars(carsRes.data || []);
        setCustomers(customersRes.data || []);
        setActiveCustomerIds((allActiveRentalsRes.data || []).map(r => r.customerId));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const openMedia = async (rental, e) => {
    if (e) e.stopPropagation();
    if (window.electron) {
      const result = await window.electron.getRentalMedia(rental.id);
      if (result.success) {
        setMediaFiles(result.files);
        setSelectedMediaRental(rental);
        setShowMediaModal(true);
      }
    }
  };

  const openQR = async (rental, e) => {
    if (e) e.stopPropagation();
    try {
      if (window.electron) {
        const url = await window.electron.getServerUrl();
        const inspectionUrl = `${url}/inspect/${rental.id}`;
        const qrDataUrl = await QRCode.toDataURL(inspectionUrl);
        setQrCodeData(qrDataUrl);
        setShowQRModal(true);
      }
    } catch (error) {
      console.error('QR Error:', error);
      await showMessage(t.failed_to_generate_qr_code);
    }
  };

  const handleCreateRental = async (e) => {
    e.preventDefault();
    try {
      const diffDays = getRentalDaysBy24Hours(formData.startDate, formData.endDate);

      if (window.electron) {
        const payload = {
          ...formData,
          totalDays: diffDays,
          totalPrice: parseFloat(formData.totalPrice) || 0,
          deposit: parseFloat(formData.deposit) || 0,
          startMileage: parseFloat(formData.startMileage) || null,
          carId: parseInt(formData.carId),
          customerId: parseInt(formData.customerId),
          additionalCustomers: JSON.stringify(
            additionalCustomers.map(c => ({ name: c.name, cin: c.cin, phone: c.phone, licenseNumber: c.licenseNumber || '' }))
          )
        };

        const result = await window.electron.createRental(payload);
        if (result.success) {
          setShowForm(false);
          setAdditionalCustomers([]);
          setFormData({
            carId: '',
            customerId: '',
            startDate: getTodayLocalISODate(),
            endDate: '',
            totalPrice: 0,
            deposit: 0,
            depositMethod: 'Cash',
            initialCondition: t.good || 'جيد',
            startMileage: '',
            notes: ''
          });
          loadData();
          await showMessage(t.rental_contract_created_succes);
        } else {
          console.error('Create rental failed:', result.error);
          await showMessage((t.failed_to_create_contract) + (result.error || 'Unknown error'));
        }
      }
    } catch (error) {
      console.error(error);
      await showMessage('Error: ' + error.message);
    }
  };

  const calculateAutoPrice = (carId, startD, endD) => {
    // Kept for backwards compatibility if needed elsewhere, but mostly inlined now.
    if (!carId || !startD || !endD) return;
    const diffDays = getRentalDaysBy24Hours(startD, endD);
    const car = cars.find(c => c.id === parseInt(carId));
    if (car) {
      setFormData(prev => ({ ...prev, totalPrice: car.dailyPrice * diffDays }));
    }
  };

  const handleEndRental = async (e) => {
    e.preventDefault();
    try {
      if (window.electron) {
        const finalDiffDays = getRentalDaysBy24Hours(endingRental.startDate, endFormData.endDate);
        const result = await window.electron.endRental(endingRental.id, {
          ...endFormData,
          totalDays: finalDiffDays
        });
        if (result.success) {
          setShowEndModal(false);
          loadData();
          await showMessage(t.rental_ended_successfully);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handlePrint = async (rental, e) => {
    if (e) e.stopPropagation();
    
    // Generate structured offline text for QR code
    try {
      const sHash = Math.random().toString(36).substring(2, 10).toUpperCase();
      setCurrentSecurityHash(sHash);

      let additionalPersonsText = '';
      try {
        const addl = JSON.parse(rental.additionalCustomers || '[]');
        if (Array.isArray(addl) && addl.length > 0) {
          additionalPersonsText = `\nالمرافقون: ${addl
            .map(person => {
              const bits = [person.name].filter(Boolean);
              if (person.cin) bits.push(person.cin);
              return bits.join(' - ');
            })
            .join(' | ')}`;
        }
      } catch (parseError) {
        console.warn('Failed to parse additional customers for QR:', parseError);
      }
      
      const qrText = `عقد كراء رقم: ${rental.id.toString().padStart(6, '0')}
الوكالة: ${agencySettings.companyName || '---'}
المستأجر: ${rental.customerName} (CIN: ${rental.cin || '---'})
السيارة: ${rental.brand} ${rental.model} (${rental.plateNumber})
الفترة: من ${formatDateFR(rental.startDate)} إلى ${formatDateFR(rental.endDate)}
الرمز: ${sHash}${additionalPersonsText}`;
      
      const qrImage = await QRCode.toDataURL(qrText, { 
        margin: 1, 
        scale: 6,
        errorCorrectionLevel: 'L' // Low correction level creates the lowest density (larger blocks) for offline text
      });
      setContractQrData(qrImage);
    } catch (err) {
      console.error('QR Generation error:', err);
    }

    if (window.electron) {
      const mediaRes = await window.electron.getRentalMedia(rental.id);
      rental.hasSignature = mediaRes.success && mediaRes.files.includes('signature.png');
    }
    setPrintingRental(rental);
    setTimeout(async () => {
      if (window.electron && window.electron.printDocument && agencySettings.printerName) {
        await window.electron.printDocument({ silent: true, deviceName: agencySettings.printerName });
        setPrintingRental(null);
        setContractQrData('');
        setCurrentSecurityHash('');
      } else {
        window.print();
        setPrintingRental(null);
        setContractQrData('');
        setCurrentSecurityHash('');
      }
    }, 500);
  };

  const openEndModal = (rental, e) => {
    if (e) e.stopPropagation();
    setEndingRental(rental);
    setEndFormData({
      endDate: rental.endDate ? String(rental.endDate).split('T')[0] : getTodayLocalISODate(),
      totalPrice: rental.totalPrice || 0,
      mileage: ''
    });
    setShowEndModal(true);
  };

  const handleDeleteRental = async (id, e) => {
    e.stopPropagation();
    if (window.confirm(t.confirm_delete || 'Are you sure you want to delete this rental?')) {
      if (window.electron) {
        const result = await window.electron.deleteRental(id);
        if (result.success) {
          loadData();
          await showMessage(t.deleted_successfully || 'Deleted successfully');
        } else {
          await showMessage('Delete failed: ' + (result.error || 'Unknown error'));
        }
      }
    }
  };



  return (
    <div className="management-container-premium">
      <div className="management-header-compact">
          <div className="header-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2>{t.manage_rentals}</h2>
              {(() => {
                const expiringToday = rentals.filter(r => r.status === 'active' && getDaysUntilEnd(r) === 0);
                return expiringToday.length > 0 ? (
                  <span style={{
                    background: '#ef4444', color: 'white', borderRadius: '20px',
                    padding: '3px 12px', fontSize: '12px', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: '5px',
                    boxShadow: '0 0 0 3px rgba(239,68,68,0.2)'
                  }}>
                    <RiErrorWarningLine style={{ fontSize: '14px' }} />
                    {expiringToday.length} {t.expiring_today}
                  </span>
                ) : null;
              })()}
            </div>
            <p>{rentals.length} {t.registered_contracts}</p>
          </div>
        
        <div className="header-controls-flex">
          <div className="search-box-mini">
            <RiSearchLine />
            <input 
              type="text" 
              placeholder={t.search_customer_plate} 
              value={filters.searchTerm}
              onChange={e => setFilters({...filters, searchTerm: e.target.value})}
            />
          </div>
          
          <select 
            className="filter-select-mini"
            value={filters.status}
            onChange={e => setFilters({...filters, status: e.target.value})}
          >
            <option value="">{t.all_contracts}</option>
            <option value="active">{t.active}</option>
            <option value="completed">{t.completed}</option>
          </select>

          <button className="btn-add-premium" onClick={() => {
            setFormData({
              carId: '',
              customerId: '',
              startDate: getTodayLocalISODate(),
              endDate: '',
              totalPrice: 0,
              deposit: 0,
              depositMethod: 'Cash',
              initialCondition: t.good || 'جيد',
              startMileage: '',
              notes: ''
            });
            setAdditionalCustomers([]);
            setShowForm(true);
          }}>
            <RiAddLine /> {t.create_rental}
          </button>
        </div>
      </div>

      <div className="rentals-grid-premium">
        {rentals.map(rental => (
          <div
            key={rental.id}
            className={`rental-card-premium ${rental.status}`}
            style={getDaysUntilEnd(rental) === 0 ? { border: '2px solid #ef4444', boxShadow: '0 0 0 3px rgba(239,68,68,0.12)' } : {}}
            onClick={() => setSelectedRental(rental)}
          >
            {getDaysUntilEnd(rental) === 0 && (
              <div style={{
                background: 'linear-gradient(90deg, #ef4444, #dc2626)',
                color: 'white', padding: '6px 14px', fontSize: '12px',
                fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px',
                borderRadius: '12px 12px 0 0'
              }}>
                <RiErrorWarningLine style={{ fontSize: '14px' }} />
                {t.last_day_contract_must_be_clos}
              </div>
            )}
            <div className="rental-card-header">
              <div className="rental-car-chip">
                <RiCarLine />
                <span className="plate-number-box" dir="ltr">{rental.plateNumber}</span>
                <span className="car-name-mini">{rental.brand} {rental.model}</span>
              </div>
              <span className={`status-badge-premium ${rental.status}`}>
                {rental.status === 'active' ? t.active : t.completed}
              </span>
            </div>

            <div className="rental-card-body">
              <div className="rental-info-main">
                <RiUserLine className="user-avatar-icon" />
                <div className="user-details">
                  <h4>{rental.customerName}</h4>
                  <span>{rental.phone}</span>
                </div>
              </div>

              <div className="rental-stats-mini">
                <div className="stat-item">
                  <RiCalendarLine />
                  <div>
                    <label>{t.start_date}</label>
                    <p>{formatDate(rental.startDate)}</p>
                  </div>
                </div>
                <div className="stat-item">
                  <RiMoneyDollarCircleLine />
                  <div>
                    <label>{t.total_price}</label>
                    <p>{rental.totalPrice} DH</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rental-card-actions" onClick={e => e.stopPropagation()}>
              <div className="main-actions">
                {rental.status === 'active' && (
                  <button className="action-btn success" onClick={(e) => openEndModal(rental, e)} title={t.end_rental}>
                    <RiCheckLine /> {t.finish}
                  </button>
                )}
                <button className="action-btn warning" onClick={(e) => handlePrint(rental, e)} title={t.print_contract}>
                  <RiPrinterLine /> {t.print}
                </button>
                <button className="action-btn" style={{background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5'}} onClick={(e) => handleDeleteRental(rental.id, e)} title={t.delete || 'Delete'}>
                  <RiCloseLine /> {t.delete || 'Delete'}
                </button>
              </div>
              <div className="secondary-actions">
                <button className="icon-action-btn" onClick={(e) => openQR(rental, e)} title="Inspection QR"><RiQrCodeLine /></button>
                <button className="icon-action-btn" onClick={(e) => openMedia(rental, e)} title="Photos"><RiImageLine /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="modal-overlay">
          <form onSubmit={handleCreateRental} className="form-container-premium">
            <div className="form-header-premium">
              <h3>{t.create_rental}</h3>
              <button type="button" className="close-btn-round" onClick={() => {
                setShowForm(false);
                setAdditionalCustomers([]);
                setFormData({
                  carId: '',
                  customerId: '',
                  startDate: getTodayLocalISODate(),
                  endDate: '',
                  totalPrice: 0,
                  deposit: 0,
                  depositMethod: 'Cash',
                  initialCondition: t.good || 'جيد',
                  startMileage: '',
                  notes: ''
                });
              }}><RiCloseLine /></button>
            </div>
            <div className="form-scrollable">
              <div className="form-section-premium">
                <h4><RiCarLine /> {t.contract_details}</h4>
                <div className="grid-2-col">
                  <div className="input-box">
                    <label>{t.select_car}</label>
                    <select 
                      value={formData.carId} 
                      onChange={e => {
                        const cid = e.target.value;
                        setFormData(prev => {
                          const selectedCar = cars.find(c => c.id === parseInt(cid));
                          const newState = { ...prev, carId: cid, startMileage: selectedCar ? selectedCar.mileage : '' };
                          const diffDays = getRentalDaysBy24Hours(newState.startDate, newState.endDate);
                          if (selectedCar && newState.startDate && newState.endDate) {
                            newState.totalPrice = selectedCar.dailyPrice * diffDays;
                          }
                          return newState;
                        });
                      }} 
                      required
                    >
                      <option value="">{t.select_car}</option>
                      {cars.map(car => (
                        <option key={car.id} value={car.id}>{car.brand} {car.model} ({car.plateNumber})</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-box">
                    <label>{t.select_customer}</label>
                    <div className="select-with-action">
                      <select value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value})} required>
                        <option value="">{t.select_customer}</option>
                        {customers
                          .filter(cust => !activeCustomerIds.includes(cust.id))
                          .map(cust => (
                            <option key={cust.id} value={cust.id}>{cust.name} ({cust.cin})</option>
                          ))
                        }
                      </select>
                      <button 
                        type="button" 
                        className="btn-action-inline" 
                        onClick={() => { setCustomerSearchTerm(''); setShowCustomerSelector(true); }}
                        title={t.advanced_search}
                      >
                        <RiSearchLine />
                      </button>
                    </div>
                  </div>
                  <div className="input-box">
                    <label>{t.start_date}</label>
                    <input 
                      type="date" 
                      value={formData.startDate} 
                      onChange={e => {
                        const sd = e.target.value;
                        setFormData(prev => {
                          const newState = { ...prev, startDate: sd };
                          const diffDays = getRentalDaysBy24Hours(sd, newState.endDate);
                          if (newState.carId && newState.endDate) {
                            const car = cars.find(c => c.id === parseInt(newState.carId));
                            if (car) newState.totalPrice = car.dailyPrice * diffDays;
                          }
                          return newState;
                        });
                      }} 
                      placeholder={t.start_date}
                      required 
                    />
                  </div>
                  <div className="input-box">
                    <label>{t.end_date}</label>
                    <input 
                      type="date" 
                      value={formData.endDate} 
                      onChange={e => {
                        const ed = e.target.value;
                        setFormData(prev => {
                          const newState = { ...prev, endDate: ed };
                          const diffDays = getRentalDaysBy24Hours(newState.startDate, ed);
                          if (newState.carId && newState.startDate) {
                            const car = cars.find(c => c.id === parseInt(newState.carId));
                            if (car) newState.totalPrice = car.dailyPrice * diffDays;
                          }
                          return newState;
                        });
                      }} 
                      placeholder={t.end_date}
                      required 
                    />
                  </div>
                  <div className="input-box">
                    <label>{t.current_mileage}</label>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <input 
                        type="text" 
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={formData.startMileage} 
                        onChange={e => setFormData({...formData, startMileage: e.target.value.replace(/[^0-9.]/g, '')})} 
                        style={{flex: 1}} 
                        placeholder="0" 
                      />
                      <span style={{fontWeight: 'bold', color: '#6366f1'}}>KM</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Persons Section */}
              <div style={{ marginTop: '14px', padding: '14px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #c7d2fe' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: additionalCustomers.length > 0 ? '12px' : '0' }}>
                  <label style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <RiUserLine /> {t.additional_persons_optional}
                  </label>
                  <button
                    type="button"
                    className="btn-action-inline"
                    style={{ fontSize: '12px', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => { setCustomerSearchTerm(''); setShowAdditionalCustomerSelector(true); }}
                  >
                    <RiAddLine /> {t.add}
                  </button>
                </div>
                {additionalCustomers.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {additionalCustomers.map(c => (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#eef2ff', borderRadius: '20px', padding: '5px 12px', fontSize: '13px', color: '#4338ca', fontWeight: 600 }}>
                        <RiUserLine style={{ fontSize: '13px' }} />
                        <span>{c.name} <small style={{ color: '#94a3b8', fontWeight: 400 }}>({c.cin})</small></span>
                        <button type="button" onClick={() => setAdditionalCustomers(prev => prev.filter(p => p.id !== c.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0, fontSize: '16px', lineHeight: 1, display: 'flex' }}>
                          <RiCloseLine />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-section-premium">
                <h4><RiMoneyDollarCircleLine /> {t.financials_deposit}</h4>
                <div className="grid-2-col">
                  <div className="input-box">
                    <label>{t.total_price} (DH)</label>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      pattern="[0-9.]*"
                      value={formData.totalPrice} 
                      onChange={e => setFormData({...formData, totalPrice: e.target.value.replace(/[^0-9.]/g, '')})} 
                      placeholder="0.00"
                      required 
                    />
                    <small style={{fontSize: '10px', color: '#6366f1'}}>* {t.editable_for_discounts}</small>
                  </div>
                  <div className="input-box">
                    <label>{t.deposit_amount}</label>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      pattern="[0-9.]*"
                      value={formData.deposit} 
                      onChange={e => setFormData({...formData, deposit: e.target.value.replace(/[^0-9.]/g, '')})} 
                      placeholder="0.00"
                    />
                  </div>
                  <div className="input-box">
                    <label>{t.deposit_method}</label>
                    <select value={formData.depositMethod} onChange={e => setFormData({...formData, depositMethod: e.target.value})}>
                      <option value="Cash">{t.cash}</option>
                      <option value="Check">{t.check}</option>
                      <option value="Card">{t.card}</option>
                      <option value="Transfer">{t.transfer}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="form-footer-premium">
              <button type="submit" className="btn-save-premium">{t.save}</button>
            </div>
          </form>
        </div>
      )}

      {showEndModal && (
        <div className="modal-overlay">
          <form onSubmit={handleEndRental} className="form-container-premium" style={{maxWidth: '400px'}}>
            <div className="form-header-premium"><h3>{t.end_rental}</h3><button type="button" className="close-btn-premium" onClick={() => setShowEndModal(false)}><RiCloseLine /></button></div>
            <div className="form-scrollable">
              <div className="input-box"><label>{t.return_date}</label><input type="date" value={endFormData.endDate} onChange={e => setEndFormData({...endFormData, endDate: e.target.value})} required /></div>
              <div className="input-box" style={{marginTop: '15px'}}>
                <label>{t.current_mileage}</label>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <input type="text" inputMode="numeric" pattern="[0-9]*" value={endFormData.mileage} onChange={e => setEndFormData({...endFormData, mileage: e.target.value.replace(/[^0-9.]/g, '')})} style={{flex: 1}} placeholder="0" />
                  <span style={{fontWeight: 'bold', color: '#6366f1'}}>KM</span>
                </div>
              </div>
            </div>
            <div className="form-footer-premium"><button type="submit" className="btn-save-premium">{t.confirm}</button></div>
          </form>
        </div>
      )}

      {showQRModal && <QRModal dataUrl={qrCodeData} onClose={() => setShowQRModal(false)} language={language} t={t} />}
      {showMediaModal && <MediaModal rental={selectedMediaRental} files={mediaFiles} onClose={() => setShowMediaModal(false)} language={language} t={t} serverUrl={serverUrl} />}
      {selectedRental && <RentalDetailModal rental={selectedRental} onClose={() => setSelectedRental(null)} language={language} t={t} />}
      {showCustomerSelector && (
        <CustomerSelectorModal 
          onClose={() => setShowCustomerSelector(false)} 
          onSelect={(cid) => setFormData({ ...formData, customerId: cid })} 
          language={language}
          t={t}
          customers={customers}
          activeCustomerIds={activeCustomerIds}
          customerSearchTerm={customerSearchTerm}
          setCustomerSearchTerm={setCustomerSearchTerm}
        />
      )}

      {showAdditionalCustomerSelector && (
        <CustomerSelectorModal
          onClose={() => setShowAdditionalCustomerSelector(false)}
          onSelect={(cid) => {
            const cust = customers.find(c => c.id === cid);
            if (cust && !additionalCustomers.find(c => c.id === cid)) {
              setAdditionalCustomers(prev => [...prev, cust]);
            }
            setShowAdditionalCustomerSelector(false);
          }}
          language={language}
          t={t}
          customers={customers}
          activeCustomerIds={[parseInt(formData.customerId), ...additionalCustomers.map(c => c.id)].filter(Boolean)}
          customerSearchTerm={customerSearchTerm}
          setCustomerSearchTerm={setCustomerSearchTerm}
        />
      )}

      {printingRental && (
        <div className="print-only contract-print premium-certificate">
          <div className="contract-watermark">{agencySettings.companyName}</div>

          <div className="contract-header-compact">
            <div className="header-left">
              <div className="agency-logo-container">
                {agencySettings.logoPath ? (
                  <img src={`${serverUrl}/files/${agencySettings.logoPath}`} alt="Logo" className="print-logo" />
                ) : (
                  <div className="print-logo-placeholder">{agencySettings.companyName}</div>
                )}
              </div>
              <div className="agency-legal-mini">
                <p><strong>{agencySettings.companyName}</strong></p>
                <p>{agencySettings.companyAddress}</p>
                <div style={{ display: 'flex', gap: '10px', fontSize: '10px', fontWeight: 'bold', marginTop: '5px' }}>
                  {agencySettings.companyICE && <span>ICE: {agencySettings.companyICE}</span>}
                  {agencySettings.companyRC && <span>RC: {agencySettings.companyRC}</span>}
                </div>
              </div>
            </div>
            
            <div className="header-center">
              <h2>شهادة كراء سيارة</h2>
              <h3>CERTIFICAT DE LOCATION</h3>
              <div className="cert-ref">N°: {printingRental.id.toString().padStart(6, '0')}</div>
            </div>

            <div className="header-right">
              <div className="verification-qr-small">
                {contractQrData ? (
                  <img src={contractQrData} alt="QR" style={{ width: '100px', height: '100px' }} />
                ) : (
                  <RiQrCodeLine style={{ fontSize: '60px' }} />
                )}
                <span style={{ fontSize: '9px', marginTop: '4px', color: '#475569', fontWeight: 600 }}>معلومات العقد / INFO CONTRAT</span>
              </div>
            </div>
          </div>

          <div className="contract-grid-main">
            {/* Left Column: Customer & Vehicle */}
            <div className="grid-column">
              <div className="info-section">
                <div className="section-head"><RiUserLine /> المستأجر / LOCATAIRE</div>
                <div className="section-data">
                  <div className="data-row"><span>Nom:</span> <strong>{printingRental.customerName}</strong></div>
                  <div className="data-row"><span>CIN:</span> <strong>{printingRental.cin}</strong></div>
                  <div className="data-row"><span>Permis:</span> <strong>{printingRental.licenseNumber || '..........'}</strong></div>
                  <div className="data-row"><span>Tél:</span> <strong>{printingRental.phone}</strong></div>
                </div>
                {/* Additional Passengers */}
                {(() => {
                  let addl = [];
                  try { addl = JSON.parse(printingRental.additionalCustomers || '[]'); } catch(e) {}
                  if (!addl.length) return null;
                  return (
                    <div style={{ marginTop: '8px', borderTop: '1px dashed #cbd5e1', paddingTop: '8px' }}>
                      <div className="section-head" style={{ background: '#475569', marginBottom: '6px' }}>
                        <RiUserLine /> مرافقون / ACCOMPAGNANTS
                      </div>
                      <div className="section-data">
                        {addl.map((ac, i) => (
                          <div key={i} className="data-row">
                            <span>{i + 1}.</span>
                            <strong>{ac.name}</strong>
                            {ac.cin && <span style={{ marginRight: '8px', fontSize: '11px', color: '#64748b' }}> | CIN: {ac.cin}</span>}
                            {ac.phone && <span style={{ fontSize: '11px', color: '#64748b' }}> | {ac.phone}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="info-section">
                <div className="section-head"><RiCarLine /> المركبة / VÉHICULE</div>
                <div className="section-data">
                  <div className="data-row"><span>Marque:</span> <strong>{printingRental.brand} {printingRental.model}</strong></div>
                  <div className="data-row"><span>Matricule:</span> <strong className="plate-number-box" dir="ltr">{printingRental.plateNumber}</strong></div>
                  <div className="data-row"><span>Carburant:</span> <strong>{printingRental.fuelType || 'DIESEL'}</strong></div>
                  <div className="data-row"><span>KM Départ:</span> <strong>{printingRental.startMileage || '..........'} KM</strong></div>
                </div>
              </div>
            </div>

            {/* Right Column: Dates & Finance */}
            <div className="grid-column">
              <div className="info-section highlighted-section">
                <div className="section-head"><RiCalendarLine /> المواعيد / PLANNING</div>
                <div className="section-data">
                  <div className="data-row"><span>Départ:</span> <strong>{formatDate(printingRental.startDate)}</strong></div>
                  <div className="data-row"><span>Retour:</span> <strong>{formatDate(printingRental.endDate)}</strong></div>
                  <div className="data-row"><span>KM Retour:</span> <strong>.......... KM</strong></div>
                </div>
              </div>

              <div className="info-section highlighted-section">
                <div className="section-head" style={{ background: '#1e293b' }}><RiMoneyDollarCircleLine /> الخلاص / PAIEMENT</div>
                <div className="section-data">
                  <div className="data-row"><span>Total à Payer:</span> <strong>{printingRental.totalPrice} DH</strong></div>
                  <div className="data-row" style={{ marginTop: '8px', borderTop: '2px solid #000', paddingTop: '5px' }}>
                    <span>Solde Final:</span> <strong style={{ fontSize: '14px' }}>{printingRental.totalPrice} DH</strong>
                  </div>
                </div>
              </div>

              <div className="deposit-box-premium">
                <div className="deposit-title">الضمانة / LA CAUTION</div>
                <div className="deposit-content">
                  <div className="dep-item">
                    <span>Montant:</span>
                    <strong>{printingRental.deposit} DH</strong>
                  </div>
                  <div className="dep-item">
                    <span>Mode:</span>
                    <strong>{printingRental.depositMethod || 'Cash'}</strong>
                  </div>
                </div>
                <div className="deposit-note">تسترد هذه الضمانة عند إرجاع السيارة بنفس الحالة</div>
              </div>
            </div>
          </div>

          <div className="guide-strip">
            <div className="guide-cell"><RiShieldCheckLine /> <span>Assurance Tout Risque</span></div>
            <div className="guide-cell"><RiGasStationLine /> <span>Plein à Rendre</span></div>
            <div className="guide-cell"><RiErrorWarningLine /> <span>Assistance 24/7</span></div>
          </div>

          <div className="signatures-row-compact">
            <div className="sig-item">
              <p>خاتم الوكالة / Cachet</p>
              <div className="sig-display">
                {agencySettings.companyStamp && <img src={`${serverUrl}/files/${agencySettings.companyStamp}`} alt="Stamp" />}
              </div>
            </div>
            <div className="sig-item">
              <p>توقيع الزبون / Locataire</p>
              <div className="sig-display">
                {printingRental.hasSignature ? (
                  <img src={`${serverUrl}/files/rentals/${printingRental.id}/signature.png`} alt="Sig" />
                ) : (
                  <div className="sig-placeholder">................</div>
                )}
              </div>
            </div>
          </div>

          <div className="contract-bottom-bar">
            <span className="hash-code">SEC-ID: {currentSecurityHash}-{printingRental.id}</span>
            <span className="footer-contact">Tél Support: {agencySettings.companyPhone}</span>
            <span className="print-date">Fait le: {new Date().toLocaleDateString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RentalsManagement;
