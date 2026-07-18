/**
 * 检查resource_requests表的数据
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../backend/.env') });
const { promisePool } = require('../config/database');

async function checkResourceRequests() {
  console.log('🔍 检查resource_requests表数据...');

  try {
    // 检查总记录数
    const [total] = await promisePool.query('SELECT COUNT(*) as total FROM resource_requests');
    console.log(`📊 resource_requests表总记录数: ${total[0].total}`);

    // 检查所有记录详情
    const [allRecords] = await promisePool.query(`
      SELECT
        id,
        system_code,
        system_name,
        type,
        environment,
        status,
        user_id,
        submitted_at
      FROM resource_requests
      ORDER BY id
      LIMIT 10
    `);

    console.log('\n📋 resource_requests记录详情 (前10条):');
    allRecords.forEach((record, index) => {
      console.log(`${index + 1}. ID: ${record.id}, 系统: ${record.system_code} - ${record.system_name}, 类型: ${record.type}, 环境: ${record.environment}, 用户ID: ${record.user_id}, 状态: ${record.status}`);
    });

  } catch (error) {
    console.error('❌ 检查失败:', error);
    throw error;
  }
}

checkResourceRequests()
  .then(() => {
    console.log('\n✅ 检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 检查失败:', error);
    process.exit(1);
  });