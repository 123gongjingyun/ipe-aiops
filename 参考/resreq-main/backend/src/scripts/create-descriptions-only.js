/**
 * 仅创建配置详细说明数据（假设配置选项已存在）
 */

const db = require('../config/database');

async function createConfigDescriptions() {
    const connection = await db.promisePool.getConnection();

    try {
        await connection.beginTransaction();

        console.log('🔄 开始创建配置详细说明数据...\n');

        // 获取所有配置选项
        const [configOptions] = await connection.query(`
            SELECT co.id, co.name, ct.name as type_name, e.name as env_name
            FROM config_options co
            LEFT JOIN config_types ct ON co.type_id = ct.id
            LEFT JOIN environments e ON co.environment_id = e.id
            WHERE ct.name IN ('redis', 'kafka', 'Zookeeper', 'AP')
            ORDER BY ct.name, e.name, co.name
        `);

        console.log(`📋 找到 ${configOptions.length} 个配置选项:`);
        configOptions.forEach(opt => {
            console.log(`  ${opt.type_name} - ${opt.env_name} - ${opt.name} (ID: ${opt.id})`);
        });

        let insertedCount = 0;
        let errorCount = 0;

        for (const option of configOptions) {
            try {
                let description = null;
                let targetTable = '';

                // 根据服务类型生成对应的详细说明
                if (option.type_name === 'redis') {
                    targetTable = 'config_descriptions_redis';
                    description = generateRedisDescription(option);
                } else if (option.type_name === 'kafka') {
                    targetTable = 'config_descriptions_kafka';
                    description = generateKafkaDescription(option);
                } else if (option.type_name === 'Zookeeper') {
                    targetTable = 'config_descriptions_general';
                    description = generateZookeeperDescription(option);
                } else if (option.type_name === 'AP') {
                    targetTable = 'config_descriptions_ap';
                    description = generateAPDescription(option);
                }

                if (description && targetTable) {
                    // 检查是否已存在
                    const [existing] = await connection.query(
                        `SELECT id FROM ${targetTable} WHERE config_option_id = ?`,
                        [option.id]
                    );

                    if (existing.length > 0) {
                        console.log(`⏭️ 跳过已存在的详细说明: ${option.name} (${option.type_name})`);
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
                        `INSERT INTO ${targetTable} (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`,
                        values
                    );

                    console.log(`✅ 创建详细说明: ${option.name} -> ${targetTable}`);
                    insertedCount++;
                }

            } catch (error) {
                console.error(`❌ 创建详细说明失败: ${option.name}`, error.message);
                errorCount++;
            }
        }

        console.log(`\n📋 创建结果总结:`);
        console.log(`✅ 成功插入: ${insertedCount} 条`);
        console.log(`❌ 插入失败: ${errorCount} 条`);

        await connection.commit();
        console.log('\n🎉 配置详细说明数据添加成功！');

        return { insertedCount, errorCount };

    } catch (error) {
        await connection.rollback();
        console.error('❌ 添加配置数据失败，已回滚所有更改:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// 生成Redis配置详细说明
function generateRedisDescription(option) {
    const memSize = option.name.includes('2C4G') ? '2C4G' : option.name.includes('4C8G') ? '4C8G' : '8C16G';

    return {
        architecture_type: '单节点',
        resource_cpu_detail: getCpuConfig(memSize),
        resource_memory_detail: getMemoryConfig(memSize),
        resource_system_disk: getSystemDiskConfig(memSize),
        resource_data_disk: getDataDiskConfig(memSize),
        max_connections: getMaxConnections(memSize),
        ops_per_second: getOpsPerSecond(memSize),
        memory_usage: '<80%',
        hit_rate: '95%+',
        data_size: getDataSize(memSize),
        persistence_mode: 'RDB/AOF',
        disk_iops: getDiskIOPS(memSize),
        disk_throughput: getDiskThroughput(memSize),
        scenario_usage: option.env_name === '测试' ? '开发测试环境' : '生产环境',
        scenario_user_scale: option.env_name === '测试' ? '日活<1000' : '日活<50000',
        recommendation_level: '推荐',
        technical_notes: 'Redis单节点架构，支持数据持久化',
        price_level: getPriceLevel(memSize)
    };
}

// 生成Kafka配置详细说明
function generateKafkaDescription(option) {
    const memSize = option.name.includes('2C4G') ? '2C4G' : option.name.includes('4C8G') ? '4C8G' : '8C16G';

    return {
        architecture_type: '单节点',
        resource_cpu_detail: getCpuConfig(memSize),
        resource_memory_detail: getMemoryConfig(memSize),
        resource_system_disk: getSystemDiskConfig(memSize),
        resource_data_disk: getDataDiskConfig(memSize),
        throughput: getThroughput(memSize, 'Kafka'),
        partition_count: getPartitionCount(memSize),
        replication_factor: '2-3',
        broker_count: 1,
        retention_period: '7天',
        disk_iops: getDiskIOPS(memSize),
        disk_throughput: getDiskThroughput(memSize),
        scenario_usage: option.env_name === '测试' ? '开发测试环境' : '生产环境',
        scenario_user_scale: option.env_name === '测试' ? '日活<500' : '日活<20000',
        recommendation_level: '推荐',
        technical_notes: 'Kafka单节点架构，适合开发测试和小规模应用',
        price_level: getPriceLevel(memSize)
    };
}

// 生成Zookeeper配置详细说明
function generateZookeeperDescription(option) {
    const memSize = option.name.includes('2C4G') ? '2C4G' : option.name.includes('4C8G') ? '4C8G' : '8C16G';

    return {
        architecture_type: '单节点',
        resource_cpu_detail: getCpuConfig(memSize),
        resource_memory_detail: getMemoryConfig(memSize),
        resource_system_disk: getSystemDiskConfig(memSize),
        resource_data_disk: getDataDiskConfig(memSize),
        concurrent_connections: getConcurrentConnections(memSize),
        throughput: '1000-5000',
        disk_iops: getDiskIOPS(memSize),
        disk_throughput: getDiskThroughput(memSize),
        scenario_usage: option.env_name === '测试' ? '开发测试环境' : '生产环境',
        scenario_user_scale: option.env_name === '测试' ? '日活<200' : '日活<10000',
        recommendation_level: '推荐',
        technical_notes: 'Zookeeper单节点架构，无高可用保障',
        price_level: getPriceLevel(memSize)
    };
}

// 生成AP应用配置详细说明
function generateAPDescription(option) {
    const memSize = option.name.includes('2C4G') ? '2C4G' : option.name.includes('4C8G') ? '4C8G' : '8C16G';

    return {
        architecture_type: '单节点',
        resource_cpu_detail: getCpuConfig(memSize),
        resource_memory_detail: getMemoryConfig(memSize),
        resource_system_disk: getSystemDiskConfig(memSize),
        resource_data_disk: getDataDiskConfig(memSize),
        concurrent_users: getConcurrentUsers(memSize),
        requests_per_second: getRequestsPerSecond(memSize),
        response_time: getResponseTime(memSize),
        throughput: getThroughput(memSize, 'AP'),
        user_capacity: getUserCapacity(memSize),
        disk_iops: getDiskIOPS(memSize),
        disk_throughput: getDiskThroughput(memSize),
        scenario_usage: option.env_name === '测试' ? '开发测试环境' : '生产环境',
        scenario_user_scale: option.env_name === '测试' ? '日活<100' : '日活<5000',
        recommendation_level: '推荐',
        technical_notes: 'AP应用单节点架构，适用于中小型应用',
        price_level: getPriceLevel(memSize)
    };
}

// 辅助函数
function getCpuConfig(memSize) {
    const configs = { '2C4G': '2核Intel Xeon', '4C8G': '4核Intel Xeon', '8C16G': '8核Intel Xeon', '16C32G': '16核Intel Xeon' };
    return configs[memSize] || '4核Intel Xeon';
}

function getMemoryConfig(memSize) {
    const configs = { '2C4G': '4GB DDR4', '4C8G': '8GB DDR4', '8C16G': '16GB DDR4', '16C32G': '32GB DDR4' };
    return configs[memSize] || '8GB DDR4';
}

function getSystemDiskConfig(memSize) {
    const configs = { '2C4G': '40 GB 普通云盘', '4C8G': '40 GB SSD云盘', '8C16G': '40 GB SSD云盘', '16C32G': '40 GB ESSD PL1' };
    return configs[memSize] || '40 GB SSD云盘';
}

function getDataDiskConfig(memSize) {
    const configs = { '2C4G': '100G 普通云盘', '4C8G': '200G SSD云盘', '8C16G': '500G SSD云盘', '16C32G': '1T ESSD PL2' };
    return configs[memSize] || '200G SSD云盘';
}

function getDiskIOPS(memSize) {
    const configs = { '2C4G': '500-1000', '4C8G': '4800', '8C16G': '4800', '16C32G': '50000' };
    return configs[memSize] || '4800';
}

function getDiskThroughput(memSize) {
    const configs = { '2C4G': '40-90', '4C8G': '140', '8C16G': '140', '16C32G': '500' };
    return configs[memSize] || '140';
}

function getMaxConnections(memSize) {
    const configs = { '2C4G': '1000-5000', '4C8G': '20000-50000', '8C16G': '150000-300000', '16C32G': '1000000-2000000' };
    return configs[memSize] || '20000-50000';
}

function getOpsPerSecond(memSize) {
    const configs = { '2C4G': '10000-50000', '4C8G': '200000-500000', '8C16G': '1500000-3000000', '16C32G': '10000000-20000000' };
    return configs[memSize] || '200000-500000';
}

function getDataSize(memSize) {
    const configs = { '2C4G': '2GB', '4C8G': '8GB', '8C16G': '32GB', '16C32G': '64GB' };
    return configs[memSize] || '8GB';
}

function getThroughput(memSize, service) {
    if (service === 'Kafka') {
        const configs = { '2C4G': '5000-10000', '4C8G': '30000-80000', '8C16G': '300000-500000', '16C32G': '2000000-5000000' };
        return configs[memSize] + ' msg/s';
    } else if (service === 'AP') {
        const configs = { '2C4G': '100-500', '4C8G': '1500-4000', '8C16G': '25000-60000', '16C32G': '300000-600000' };
        return configs[memSize] + ' req/s';
    }
    return '1000-5000';
}

function getPartitionCount(memSize) {
    const configs = { '2C4G': '10-50', '4C8G': '100-500', '8C16G': '2000-5000', '16C32G': '20000-50000' };
    return configs[memSize] || '100-500';
}

function getConcurrentConnections(memSize) {
    const configs = { '2C4G': '100-500', '4C8G': '1000-3000', '8C16G': '15000-30000', '16C32G': '80000-150000' };
    return configs[memSize] || '1000-3000';
}

function getConcurrentUsers(memSize) {
    const configs = { '2C4G': '50-200', '4C8G': '500-1500', '8C16G': '8000-20000', '16C32G': '50000-100000' };
    return configs[memSize] || '500-1500';
}

function getRequestsPerSecond(memSize) {
    const configs = { '2C4G': '20-100', '4C8G': '300-800', '8C16G': '5000-12000', '16C32G': '80000-200000' };
    return configs[memSize] || '300-800';
}

function getResponseTime(memSize) {
    const configs = { '2C4G': '<500', '4C8G': '<200', '8C16G': '<80', '16C32G': '<30' };
    return configs[memSize] || '<200';
}

function getUserCapacity(memSize) {
    const configs = { '2C4G': '日活<100', '4C8G': '日活<1万', '8C16G': '日活<20万', '16C32G': '日活<500万' };
    return configs[memSize] || '日活<1万';
}

function getPriceLevel(memSize) {
    const configs = { '2C4G': '便宜', '4C8G': '中等', '8C16G': '较贵', '16C32G': '最贵' };
    return configs[memSize] || '中等';
}

// 运行脚本
if (require.main === module) {
    createConfigDescriptions()
        .then((result) => {
            console.log('\n✅ 配置详细说明创建完成');
            console.log(`📝 成功插入: ${result.insertedCount} 条`);
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ 配置创建失败:', error);
            process.exit(1);
        });
}

module.exports = { createConfigDescriptions };