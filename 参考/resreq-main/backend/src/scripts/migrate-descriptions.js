/**
 * 数据迁移脚本
 * 将现有config_descriptions表的数据迁移到按类型分表的新结构
 */

const db = require('../config/database');

async function migrateConfigDescriptions() {
  const connection = await db.promisePool.getConnection();

  try {
    await connection.beginTransaction();

    console.log('🔄 开始迁移配置详细说明数据...');

    // 1. 获取所有现有数据
    const [oldDescriptions] = await connection.query(`
      SELECT cd.*, co.type_id, ct.name as type_name, co.environment_id, e.name as environment_name, co.name as config_name
      FROM config_descriptions cd
      LEFT JOIN config_options co ON cd.config_option_id = co.id
      LEFT JOIN config_types ct ON co.type_id = ct.id
      LEFT JOIN environments e ON co.environment_id = e.id
      ORDER BY cd.id
    `);

    console.log(`📊 找到 ${oldDescriptions.length} 条现有数据需要迁移`);

    let migratedCount = 0;
    let errorCount = 0;

    // 2. 按类型分类并迁移数据
    for (const oldDesc of oldDescriptions) {
      try {
        const typeName = oldDesc.type_name?.toLowerCase() || '';
        let targetTable = '';
        let migrateData = {};

        // 通用字段
        const commonData = {
          configOptionId: oldDesc.config_option_id,
          architectureType: oldDesc.architecture_type,
          diskIops: oldDesc.performance_iops,
          diskThroughput: oldDesc.performance_disk_throughput,
          diskTypeDescription: oldDesc.disk_type_description,
          scenarioUsage: oldDesc.scenario_usage,
          scenarioUserScale: oldDesc.scenario_user_scale,
          recommendationLevel: oldDesc.recommendation_level,
          technicalNotes: oldDesc.technical_notes,
          priceLevel: oldDesc.price_level
        };

        // 根据类型决定目标表和字段映射
        if (typeName.includes('数据库') || typeName.includes('mysql')) {
          targetTable = 'config_descriptions_mysql';

          migrateData = {
            ...commonData,
            // MySQL资源配置
            masterCpuDetail: oldDesc.resource_cpu_detail,
            masterMemoryDetail: oldDesc.resource_memory_detail,
            masterSystemDisk: oldDesc.resource_system_disk,
            masterDataDisk: oldDesc.resource_data_disk,
            masterConnections: oldDesc.performance_concurrent,
            masterDailyQps: oldDesc.performance_throughput?.split('/')[0]?.trim(),
            masterPeakQps: oldDesc.performance_throughput?.split('/')[1]?.trim()
          };

        } else if (typeName.includes('rabbitmq')) {
          targetTable = 'config_descriptions_rabbitmq';

          migrateData = {
            ...commonData,
            resourceCpuDetail: oldDesc.resource_cpu_detail,
            resourceMemoryDetail: oldDesc.resource_memory_detail,
            resourceSystemDisk: oldDesc.resource_system_disk,
            resourceDataDisk: oldDesc.resource_data_disk,
            concurrentConnections: oldDesc.performance_concurrent,
            messageThroughput: oldDesc.performance_throughput,
            queueCount: oldDesc.capacity_queues,
            haFeatures: oldDesc.technical_notes
          };

        } else if (typeName.includes('redis')) {
          targetTable = 'config_descriptions_redis';

          migrateData = {
            ...commonData,
            resourceCpuDetail: oldDesc.resource_cpu_detail,
            resourceMemoryDetail: oldDesc.resource_memory_detail,
            resourceSystemDisk: oldDesc.resource_system_disk,
            resourceDataDisk: oldDesc.resource_data_disk,
            maxConnections: oldDesc.performance_concurrent,
            opsPerSecond: oldDesc.performance_throughput,
            memoryUsage: oldDesc.capacity_storage,
            persistenceMode: oldDesc.technical_notes
          };

        } else if (typeName.includes('kafka')) {
          targetTable = 'config_descriptions_kafka';

          migrateData = {
            ...commonData,
            resourceCpuDetail: oldDesc.resource_cpu_detail,
            resourceMemoryDetail: oldDesc.resource_memory_detail,
            resourceSystemDisk: oldDesc.resource_system_disk,
            resourceDataDisk: oldDesc.resource_data_disk,
            throughput: oldDesc.performance_throughput,
            partitionCount: oldDesc.capacity_queues,
            replicationFactor: oldDesc.capacity_storage,
            retentionPeriod: oldDesc.technical_notes
          };

        } else if (typeName.includes('ap') || typeName.includes('应用')) {
          targetTable = 'config_descriptions_ap';

          migrateData = {
            ...commonData,
            resourceCpuDetail: oldDesc.resource_cpu_detail,
            resourceMemoryDetail: oldDesc.resource_memory_detail,
            resourceSystemDisk: oldDesc.resource_system_disk,
            resourceDataDisk: oldDesc.resource_data_disk,
            concurrentUsers: oldDesc.performance_concurrent,
            requestsPerSecond: oldDesc.performance_throughput,
            responseTime: oldDesc.performance_response,
            userCapacity: oldDesc.scenario_user_scale
          };

        } else {
          // 其他类型使用通用表
          targetTable = 'config_descriptions_general';

          migrateData = {
            ...commonData,
            resourceCpuDetail: oldDesc.resource_cpu_detail,
            resourceMemoryDetail: oldDesc.resource_memory_detail,
            resourceSystemDisk: oldDesc.resource_system_disk,
            resourceDataDisk: oldDesc.resource_data_disk,
            performanceMetric1Name: '并发连接数',
            performanceMetric1Value: oldDesc.performance_concurrent,
            performanceMetric2Name: '吞吐量',
            performanceMetric2Value: oldDesc.performance_throughput,
            performanceMetric3Name: '响应时间',
            performanceMetric3Value: oldDesc.performance_response
          };
        }

        // 执行插入
        const fields = Object.keys(migrateData).map(key => {
          // 转换驼峰命名为下划线命名
          return key.replace(/([A-Z])/g, '_$1').toLowerCase();
        });

        const values = Object.values(migrateData);
        const placeholders = values.map(() => '?').join(', ');

        await connection.query(
          `INSERT INTO ${targetTable} (${fields.join(', ')}) VALUES (${placeholders})`,
          values
        );

        console.log(`✅ 成功迁移: ${oldDesc.config_name} (${oldDesc.type_name}) -> ${targetTable}`);
        migratedCount++;

      } catch (error) {
        console.error(`❌ 迁移失败: ${oldDesc.config_name} (${oldDesc.type_name})`, error.message);
        errorCount++;
      }
    }

    console.log('\n📋 迁移结果总结:');
    console.log(`✅ 成功迁移: ${migratedCount} 条`);
    console.log(`❌ 迁移失败: ${errorCount} 条`);
    console.log(`📊 总计处理: ${oldDescriptions.length} 条`);

    // 3. 备份旧表
    console.log('\n🔄 备份旧表...');
    await connection.query('RENAME TABLE config_descriptions TO config_descriptions_backup');
    console.log('✅ 旧表已重命名为 config_descriptions_backup');

    await connection.commit();
    console.log('\n🎉 迁移成功完成！');

  } catch (error) {
    await connection.rollback();
    console.error('❌ 迁移失败，已回滚所有更改:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  migrateConfigDescriptions()
    .then(() => {
      console.log('✅ 迁移脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 迁移脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { migrateConfigDescriptions };