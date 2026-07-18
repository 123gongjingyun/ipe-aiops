/**
 * 修复虚拟机申请中cpu和memory为0的问题
 * 根据配置选项表中的正确值来更新申请记录
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

async function fixZeroCpuMemory() {
  try {
    console.log('🔧 开始修复虚拟机申请中cpu和memory为0的问题...\n');

    // 第1步：查找需要修复的记录
    console.log('📋 第1步：查找需要修复的记录\n');

    const [recordsToFix] = await promisePool.query(`
      SELECT
        vr.id,
        vr.system_code,
        vr.system_name,
        vr.config_option as request_config_option,
        vr.cpu as current_cpu,
        vr.memory as current_memory,
        vr.node_count as current_node_count,
        co.id as matched_config_id,
        co.name as matched_config_name,
        co.cpu as correct_cpu,
        co.memory as correct_memory,
        co.node_count as correct_node_count
      FROM vm_requests vr
      LEFT JOIN config_options co ON vr.config_option = co.name
      WHERE (vr.cpu = 0 OR vr.memory = 0)
        AND vr.id IN (1, 3)
      ORDER BY vr.id
    `);

    if (recordsToFix.length === 0) {
      console.log('✅ 没有需要修复的记录');
      return;
    }

    console.log(`找到 ${recordsToFix.length} 个需要修复的记录:\n`);

    recordsToFix.forEach((record, index) => {
      console.log(`${index + 1}. 虚拟机申请 ID: ${record.id}`);
      console.log(`   系统编号: ${record.system_code}`);
      console.log(`   系统名称: ${record.system_name}`);
      console.log(`   配置选项: ${record.request_config_option}`);
      console.log('');
      console.log('   当前值 ❌:');
      console.log(`   - CPU: ${record.current_cpu}`);
      console.log(`   - 内存: ${record.current_memory}`);
      console.log(`   - 节点数: ${record.current_node_count}`);
      console.log('');
      console.log('   正确值 ✅:');
      if (record.matched_config_id) {
        console.log(`   - 配置ID: ${record.matched_config_id}`);
        console.log(`   - CPU: ${record.correct_cpu}`);
        console.log(`   - 内存: ${record.correct_memory}`);
        console.log(`   - 节点数: ${record.correct_node_count}`);
      } else {
        console.log('   ⚠️  未找到匹配的配置选项');
      }
      console.log('   ' + '-'.repeat(50));
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
      console.log(`- 申请ID ${record.id}: CPU ${record.current_cpu} → ${record.correct_cpu}, 内存 ${record.current_memory} → ${record.correct_memory}`);
    });
    console.log('');

    // 第3步：执行更新
    console.log('⚡ 第3步：执行更新\n');

    for (const record of fixPlan) {
      console.log(`正在更新申请ID ${record.id}...`);

      const [result] = await promisePool.query(`
        UPDATE vm_requests
        SET cpu = ?, memory = ?, node_count = ?
        WHERE id = ?
      `, [record.correct_cpu, record.correct_memory, record.correct_node_count, record.id]);

      if (result.affectedRows > 0) {
        console.log(`✅ 成功更新申请ID ${record.id}: ${record.system_code} - ${record.system_name}`);
        console.log(`   CPU: ${record.current_cpu} → ${record.correct_cpu}`);
        console.log(`   内存: ${record.current_memory} → ${record.correct_memory}`);
        console.log(`   节点数: ${record.current_node_count} → ${record.correct_node_count}`);
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
        vr.cpu,
        vr.memory,
        vr.node_count,
        vr.status
      FROM vm_requests vr
      WHERE vr.id IN (1, 3)
      ORDER BY vr.id
    `);

    console.log('修复后的记录:\n');
    verification.forEach((record, index) => {
      console.log(`${index + 1}. 虚拟机申请 ID: ${record.id}`);
      console.log(`   系统编号: ${record.system_code}`);
      console.log(`   系统名称: ${record.system_name}`);
      console.log(`   配置选项: ${record.config_option}`);
      console.log(`   CPU: ${record.cpu} ${record.cpu > 0 ? '✅' : '❌'}`);
      console.log(`   内存: ${record.memory} ${record.memory > 0 ? '✅' : '❌'}`);
      console.log(`   节点数: ${record.node_count}`);
      console.log(`   状态: ${record.status}`);
      console.log('');
    });

    // 检查是否还有cpu或memory为0的记录
    const [checkRemaining] = await promisePool.query(`
      SELECT COUNT(*) as count
      FROM vm_requests
      WHERE cpu = 0 OR memory = 0
    `);

    console.log('📊 最终统计:');
    console.log(`- 修复的记录数: ${fixPlan.length}`);
    console.log(`- 剩余cpu或memory为0的记录数: ${checkRemaining[0].count}`);

    if (checkRemaining[0].count === 0) {
      console.log('\n🎉 修复完成！所有虚拟机申请的cpu和memory都已正确设置。');
    } else {
      console.log(`\n⚠️  仍有 ${checkRemaining[0].count} 个记录的cpu或memory为0，可能需要手动检查。`);
    }

  } catch (error) {
    console.error('❌ 修复过程出错:', error);
  } finally {
    await promisePool.end();
  }
}

fixZeroCpuMemory();
