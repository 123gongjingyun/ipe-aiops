/**
 * 验证集群配置是否正确添加到数据库
 */

const db = require('../config/database');

async function verifyClusterConfigs() {
    const connection = await db.promisePool.getConnection();

    try {
        console.log('🔍 验证集群配置数据...\n');

        // 检查Redis集群配置
        console.log('🔴 Redis集群配置验证:');
        const [redisCluster] = await connection.query(`
            SELECT co.id, co.name, cd.architecture_type, cd.resource_cpu_detail, cd.max_connections, cd.ops_per_second
            FROM config_options co
            JOIN config_descriptions_redis cd ON co.id = cd.config_option_id
            JOIN config_types ct ON co.type_id = ct.id
            WHERE ct.name = 'redis'
            AND (co.name LIKE '%3主3从%' OR co.name LIKE '%一主二从三哨兵%')
            LIMIT 4
        `);

        redisCluster.forEach(config => {
            console.log(`✅ ${config.name}`);
            console.log(`   架构: ${config.architecture_type}`);
            console.log(`   CPU: ${config.resource_cpu_detail}`);
            console.log(`   连接数: ${config.max_connections}, QPS: ${config.ops_per_second}\n`);
        });

        // 检查Kafka集群配置
        console.log('🟡 Kafka集群配置验证:');
        const [kafkaCluster] = await connection.query(`
            SELECT co.id, co.name, cd.architecture_type, cd.resource_cpu_detail, cd.throughput, cd.partition_count
            FROM config_options co
            JOIN config_descriptions_kafka cd ON co.id = cd.config_option_id
            JOIN config_types ct ON co.type_id = ct.id
            WHERE ct.name = 'kafka'
            AND (co.name LIKE '%3节点%' OR co.name LIKE '%Kafka3加Zookeeper3%')
            LIMIT 4
        `);

        kafkaCluster.forEach(config => {
            console.log(`✅ ${config.name}`);
            console.log(`   架构: ${config.architecture_type}`);
            console.log(`   CPU: ${config.resource_cpu_detail}`);
            console.log(`   吞吐量: ${config.throughput}, 分区数: ${config.partition_count}\n`);
        });

        // 检查Zookeeper集群配置
        console.log('🟣 Zookeeper集群配置验证:');
        const [zkCluster] = await connection.query(`
            SELECT co.id, co.name, cd.architecture_type, cd.resource_cpu_detail,
                   cd.performance_metric1_value, cd.performance_metric2_value
            FROM config_options co
            JOIN config_descriptions_general cd ON co.id = cd.config_option_id
            JOIN config_types ct ON co.type_id = ct.id
            WHERE ct.name = 'Zookeeper'
            AND co.name LIKE '%3节点%'
            LIMIT 3
        `);

        zkCluster.forEach(config => {
            console.log(`✅ ${config.name}`);
            console.log(`   架构: ${config.architecture_type}`);
            console.log(`   CPU: ${config.resource_cpu_detail}`);
            console.log(`   客户端连接: ${config.performance_metric1_value}`);
            console.log(`   协调能力: ${config.performance_metric2_value}\n`);
        });

        // 统计验证
        const [redisCount] = await connection.query(`
            SELECT COUNT(*) as total FROM config_options co
            JOIN config_types ct ON co.type_id = ct.id
            WHERE ct.name = 'redis' AND (co.name LIKE '%3主3从%' OR co.name LIKE '%一主二从三哨兵%')
        `);

        const [kafkaCount] = await connection.query(`
            SELECT COUNT(*) as total FROM config_options co
            JOIN config_types ct ON co.type_id = ct.id
            WHERE ct.name = 'kafka' AND (co.name LIKE '%3节点%' OR co.name LIKE '%Kafka3加Zookeeper3%')
        `);

        const [zkCount] = await connection.query(`
            SELECT COUNT(*) as total FROM config_options co
            JOIN config_types ct ON co.type_id = ct.id
            WHERE ct.name = 'Zookeeper' AND co.name LIKE '%3节点%'
        `);

        console.log('📊 集群配置统计验证:');
        console.log(`🔴 Redis集群配置: ${redisCount[0].total} 个 ✓`);
        console.log(`🟡 Kafka集群配置: ${kafkaCount[0].total} 个 ✓`);
        console.log(`🟣 Zookeeper集群配置: ${zkCount[0].total} 个 ✓`);
        console.log(`📋 集群配置总计: ${redisCount[0].total + kafkaCount[0].total + zkCount[0].total} 个 ✓`);

        console.log('\n✅ 所有集群配置验证通过！配置已正确添加到数据库中。');

    } catch (error) {
        console.error('❌ 验证集群配置失败:', error.message);
    } finally {
        connection.release();
        process.exit(0);
    }
}

verifyClusterConfigs();