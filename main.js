const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const Database = require('./src/database');
const BackupManager = require('./src/backupManager');
const isDev = require('electron-is-dev');

// FIX: Prevent input freezing on Windows by disabling problematic Chromium features
app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling,MediaSessionService');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('force-color-profile', 'srgb');

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const os = require('os');
const axios = require('axios');

let mainWindow;
let database;
let backupManager;
let uploadsPath;
let uploadServer;

// Setup Upload Server
const uploadApp = express();
uploadApp.use(cors());
uploadApp.use(express.json({ limit: '50mb' }));
uploadApp.use(express.urlencoded({ limit: '50mb', extended: true }));

// Add simple logger
uploadApp.use((req, res, next) => {
  console.log(`[Mobile Server] ${req.method} ${req.url}`);
  next();
});

function setupUploadServer() {
  uploadsPath = path.join(app.getPath('userData'), 'uploads');
  if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });

  // Use express.static with custom headers for better video support
  uploadApp.use('/files', express.static(uploadsPath, {
    setHeaders: (res, filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.mp4') res.setHeader('Content-Type', 'video/mp4');
      else if (ext === '.mov') res.setHeader('Content-Type', 'video/quicktime');
      else if (ext === '.webm') res.setHeader('Content-Type', 'video/webm');
    }
  }));

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const rentalId = req.params.rentalId;
      const dir = path.join(uploadsPath, 'rentals', rentalId);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
    }
  });

  const upload = multer({ storage });

  // New endpoint to get rental details for mobile view
  uploadApp.get('/details/:rentalId', async (req, res) => {
    try {
      if (!database) return res.status(500).json({ success: false, error: 'Database not ready' });
      const rental = await database.getRentalById(req.params.rentalId);
      if (!rental) return res.status(404).json({ success: false, error: 'Rental not found' });
      res.json({ success: true, data: rental });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  uploadApp.post('/upload/:rentalId', upload.array('files'), (req, res) => {
    console.log(`[Mobile Server] Received upload for rental: ${req.params.rentalId}`);
    res.json({ success: true, files: req.files });
  });

  // New endpoint for digital signature
  uploadApp.post('/signature/:rentalId', (req, res) => {
    try {
      const { signature } = req.body;
      const rentalId = req.params.rentalId;
      const dir = path.join(uploadsPath, 'rentals', rentalId);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const base64Data = signature.replace(/^data:image\/png;base64,/, "");
      fs.writeFileSync(path.join(dir, 'signature.png'), base64Data, 'base64');

      console.log(`[Mobile Server] Signature saved for rental: ${rentalId}`);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  uploadApp.get('/files/:rentalId', (req, res) => {
    const rentalId = req.params.rentalId;
    const dir = path.join(uploadsPath, 'rentals', rentalId);
    if (!fs.existsSync(dir)) return res.json({ success: true, files: [] });
    const files = fs.readdirSync(dir);
    res.json({ success: true, files });
  });

  uploadApp.delete('/files/:rentalId/:filename', (req, res) => {
    const { rentalId, filename } = req.params;
    const filePath = path.join(uploadsPath, 'rentals', rentalId, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, message: 'File not found' });
    }
  });

  // Digital Contract View for Mobile
  uploadApp.get('/mobile/contract/:rentalId', async (req, res) => {
    const rentalId = req.params.rentalId;
    try {
      const rental = await database.getRentalById(rentalId);
      if (!rental) return res.status(404).send('Contract not found');

      const settings = await database.getSettings();

      const formatDateLocal = (dateStr) => {
        if (!dateStr) return '--';
        const parts = String(dateStr).split('T')[0].split('-');
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
      };

      res.send(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>عقد رقمي - ${rental.brand}</title>
          <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
          <style>
            :root { --primary: #6366f1; --bg: #f1f5f9; }
            body { font-family: 'Outfit', sans-serif; background: var(--bg); margin: 0; padding: 15px; }
            .cert-card { background: white; border-radius: 25px; padding: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 2px solid #6366f1; }
            .header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
            .header img { max-height: 60px; margin-bottom: 10px; }
            .header h1 { margin: 0; font-size: 20px; color: #1e293b; }
            .badge { display: inline-block; padding: 5px 15px; background: #eef2ff; color: var(--primary); border-radius: 10px; font-size: 12px; font-weight: bold; margin-top: 10px; }
            .info-grid { display: grid; grid-template-columns: 1fr; gap: 15px; }
            .info-item { background: #f8fafc; padding: 15px; border-radius: 15px; }
            .info-item label { display: block; font-size: 11px; color: #64748b; font-weight: bold; margin-bottom: 5px; }
            .info-item p { margin: 0; font-size: 15px; font-weight: 700; color: #1e293b; }
            .footer-info { margin-top: 25px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #eee; padding-top: 20px; }
            .sig-box { margin-top: 20px; text-align: center; }
            .sig-box img { max-width: 150px; border: 1px solid #eee; border-radius: 10px; padding: 5px; }
            .btn-verify { display: block; width: 100%; padding: 15px; background: var(--primary); color: white; text-decoration: none; border-radius: 15px; font-weight: bold; margin-top: 20px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="cert-card">
            <div class="header">
              ${settings.logoPath ? `<img src="/files/${settings.logoPath}">` : ''}
              <h1>${settings.companyName || 'وكالة كراء السيارات'}</h1>
              <div class="badge">عقد كراء رسمي موثق</div>
            </div>
            
            <div class="info-grid">
              <div class="info-item"><label>المستأجر / Client</label><p>${rental.customerName}</p></div>
              <div class="info-item"><label>المركبة / Car</label><p>${rental.brand} ${rental.model} (<span dir="ltr">${rental.plateNumber}</span>)</p></div>
              <div class="info-item"><label>تاريخ البداية</label><p>${formatDateLocal(rental.startDate)}</p></div>
              <div class="info-item"><label>تاريخ النهاية</label><p>${formatDateLocal(rental.endDate)}</p></div>
              <div class="info-item"><label>المبلغ الإجمالي</label><p>${rental.totalPrice} درهم</p></div>
            </div>

            <div class="sig-box">
              <label style="font-size: 10px; color: #94a3b8;">توقيع الزبون الرقمي</label><br/>
              <img src="/files/rentals/${rental.id}/signature.png" onerror="this.style.display='none'">
            </div>

            <a href="#" class="btn-verify">عقد أصلي ومؤمن ✅</a>

            <div class="footer-info">
              <p>ICE: ${settings.companyICE || '---'} | RC: ${settings.companyRC || '---'}</p>
              <p>هذا العقد تم توليده آلياً وهو بمثابة وثيقة رسمية للحيازة المؤقتة.</p>
            </div>
          </div>
        </body>
        </html>
      `);
    } catch (err) {
      res.status(500).send('Error loading contract');
    }
  });

  uploadApp.get('/inspect/:rentalId', (req, res) => {
    const rentalId = req.params.rentalId;
    res.send(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>فحص السيارة - ${rentalId}</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
          :root {
            --primary: #6366f1;
            --primary-dark: #4f46e5;
            --secondary: #1e293b;
            --success: #10b981;
            --danger: #ef4444;
            --bg: #f8fafc;
            --card-bg: #ffffff;
            --text-main: #1e293b;
            --text-muted: #64748b;
          }

          * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
          body { 
            font-family: 'Outfit', sans-serif; 
            background: var(--bg); 
            color: var(--text-main); 
            margin: 0; 
            padding: 0;
            padding-bottom: 40px;
          }

          .header {
            background: linear-gradient(135deg, var(--secondary) 0%, #0f172a 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
            border-bottom-left-radius: 30px;
            border-bottom-right-radius: 30px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          }

          .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
          .header p { margin: 10px 0 0; opacity: 0.7; font-size: 14px; }

          .container { max-width: 600px; margin: -20px auto 0; padding: 0 15px; }

          .card {
            background: var(--card-bg);
            border-radius: 24px;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.03);
            margin-bottom: 20px;
            border: 1px solid rgba(226, 232, 240, 0.8);
          }

          .card-title {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 20px;
            font-size: 18px;
            font-weight: 600;
          }

          .card-title span {
            background: rgba(99, 102, 241, 0.1);
            color: var(--primary);
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            font-size: 14px;
          }

          .upload-zone {
            border: 2px dashed #e2e8f0;
            border-radius: 20px;
            padding: 40px 20px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            background: #fbfcfe;
          }

          .upload-zone:active { background: #f1f5f9; border-color: var(--primary); }
          .upload-zone svg { width: 48px; height: 48px; color: var(--primary); margin-bottom: 15px; }
          .upload-zone p { margin: 0; font-weight: 600; color: var(--text-main); }
          .upload-zone span { font-size: 12px; color: var(--text-muted); display: block; margin-top: 5px; }

          #status { 
            margin-top: 15px; 
            font-size: 14px; 
            font-weight: 600; 
            padding: 10px; 
            border-radius: 12px; 
            display: none; 
          }

          .gallery {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-top: 20px;
          }

          .media-item {
            position: relative;
            aspect-ratio: 1/1;
            border-radius: 12px;
            overflow: hidden;
            background: #eee;
          }

          .media-item img, .media-item video { width: 100%; height: 100%; object-fit: cover; }
          .del-btn {
            position: absolute;
            top: 5px;
            right: 5px;
            background: var(--danger);
            color: white;
            border: none;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            font-size: 16px;
            line-height: 1;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
          }

          /* Signature Styles */
          .sig-container {
            border: 1px solid #e2e8f0;
            border-radius: 15px;
            background: #fff;
            position: relative;
            touch-action: none;
            overflow: hidden;
          }

          #sig-canvas {
            width: 100%;
            height: 200px;
            cursor: crosshair;
            display: block;
          }

          .sig-actions {
            display: flex;
            gap: 10px;
            margin-top: 15px;
          }

          .btn {
            flex: 1;
            padding: 12px;
            border-radius: 12px;
            border: none;
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }

          .btn-primary { background: var(--primary); color: white; }
          .btn-outline { background: #f1f5f9; color: var(--text-main); }
          .btn-success { background: var(--success); color: white; width: 100%; margin-top: 10px; }

          .btn:active { transform: scale(0.96); opacity: 0.9; }

          .footer-note {
            text-align: center;
            padding: 20px;
            font-size: 12px;
            color: var(--text-muted);
          }

          /* Toast Notification */
          .toast {
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            background: var(--secondary);
            color: white;
            padding: 12px 24px;
            border-radius: 50px;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            z-index: 9999;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          }
          .toast.show { transform: translateX(-50%) translateY(0); }

          /* Enhanced Media Viewer */
          .lightbox { position: fixed; inset: 0; width: 100%; height: 100%; background: #000; display: none; flex-direction: column; z-index: 10000; }
          .lb-topbar { display: flex; align-items: center; justify-content: space-between; padding: 9px 14px; background: rgba(0,0,0,0.72); position: absolute; top: 0; left: 0; right: 0; z-index: 5; }
          .lb-close { color: white; font-size: 24px; background: none; border: none; cursor: pointer; line-height: 1; padding: 2px 6px; }
          .lb-counter { color: white; font-size: 12px; font-weight: 700; background: rgba(255,255,255,0.14); padding: 3px 10px; border-radius: 18px; }
          .lb-download { color: white; font-size: 18px; text-decoration: none; padding: 2px 6px; }
          .lb-main { flex: 1; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; padding: 50px 0 118px; touch-action: none; }
          .lb-media-wrapper { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
          .lb-media-wrapper img { max-width: 100%; max-height: 100%; object-fit: contain; transform-origin: center center; will-change: transform; user-select: none; -webkit-user-select: none; touch-action: none; display: block; }
          .lb-media-wrapper video { max-width: 100%; max-height: 100%; object-fit: contain; transform-origin: center center; will-change: transform; user-select: none; -webkit-user-select: none; touch-action: none; display: block; }
          .lb-nav-btn { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.15); backdrop-filter: blur(6px); border: none; color: white; width: 44px; height: 44px; border-radius: 50%; font-size: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 3; transition: background 0.2s; }
          .lb-nav-btn:active { background: rgba(255,255,255,0.35); }
          .lb-nav-prev { left: 10px; }
          .lb-nav-next { right: 10px; }
          
          .lb-controls { position: absolute; left: 10px; right: 10px; bottom: 5px; z-index: 6; background: rgba(15,23,42,0.76); border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; padding: 8px; backdrop-filter: blur(10px); display: grid; gap: 7px; }
          .lb-controls button { border: none; background: rgba(255,255,255,0.13); color: white; height: 36px; min-width: 36px; border-radius: 11px; font-size: 15px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; touch-action: manipulation; }
          .lb-controls button:active { transform: scale(0.96); background: rgba(255,255,255,0.26); }
          .lb-row { display: flex; align-items: center; justify-content: center; gap: 7px; min-width: 0; }
          .lb-video-controls { display: none; grid-template-columns: auto 1fr auto auto; align-items: center; gap: 8px; }
          .lb-time { color: white; font-size: 12px; min-width: 78px; text-align: center; direction: ltr; }
          .lb-range { width: 100%; min-width: 0; accent-color: var(--primary); touch-action: manipulation; }
          .lb-zoom-value { color: white; min-width: 50px; text-align: center; font-size: 12px; font-weight: 700; }

          .lb-strip { background: rgba(0,0,0,0.88); padding: 6px 10px; display: flex; gap: 8px; overflow-x: auto; overflow-y: hidden; -webkit-overflow-scrolling: touch; scrollbar-width: none; min-height: 68px; align-items: center; flex-shrink: 0; }
          .lb-strip::-webkit-scrollbar { display: none; }
          .lb-thumb { width: 56px; height: 56px; min-width: 56px; border-radius: 8px; overflow: hidden; cursor: pointer; border: 2.5px solid transparent; transition: border-color 0.2s, transform 0.2s; background: #333; position: relative; flex-shrink: 0; }
          .lb-thumb.active { border-color: var(--primary); transform: scale(1.1); }
          .lb-thumb img, .lb-thumb video { width: 100%; height: 100%; object-fit: cover; }
          .lb-thumb-play { position: absolute; bottom: 3px; right: 3px; font-size: 11px; color: white; text-shadow: 0 1px 4px rgba(0,0,0,0.9); }
          .download-btn-mini { position: absolute; bottom: 5px; left: 5px; background: rgba(255,255,255,0.9); color: var(--secondary); border: none; width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }

          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; }
          .info-item { background: #f1f5f9; padding: 10px; border-radius: 12px; }
          .info-item span { color: var(--text-muted); display: block; margin-bottom: 2px; }
          .info-item strong { color: var(--text-main); }
          @media (max-width: 520px) {
            .lb-main { padding-bottom: 140px; }
            .lb-nav-btn { width: 36px; height: 36px; font-size: 20px; }
            .lb-controls { left: 8px; right: 8px; bottom: 68px; border-radius: 13px; padding: 7px; }
            .lb-video-controls { grid-template-columns: auto 1fr auto; }
            .lb-video-controls .lb-time { grid-column: 1 / -1; min-width: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>مراجعة وتوقيع العقد</h1>
          <p id="contract-number">عقد رقم: <strong>${rentalId}</strong></p>
        </div>

        <div class="container">
          <!-- Step 0: Contract Info -->
          <div class="card" id="details-card">
            <div class="card-title"><span>📝</span> تفاصيل العقد</div>
            <div id="rental-info" class="info-grid">
              <div class="info-item"><span>جاري التحميل...</span></div>
            </div>
          </div>

          <!-- Step 1: Photos -->
          <div class="card">
            <div class="card-title"><span>1</span> صور وفيديوهات الحالة</div>
            <label class="upload-zone" id="uploadBtn">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              <p>إضغط هنا للتصوير</p>
              <span>يمكنك رفع عدة صور وفيديوهات معاً</span>
              <input type="file" id="fileInput" multiple accept="image/*,video/*" style="display: none;">
            </label>
            <div id="status"></div>
            <div id="gallery" class="gallery"></div>
          </div>

          <!-- Step 2: Signature -->
          <div class="card">
            <div class="card-title"><span>2</span> إمضاء الزبون</div>
            <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 15px;">برسمك لتوقيعك هنا، أنت تقر بصحة المعلومات وحالة السيارة المذكورة أعلاه.</p>
            <div class="sig-container">
              <canvas id="sig-canvas"></canvas>
            </div>
            <div class="sig-actions">
              <button class="btn btn-outline" id="clearBtn">مسح</button>
              <button class="btn btn-primary" id="saveSigBtn">حفظ التوقيع</button>
            </div>
          </div>
        </div>

        <div id="lightbox" class="lightbox">
          <div class="lb-topbar">
            <button class="lb-close" id="lb-close">✕</button>
            <span class="lb-counter" id="lb-counter">1 / 1</span>
            <a id="lb-download" href="#" download class="lb-download">⬇</a>
          </div>
          <div class="lb-main" id="lb-main">
            <button class="lb-nav-btn lb-nav-prev" id="lb-prev">&#8249;</button>
            <div class="lb-media-wrapper" id="lb-media-wrapper"></div>
            <button class="lb-nav-btn lb-nav-next" id="lb-next">&#8250;</button>
            <div class="lb-controls" id="lb-controls">
              <div class="lb-video-controls" id="lb-video-controls">
                <button id="lb-toggle-play" type="button" aria-label="تشغيل أو إيقاف">&#9654;</button>
                <input id="lb-video-range" class="lb-range" type="range" min="0" max="1000" value="0" aria-label="تقديم الفيديو">
                <button id="lb-mute" type="button" aria-label="الصوت">&#128266;</button>
                <span class="lb-time" id="lb-time">0:00 / 0:00</span>
              </div>
              <div class="lb-row">
                <button id="lb-zoom-out" type="button" aria-label="تصغير">-</button>
                <span class="lb-zoom-value" id="lb-zoom-value">100%</span>
                <button id="lb-zoom-in" type="button" aria-label="تكبير">+</button>
                <button id="lb-zoom-reset" type="button" aria-label="إرجاع الحجم">1:1</button>
              </div>
            </div>
          </div>
          <div class="lb-strip" id="lb-strip"></div>
        </div>

        <div id="toast" class="toast">تم الحفظ بنجاح</div>

        <div class="footer-note">
          نظام كراء السيارات الذكي &copy; 2024
        </div>

        <script>
          const rentalId = "${rentalId}";
          const gallery = document.getElementById('gallery');
          const status = document.getElementById('status');
          const toast = document.getElementById('toast');
          const rentalInfo = document.getElementById('rental-info');
          const lightbox = document.getElementById('lightbox');
          const lbMain = document.getElementById('lb-main');
          const lbControls = document.getElementById('lb-controls');
          const lbVideoControls = document.getElementById('lb-video-controls');
          const lbTogglePlay = document.getElementById('lb-toggle-play');
          const lbMute = document.getElementById('lb-mute');
          const lbVideoRange = document.getElementById('lb-video-range');
          const lbTime = document.getElementById('lb-time');
          const lbZoomValue = document.getElementById('lb-zoom-value');
          let mediaFiles = [];
          let currentLbIndex = 0;
          let zScale = 1, zX = 0, zY = 0, zLastTap = 0;
          let activeVideo = null;
          let isSeeking = false;
          let suppressMediaClick = false;

          function getActiveMedia() {
            return document.querySelector('#lb-media-wrapper img, #lb-media-wrapper video');
          }

          function updateZoomUI() {
            lbZoomValue.textContent = Math.round(zScale * 100) + '%';
          }

          function resetZoom() { zScale = 1; zX = 0; zY = 0; applyZoom(); }

          function applyZoom() {
            const el = getActiveMedia();
            if (el) el.style.transform = 'translate(' + zX + 'px,' + zY + 'px) scale(' + zScale + ')';
            updateZoomUI();
          }

          function clampZoom(el) {
            zScale = Math.max(1, Math.min(5, zScale));
            if (zScale <= 1) { zX = 0; zY = 0; return; }
            if (!el) return;
            const maxX = (el.clientWidth * (zScale - 1)) / 2;
            const maxY = (el.clientHeight * (zScale - 1)) / 2;
            zX = Math.max(-maxX, Math.min(maxX, zX));
            zY = Math.max(-maxY, Math.min(maxY, zY));
          }

          function setZoom(nextScale) {
            zScale = nextScale;
            clampZoom(getActiveMedia());
            applyZoom();
          }

          function formatTime(seconds) {
            if (!Number.isFinite(seconds)) return '0:00';
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
            return mins + ':' + secs;
          }

          function refreshVideoControls() {
            if (!activeVideo) return;
            const duration = activeVideo.duration || 0;
            const current = activeVideo.currentTime || 0;
            lbTogglePlay.innerHTML = activeVideo.paused ? '&#9654;' : '&#10074;&#10074;';
            lbMute.innerHTML = activeVideo.muted ? '&#128263;' : '&#128266;';
            lbTime.textContent = formatTime(current) + ' / ' + formatTime(duration);
            if (!isSeeking && duration > 0) {
              lbVideoRange.value = Math.round((current / duration) * 1000);
            }
          }

          async function toggleVideo() {
            if (!activeVideo) return;
            if (activeVideo.paused) {
              try { await activeVideo.play(); } catch (err) {}
            } else {
              activeVideo.pause();
            }
            refreshVideoControls();
          }

          function bindVideo(video) {
            activeVideo = video;
            lbVideoControls.style.display = 'grid';
            video.onloadedmetadata = refreshVideoControls;
            video.ontimeupdate = refreshVideoControls;
            video.onplay = refreshVideoControls;
            video.onpause = refreshVideoControls;
            video.onvolumechange = refreshVideoControls;
            video.onended = refreshVideoControls;
            refreshVideoControls();
          }

          function clearVideoControls() {
            activeVideo = null;
            lbVideoControls.style.display = 'none';
            lbVideoRange.value = 0;
            lbTime.textContent = '0:00 / 0:00';
          }

          function suppressNextMediaClick() {
            suppressMediaClick = true;
            setTimeout(() => { suppressMediaClick = false; }, 350);
          }

          function showToast(msg) {
            toast.innerText = msg;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
          }

          const formatDateLocal = (dateStr) => {
            if (!dateStr) return '--';
            const parts = String(dateStr).split('T')[0].split('-');
            if (parts.length === 3) {
              return parts[2] + '/' + parts[1] + '/' + parts[0];
            }
            return dateStr;
          };

          async function loadDetails() {
            try {
              const res = await fetch('/details/' + rentalId);
              const data = await res.json();
              if (data.success) {
                const r = data.data;
                rentalInfo.innerHTML = \`
                  <div class="info-item"><span>السيارة</span><strong>\${r.brand} \${r.model}</strong></div>
                  <div class="info-item"><span>اللوحة</span><strong dir="ltr">\${r.plateNumber}</strong></div>
                  <div class="info-item"><span>الزبون</span><strong>\${r.customerName}</strong></div>
                  <div class="info-item"><span>المبلغ</span><strong>\${r.totalPrice} درهم</strong></div>
                  <div class="info-item"><span>تاريخ البداية</span><strong>\${formatDateLocal(r.startDate)}</strong></div>
                  <div class="info-item"><span>تاريخ النهاية</span><strong>\${formatDateLocal(r.endDate)}</strong></div>
                \`;
              }
            } catch (err) { rentalInfo.innerHTML = 'خطأ في جلب البيانات'; }
          }

          function stopCurrentVideo() {
            const vid = document.getElementById('lb-video');
            if (vid) vid.pause();
          }

        

          function buildStrip() {
            const strip = document.getElementById('lb-strip');
            strip.innerHTML = '';
            mediaFiles.forEach((item, i) => {
              const t = document.createElement('div');
              t.className = 'lb-thumb' + (i === currentLbIndex ? ' active' : '');
              t.innerHTML = item.isVideo
                ? '<video src="' + item.url + '#t=0.1" muted playsinline preload="metadata"></video><span class="lb-thumb-play">&#9654;</span>'
                : '<img src="' + item.url + '" alt="">';
              t.onclick = () => { stopCurrentVideo(); currentLbIndex = i; renderLb(); };
              strip.appendChild(t);
            });
          }

          function renderLb() {
            zScale = 1; zX = 0; zY = 0;
            const item = mediaFiles[currentLbIndex];
            const wrapper = document.getElementById('lb-media-wrapper');
            document.getElementById('lb-counter').textContent = (currentLbIndex + 1) + ' / ' + mediaFiles.length;
            document.getElementById('lb-download').href = item.url;
            document.getElementById('lb-download').download = item.name;
            if (item.isVideo) {
              wrapper.innerHTML = '<video id="lb-video" src="' + item.url + '" playsinline preload="metadata"></video>';
              const vid = document.getElementById('lb-video');
              bindVideo(vid);
              wrapper.onclick = () => { if (!suppressMediaClick) toggleVideo(); };
              vid.onplay = () => { refreshVideoControls(); };
              vid.onpause = () => { refreshVideoControls(); };
              applyZoom();
            } else {
              clearVideoControls();
              wrapper.innerHTML = '<img src="' + item.url + '" alt="">';
              wrapper.onclick = null;
              applyZoom();
            }
            document.querySelectorAll('.lb-thumb').forEach((t, i) => t.classList.toggle('active', i === currentLbIndex));
            const active = document.querySelector('.lb-thumb.active');
            if (active) active.scrollIntoView({ inline: 'center', behavior: 'smooth' });
          }

          function openLightbox(index) {
            if (!mediaFiles.length) return;
            currentLbIndex = index;
            lightbox.style.display = 'flex';
            buildStrip();
            renderLb();
          }

          function goToMedia(nextIndex) {
            stopCurrentVideo();
            currentLbIndex = (nextIndex + mediaFiles.length) % mediaFiles.length;
            renderLb();
            buildStrip();
          }

          document.getElementById('lb-close').onclick = () => { stopCurrentVideo(); lightbox.style.display = 'none'; };
          document.getElementById('lb-prev').onclick = () => goToMedia(currentLbIndex - 1);
          document.getElementById('lb-next').onclick = () => goToMedia(currentLbIndex + 1);
          document.getElementById('lb-zoom-out').onclick = () => setZoom(zScale - 0.5);
          document.getElementById('lb-zoom-in').onclick = () => setZoom(zScale + 0.5);
          document.getElementById('lb-zoom-reset').onclick = resetZoom;
          lbTogglePlay.onclick = toggleVideo;
          lbMute.onclick = () => { if (activeVideo) { activeVideo.muted = !activeVideo.muted; refreshVideoControls(); } };
          lbVideoRange.addEventListener('input', () => {
            if (!activeVideo || !activeVideo.duration) return;
            isSeeking = true;
            activeVideo.currentTime = (Number(lbVideoRange.value) / 1000) * activeVideo.duration;
            refreshVideoControls();
          });
          lbVideoRange.addEventListener('change', () => { isSeeking = false; refreshVideoControls(); });
          ['click', 'touchstart', 'touchmove', 'pointerdown'].forEach(evt => {
            lbControls.addEventListener(evt, e => e.stopPropagation(), { passive: evt === 'touchmove' });
          });

          // Unified gesture handler: pinch zoom, pan, double tap, and swipe.
          let _pinchStart = null, _panStart = null, _swipeStartX = 0, _isSwiping = false;

          lbMain.addEventListener('touchstart', e => {
            if (e.touches.length === 2) {
              _isSwiping = false; _panStart = null;
              _pinchStart = {
                dist: Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY),
                scale: zScale, x: zX, y: zY
              };
              e.preventDefault();
            } else if (e.touches.length === 1) {
              _pinchStart = null;
              const now = Date.now();
              if (now - zLastTap < 280) {
                // Double-tap: toggle zoom
                if (zScale > 1) { resetZoom(); } else { setZoom(2.5); }
                suppressNextMediaClick();
                zLastTap = 0; e.preventDefault(); return;
              }
              zLastTap = now;
              _swipeStartX = e.touches[0].clientX;
              if (zScale > 1) {
                _panStart = { x: e.touches[0].clientX - zX, y: e.touches[0].clientY - zY };
                _isSwiping = false;
              } else {
                _panStart = null; _isSwiping = true;
              }
            }
          }, { passive: false });

          lbMain.addEventListener('touchmove', e => {
            if (e.touches.length === 2 && _pinchStart) {
              const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
              zScale = _pinchStart.scale * (dist / _pinchStart.dist);
              const el = getActiveMedia();
              clampZoom(el); applyZoom();
              suppressNextMediaClick();
              e.preventDefault();
            } else if (e.touches.length === 1 && _panStart && zScale > 1) {
              zX = e.touches[0].clientX - _panStart.x;
              zY = e.touches[0].clientY - _panStart.y;
              const el = getActiveMedia();
              clampZoom(el); applyZoom();
              suppressNextMediaClick();
              e.preventDefault();
            }
          }, { passive: false });

          lbMain.addEventListener('touchend', e => {
            if (_pinchStart) {
              const el = getActiveMedia();
              clampZoom(el); applyZoom();
              _pinchStart = null;
            } else if (_panStart) {
              _panStart = null;
            } else if (_isSwiping && zScale <= 1 && e.changedTouches.length === 1) {
              const dx = e.changedTouches[0].clientX - _swipeStartX;
              if (Math.abs(dx) > 50) {
                suppressNextMediaClick();
                goToMedia(dx > 0 ? currentLbIndex - 1 : currentLbIndex + 1);
              }
            }
            _isSwiping = false;
          }, { passive: true });

          lbMain.addEventListener('wheel', e => {
            if (lightbox.style.display !== 'flex') return;
            e.preventDefault();
            setZoom(zScale + (e.deltaY < 0 ? 0.25 : -0.25));
          }, { passive: false });

          async function loadFiles() {
            const res = await fetch('/files/' + rentalId);
            const data = await res.json();
            gallery.innerHTML = '';
            mediaFiles = [];
            const validFiles = data.files.filter(f => f !== 'signature.png');
            validFiles.forEach(file => {
              mediaFiles.push({
                name: file,
                url: '/files/rentals/' + encodeURIComponent(rentalId) + '/' + encodeURIComponent(file),
                isVideo: /\.(mp4|mov|webm)$/i.test(file)
              });
            });
            mediaFiles.forEach((item, index) => {
              const div = document.createElement('div');
              div.className = 'media-item';
              if (item.isVideo) {
                div.innerHTML = '<video src="' + item.url + '#t=0.1" muted playsinline preload="metadata"></video>';
                const pb = document.createElement('div');
                pb.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:22px;color:white;text-shadow:0 2px 8px rgba(0,0,0,0.8);pointer-events:none;';
                pb.innerHTML = '&#9654;';
                div.appendChild(pb);
              } else {
                div.innerHTML = '<img src="' + item.url + '" alt="">';
              }
              div.onclick = () => openLightbox(index);
              const delBtn = document.createElement('button');
              delBtn.className = 'del-btn';
              delBtn.innerHTML = '&times;';
              delBtn.onclick = (e) => { e.stopPropagation(); deleteFile(item.name); };
              div.appendChild(delBtn);
              gallery.appendChild(div);
            });
          }

          async function deleteFile(filename) {
            if(!confirm('هل تريد مسح هذا الملف؟')) return;
            const res = await fetch('/files/' + encodeURIComponent(rentalId) + '/' + encodeURIComponent(filename), { method: 'DELETE' });
            if((await res.json()).success) loadFiles();
          }

          document.getElementById('fileInput').onchange = async (e) => {
            const files = e.target.files;
            if (!files.length) return;
            
            status.style.display = 'block';
            status.style.background = '#f1f5f9';
            status.innerText = '⏳ جاري الرفع... (0/' + files.length + ')';
            
            const formData = new FormData();
            for (let file of files) formData.append('files', file);
            
            try {
              const res = await fetch('/upload/' + rentalId, { method: 'POST', body: formData });
              const data = await res.json();
              if (data.success) {
                status.style.background = '#d1fae5';
                status.innerText = '✅ تم رفع ' + files.length + ' ملف بنجاح';
                loadFiles();
                setTimeout(() => status.style.display = 'none', 3000);
              }
            } catch (err) {
              status.style.background = '#fee2e2';
              status.innerText = '❌ خطأ في الرفع';
            }
          };

          // Signature Logic
          const canvas = document.getElementById('sig-canvas');
          const ctx = canvas.getContext('2d');
          let drawing = false;

          function resizeCanvas() {
            const rect = canvas.parentNode.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = 200;
          }
          window.addEventListener('resize', resizeCanvas);
          resizeCanvas();

          function getPos(e) {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return { x: clientX - rect.left, y: clientY - rect.top };
          }

          canvas.addEventListener('touchstart', (e) => { drawing = true; const pos = getPos(e); ctx.beginPath(); ctx.moveTo(pos.x, pos.y); e.preventDefault(); });
          canvas.addEventListener('touchmove', (e) => { if(!drawing) return; const pos = getPos(e); ctx.lineTo(pos.x, pos.y); ctx.stroke(); e.preventDefault(); });
          canvas.addEventListener('touchend', () => { drawing = false; });
          
          canvas.addEventListener('mousedown', (e) => { drawing = true; const pos = getPos(e); ctx.beginPath(); ctx.moveTo(pos.x, pos.y); });
          canvas.addEventListener('mousemove', (e) => { if(!drawing) return; const pos = getPos(e); ctx.lineTo(pos.x, pos.y); ctx.stroke(); });
          canvas.addEventListener('mouseup', () => { drawing = false; });

          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';

          document.getElementById('clearBtn').onclick = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          };

          document.getElementById('saveSigBtn').onclick = async () => {
            const dataUrl = canvas.toDataURL('image/png');
            const res = await fetch('/signature/' + rentalId, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ signature: dataUrl })
            });
            const data = await res.json();
            if(data.success) {
              showToast('✅ تم حفظ التوقيع بنجاح');
              document.getElementById('saveSigBtn').style.background = '#10b981';
              document.getElementById('saveSigBtn').innerText = 'تم الحفظ ✅';
            }
          };

          loadFiles();
          loadDetails();
        </script>
      </body>
      </html>
    `);
  });

  uploadApp.use((err, req, res, next) => {
    console.error('[Mobile Server Error]', err);
    res.status(500).json({ success: false, error: err.message });
  });

  uploadServer = uploadApp.listen(3001, '0.0.0.0', () => {
    console.log('Upload server running on port 3001');
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'src/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: false  // FIX: sandbox:true blocks some input events on Windows
    },
    frame: false,
    show: false,
    icon: path.join(__dirname, 'assets/icon.ico'),
    backgroundColor: '#f8fafc'
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, 'build/index.html')}`;

  mainWindow.loadURL(startUrl);
  Menu.setApplicationMenu(null);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus(); // FIX: ensure window is focused on show
  });

  // FIX: Re-focus webContents when window regains focus to restore input responsiveness
  mainWindow.on('focus', () => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.focus();
    }
  });

  // FIX: Handle window blur - ensure inputs stay responsive after switching back
  mainWindow.on('blur', () => {
    // Keep webContents active even when window loses OS focus
    if (mainWindow && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.setBackgroundThrottling(false);
    }
  });

  // if (isDev) {
  //   mainWindow.webContents.openDevTools();
  // }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function initializeApp() {
  try {
    const dbPath = path.join(app.getPath('userData'), 'carental.db');
    const backupDir = path.join(app.getPath('userData'), 'backups');

    // Auto-restore logic: if db is missing or empty, import the latest backup
    if (!fs.existsSync(dbPath) || fs.statSync(dbPath).size === 0) {
      if (fs.existsSync(backupDir)) {
        const backupFiles = fs.readdirSync(backupDir).filter(f => f.endsWith('.db')).sort().reverse();
        if (backupFiles.length > 0) {
          const latestBackup = path.join(backupDir, backupFiles[0]);
          fs.copyFileSync(latestBackup, dbPath);
          console.log(`Auto-restored database from latest backup: ${latestBackup}`);
        }
      }
    }

    // Initialize managers
    database = new Database(dbPath);
    await database.init();

    setupUploadServer();

    backupManager = new BackupManager(database, app.getPath('userData'));

    // Setup IPC handlers
    setupIpcHandlers();

    // Create window
    createWindow();

    // Start daily backup
    backupManager.startDailyBackup();

  } catch (error) {
    console.error('Failed to initialize app:', error);
    dialog.showErrorBox('خطأ التهيئة', 'فشل في تهيئة التطبيق');
    app.quit();
  }
}

async function checkAppStatus() {
  const trial = await trialManager.getTrialStatus();
  const token = await tokenManager.getActiveToken();

  if (token && token.isBlocked) {
    return {
      isActive: false,
      isBlocked: true,
      trialExpired: trial.isExpired,
      daysRemaining: 0
    };
  }

  if (trial.isActive) {
    return {
      isActive: true,
      isBlocked: false,
      trialExpired: false,
      daysRemaining: trial.daysRemaining,
      hoursRemaining: trial.hoursRemaining,
      minutesRemaining: trial.minutesRemaining,
      secondsRemaining: trial.secondsRemaining,
      trialEndDate: trial.endDate ? new Date(trial.endDate).toISOString() : null
    };
  }

  if (token && token.isValid) {
    return {
      isActive: true,
      isBlocked: false,
      trialExpired: false,
      daysRemaining: null,
      hoursRemaining: null,
      minutesRemaining: null,
      secondsRemaining: null
    };
  }

  return {
    isActive: false,
    isBlocked: false,
    trialExpired: trial.isExpired,
    daysRemaining: 0,
    hoursRemaining: 0,
    minutesRemaining: 0,
    secondsRemaining: 0
  };
}

function setupIpcHandlers() {
  ipcMain.handle('open-external', async (event, url) => {
    shell.openExternal(url);
  });

  ipcMain.handle('show-message', async (event, options = {}) => {
    const message = options.message || '';
    const title = options.title || 'Cars Pod';
    const type = options.type || 'info';
    const okLabel = options.okLabel || 'OK';

    await dialog.showMessageBox(mainWindow, {
      type,
      title,
      message,
      buttons: [okLabel],
      defaultId: 0,
      cancelId: 0,
      noLink: true
    });

    return { success: true };
  });

  ipcMain.handle('show-confirm', async (event, options = {}) => {
    const message = options.message || '';
    const title = options.title || 'Cars Pod';
    const confirmLabel = options.confirmLabel || 'OK';
    const cancelLabel = options.cancelLabel || 'Cancel';

    const result = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      title,
      message,
      buttons: [confirmLabel, cancelLabel],
      defaultId: 0,
      cancelId: 1,
      noLink: true
    });

    return { confirmed: result.response === 0 };
  });
  // Trial & Activation
  ipcMain.handle('get-app-status', async () => {
    return checkAppStatus();
  });

  ipcMain.handle('verify-token', async (event, token) => {
    try {
      const result = await verifyTokenWithAPI(token);
      if (result.valid) {
        await tokenManager.saveToken(token, result.expirationDate);
        startLicensePing();
        return { success: true, message: 'تم تفعيل التطبيق بنجاح' };
      }
      return { success: false, message: result.message || 'التوكن غير صحيح' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle('start-trial', async () => {
    await trialManager.initializeTrial();
    return await checkAppStatus(); // ensures proper ISO string serialization
  });


  // Database Operations
  ipcMain.handle('add-car', async (event, carData) => {
    try {
      const result = await database.addCar(carData);
      if (backupManager) backupManager.scheduleAutoBackup();
      return { success: true, id: result.lastID };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-cars', async (event, filters) => {
    try {
      const cars = await database.getCars(filters);
      return { success: true, data: cars };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('update-car', async (event, carData) => {
    try {
      await database.updateCar(carData);
      if (backupManager) backupManager.scheduleAutoBackup();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('delete-car', async (event, carId) => {
    try {
      await database.deleteCar(carId);
      if (backupManager) backupManager.scheduleAutoBackup();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Customers
  ipcMain.handle('add-customer', async (event, customerData) => {
    try {
      const result = await database.addCustomer(customerData);
      if (backupManager) backupManager.scheduleAutoBackup();
      return { success: true, id: result.lastID };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-customers', async (event, filters = {}) => {
    try {
      const customers = await database.getCustomers(filters);
      return { success: true, data: customers };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('update-customer', async (event, customerData) => {
    try {
      await database.updateCustomer(customerData);
      if (backupManager) backupManager.scheduleAutoBackup();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('delete-customer', async (event, customerId) => {
    try {
      await database.deleteCustomer(customerId);
      if (backupManager) backupManager.scheduleAutoBackup();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Rentals
  ipcMain.handle('create-rental', async (event, rentalData) => {
    try {
      const result = await database.createRental(rentalData);
      if (backupManager) backupManager.scheduleAutoBackup();
      return { success: true, id: result.lastID };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-rentals', async (event, filters = {}) => {
    try {
      const rentals = await database.getRentals(filters);
      return { success: true, data: rentals };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('end-rental', async (event, rentalId, finalData) => {
    try {
      await database.endRental(rentalId, finalData);
      if (backupManager) backupManager.scheduleAutoBackup();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('delete-rental', async (event, rentalId) => {
    try {
      await database.deleteRental(rentalId);
      if (backupManager) backupManager.scheduleAutoBackup();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Payments
  ipcMain.handle('record-payment', async (event, paymentData) => {
    try {
      const result = await database.recordPayment(paymentData);
      if (backupManager) backupManager.scheduleAutoBackup();
      return { success: true, id: result.lastID };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-payments', async (event, filters = {}) => {
    try {
      const payments = await database.getPayments(filters);
      return { success: true, data: payments };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('delete-payment', async (event, paymentId) => {
    try {
      await database.deletePayment(paymentId);
      if (backupManager) backupManager.scheduleAutoBackup();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Reports
  ipcMain.handle('get-daily-report', async (event, date) => {
    try {
      const report = await database.getDailyReport(date);
      return { success: true, data: report };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-income-report', async (event, startDate, endDate) => {
    try {
      const report = await database.getIncomeReport(startDate, endDate);
      return { success: true, data: report };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-detailed-financial-report', async (event, startDate, endDate) => {
    try {
      const report = await database.getDetailedFinancialReport(startDate, endDate);
      return { success: true, data: report };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-car-performance', async () => {
    try {
      const report = await database.getCarPerformance();
      return { success: true, data: report };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Expenses
  ipcMain.handle('add-expense', async (event, expenseData) => {
    try {
      const result = await database.addExpense(expenseData);
      if (backupManager) backupManager.scheduleAutoBackup();
      return { success: true, id: result.lastID };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-expenses', async (event, filters) => {
    try {
      const expenses = await database.getExpenses(filters);
      return { success: true, data: expenses };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('delete-expense', async (event, id) => {
    try {
      await database.deleteExpense(id);
      if (backupManager) backupManager.scheduleAutoBackup();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Maintenance
  ipcMain.handle('add-maintenance', async (event, recordData) => {
    try {
      const result = await database.addMaintenanceRecord(recordData);
      if (backupManager) backupManager.scheduleAutoBackup();
      return { success: true, id: result.lastID };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-maintenance', async (event, carId) => {
    try {
      const records = await database.getMaintenanceRecords(carId);
      return { success: true, data: records };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('delete-maintenance', async (event, id) => {
    try {
      await database.deleteMaintenanceRecord(id);
      if (backupManager) backupManager.scheduleAutoBackup();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Settings
  ipcMain.handle('get-settings', async () => {
    try {
      const settings = await database.getSettings();
      return { success: true, data: settings };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('update-settings', async (event, settingsData) => {
    try {
      await database.updateSettings(settingsData);
      if (backupManager) backupManager.scheduleAutoBackup();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Backup
  ipcMain.handle('create-backup', async () => {
    try {
      const backupPath = await backupManager.createManualBackup();
      return { success: true, path: backupPath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('restore-backup', async (event, backupPath) => {
    try {
      await backupManager.restoreBackup(backupPath);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-backups', async () => {
    try {
      const backups = await backupManager.listBackups();
      return { success: true, data: backups };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Window Controls
  ipcMain.on('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('window-close', () => {
    if (mainWindow) mainWindow.close();
  });
  ipcMain.handle('get-server-url', async () => {
    const interfaces = os.networkInterfaces();
    let ip = 'localhost';
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          ip = iface.address;
          break;
        }
      }
    }
    return `http://${ip}:3001`;
  });

  ipcMain.handle('save-file', async (event, content, defaultName) => {
    try {
      const extension = path.extname(defaultName || '').replace('.', '').toLowerCase();
      const filters = extension === 'xls' || extension === 'xlsx'
        ? [{ name: 'Excel Files', extensions: ['xls', 'xlsx'] }]
        : [{ name: 'CSV Files', extensions: ['csv'] }];
      const { filePath } = await dialog.showSaveDialog(mainWindow, {
        defaultPath: defaultName,
        filters
      });

      if (filePath) {
        fs.writeFileSync(filePath, content);
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-rental-media', async (event, rentalId) => {
    try {
      const dir = path.join(app.getPath('userData'), 'uploads', 'rentals', rentalId.toString());
      if (!fs.existsSync(dir)) return { success: true, files: [] };
      const files = fs.readdirSync(dir);
      return { success: true, files };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('pick-and-save-image', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['jpg', 'png', 'jpeg', 'webp'] }]
      });

      if (result.canceled || result.filePaths.length === 0) return { success: false };

      const sourcePath = result.filePaths[0];
      const fileName = `${Date.now()}-${path.basename(sourcePath)}`;
      const destDir = path.join(app.getPath('userData'), 'uploads', 'cars');

      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

      const destPath = path.join(destDir, fileName);
      fs.copyFileSync(sourcePath, destPath);

      // Return the relative path from the uploads folder
      return { success: true, path: `cars/${fileName}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('open-external-media', async (event, rentalId, filename) => {
    try {
      const filePath = path.join(app.getPath('userData'), 'uploads', 'rentals', rentalId.toString(), filename);
      if (fs.existsSync(filePath)) {
        await shell.openPath(filePath);
        return { success: true };
      }
      return { success: false, error: 'File not found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-printers', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return [];
    try {
      const printers = await win.webContents.getPrintersAsync();
      return printers;
    } catch (error) {
      console.error('Failed to get printers:', error);
      return [];
    }
  });

  ipcMain.handle('print-document', async (event, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return { success: false, error: 'No window' };
    return new Promise((resolve) => {
      win.webContents.print(options, (success, errorType) => {
        resolve({ success, errorType });
      });
    });
  });
}

app.on('ready', initializeApp);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

