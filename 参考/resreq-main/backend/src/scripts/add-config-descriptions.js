/**
 * 添加Redis、Kafka、Zookeeper和AP的详细配置数据到数据库
 */

const db = require('../config/database');

async function addServiceConfigurations() {
    const connection = await db.promisePool.getConnection();

    try {
        await connection.beginTransaction();

        console.log('🔄 开始添加服务配置详细说明数据...');

        // 1. 获取现有的配置类型ID
        const [types] = await connection.query(`
            SELECT id, name FROM config_types WHERE name IN ('Redis', 'Kafka', 'Zookeeper', 'AP应用', '应用服务')
            ORDER BY id
        `);

        console.log('📊 现有配置类型:', types);

        if (types.length === 0) {
            throw new Error('未找到必要的配置类型，请先创建配置类型');
        }

        // 获取类型ID映射
        const typeMap = {};
        types.forEach(type => {
            if (type.name.includes('Redis')) typeMap.redis = type.id;
            else if (type.name.includes('Kafka')) typeMap.kafka = type.id;
            else if (type.name.includes('Zookeeper')) typeMap.zookeeper = type.id;
            else if (type.name.includes('AP应用') || type.name.includes('应用服务')) typeMap.ap = type.id;
        });

        console.log('🔑 类型ID映射:', typeMap);

        // 2. 获取现有的环境ID
        const [environments] = await connection.query(`
            SELECT id, name FROM environments WHERE is_active = 1 ORDER BY id
        `);

        if (environments.length === 0) {
            throw new Error('未找到有效的环境配置');
        }

        console.log('🌍 现有环境:', environments);

        // 3. 获取现有的配置选项ID
        const [configOptions] = await connection.query(`
            SELECT co.id, co.name, ct.name as type_name, e.name as env_name
            FROM config_options co
            LEFT JOIN config_types ct ON co.type_id = ct.id
            LEFT JOIN environments e ON co.environment_id = e.id
            WHERE ct.name IN ('Redis', 'Kafka', 'Zookeeper', 'AP应用', '应用服务')
            ORDER BY co.id
        `);

        console.log('📋 现有配置选项:', configOptions);

        if (configOptions.length === 0) {
            console.log('⚠️ 未找到Redis、Kafka、Zookeeper、AP的配置选项，需要先创建基础配置选项');
            console.log('💡 建议：请先在配置管理界面创建这些服务类型的基础配置选项');

            await connection.rollback();
            return;
        }

        // 4. 准备配置详细说明数据
        const descriptions = [];

        // Redis配置详细说明（单节点）
        const redisConfigOptions = configOptions.filter(opt => opt.type_name.includes('Redis'));
        console.log(`🔴 找到 ${redisConfigOptions.length} 个Redis配置选项`);

        redisConfigOptions.forEach(option => {
            const [envSize] = option.name.match(/小型|中型|大型|超大型/) || ['中型'];
            const [memSize] = option.name.match(/2C4G|4C8G|8C16G|16C32G/) || ['4C8G'];

            descriptions.push({
                config_option_id: option.id,
                architecture_type: '单节点',
                resource_cpu_detail: getCpuConfig(memSize, envSize),
                resource_memory_detail: getMemoryConfig(memSize, envSize),
                resource_system_disk: getSystemDiskConfig(memSize, envSize),
                resource_data_disk: getDataDiskConfig(memSize, envSize),
                max_connections: getMaxConnections(memSize, envSize, 'Redis'),
                ops_per_second: getOpsPerSecond(memSize, envSize, 'Redis'),
                memory_usage: getMemoryUsage(memSize, envSize, 'Redis'),
                hit_rate: getHitRate(memSize, envSize),
                data_size: getDataSize(memSize, envSize, 'Redis'),
                persistence_mode: 'RDB/AOF',
                disk_iops: getDiskIOPS(memSize, envSize),
                disk_throughput: getDiskThroughput(memSize, envSize),
                scenario_usage: getScenarioUsage(envSize, 'Redis'),
                scenario_user_scale: getScenarioUserScale(envSize, 'Redis'),
                recommendation_level: getRecommendationLevel(memSize, envSize),
                technical_notes: 'Redis单节点架构，支持数据持久化',
                price_level: getPriceLevel(memSize, envSize)
            });
        });

        // Kafka配置详细说明（单节点）
        const kafkaConfigOptions = configOptions.filter(opt => opt.type_name.includes('Kafka'));
        console.log(`🟡 找到 ${kafkaConfigOptions.length} 个Kafka配置选项`);

        kafkaConfigOptions.forEach(option => {
            const [envSize] = option.name.match(/小型|中型|大型|超大型/) || ['中型'];
            const [memSize] = option.name.match(/2C4G|4C8G|8C16G|16C32G/) || ['4C8G'];

            descriptions.push({
                config_option_id: option.id,
                architecture_type: '单节点',
                resource_cpu_detail: getCpuConfig(memSize, envSize),
                resource_memory_detail: getMemoryConfig(memSize, envSize),
                resource_system_disk: getSystemDiskConfig(memSize, envSize),
                resource_data_disk: getDataDiskConfig(memSize, envSize),
                throughput: getThroughput(memSize, envSize, 'Kafka'),
                partition_count: getPartitionCount(memSize, envSize),
                replication_factor: getReplicationFactor(memSize, envSize),
                broker_count: 1,
                retention_period: getRetentionPeriod(memSize, envSize),
                disk_iops: getDiskIOPS(memSize, envSize),
                disk_throughput: getDiskThroughput(memSize, envSize),
                scenario_usage: getScenarioUsage(envSize, 'Kafka'),
                scenario_user_scale: getScenarioUserScale(envSize, 'Kafka'),
                recommendation_level: getRecommendationLevel(memSize, envSize),
                technical_notes: 'Kafka单节点架构，适合开发测试和小规模应用',
                price_level: getPriceLevel(memSize, envSize)
            });
        });

        // Zookeeper配置详细说明（单节点）
        const zkConfigOptions = configOptions.filter(opt => opt.type_name.includes('Zookeeper'));
        console.log(`🟣 找到 ${zkConfigOptions.length} 个Zookeeper配置选项`);

        zkConfigOptions.forEach(option => {
            const [envSize] = option.name.match(/小型|中型|大型|超大型/) || ['中型'];
            const [memSize] = option.name.match(/2C4G|4C8G|8C16G|16C32G/) || ['4C8G'];

            descriptions.push({
                config_option_id: option.id,
                architecture_type: '单节点',
                resource_cpu_detail: getCpuConfig(memSize, envSize),
                resource_memory_detail: getMemoryConfig(memSize, envSize),
                resource_system_disk: getSystemDiskConfig(memSize, envSize),
                resource_data_disk: getDataDiskConfig(memSize, envSize),
                concurrent_connections: getConcurrentConnections(memSize, envSize, 'Zookeeper'),
                throughput: getThroughput(memSize, envSize, 'Zookeeper'),
                disk_iops: getDiskIOPS(memSize, envSize),
                disk_throughput: getDiskThroughput(memSize, envSize),
                scenario_usage: getScenarioUsage(envSize, 'Zookeeper'),
                scenario_user_scale: getScenarioUserScale(envSize, 'Zookeeper'),
                recommendation_level: getRecommendationLevel(memSize, envSize),
                technical_notes: 'Zookeeper单节点架构，无高可用保障',
                price_level: getPriceLevel(memSize, envSize)
            });
        });

        // AP应用配置详细说明（单节点）
        const apConfigOptions = configOptions.filter(opt => opt.type_name.includes('AP应用') || opt.type_name.includes('应用服务'));
        console.log(`🟢 找到 ${apConfigOptions.length} 个AP应用配置选项`);

        apConfigOptions.forEach(option => {
            const [envSize] = option.name.match(/小型|中型|大型|超大型/) || ['中型'];
            const [memSize] = option.name.match(/2C4G|4C8G|8C16G|16C32G/) || ['4C8G'];

            descriptions.push({
                config_option_id: option.id,
                architecture_type: '单节点',
                resource_cpu_detail: getCpuConfig(memSize, envSize),
                resource_memory_detail: getMemoryConfig(memSize, envSize),
                resource_system_disk: getSystemDiskConfig(memSize, envSize),
                resource_data_disk: getDataDiskConfig(memSize, envSize),
                concurrent_users: getConcurrentUsers(memSize, envSize),
                requests_per_second: getRequestsPerSecond(memSize, envSize),
                response_time: getResponseTime(memSize, envSize),
                throughput: getThroughput(memSize, envSize, 'AP'),
                user_capacity: getUserCapacity(memSize, envSize),
                disk_iops: getDiskIOPS(memSize, envSize),
                disk_throughput: getDiskThroughput(memSize, envSize),
                scenario_usage: getScenarioUsage(envSize, 'AP'),
                scenario_user_scale: getScenarioUserScale(envSize, 'AP'),
                recommendation_level: getRecommendationLevel(memSize, envSize),
                technical_notes: 'AP应用单节点架构，适用于中小型应用',
                price_level: getPriceLevel(memSize, envSize)
            });
        });

        console.log(`📝 准备插入 ${descriptions.length} 条配置详细说明`);

        // 5. 插入配置详细说明数据
        let insertedCount = 0;
        let errorCount = 0;

        for (const desc of descriptions) {
            try {
                // 确定目标表
                const configOption = configOptions.find(opt => opt.id === desc.config_option_id);
                const typeName = configOption.type_name;
                let targetTable = '';

                if (typeName.includes('Redis')) {
                    targetTable = 'config_descriptions_redis';
                } else if (typeName.includes('Kafka')) {
                    targetTable = 'config_descriptions_kafka';
                } else if (typeName.includes('Zookeeper')) {
                    targetTable = 'config_descriptions_general'; // Zookeeper使用通用表
                } else if (typeName.includes('AP应用') || typeName.includes('应用服务')) {
                    targetTable = 'config_descriptions_ap';
                } else {
                    targetTable = 'config_descriptions_general';
                }

                // 检查是否已存在
                const [existing] = await connection.query(
                    `SELECT id FROM ${targetTable} WHERE config_option_id = ?`,
                    [desc.config_option_id]
                );

                if (existing.length > 0) {
                    console.log(`⏭️ 跳过已存在的配置: ${configOption.name} (${typeName})`);
                    continue;
                }

                // 转换驼峰命名为下划线命名
                const fields = {};
                const dbValues = [];

                Object.keys(desc).forEach(key => {
                    if (key !== 'config_option_id' && desc[key] !== undefined) {
                        const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
                        fields[dbField] = desc[key];
                        dbValues.push(desc[key]);
                    }
                });

                // 构建INSERT语句
                const dbFields = ['config_option_id', ...Object.keys(fields)];
                const placeholders = dbFields.map(() => '?').join(', ');
                const values = [desc.config_option_id, ...Object.values(fields)];

                await connection.query(
                    `INSERT INTO ${targetTable} (${dbFields.join(', ')}) VALUES (${placeholders})`,
                    values
                );

                console.log(`✅ 成功插入: ${configOption.name} -> ${targetTable}`);
                insertedCount++;

            } catch (error) {
                console.error(`❌ 插入失败: ${configOption.name}`, error.message);
                errorCount++;
            }
        }

        console.log('\n📋 插入结果总结:');
        console.log(`✅ 成功插入: ${insertedCount} 条`);
        console.log(`❌ 插入失败: ${errorCount} 条`);
        console.log(`📊 总计处理: ${descriptions.length} 条`);

        await connection.commit();
        console.log('\n🎉 配置详细说明数据添加成功！');

    } catch (error) {
        await connection.rollback();
        console.error('❌ 添加配置数据失败，已回滚所有更改:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// 辅助函数：根据配置规格生成对应的值
function getCpuConfig(memSize, envSize) {
    const configs = {
        '2C4G': '2核Intel Xeon',
        '4C8G': '4核Intel Xeon',
        '8C16G': '8核Intel Xeon',
        '16C32G': '16核Intel Xeon'
    };
    return configs[memSize] || '4核Intel Xeon';
}

function getMemoryConfig(memSize, envSize) {
    const configs = {
        '2C4G': '4GB DDR4',
        '4C8G': '8GB DDR4',
        '8C16G': '16GB DDR4',
        '16C32G': '32GB DDR4'
    };
    return configs[memSize] || '8GB DDR4';
}

function getSystemDiskConfig(memSize, envSize) {
    const diskMap = {
        '2C4G': '40 GB 普通云盘',
        '4C8G': '40 GB SSD云盘',
        '8C16G': '40 GB SSD云盘',
        '16C32G': '40 GB ESSD PL1'
    };
    return diskMap[memSize] || '40 GB SSD云盘';
}

function getDataDiskConfig(memSize, envSize) {
    const diskMap = {
        '2C4G': '100G 普通云盘',
        '4C8G': '200G SSD云盘',
        '8C16G': '500G SSD云盘',
        '16C32G': '1T ESSD PL2'
    };
    return diskMap[memSize] || '200G SSD云盘';
}

function getDiskIOPS(memSize, envSize) {
    const iopsMap = {
        '2C4G': '500-1000',
        '4C8G': '4800',
        '8C16G': '4800',
        '16C32G': '50000'
    };
    return iopsMap[memSize] || '4800';
}

function getDiskThroughput(memSize, envSize) {
    const throughputMap = {
        '2C4G': '40-90',
        '4C8G': '140',
        '8C16G': '140',
        '16C32G': '500'
    };
    return throughputMap[memSize] || '140';
}

function getMaxConnections(memSize, envSize, service) {
    const connections = {
        '2C4G': '1000-5000',
        '4C8G': '20000-50000',
        '8C16G': '150000-300000',
        '16C32G': '1000000-2000000'
    };
    return connections[memSize] || '20000-50000';
}

function getOpsPerSecond(memSize, envSize, service) {
    const opsMap = {
        '2C4G': '10000-50000',
        '4C8G': '200000-500000',
        '8C16G': '1500000-3000000',
        '16C32G': '10000000-20000000'
    };
    return opsMap[memSize] || '200000-500000';
}

function getMemoryUsage(memSize, envSize, service) {
    const usageMap = {
        '2C4G': '<80%',
        '4C8G': '<80%',
        '8C16G': '<80%',
        '16C32G': '<80%'
    };
    return usageMap[memSize] || '<80%';
}

function getHitRate(memSize, envSize) {
    return '95%+';
}

function getDataSize(memSize, envSize, service) {
    const sizeMap = {
        '2C4G': '2GB',
        '4C8G': '8GB',
        '8C16G': '32GB',
        '16C32G': '64GB'
    };
    return sizeMap[memSize] || '8GB';
}

function getThroughput(memSize, envSize, service) {
    if (service === 'Kafka') {
        const throughputMap = {
            '2C4G': '5000-10000',
            '4C8G': '30000-80000',
            '8C16G': '300000-500000',
            '16C32G': '2000000-5000000'
        };
        return throughputMap[memSize] + ' msg/s';
    } else if (service === 'Zookeeper') {
        return '1000-5000';
    } else {
        return '5000-15000';
    }
}

function getPartitionCount(memSize, envSize) {
    const partitionMap = {
        '2C4G': '10-50',
        '4C8G': '100-500',
        '8C16G': '2000-5000',
        '16C32G': '20000-50000'
    };
    return partitionMap[memSize] || '100-500';
}

function getReplicationFactor(memSize, envSize) {
    return '2-3';
}

function getRetentionPeriod(memSize, envSize) {
    const periodMap = {
        '2C4G': '3天',
        '4C8G': '7天',
        '8C16G': '7天',
        '16C32G': '7天'
    };
    return periodMap[memSize] || '7天';
}

function getConcurrentConnections(memSize, envSize, service) {
    if (service === 'Zookeeper') {
        const connections = {
            '2C4G': '100-500',
            '4C8G': '1000-3000',
            '8C16G': '15000-30000',
            '16C32G': '80000-150000'
        };
        return connections[memSize] || '1000-3000';
    } else {
        return '5000-15000';
    }
}

function getConcurrentUsers(memSize, envSize) {
    const users = {
        '2C4G': '50-200',
        '4C8G': '500-1500',
        '8C16G': '8000-20000',
        '16C32G': '50000-100000'
    };
    return users[memSize] || '500-1500';
}

function getRequestsPerSecond(memSize, envSize) {
    const requests = {
        '2C4G': '20-100',
        '4C8G': '300-800',
        '8C16G': '5000-12000',
        '16C32G': '80000-200000'
    };
    return requests[memSize] || '300-800';
}

function getResponseTime(memSize, envSize) {
    const response = {
        '2C4G': '<500',
        '4C8G': '<200',
        '8C16G': '<80',
        '16C32G': '<30'
    };
    return response[memSize] || '<200';
}

function getUserCapacity(memSize, envSize) {
    const capacity = {
        '2C4G': '日活<100',
        '4C8G': '日活<1万',
        '8C16G': '日活<20万',
        '16C32G': '日活<500万'
    };
    return capacity[memSize] || '日活<1万';
}

function getScenarioUsage(envSize, service) {
    const scenarios = {
        '小型': '开发测试环境',
        '中型': '测试和小型生产',
        '大型': '中型生产',
        '超大型': '大型生产'
    };
    return scenarios[envSize] || '测试环境';
}

function getScenarioUserScale(envSize, service) {
    const scales = {
        '小型': '日活<1000',
        '中型': '日活<10000',
        '大型': '日活<50000',
        '超大型': '日活<500000'
    };
    return scales[envSize] || '日活<5000';
}

function getRecommendationLevel(memSize, envSize) {
    const levels = {
        '小型': '一般',
        '中型': '推荐',
        '大型': '强烈推荐',
        '超大型': '强烈推荐'
    };
    return levels[envSize] || '推荐';
}

function getPriceLevel(memSize, envSize) {
    const prices = {
        '2C4G': '便宜',
        '4C8G': '中等',
        '8C16G': '较贵',
        '16C32G': '最贵'
    };
    return prices[memSize] || '中等';
}

// 如果直接运行此脚本
if (require.main === module) {
    addServiceConfigurations()
        .then(() => {
            console.log('✅ 配置详细说明数据添加完成');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ 配置详细说明数据添加失败:', error);
            process.exit(1);
        });
}

module.exports = { addServiceConfigurations };