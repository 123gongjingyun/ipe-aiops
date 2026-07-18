/**
 * 修复虚拟机申请的提交时间
 *
 * 该脚本用于更新虚拟机申请表中submitted_at字段为NULL的记录
 * 对于状态为submitted、approved、rejected的记录，设置submitted_at为created_at
 */

const { promisePool } = require('../config/database');

async function fixVMSubmittedAt() {
  try {
    console.log('开始修复虚拟机申请的提交时间...');

    // 更新submitted_at为NULL且状态不是draft的记录
    const [result] = await promisePool.query(`
      UPDATE vm_requests
      SET submitted_at = created_at
      WHERE submitted_at IS NULL
      AND status IN ('submitted', 'approved', 'rejected')
    `);

    console.log(`✅ 成功更新 ${result.affectedRows} 条虚拟机申请记录的提交时间`);

    // 验证更新结果
    const [checkResult] = await promisePool.query(`
      SELECT
        id,
        system_code,
        system_name,
        type,
        environment,
        status,
        submitted_at,
        created_at
      FROM vm_requests
      WHERE submitted_at IS NULL
      AND status IN ('submitted', 'approved', 'rejected')
      LIMIT 10
    `);

    if (checkResult.length > 0) {
      console.log('⚠️ 仍有记录的submitted_at为NULL:');
      console.table(checkResult);
    } else {
      console.log('✅ 所有非草稿状态的记录都已设置提交时间');
    }

    // 显示最近的几条记录以供验证
    const [recentRecords] = await promisePool.query(`
      SELECT
        id,
        system_code,
        system_name,
        type,
        environment,
        status,
        DATE_FORMAT(submitted_at, '%Y-%m-%d %H:%i:%s') as submitted_time,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_time
      FROM vm_requests
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('\n📋 最近的5条虚拟机申请记录:');
    console.table(recentRecords);

    process.exit(0);
  } catch (error) {
    console.error('❌ 修复虚拟机申请提交时间失败:', error);
    process.exit(1);
  }
}

// 运行修复脚本
fixVMSubmittedAt();