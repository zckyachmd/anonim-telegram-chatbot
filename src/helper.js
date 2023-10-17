import { CronJob } from "cron";

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

/**
 * Create cron job
 *
 * @param {string} schedule
 * @param {function} task
 * @param {boolean} startImmediately
 * @param {string} timeZone
 */
export const createCronJob = (
  schedule,
  task = () => {},
  startImmediately = true,
  timeZone = process.env.APP_TIMEZONE || "UTC"
) => {
  new CronJob(schedule, task, null, startImmediately, timeZone);
};

/**
 * Generate inline keyboard
 *
 * @param {object} buttons
 * @returns {object}
 */
export const generateInlineKeyboard = (buttons) => {
  return {
    reply_markup: {
      inline_keyboard: buttons,
    },
  };
};
