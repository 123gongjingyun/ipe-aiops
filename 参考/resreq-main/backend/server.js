const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use('/uploads', express.static('uploads'));

// API路由
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/users', require('./src/routes/users'));
app.use('/api/config', require('./src/routes/config'));
// app.use('/api/requests', require('./src/routes/requests')); // 已废弃：resource_requests表将被vm_requests表替代
app.use('/api/vm-requests', require('./src/routes/vmRequest'));
app.use('/api/excel', require('./src/routes/excel'));
app.use('/api/obs', require('./src/routes/obs'));
app.use('/api/sfs', require('./src/routes/sfs'));
app.use('/api/container', require('./src/routes/container'));
app.use('/api/permission', require('./src/routes/permission'));
app.use('/api/network-policy', require('./src/routes/network-policy'));
app.use('/api/user-requirements', require('./src/routes/userRequirement'));
app.use('/api/requirement-categories', require('./src/routes/requirementCategory'));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: '资源申请管理系统运行正常' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({ message: '请求的资源不存在' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
});