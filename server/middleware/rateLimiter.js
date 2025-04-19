// server/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

// Rate limiting to prevent brute force and DoS attacks
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per IP in this time period
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP address, please try again later'
});

module.exports = {
  apiLimiter
};