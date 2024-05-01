import { logger } from "../utils.js";
import { PrismaClient } from "@prisma/client";

// Create a shared Prisma client instance
const prisma = new PrismaClient();

/**
 * Message loggers middleware
 *
 * @param {Object} ctx - Context object
 * @param {Function} next - Next middleware function
 * @returns {Function} Next middleware function
 */
const messageLogs = async (ctx, next) => {
  try {
    // Find userId from the database
    const user = await prisma.user.findUnique({
      where: { userId: String(ctx.messageData.from.id) },
      select: { id: true },
    });

    const messageId =
      ctx.messageData.message_id ?? ctx.messageData.message.message_id;

    // Save the message to the database
    await prisma.message.create({
      data: {
        userId: user.id,
        messageId: messageId,
      },
    });
  } catch (error) {
    // Handle errors gracefully
    logger.error("Error while saving message to the database:", error);
    return;
  }

  // Continue to the next middleware
  return next();
};

// Export the middleware
export default messageLogs;
