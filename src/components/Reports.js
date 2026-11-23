import React, { useState } from 'react';
import {
  RiPieChartLine,
  RiSearchLine,
  RiFileList3Line,
  RiBillLine,
  RiToolsLine,
  RiCarLine,
  RiArrowRightUpLine,
  RiArrowLeftDownLine
} from 'react-icons/ri';
import translations from '../translations';
import './Management.css';
import { showMessage } from '../utils/dialogs';

const Reports = ({ language = 'ar' }) => {
  const t = translations[language] || translations.ar;
  const [reportData, setReportData] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  const loadReport = async () => {
    if (!startDate || !endDate) {
      await showMessage(t.please_select_date_range);
      return;
    }

    try {
      setLoading(true);
      if (window.electron) {
        const result = await window.electron.getDetailedFinancialReport(startDate, endDate);
        if (result.success) {
          setReportData(result.data);
        } else {
          await showMessage(`${t.fetch_failed}: ${result.error}`);
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading report:', error);
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    if (!reportData) return { income: 0, maintenance: 0, general: 0, totalExpenses: 0, net: 0 };

    const income = reportData.totalIncome[0]?.total || 0;
    const maintenance = reportData.totalMaintenance[0]?.total || 0;
    const general = reportData.totalGeneralExpenses[0]?.total || 0;
    const totalExpenses = maintenance + general;
    const net = income - totalExpenses;

    return { income, maintenance, general, totalExpenses, net };
  };

  const totals = calculateTotals();

  const formatCurrency = (value) => `${Number(value || 0).toLocaleString()} DH`;

  const getCategoryLabel = (category) => {
    const labels = {
      oil: t.oil_change,
      repair: t.repair,
      parts: t.parts,
      tires: t.tires,
      other: t.other
    };
    return labels[category] || category || (t.uncategorized);
  };

  const escapeExcel = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const exportToExcel = async () => {
    if (!reportData) return;

    const direction = t.ltr;
    const reportTitle = t.profit_and_expenses_report;
    const rows = {
      summary: [
        [t.total_collected_income, totals.income, t.paid_payments],
        [t.maintenance_expenses, totals.maintenance, t.maintenance_records_in_the_per],
        [t.general_expenses, totals.general, t.expenses_recorded_in_expenses_],
        [t.total_expenses, totals.totalExpenses, t.maintenance_general_expenses],
        [t.net_profit, totals.net, t.total_income_total_expenses]
      ],
      generalExpenses: reportData.expensesByCategory || [],
      maintenanceExpenses: reportData.maintenanceByType || [],
      cars: reportData.carPerformance || []
    };

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Arial, sans-serif; direction: ${direction}; color: #1f2937; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 26px; }
    th, td { border: 1px solid #d1d5db; padding: 10px; text-align: ${t.left}; vertical-align: top; }
    .title { background: #1e3a8a; color: #ffffff; font-size: 22px; font-weight: 800; text-align: center; }
    .subtitle { background: #dbeafe; color: #1e3a8a; font-weight: 700; text-align: center; }
    .section { background: #eef2ff; color: #3730a3; font-size: 16px; font-weight: 800; }
    .head { background: #f8fafc; font-weight: 800; color: #475569; }
    .income { background: #ecfdf5; color: #047857; font-weight: 800; }
    .expense { background: #fef2f2; color: #b91c1c; font-weight: 800; }
    .profit { background: ${totals.net >= 0 ? '#dcfce7' : '#fee2e2'}; color: ${totals.net >= 0 ? '#166534' : '#991b1b'}; font-weight: 900; }
    .note { background: #fff7ed; color: #9a3412; font-size: 12px; line-height: 1.6; }
    .spacer td { border: none; height: 14px; background: #ffffff; }
  </style>
</head>
<body>
  <table>
    <tr><td colspan="4" class="title">${escapeExcel(reportTitle)}</td></tr>
    <tr><td colspan="4" class="subtitle">${escapeExcel(startDate)} ${t.to} ${escapeExcel(endDate)}</td></tr>
    <tr class="spacer"><td colspan="4"></td></tr>
    <tr><td colspan="4" class="note">${escapeExcel(t.this_file_consolidates_recorde)}</td></tr>
    <tr class="spacer"><td colspan="4"></td></tr>

    <tr><td colspan="4" class="section">${escapeExcel(t.summary_1)}</td></tr>
    <tr class="head"><th>${escapeExcel(t.item)}</th><th>${escapeExcel(t.amount)}</th><th colspan="2">${escapeExcel(t.explanation)}</th></tr>
    ${rows.summary.map(([label, amount, note], index) => `
      <tr>
        <td>${escapeExcel(label)}</td>
        <td class="${index === 0 ? 'income' : index === 4 ? 'profit' : 'expense'}">${escapeExcel(formatCurrency(amount))}</td>
        <td colspan="2">${escapeExcel(note)}</td>
      </tr>`).join('')}
    <tr class="spacer"><td colspan="4"></td></tr>

    <tr><td colspan="4" class="section">${escapeExcel(t.general_expenses_breakdown_2)}</td></tr>
    <tr class="head"><th>${escapeExcel(t.category)}</th><th>${escapeExcel(t.amount)}</th><th colspan="2">${escapeExcel(t.note)}</th></tr>
    ${rows.generalExpenses.length ? rows.generalExpenses.map(item => `
      <tr><td>${escapeExcel(getCategoryLabel(item.category))}</td><td class="expense">${escapeExcel(formatCurrency(item.total))}</td><td colspan="2">${escapeExcel(t.general_expense_recorded_in_th)}</td></tr>`).join('') : `
      <tr><td colspan="4">${escapeExcel(t.no_general_expenses_in_this_pe)}</td></tr>`}
    <tr class="spacer"><td colspan="4"></td></tr>

    <tr><td colspan="4" class="section">${escapeExcel(t.maintenance_expenses_breakdo_3)}</td></tr>
    <tr class="head"><th>${escapeExcel(t.maintenance_type)}</th><th>${escapeExcel(t.amount)}</th><th colspan="2">${escapeExcel(t.note)}</th></tr>
    ${rows.maintenanceExpenses.length ? rows.maintenanceExpenses.map(item => `
      <tr><td>${escapeExcel(getCategoryLabel(item.category))}</td><td class="expense">${escapeExcel(formatCurrency(item.total))}</td><td colspan="2">${escapeExcel(t.vehicle_maintenance_expense)}</td></tr>`).join('') : `
      <tr><td colspan="4">${escapeExcel(t.no_maintenance_expenses_in_thi)}</td></tr>`}
    <tr class="spacer"><td colspan="4"></td></tr>

    <tr><td colspan="4" class="section">${escapeExcel(t.car_performance_4)}</td></tr>
    <tr class="head"><th>${escapeExcel(t.car)}</th><th>${escapeExcel(t.income)}</th><th>${escapeExcel(t.maintenance)}</th><th>${escapeExcel(t.result)}</th></tr>
    ${rows.cars.length ? rows.cars.map(car => {
        const result = Number(car.revenue || 0) - Number(car.maintenance || 0);
        return `<tr>
        <td dir="ltr">${escapeExcel(`${car.brand || ''} ${car.model || ''} (${car.plateNumber || ''})`)}</td>
        <td class="income">${escapeExcel(formatCurrency(car.revenue))}</td>
        <td class="expense">${escapeExcel(formatCurrency(car.maintenance))}</td>
        <td class="${result >= 0 ? 'income' : 'expense'}">${escapeExcel(formatCurrency(result))}</td>
      </tr>`;
      }).join('') : `
      <tr><td colspan="4">${escapeExcel(t.no_car_activity_in_this_period)}</td></tr>`}
  </table>
</body>
</html>`;

    const result = await window.electron.saveFile(html, `profit_report_${startDate}_to_${endDate}.xls`);
    if (result.success) {
      await showMessage(t.excel_report_exported_successf);
    }
  };

  return (
    <div className="management-container">
      <div className="management-header">
        <h2><RiPieChartLine /> {t.financial_reports}</h2>
        <div style={{ display: reportData ? 'flex' : 'none', gap: '10px' }}>
          <button className="btn-primary" onClick={exportToExcel} style={{ background: '#059669' }}>
            <RiFileList3Line /> {t.export_excel}
          </button>
          <button className="btn-primary" onClick={() => window.print()}>
            {t.print_report}
          </button>
        </div>
      </div>

      <div className="form-container modern-form" style={{ marginBottom: '30px' }}>
        <div className="form-section">
          <h3><RiSearchLine /> {t.filter_date}</h3>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr auto', alignItems: 'end' }}>
            <div className="form-group">
              <label>{t.from}</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t.to}</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <button className="btn-primary" onClick={loadReport} disabled={loading} style={{ height: '45px' }}>
              {loading ? (t.loading) : <><RiSearchLine /> {t.generate_report}</>}
            </button>
          </div>
        </div>
      </div>

      {reportData && (
        <>
          <div className="stats-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div className="stat-card stat-emerald" style={{ padding: '20px' }}>
              <div className="stat-content">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><RiArrowRightUpLine /> {t.total_income}</h3>
                <p className="stat-value">{totals.income.toLocaleString()} DH</p>
                <span style={{ fontSize: '11px', opacity: 0.8 }}>{t.collected_payments}</span>
              </div>
            </div>
            <div className="stat-card stat-rose" style={{ padding: '20px' }}>
              <div className="stat-content">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><RiArrowLeftDownLine /> {t.total_expenses}</h3>
                <p className="stat-value">{totals.totalExpenses.toLocaleString()} DH</p>
                <span style={{ fontSize: '11px', opacity: 0.8 }}>{totals.maintenance.toLocaleString()} {t.maint} + {totals.general.toLocaleString()} {t.gen}</span>
              </div>
            </div>
            <div className="stat-card" style={{ padding: '20px', background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', color: 'white' }}>
              <div className="stat-content">
                <h3 style={{ color: 'rgba(255,255,255,0.9)' }}>{t.net_profit}</h3>
                <p className="stat-value" style={{ color: 'white' }}>{totals.net.toLocaleString()} DH</p>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>{t.income_minus_recorded_expenses}</span>
              </div>
            </div>
          </div>

          <div className="dashboard-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
            <div className="table-container">
              <div className="section-header" style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}><RiToolsLine /> {t.expenses_breakdown}</h3>
              </div>
              <table style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>{t.category}</th>
                    <th>{t.amount}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...reportData.expensesByCategory, ...reportData.maintenanceByType].map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.category || (t.uncategorized)}</td>
                      <td style={{ fontWeight: '700' }}>{item.total.toLocaleString()} DH</td>
                    </tr>
                  ))}
                  {reportData.expensesByCategory.length === 0 && reportData.maintenanceByType.length === 0 && (
                    <tr><td colSpan="2" style={{ textAlign: 'center', padding: '20px' }}>{t.no_expenses}</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="table-container">
              <div className="section-header" style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}><RiCarLine /> {t.car_performance}</h3>
              </div>
              <table style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>{t.brand}</th>
                    <th>{t.income}</th>
                    <th>{t.maint}</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.carPerformance.map((car, idx) => (
                    <tr key={idx}>
                      <td>
                        <div style={{ fontWeight: '600' }}>{car.brand}</div>
                        <div dir="ltr" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{car.plateNumber}</div>
                      </td>
                      <td style={{ color: 'var(--success)', fontWeight: '700' }}>{car.revenue.toLocaleString()}</td>
                      <td style={{ color: 'var(--danger)', fontWeight: '600' }}>{car.maintenance.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!reportData && !loading && (
        <div style={{ textAlign: 'center', padding: '100px 20px', background: 'white', borderRadius: '20px', border: '1px dashed #cbd5e1' }}>
          <RiBillLine style={{ fontSize: '60px', color: '#cbd5e1', marginBottom: '20px' }} />
          <h3 style={{ color: '#64748b' }}>
            {t.select_dates_and_click_generat}
          </h3>
        </div>
      )}
    </div>
  );
};

export default Reports;
