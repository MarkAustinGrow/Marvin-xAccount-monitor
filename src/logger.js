// Simple logger utility for the account monitoring agent

// Log levels
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

// Current log level (can be changed at runtime)
let currentLogLevel = LOG_LEVELS.INFO;

// Set the log level
function setLogLevel(level) {
  if (LOG_LEVELS[level] !== undefined) {
    currentLogLevel = LOG_LEVELS[level];
    info(`Log level set to ${level}`);
  } else {
    warn(`Invalid log level: ${level}. Using default: INFO`);
  }
}

// Debug log
function debug(message, data = null) {
  if (currentLogLevel <= LOG_LEVELS.DEBUG) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [DEBUG] ${message}`);
    if (data) console.log(data);
  }
}

// Info log
function info(message, data = null) {
  if (currentLogLevel <= LOG_LEVELS.INFO) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] ${message}`);
    if (data) console.log(data);
  }
}

// Warning log
function warn(message, data = null) {
  if (currentLogLevel <= LOG_LEVELS.WARN) {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARN] ${message}`);
    if (data) console.warn(data);
  }
}

// Error log
function error(message, error = null) {
  if (currentLogLevel <= LOG_LEVELS.ERROR) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] ${message}`);
    if (error) {
      if (error instanceof Error) {
        console.error(`${error.name}: ${error.message}`);
        console.error(error.stack);
      } else {
        console.error(error);
      }
    }
  }
}

// Log agent heartbeat
function heartbeat() {
  info('Agent heartbeat - monitoring is active');
}

// Log account scan result
function accountScan(handle, success, tweetsCount = 0) {
  if (success) {
    info(`Account scan successful for @${handle} - found ${tweetsCount} tweets`);
  } else {
    warn(`Account scan failed for @${handle}`);
  }
}

// Log rate limit hit
function rateLimitHit(endpoint, resetTime) {
  warn(`Rate limit hit for ${endpoint}. Resets at ${new Date(resetTime).toISOString()}`);
}

// Log daily rate limit status
function dailyRateLimitStatus(remaining, total, resetTime) {
  if (remaining <= total * 0.2) {
    warn(`CRITICAL: Daily rate limit status: ${remaining}/${total} remaining (${Math.round((remaining/total)*100)}%). Resets at ${new Date(resetTime).toISOString()}`);
  } else if (remaining <= total * 0.5) {
    warn(`WARNING: Daily rate limit status: ${remaining}/${total} remaining (${Math.round((remaining/total)*100)}%). Resets at ${new Date(resetTime).toISOString()}`);
  } else {
    info(`Daily rate limit status: ${remaining}/${total} remaining (${Math.round((remaining/total)*100)}%). Resets at ${new Date(resetTime).toISOString()}`);
  }
}

// Log API call tracking
function apiCallTracking(current, limit, percentage) {
  if (percentage >= 80) {
    warn(`API usage: ${current}/${limit} calls (${percentage}%) - Approaching limit`);
  } else if (percentage >= 50) {
    info(`API usage: ${current}/${limit} calls (${percentage}%)`);
  } else {
    debug(`API usage: ${current}/${limit} calls (${percentage}%)`);
  }
}

module.exports = {
  LOG_LEVELS,
  setLogLevel,
  debug,
  info,
  warn,
  error,
  heartbeat,
  accountScan,
  rateLimitHit,
  dailyRateLimitStatus,
  apiCallTracking
};
