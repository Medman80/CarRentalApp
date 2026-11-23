const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, async (err) => {
        if (err) {
          reject(err);
        } else {
          try {
            await this.createTables();
            resolve();
          } catch (error) {
            reject(error);
          }
        }
      });
    });
  }

  async createTables() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Cars table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS cars (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            brand TEXT NOT NULL,
            model TEXT NOT NULL,
            plateNumber TEXT UNIQUE NOT NULL,
            dailyPrice REAL NOT NULL,
            insuranceExpiry DATE,
            taxExpiry DATE,
            lastOilChange REAL,
            nextOilChange REAL,
            techControlExpiry DATE,
            mileage REAL DEFAULT 0,
            legalNotes TEXT,
            status TEXT DEFAULT 'available',
            image TEXT,
            fuelType TEXT DEFAULT 'Diesel',
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Customers table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            cin TEXT UNIQUE NOT NULL,
            licenseNumber TEXT,
            email TEXT,
            address TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Rentals table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS rentals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            carId INTEGER NOT NULL,
            customerId INTEGER NOT NULL,
            startDate DATETIME NOT NULL,
            endDate DATETIME,
            totalDays INTEGER,
            totalPrice REAL,
            deposit REAL DEFAULT 0,
            depositMethod TEXT DEFAULT 'Cash',
            initialCondition TEXT,
            notes TEXT,
            additionalCustomers TEXT,
            status TEXT DEFAULT 'active',
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (carId) REFERENCES cars(id),
            FOREIGN KEY (customerId) REFERENCES customers(id)
          )
        `);

        // Expenses table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            amount REAL NOT NULL,
            category TEXT,
            date DATE DEFAULT CURRENT_DATE,
            notes TEXT,
            carId INTEGER,
            docType TEXT,
            newExpiryDate DATE,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Maintenance records table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS maintenance_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            carId INTEGER NOT NULL,
            type TEXT NOT NULL,
            description TEXT,
            cost REAL NOT NULL,
            date DATE DEFAULT CURRENT_DATE,
            nextServiceMileage REAL,
            FOREIGN KEY (carId) REFERENCES cars(id)
          )
        `);

        // Settings table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY DEFAULT 1,
            companyName TEXT,
            companyAddress TEXT,
            companyPhone TEXT,
            companyEmail TEXT,
            companyICE TEXT,
            companyRC TEXT,
            currency TEXT DEFAULT 'درهم',
            taxRate REAL DEFAULT 0,
            logoPath TEXT,
            companyStamp TEXT,
            printerName TEXT,
            darkMode BOOLEAN DEFAULT 1
          )
        `);

        // Payments table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rentalId INTEGER NOT NULL,
            amount REAL NOT NULL,
            paymentType TEXT DEFAULT 'cash',
            paymentDate DATETIME DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'paid',
            parentPaymentId INTEGER,
            notes TEXT,
            FOREIGN KEY (rentalId) REFERENCES rentals(id),
            FOREIGN KEY (parentPaymentId) REFERENCES payments(id)
          )
        `);

        // Trial table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS trial (
            id INTEGER PRIMARY KEY DEFAULT 1,
            startDate DATETIME,
            endDate DATETIME,
            isActive BOOLEAN DEFAULT 1
          )
        `);

        // Tokens table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token TEXT NOT NULL,
            expirationDate DATETIME NOT NULL,
            isActive BOOLEAN DEFAULT 1,
            isBlocked BOOLEAN DEFAULT 0,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Migration: Add missing columns
        this.db.all("PRAGMA table_info(tokens)", (err, columns) => {
          if (!err && columns) {
            const columnNames = columns.map(c => c.name);
            if (!columnNames.includes('isBlocked')) {
              this.db.run(`ALTER TABLE tokens ADD COLUMN isBlocked BOOLEAN DEFAULT 0`);
            }
          }
        });

        this.db.all("PRAGMA table_info(cars)", (err, columns) => {
          if (!err && columns) {
            const columnNames = columns.map(c => c.name);
            const toAdd = [
              { name: 'insuranceExpiry', type: 'DATE' },
              { name: 'taxExpiry', type: 'DATE' },
              { name: 'lastOilChange', type: 'REAL' },
              { name: 'nextOilChange', type: 'REAL' },
              { name: 'legalNotes', type: 'TEXT' },
              { name: 'image', type: 'TEXT' },
              { name: 'fuelType', type: "TEXT DEFAULT 'Diesel'" }
            ];
            toAdd.forEach(col => {
              if (!columnNames.includes(col.name)) {
                this.db.run(`ALTER TABLE cars ADD COLUMN ${col.name} ${col.type}`);
              }
            });
          }
        });

        this.db.all("PRAGMA table_info(customers)", (err, columns) => {
          if (!err && columns) {
            const columnNames = columns.map(c => c.name);
            if (!columnNames.includes('licenseNumber')) {
              this.db.run(`ALTER TABLE customers ADD COLUMN licenseNumber TEXT`);
            }
          }
        });

        this.db.all("PRAGMA table_info(rentals)", (err, columns) => {
          if (!err && columns) {
            const columnNames = columns.map(c => c.name);
            const toAdd = [
              { name: 'deposit', type: 'REAL DEFAULT 0' },
              { name: 'initialCondition', type: 'TEXT' },
              { name: 'notes', type: 'TEXT' },
              { name: 'depositMethod', type: "TEXT DEFAULT 'Cash'" },
              { name: 'additionalCustomers', type: 'TEXT' },
              { name: 'startMileage', type: 'REAL' }
            ];
            toAdd.forEach(col => {
              if (!columnNames.includes(col.name)) {
                this.db.run(`ALTER TABLE rentals ADD COLUMN ${col.name} ${col.type}`);
              }
            });
          }
        });

        this.db.all("PRAGMA table_info(payments)", (err, columns) => {
          if (!err && columns) {
            const columnNames = columns.map(c => c.name);
            if (!columnNames.includes('parentPaymentId')) {
              this.db.run(`ALTER TABLE payments ADD COLUMN parentPaymentId INTEGER`);
            }
          }
        });

        this.db.all("PRAGMA table_info(expenses)", (err, columns) => {
          if (!err && columns) {
            const columnNames = columns.map(c => c.name);
            const toAdd = [
              { name: 'carId', type: 'INTEGER' },
              { name: 'docType', type: 'TEXT' },
              { name: 'newExpiryDate', type: 'DATE' }
            ];
            toAdd.forEach(col => {
              if (!columnNames.includes(col.name)) {
                this.db.run(`ALTER TABLE expenses ADD COLUMN ${col.name} ${col.type}`);
              }
            });
          }
        });

        this.db.run("INSERT OR IGNORE INTO settings (id, companyName) VALUES (1, 'شركة تأجير السيارات')", (err) => {
          if (err) reject(err);
          else resolve();
        });

        // Migration for company ICE and RC
        this.db.all("PRAGMA table_info(settings)", (err, columns) => {
          if (!err && columns) {
            const columnNames = columns.map(c => c.name);
            if (!columnNames.includes('companyICE')) {
              this.db.run(`ALTER TABLE settings ADD COLUMN companyICE TEXT`);
            }
            if (!columnNames.includes('companyRC')) {
              this.db.run(`ALTER TABLE settings ADD COLUMN companyRC TEXT`);
            }
          }
        });

        // Migration for companyStamp
        this.db.all("PRAGMA table_info(settings)", (err, columns) => {
          if (!err && columns) {
            const columnNames = columns.map(c => c.name);
            if (!columnNames.includes('companyStamp')) {
              this.db.run(`ALTER TABLE settings ADD COLUMN companyStamp TEXT`);
            }
          }
        });
      });
    });
  }

  // Car operations
  async addCar(carData) {
    return new Promise((resolve, reject) => {
      const { 
        brand, model, plateNumber, dailyPrice, 
        insuranceExpiry, taxExpiry, lastOilChange, 
        nextOilChange, techControlExpiry, mileage, legalNotes, image, fuelType 
      } = carData;
      
      const sql = `
        INSERT INTO cars (
          brand, model, plateNumber, dailyPrice, 
          insuranceExpiry, taxExpiry, lastOilChange, 
          nextOilChange, techControlExpiry, mileage, legalNotes, image, fuelType, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')
      `;
      
      this.db.run(sql, [
        brand || '', 
        model || '', 
        plateNumber || '', 
        parseFloat(dailyPrice) || 0, 
        insuranceExpiry || null, 
        taxExpiry || null, 
        parseFloat(lastOilChange) || 0, 
        parseFloat(nextOilChange) || 0, 
        techControlExpiry || null, 
        parseFloat(mileage) || 0, 
        legalNotes || null,
        image || null,
        fuelType || 'Diesel'
      ], function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  async getCars(filters = {}) {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM cars WHERE 1=1';
      const params = [];

      if (filters.status) {
        sql += ' AND status = ?';
        params.push(filters.status);
      }

      if (filters.searchTerm) {
        sql += ' AND (brand LIKE ? OR model LIKE ? OR plateNumber LIKE ?)';
        const term = `%${filters.searchTerm}%`;
        params.push(term, term, term);
      }

      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  async updateCar(carData) {
    return new Promise((resolve, reject) => {
      const { 
        id, brand, model, plateNumber, dailyPrice, 
        insuranceExpiry, taxExpiry, lastOilChange, 
        nextOilChange, techControlExpiry, mileage, legalNotes, image, fuelType, status 
      } = carData;
      const sql = `
        UPDATE cars
        SET brand = ?, model = ?, plateNumber = ?, dailyPrice = ?, 
            insuranceExpiry = ?, taxExpiry = ?, lastOilChange = ?, 
            nextOilChange = ?, techControlExpiry = ?, mileage = ?, legalNotes = ?,
            image = ?, fuelType = ?, status = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      this.db.run(sql, [
        brand || '', 
        model || '', 
        plateNumber || '', 
        parseFloat(dailyPrice) || 0, 
        insuranceExpiry || null, 
        taxExpiry || null, 
        parseFloat(lastOilChange) || 0, 
        parseFloat(nextOilChange) || 0, 
        techControlExpiry || null, 
        parseFloat(mileage) || 0, 
        legalNotes || null,
        image || null,
        fuelType || 'Diesel',
        status || 'available', 
        id
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async deleteCar(carId) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM cars WHERE id = ?', [carId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Customer operations
  async addCustomer(customerData) {
    return new Promise((resolve, reject) => {
      const { name, phone, cin, licenseNumber, email, address } = customerData;
      const sql = `
        INSERT INTO customers (name, phone, cin, licenseNumber, email, address)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      this.db.run(sql, [name, phone, cin, licenseNumber || null, email || null, address || null], function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  async getCustomers(filters = {}) {
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM customers WHERE 1=1';
      const params = [];

      if (filters.searchTerm) {
        sql += ' AND (name LIKE ? OR phone LIKE ? OR cin LIKE ?)';
        const term = `%${filters.searchTerm}%`;
        params.push(term, term, term);
      }

      sql += ' ORDER BY name ASC';
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  async updateCustomer(customerData) {
    return new Promise((resolve, reject) => {
      const { id, name, phone, cin, licenseNumber, email, address } = customerData;
      const sql = `
        UPDATE customers
        SET name = ?, phone = ?, cin = ?, licenseNumber = ?, email = ?, address = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      this.db.run(sql, [name, phone, cin, licenseNumber || null, email || null, address || null, id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async deleteCustomer(customerId) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM customers WHERE id = ?', [customerId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Settings
  async getSettings() {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM settings WHERE id = 1', [], (err, row) => {
        if (err) reject(err);
        else resolve(row || {});
      });
    });
  }

  async updateSettings(settingsData) {
    return new Promise((resolve, reject) => {
      const { 
        companyName, companyAddress, companyPhone, companyEmail, companyICE, companyRC,
        currency, taxRate, logoPath, companyStamp, printerName, darkMode 
      } = settingsData;
      const sql = `
        UPDATE settings
        SET companyName = ?, companyAddress = ?, companyPhone = ?, companyEmail = ?,
            companyICE = ?, companyRC = ?, currency = ?, taxRate = ?, 
            logoPath = ?, companyStamp = ?, printerName = ?, darkMode = ?
        WHERE id = 1
      `;
      this.db.run(sql, [
        companyName, companyAddress, companyPhone, companyEmail,
        companyICE, companyRC, currency, taxRate, 
        logoPath, companyStamp, printerName, darkMode
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Rental operations
  async createRental(rentalData) {
    return new Promise((resolve, reject) => {
      const { 
        carId, customerId, startDate, endDate, totalDays, 
        totalPrice, deposit, depositMethod, initialCondition, notes, additionalCustomers, startMileage
      } = rentalData;
      
      const sql = `
        INSERT INTO rentals (
          carId, customerId, startDate, endDate, totalDays, 
          totalPrice, deposit, depositMethod, initialCondition, notes, additionalCustomers, startMileage, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `;
      
      const dbInstance = this;
      this.db.run(sql, [
        carId, customerId, startDate, endDate, totalDays, 
        totalPrice, deposit, depositMethod, initialCondition, notes, additionalCustomers || null, startMileage || null
      ], function(err) {
          if (err) {
            reject(err);
          } else {
            const rentalId = this.lastID;
            // Update car status
            dbInstance.db.run('UPDATE cars SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', ['rented', carId], (err) => {
              if (err) {
                reject(err);
                return;
              }
              
              // 1. Record the Rental Revenue (Total Price)
              const revenueSql = `
                INSERT INTO payments (rentalId, amount, paymentType, paymentDate, status, notes)
                VALUES (?, ?, 'cash', CURRENT_TIMESTAMP, 'paid', 'واجب الكراء / Rental Fee')
              `;
              dbInstance.db.run(revenueSql, [rentalId, totalPrice], function(revErr) {
                if (revErr) console.error('Error recording rental revenue:', revErr);
                const parentPaymentId = this?.lastID || null;
                
                // 2. Record the Deposit (Caution) - Separately
                if (parseFloat(deposit) > 0) {
                  const depositSql = `
                    INSERT INTO payments (rentalId, amount, paymentType, paymentDate, status, parentPaymentId, notes)
                    VALUES (?, ?, 'deposit', CURRENT_TIMESTAMP, 'paid', ?, ?)
                  `;
                  dbInstance.db.run(depositSql, [rentalId, deposit, parentPaymentId, 'ضمانة العقد / Deposit'], (depErr) => {
                    if (depErr) console.error('Error recording deposit:', depErr);
                    resolve({ lastID: rentalId });
                  });
                } else {
                  resolve({ lastID: rentalId });
                }
              });
            });
          }
        }
      );
    });
  }

  async updateCarStatus(carId, status) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE cars SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        [status, carId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async getRentals(filters = {}) {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT r.*, c.brand, c.model, c.plateNumber, c.fuelType, 
               COALESCE(cust.name, '---') as customerName, 
               COALESCE(cust.phone, '---') as phone, 
               COALESCE(cust.cin, '---') as cin, 
               COALESCE(cust.licenseNumber, '---') as licenseNumber
        FROM rentals r
        LEFT JOIN cars c ON r.carId = c.id
        LEFT JOIN customers cust ON r.customerId = cust.id
        WHERE 1=1
      `;
      const params = [];

      if (filters.status) {
        sql += ' AND r.status = ?';
        params.push(filters.status);
      }

      if (filters.date) {
        sql += ' AND DATE(r.startDate) = DATE(?)';
        params.push(filters.date);
      }

      if (filters.searchTerm) {
        sql += ' AND (cust.name LIKE ? OR c.plateNumber LIKE ? OR c.brand LIKE ? OR cust.phone LIKE ? OR cust.cin LIKE ?)';
        const term = `%${filters.searchTerm}%`;
        params.push(term, term, term, term, term);
      }

      sql += ' ORDER BY r.createdAt DESC';

      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  async getRentalById(id) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT r.*, c.brand, c.model, c.plateNumber, c.fuelType, 
               COALESCE(cust.name, '---') as customerName, 
               COALESCE(cust.phone, '---') as phone, 
               COALESCE(cust.cin, '---') as cin, 
               COALESCE(cust.licenseNumber, '---') as licenseNumber
        FROM rentals r
        LEFT JOIN cars c ON r.carId = c.id
        LEFT JOIN customers cust ON r.customerId = cust.id
        WHERE r.id = ?
      `;
      this.db.get(sql, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async endRental(rentalId, finalData) {
    return new Promise((resolve, reject) => {
      const { endDate, totalDays, totalPrice, mileage } = finalData;
      
      this.db.serialize(async () => {
        // Get rental to find car and original price
        this.db.get('SELECT carId, totalPrice, deposit FROM rentals WHERE id = ?', [rentalId], async (err, rental) => {
          if (err || !rental) {
            reject(err || new Error('Rental not found'));
            return;
          }

          // Update rental
          const sql = `
            UPDATE rentals
            SET endDate = ?, totalDays = ?, totalPrice = ?, status = 'completed', updatedAt = CURRENT_TIMESTAMP
            WHERE id = ?
          `;

          const oldTotalPrice = parseFloat(rental.totalPrice || 0);
          const newTotalPrice = parseFloat(totalPrice || 0);

          this.db.run(sql, [endDate, totalDays, newTotalPrice, rentalId], async (err) => {
            if (err) {
              reject(err);
            } else {
              // Calculate if there's an additional charge (difference)
              const additionalCharge = newTotalPrice - oldTotalPrice;
              
              if (additionalCharge > 0) {
                const paymentSql = `
                  INSERT INTO payments (rentalId, amount, paymentType, paymentDate, status, notes)
                  VALUES (?, ?, 'cash', CURRENT_TIMESTAMP, 'paid', 'تتمة الأداء / Additional Charge')
                `;
                this.db.run(paymentSql, [rentalId, additionalCharge], (paymentErr) => {
                  if (paymentErr) console.error('Error recording additional payment:', paymentErr);
                });
              }

              // Update car status back to available and update mileage if provided
              let carSql = 'UPDATE cars SET status = ?, updatedAt = CURRENT_TIMESTAMP';
              let carParams = ['available'];
              
              if (mileage) {
                carSql += ', mileage = ?';
                carParams.push(parseFloat(mileage));
              }
              
              carSql += ' WHERE id = ?';
              carParams.push(rental.carId);

              this.db.run(carSql, carParams, (err) => {
                if (err) reject(err);
                else resolve();
              });
            }
          });
        });
      });
    });
  }

  async deleteRental(id) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM rentals WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else {
          this.db.run('DELETE FROM payments WHERE rentalId = ?', [id], (err2) => {
            if (err2) console.error('Error deleting associated payments:', err2);
            resolve();
          });
        }
      });
    });
  }

  // Payment operations
  async deletePayment(id) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM payments WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async recordPayment(paymentData) {
    return new Promise((resolve, reject) => {
      const { rentalId, amount, paymentType, paymentDate, status, notes, parentPaymentId } = paymentData;
      const sql = `
        INSERT INTO payments (rentalId, amount, paymentType, paymentDate, status, notes, parentPaymentId)
        VALUES (?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, ?, ?)
      `;
      this.db.run(
        sql,
        [rentalId, amount, paymentType || 'cash', paymentDate || null, status || 'paid', notes || null, parentPaymentId || null],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });
  }

  async getPayments(filters = {}) {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT p.*, r.id as rentalId, r.startDate, r.endDate,
               r.deposit as rentalDepositAmount, r.depositMethod as rentalDepositMethod,
               car.brand as carBrand, car.model as carModel, car.plateNumber as plateNumber,
               COALESCE(cust.name, '---') as customerName,
               datetime(p.paymentDate, 'localtime') as paymentDateLocal,
               p.parentPaymentId as linkedPaymentId
        FROM payments p
        LEFT JOIN rentals r ON p.rentalId = r.id
        LEFT JOIN customers cust ON r.customerId = cust.id
        LEFT JOIN cars car ON r.carId = car.id
        WHERE 1=1
      `;
      const params = [];

      if (filters.status) {
        sql += ' AND p.status = ?';
        params.push(filters.status);
      }

      sql += ' ORDER BY p.paymentDate DESC';

      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  // Reports
  async getDailyReport(date) {
    return new Promise((resolve, reject) => {
      // Get daily, monthly and annual income totals
      const sql = `
        SELECT 
          (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'paid' AND paymentType != 'deposit' AND DATE(paymentDate, 'localtime') = DATE(?)) as income,
          (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'paid' AND paymentType != 'deposit' AND strftime('%Y-%m', paymentDate, 'localtime') = strftime('%Y-%m', ?)) as monthlyIncome,
          (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'paid' AND paymentType != 'deposit' AND strftime('%Y', paymentDate, 'localtime') = strftime('%Y', ?)) as annualIncome,
          (SELECT COUNT(*) FROM rentals WHERE status = 'active') as activeRentals,
          (SELECT COUNT(*) FROM rentals WHERE status = 'completed' AND DATE(endDate, 'localtime') = DATE(?)) as completedToday,
          (SELECT COALESCE(SUM(totalPrice - (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE rentalId = r.id AND status = 'paid' AND paymentType != 'deposit')), 0) FROM rentals r WHERE status = 'active') as pendingPayments
      `;

      this.db.get(sql, [date, date, date, date], (err, row) => {
        if (err) reject(err);
        else resolve(row || { income: 0, monthlyIncome: 0, annualIncome: 0, activeRentals: 0, completedToday: 0 });
      });
    });
  }

  async getIncomeReport(startDate, endDate) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          d.date,
          COALESCE(r.rentals, 0) as rentals,
          COALESCE(r.income, 0) as income,
          COALESCE(p.payments, 0) as payments
        FROM (
          SELECT DATE(createdAt, 'localtime') as date FROM rentals WHERE DATE(createdAt, 'localtime') BETWEEN DATE(?) AND DATE(?)
          UNION
          SELECT DATE(paymentDate, 'localtime') as date FROM payments WHERE DATE(paymentDate, 'localtime') BETWEEN DATE(?) AND DATE(?)
        ) d
        LEFT JOIN (
          SELECT DATE(createdAt, 'localtime') as date, COUNT(*) as rentals, SUM(totalPrice) as income
          FROM rentals
          GROUP BY DATE(createdAt, 'localtime')
        ) r ON d.date = r.date
        LEFT JOIN (
          SELECT DATE(paymentDate, 'localtime') as date, SUM(amount) as payments
          FROM payments
          WHERE status = 'paid' AND paymentType != 'deposit'
          GROUP BY DATE(paymentDate, 'localtime')
        ) p ON d.date = p.date
        ORDER BY d.date DESC
      `;

      this.db.all(sql, [startDate, endDate, startDate, endDate], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  async getDetailedFinancialReport(startDate, endDate) {
    return new Promise((resolve, reject) => {
      const queries = {
        totalIncome: `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'paid' AND paymentType != 'deposit' AND DATE(paymentDate, 'localtime') BETWEEN DATE(?) AND DATE(?)`,
        totalMaintenance: `SELECT COALESCE(SUM(cost), 0) as total FROM maintenance_records WHERE DATE(date, 'localtime') BETWEEN DATE(?) AND DATE(?)`,
        totalGeneralExpenses: `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE DATE(date, 'localtime') BETWEEN DATE(?) AND DATE(?)`,
        expensesByCategory: `SELECT category, SUM(amount) as total FROM expenses WHERE DATE(date, 'localtime') BETWEEN DATE(?) AND DATE(?) GROUP BY category`,
        maintenanceByType: `SELECT type as category, SUM(cost) as total FROM maintenance_records WHERE DATE(date, 'localtime') BETWEEN DATE(?) AND DATE(?) GROUP BY type`,
        carPerformance: `
          SELECT * FROM (
            SELECT 
              c.brand, c.model, c.plateNumber,
              (SELECT COALESCE(SUM(p.amount), 0) FROM payments p JOIN rentals r ON p.rentalId = r.id WHERE r.carId = c.id AND p.status = 'paid' AND p.paymentType != 'deposit' AND DATE(p.paymentDate, 'localtime') BETWEEN DATE(?) AND DATE(?)) as revenue,
              (SELECT COALESCE(SUM(m.cost), 0) FROM maintenance_records m WHERE m.carId = c.id AND DATE(m.date, 'localtime') BETWEEN DATE(?) AND DATE(?)) as maintenance
            FROM cars c
          ) WHERE revenue > 0 OR maintenance > 0
        `
      };

      const results = {};
      const promises = Object.keys(queries).map(key => {
        return new Promise((res, rej) => {
          let params = [startDate, endDate];
          if (key === 'carPerformance') params = [startDate, endDate, startDate, endDate];
          
          this.db.all(queries[key], params, (err, rows) => {
            if (err) rej(err);
            else {
              results[key] = rows;
              res();
            }
          });
        });
      });

      Promise.all(promises)
        .then(() => {
          // Normalize car performance: adding the range to subqueries above was tricky, 
          // let's just use the results.
          resolve(results);
        })
        .catch(reject);
    });
  }

  async getCarPerformance() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          c.id, c.brand, c.model, c.plateNumber, c.image, c.mileage,
          COUNT(DISTINCT r.id) as rentalCount,
          COALESCE((
            SELECT SUM(p.amount) 
            FROM payments p 
            JOIN rentals r2 ON p.rentalId = r2.id 
            WHERE r2.carId = c.id AND p.status = 'paid' AND p.paymentType != 'deposit'
          ), 0) as totalRevenue,
          COALESCE((
            SELECT SUM(cost) 
            FROM maintenance_records 
            WHERE carId = c.id
          ), 0) as totalExpenses,
          COALESCE((
            SELECT SUM(totalDays)
            FROM rentals
            WHERE carId = c.id
          ), 0) as totalDays
        FROM cars c
        LEFT JOIN rentals r ON c.id = r.carId
        GROUP BY c.id
        ORDER BY totalRevenue DESC
      `;

      this.db.all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  // Expense operations
  async addExpense(expenseData) {
    return new Promise((resolve, reject) => {
      const { title, amount, category, date, notes, carId, docType, newExpiryDate } = expenseData;
      const sql = `
        INSERT INTO expenses (title, amount, category, date, notes, carId, docType, newExpiryDate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      this.db.run(sql, [
        title,
        parseFloat(amount),
        category,
        date,
        notes || null,
        carId || null,
        docType || null,
        newExpiryDate || null
      ], function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  async getExpenses(filters = {}) {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT e.*, c.brand as carBrand, c.model as carModel, c.plateNumber as plateNumber
        FROM expenses e
        LEFT JOIN cars c ON e.carId = c.id
        WHERE 1=1
      `;
      const params = [];
      if (filters.startDate && filters.endDate) {
        sql += ' AND e.date BETWEEN ? AND ?';
        params.push(filters.startDate, filters.endDate);
      }
      sql += ' ORDER BY e.date DESC, e.id DESC';
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  async deleteExpense(id) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM expenses WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Maintenance operations
  async addMaintenanceRecord(recordData) {
    return new Promise((resolve, reject) => {
      const { carId, type, description, cost, date, nextServiceMileage } = recordData;
      const sql = `
        INSERT INTO maintenance_records (carId, type, description, cost, date, nextServiceMileage)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      this.db.run(sql, [carId, type, description, parseFloat(cost), date, nextServiceMileage], function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  async getMaintenanceRecords(carId = null) {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT m.*, c.brand, c.model, c.plateNumber, c.mileage as currentMileage
        FROM maintenance_records m
        LEFT JOIN cars c ON m.carId = c.id
      `;
      const params = [];
      if (carId) {
        sql += ' WHERE m.carId = ?';
        params.push(carId);
      }
      sql += ' ORDER BY m.date DESC';
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  async deleteMaintenanceRecord(id) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM maintenance_records WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async getAppStats() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          (SELECT COUNT(*) FROM cars) as cars_count,
          (SELECT COUNT(*) FROM customers) as customers_count,
          (SELECT COUNT(*) FROM rentals) as rentals_count,
          (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'paid') as total_income
      `;
      this.db.get(sql, [], (err, row) => {
        if (err) reject(err);
        else resolve(row || { cars_count: 0, customers_count: 0, rentals_count: 0, total_income: 0 });
      });
    });
  }
}

module.exports = Database;
