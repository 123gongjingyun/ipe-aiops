/**
 * 检查虚拟机申请的环境字段差异
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../backend/.env') });
const { promisePool } = require('../config/database');

async function checkEnvironmentFields() {
  console.log('🔍 检查虚拟机申请的环境字段差异...\n');

  try {
    // 检查vm_requests表的结构
    const [structure] = await promisePool.query('DESC vm_requests');
    console.log('📋 vm_requests表结构:');
    structure.forEach(field => {
      if (field.Field.includes('env')) {
        console.log(`  - ${field.Field}: ${field.Type}`);
      }
    });

    // 检查实际数据
    const [data] = await promisePool.query(`
      SELECT
        id,
        system_code,
        system_name,
        type,
        environment,
        environment_id,
        (SELECT name FROM environments WHERE id = vm_requests.environment_id) as environment_name
      FROM vm_requests
      LIMIT 5
    `);

    console.log('\n📊 实际数据对比:');
    console.log('┌─────────────┬──────────────┬─────────────────┬─────────────────┐');
    console.log('│ 系统编号   │ environment │ environment_id    │ environment_name  │');
    console.log('├─────────────┼──────────────┼─────────────────┼─────────────────┤');

    data.forEach(row => {
      console.log(`│ ${row.system_code.padEnd(11)} │ ${(row.environment || '').padEnd(12)} │ ${String(row.environment_id || '').padEnd(17)} │ ${(row.environment_name || '').padEnd(17)} │`);
    });

    console.log('└─────────────┴──────────────┴─────────────────┴─────────────────┘');

    // 检查后端API返回的数据结构
    console.log('\n🔍 后端API返回的字段:');
    const [apiData] = await promisePool.query(`
      SELECT
        vr.*,
        u.username as applicant_name,
        u.real_name as applicant_real_name,
        e.name as environment_name
      FROM vm_requests vr
      LEFT JOIN users u ON vr.applicant_id = u.id
      LEFT JOIN environments e ON vr.environment_id = e.id
      LIMIT 1
    `);

    if (apiData.length > 0) {
      console.log('API返回的字段:');
      Object.keys(apiData[0]).forEach(key => {
        if (key.includes('env') || key.includes('environment')) {
          console.log(`  - ${key}: ${apiData[0][key]}`);
        }
      });
    }

  } catch (error) {
    console.error('❌ 检查失败:', error);
    throw error;
  }
}

checkEnvironmentFields()
  .then(() => {
    console.log('\n✅ 检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 检查失败:', error);
    process.exit(1);
  });