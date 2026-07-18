#!/usr/bin/env node

/**
 * 生成安全配置的工具脚本
 */

const crypto = require('crypto');

/**
 * 生成随机字符串
 */
function generateSecureRandom(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * 生成强密码
 */
function generateStrongPassword(length = 16) {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let password = '';

  // 确保包含各类字符
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // 填充剩余长度
  const allChars = lowercase + uppercase + numbers + special;
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // 随机打乱
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * 生成JWT密钥
 */
function generateJWTSecret() {
  return generateSecureRandom(64);
}

console.log('=== 安全配置生成工具 ===\n');

// 生成强密码
const dbPassword = generateStrongPassword(16);
console.log('🔐 数据库密码 (请手动设置):');
console.log(dbPassword);
console.log('');

// 生成JWT密钥
const jwtSecret = generateJWTSecret();
console.log('🔑 JWT密钥:');
console.log(jwtSecret);
console.log('');

// 生成配置内容
console.log('=== 完整的.env配置内容 ===\n');
console.log('# 服务器配置');
console.log('NODE_ENV=development');
console.log('PORT=3000');
console.log('');
console.log('# 数据库配置');
console.log('DB_HOST=172.22.30.23');
console.log('DB_PORT=3306');
console.log('DB_USER=vmconf_user');
console.log(`DB_PASSWORD=${dbPassword}`);
console.log('DB_NAME=vmconf_db');
console.log('');
console.log('# JWT密钥');
console.log(`JWT_SECRET=${jwtSecret}`);
console.log('JWT_EXPIRE=7d');
console.log('');
console.log('# 文件上传配置');
console.log('UPLOAD_DIR=uploads');
console.log('MAX_FILE_SIZE=10485760');
console.log('');

console.log('=== 使用说明 ===\n');
console.log('1. 记录上面生成的数据库密码');
console.log('2. 在MySQL中为用户设置此密码:');
console.log(`   ALTER USER 'vmconf_user'@'%' IDENTIFIED BY '${dbPassword}';`);
console.log('3. 复制完整的.env配置内容到项目配置文件中');
console.log('4. 配置完成后可以删除此配置文件');