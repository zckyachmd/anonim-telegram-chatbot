import { PrismaClient } from "@prisma/client";

/**
 * Prisma Client instance
 */
export const prisma = new PrismaClient();

export const findUser = async (userId) => {
  return await prisma.user.findUnique({
    where: { userId: userId },
  });
};

export const findBlockedUser = async (userId, partnerId) => {
  return await prisma.block.findFirst({
    where: {
      OR: [
        { userId: userId, blockedId: partnerId },
        { userId: partnerId, blockedId: userId },
      ],
    },
  });
};

export const countBlockedUser = async (userId) => {
  return await prisma.block.count({
    where: {
      userId: userId,
    },
  });
};

export const deleteBlockedUser = async (userId) => {
  return await prisma.block.deleteMany({
    where: {
      userId: userId,
    },
  });
};

export const findChat = async (userId, waiting = false) => {
  return await prisma.chat.findFirst({
    where: {
      OR: [{ userId: userId }, { partnerId: userId }],
      status: !waiting ? "active" : { in: ["active", "waiting"] },
    },
    include: {
      user: true,
      partner: true,
    },
  });
};

export const findActiveChat = async (userId) => {
  return await prisma.chat.findFirst({
    where: {
      OR: [{ userId: userId }, { partnerId: userId }],
      status: "active",
    },
    include: {
      user: true,
      partner: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

export const findUserInChatorWaiting = async (userId) => {
  return await prisma.chat.findFirst({
    where: {
      AND: [
        {
          OR: [{ userId: userId }, { partnerId: userId }],
        },
        {
          status: {
            in: ["active", "waiting"],
          },
        },
      ],
    },
  });
};

export const findWaitingChat = async (userId) => {
  return await prisma.chat.findMany({
    distinct: ["userId"],
    where: {
      userId: { not: userId },
      partnerId: null,
      status: "waiting",
    },
    include: {
      user: true,
      partner: true,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
};

export const findIsUserHasChatWithPartner = async (
  userId,
  partnerId,
  day = 3
) => {
  const limitDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * day);
  const isSamePartner = await prisma.chat.findFirst({
    where: {
      OR: [
        { userId: userId, partnerId: partnerId },
        { userId: partnerId, partnerId: userId },
      ],
      NOT: { partnerId: null },
      status: "ended",
      createdAt: { gt: limitDate },
    },
  });
  return isSamePartner;
};
