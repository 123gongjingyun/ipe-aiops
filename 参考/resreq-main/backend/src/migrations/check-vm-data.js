/**
 * 检查虚拟机申请数据的详细情况
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../backend/.env') });
const { promisePool } = require('../config/database');

async function checkVMData() {
  console.log('🔍 检查虚拟机申请数据详情...');

  try {
    // 检查总记录数
    const [total] = await promisePool.query('SELECT COUNT(*) as total FROM vm_requests');
    console.log(`📊 总记录数: ${total[0].total}`);

    // 检查所有记录详情
    const [allRecords] = await promisePool.query(`
      SELECT
        vr.id,
        vr.system_code,
        vr.system_name,
        vr.applicant_id,
        u.username,
        u.real_name,
        u.role,
        vr.status,
        vr.submitted_at
      FROM vm_requests vr
      LEFT JOIN users u ON vr.applicant_id = u.id
      ORDER BY vr.id
    `);

    console.log('\n📋 所有记录详情:');
    allRecords.forEach((record, index) => {
      console.log(`${index + 1}. ID: ${record.id}, 系统: ${record.system_code} - ${record.system_name}, 申请人ID: ${record.applicant_id}, 用户: ${record.real_name || record.username} (${record.role}), 状态: ${record.status}`);
    });

    // 按申请人分组统计
    console.log('\n👥 按申请人分组统计:');
    const [groupStats] = await promisePool.query(`
      SELECT
        applicant_id,
        u.username,
        u.real_name,
        u.role,
        COUNT(*) as count
      FROM vm_requests vr
      LEFT JOIN users u ON vr.applicant_id = u.id
      GROUP BY applicant_id, u.username, u.real_name, u.role
      ORDER BY count DESC
    `);

    groupStats.forEach(stat => {
      console.log(`申请人ID: ${stat.applicant_id}, 用户: ${stat.real_name || stat.username} (${stat.role}), 记录数: ${stat.count}`);
    });

    // 检查当前用户信息
    const [users] = await promisePool.query('SELECT id, username, real_name, role FROM users WHERE role = "admin"');
    console.log('\n🔑 管理员用户:');
    users.forEach(user => {
      console.log(`ID: ${user.id}, 用户名: ${user.username}, 姓名: ${user.real_name}, 角色: ${user.role}`);
    });

    // 测试管理员查询
    if (users.length > 0) {
      const adminUser = users[0];
      console.log(`\n🧪 测试管理员 (${adminUser.username}) 查询:`);

      const [adminQuery] = await promisePool.query(`
        SELECT
          vr.*,
          u.username,
          u.real_name,
          e.name as environment_name,
          u.id as applicant_id
        FROM vm_requests vr
        LEFT JOIN users u ON vr.applicant_id = u.id
        LEFT JOIN environments e ON vr.environment_id = e.id
        ORDER BY vr.submitted_at DESC
      `);

      console.log(`管理员查询结果: ${adminQuery.length} 条记录`);

      // 检查普通用户查询
      const [normalUsers] = await promisePool.query('SELECT id, username, real_name, role FROM users WHERE role != "admin" LIMIT 1');
      if (normalUsers.length > 0) {
        const normalUser = normalUsers[0];
        console.log(`\n🧪 测试普通用户 (${normalUser.username}) 查询:`);

        const [normalQuery] = await promisePool.query(`
          SELECT
            vr.*,
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

        console.log(`普通用户查询结果: ${normalQuery.length} 条记录`);
      }
    }

  } catch (error) {
    console.error('❌ 检查失败:', error);
    throw error;
  }
}

checkVMData()
  .then(() => {
    console.log('\n✅ 检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 检查失败:', error);
    process.exit(1);
  });