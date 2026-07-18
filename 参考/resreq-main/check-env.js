// 直接运行数据库检查
console.log('🔍 检查虚拟机申请的环境字段差异...');

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env' });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true
});

async function checkData() {
  try {
    // 检查vm_requests表数据
    const [vmData] = await pool.query(`
      SELECT id, system_code, environment, environment_id
      FROM vm_requests LIMIT 5
    `);

    console.log('\n📊 vm_requests表环境字段:');
    console.log('ID | 系统编号 | 环境(environment) | 环境ID(environment_id)');
    vmData.forEach(row => {
      console.log(`${row.id} | ${row.system_code} | ${row.environment} | ${row.environment_id}`);
    });

    // 检查环境表
    const [envData] = await pool.query('SELECT id, name FROM environments LIMIT 10');
    console.log('\n🌍 environments表:');
    envData.forEach(env => {
      console.log(`  ID:${env.id} → ${env.name}`);
    });

    // 检查API返回的字段
    const [apiData] = await pool.query(`
      SELECT vr.environment, e.name as environment_name
      FROM vm_requests vr
      LEFT JOIN environments e ON vr.environment_id = e.id
      LIMIT 3
    `);

    console.log('\n🔍 API返回的环境字段对比:');
    apiData.forEach(row => {
      console.log(`environment字段: "${row.environment}" | environment_name字段: "${row.environment_name}"`);
    });

    await pool.end();
  } catch(e) {
    console.error('❌ 错误:', e.message);
  } finally {
    process.exit(0);
  }
}

checkData();