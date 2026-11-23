const fs = require('fs').promises;
const path = require('path');
const fsSync = require('fs');

class BackupManager {
  constructor(database, userDataPath) {
    this.database = database;
    this.userDataPath = userDataPath;
    this.backupDir = path.join(userDataPath, 'backups');
    this.ensureBackupDir();
  }

  ensureBackupDir() {
    if (!fsSync.existsSync(this.backupDir)) {
      fsSync.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  getBackupFilename(type = 'auto') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `backup_${type}_${timestamp}.db`;
  }

  async createManualBackup() {
    try {
      this.ensureBackupDir();
      const filename = this.getBackupFilename('manual');
      const backupPath = path.join(this.backupDir, filename);

      // Copy database file
      const dbPath = path.join(this.userDataPath, 'carental.db');
      await fs.copyFile(dbPath, backupPath);

      // Also create a metadata file
      const metadata = {
        timestamp: new Date().toISOString(),
        type: 'manual',
        filename: filename,
        size: (await fs.stat(backupPath)).size
      };

      const metadataPath = backupPath + '.json';
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

      console.log(`Manual backup created: ${backupPath}`);
      return backupPath;
    } catch (error) {
      throw new Error(`Failed to create manual backup: ${error.message}`);
    }
  }

  async createAutoBackup() {
    try {
      this.ensureBackupDir();
      const filename = this.getBackupFilename('auto');
      const backupPath = path.join(this.backupDir, filename);

      const dbPath = path.join(this.userDataPath, 'carental.db');
      await fs.copyFile(dbPath, backupPath);

      const metadata = {
        timestamp: new Date().toISOString(),
        type: 'auto',
        filename: filename,
        size: (await fs.stat(backupPath)).size
      };

      const metadataPath = backupPath + '.json';
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

      // Keep only last 30 auto backups
      await this.cleanOldAutoBackups(30);

      console.log(`Auto backup created: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error(`Failed to create auto backup: ${error.message}`);
    }
  }

  scheduleAutoBackup() {
    if (this.backupTimeout) {
      clearTimeout(this.backupTimeout);
    }
    // Schedule backup for 1 minute (60000 ms) after the last change
    this.backupTimeout = setTimeout(() => {
      this.createAutoBackup();
    }, 60 * 1000);
  }

  async cleanOldAutoBackups(keepCount = 30) {
    try {
      const files = await fs.readdir(this.backupDir);
      const autoBackups = files
        .filter(f => f.startsWith('backup_auto_') && f.endsWith('.db'))
        .sort()
        .reverse();

      if (autoBackups.length > keepCount) {
        for (let i = keepCount; i < autoBackups.length; i++) {
          const fileToDelete = path.join(this.backupDir, autoBackups[i]);
          const metadataFile = fileToDelete + '.json';

          try {
            await fs.unlink(fileToDelete);
            if (fsSync.existsSync(metadataFile)) {
              await fs.unlink(metadataFile);
            }
          } catch (error) {
            console.warn(`Failed to delete old backup ${autoBackups[i]}`);
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to clean old backups: ${error.message}`);
    }
  }

  async restoreBackup(backupPath) {
    try {
      if (!fsSync.existsSync(backupPath)) {
        throw new Error('Backup file not found');
      }

      // Close current database
      await this.database.close();

      // Backup current database first
      const dbPath = path.join(this.userDataPath, 'carental.db');
      const emergencyBackup = path.join(this.backupDir, `backup_emergency_${Date.now()}.db`);
      
      if (fsSync.existsSync(dbPath)) {
        await fs.copyFile(dbPath, emergencyBackup);
      }

      // Restore from backup
      await fs.copyFile(backupPath, dbPath);

      // Reinitialize database
      await this.database.init();

      console.log(`Backup restored from: ${backupPath}`);
      return { success: true, message: 'تم استعادة النسخة الاحتياطية بنجاح' };
    } catch (error) {
      // Try to restore emergency backup
      try {
        const emergencyBackup = fsSync.readdirSync(this.backupDir)
          .filter(f => f.startsWith('backup_emergency_'))
          .sort()
          .pop();

        if (emergencyBackup) {
          const emergencyPath = path.join(this.backupDir, emergencyBackup);
          const dbPath = path.join(this.userDataPath, 'carental.db');
          await fs.copyFile(emergencyPath, dbPath);
          await this.database.init();
        }
      } catch (fallbackError) {
        console.error('Failed to restore emergency backup:', fallbackError);
      }

      throw new Error(`Failed to restore backup: ${error.message}`);
    }
  }

  async listBackups() {
    try {
      this.ensureBackupDir();
      const files = await fs.readdir(this.backupDir);
      const backups = [];

      for (const file of files) {
        if (file.endsWith('.db')) {
          const fullPath = path.join(this.backupDir, file);
          const stat = await fs.stat(fullPath);
          const metadataPath = fullPath + '.json';

          let metadata = {
            timestamp: new Date(stat.mtime).toISOString(),
            type: file.includes('auto') ? 'auto' : 'manual',
            filename: file,
            size: stat.size,
            path: fullPath
          };

          // Try to load metadata if exists
          try {
            if (fsSync.existsSync(metadataPath)) {
              const metadataContent = await fs.readFile(metadataPath, 'utf-8');
              metadata = JSON.parse(metadataContent);
              metadata.path = fullPath;
            }
          } catch (error) {
            // Use default metadata
          }

          backups.push(metadata);
        }
      }

      return backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      throw new Error(`Failed to list backups: ${error.message}`);
    }
  }

  startDailyBackup() {
    // Create backup at 2 AM daily
    const now = new Date();
    let scheduledTime = new Date(now);
    scheduledTime.setHours(2, 0, 0, 0);

    if (scheduledTime < now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const timeUntilBackup = scheduledTime - now;

    console.log(`Daily backup scheduled for ${scheduledTime.toLocaleString()}`);

    setTimeout(() => {
      this.createAutoBackup();
      // Then repeat every 24 hours
      setInterval(() => this.createAutoBackup(), 24 * 60 * 60 * 1000);
    }, timeUntilBackup);
  }

  async getBackupInfo(backupPath) {
    try {
      const stat = await fs.stat(backupPath);
      const metadataPath = backupPath + '.json';

      let info = {
        size: stat.size,
        createdAt: stat.birthtime,
        modifiedAt: stat.mtime
      };

      if (fsSync.existsSync(metadataPath)) {
        const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
        info = { ...info, ...metadata };
      }

      return info;
    } catch (error) {
      throw new Error(`Failed to get backup info: ${error.message}`);
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

module.exports = BackupManager;