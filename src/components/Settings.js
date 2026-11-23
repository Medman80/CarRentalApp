import React, { useState, useEffect } from 'react';
import { 
  RiSettings4Line, 
  RiHistoryLine, 
  RiDownloadCloudLine, 
  RiBuilding4Line, 
  RiMoneyDollarCircleLine, 
  RiPercentLine, 
  RiSaveLine, 
  RiTranslate2, 
  RiCheckLine, 
  RiPrinterLine,
  RiDatabaseLine,
  RiGlobalLine,
  RiArrowRightSLine,
  RiArrowLeftSLine,
  RiTimeLine
} from 'react-icons/ri';
import translations from '../translations';
import './Management.css';
import { showMessage } from '../utils/dialogs';

const Settings = ({ language = 'ar', onLanguageChange, appStatus }) => {
  const t = translations[language] || translations.ar;
  const [activeTab, setActiveTab] = useState('agency');
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    companyICE: '',
    companyRC: '',
    currency: 'درهم',
    taxRate: 0,
    logoPath: '',
    logoPath: '',
    companyStamp: '',
    printerName: ''
  });
  const [printers, setPrinters] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [backupsRes, settingsRes] = await Promise.all([
        window.electron.getBackups(),
        window.electron.getSettings()
      ]);
      if (backupsRes.success) setBackups(backupsRes.data || []);
      if (settingsRes.success) setSettings(settingsRes.data || {});
      
      if (window.electron.getPrinters) {
        const printersList = await window.electron.getPrinters();
        setPrinters(printersList);
      }
    } catch (error) {
      console.error('Error loading settings data:', error);
    }
  };



  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    try {
      const result = await window.electron.updateSettings(settings);
      if (result.success) {
        await showMessage(t.settings_saved_successfully);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleCreateBackup = async () => {
    setLoading(true);
    try {
      const result = await window.electron.createBackup();
      if (result.success) {
        await showMessage(t.backup_created_successfully);
        loadData();
      }
    } catch (error) {
      await showMessage(t.backup_failed);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { id: 'agency', label: t.agency_info, icon: RiBuilding4Line },
    { id: 'financial', label: t.finance_print, icon: RiMoneyDollarCircleLine },
    { id: 'language', label: t.language_system, icon: RiGlobalLine },
    // { id: 'backup', label: t.backup, icon: RiDatabaseLine },
  ];

  const openWhatsApp = () => {
    const phone = "212600000000"; // Replace with actual support number if needed
    const message = encodeURIComponent(t.whatsapp_msg);
    window.electron.openExternal(`https://wa.me/${phone}?text=${message}`);
  };

  return (
    <div className="management-container-premium">
      <div className="management-header-compact">
        <div className="header-title">
          <h2><RiSettings4Line /> {t.system_settings}</h2>
          <p>{t.manage_system_preferences_and_}</p>
        </div>
      </div>

      <div className="settings-layout-premium">
        {/* Settings Sidebar */}
        <div className="settings-sidebar-premium">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`sidebar-item-premium ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <div className="item-icon-box">
                <item.icon />
              </div>
              <div className="item-text">
                <span>{item.label}</span>
              </div>
              {language === 'ar' ? <RiArrowLeftSLine className="arrow" /> : <RiArrowRightSLine className="arrow" />}
            </button>
          ))}
        </div>

        {/* Settings Content Area */}
        <div className="settings-content-premium">
          <div className="content-card-premium">
            {activeTab === 'agency' && (
              <div className="settings-section-animate">
                <div className="section-title">
                  <RiBuilding4Line />
                  <h3>{t.agency_info}</h3>
                </div>
                <div className="form-grid-premium">
                  <div className="input-box-premium full-width">
                    <label>{t.company_name}</label>
                    <input
                      type="text"
                      value={settings.companyName || ''}
                      onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                      placeholder={t.car_rental_agency_name}
                    />
                  </div>
                  <div className="input-box-premium">
                    <label>{t.phone}</label>
                    <input
                      type="text"
                      value={settings.companyPhone || ''}
                      onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })}
                    />
                  </div>
                  <div className="input-box-premium">
                    <label>{t.email}</label>
                    <input
                      type="email"
                      value={settings.companyEmail || ''}
                      onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
                    />
                  </div>
                  <div className="input-box-premium">
                    <label>ICE (Identifiant Commun de l'Entreprise)</label>
                    <input
                      type="text"
                      value={settings.companyICE || ''}
                      onChange={(e) => setSettings({ ...settings, companyICE: e.target.value })}
                      placeholder="000000000000000"
                    />
                  </div>
                  <div className="input-box-premium">
                    <label>RC (Registre du Commerce)</label>
                    <input
                      type="text"
                      value={settings.companyRC || ''}
                      onChange={(e) => setSettings({ ...settings, companyRC: e.target.value })}
                      placeholder="000000"
                    />
                  </div>
                  <div className="input-box-premium full-width">
                    <label>{t.address}</label>
                    <textarea
                      value={settings.companyAddress || ''}
                      onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
                      rows="3"
                    />
                  </div>
                  
                  {/* Agency Logo Upload */}
                  <div className="input-box-premium full-width">
                    <label>{t.agency_logo}</label>
                    <div className="upload-preview-premium">
                      <div className="preview-box-premium">
                        {settings.logoPath ? (
                          <img src={`http://localhost:3001/files/${settings.logoPath}`} alt="Logo" />
                        ) : (
                          <div className="placeholder">{t.no_logo}</div>
                        )}
                      </div>
                      <button 
                        className="btn-upload-premium"
                        onClick={async () => {
                          if (window.electron) {
                            const res = await window.electron.pickAndSaveImage();
                            if (res.success) setSettings({ ...settings, logoPath: res.path });
                          }
                        }}
                      >
                        {t.upload_logo}
                      </button>
                    </div>
                  </div>

                  {/* Agency Stamp Upload */}
                  <div className="input-box-premium full-width">
                    <label>{t.agency_stamp_manager_signature}</label>
                    <div className="upload-preview-premium">
                      <div className="preview-box-premium">
                        {settings.companyStamp ? (
                          <img src={`http://localhost:3001/files/${settings.companyStamp}`} alt="Stamp" />
                        ) : (
                          <div className="placeholder">{t.no_stamp}</div>
                        )}
                      </div>
                      <button 
                        className="btn-upload-premium"
                        onClick={async () => {
                          if (window.electron) {
                            const res = await window.electron.pickAndSaveImage();
                            if (res.success) setSettings({ ...settings, companyStamp: res.path });
                          }
                        }}
                      >
                        {t.upload_stamp}
                      </button>
                    </div>
                  </div>
                </div>
                <button className="btn-save-premium" onClick={handleSaveSettings}>
                  <RiSaveLine /> {t.save_changes}
                </button>
              </div>
            )}

            {activeTab === 'financial' && (
              <div className="settings-section-animate">
                <div className="section-title">
                  <RiMoneyDollarCircleLine />
                  <h3>{t.financial_settings}</h3>
                </div>
                <div className="form-grid-premium">
                  <div className="input-box-premium">
                    <label>{t.currency}</label>
                    <input
                      type="text"
                      value={settings.currency || ''}
                      onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                    />
                  </div>
                  <div className="input-box-premium">
                    <label>{t.tax_rate} (%)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9.]*"
                      value={settings.taxRate || 0}
                      onChange={(e) => setSettings({ ...settings, taxRate: e.target.value.replace(/[^0-9.]/g, '') })}
                    />
                  </div>
                  <div className="input-box-premium full-width">
                    <label><RiPrinterLine /> {t.default_printer_name}</label>
                    <select
                      value={settings.printerName || ''}
                      onChange={(e) => setSettings({ ...settings, printerName: e.target.value })}
                    >
                      <option value="">{t.system_default}</option>
                      {printers.map(p => (
                        <option key={p.name} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button className="btn-save-premium" onClick={handleSaveSettings}>
                  <RiSaveLine /> {t.save_changes}
                </button>
              </div>
            )}

            {activeTab === 'language' && (
              <div className="settings-section-animate">
                <div className="section-title">
                  <RiTranslate2 />
                  <h3>{t.system_language}</h3>
                </div>
                <div className="language-selector-premium">
                  {[
                    { id: 'ar', name: 'العربية', flag: '🇲🇦' },
                    { id: 'fr', name: 'Français', flag: '🇫🇷' },
                    { id: 'en', name: 'English', flag: '🇺🇸' }
                  ].map((lang) => (
                    <button 
                      key={lang.id}
                      className={`lang-card-premium ${language === lang.id ? 'active' : ''}`}
                      onClick={() => onLanguageChange(lang.id)}
                    >
                      <span className="flag">{lang.flag}</span>
                      <span className="name">{lang.name}</span>
                      {language === lang.id && <RiCheckLine className="check" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 
            {activeTab === 'backup' && (
              <div className="settings-section-animate">
                <div className="section-title">
                  <RiDatabaseLine />
                  <h3>{t.backup}</h3>
                </div>
                <div className="backup-action-card">
                  <div className="backup-info">
                    <p>{t.protecting_your_data_is_our_pr}</p>
                    <button 
                      className="btn-backup-now" 
                      onClick={handleCreateBackup}
                      disabled={loading}
                    >
                      <RiDownloadCloudLine /> {loading ? (t.processing) : t.create_backup}
                    </button>
                  </div>
                </div>

                <div className="backup-history">
                  <h4><RiHistoryLine /> {t.backup_history}</h4>
                  <div className="backup-list-premium">
                    {backups.map((backup, idx) => (
                      <div key={idx} className="backup-item-premium">
                        <div className="backup-icon"><RiCheckLine /></div>
                        <div className="backup-details">
                          <span className="filename">{backup.filename || backup.name}</span>
                          <span className="status-label">{t.completed}</span>
                        </div>
                      </div>
                    ))}
                    {backups.length === 0 && (
                      <div className="empty-state">{t.no_backups_found}</div>
                    )}
                  </div>
                </div>
              </div>
            )}
            */}


          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .settings-layout-premium {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 30px;
          margin-top: 20px;
          height: calc(100vh - 180px);
        }

        .settings-sidebar-premium {
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: white;
          padding: 15px;
          border-radius: 24px;
          box-shadow: var(--shadow-sm);
          border: 1px solid #f1f5f9;
        }

        .sidebar-item-premium {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 12px 15px;
          border-radius: 16px;
          border: none;
          background: transparent;
          cursor: pointer;
          transition: all 0.2s;
          color: var(--text-secondary);
          text-align: right;
        }

        .sidebar-item-premium:hover {
          background: #f8fafc;
          color: var(--primary-color);
        }

        .sidebar-item-premium.active {
          background: #eef2ff;
          color: var(--primary-color);
        }

        .item-icon-box {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
          font-size: 20px;
        }

        .sidebar-item-premium.active .item-icon-box {
          background: white;
          box-shadow: 0 4px 10px rgba(99, 102, 241, 0.2);
        }

        .item-text {
          flex: 1;
          font-weight: 700;
          font-size: 14px;
        }

        .settings-content-premium {
          height: 100%;
          overflow: hidden;
        }

        .content-card-premium {
          background: white;
          padding: 35px;
          border-radius: 24px;
          box-shadow: var(--shadow-sm);
          border: 1px solid #f1f5f9;
          height: 100%;
          overflow-y: auto;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 30px;
          color: var(--text-primary);
        }

        .section-title svg {
          font-size: 28px;
          color: var(--primary-color);
        }

        .section-title h3 {
          margin: 0;
          font-size: 22px;
          font-weight: 800;
        }

        .form-grid-premium {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .input-box-premium {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .input-box-premium.full-width {
          grid-column: span 2;
        }

        .input-box-premium label {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-secondary);
        }

        .input-box-premium input, .input-box-premium textarea {
          padding: 12px 15px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .input-box-premium input:focus {
          border-color: var(--primary-color);
          background: white;
          outline: none;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }

        .btn-save-premium {
          margin-top: 30px;
          background: var(--primary-color);
          color: white;
          border: none;
          padding: 14px 25px;
          border-radius: 14px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-save-premium:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
        }

        .language-selector-premium {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
        }

        .lang-card-premium {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 20px;
          border-radius: 18px;
          border: 2px solid #f1f5f9;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }

        .lang-card-premium:hover {
          border-color: var(--primary-color);
          background: #f8fafc;
        }

        .lang-card-premium.active {
          border-color: var(--primary-color);
          background: #eef2ff;
        }

        .lang-card-premium .flag {
          font-size: 32px;
        }

        .lang-card-premium .name {
          font-weight: 800;
          color: var(--text-primary);
        }

        .lang-card-premium .check {
          position: absolute;
          top: 10px;
          right: 10px;
          color: var(--primary-color);
          font-size: 20px;
        }

        .backup-action-card {
          background: #f8fafc;
          padding: 25px;
          border-radius: 20px;
          margin-bottom: 30px;
        }

        .btn-backup-now {
          margin-top: 15px;
          background: #059669;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 12px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .backup-list-premium {
          margin-top: 15px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .backup-item-premium {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 12px 15px;
          border-radius: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }

        .backup-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #ecfdf5;
          color: #10b981;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }

        .backup-details {
          display: flex;
          flex-direction: column;
        }

        .backup-details .filename {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .backup-details .status-label {
          font-size: 11px;
          color: #10b981;
          font-weight: 700;
        }



        .settings-section-animate {
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
};

export default Settings;
