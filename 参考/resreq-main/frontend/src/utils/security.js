/**
 * 前端安全工具函数
 * 用于防范XSS、注入攻击等安全威胁
 */

/**
 * HTML实体编码，防止XSS攻击
 * @param {string} str - 原始字符串
 * @returns {string} 编码后的字符串
 */
export const encodeHtml = (str) => {
  if (typeof str !== 'string') return str;

  const htmlEntities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };

  return str.replace(/[&<>"'/]/g, char => htmlEntities[char]);
};

/**
 * 输入验证和清理
 * @param {string} input - 用户输入
 * @returns {string} 清理后的输入
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  // 移除危险字符和模式
  return input
    .replace(/[<>]/g, '') // 移除<和>
    .replace(/javascript:/gi, '') // 移除javascript:
    .replace(/on\w+\s*=/gi, '') // 移除事件处理器
    .trim();
};

/**
 * 用户名验证（防止注入攻击）
 * @param {string} username - 用户名
 * @returns {object} 验证结果
 */
export const validateUsername = (username) => {
  const errors = [];

  if (!username) {
    errors.push('用户名不能为空');
    return { isValid: false, errors };
  }

  if (username.length < 3 || username.length > 20) {
    errors.push('用户名长度必须在3-20个字符之间');
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push('用户名只能包含字母、数字和下划线');
  }

  // 防止SQL注入
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\b)/gi,
    /(--|;|\/\*|\*\/)/g,
    /(\b(OR|AND)\s+\w+\s*(=|<|>|\!=))/gi
  ];

  for (const pattern of sqlPatterns) {
    if (pattern.test(username)) {
      errors.push('用户名包含非法字符');
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * 密码强度验证
 * @param {string} password - 密码
 * @returns {object} 验证结果
 */
export const validatePassword = (password) => {
  const errors = [];

  if (!password) {
    errors.push('密码不能为空');
    return { isValid: false, errors };
  }

  if (password.length < 8 || password.length > 20) {
    errors.push('密码长度必须在8-20位之间');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('密码必须包含至少一个大写字母');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('密码必须包含至少一个小写字母');
  }

  if (!/\d/.test(password)) {
    errors.push('密码必须包含至少一个数字');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('密码必须包含至少一个特殊字符');
  }

  // 禁止包含gtmc（不区分大小写）
  if (/gtmc/i.test(password)) {
    errors.push('密码不能包含GTMC或gtmc');
  }

  // 禁止常见弱密码
  const weakPasswords = [
    'password', '12345678', 'qwerty123', 'admin123',
    'password123', 'abc12345', 'letmein', 'welcome1'
  ];

  if (weakPasswords.includes(password.toLowerCase())) {
    errors.push('密码过于常见，请使用更复杂的密码');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * 敏感信息过滤
 * @param {object} data - 原始数据
 * @param {array} sensitiveFields - 敏感字段列表
 * @returns {object} 过滤后的数据
 */
export const filterSensitiveData = (data, sensitiveFields = ['password', 'token', 'secret']) => {
  const filtered = { ...data };

  sensitiveFields.forEach(field => {
    if (field in filtered) {
      delete filtered[field];
    }
  });

  return filtered;
};

/**
 * URL参数安全编码
 * @param {object} params - 参数对象
 * @returns {string} 编码后的URL参数字符串
 */
export const encodeURLParams = (params) => {
  return Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
};

/**
 * 检查是否为安全的外部链接
 * @param {string} url - URL地址
 * @returns {boolean} 是否安全
 */
export const isSafeURL = (url) => {
  if (!url) return false;

  try {
    const parsedURL = new URL(url);
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];

    // 只允许特定协议
    if (!allowedProtocols.includes(parsedURL.protocol)) {
      return false;
    }

    // 防止javascript:伪协议
    if (url.toLowerCase().startsWith('javascript:')) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * 防止CSRF攻击的token生成
 * @returns {string} CSRF token
 */
export const generateCSRFToken = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return btoa(`${timestamp}-${random}`);
};

/**
 * 安全的本地存储操作
 */
export const secureStorage = {
  setItem: (key, value) => {
    try {
      const encrypted = btoa(JSON.stringify(value));
      localStorage.setItem(key, encrypted);
    } catch (error) {
      console.error('存储失败:', error);
    }
  },

  getItem: (key) => {
    try {
      const encrypted = localStorage.getItem(key);
      if (!encrypted) return null;
      return JSON.parse(atob(encrypted));
    } catch (error) {
      console.error('读取失败:', error);
      return null;
    }
  },

  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('删除失败:', error);
    }
  },

  clear: () => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('清空失败:', error);
    }
  }
};