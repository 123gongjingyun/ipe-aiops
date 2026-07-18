/**
 * 验证新的专门表是否创建成功
 */
const db = require('../config/database');

async function verifyNewTables() {
  try {
    console.log('🔍 验证新的专门表...\n');

    // 检查表是否存在
    const [tables] = await db.promisePool.query(`
      SHOW TABLES LIKE 'config_descriptions_%'
    `);

    console.log('📋 现有的配置描述表:');
    tables.forEach(row => {
      const tableName = Object.values(row)[0];
      console.log(`  - ${tableName}`);
    });

    // 检查Zookeeper表
    console.log('\n🔍 检查 Zookeeper 表...');
    try {
      const [zkResult] = await db.promisePool.query('SELECT COUNT(*) as count FROM config_descriptions_zookeeper');
      console.log(`✅ config_descriptions_zookeeper 存在，包含 ${zkResult[0].count} 条记录`);
    } catch (error) {
      console.log(`❌ config_descriptions_zookeeper 不存在或无法访问: ${error.message}`);
    }

    // 检查综合一体表
    console.log('\n🔍 检查 综合一一体 表...');
    try {
      const [cpResult] = await db.promisePool.query('SELECT COUNT(*) as count FROM config_descriptions_comprehensive');
      console.log(`✅ config_descriptions_comprehensive 存在，包含 ${cpResult[0].count} 条记录`);
    } catch (error) {
      console.log(`❌ config_descriptions_comprehensive 不存在或无法访问: ${error.message}`);
    }

    // 检查通用表中的Zookeeper数据
    console.log('\n🔍 检查通用表中的数据分布...');
    const [generalData] = await db.promisePool.query(`
      SELECT
        co.name as config_name,
        ct.name as type_name,
        cd.performance_metric1_name,
        cd.performance_metric1_value
      FROM config_descriptions_general cd
      LEFT JOIN config_options co ON cd.config_option_id = co.id
      LEFT JOIN config_types ct ON co.type_id = ct.id
      WHERE ct.name LIKE '%zookeeper%' OR ct.name LIKE '%综合%'
      LIMIT 5
    `);

    if (generalData.length > 0) {
      console.log(`⚠️  通用表中仍存在 ${generalData.length}+ 条 Zookeeper/综合一体 数据:`);
      generalData.forEach(row => {
        console.log(`  - ${row.config_name} (${row.type_name}): ${row.performance_metric1_name} = ${row.performance_metric1_value}`);
      });
    } else {
      console.log('✅ 通用表中没有 Zookeeper/综合一体 数据');
    }

    // 检查新表中的数据样本
    console.log('\n📊 新表数据样本...');

    try {
      const [zkSample] = await db.promisePool.query('SELECT * FROM config_descriptions_zookeeper LIMIT 1');
      if (zkSample.length > 0) {
        console.log('🎯 Zookeeper 表样本:');
        const sample = zkSample[0];
        console.log(`  - 架构: ${sample.architecture_type}`);
        console.log(`  - 客户端连接数: ${sample.client_connections}`);
        console.log(`  - 协调能力: ${sample.coordination_capability}`);
        console.log(`  - 读QPS: ${sample.read_qps}`);
      }
    } catch (error) {
      console.log('❌ 无法读取 Zookeeper 表数据');
    }

    try {
      const [cpSample] = await db.promisePool.query('SELECT * FROM config_descriptions_comprehensive LIMIT 1');
      if (cpSample.length > 0) {
        console.log('\n🎯 综合一一体 表样本:');
        const sample = cpSample[0];
        console.log(`  - 架构: ${sample.architecture_type}`);
        console.log(`  - 并发用户数: ${sample.concurrent_users}`);
        console.log(`  - 每秒请求数: ${sample.requests_per_second}`);
        console.log(`  - 响应时间: ${sample.response_time}`);
      }
    } catch (error) {
      console.log('❌ 无法读取 综合一一体 表数据');
    }

    console.log('\n✅ 验证完成！');

  } catch (error) {
    console.error('❌ 验证失败:', error);
  } finally {
    process.exit(0);
  }
}

verifyNewTables();