import logger from "./logger.js";
import { createCronJob } from "./helper.js";
import { exec } from "child_process";

// Backup database setiap jam 00:00
createCronJob("0 0 * * *", function () {
  // Check if database backup is enabled
  if (process.env.DATABASE_BACKUP != (true || "true")) {
    logger.info("💾 Automatic database backup is disabled!");
    return;
  }

  // Buat folder backup jika belum ada
  exec("mkdir -p backup", (error, stdout, stderr) => {
    if (error) {
      logger.error(`Error during creating backup folder: ${error.message}`);
      return;
    }
    if (stderr) {
      logger.error(`Error during creating backup folder: ${stderr}`);
      return;
    }
  });

  // Lakukan proses backup database
  exec(
    `pg_dump -U ${process.env.DATABASE_USER || "defaultUser"} -d ${
      process.env.DATABASE_NAME || "defaultDB"
    } -h ${process.env.DATABASE_HOST || "localhost"} -p ${
      process.env.DATABASE_PORT || "5432"
    } -f backup/${new Date().toISOString()}.sql`,
    (error, stdout, stderr) => {
      if (error) {
        logger.error(`Error during database backup: ${error.message}`);
        return;
      }
      if (stderr) {
        logger.error(`Error during database backup: ${stderr}`);
        return;
      }
      logger.info("✅ Database backup successful!");
    }
  );

  // Hapus backup sql yang lebih dari 7 hari
  exec("find backup/ -mtime +7 -type f -delete", (error, stdout, stderr) => {
    if (error) {
      logger.error(
        `Error during deleting old database backup: ${error.message}`
      );
      return;
    }
    if (stderr) {
      logger.error(`Error during deleting old database backup: ${stderr}`);
      return;
    }
    logger.info("✅ Old database backup deleted!");
  });
});
