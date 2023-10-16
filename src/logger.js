// Import modul yang diperlukan
import winston from "winston";
import winstonDailyRotateFile from "winston-daily-rotate-file";
import fs from "fs";

// Mengecek apakah folder logs sudah ada, jika belum, maka membuatnya
const logsDir = "./logs";
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Mendefinisikan format log
const logFormat = winston.format.printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level.toUpperCase()}] ${message}`;
});

// Konfigurasi transport untuk winston-daily-rotate-file
const transport = new winstonDailyRotateFile({
  filename: `${logsDir}/%DATE%-logs.log`,
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m", // Ukuran maksimal satu file log (dalam bytes)
  maxFiles: "7d", // Masa simpan file log (dalam hari)
});

// Konfigurasi transport untuk konsol (console)
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), // Menambahkan timestamp ke log
    winston.format.printf(({ message }) => message) // Hanya menampilkan pesan log
  ),
});

// Membuat instance logger dengan dua transport (file dan konsol)
const logger = winston.createLogger({
  level: "info", // Level log yang diinginkan
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), // Menambahkan timestamp ke log
    winston.format.errors({ stack: true }), // Menampilkan stack trace jika tersedia
    winston.format.splat(), // Mengizinkan penggunaan string format seperti util.format
    winston.format.json(), // Format log dalam bentuk JSON
    logFormat // Menggunakan formatter khusus
  ),
  transports: [transport, consoleTransport], // Menggunakan winston-daily-rotate-file dan console sebagai transport
});

export default logger;
