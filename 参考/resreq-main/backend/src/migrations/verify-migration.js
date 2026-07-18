/**
 * 验证迁移后的导出功能
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../backend/.env') });
const { promisePool } = require('../config/database');

async function verifyMigrationAndExport() {
  console.log('🔍 验证迁移后的导出功能...\n');

  try {
    // 1. 检查vm_requests表的最终数据量
    const [vmTotal] = await promisePool.query('SELECT COUNT(*) as total FROM vm_requests');
    console.log(`📊 vm_requests表总记录: ${vmTotal[0].total}条`);

    // 2. 按申请人分组统计
    console.log('\n👥 按申请人分组统计:');
    const [groupStats] = await promisePool.query(`
      SELECT
        applicant_id,
        applicant_name,
        COUNT(*) as count
      FROM vm_requests
      GROUP BY applicant_id, applicant_name
      ORDER BY count DESC
    `);

    groupStats.forEach(stat => {
      console.log(`  - ${stat.applicant_name} (ID:${stat.applicant_id}): ${stat.count}条`);
    });

    // 3. 测试管理员导出查询
    console.log('\n🧪 测试管理员导出查询:');
    const [adminQuery] = await promisePool.query(`
      SELECT vr.*,
        u.username,
        u.real_name,
        e.name as environment_name,
        u.id as applicant_id
      FROM vm_requests vr
      LEFT JOIN users u ON vr.applicant_id = u.id
      LEFT JOIN environments e ON vr.environment_id = e.id
      ORDER BY vr.submitted_at DESC
    `);

    console.log(`✅ 管理员导出查询结果: ${adminQuery.length}条记录`);

    adminQuery.forEach((row, index) => {
      console.log(`${index + 1}. ${row.system_code} - ${row.system_name} (${row.type}) - ${row.environment_name || row.environment} - ${row.real_name || row.username} - ${row.status}`);
    });

    // 4. 测试普通用户导出查询
    console.log('\n🧪 测试普通用户导出查询:');
    const [normalUsers] = await promisePool.query('SELECT id, username, real_name FROM users WHERE role != "admin" LIMIT 1');

    if (normalUsers.length > 0) {
      const normalUser = normalUsers[0];
      const [normalQuery] = await promisePool.query(`
        SELECT vr.*,
          u.username,
          u.real_name,
          e.name as environment_name,
          u.id as applicant_id
        FROM vm_requests vr
        LEFT JOIN users u ON vr.applicant_id = u.id
        LEFT JOIN environments e ON vr.environment_id = e.id
        WHERE vr.applicant_id = ?
        ORDER BY vr.submitted_at DESC
      `, [normalUser.id]);

      console.log(`✅ 普通用户 ${normalUser.real_name || normalUser.username} 导出查询结果: ${normalQuery.length}条记录`);

      if (normalQuery.length > 0) {
        normalQuery.forEach((row, index) => {
          console.log(`${index + 1}. ${row.system_code} - ${row.system_name} (${row.type}) - ${row.environment_name || row.environment} - ${row.status}`);
        });
      } else {
        console.log('  (该用户没有虚拟机申请记录)');
      }
    }

    // 5. 按类型统计
    console.log('\n📊 按申请类型统计:');
    const [typeStats] = await promisePool.query(`
      SELECT type, COUNT(*) as count
      FROM vm_requests
      GROUP BY type
      ORDER BY count DESC
    `);

    typeStats.forEach(stat => {
      console.log(`  - ${stat.type}: ${stat.count}条`);
    });

    // 6. 按状态统计
    console.log('\n📊 按状态统计:');
    const [statusStats] = await promisePool.query(`
      SELECT status, COUNT(*) as count
      FROM vm_requests
      GROUP BY status
      ORDER BY count DESC
    `);

    statusStats.forEach(stat => {
      console.log(`  - ${stat.status}: ${stat.count}条`);
    });

    // 7. 验证Dashboard应该显示的记录数
    console.log('\n🔍 Dashboard显示验证:');
    console.log(`  - 管理员应该看到: ${adminQuery.length}条虚拟机申请`);
    console.log(`  - 导出Excel应该包含: ${adminQuery.length}条虚拟机申请`);

    // 8. 检查resource_requests表状态
    const [resourceTotal] = await promisePool.query('SELECT COUNT(*) as total FROM resource_requests');
    console.log(`\n📋 resource_requests表: ${resourceTotal[0].total}条记录 (已迁移，建议废弃)`);

  } catch (error) {
    console.error('❌ 验证失败:', error);
    throw error;
  }
}

verifyMigrationAndExport()
  .then(() => {
    console.log('\n✅ 验证完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 验证失败:', error);
    process.exit(1);
  });