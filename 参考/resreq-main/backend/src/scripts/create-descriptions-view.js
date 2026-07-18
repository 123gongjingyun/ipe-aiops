/**
 * 创建config_descriptions视图来合并所有分表数据
 * 这样可以兼容现有的导出功能，无需修改大量代码
 */

const mysql = require('mysql2/promise');
const db = require('../config/database');

async function createDescriptionsView() {
  const connection = await db.promisePool.getConnection();

  try {
    await connection.beginTransaction();

    console.log('🔄 创建config_descriptions视图...');

    // 首先删除已存在的视图（如果存在）
    await connection.query('DROP VIEW IF EXISTS config_descriptions');
    console.log('✅ 删除旧视图（如果存在）');

    // 创建视图，合并所有分表的数据
    const createViewSQL = `
      CREATE VIEW config_descriptions AS
      SELECT
        id, config_option_id, architecture_type,
        master_cpu_detail AS resource_cpu_detail,
        master_memory_detail AS resource_memory_detail,
        master_system_disk AS resource_system_disk,
        master_data_disk AS resource_data_disk,
        master_connections AS performance_concurrent,
        master_daily_qps AS performance_throughput,
        master_peak_qps AS performance_response,
        disk_iops AS performance_iops,
        disk_throughput AS performance_disk_throughput,
        disk_type_description,
        scenario_usage, scenario_user_scale,
        recommendation_level, technical_notes, price_level,
        created_at, updated_at,
        'mysql' as source_type
      FROM config_descriptions_mysql

      UNION ALL

      SELECT
        id, config_option_id, architecture_type,
        resource_cpu_detail, resource_memory_detail,
        resource_system_disk, resource_data_disk,
        concurrent_connections AS performance_concurrent,
        message_throughput AS performance_throughput,
        NULL AS performance_response,
        disk_iops AS performance_iops,
        disk_throughput AS performance_disk_throughput,
        disk_type_description,
        ha_features AS scenario_usage,
        scenario_user_scale,
        recommendation_level, technical_notes, price_level,
        created_at, updated_at,
        'rabbitmq' as source_type
      FROM config_descriptions_rabbitmq

      UNION ALL

      SELECT
        id, config_option_id, architecture_type,
        resource_cpu_detail, resource_memory_detail,
        resource_system_disk, resource_data_disk,
        max_connections AS performance_concurrent,
        ops_per_second AS performance_throughput,
        hit_rate AS performance_response,
        disk_iops AS performance_iops,
        disk_throughput AS performance_disk_throughput,
        disk_type_description,
        persistence_mode AS scenario_usage,
        scenario_user_scale,
        recommendation_level, technical_notes, price_level,
        created_at, updated_at,
        'redis' as source_type
      FROM config_descriptions_redis

      UNION ALL

      SELECT
        id, config_option_id, architecture_type,
        resource_cpu_detail, resource_memory_detail,
        resource_system_disk, resource_data_disk,
        NULL AS performance_concurrent,
        throughput AS performance_throughput,
        NULL AS performance_response,
        disk_iops AS performance_iops,
        disk_throughput AS performance_disk_throughput,
        disk_type_description,
        scenario_usage, scenario_user_scale,
        recommendation_level, technical_notes, price_level,
        created_at, updated_at,
        'kafka' as source_type
      FROM config_descriptions_kafka

      UNION ALL

      SELECT
        id, config_option_id, architecture_type,
        resource_cpu_detail, resource_memory_detail,
        resource_system_disk, resource_data_disk,
        concurrent_users AS performance_concurrent,
        requests_per_second AS performance_throughput,
        response_time AS performance_response,
        disk_iops AS performance_iops,
        disk_throughput AS performance_disk_throughput,
        disk_type_description,
        scenario_usage, scenario_user_scale,
        recommendation_level, technical_notes, price_level,
        created_at, updated_at,
        'ap' as source_type
      FROM config_descriptions_ap

      UNION ALL

      SELECT
        id, config_option_id, architecture_type,
        resource_cpu_detail, resource_memory_detail,
        resource_system_disk, resource_data_disk,
        client_connections AS performance_concurrent,
        coordination_capability AS performance_throughput,
        read_qps AS performance_response,
        disk_iops AS performance_iops,
        disk_throughput AS performance_disk_throughput,
        disk_type_description,
        ha_features AS scenario_usage,
        scenario_user_scale, recommendation_level,
        technical_notes, price_level,
        created_at, updated_at,
        'zookeeper' as source_type
      FROM config_descriptions_zookeeper

      UNION ALL

      SELECT
        id, config_option_id, architecture_type,
        resource_cpu_detail, resource_memory_detail,
        resource_system_disk, resource_data_disk,
        concurrent_users AS performance_concurrent,
        requests_per_second AS performance_throughput,
        response_time AS performance_response,
        disk_iops AS performance_iops,
        disk_throughput AS performance_disk_throughput,
        disk_type_description,
        scenario_usage, scenario_user_scale,
        recommendation_level, technical_notes, price_level,
        created_at, updated_at,
        'comprehensive' as source_type
      FROM config_descriptions_comprehensive

      UNION ALL

      SELECT
        id, config_option_id, architecture_type,
        resource_cpu_detail, resource_memory_detail,
        resource_system_disk, resource_data_disk,
        performance_metric1_value AS performance_concurrent,
        performance_metric2_value AS performance_throughput,
        performance_metric3_value AS performance_response,
        disk_iops AS performance_iops,
        disk_throughput AS performance_disk_throughput,
        disk_type_description,
        scenario_usage, scenario_user_scale,
        recommendation_level, technical_notes, price_level,
        created_at, updated_at,
        'general' as source_type
      FROM config_descriptions_general
    `;

    await connection.query(createViewSQL);
    console.log('✅ 视图创建成功');

    // 验证视图
    const [result] = await connection.query('SELECT COUNT(*) as total FROM config_descriptions');
    console.log(`📊 视图包含 ${result[0].total} 条记录`);

    // 测试视图数据
    const [sample] = await connection.query('SELECT * FROM config_descriptions LIMIT 3');
    console.log('🔍 视图数据示例:');
    sample.forEach(row => {
      console.log(`  - ID: ${row.id}, 类型: ${row.source_type}, 架构: ${row.architecture_type}`);
    });

    await connection.commit();
    console.log('🎉 config_descriptions视图创建完成！');

  } catch (error) {
    await connection.rollback();
    console.error('❌ 创建视图失败:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  createDescriptionsView()
    .then(() => {
      console.log('✅ 视图创建脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 视图创建脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { createDescriptionsView };