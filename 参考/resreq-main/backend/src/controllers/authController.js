const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { promisePool } = require('../config/database');

// 用户注册
const register = async (req, res) => {
  try {
    const { username, password, realName } = req.body;

    // 验证必填字段
    if (!username || !password || !realName) {
      return res.status(400).json({ message: '用户名、密码和真实姓名为必填项' });
    }

    // 密码强度验证
    if (password.length < 8) {
      return res.status(400).json({ message: '密码长度至少8位' });
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9])/.test(password)) {
      return res.status(400).json({
        message: '密码必须包含大小写字母、数字和特殊字符'
      });
    }

    // 检查用户名是否已存在
    const [existingUsers] = await promisePool.query(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: '用户名已存在' });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 插入新用户
    const [result] = await promisePool.query(
      'INSERT INTO users (username, password, real_name, role) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, realName, 'user']
    );

    // 生成JWT令牌（注册成功后自动登录）
    const token = jwt.sign(
      {
        userId: result.insertId,
        username: username,
        role: 'user'
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.status(201).json({
      message: '注册成功',
      token,
      user: {
        id: result.insertId,
        username,
        realName,
        role: 'user'
      }
    });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ message: '注册失败', error: error.message });
  }
};

// 用户登录
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 验证必填字段
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码为必填项' });
    }

    // 查找用户
    const [users] = await promisePool.query(
      'SELECT id, username, password, real_name, role FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    const user = users[0];

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    // 生成JWT令牌
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        realName: user.real_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ message: '登录失败', error: error.message });
  }
};

// 获取当前用户信息
const getCurrentUser = async (req, res) => {
  try {
    const [users] = await promisePool.query(
      'SELECT id, username, real_name, role, created_at FROM users WHERE id = ?',
      [req.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }

    const user = users[0];
    res.json({
      user: {
        id: user.id,
        username: user.username,
        realName: user.real_name,
        role: user.role,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ message: '获取用户信息失败', error: error.message });
  }
};

// 修改密码
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    // 验证必填字段
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: '旧密码和新密码为必填项' });
    }

    // 新密码强度验证
    if (newPassword.length < 8) {
      return res.status(400).json({ message: '新密码长度至少8位' });
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9])/.test(newPassword)) {
      return res.status(400).json({
        message: '新密码必须包含大小写字母、数字和特殊字符'
      });
    }

    // 获取当前用户信息
    const [users] = await promisePool.query(
      'SELECT password FROM users WHERE id = ?',
      [req.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 验证旧密码
    const isPasswordValid = await bcrypt.compare(oldPassword, users[0].password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: '旧密码错误' });
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 更新密码
    await promisePool.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, req.userId]
    );

    res.json({ message: '密码修改成功' });
  } catch (error) {
    console.error('修改密码失败:', error);
    res.status(500).json({ message: '修改密码失败', error: error.message });
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
  changePassword
};
