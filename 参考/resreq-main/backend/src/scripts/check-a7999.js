/**
 * 检查A-7999记录的提交时间
 */

const { promisePool } = require('../config/database');

async function checkA7999() {
  try {
    console.log('检查A-7999记录...');

    const [records] = await promisePool.query(`
      SELECT
        id,
        system_code,
        system_name,
        type,
        environment,
        config_option,
        status,
        submitted_at,
        created_at,
        DATE_FORMAT(submitted_at, '%Y-%m-%d %H:%i:%s') as submitted_time,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_time
      FROM vm_requests
      WHERE system_code = 'A-7999'
      ORDER BY created_at DESC
    `);

    if (records.length === 0) {
      console.log('❌ 没有找到A-7999的记录');
    } else {
      console.log(`✅ 找到 ${records.length} 条A-7999的记录:`);
      console.table(records);
    }

    // 检查所有submitted_at为NULL的记录
    const [nullRecords] = await promisePool.query(`
      SELECT
        id,
        system_code,
        system_name,
        type,
        status,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_time
      FROM vm_requests
      WHERE submitted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 5
    `);

    if (nullRecords.length > 0) {
      console.log('\n⚠️ submitted_at为NULL的记录:');
      console.table(nullRecords);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ 检查失败:', error);
    process.exit(1);
  }
}

checkA7999();