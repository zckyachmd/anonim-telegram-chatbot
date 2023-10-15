// Import modul yang diperlukan
import { bot } from "./src/bot.js";
import logger from "./src/logger.js";

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
    logger.info("🤖 Starting bot...");
    await bot.launch();
  } catch (error) {
    logger.error("❌ Error starting the bot:", error);
  }
}

// Panggil fungsi untuk memulai bot
app();
