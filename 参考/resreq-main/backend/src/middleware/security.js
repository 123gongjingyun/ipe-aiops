/**
 * 安全中间件
 * 防范OWASP Top 10安全漏洞
 */
const securityConfig = require('../config/security');

// 1. SQL注入防护中间件
const sqlInjectionProtection = (req, res, next) => {
  const suspiciousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(\b(OR|AND)\s+\w+\s*(=|<|>|\!=))/gi,
    /(\b(OR|AND)\s+\w+\s+LIKE\s*['"])/gi,
    /(--|;|\/\*|\*\/)/g
  ];

  const checkBody = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(obj[key])) {
            return res.status(400).json({
              message: '检测到潜在的SQL注入攻击',
              error: 'INVALID_INPUT'
            });
          }
        }
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        checkBody(obj[key]);
      }
    }
  };

  if (req.body) checkBody(req.body);
  if (req.query) checkBody(req.query);
  if (req.params) checkBody(req.params);

  next();
};

// 2. XSS防护中间件
const xssProtection = (req, res, next) => {
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // 事件处理器如onclick=
    /<img[^>]+src[^>]*>/gi
  ];

  const sanitizeInput = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        for (const pattern of xssPatterns) {
          if (pattern.test(obj[key])) {
            return res.status(400).json({
              message: '检测到潜在的XSS攻击',
              error: 'INVALID_INPUT'
            });
          }
        }
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeInput(obj[key]);
      }
    }
  };

  if (req.body) sanitizeInput(req.body);
  if (req.query) sanitizeInput(req.query);
  if (req.params) sanitizeInput(req.params);

  next();
};

// 3. 安全头设置中间件
const securityHeaders = (req, res, next) => {
  const headers = securityConfig.securityHeaders;

  res.setHeader('X-Content-Type-Options', headers['X-Content-Type-Options']);
  res.setHeader('X-Frame-Options', headers['X-Frame-Options']);
  res.setHeader('X-XSS-Protection', headers['X-XSS-Protection']);

  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', headers['Strict-Transport-Security']);
    res.setHeader('Content-Security-Policy', headers['Content-Security-Policy']);
  }

  next();
};

// 4. 请求大小限制
const requestSizeLimit = (req, res, next) => {
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (req.headers['content-length'] > maxSize) {
    return res.status(413).json({
      message: '请求体过大',
      error: 'REQUEST_TOO_LARGE'
    });
  }

  next();
};

// 5. HTTP方法限制
const methodRestriction = (req, res, next) => {
  const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];

  if (!allowedMethods.includes(req.method)) {
    return res.status(405).json({
      message: '不允许的HTTP方法',
      error: 'METHOD_NOT_ALLOWED'
    });
  }

  next();
};

// 6. 内容类型验证
const contentTypeValidation = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    if (!req.headers['content-type']?.includes('application/json')) {
      return res.status(415).json({
        message: '不支持的媒体类型',
        error: 'UNSUPPORTED_MEDIA_TYPE'
      });
    }
  }

  next();
};

module.exports = {
  sqlInjectionProtection,
  xssProtection,
  securityHeaders,
  requestSizeLimit,
  methodRestriction,
  contentTypeValidation
};