const { promisePool } = require('../config/database');
const bcrypt = require('bcryptjs');

// 获取所有用户(仅管理员)
const getAllUsers = async (req, res) => {
  try {
    const [users] = await promisePool.query(
      'SELECT id, username, real_name, role, created_at FROM users ORDER BY created_at DESC'
    );

    res.json({ users });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ message: '获取用户列表失败', error: error.message });
  }
};

// 获取用户详情
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const [users] = await promisePool.query(
      'SELECT id, username, real_name, role, created_at FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 非管理员只能查看自己的信息
    if (req.role !== 'admin' && req.userId !== parseInt(id)) {
      return res.status(403).json({ message: '没有权限查看其他用户信息' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error('获取用户详情失败:', error);
    res.status(500).json({ message: '获取用户详情失败', error: error.message });
  }
};

// 更新用户信息
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { realName } = req.body;

    // 非管理员只能修改自己的信息
    if (req.role !== 'admin' && req.userId !== parseInt(id)) {
      return res.status(403).json({ message: '没有权限修改其他用户信息' });
    }

    // 检查用户是否存在
    const [users] = await promisePool.query(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 更新用户信息
    await promisePool.query(
      'UPDATE users SET real_name = ? WHERE id = ?',
      [realName, id]
    );

    res.json({ message: '用户信息更新成功' });
  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(500).json({ message: '更新用户信息失败', error: error.message });
  }
};

// 删除用户(仅管理员)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // 不能删除自己
    if (req.userId === parseInt(id)) {
      return res.status(400).json({ message: '不能删除自己的账户' });
    }

    // 检查用户是否存在
    const [users] = await promisePool.query(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 删除用户
    await promisePool.query('DELETE FROM users WHERE id = ?', [id]);

    res.json({ message: '用户删除成功' });
  } catch (error) {
    console.error('删除用户失败:', error);
    res.status(500).json({ message: '删除用户失败', error: error.message });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
};
