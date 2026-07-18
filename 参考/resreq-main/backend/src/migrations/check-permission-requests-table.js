const { promisePool } = require('../config/database');

async function checkTable() {
  try {
    const [rows] = await promisePool.query("SHOW TABLES LIKE 'permission_requests'");
    if (rows.length > 0) {
      console.log('✅ permission_requests 表已存在');

      // 查看表结构
      const [columns] = await promisePool.query('DESC permission_requests');
      console.log('\n表结构：');
      console.table(columns);

      // 查看数据量
      const [count] = await promisePool.query('SELECT COUNT(*) as total FROM permission_requests');
      console.log(`\n当前记录数: ${count[0].total}`);

      // 查看示例数据
      if (count[0].total > 0) {
        const [sampleData] = await promisePool.query('SELECT * FROM permission_requests LIMIT 3');
        console.log('\n示例数据：');
        console.table(sampleData);
      }

    } else {
      console.log('❌ permission_requests 表不存在，请执行SQL创建');
    }
    process.exit(0);
  } catch (error) {
    console.error('检查表失败:', error);
    process.exit(1);
  }
}

checkTable();
