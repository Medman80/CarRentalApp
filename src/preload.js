const { contextBridge, ipcRenderer } = require('electron');

// Expose safe IPC methods to renderer process
contextBridge.exposeInMainWorld('electron', {
  // Trial & Activation
  getAppStatus: () => ipcRenderer.invoke('get-app-status'),

  // Cars
  addCar: (data) => ipcRenderer.invoke('add-car', data),
  getCars: (filters) => ipcRenderer.invoke('get-cars', filters),
  updateCar: (data) => ipcRenderer.invoke('update-car', data),
  deleteCar: (id) => ipcRenderer.invoke('delete-car', id),

  // Customers
  addCustomer: (data) => ipcRenderer.invoke('add-customer', data),
  getCustomers: (filters) => ipcRenderer.invoke('get-customers', filters),
  updateCustomer: (data) => ipcRenderer.invoke('update-customer', data),
  deleteCustomer: (id) => ipcRenderer.invoke('delete-customer', id),

  // Rentals
  createRental: (data) => ipcRenderer.invoke('create-rental', data),
  getRentals: (filters) => ipcRenderer.invoke('get-rentals', filters),
  endRental: (id, data) => ipcRenderer.invoke('end-rental', id, data),
  deleteRental: (id) => ipcRenderer.invoke('delete-rental', id),

  // Payments
  recordPayment: (data) => ipcRenderer.invoke('record-payment', data),
  getPayments: (filters) => ipcRenderer.invoke('get-payments', filters),
  deletePayment: (id) => ipcRenderer.invoke('delete-payment', id),

  // Reports
  getDailyReport: (date) => ipcRenderer.invoke('get-daily-report', date),
  getIncomeReport: (startDate, endDate) => ipcRenderer.invoke('get-income-report', startDate, endDate),
  getCarPerformance: () => ipcRenderer.invoke('get-car-performance'),
  getDetailedFinancialReport: (startDate, endDate) => ipcRenderer.invoke('get-detailed-financial-report', startDate, endDate),

  // Expenses
  addExpense: (data) => ipcRenderer.invoke('add-expense', data),
  getExpenses: (filters) => ipcRenderer.invoke('get-expenses', filters),
  deleteExpense: (id) => ipcRenderer.invoke('delete-expense', id),

  // Maintenance
  addMaintenanceRecord: (data) => ipcRenderer.invoke('add-maintenance', data),
  getMaintenanceRecords: (carId) => ipcRenderer.invoke('get-maintenance', carId),
  deleteMaintenanceRecord: (id) => ipcRenderer.invoke('delete-maintenance', id),

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (data) => ipcRenderer.invoke('update-settings', data),

  // Backup
  createBackup: () => ipcRenderer.invoke('create-backup'),
  restoreBackup: (path) => ipcRenderer.invoke('restore-backup', path),
  getBackups: () => ipcRenderer.invoke('get-backups'),

  // Window Controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  getServerUrl: () => ipcRenderer.invoke('get-server-url'),
  getRentalMedia: (rentalId) => ipcRenderer.invoke('get-rental-media', rentalId),
  openExternalMedia: (rentalId, filename) => ipcRenderer.invoke('open-external-media', rentalId, filename),
  pickAndSaveImage: () => ipcRenderer.invoke('pick-and-save-image'),
  saveFile: (content, defaultName) => ipcRenderer.invoke('save-file', content, defaultName),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  showMessage: (options) => ipcRenderer.invoke('show-message', options),
  showConfirm: (options) => ipcRenderer.invoke('show-confirm', options),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  printDocument: (options) => ipcRenderer.invoke('print-document', options)
});
