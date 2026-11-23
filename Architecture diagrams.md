# System Architecture & Flow Diagrams

## 🏗️ Application Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    WINDOWS DESKTOP APP                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          ELECTRON MAIN PROCESS (main.js)             │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  IPC Handler                                   │  │  │
│  │  │  ├─ Database Operations                        │  │  │
│  │  │  ├─ Trial Management                           │  │  │
│  │  │  ├─ Token Verification                         │  │  │
│  │  │  ├─ Backup Operations                          │  │  │
│  │  │  └─ Security Operations                        │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                  │
│         ┌────────────────┼────────────────┐               │
│         ▼                ▼                ▼               │
│    ┌─────────┐      ┌──────────┐   ┌──────────┐         │
│    │ Database │      │  Managers│   │ Security │         │
│    │ (SQLite) │      │          │   │ & Crypto │         │
│    │          │      │ ├─Trial  │   │          │         │
│    │ Tables:  │      │ ├─Token  │   │ ├─Encrypt│         │
│    │ ├─Cars   │      │ ├─Backup │   │ ├─Validate         │
│    │ ├─Customers      │ └─Device │   │ └─Hash  │         │
│    │ ├─Rentals        └──────────┘   └──────────┘         │
│    │ ├─Payments                                           │
│    │ ├─Trial                                              │
│    │ └─Tokens                                             │
│    └─────────┘                                            │
│         ▲                                                  │
│         │                                                  │
│  ┌──────┴──────────────────────────────────────────────┐  │
│  │    PRELOAD SCRIPT (preload.js)                       │  │
│  │    Secure IPC Bridge                                 │  │
│  │    ├─ window.electron.getAppStatus()                 │  │
│  │    ├─ window.electron.getCars()                      │  │
│  │    ├─ window.electron.createRental()                 │  │
│  │    ├─ window.electron.recordPayment()                │  │
│  │    ├─ window.electron.createBackup()                 │  │
│  │    └─ window.electron.verifyToken()                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ▲                                  │
│                          │                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │      REACT FRONTEND (src/components)                 │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  App Component                                 │  │  │
│  │  │  ├─ Navigation                                 │  │  │
│  │  │  ├─ ActivationScreen (if needed)               │  │  │
│  │  │  └─ Current Page:                              │  │  │
│  │  │     ├─ Dashboard                               │  │  │
│  │  │     ├─ CarsManagement                          │  │  │
│  │  │     ├─ CustomersManagement                     │  │  │
│  │  │     ├─ RentalsManagement                       │  │  │
│  │  │     ├─ PaymentsManagement                      │  │  │
│  │  │     ├─ Reports                                 │  │  │
│  │  │     └─ Settings                                │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Trial System Flow

```
┌─────────────────────────────────────────────────────────────┐
│              FIRST LAUNCH - TRIAL INITIALIZATION             │
└─────────────────────────────────────────────────────────────┘

App Starts
    │
    ▼
Check: Do we have trial data?
    │
    ├─ YES → Check if expired
    │        │
    │        ├─ NOT EXPIRED → Calculate days remaining
    │        │                │
    │        │                ├─ > 0 days → ✅ SHOW DASHBOARD
    │        │                │
    │        │                └─ ≤ 0 days → Show Activation Screen
    │        │
    │        └─ EXPIRED → Show Activation Screen
    │
    └─ NO → Create New Trial
             │
             ▼
        Save start date (ENCRYPTED)
             │
             ▼
        Calculate: End Date = Start Date + 14 Days
             │
             ▼
        Save end date (ENCRYPTED)
             │
             ▼
        ✅ SHOW DASHBOARD

┌─────────────────────────────────────────────────────────────┐
│           DAILY - TRIAL STATUS CHECK                         │
└─────────────────────────────────────────────────────────────┘

Every App Start
    │
    ▼
Read: Start Date & End Date from DB (DECRYPT)
    │
    ▼
Get: Current System Date
    │
    ▼
Calculate: Days Remaining = (End Date - Current Date) / 86400000
    │
    ├─ DAYS > 0 → Show count in UI (e.g., "10 days remaining")
    │
    ├─ DAYS = 0 → Show "Last day of trial"
    │
    └─ DAYS < 0 → TRIAL EXPIRED
                  │
                  ▼
            Check: Do we have active token?
                  │
                  ├─ YES → Validate token expiration
                  │        ├─ VALID → ✅ UNLOCK
                  │        └─ EXPIRED → Show Activation Screen
                  │
                  └─ NO → Show Activation Screen

┌─────────────────────────────────────────────────────────────┐
│         SYSTEM DATE MANIPULATION DETECTION                  │
└─────────────────────────────────────────────────────────────┘

Daily Check:
    │
    ▼
Days Remaining < -7 days?
    │
    ├─ YES → 🚨 MANIPULATION DETECTED
    │        └─ Block access
    │        └─ Show error message
    │
    └─ NO → Continue normally
```

---

## 🔐 Token Activation Flow

```
┌─────────────────────────────────────────────────────────────┐
│              TOKEN ACTIVATION PROCESS                        │
└─────────────────────────────────────────────────────────────┘

Trial Expired → Activation Screen Shown
    │
    ▼
User enters token: "XXXX-XXXX-XXXX-XXXX"
    │
    ▼
Validate format (regex check)
    │
    ├─ INVALID → Show error: "Format not valid"
    │
    └─ VALID → Continue
               │
               ▼
          Send to API: POST /verify-token
               │
               ▼
          API Response:
               │
               ├─ { valid: false } 
               │  │
               │  └─ Show error: "Token not found or expired"
               │
               └─ { valid: true, expirationDate: "2025-12-31T..." }
                  │
                  ▼
            Encrypt token (AES-256)
                  │
                  ▼
            Save to database:
                  ├─ token (encrypted)
                  ├─ expirationDate
                  ├─ isActive = true
                  └─ timestamp
                  │
                  ▼
            Deactivate old tokens (if any)
                  │
                  ▼
            Show success message
                  │
                  ▼
            Close activation screen
                  │
                  ▼
            ✅ UNLOCK & SHOW DASHBOARD

┌─────────────────────────────────────────────────────────────┐
│         TOKEN VERIFICATION ON APP START                      │
└─────────────────────────────────────────────────────────────┘

Check: Is there an active token?
    │
    ├─ NO → Check trial
    │       ├─ Trial active → ✅ ALLOW
    │       └─ Trial expired → Show activation
    │
    └─ YES → Decrypt token
             │
             ▼
        Read: expirationDate
             │
             ▼
        Is current date < expirationDate?
             │
             ├─ YES → ✅ ALLOW
             │        Show "Token valid until: [date]"
             │
             └─ NO → Token expired
                    │
                    ▼
               Deactivate token
                    │
                    ▼
               Check trial
                    ├─ Trial active → ✅ ALLOW
                    └─ Trial expired → Show activation
```

---

## 💾 Backup System Flow

```
┌─────────────────────────────────────────────────────────────┐
│              AUTOMATIC BACKUP SYSTEM                         │
└─────────────────────────────────────────────────────────────┘

App Start
    │
    ▼
Calculate time until 2:00 AM
    │
    ▼
Schedule backup task at 2:00 AM
    │
    │ (User goes to bed)
    │
    ▼ (2:00 AM arrives)
    
Backup Process Starts:
    │
    ├─ Close database connection (wait for locks)
    │
    ├─ Copy carental.db → backup_auto_[timestamp].db
    │
    ├─ Create metadata file:
    │  ├─ timestamp
    │  ├─ type: "auto"
    │  ├─ filename
    │  └─ size (in bytes)
    │
    ├─ List all auto backups
    │
    ├─ Keep last 30, delete older ones
    │
    └─ Log success message
    
Next backup: 24 hours later (automatic)

┌─────────────────────────────────────────────────────────────┐
│              MANUAL BACKUP (USER REQUESTED)                  │
└─────────────────────────────────────────────────────────────┘

User clicks: "إنشاء نسخة احتياطية" (Create Backup)
    │
    ▼
Show loading spinner
    │
    ▼
Backup Process:
    │
    ├─ Close database
    ├─ Copy database file
    ├─ Create metadata
    ├─ Reopen database
    │
    └─ Show success message
        │
        ▼
    Backup saved at: C:\Users\[User]\AppData\Roaming\car-rental-system\backups\

┌─────────────────────────────────────────────────────────────┐
│              RESTORE BACKUP                                  │
└─────────────────────────────────────────────────────────────┘

User selects backup and clicks: "استعادة" (Restore)
    │
    ▼
Ask for confirmation: "This will replace current data!"
    │
    ├─ NO → Cancel
    │
    └─ YES → Continue
            │
            ▼
        Save emergency backup of current DB
            │
            ▼
        Close current database
            │
            ▼
        Copy selected backup → carental.db
            │
            ▼
        Reopen database
            │
            ▼
        Restart app with restored data
            │
            ▼
        ✅ Show success message
```

---

## 🔍 Data Flow - Creating a Rental

```
┌─────────────────────────────────────────────────────────────┐
│          CREATE RENTAL - COMPLETE FLOW                       │
└─────────────────────────────────────────────────────────────┘

User in Rentals Page:
    │
    ▼
Click: "إضافة حجز جديد" (Create New Rental)
    │
    ▼
Load data from IPC:
    │
    ├─ window.electron.getCars()
    │  └─ Get only AVAILABLE cars
    │
    └─ window.electron.getCustomers()
       └─ Get all customers
    │
    ▼
Display form with dropdowns:
    │
    ├─ Select Car
    │  └─ Show: [Brand] [Model] - [Daily Price] درهم
    │
    ├─ Select Customer
    │  └─ Show: [Name] - [Phone]
    │
    ├─ Start Date (Date Picker)
    │
    └─ End Date (Date Picker)
        │
        ▼ (Auto-fill on end date change)
    │
    ├─ Total Days = (End Date - Start Date) / 86400000
    │
    └─ Total Price = Total Days × Daily Price
    │
    ▼
User clicks: "حفظ" (Save)
    │
    ▼
Validate form:
    │
    ├─ All fields filled? ✅
    ├─ End Date > Start Date? ✅
    ├─ Price calculated? ✅
    │
    └─ ❌ Show error if validation fails
    │
    ▼
Send IPC: window.electron.createRental({
    carId: 5,
    customerId: 2,
    startDate: "2024-04-26",
    endDate: "2024-04-29",
    totalDays: 3,
    totalPrice: 600
})
    │
    ▼ (In Main Process)
    
Database operations:
    │
    ├─ INSERT into rentals table
    │  └─ Save all rental data with status='active'
    │
    └─ UPDATE cars table
       └─ Set status='rented' for this car
    │
    ▼
Return: { success: true, id: 42 }
    │
    ▼ (Back in React)
    
Success:
    │
    ├─ Show success message
    ├─ Clear form
    ├─ Reload rental list
    │
    ▼
User sees new rental in list
```

---

## 💰 Payment Flow

```
┌─────────────────────────────────────────────────────────────┐
│              RECORD PAYMENT - FLOW                           │
└─────────────────────────────────────────────────────────────┘

Rental exists in system:
    │
    ▼
User clicks: "تسجيل دفعة" (Record Payment) on a rental
    │
    ▼
Show payment form:
    │
    ├─ Rental ID (auto-filled)
    ├─ Total Amount (show calculated amount)
    ├─ Payment Amount (input)
    ├─ Payment Type (dropdown):
    │  ├─ Cash (نقد)
    │  ├─ Card (بطاقة)
    │  └─ Bank Transfer (تحويل بنكي)
    │
    ├─ Payment Date (default: today)
    │
    ├─ Status (radio):
    │  ├─ Paid (مدفوع)
    │  └─ Pending (قيد الانتظار)
    │
    └─ Notes (optional)
    │
    ▼
User submits form
    │
    ▼
Send to database:
    │
    INSERT into payments {
      rentalId: 42,
      amount: 600,
      paymentType: 'cash',
      paymentDate: '2024-04-29',
      status: 'paid',
      notes: ''
    }
    │
    ▼
Success:
    │
    ├─ Show confirmation
    ├─ Update payment list
    │
    ▼
Show in Reports:
    │
    └─ Total income today: 600 درهم
```

---

## 📊 Database Query Examples

```
┌─────────────────────────────────────────────────────────────┐
│          COMMON DATABASE QUERIES                             │
└─────────────────────────────────────────────────────────────┘

1. Get all available cars:
   SELECT * FROM cars WHERE status = 'available'

2. Get active rentals:
   SELECT r.*, c.brand, c.model, cust.name
   FROM rentals r
   JOIN cars c ON r.carId = c.id
   JOIN customers cust ON r.customerId = cust.id
   WHERE r.status = 'active'

3. Get today's revenue:
   SELECT SUM(totalPrice) as income
   FROM rentals
   WHERE DATE(startDate) = DATE(CURRENT_DATE)
   AND status = 'completed'

4. Get paid payments:
   SELECT * FROM payments
   WHERE status = 'paid'
   ORDER BY paymentDate DESC

5. Get rental history for customer:
   SELECT r.*, c.brand, c.model
   FROM rentals r
   JOIN cars c ON r.carId = c.id
   WHERE r.customerId = ?
   ORDER BY r.createdAt DESC

6. Get overdue rentals:
   SELECT * FROM rentals
   WHERE endDate < CURRENT_DATE
   AND status = 'active'

7. Get payment status:
   SELECT 
     r.id,
     cust.name,
     SUM(p.amount) as paid,
     r.totalPrice,
     (r.totalPrice - COALESCE(SUM(p.amount), 0)) as due
   FROM rentals r
   LEFT JOIN payments p ON r.id = p.rentalId
   LEFT JOIN customers cust ON r.customerId = cust.id
   GROUP BY r.id
```

---

## 🔐 Encryption Flow

```
┌─────────────────────────────────────────────────────────────┐
│              DATA ENCRYPTION (AES-256)                       │
└─────────────────────────────────────────────────────────────┘

ENCRYPTION:
    
Plain Text Token: "ABC-DEF-GHI-JKL"
    │
    ▼
Generate random IV (Initialization Vector)
    │
    ▼
Create Cipher with AES-256-CBC
    │
    ├─ Key: (your-secret-key padded to 32 bytes)
    ├─ IV: (random 16 bytes)
    │
    ▼
Encrypt: plain text → hex string
    │
    ▼
Combine: IV + ":" + Encrypted
Result: "a1b2c3d4e5f6....:4x7y8z9a0b1c..."
    │
    ▼
Save to database
    │
    ├─ tokens.token = encrypted string
    └─ tokens.expirationDate = 2025-12-31

DECRYPTION:
    
Read from database: "a1b2c3d4e5f6....:4x7y8z9a0b1c..."
    │
    ▼
Split by ":":
    │
    ├─ IV = "a1b2c3d4e5f6...."
    └─ Encrypted = "4x7y8z9a0b1c...."
    │
    ▼
Create Decipher with AES-256-CBC
    │
    ├─ Key: (same key used for encryption)
    ├─ IV: (extracted from string)
    │
    ▼
Decrypt: hex string → plain text
    │
    ▼
Result: "ABC-DEF-GHI-JKL"
```

---

## 🎯 User Interaction Flow

```
┌─────────────────────────────────────────────────────────────┐
│          TYPICAL USER SESSION                                │
└─────────────────────────────────────────────────────────────┘

9:00 AM - User starts app:
    │
    ▼
App checks trial status
    │
    ├─ Trial has 8 days remaining → ✅ Continue
    └─ Show "8 أيام متبقية" in navbar
    │
    ▼
Dashboard loads:
    │
    ├─ 5 cars available
    ├─ 2 active rentals
    ├─ 600 درهم today's revenue
    └─ 12 total customers
    │
    ▼
10:00 AM - Add new car:
    │
    ├─ Navigate to "السيارات" (Cars)
    ├─ Click "إضافة سيارة" (Add Car)
    ├─ Fill form: Toyota, Corolla, ABC-123, 200 درهم
    ├─ Click "حفظ" (Save)
    │
    └─ ✅ Car added to database
       └─ Car count: 5 → 6
    │
    ▼
11:00 AM - Create rental:
    │
    ├─ Navigate to "الحجوزات" (Rentals)
    ├─ Click "حجز جديد" (New Rental)
    ├─ Select: Corolla ABC-123, Customer Ahmed, 2 days
    ├─ Price auto-calculated: 400 درهم
    ├─ Click "حفظ" (Save)
    │
    └─ ✅ Rental created
       └─ Car status: available → rented
    │
    ▼
12:00 PM - Record payment:
    │
    ├─ Click "تسجيل دفعة" (Record Payment)
    ├─ Enter: 400 درهم, Cash, Paid
    ├─ Click "حفظ" (Save)
    │
    └─ ✅ Payment recorded
    │
    ▼
5:00 PM - Check reports:
    │
    ├─ Navigate to "التقارير" (Reports)
    ├─ Select date range
    ├─ View: 1 rental, 400 درهم income
    │
    └─ ✅ Reports generated
    │
    ▼
6:00 PM - Create backup:
    │
    ├─ Navigate to "الإعدادات" (Settings)
    ├─ Click "إنشاء نسخة احتياطية" (Create Backup)
    │
    └─ ✅ Backup created
    │
    ▼
6:05 PM - Close app:
    │
    └─ Database connection closed safely
        └─ Ready for auto-backup at 2:00 AM
```

---

## 📈 System Scalability

```
┌─────────────────────────────────────────────────────────────┐
│              PERFORMANCE AT DIFFERENT SCALES                 │
└─────────────────────────────────────────────────────────────┘

Small Agency (10 cars, 50 customers):
├─ Database size: 1-2 MB
├─ Query time: < 50ms
├─ Memory usage: 100-150 MB
├─ Startup time: 2 seconds
└─ ✅ Excellent performance

Medium Agency (50 cars, 500 customers):
├─ Database size: 5-10 MB
├─ Query time: 50-100ms
├─ Memory usage: 150-200 MB
├─ Startup time: 2-3 seconds
└─ ✅ Good performance

Large Agency (200+ cars, 2000+ customers):
├─ Database size: 20+ MB
├─ Query time: 100-500ms
├─ Memory usage: 250-300 MB
├─ Startup time: 3-5 seconds
├─ Recommendation: Archive old records
└─ ⚠️ Consider optimization

To optimize large datasets:
├─ Add database indexes
├─ Archive rentals > 1 year old
├─ Use pagination in lists
├─ Implement search filters
└─ Monitor query performance
```

---

This comprehensive diagram documentation covers:
- ✅ System architecture
- ✅ Trial flow and logic
- ✅ Token activation process
- ✅ Backup system operations
- ✅ Data flow examples
- ✅ User interactions
- ✅ Database queries
- ✅ Encryption/decryption
- ✅ Scalability considerations