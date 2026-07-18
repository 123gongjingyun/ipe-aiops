/**
 * 创建虚拟机申请表的执行脚本
 * 运行方式：node backend/src/migrations/create-vm-table.js
 */

const fs = require('fs');
const path = require('path');

// 加载环境变量
require('dotenv').config({ path: path.join(__dirname, '../../../backend/.env') });

const { promisePool } = require('../config/database');

async function createVMRequestsTable() {
  console.log('🚀 开始创建虚拟机申请表...');

  try {
    // 直接创建表
    const createTableSQL = `
    CREATE TABLE IF NOT EXISTS vm_requests (
      id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
      system_code VARCHAR(50) NOT NULL COMMENT '系统编号，如A-73',
      system_name VARCHAR(200) NOT NULL COMMENT '系统名称，如车联网',
      module_name VARCHAR(200) NOT NULL COMMENT '模块名称，如车联网平台GTSP相关改造',
      owner VARCHAR(50) NOT NULL COMMENT '担当，项目负责人姓名',
      type VARCHAR(50) NOT NULL COMMENT '类型，如MySQL、RabbitMQ、Redis、Kafka、AP应用等',
      environment VARCHAR(20) NOT NULL COMMENT '环境，如开发、测试、生产',
      config_option VARCHAR(100) NOT NULL COMMENT '配置选项，如配置A-小型、配置B-中型',
      node_count INT DEFAULT 1 COMMENT '节点数',
      cpu INT DEFAULT 0 COMMENT 'CPU核数',
      memory INT DEFAULT 0 COMMENT '内存(GB)',
      disk_type VARCHAR(20) DEFAULT '高IO' COMMENT '磁盘类型，如高IO、普通IO',
      system_disk INT DEFAULT 0 COMMENT '系统盘(GB)',
      data_disk INT DEFAULT 0 COMMENT '数据盘(GB)',
      status VARCHAR(20) DEFAULT 'draft' COMMENT '申请状态：draft-草稿、submitted-已提交、approved-已通过、rejected-已拒绝',
      applicant_id INT NOT NULL COMMENT '申请人ID，关联users表',
      applicant_name VARCHAR(100) NOT NULL COMMENT '申请人姓名',
      environment_id INT COMMENT '环境ID，关联environments表',
      submitted_at DATETIME DEFAULT NULL COMMENT '提交时间，申请从草稿变为已提交时记录',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间，记录创建时间',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间，记录最后一次修改时间',
      KEY idx_applicant_id (applicant_id),
      KEY idx_status (status),
      KEY idx_system_code (system_code),
      KEY idx_type (type),
      KEY idx_environment (environment),
      KEY idx_submitted_at (submitted_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='虚拟机资源申请表'`;

    console.log('📝 创建虚拟机申请表...');

    await promisePool.query(createTableSQL);
    console.log('✅ 虚拟机申请表创建成功');

    // 确保环境表存在并插入基础数据
    const ensureEnvironments = `
    CREATE TABLE IF NOT EXISTS environments (
      id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
      name VARCHAR(20) NOT NULL UNIQUE COMMENT '环境名称：开发、测试、生产等',
      description VARCHAR(100) COMMENT '环境描述',
      is_active TINYINT(1) DEFAULT 1 COMMENT '是否启用：1-启用，0-禁用',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='环境配置表'`;

    await promisePool.query(ensureEnvironments);
    console.log('✅ 环境表已确保存在');

    // 插入基础环境数据
    await promisePool.query(`
      INSERT IGNORE INTO environments (name, description) VALUES
      ('开发', '开发环境'),
      ('测试', '测试环境'),
      ('生产', '生产环境')
    `);
    console.log('✅ 基础环境数据已插入');


    // 验证表是否创建成功
    try {
      const [rows] = await promisePool.query('SHOW TABLES LIKE "vm_requests"');
      if (rows.length > 0) {
        console.log('✅ vm_requests 表已成功创建');

        // 显示表结构
        const [structure] = await promisePool.query('DESC vm_requests');
        console.log('\n📋 表结构:');
        structure.forEach(column => {
          console.log(`  - ${column.Field}: ${column.Type} ${column.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${column.Default ? `DEFAULT ${column.Default}` : ''}`);
        });

        // 检查环境数据
        const [envRows] = await promisePool.query('SELECT * FROM environments');
        console.log(`\n🌍 环境数据 (${envRows.length} 条):`);
        envRows.forEach(env => {
          console.log(`  - ${env.name}: ${env.description || '无描述'}`);
        });

      } else {
        console.log('❌ vm_requests 表创建失败');
      }
    } catch (error) {
      console.log('❌ 验证表结构时出错:', error.message);
    }

  } catch (error) {
    console.error('❌ 创建虚拟机申请表时出错:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// 运行迁移
if (require.main === module) {
  createVMRequestsTable()
    .then(() => {
      console.log('✅ 迁移脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 迁移脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { createVMRequestsTable };