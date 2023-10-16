import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export const findUser = async (userId) => {
  return await prisma.user.findUnique({
    where: { userId: userId },
  });
};

export const findUserAndChat = async (userId) => {
  const user = await findUser(userId);
  const chat = await prisma.chat.findFirst({
    where: {
      OR: [{ userId: user.id }, { partnerId: user.id }],
      status: "active",
    },
    include: {
      user: true,
      partner: true,
    },
  });
  return { user, chat };
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
    orderBy: {
      createdAt: "desc",
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
      status: "ended",
      createdAt: { gt: limitDate },
    },
  });
  return isSamePartner;
};
