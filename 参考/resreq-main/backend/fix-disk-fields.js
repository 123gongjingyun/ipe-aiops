/**
 * 修复虚拟机申请中system_disk和data_disk为0的问题
 */

require('dotenv').config();
const mysql = require('mysql2');

// 创建数据库连接
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'vmconf_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

const promisePool = pool.promise();

async function fixDiskFields() {
  try {
    console.log('🔧 开始修复虚拟机申请中system_disk和data_disk为0的问题...\n');

    // 第1步：查找需要修复的记录
    console.log('📋 第1步：查找需要修复的记录\n');

    const [recordsToFix] = await promisePool.query(`
      SELECT DISTINCT
        vr.id,
        vr.system_code,
        vr.system_name,
        vr.config_option as request_config_option,
        vr.system_disk as current_system_disk,
        vr.data_disk as current_data_disk,
        vr.disk_type as current_disk_type,
        MIN(co.id) as matched_config_id,
        MIN(co.name) as matched_config_name,
        MIN(co.system_disk) as correct_system_disk,
        MIN(co.data_disk) as correct_data_disk,
        MIN(co.disk_type) as correct_disk_type
      FROM vm_requests vr
      LEFT JOIN config_options co ON vr.config_option = co.name
      WHERE (vr.system_disk = 0 OR vr.data_disk = 0)
        AND vr.id IN (1, 2, 3, 4, 5)
      GROUP BY vr.id, vr.system_code, vr.system_name, vr.config_option,
               vr.system_disk, vr.data_disk, vr.disk_type
      ORDER BY vr.id
    `);

    if (recordsToFix.length === 0) {
      console.log('✅ 没有需要修复的磁盘字段记录');
      return;
    }

    console.log(`找到 ${recordsToFix.length} 个需要修复磁盘字段的记录:\n`);

    recordsToFix.forEach((record, index) => {
      console.log(`${index + 1}. 虚拟机申请 ID: ${record.id}`);
      console.log(`   系统编号: ${record.system_code}`);
      console.log(`   系统名称: ${record.system_name}`);
      console.log(`   配置选项: ${record.request_config_option}`);
      console.log('');
      console.log('   当前值 ❌:');
      console.log(`   - 系统盘: ${record.current_system_disk}GB`);
      console.log(`   - 数据盘: ${record.current_data_disk}GB`);
      console.log(`   - 磁盘类型: ${record.current_disk_type}`);
      console.log('');
      console.log('   正确值 ✅:');
      if (record.matched_config_id) {
        console.log(`   - 系统盘: ${record.correct_system_disk}GB`);
        console.log(`   - 数据盘: ${record.correct_data_disk}GB`);
        console.log(`   - 磁盘类型: ${record.correct_disk_type}`);
      } else {
        console.log('   ⚠️  未找到匹配的配置选项');
      }
      console.log('   ' + '-'.repeat(60));
      console.log('');
    });

    // 第2步：确认修复计划
    console.log('📝 第2步：确认修复计划\n');

    const fixPlan = recordsToFix.filter(r => r.matched_config_id);
    if (fixPlan.length === 0) {
      console.log('❌ 没有可修复的记录（未找到匹配的配置选项）');
      return;
    }

    console.log('将执行以下更新:');
    fixPlan.forEach((record) => {
      console.log(`- 申请ID ${record.id}: 系统盘 ${record.current_system_disk}GB → ${record.correct_system_disk}GB, 数据盘 ${record.current_data_disk}GB → ${record.correct_data_disk}GB`);
    });
    console.log('');

    // 第3步：执行更新
    console.log('⚡ 第3步：执行更新\n');

    for (const record of fixPlan) {
      console.log(`正在更新申请ID ${record.id}...`);

      const [result] = await promisePool.query(`
        UPDATE vm_requests
        SET system_disk = ?, data_disk = ?, disk_type = ?
        WHERE id = ?
      `, [record.correct_system_disk, record.correct_data_disk, record.correct_disk_type, record.id]);

      if (result.affectedRows > 0) {
        console.log(`✅ 成功更新申请ID ${record.id}: ${record.system_code} - ${record.system_name}`);
        console.log(`   系统盘: ${record.current_system_disk}GB → ${record.correct_system_disk}GB`);
        console.log(`   数据盘: ${record.current_data_disk}GB → ${record.correct_data_disk}GB`);
        console.log(`   磁盘类型: ${record.current_disk_type} → ${record.correct_disk_type}`);
      } else {
        console.log(`❌ 更新失败: 申请ID ${record.id}`);
      }
      console.log('');
    }

    // 第4步：验证修复结果
    console.log('🔍 第4步：验证修复结果\n');

    const [verification] = await promisePool.query(`
      SELECT
        vr.id,
        vr.system_code,
        vr.system_name,
        vr.config_option,
        vr.system_disk,
        vr.data_disk,
        vr.disk_type,
        vr.status
      FROM vm_requests vr
      WHERE vr.id IN (1, 2, 3, 4, 5)
      ORDER BY vr.id
    `);

    console.log('修复后的记录:\n');
    verification.forEach((record, index) => {
      console.log(`${index + 1}. 虚拟机申请 ID: ${record.id}`);
      console.log(`   系统编号: ${record.system_code}`);
      console.log(`   系统名称: ${record.system_name}`);
      console.log(`   配置选项: ${record.config_option}`);
      console.log(`   系统盘: ${record.system_disk}GB ${record.system_disk > 0 ? '✅' : '❌'}`);
      console.log(`   数据盘: ${record.data_disk}GB ${record.data_disk > 0 ? '✅' : '❌'}`);
      console.log(`   资源配置: ${record.system_disk}GB+${record.data_disk}GB`);
      console.log(`   磁盘类型: ${record.disk_type}`);
      console.log(`   状态: ${record.status}`);
      console.log('');
    });

    // 检查是否还有system_disk或data_disk为0的记录
    const [checkRemaining] = await promisePool.query(`
      SELECT COUNT(*) as count
      FROM vm_requests
      WHERE system_disk = 0 OR data_disk = 0
    `);

    console.log('📊 最终统计:');
    console.log(`- 修复的记录数: ${fixPlan.length}`);
    console.log(`- 剩余system_disk或data_disk为0的记录数: ${checkRemaining[0].count}`);

    if (checkRemaining[0].count === 0) {
      console.log('\n🎉 修复完成！所有虚拟机申请的磁盘字段都已正确设置。');
    } else {
      console.log(`\n⚠️  仍有 ${checkRemaining[0].count} 个记录的磁盘字段为0，可能需要手动检查。`);
    }

  } catch (error) {
    console.error('❌ 修复过程出错:', error);
  } finally {
    await promisePool.end();
  }
}

fixDiskFields();
