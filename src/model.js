import { PrismaClient } from "@prisma/client";
import { logger } from "./utils.js";

// Create a shared Prisma client instance
const prisma = new PrismaClient();

/**
 * Get user with active chats
 *
 * @param {string} userId
 * @returns {Promise<object>}
 * @throws {Error}
 */
export const getUserWithActiveChats = async (userId) => {
  try {
    // Select user by userId
    const user = await prisma.user.findUnique({
      where: {
        userId: String(userId),
      },
      include: {
        // Ambil relasi chat dengan status active
        chatsStarted: {
          where: {
            status: "active",
          },
          orderBy: {
            createdAt: "desc", // Mengurutkan berdasarkan createdAt secara descending (terbaru ke terlama)
          },
          take: 1, // Mengambil hanya satu chat terakhir
          include: {
            partner: true,
          },
        },
        chatsReceived: {
          where: {
            status: "active",
          },
          orderBy: {
            createdAt: "desc", // Mengurutkan berdasarkan createdAt secara descending (terbaru ke terlama)
          },
          take: 1, // Mengambil hanya satu chat terakhir
          include: {
            user: true,
          },
        },
      },
    });

    // Check if chatsStarted or chatsReceived is not null
    if (user.chatsStarted.length <= 0 && user.chatsReceived.length <= 0) {
      return user;
    }

    // Ambil relasi chat.partnerId jika user.userId == chat.userId
    if (user.chatsStarted.length > 0) {
      const chatStarted = user.chatsStarted[0];
      chatStarted.partnerId = chatStarted.partner
        ? chatStarted.partner.userId
        : null;
    }

    if (user.chatsReceived.length > 0) {
      const chatReceived = user.chatsReceived[0];
      chatReceived.partnerId = chatReceived.user
        ? chatReceived.user.userId
        : null;
    }

    // Check if chatsStarted or chatsReceived is not null set to object "partner"
    user.partner =
      user.chatsStarted.length > 0
        ? user.chatsStarted[0].partner
        : user.chatsReceived[0].user;

    return user;
  } catch (error) {
    logger.error("Error fetching user:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
};
