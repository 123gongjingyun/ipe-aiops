const { promisePool } = require('../config/database');

async function checkTable() {
  try {
    const [rows] = await promisePool.query("SHOW TABLES LIKE 'network_policies'");
    if (rows.length > 0) {
      console.log('✅ network_policies 表已存在');

      // 查看表结构
      const [columns] = await promisePool.query('DESC network_policies');
      console.log('\n表结构：');
      console.table(columns);

      // 查看数据量
      const [count] = await promisePool.query('SELECT COUNT(*) as total FROM network_policies');
      console.log(`\n当前记录数: ${count[0].total}`);

    } else {
      console.log('❌ network_policies 表不存在，请执行SQL创建');
    }
    process.exit(0);
  } catch (error) {
    console.error('检查表失败:', error);
    process.exit(1);
  }
}

checkTable();
