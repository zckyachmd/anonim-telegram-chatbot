// Import modul yang diperlukan
import logger from "./src/logger.js";
import { bot } from "./src/bot.js";
import "./src/cron.js"; // Import cron jobs

// Fungsi untuk menangani kesalahan secara global
process.on("unhandledRejection", (err) => {
  logger.error("Unhandled Rejection:", err);

  // Proses lainnya, misalnya mengirim notifikasi atau logging ke sistem monitoring
  process.exit(1);
});

// Menambahkan event listener untuk menghandle shutdown gracefully
process.on("SIGINT", () => {
  logger.info("✋ Gracefully shutting down bot...");
  bot.stop("SIGINT");

  // Lakukan proses pembersihan atau penyimpanan data terakhir jika diperlukan
  process.exit(0);
});

// Memulai bot
async function app() {
  try {
    // Jalankan bot
    logger.info("🤖 Starting bot...");
    await bot.launch();
  } catch (error) {
    logger.error("❌ Error starting the bot:", error);
  }
}

// Panggil fungsi untuk memulai bot
app();
