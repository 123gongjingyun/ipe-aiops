/**
 * 检查数据库中现有的配置选项和详细说明数据
 */

const db = require('../config/database');

async function checkDatabaseStatus() {
    try {
        console.log('🔍 检查数据库状态...\n');

        // 1. 检查配置类型
        const [types] = await db.promisePool.query('SELECT id, name, description FROM config_types ORDER BY id');
        console.log('📋 配置类型:');
        types.forEach(type => {
            console.log(`  ${type.id}. ${type.name} - ${type.description || '无描述'}`);
        });

        // 2. 检查环境
        const [environments] = await db.promisePool.query('SELECT id, name, description FROM environments WHERE is_active = 1 ORDER BY id');
        console.log('\n🌍 环境:');
        environments.forEach(env => {
            console.log(`  ${env.id}. ${env.name} - ${env.description || '无描述'}`);
        });

        // 3. 检查配置选项
        const [configOptions] = await db.promisePool.query(`
            SELECT co.id, co.name, ct.name as type_name, e.name as env_name
            FROM config_options co
            LEFT JOIN config_types ct ON co.type_id = ct.id
            LEFT JOIN environments e ON co.environment_id = e.id
            ORDER BY ct.name, e.name, co.name
        `);

        console.log('\n⚙️ 配置选项:');
        const groupedOptions = {};
        configOptions.forEach(opt => {
            const key = `${opt.type_name} - ${opt.env_name}`;
            if (!groupedOptions[key]) {
                groupedOptions[key] = [];
            }
            groupedOptions[key].push(opt);
        });

        Object.keys(groupedOptions).forEach(key => {
            console.log(`\n  ${key}:`);
            groupedOptions[key].forEach(opt => {
                console.log(`    ${opt.id}. ${opt.name}`);
            });
        });

        // 4. 检查现有的配置详细说明
        const [redisDesc] = await db.promisePool.query('SELECT COUNT(*) as count FROM config_descriptions_redis');
        const [kafkaDesc] = await db.promisePool.query('SELECT COUNT(*) as count FROM config_descriptions_kafka');
        const [apDesc] = await db.promisePool.query('SELECT COUNT(*) as count FROM config_descriptions_ap');
        const [generalDesc] = await db.promisePool.query('SELECT COUNT(*) as count FROM config_descriptions_general');

        console.log('\n📝 配置详细说明统计:');
        console.log(`  Redis表: ${redisDesc[0].count} 条`);
        console.log(`  Kafka表: ${kafkaDesc[0].count} 条`);
        console.log(`  AP应用表: ${apDesc[0].count} 条`);
        console.log(`  通用表: ${generalDesc[0].count} 条`);

        // 5. 检查是否需要创建基础配置
        const redisExists = types.some(t => t.name.includes('Redis'));
        const kafkaExists = types.some(t => t.name.includes('Kafka'));
        const zkExists = types.some(t => t.name.includes('Zookeeper'));
        const apExists = types.some(t => t.name.includes('AP应用') || t.name.includes('应用服务'));

        console.log('\n🔧 需要创建的基础配置:');
        if (!redisExists) console.log('  ❌ Redis配置类型不存在');
        if (!kafkaExists) console.log('  ❌ Kafka配置类型不存在');
        if (!zkExists) console.log('  ❌ Zookeeper配置类型不存在');
        if (!apExists) console.log('  ❌ AP应用配置类型不存在');

        const needsCreation = !redisExists || !kafkaExists || !zkExists || !apExists;

        if (needsCreation) {
            console.log('\n💡 建议：请先在配置管理界面创建缺少的配置类型和基础配置选项');
            console.log('📝 或者我可以帮你创建基础的配置类型，是否需要？');
        } else {
            console.log('\n✅ 基础配置类型已存在，可以开始添加详细说明数据');
        }

    } catch (error) {
        console.error('❌ 检查数据库状态失败:', error);
        throw error;
    }
}

// 运行检查
if (require.main === module) {
    checkDatabaseStatus()
        .then(() => {
            console.log('\n✅ 数据库状态检查完成');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ 检查失败:', error);
            process.exit(1);
        });
}

module.exports = { checkDatabaseStatus };