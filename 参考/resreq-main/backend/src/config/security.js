/**
 * 安全配置文件
 * 用于防范常见Web安全漏洞
 */

module.exports = {
  // JWT配置
  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-secret-in-production',
    expiresIn: process.env.JWT_EXPIRE || '7d',
    algorithm: 'HS256'
  },

  // 密码策略
  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    // 禁止常见弱密码
    forbiddenPasswords: [
      'password', '12345678', 'qwerty123', 'admin123',
      'password123', 'abc12345', 'letmein', 'welcome1'
    ]
  },

  // 会话配置
  session: {
    maxAge: 24 * 60 * 60 * 1000, // 24小时
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  },

  // 请求限制
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15分钟
    maxRequests: 100, // 限制每个IP 15分钟内最多100个请求
    loginAttempts: 5, // 登录尝试次数限制
    blockDuration: 30 * 60 * 1000 // 封禁30分钟
  },

  // CORS配置
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },

  // 文件上传安全
  upload: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    maxFiles: 5
  },

  // 安全头
  securityHeaders: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;"
  },

  // SQL注入防护
  sqlInjection: {
    enabled: true,
    // 使用参数化查询
    useParameterizedQueries: true
  },

  // XSS防护
  xss: {
    enabled: true,
    // 输入验证
    validateInput: true,
    // 输出编码
    encodeOutput: true
  },

  // CSRF防护
  csrf: {
    enabled: true,
    tokenLength: 32,
    tokenExpiration: 24 * 60 * 60 * 1000 // 24小时
  }
};