import logger from "./logger.js";
import { prisma, findUser } from "./database.js";
import { getSystemStatus } from "./status.js";
import { isAdmin } from "./helper.js";

const middleware = async (ctx, next) => {
  // Check if message or callback
  const dataReceived = ctx.message ?? ctx.callbackQuery;

  try {
    // Save user to database
    await prisma.$transaction(async (prisma) => {
      // Find user
      let existingUser = await findUser(dataReceived.from.id.toString());

      // Check if user is not found
      if (!existingUser) {
        existingUser = await prisma.user.create({
          data: {
            userId: dataReceived.from.id.toString(),
            username: dataReceived.from.username,
            language: dataReceived.from.language_code,
          },
        });
      } else {
        // Update user
        await prisma.user.update({
          where: {
            userId: dataReceived.from.id.toString(),
          },
          data: {
            username: dataReceived.from.username,
            language: dataReceived.from.language_code,
          },
        });
      }

      // Add user to ctx
      ctx.id = existingUser.id;
      ctx.userId = existingUser.userId;
    });

    // Show log in console
    console.info(
      `📩 Message [${dataReceived.from.id}]: ${dataReceived.text ?? "No text"}`
    );

    // Check if user is BOT
    if (dataReceived.from.is_bot && process.env.TELEGRAM_BOT_FILTER == "true") {
      logger.info(`🤖 Bot [${dataReceived.from.id}]: Rejected!`);
      return;
    }

    // Check if bot is not active and user is not admin
    if (!getSystemStatus() && !isAdmin(dataReceived.from.id.toString())) {
      logger.info(`👤 User [${dataReceived.from.id}]: Access bot when off.`);
      await ctx.reply("BOT sedang tidak aktif! Silakan coba lagi nanti.");
      return;
    }

    // Continue to next middleware
    await next();
  } catch (error) {
    logger.error("Error handling middleware:", error);
  }
};

export default middleware;
