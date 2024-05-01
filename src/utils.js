import winston from "winston";
import { config } from "dotenv";

// Load environment variables
config();

/**
 * Check if user is admin
 *
 * @param {*} userId
 * @returns
 */
export const isAdmin = (userId) => {
  const adminIds = process.env.ADMIN_ID ? process.env.ADMIN_ID.split(",") : [];

  return adminIds.includes(userId.toString());
};

/**
 * Sleep for a given amount of time
 *
 * @param {number} ms
 */
export const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, Number(ms)));
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

/**
 * Generate logger with Winston
 */
export const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    winston.format.printf(
      (info) => `[${info.timestamp}] ${info.level}: ${info.message}`
    )
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf((info) => `${info.message}`)
      ),
    }),
    new winston.transports.File({ filename: "logs/combined.log" }),
    new winston.transports.File({ filename: "logs/error.log", level: "error" }), // Transport khusus untuk error
  ],
});
