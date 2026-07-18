/**
 * 检查Redis描述表结构
 */

const db = require('../config/database');

async function checkRedisTableStructure() {
    const connection = await db.promisePool.getConnection();

    try {
        console.log('🔍 检查 config_descriptions_redis 表结构...\n');

        const [columns] = await connection.query('DESCRIBE config_descriptions_redis');

        console.log('📋 config_descriptions_redis 表字段:');
        console.log('字段名'.padEnd(30), '类型'.padEnd(20), '允许NULL'.padEnd(10), '键');
        console.log('-'.repeat(80));

        columns.forEach(col => {
            console.log(
                col.Field.padEnd(30),
                col.Type.padEnd(20),
                col.Null.padEnd(10),
                col.Key || ''
            );
        });

        console.log('\n📊 检查现有Redis集群描述数据...\n');

        // 查看现有的集群描述数据
        const [existingDescriptions] = await connection.query(`
            SELECT cd.id, co.name as config_name, ct.name as type_name, e.name as env_name
            FROM config_descriptions_redis cd
            JOIN config_options co ON cd.config_option_id = co.id
            JOIN config_types ct ON co.type_id = ct.id
            JOIN environments e ON co.environment_id = e.id
            WHERE ct.name = 'redis'
            ORDER BY e.name, co.name
            LIMIT 10
        `);

        if (existingDescriptions.length > 0) {
            console.log('现有Redis描述示例:');
            existingDescriptions.forEach(desc => {
                console.log(`  ${desc.env_name} - ${desc.config_name} (ID: ${desc.id})`);
            });
        } else {
            console.log('暂无Redis描述数据');
        }

    } catch (error) {
        console.error('❌ 检查表结构失败:', error.message);
    } finally {
        connection.release();
        process.exit(0);
    }
}

checkRedisTableStructure();