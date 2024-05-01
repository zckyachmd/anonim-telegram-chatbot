import bot from "./src/services/bot.js";
import { sleep, logger } from "./src/utils.js";

// Error global handler
process.on("unhandledRejection", (reason, promise) => {
  logger.error("🛑 Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  logger.error("🛑 Uncaught Exception thrown", err);
  process.exit(1);
});

// Signal handler
process.on("SIGINT", () => {
  logger.info("✋ Gracefully shutting down bot...");
  bot.stop("SIGINT");
  process.exit(0);
});

/**
 * Main function to start the bot
 */
const main = async () => {
  // Start the bot
  logger.info("🤖 Starting the bot...");
  console.log(`############################################################`);
  console.log(`#                                                          #`);
  console.log(`#          ███████╗ █████╗  ██████╗██╗  ██╗██╗   ██╗       #`);
  console.log(`#          ╚══███╔╝██╔══██╗██╔════╝██║ ██╔╝╚██╗ ██╔╝       #`);
  console.log(`#            ███╔╝ ███████║██║     █████╔╝  ╚████╔╝        #`);
  console.log(`#           ███╔╝  ██╔══██║██║     ██╔═██╗   ╚██╔╝         #`);
  console.log(`#          ███████╗██║  ██║╚██████╗██║  ██╗   ██║          #`);
  console.log(`#          ╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝   ╚═╝          #`);
  console.log(`#                                                          #`);
  console.log(`#  Anonim Telegram Chatbot (https://t.me/zckyachmd)        #`);
  console.log(`#  Version: 1.0.0                                          #`);
  console.log(`#                                                          #`);
  console.log(`############################################################`);

  const maxRetries = 3;
  for (let retryCount = 0; retryCount < maxRetries; retryCount++) {
    try {
      if (retryCount > 0) {
        await sleep(15);
      }

      logger.info(
        `🤖 Attempting to start bot (Attempt ${
          retryCount + 1
        } of ${maxRetries})...`
      );

      const botInfo = await bot.telegram.getMe();
      if (botInfo && botInfo.username) {
        logger.info(
          `🚀 Bot started successfully! Username: @${botInfo.username}`
        );
        await bot.launch();
        break;
      } else {
        throw new Error("Failed to start the bot or get bot info");
      }
    } catch (error) {
      logger.error(
        `❌ Error starting the bot (Attempt ${
          retryCount + 1
        } of ${maxRetries}):`,
        error.message
      );
    }

    if (retryCount === maxRetries - 1) {
      logger.error("❌ Failed to start bot after maximum retries. Exiting...");
      process.exit(1);
    }
  }
};

// Run the main function
main();
