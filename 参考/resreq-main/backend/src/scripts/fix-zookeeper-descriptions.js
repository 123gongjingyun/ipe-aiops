/**
 * 修复Zookeeper配置详细说明创建
 */

const db = require('../config/database');

async function fixZookeeperDescriptions() {
    const connection = await db.promisePool.getConnection();

    try {
        await connection.beginTransaction();

        console.log('🔄 修复Zookeeper配置详细说明...\n');

        // 获取Zookeeper配置选项
        const [zkOptions] = await connection.query(`
            SELECT co.id, co.name, e.name as env_name
            FROM config_options co
            LEFT JOIN config_types ct ON co.type_id = ct.id
            LEFT JOIN environments e ON co.environment_id = e.id
            WHERE ct.name = 'Zookeeper'
            ORDER BY e.name, co.name
        `);

        console.log(`📋 找到 ${zkOptions.length} 个Zookeeper配置选项:`);
        zkOptions.forEach(opt => {
            console.log(`  ${opt.env_name} - ${opt.name} (ID: ${opt.id})`);
        });

        let insertedCount = 0;

        for (const option of zkOptions) {
            try {
                // 使用通用表，但字段映射到通用字段
                const description = {
                    architecture_type: '单节点',
                    // 通用字段
                    resource_cpu_detail: getCpuConfig(option.name),
                    resource_memory_detail: getMemoryConfig(option.name),
                    resource_system_disk: getSystemDiskConfig(option.name),
                    resource_data_disk: getDataDiskConfig(option.name),
                    // 性能指标映射到通用字段
                    performance_metric1_name: '客户端连接数',
                    performance_metric1_value: getZKConnections(option.name),
                    performance_metric2_name: '协调能力',
                    performance_metric2_value: getZKPerformance(option.name),
                    performance_metric3_name: '读QPS',
                    performance_metric3_value: getZKReadQPS(option.name),
                    // 磁盘指标
                    disk_iops: getDiskIOPS(option.name),
                    disk_throughput: getDiskThroughput(option.name),
                    disk_type_description: '支持数据持久化',
                    // 场景信息
                    scenario_usage: option.env_name === '测试' ? '开发测试环境' : '生产环境',
                    scenario_user_scale: option.env_name === '测试' ? '日活<200' : '日活<10000',
                    // 其他字段
                    recommendation_level: '推荐',
                    technical_notes: 'Zookeeper单节点架构，无高可用保障',
                    price_level: getPriceLevel(option.name)
                };

                // 检查是否已存在
                const [existing] = await connection.query(
                    'SELECT id FROM config_descriptions_general WHERE config_option_id = ?',
                    [option.id]
                );

                if (existing.length > 0) {
                    console.log(`⏭️ 跳过已存在的详细说明: ${option.name}`);
                    continue;
                }

                // 转换字段名并插入数据
                const fields = ['config_option_id'];
                const values = [option.id];
                const placeholders = ['?'];

                Object.keys(description).forEach(key => {
                    if (key !== 'config_option_id' && description[key] !== undefined) {
                        const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
                        fields.push(dbField);
                        values.push(description[key]);
                        placeholders.push('?');
                    }
                });

                await connection.query(
                    `INSERT INTO config_descriptions_general (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`,
                    values
                );

                console.log(`✅ 创建Zookeeper详细说明: ${option.name} -> config_descriptions_general`);
                insertedCount++;

            } catch (error) {
                console.error(`❌ 创建Zookeeper详细说明失败: ${option.name}`, error.message);
            }
        }

        console.log(`\n📋 Zookeeper修复结果:`);
        console.log(`✅ 成功插入: ${insertedCount} 条`);

        await connection.commit();
        console.log('\n🎉 Zookeeper配置详细说明修复完成！');

        return { insertedCount };

    } catch (error) {
        await connection.rollback();
        console.error('❌ 修复Zookeeper配置失败，已回滚所有更改:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// 辅助函数
function getCpuConfig(name) {
    if (name.includes('2C4G')) return '2核Intel Xeon';
    if (name.includes('4C8G')) return '4核Intel Xeon';
    if (name.includes('8C16G')) return '8核Intel Xeon';
    return '4核Intel Xeon';
}

function getMemoryConfig(name) {
    if (name.includes('2C4G')) return '4GB DDR4';
    if (name.includes('4C8G')) return '8GB DDR4';
    if (name.includes('8C16G')) return '16GB DDR4';
    return '8GB DDR4';
}

function getSystemDiskConfig(name) {
    if (name.includes('2C4G')) return '40 GB 普通云盘';
    if (name.includes('4C8G')) return '40 GB SSD云盘';
    if (name.includes('8C16G')) return '40 GB SSD云盘';
    return '40 GB SSD云盘';
}

function getDataDiskConfig(name) {
    if (name.includes('2C4G')) return '100G 普通云盘';
    if (name.includes('4C8G')) return '200G SSD云盘';
    if (name.includes('8C16G')) return '500G SSD云盘';
    return '200G SSD云盘';
}

function getDiskIOPS(name) {
    if (name.includes('2C4G')) return '500-1000';
    if (name.includes('4C8G')) return '4800';
    if (name.includes('8C16G')) return '4800';
    return '4800';
}

function getDiskThroughput(name) {
    if (name.includes('2C4G')) return '40-90';
    if (name.includes('4C8G')) return '140';
    if (name.includes('8C16G')) return '140';
    return '140';
}

function getZKConnections(name) {
    if (name.includes('2C4G')) return '100-500';
    if (name.includes('4C8G')) return '1000-3000';
    if (name.includes('8C16G')) return '15000-30000';
    return '1000-3000';
}

function getZKPerformance(name) {
    if (name.includes('2C4G')) return '支持5-10个客户端';
    if (name.includes('4C8G')) return '支持20-50个客户端';
    if (name.includes('8C16G')) return '支持200-500个客户端';
    return '支持20-50个客户端';
}

function getZKReadQPS(name) {
    if (name.includes('2C4G')) return '5000-20000';
    if (name.includes('4C8G')) return '50000-150000';
    if (name.includes('8C16G')) return '500000-1500000';
    return '50000-150000';
}

function getPriceLevel(name) {
    if (name.includes('2C4G')) return '便宜';
    if (name.includes('4C8G')) return '中等';
    if (name.includes('8C16G')) return '较贵';
    return '中等';
}

// 运行脚本
if (require.main === module) {
    fixZookeeperDescriptions()
        .then((result) => {
            console.log('\n✅ Zookeeper配置修复完成');
            console.log(`📝 成功插入: ${result.insertedCount} 条`);
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Zookeeper配置修复失败:', error);
            process.exit(1);
        });
}

module.exports = { fixZookeeperDescriptions };