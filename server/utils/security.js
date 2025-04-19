// server/utils/security.js
const crypto = require('crypto');
const sanitizeHtml = require('sanitize-html');
const { logger } = require('../config/logger');

// Data signing for integrity protection
const signData = (data, secret = process.env.DATA_SIGNING_SECRET || 'default-signing-secret') => {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(data));
  return hmac.digest('hex');
};

// Data verification
const verifyData = (data, signature, secret = process.env.DATA_SIGNING_SECRET || 'default-signing-secret') => {
  const expectedSignature = signData(data, secret);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (err) {
    logger.error('Error verifying data signature:', err);
    return false;
  }
};

// Sanitize HTML to prevent XSS
const sanitizeInput = (input) => {
  if (!input) return '';
  
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {}
  });
};

module.exports = {
  signData,
  verifyData,
  sanitizeInput
};