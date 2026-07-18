/**
 * 添加集群架构配置选项和详细说明到数据库
 */

const db = require('../config/database');

async function addClusterConfigurations() {
    const connection = await db.promisePool.getConnection();

    try {
        await connection.beginTransaction();

        console.log('🔄 开始添加集群架构配置...\n');

        // 1. 获取配置类型和环境ID
        const [types] = await connection.query('SELECT id, name FROM config_types ORDER BY id');
        const [environments] = await connection.query('SELECT id, name FROM environments WHERE is_active = 1 ORDER BY id');

        const typeMap = {};
        types.forEach(t => {
            if (t.name.toLowerCase().includes('redis')) typeMap.redis = t.id;
            else if (t.name.toLowerCase().includes('kafka')) typeMap.kafka = t.id;
            else if (t.name.toLowerCase().includes('zookeeper')) typeMap.zookeeper = t.id;
        });

        const envMap = {};
        environments.forEach(e => {
            envMap[e.name] = e.id;
        });

        console.log('🔑 配置类型ID:', typeMap);
        console.log('🌍 环境ID:', envMap);

        // 2. 创建集群架构配置选项
        const clusterConfigOptions = [];

        // Redis 3主3从集群配置
        if (typeMap.redis) {
            ['测试', '生产'].forEach(env => {
                ['配置A-小型2C4G', '配置B-中型4C8G', '配置C-大型8C16G', '配置D-超大型8C16G'].forEach(name => {
                    const memSize = name.includes('2C4G') ? '2C4G' : name.includes('4C8G') ? '4C8G' : '8C16G';

                    clusterConfigOptions.push({
                        type_id: typeMap.redis,
                        environment_id: envMap[env],
                        name: `集群${name.replace('配置', '')}3主3从`,
                        node_count: 6,
                        cpu: name.includes('2C4G') ? 2 : name.includes('4C8G') ? 4 : 8,
                        memory: name.includes('2C4G') ? 4 : name.includes('4C8G') ? 8 : 16,
                        disk_type: '高IO',
                        system_disk: 40,
                        data_disk: name.includes('2C4G') ? 100 : name.includes('4C8G') ? 200 : 500,
                        description: `Redis 3主3从集群 ${name.includes('小型') ? '小型' : name.includes('中型') ? '中型' : name.includes('大型') ? '大型' : '超大型'}配置`
                    });
                });
            });
        }

        // Redis 哨兵模式配置
        if (typeMap.redis) {
            ['测试', '生产'].forEach(env => {
                ['配置A-小型2C4G', '配置B-中型4C8G', '配置C-大型8C16G', '配置D-超大型8C16G'].forEach(name => {
                    clusterConfigOptions.push({
                        type_id: typeMap.redis,
                        environment_id: envMap[env],
                        name: `哨兵${name.replace('配置', '')}一主二从三哨兵`,
                        node_count: 6,
                        cpu: name.includes('2C4G') ? 2 : name.includes('4C8G') ? 4 : 8,
                        memory: name.includes('2C4G') ? 4 : name.includes('4C8G') ? 8 : 16,
                        disk_type: '高IO',
                        system_disk: 40,
                        data_disk: name.includes('2C4G') ? 100 : name.includes('4C8G') ? 200 : 500,
                        description: `Redis 一主2从3哨兵 ${name.includes('小型') ? '小型' : name.includes('中型') ? '中型' : name.includes('大型') ? '大型' : '超大型'}配置`
                    });
                });
            });
        }

        // Kafka 3节点集群配置
        if (typeMap.kafka) {
            ['测试', '生产'].forEach(env => {
                ['配置A-小型2C4G', '配置B-中型4C8G', '配置C-大型8C16G', '配置D-超大型8C16G'].forEach(name => {
                    clusterConfigOptions.push({
                        type_id: typeMap.kafka,
                        environment_id: envMap[env],
                        name: `集群${name.replace('配置', '')}3节点`,
                        node_count: 3,
                        cpu: name.includes('2C4G') ? 2 : name.includes('4C8G') ? 4 : 8,
                        memory: name.includes('2C4G') ? 4 : name.includes('4C8G') ? 8 : 16,
                        disk_type: '高IO',
                        system_disk: 40,
                        data_disk: name.includes('2C4G') ? 200 : name.includes('4C8G') ? 500 : 1000,
                        description: `Kafka 3节点集群 ${name.includes('小型') ? '小型' : name.includes('中型') ? '中型' : name.includes('大型') ? '大型' : '超大型'}配置`
                    });
                });
            });
        }

        // Kafka + Zookeeper组合配置
        if (typeMap.kafka && typeMap.zookeeper) {
            ['测试', '生产'].forEach(env => {
                ['配置A-小型2C4G', '配置B-中型4C8G', '配置C-大型8C16G', '配置D-超大型8C16G'].forEach(name => {
                    clusterConfigOptions.push({
                        type_id: typeMap.kafka,
                        environment_id: envMap[env],
                        name: `组合${name.replace('配置', '')}Kafka3加Zookeeper3`,
                        node_count: 6,
                        cpu: name.includes('2C4G') ? 2 : name.includes('4C8G') ? 4 : 8,
                        memory: name.includes('2C4G') ? 4 : name.includes('4C8G') ? 8 : 16,
                        disk_type: '高IO',
                        system_disk: 40,
                        data_disk: name.includes('2C4G') ? 200 : name.includes('4C8G') ? 500 : 1000,
                        description: `Kafka3节点+Zookeeper3节点 ${name.includes('小型') ? '小型' : name.includes('中型') ? '中型' : name.includes('大型') ? '大型' : '超大型'}配置`
                    });
                });
            });
        }

        // Zookeeper 3节点集群配置
        if (typeMap.zookeeper) {
            ['测试', '生产'].forEach(env => {
                ['配置A-小型2C4G', '配置B-中型4C8G', '配置C-大型8C16G', '配置D-超大型8C16G'].forEach(name => {
                    clusterConfigOptions.push({
                        type_id: typeMap.zookeeper,
                        environment_id: envMap[env],
                        name: `集群${name.replace('配置', '')}3节点`,
                        node_count: 3,
                        cpu: name.includes('2C4G') ? 2 : name.includes('4C8G') ? 4 : 8,
                        memory: name.includes('2C4G') ? 4 : name.includes('4C8G') ? 8 : 16,
                        disk_type: '高IO',
                        system_disk: 40,
                        data_disk: name.includes('2C4G') ? 100 : name.includes('4C8G') ? 200 : 500,
                        description: `Zookeeper 3节点集群 ${name.includes('小型') ? '小型' : name.includes('中型') ? '中型' : name.includes('大型') ? '大型' : '超大型'}配置`
                    });
                });
            });
        }

        console.log(`\n📝 准备创建 ${clusterConfigOptions.length} 个集群架构配置选项`);

        // 3. 插入配置选项
        let insertedOptions = 0;
        const createdOptionIds = {};

        for (const option of clusterConfigOptions) {
            try {
                // 检查是否已存在
                const [existing] = await connection.query(
                    'SELECT id FROM config_options WHERE type_id = ? AND environment_id = ? AND name = ?',
                    [option.type_id, option.environment_id, option.name]
                );

                if (existing.length > 0) {
                    console.log(`⏭️ 跳过已存在的配置选项: ${option.name}`);
                    createdOptionIds[option.name] = existing[0].id;
                    continue;
                }

                const [result] = await connection.query(
                    `INSERT INTO config_options (type_id, environment_id, name, node_count, cpu, memory, disk_type, system_disk, data_disk, description)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [option.type_id, option.environment_id, option.name, option.node_count, option.cpu,
                     option.memory, option.disk_type, option.system_disk, option.data_disk, option.description]
                );

                createdOptionIds[option.name] = result.insertId;
                console.log(`✅ 创建集群配置选项: ${option.name} (ID: ${result.insertId})`);
                insertedOptions++;

            } catch (error) {
                console.error(`❌ 创建集群配置选项失败: ${option.name}`, error.message);
            }
        }

        console.log(`\n✅ 配置选项创建完成: ${insertedOptions} 个新选项`);

        // 4. 创建集群架构配置详细说明
        console.log(`\n📊 开始创建集群架构配置详细说明...`);

        const [allConfigOptions] = await connection.query(`
            SELECT co.id, co.name, ct.name as type_name, e.name as env_name
            FROM config_options co
            LEFT JOIN config_types ct ON co.type_id = ct.id
            LEFT JOIN environments e ON co.environment_id = e.id
            WHERE ct.name IN ('redis', 'kafka', 'Zookeeper')
            ORDER BY ct.name, co.id
        `);

        console.log(`找到 ${allConfigOptions.length} 个配置选项，开始为集群架构添加详细说明...`);

        let insertedDescriptions = 0;

        for (const option of allConfigOptions) {
            try {
                let description = null;
                let targetTable = '';

                // 根据配置名称判断架构类型
                const isCluster = option.name.includes('集群') || option.name.includes('哨兵') || option.name.includes('组合');

                if (option.type_name === 'redis' && isCluster) {
                    targetTable = 'config_descriptions_redis';
                    if (option.name.includes('3主3从')) {
                        description = generateRedis3Master3Slave(option);
                    } else if (option.name.includes('一主2从3哨兵')) {
                        description = generateRedisSentinel(option);
                    }
                } else if (option.type_name === 'kafka' && isCluster) {
                    targetTable = 'config_descriptions_kafka';
                    if (option.name.includes('3节点')) {
                        description = generateKafka3Node(option);
                    } else if (option.name.includes('Kafka3加Zookeeper3')) {
                        description = generateKafkaZookeeperCombo(option);
                    }
                } else if (option.type_name === 'Zookeeper' && isCluster) {
                    targetTable = 'config_descriptions_general';
                    description = generateZookeeper3Node(option);
                }

                if (description && targetTable) {
                    // 检查是否已存在
                    const [existing] = await connection.query(
                        `SELECT id FROM ${targetTable} WHERE config_option_id = ?`,
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
                        `INSERT INTO ${targetTable} (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`,
                        values
                    );

                    console.log(`✅ 创建集群详细说明: ${option.name} -> ${targetTable}`);
                    insertedDescriptions++;
                }

            } catch (error) {
                console.error(`❌ 创建集群详细说明失败: ${option.name}`, error.message);
            }
        }

        console.log(`\n📋 集群配置创建结果总结:`);
        console.log(`✅ 新增配置选项: ${insertedOptions} 个`);
        console.log(`✅ 新增详细说明: ${insertedDescriptions} 条`);

        await connection.commit();
        console.log('\n🎉 集群架构配置添加完成！');

        return {
            createdOptions: insertedOptions,
            createdDescriptions: insertedDescriptions
        };

    } catch (error) {
        await connection.rollback();
        console.error('❌ 添加集群配置失败，已回滚所有更改:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// Redis 3主3从集群配置说明生成
function generateRedis3Master3Slave(option) {
    const sizeConfig = getSizeConfig(option.name);
    const envName = option.env_name === '测试' ? '小型' : option.env_name === '生产' ? '中型' : '大型';

    return {
        architecture_type: '3主3从',
        master_cpu_detail: sizeConfig.cpu,
        master_memory_detail: sizeConfig.memory,
        master_system_disk: sizeConfig.systemDisk,
        master_data_disk: sizeConfig.dataDisk,
        master_connections: sizeConfig.connections,
        master_daily_qps: sizeConfig.qps,
        master_peak_qps: sizeConfig.peakQps,
        disk_iops: sizeConfig.iops,
        disk_throughput: sizeConfig.throughput,
        scenario_usage: `${envName}集群`,
        scenario_user_scale: getClusterUserScale(envName, 'Redis'),
        recommendation_level: getClusterRecommendation(envName),
        technical_notes: 'Redis 3主3从集群，支持数据分片和自动故障转移',
        price_level: getClusterPriceLevel(envName)
    };
}

// Redis 哨兵模式配置说明生成
function generateRedisSentinel(option) {
    const sizeConfig = getSizeConfig(option.name);
    const envName = option.env_name === '测试' ? '小型' : option.env_name === '生产' ? '中型' : '大型';

    return {
        architecture_type: '一主二从三哨兵',
        master_cpu_detail: sizeConfig.cpu,
        master_memory_detail: sizeConfig.memory,
        master_system_disk: sizeConfig.systemDisk,
        master_data_disk: sizeConfig.dataDisk,
        master_connections: sizeConfig.connections,
        master_daily_qps: sizeConfig.qps,
        master_peak_qps: sizeConfig.peakQps,
        disk_iops: sizeConfig.iops,
        disk_throughput: sizeConfig.throughput,
        scenario_usage: `${envName}高可用`,
        scenario_user_scale: getClusterUserScale(envName, 'Redis哨兵'),
        recommendation_level: getClusterRecommendation(envName),
        technical_notes: 'Redis哨兵模式，支持高可用和读写分离',
        price_level: getClusterPriceLevel(envName)
    };
}

// Kafka 3节点集群配置说明生成
function generateKafka3Node(option) {
    const sizeConfig = getSizeConfig(option.name);
    const envName = option.env_name === '测试' ? '小型' : option.env_name === '生产' ? '中型' : '大型';

    return {
        architecture_type: '3节点集群',
        resource_cpu_detail: sizeConfig.cpu,
        resource_memory_detail: sizeConfig.memory,
        resource_system_disk: sizeConfig.systemDisk,
        resource_data_disk: sizeConfig.dataDisk,
        throughput: sizeConfig.throughput,
        partition_count: sizeConfig.partitions,
        replication_factor: '3',
        broker_count: 3,
        retention_period: '7天',
        disk_iops: sizeConfig.iops,
        disk_throughput: sizeConfig.throughput,
        scenario_usage: `${envName}集群`,
        scenario_user_scale: getClusterUserScale(envName, 'Kafka'),
        recommendation_level: getClusterRecommendation(envName),
        technical_notes: 'Kafka 3节点集群，支持故障自动转移',
        price_level: getClusterPriceLevel(envName)
    };
}

// Kafka + Zookeeper组合配置说明生成
function generateKafkaZookeeperCombo(option) {
    const sizeConfig = getSizeConfig(option.name);
    const envName = option.env_name === '测试' ? '小型' : option.env_name === '生产' ? '中型' : '大型';

    return {
        architecture_type: 'Kafka3节点+Zookeeper3节点',
        resource_cpu_detail: sizeConfig.cpu,
        resource_memory_detail: sizeConfig.memory,
        resource_system_disk: sizeConfig.systemDisk,
        resource_data_disk: sizeConfig.dataDisk,
        throughput: sizeConfig.throughput,
        partition_count: sizeConfig.partitions,
        replication_factor: '3',
        broker_count: 3,
        retention_period: '7天',
        disk_iops: sizeConfig.iops,
        disk_throughput: sizeConfig.throughput,
        scenario_usage: `${envName}组合架构`,
        scenario_user_scale: getClusterUserScale(envName, 'Kafka组合'),
        recommendation_level: getClusterRecommendation(envName),
        technical_notes: 'Kafka集群与Zookeeper组合，提供完整的消息队列解决方案',
        price_level: getClusterPriceLevel(envName)
    };
}

// Zookeeper 3节点集群配置说明生成
function generateZookeeper3Node(option) {
    const sizeConfig = getSizeConfig(option.name);
    const envName = option.env_name === '测试' ? '小型' : option.env_name === '生产' ? '中型' : '大型';

    return {
        architecture_type: '3节点集群',
        resource_cpu_detail: sizeConfig.cpu,
        resource_memory_detail: sizeConfig.memory,
        resource_system_disk: sizeConfig.systemDisk,
        resource_data_disk: sizeConfig.dataDisk,
        performance_metric1_name: '集群客户端连接数',
        performance_metric1_value: sizeConfig.clusterConnections,
        performance_metric2_name: '集群写QPS',
        performance_metric2_value: sizeConfig.writeQps,
        performance_metric3_name: '集群读QPS',
        performance_metric3_value: sizeConfig.readQps,
        disk_iops: sizeConfig.iops,
        disk_throughput: sizeConfig.throughput,
        scenario_usage: `${envName}集群`,
        scenario_user_scale: getClusterUserScale(envName, 'Zookeeper集群'),
        recommendation_level: getClusterRecommendation(envName),
        technical_notes: 'Zookeeper 3节点集群，支持自动故障转移',
        price_level: getClusterPriceLevel(envName)
    };
}

// 集群配置数据生成函数
function getSizeConfig(name) {
    if (name.includes('小型2C4G')) {
        return {
            cpu: '2C4G x 主节点', memory: '2C4G x 从节点',
            systemDisk: '40G SSD云盘 x 节点', dataDisk: '100G SSD云盘 x 节点',
            connections: '30000-60000', qps: '600000-1200000', peakQps: '1200000-3000000',
            throughput: '60000-150000', partitions: '150-450', iops: '4800', throughput: '140',
            clusterConnections: '1500-3000', writeQps: '45000-135000', readQps: '225000-675000'
        };
    } else if (name.includes('中型4C8G')) {
        return {
            cpu: '4C8G x 主节点', memory: '4C8G x 从节点',
            systemDisk: '40G SSD云盘 x 节点', dataDisk: '200G SSD云盘 x 节点',
            connections: '150000-300000', qps: '3000000-6000000', peakQps: '6000000-15000000',
            throughput: '240000-600000', partitions: '1500-4500', iops: '4800', throughput: '140',
            clusterConnections: '9000-24000', writeQps: '270000-810000', readQps: '1350000-4050000'
        };
    } else if (name.includes('大型8C16G')) {
        return {
            cpu: '8C16G x 主节点', memory: '8C16G x 从节点',
            systemDisk: '40G SSD云盘 x 节点', dataDisk: '500G SSD云盘 x 节点',
            connections: '600000-1500000', qps: '12000000-30000000', peakQps: '24000000-60000000',
            throughput: '1500000-3000000', partitions: '9000-18000', iops: '4800', throughput: '140',
            clusterConnections: '30000-750000', writeQps: '900000-2250000', readQps: '4500000-13500000'
        };
    } else if (name.includes('超大型8C16G')) {
        return {
            cpu: '16C32G x 主节点', memory: '16C32G x 从节点',
            systemDisk: '40G ESSD PL1 x 节点', dataDisk: '1T ESSD PL2 x 节点',
            connections: '3000000-6000000', qps: '60000000-120000000', peakQps: '120000000-300000000',
            throughput: '9000000-18000000', partitions: '30000-60000', iops: '25000', throughput: '260',
            clusterConnections: '150000-300000', writeQps: '4500000-9000000', readQps: '22500000-45000000'
        };
    }
    return { cpu: '4C8G', memory: '8GB' }; // 默认配置
}

function getClusterUserScale(envName, service) {
    const scales = {
        '小型': '日活<1万',
        '中型': '日活<50万',
        '大型': '日活<200万',
        '超大型': '日活>500万'
    };
    return scales[envName] || '日活<50万';
}

function getClusterRecommendation(envName) {
    const levels = {
        '小型': '推荐',
        '中型': '强烈推荐',
        '大型': '强烈推荐',
        '超大型': '顶级'
    };
    return levels[envName] || '强烈推荐';
}

function getClusterPriceLevel(envName) {
    const prices = {
        '小型': '中等',
        '中型': '较贵',
        '大型': '最贵',
        '超大型': '最贵'
    };
    return prices[envName] || '较贵';
}

// 运行脚本
if (require.main === module) {
    addClusterConfigurations()
        .then((result) => {
            console.log('\n✅ 集群架构配置添加完成');
            console.log(`📊 新增配置选项: ${result.createdOptions} 个`);
            console.log(`📝 新增详细说明: ${result.createdDescriptions} 条`);
            console.log('\n🌟 现在支持的所有集群架构：');
            console.log('  🔴 Redis: 单节点、3主3从、哨兵模式');
            console.log('  🟡 Kafka: 单节点、3节点集群、Kafka+ZK组合');
            console.log('  🟣 Zookeeper: 单节点、3节点集群');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ 集群架构配置添加失败:', error);
            process.exit(1);
        });
}

module.exports = { addClusterConfigurations };