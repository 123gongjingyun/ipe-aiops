const jwt = require('jsonwebtoken');
const { promisePool } = require('../config/database');

// 验证JWT令牌
const authenticate = async (req, res, next) => {
  try {
    // 从请求头获取令牌
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: '未提供认证令牌' });
    }

    // 验证令牌
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 验证用户是否存在
    const [users] = await promisePool.query(
      'SELECT id, username, role FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: '用户不存在' });
    }

    // 将用户信息添加到请求对象
    req.userId = decoded.userId;
    req.username = decoded.username;
    req.role = decoded.role;

    // 添加完整的用户对象，供其他中间件使用
    req.user = {
      id: decoded.userId,
      username: decoded.username,
      role: decoded.role
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: '无效的认证令牌' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: '认证令牌已过期' });
    }
    console.error('认证错误:', error);
    res.status(500).json({ message: '认证失败', error: error.message });
  }
};

// 验证管理员权限
const isAdmin = (req, res, next) => {
  if (req.role !== 'admin') {
    return res.status(403).json({ message: '需要管理员权限' });
  }
  next();
};

module.exports = {
  authenticate,
  isAdmin
};
