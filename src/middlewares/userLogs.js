import { logger } from "../utils.js";
import { PrismaClient } from "@prisma/client";

// Create a shared Prisma client instance
const prisma = new PrismaClient();

/**
 * User logs middleware
 *
 * @param {Object} ctx - Context object
 * @param {Function} next - Next middleware function
 * @returns {Function} Next middleware function
 */
const userLogs = async (ctx, next) => {
  const user = ctx.messageData.from;

  try {
    // Check if the user in the database
    const existingUser = await prisma.user.findUnique({
      where: { userId: String(user.id) },
    });

    // If the user exists, update the user data
    if (existingUser) {
      await prisma.user.update({
        where: { userId: String(user.id) },
        data: {
          username: user.username,
          language: user.language_code,
        },
      });
    } else {
      // If the user does not exist, create a new user
      await prisma.user.create({
        data: {
          userId: String(user.id),
          username: user.username,
          language: user.language_code,
          isBot: user.is_bot,
        },
      });
    }
  } catch (error) {
    // Handle errors gracefully
    logger.error("Error while upserting user data:", error);
  }

  // Continue to the next middleware
  return next();
};

// Export the middleware
export default userLogs;
