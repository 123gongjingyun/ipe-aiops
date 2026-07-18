/**
 * 检查导出所需的表是否都存在
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../backend/.env') });
const { promisePool } = require('../config/database');

async function checkTables() {
  console.log('🔍 检查导出功能所需的表...');

  const tables = [
    'vm_requests',
    'permission_requests',
    'container_requests',
    'obs_requests',
    'sfs_requests',
    'network_policies',
    'environments',
    'users'
  ];

  for (const table of tables) {
    try {
      const [rows] = await promisePool.query('SHOW TABLES LIKE ?', [table]);
      if (rows.length > 0) {
        console.log(`✅ ${table} 表已存在`);

        // 获取记录数
        const [count] = await promisePool.query(`SELECT COUNT(*) as total FROM ${table}`);
        console.log(`   📊 记录数: ${count[0].total}`);
      } else {
        console.log(`❌ ${table} 表不存在`);
      }
    } catch (error) {
      console.log(`❌ 检查 ${table} 表时出错:`, error.message);
    }
  }
}

checkTables()
  .then(() => {
    console.log('✅ 检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 检查失败:', error);
    process.exit(1);
  });