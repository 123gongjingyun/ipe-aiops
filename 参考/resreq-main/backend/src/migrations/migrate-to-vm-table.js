/**
 * 将resource_requests表的数据迁移到vm_requests表
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../backend/.env') });
const { promisePool } = require('../config/database');

async function migrateResourceRequestsToVM() {
  console.log('🔄 开始迁移resource_requests数据到vm_requests...');

  try {
    // 1. 检查vm_requests表当前数据
    const [vmExisting] = await promisePool.query('SELECT COUNT(*) as total FROM vm_requests');
    console.log(`📊 vm_requests表现有记录: ${vmExisting[0].total}条`);

    // 2. 获取resource_requests表中的所有数据
    const [resourceData] = await promisePool.query('SELECT * FROM resource_requests');
    console.log(`📊 resource_requests表记录: ${resourceData.length}条`);

    // 3. 检查环境数据
    const [environments] = await promisePool.query('SELECT id, name FROM environments');
    const envMap = {};
    environments.forEach(env => {
      envMap[env.name] = env.id;
    });
    console.log(`🌍 环境数据: ${environments.length}条`);

    // 4. 迁移数据
    let successCount = 0;
    let skipCount = 0;

    for (const resource of resourceData) {
      try {
        // 获取环境ID
        const environmentId = envMap[resource.environment] || null;

        // 检查是否已存在相同记录（根据system_code和type判断）
        const [existing] = await promisePool.query(
          'SELECT id FROM vm_requests WHERE system_code = ? AND type = ?',
          [resource.system_code, resource.type]
        );

        if (existing.length > 0) {
          console.log(`⏭️ 跳过重复记录: ${resource.system_code} - ${resource.system_name}`);
          skipCount++;
          continue;
        }

        // 获取用户信息
        const [users] = await promisePool.query('SELECT username, real_name FROM users WHERE id = ?', [resource.user_id]);
        const applicantName = users.length > 0 ? (users[0].real_name || users[0].username) : 'Unknown';

        // 插入数据到vm_requests表
        await promisePool.query(
          `INSERT INTO vm_requests
           (system_code, system_name, module_name, owner, type, environment, config_option,
            node_count, cpu, memory, disk_type, system_disk, data_disk, status,
            applicant_id, applicant_name, environment_id, submitted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            resource.system_code || '',
            resource.system_name,
            resource.module_name,
            resource.owner,
            resource.type,
            resource.environment,
            resource.config_option,
            resource.node_count || 1,
            resource.cpu || 0,
            resource.memory || 0,
            resource.disk_type || '高IO',
            resource.system_disk || 0,
            resource.data_disk || 0,
            resource.status,
            resource.user_id,
            applicantName,
            environmentId,
            resource.submitted_at
          ]
        );

        successCount++;
        console.log(`✅ 迁移成功: ${resource.system_code} - ${resource.system_name}`);

      } catch (error) {
        console.error(`❌ 迁移失败: ${resource.system_code} - ${resource.system_name}`, error.message);
      }
    }

    // 5. 验证迁移结果
    const [vmAfter] = await promisePool.query('SELECT COUNT(*) as total FROM vm_requests');
    console.log(`\n📊 迁移后vm_requests表记录: ${vmAfter[0].total}条`);

    console.log('\n📋 迁移统计:');
    console.log(`  - 成功迁移: ${successCount}条`);
    console.log(`  - 跳过重复: ${skipCount}条`);
    console.log(`  - 总处理: ${resourceData.length}条`);

    // 6. 显示vm_requests表的最新数据
    console.log('\n🔍 vm_requests表最新数据:');
    const [vmData] = await promisePool.query(`
      SELECT vr.id, vr.system_code, vr.system_name, vr.type, vr.environment,
             vr.applicant_name, vr.status, vr.submitted_at
      FROM vm_requests vr
      ORDER BY vr.id DESC
      LIMIT 10
    `);

    vmData.forEach((row, index) => {
      console.log(`${index + 1}. ${row.system_code} - ${row.system_name} (${row.type}) - ${row.environment} - ${row.applicant_name} - ${row.status}`);
    });

  } catch (error) {
    console.error('❌ 迁移过程出错:', error);
    throw error;
  }
}

migrateResourceRequestsToVM()
  .then(() => {
    console.log('\n✅ 迁移完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 迁移失败:', error);
    process.exit(1);
  });