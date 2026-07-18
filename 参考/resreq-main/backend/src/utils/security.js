/**
 * 安全工具函数
 */

const crypto = require('crypto');

/**
 * 生成安全的随机字符串
 * @param {number} length - 字符串长度
 * @returns {string} 随机字符串
 */
const generateSecureRandom = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * 生成安全的token
 * @returns {string} JWT token
 */
const generateSecureToken = () => {
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(16).toString('hex');
  return `${timestamp}-${randomBytes}`;
};

/**
 * 密码强度验证
 * @param {string} password - 密码
 * @returns {object} 验证结果
 */
const validatePasswordStrength = (password) => {
  const securityConfig = require('../config/security');
  const passwordPolicy = securityConfig.password;

  const errors = [];

  if (password.length < passwordPolicy.minLength) {
    errors.push(`密码长度不能少于${passwordPolicy.minLength}位`);
  }

  if (password.length > passwordPolicy.maxLength) {
    errors.push(`密码长度不能超过${passwordPolicy.maxLength}位`);
  }

  if (passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('密码必须包含大写字母');
  }

  if (passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('密码必须包含小写字母');
  }

  if (passwordPolicy.requireNumbers && !/\d/.test(password)) {
    errors.push('密码必须包含数字');
  }

  if (passwordPolicy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('密码必须包含特殊字符');
  }

  if (passwordPolicy.forbiddenPasswords.includes(password.toLowerCase())) {
    errors.push('密码过于常见，请使用更复杂的密码');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * 输入验证和清理
 * @param {string} input - 用户输入
 * @returns {string} 清理后的输入
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  // 移除危险字符
  return input
    .replace(/[<>]/g, '') // 移除<和>
    .replace(/javascript:/gi, '') // 移除javascript:
    .replace(/on\w+\s*=/gi, ''); // 移除事件处理器
};

/**
 * 用户名验证
 * @param {string} username - 用户名
 * @returns {object} 验证结果
 */
const validateUsername = (username) => {
  const errors = [];

  if (!username) {
    errors.push('用户名不能为空');
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
    /(--|;|\/\*|\*\/)/g
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
 * 邮箱验证
 * @param {string} email - 邮箱地址
 * @returns {object} 验证结果
 */
const validateEmail = (email) => {
  const errors = [];

  if (!email) {
    errors.push('邮箱不能为空');
  }

  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  if (!emailRegex.test(email)) {
    errors.push('邮箱格式不正确');
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
const filterSensitiveData = (data, sensitiveFields = ['password', 'token', 'secret']) => {
  const filtered = { ...data };

  sensitiveFields.forEach(field => {
    if (field in filtered) {
      delete filtered[field];
    }
  });

  return filtered;
};

/**
 * 生成密码哈希（使用bcrypt，这里只是接口定义）
 * @param {string} password - 明文密码
 * @returns {string} 密码哈希
 */
const hashPassword = async (password) => {
  const bcrypt = require('bcryptjs');
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * 验证密码
 * @param {string} password - 明文密码
 * @param {string} hash - 密码哈希
 * @returns {boolean} 验证结果
 */
const comparePassword = async (password, hash) => {
  const bcrypt = require('bcryptjs');
  return await bcrypt.compare(password, hash);
};

module.exports = {
  generateSecureRandom,
  generateSecureToken,
  validatePasswordStrength,
  sanitizeInput,
  validateUsername,
  validateEmail,
  filterSensitiveData,
  hashPassword,
  comparePassword
};