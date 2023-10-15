/**
 * Check if user is admin
 *
 * @param {*} userId
 * @returns
 */
export const isAdmin = (userId) => {
  const adminIds = process.env.TELEGRAM_ADMIN_ID
    ? process.env.TELEGRAM_ADMIN_ID.split(",")
    : [];

  return adminIds.includes(userId.toString());
};

/**
 * Format uptime
 *
 * @param {number} uptime
 * @returns
 */
export const formatUptime = (uptime) => {
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);

  return `${hours} hours, ${minutes} minutes, ${seconds} seconds`;
};
