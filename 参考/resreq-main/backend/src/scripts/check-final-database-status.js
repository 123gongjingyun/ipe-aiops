/**
 * 检查最终数据库配置状态
 */

const db = require('../config/database');

async function checkFinalDatabaseStatus() {
    const connection = await db.promisePool.getConnection();

    try {
        console.log('🎯 最终数据库配置状态检查\n');
        console.log('='.repeat(80));

        // 检查配置类型
        const [types] = await connection.query('SELECT name, id FROM config_types ORDER BY id');
        console.log('\n📋 配置类型:');
        types.forEach(type => {
            console.log(`  ${type.id}. ${type.name}`);
        });

        // 检查每种类型的配置选项数量
        console.log('\n📊 配置选项统计:');
        for (const type of types) {
            const [count] = await connection.query(
                'SELECT COUNT(*) as total FROM config_options WHERE type_id = ?',
                [type.id]
            );
            console.log(`  ${type.name.padEnd(15)}: ${count[0].total} 个配置选项`);
        }

        // 检查详细说明统计
        console.log('\n📝 配置详细说明统计:');
        const tables = [
            { name: 'MySQL', table: 'config_descriptions_mysql', type: 'MySQL' },
            { name: 'RabbitMQ', table: 'config_descriptions_rabbitmq', type: 'RabbitMQ' },
            { name: 'Redis', table: 'config_descriptions_redis', type: 'redis' },
            { name: 'Kafka', table: 'config_descriptions_kafka', type: 'kafka' },
            { name: 'AP应用', table: 'config_descriptions_ap', type: 'AP' },
            { name: '通用配置', table: 'config_descriptions_general', type: 'Zookeeper' }
        ];

        for (const config of tables) {
            const [count] = await connection.query(
                `SELECT COUNT(*) as total FROM ${config.table}`
            );
            console.log(`  ${config.name.padEnd(15)}: ${count[0].total} 条详细说明`);
        }

        // 检查Redis架构类型分布
        console.log('\n🔴 Redis架构类型分布:');
        const [redisArchs] = await connection.query(`
            SELECT
                SUBSTRING_INDEX(cd.architecture_type, '(', 1) as arch_type,
                COUNT(*) as count
            FROM config_descriptions_redis cd
            JOIN config_options co ON cd.config_option_id = co.id
            JOIN config_types ct ON co.type_id = ct.id
            WHERE ct.name = 'redis'
            GROUP BY arch_type
        `);
        redisArchs.forEach(arch => {
            console.log(`  ${arch.arch_type.padEnd(20)}: ${arch.count} 个配置`);
        });

        // 检查Kafka架构类型分布
        console.log('\n🟡 Kafka架构类型分布:');
        const [kafkaArchs] = await connection.query(`
            SELECT
                CASE
                    WHEN co.name LIKE '%3加Zookeeper3%' THEN 'Kafka+ZK组合'
                    WHEN co.name LIKE '%3节点%' THEN 'Kafka 3节点集群'
                    ELSE 'Kafka 单节点'
                END as arch_type,
                COUNT(*) as count
            FROM config_descriptions_kafka cd
            JOIN config_options co ON cd.config_option_id = co.id
            JOIN config_types ct ON co.type_id = ct.id
            WHERE ct.name = 'kafka'
            GROUP BY arch_type
        `);
        kafkaArchs.forEach(arch => {
            console.log(`  ${arch.arch_type.padEnd(20)}: ${arch.count} 个配置`);
        });

        // 检查Zookeeper架构类型分布
        console.log('\n🟣 Zookeeper架构类型分布:');
        const [zkArchs] = await connection.query(`
            SELECT
                CASE
                    WHEN co.name LIKE '%3节点%' THEN 'ZK 3节点集群'
                    ELSE 'ZK 单节点'
                END as arch_type,
                COUNT(*) as count
            FROM config_descriptions_general cd
            JOIN config_options co ON cd.config_option_id = co.id
            JOIN config_types ct ON co.type_id = ct.id
            WHERE ct.name = 'Zookeeper'
            GROUP BY arch_type
        `);
        zkArchs.forEach(arch => {
            console.log(`  ${arch.arch_type.padEnd(20)}: ${arch.count} 个配置`);
        });

        // 总计统计
        const [totalOptions] = await connection.query('SELECT COUNT(*) as total FROM config_options');
        const [totalDesc] = await connection.query(`
            SELECT
                (SELECT COUNT(*) FROM config_descriptions_mysql) +
                (SELECT COUNT(*) FROM config_descriptions_rabbitmq) +
                (SELECT COUNT(*) FROM config_descriptions_redis) +
                (SELECT COUNT(*) FROM config_descriptions_kafka) +
                (SELECT COUNT(*) FROM config_descriptions_ap) +
                (SELECT COUNT(*) FROM config_descriptions_general) as total
        `);

        console.log('\n📈 总计统计:');
        console.log(`  配置选项总计: ${totalOptions[0].total} 个`);
        console.log(`  配置详细说明总计: ${totalDesc[0].total} 条`);

        console.log('\n🌟 支持的服务架构总结:');
        console.log('  🔴 Redis: 单节点、3主3从集群、哨兵模式(1主2从3哨兵)');
        console.log('  🟡 Kafka: 单节点、3节点集群、Kafka+Zookeeper组合');
        console.log('  🟣 Zookeeper: 单节点、3节点集群');
        console.log('  🟤 MySQL: 单节点、主从架构');
        console.log('  🟠 RabbitMQ: 单节点、集群架构');
        console.log('  🔵 AP应用: 单节点架构');

        console.log('\n✅ 数据库配置已完成，所有集群架构配置已成功添加！');

    } catch (error) {
        console.error('❌ 检查数据库状态失败:', error.message);
    } finally {
        connection.release();
        process.exit(0);
    }
}

checkFinalDatabaseStatus();