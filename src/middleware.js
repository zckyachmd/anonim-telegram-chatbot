import logger from "./logger.js";
import { prisma, findUser } from "./database.js";
import { getSystemStatus } from "./status.js";
import { isAdmin } from "./helper.js";

const middleware = async (ctx, next) => {
  try {
    // Save user to database
    await prisma.$transaction(async (prisma) => {
      let existingUser = await findUser(ctx.message.from.id.toString());

      // Check if user is not found
      if (!existingUser) {
        existingUser = await prisma.user.create({
          data: {
            userId: ctx.message.from.id.toString(),
            username: ctx.message.from.username,
            language: ctx.message.from.language_code,
          },
        });
      } else {
        // Update user
        await prisma.user.update({
          where: {
            userId: ctx.message.from.id.toString(),
          },
          data: {
            username: ctx.message.from.username,
            language: ctx.message.from.language_code,
          },
        });
      }

      // Add user to ctx
      ctx.userId = existingUser.id;
    });

    // Show log in console
    console.info(
      `📩 Message [${ctx.message.from.id}]: ${ctx.message.text ?? "No text"}`
    );

    // Check if user is BOT
    if (ctx.message.from.is_bot && process.env.TELEGRAM_BOT_FILTER == "true") {
      logger.info(`🤖 Bot [${ctx.message.from.id}]: Rejected!`);
      return;
    }

    // Check if bot is not active and user is not admin
    if (!getSystemStatus() && !isAdmin(ctx.message.from.id.toString())) {
      logger.info(`👤 User [${ctx.message.from.id}]: Access bot when off.`);
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
