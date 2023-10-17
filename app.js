import logger from "./src/logger.js";
import { bot } from "./src/bot.js";
import "./src/cron.js";

// Fungsi untuk menangani kesalahan secara global
process.on("unhandledRejection", (err) => {
  logger.error("Unhandled Rejection:", err);
  process.exit(1);
});

// Menambahkan event listener untuk menghandle shutdown gracefully
process.on("SIGINT", () => {
  logger.info("✋ Gracefully shutting down bot...");
  bot.stop("SIGINT");
  process.exit(0);
});

// Memulai bot dengan mencoba terhubung ke internet beberapa kali sebelum menyerah
async function startBot() {
  console.log("Starting...");
  console.log(`############################################################`);
  console.log(`#                                                          #`);
  console.log(`#          ███████╗ █████╗  ██████╗██╗  ██╗██╗   ██╗       #`);
  console.log(`#          ╚══███╔╝██╔══██╗██╔════╝██║ ██╔╝╚██╗ ██╔╝       #`);
  console.log(`#            ███╔╝ ███████║██║     █████╔╝  ╚████╔╝        #`);
  console.log(`#           ███╔╝  ██╔══██║██║     ██╔═██╗   ╚██╔╝         #`);
  console.log(`#          ███████╗██║  ██║╚██████╗██║  ██╗   ██║          #`);
  console.log(`#          ╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝   ╚═╝          #`);
  console.log(`#                                                          #`);
  console.log(`#  Anonim ChatBot on Telegram (https://t.me/temukawanbot)  #`);
  console.log(`#  Version: 1.1.2                                          #`);
  console.log(`#                                                          #`);
  console.log(`############################################################`);

  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      // Jalankan bot
      logger.info(
        `🤖 Attempting to start bot (Attempt ${
          retryCount + 1
        } of ${maxRetries})...`
      );

      // Mengecek status bot apakah berhasil terhubung ke internet
      const botInfo = await bot.telegram.getMe();
      if (botInfo && botInfo.username) {
        logger.info(
          `🚀 Bot started successfully! Username: @${botInfo.username}`
        );
        await bot.launch();
        break; // Jika berhasil terhubung, keluar dari loop
      } else {
        throw new Error("Bot launch failed: Unable to get bot info.");
      }
    } catch (error) {
      logger.error(
        `❌ Error starting the bot (Attempt ${
          retryCount + 1
        } of ${maxRetries}):`,
        error
      );
      retryCount++;
      await new Promise((resolve) => setTimeout(resolve, 15000)); // Tunggu 15 detik sebelum mencoba lagi
    }
  }

  if (retryCount === maxRetries) {
    logger.error("❌ Failed to start bot after maximum retries. Exiting...");
    process.exit(1);
  }
}

// Panggil fungsi untuk memulai bot dengan mencoba terhubung ke internet beberapa kali
startBot();
