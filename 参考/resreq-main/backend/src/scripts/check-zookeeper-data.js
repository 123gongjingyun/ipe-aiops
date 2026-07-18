/**
 * 检查Zookeeper配置详细说明数据
 */

const db = require('../config/database');

async function checkZookeeperData() {
    const connection = await db.promisePool.getConnection();

    try {
        console.log('🔍 检查Zookeeper配置详细说明数据...\n');

        // 检查Zookeeper单节点配置
        console.log('📋 Zookeeper单节点配置详细说明:');
        const [zkSingle] = await connection.query(`
            SELECT co.id, co.name, e.name as env_name, cd.*
            FROM config_options co
            JOIN config_descriptions_general cd ON co.id = cd.config_option_id
            JOIN config_types ct ON co.type_id = ct.id
            JOIN environments e ON co.environment_id = e.id
            WHERE ct.name = 'Zookeeper'
            AND co.name NOT LIKE '%3节点%'
            LIMIT 3
        `);

        zkSingle.forEach(config => {
            console.log(`\n${config.env_name} - ${config.name} (ID: ${config.id})`);
            console.log(`  架构类型: ${config.architecture_type}`);
            console.log(`  CPU详情: ${config.resource_cpu_detail}`);
            console.log(`  内存详情: ${config.resource_memory_detail}`);
            console.log(`  系统盘: ${config.resource_system_disk}`);
            console.log(`  数据盘: ${config.resource_data_disk}`);
            console.log(`  性能指标1: ${config.performance_metric1_name} = ${config.performance_metric1_value}`);
            console.log(`  性能指标2: ${config.performance_metric2_name} = ${config.performance_metric2_value}`);
            console.log(`  性能指标3: ${config.performance_metric3_name} = ${config.performance_metric3_value}`);
            console.log(`  磁盘IOPS: ${config.disk_iops}`);
            console.log(`  磁盘吞吐量: ${config.disk_throughput}`);
            console.log(`  推荐等级: ${config.recommendation_level}`);
            console.log(`  技术说明: ${config.technical_notes}`);
        });

        console.log('\n\n📋 Zookeeper集群配置详细说明:');
        const [zkCluster] = await connection.query(`
            SELECT co.id, co.name, e.name as env_name, cd.*
            FROM config_options co
            JOIN config_descriptions_general cd ON co.id = cd.config_option_id
            JOIN config_types ct ON co.type_id = ct.id
            JOIN environments e ON co.environment_id = e.id
            WHERE ct.name = 'Zookeeper'
            AND co.name LIKE '%3节点%'
            LIMIT 3
        `);

        zkCluster.forEach(config => {
            console.log(`\n${config.env_name} - ${config.name} (ID: ${config.id})`);
            console.log(`  架构类型: ${config.architecture_type}`);
            console.log(`  CPU详情: ${config.resource_cpu_detail}`);
            console.log(`  内存详情: ${config.resource_memory_detail}`);
            console.log(`  系统盘: ${config.resource_system_disk}`);
            console.log(`  数据盘: ${config.resource_data_disk}`);
            console.log(`  性能指标1: ${config.performance_metric1_name} = ${config.performance_metric1_value}`);
            console.log(`  性能指标2: ${config.performance_metric2_name} = ${config.performance_metric2_value}`);
            console.log(`  性能指标3: ${config.performance_metric3_name} = ${config.performance_metric3_value}`);
            console.log(`  磁盘IOPS: ${config.disk_iops}`);
            console.log(`  磁盘吞吐量: ${config.disk_throughput}`);
            console.log(`  推荐等级: ${config.recommendation_level}`);
            console.log(`  技术说明: ${config.technical_notes}`);
        });

        console.log('\n\n📊 数据完整性检查:');
        const [allZk] = await connection.query(`
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN performance_metric1_name IS NOT NULL THEN 1 ELSE 0 END) as with_metric1,
                   SUM(CASE WHEN performance_metric2_name IS NOT NULL THEN 1 ELSE 0 END) as with_metric2,
                   SUM(CASE WHEN performance_metric3_name IS NOT NULL THEN 1 ELSE 0 END) as with_metric3
            FROM config_descriptions_general cd
            JOIN config_options co ON cd.config_option_id = co.id
            JOIN config_types ct ON co.type_id = ct.id
            WHERE ct.name = 'Zookeeper'
        `);

        console.log(`Zookeeper配置总数: ${allZk[0].total}`);
        console.log(`有性能指标1的: ${allZk[0].with_metric1}`);
        console.log(`有性能指标2的: ${allZk[0].with_metric2}`);
        console.log(`有性能指标3的: ${allZk[0].with_metric3}`);

    } catch (error) {
        console.error('❌ 检查Zookeeper数据失败:', error.message);
    } finally {
        connection.release();
        process.exit(0);
    }
}

checkZookeeperData();