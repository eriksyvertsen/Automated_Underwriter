// services/backupService.js

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class BackupService {
  constructor() {
    this.backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
    this.backupSchedule = {
      daily: {
        interval: 24 * 60 * 60 * 1000, // 24 hours
        keep: 7 // Keep 7 daily backups
      },
      weekly: {
        interval: 7 * 24 * 60 * 60 * 1000, // 7 days
        keep: 4 // Keep 4 weekly backups
      },
      monthly: {
        interval: 30 * 24 * 60 * 60 * 1000, // 30 days
        keep: 3 // Keep 3 monthly backups
      }
    };

    this.lastBackup = {
      daily: null,
      weekly: null,
      monthly: null
    };

    // Initialize
    this.init();
  }

  async init() {
    try {
      // Ensure backup directory exists
      await fs.mkdir(this.backupDir, { recursive: true });

      // Create subdirectories
      await Promise.all([
        fs.mkdir(path.join(this.backupDir, 'daily'), { recursive: true }),
        fs.mkdir(path.join(this.backupDir, 'weekly'), { recursive: true }),
        fs.mkdir(path.join(this.backupDir, 'monthly'), { recursive: true })
      ]);

      // Schedule backups
      this.scheduleBackups();

      console.log('Backup service initialized successfully');
    } catch (error) {
      console.error('Error initializing backup service:', error);
    }
  }

  /**
   * Schedule regular backups
   */
  scheduleBackups() {
    // Check if daily backup is needed
    setInterval(() => this.checkAndRunBackup('daily'), 60 * 60 * 1000); // Check every hour

    // Check if weekly backup is needed
    setInterval(() => this.checkAndRunBackup('weekly'), 6 * 60 * 60 * 1000); // Check every 6 hours

    // Check if monthly backup is needed
    setInterval(() => this.checkAndRunBackup('monthly'), 24 * 60 * 60 * 1000); // Check every day

    // Run initial checks
    setTimeout(() => {
      this.checkAndRunBackup('daily');
      this.checkAndRunBackup('weekly');
      this.checkAndRunBackup('monthly');
    }, 5000); // Wait 5 seconds after startup
  }

  /**
   * Check if backup is needed and run if so
   */
  async checkAndRunBackup(type) {
    try {
      const now = Date.now();
      const lastBackup = this.lastBackup[type];
      const interval = this.backupSchedule[type].interval;

      // If no backup has been done or interval has passed
      if (!lastBackup || now - lastBackup > interval) {
        // Run backup
        await this.runBackup(type);

        // Update last backup time
        this.lastBackup[type] = now;

        // Clean up old backups
        await this.cleanupOldBackups(type);
      }
    } catch (error) {
      console.error(`Error checking/running ${type} backup:`, error);
    }
  }

  /**
   * Run a database backup
   */
  async runBackup(type) {
    try {
      console.log(`Starting ${type} backup...`);

      // Generate filename
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const filename = `backup-${type}-${timestamp}.gz`;
      const filepath = path.join(this.backupDir, type, filename);

      // Run the database backup
      // For MongoDB, we'd use mongodump
      // For Replit DB, we'll create a JSON export

      if (process.env.MONGODB_URI) {
        // MongoDB backup
        await this.backupMongoDB(filepath);
      } else {
        // Replit DB backup
        await this.backupReplitDB(filepath);
      }

      console.log(`${type} backup completed: ${filepath}`);

      return {
        success: true,
        filename,
        filepath,
        timestamp: new Date(),
        type
      };
    } catch (error) {
      console.error(`Error running ${type} backup:`, error);
      throw error;
    }
  }

  /**
   * Backup MongoDB database
   */
  async backupMongoDB(filepath) {
    // In a production environment, we'd use mongodump
    // For Replit environment, we'll use mongoexport for simplicity

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI is not set');

    try {
      // Get collection names
      const { getCollection } = require('../config/db');
      const usersCollection = await getCollection('users');
      const db = usersCollection.dbName;

      // Get list of collections
      const collections = await usersCollection.db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);

      // Create a directory for this backup
      const backupDir = filepath.replace('.gz', '');
      await fs.mkdir(backupDir, { recursive: true });

      // Export each collection
      for (const collection of collectionNames) {
        const outputFile = path.join(backupDir, `${collection}.json`);

        // Using mongoexport (requires mongodump to be installed)
        // This is simplified and would need to be adapted for Replit environment
        await execPromise(`mongoexport --uri="${mongoUri}" --collection=${collection} --out=${outputFile}`);
      }

      // Compress the backup
      await execPromise(`tar -czf ${filepath} -C ${backupDir} .`);

      // Remove the temporary directory
      await execPromise(`rm -rf ${backupDir}`);
    } catch (error) {
      console.error('Error backing up MongoDB:', error);
      throw error;
    }
  }

  /**
   * Backup Replit DB
   */
  async backupReplitDB(filepath) {
    try {
      // Get Replit DB client
      const { replitDb } = require('../config/db');

      // Get all keys
      const keys = await replitDb.list();

      // Create a data object with all values
      const data = {};

      for (const key of keys) {
        data[key] = await replitDb.get(key);
      }

      // Write data to file
      const tempFile = filepath.replace('.gz', '.json');
      await fs.writeFile(tempFile, JSON.stringify(data, null, 2));

      // Compress the file
      await execPromise(`gzip ${tempFile}`);

      console.log(`Replit DB backup saved to ${filepath}`);
    } catch (error) {
      console.error('Error backing up Replit DB:', error);
      throw error;
    }
  }

  /**
   * Clean up old backups
   */
  async cleanupOldBackups(type) {
    try {
      const backupPath = path.join(this.backupDir, type);

      // Read all backup files
      const files = await fs.readdir(backupPath);

      // Sort by creation time (newest first)
      const fileStats = await Promise.all(
        files.map(async file => {
          const filePath = path.join(backupPath, file);
          const stats = await fs.stat(filePath);
          return { file, filePath, mtime: stats.mtime };
        })
      );

      fileStats.sort((a, b) => b.mtime - a.mtime);

      // Keep only the specified number of backups
      const keep = this.backupSchedule[type].keep;
      const filesToDelete = fileStats.slice(keep);

      // Delete old backups
      for (const file of filesToDelete) {
        await fs.unlink(file.filePath);
        console.log(`Deleted old ${type} backup: ${file.file}`);
      }
    } catch (error) {
      console.error(`Error cleaning up old ${type} backups:`, error);
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupFile) {
    try {
      console.log(`Starting restore from backup: ${backupFile}`);

      // Check if file exists
      const backupPath = path.resolve(this.backupDir, backupFile);
      await fs.access(backupPath);

      // Determine backup type
      if (backupPath.endsWith('.gz')) {
        // MongoDB backup
        if (process.env.MONGODB_URI) {
          await this.restoreMongoDB(backupPath);
        } else {
          // Replit DB backup (compressed JSON)
          await this.restoreReplitDB(backupPath);
        }
      } else {
        throw new Error('Unknown backup format');
      }

      console.log(`Restore completed from: ${backupFile}`);

      return {
        success: true,
        message: 'Restore completed successfully'
      };
    } catch (error) {
      console.error('Error restoring from backup:', error);
      throw error;
    }
  }

  /**
   * List available backups
   */
  async listBackups() {
    try {
      const backups = {};

      // Get backups for each type
      for (const type of Object.keys(this.backupSchedule)) {
        const backupPath = path.join(this.backupDir, type);

        try {
          // Read directory
          const files = await fs.readdir(backupPath);

          // Get file stats
          const fileStats = await Promise.all(
            files.map(async file => {
              const filePath = path.join(backupPath, file);
              const stats = await fs.stat(filePath);
              return {
                file,
                size: stats.size,
                created: stats.mtime,
                path: filePath
              };
            })
          );

          // Sort by creation time (newest first)
          fileStats.sort((a, b) => b.created - a.created);

          backups[type] = fileStats;
        } catch (error) {
          console.error(`Error reading ${type} backups:`, error);
          backups[type] = [];
        }
      }

      return backups;
    } catch (error) {
      console.error('Error listing backups:', error);
      throw error;
    }
  }
}

module.exports = new BackupService();