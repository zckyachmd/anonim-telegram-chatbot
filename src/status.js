import logger from "./logger.js";

// Menyimpan status sistem, defaultnya adalah 'on'
let systemStatus = true;

// Mendapatkan status sistem sebagai boolean (true jika 'on', false jika 'off')
export function getSystemStatus() {
  return systemStatus;
}

// Mengubah status sistem menjadi 'off' atau 'on' berdasarkan parameter boolean
export function setSystemStatus(status) {
  // Jika status tidak berupa boolean, lempar error
  if (typeof status !== "boolean") {
    throw new Error("Status type must be boolean");
  }

  systemStatus = status;
  logger.info(`💻 Current system status: ${systemStatus ? "on" : "off"}.`);
}
