/**
 * 修复Redis集群配置详细说明创建
 */

const db = require('../config/database');

async function fixRedisClusterDescriptions() {
    const connection = await db.promisePool.getConnection();

    try {
        await connection.beginTransaction();

        console.log('🔄 修复Redis集群配置详细说明...\n');

        // 获取Redis集群配置选项（3主3从和哨兵模式）
        const [redisClusterOptions] = await connection.query(`
            SELECT co.id, co.name, e.name as env_name
            FROM config_options co
            LEFT JOIN config_types ct ON co.type_id = ct.id
            LEFT JOIN environments e ON co.environment_id = e.id
            WHERE ct.name = 'redis'
            AND (co.name LIKE '%3主3从%' OR co.name LIKE '%一主二从三哨兵%')
            ORDER BY e.name, co.name
        `);

        console.log(`📋 找到 ${redisClusterOptions.length} 个Redis集群配置选项:`);
        redisClusterOptions.forEach(opt => {
            console.log(`  ${opt.env_name} - ${opt.name} (ID: ${opt.id})`);
        });

        let insertedCount = 0;

        for (const option of redisClusterOptions) {
            try {
                // 解析配置信息
                const isSentinel = option.name.includes('一主二从三哨兵');
                const size = getSizeFromName(option.name);
                const nodeCount = isSentinel ? 6 : 6; // 1主2从3哨兵 = 6节点，3主3从 = 6节点
                const architecture = isSentinel ? '哨兵模式(1主2从3哨兵)' : '3主3从集群';

                // 使用标准Redis表字段，但内容针对集群架构
                const description = {
                    architecture_type: architecture,
                    // 资源配置使用总体资源描述
                    resource_cpu_detail: getClusterCpuConfig(size, nodeCount),
                    resource_memory_detail: getClusterMemoryConfig(size, nodeCount),
                    resource_system_disk: getClusterSystemDiskConfig(size, nodeCount),
                    resource_data_disk: getClusterDataDiskConfig(size, nodeCount),
                    // 集群性能指标
                    max_connections: getClusterMaxConnections(size),
                    ops_per_second: getClusterOpsPerSecond(size),
                    memory_usage: '<70%',
                    hit_rate: '95%+',
                    data_size: getClusterDataSize(size),
                    disk_iops: getClusterDiskIOPS(size),
                    disk_throughput: getClusterDiskThroughput(size),
                    disk_type_description: '集群数据持久化',
                    persistence_mode: isSentinel ? 'RDB/AOF + Sentinel' : 'Cluster RDB/AOF',
                    scenario_usage: option.env_name === '测试' ? '开发测试环境集群' : '生产环境高可用集群',
                    scenario_user_scale: option.env_name === '测试' ? '日活<5000' : '日活<100000',
                    recommendation_level: '推荐',
                    technical_notes: isSentinel
                        ? 'Redis哨兵模式提供高可用，1主2从3哨兵架构，自动故障转移'
                        : 'Redis 3主3从集群模式，提供数据分片和高可用，支持16384个槽位',
                    price_level: getClusterPriceLevel(size)
                };

                // 检查是否已存在
                const [existing] = await connection.query(
                    'SELECT id FROM config_descriptions_redis WHERE config_option_id = ?',
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
                    `INSERT INTO config_descriptions_redis (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`,
                    values
                );

                console.log(`✅ 创建Redis集群详细说明: ${option.name} -> config_descriptions_redis`);
                insertedCount++;

            } catch (error) {
                console.error(`❌ 创建Redis集群详细说明失败: ${option.name}`, error.message);
            }
        }

        console.log(`\n📋 Redis集群修复结果:`);
        console.log(`✅ 成功插入: ${insertedCount} 条`);

        await connection.commit();
        console.log('\n🎉 Redis集群配置详细说明修复完成！');

        return { insertedCount };

    } catch (error) {
        await connection.rollback();
        console.error('❌ 修复Redis集群配置失败，已回滚所有更改:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// 辅助函数
function getSizeFromName(name) {
    if (name.includes('2C4G')) return '2C4G';
    if (name.includes('4C8G')) return '4C8G';
    if (name.includes('8C16G')) return '8C16G';
    if (name.includes('16C32G')) return '16C32G';
    return '4C8G';
}

function getClusterCpuConfig(size, nodeCount) {
    const singleCpu = {
        '2C4G': '2核Intel Xeon',
        '4C8G': '4核Intel Xeon',
        '8C16G': '8核Intel Xeon',
        '16C32G': '16核Intel Xeon'
    };
    return `${nodeCount}节点 × ${singleCpu[size] || '4核Intel Xeon'} (总计${nodeCount * getCoreCount(size)}核)`;
}

function getClusterMemoryConfig(size, nodeCount) {
    const singleMem = {
        '2C4G': '4GB',
        '4C8G': '8GB',
        '8C16G': '16GB',
        '16C32G': '32GB'
    };
    return `${nodeCount}节点 × ${singleMem[size] || '8GB'} DDR4 (总计${nodeCount * getMemSize(size)}GB)`;
}

function getClusterSystemDiskConfig(size, nodeCount) {
    const singleDisk = {
        '2C4G': '40 GB 普通云盘',
        '4C8G': '40 GB SSD云盘',
        '8C16G': '40 GB SSD云盘',
        '16C32G': '40 GB ESSD PL1'
    };
    return `${nodeCount}节点 × ${singleDisk[size] || '40 GB SSD云盘'}`;
}

function getClusterDataDiskConfig(size, nodeCount) {
    const singleDisk = {
        '2C4G': '100G 普通云盘',
        '4C8G': '200G SSD云盘',
        '8C16G': '500G SSD云盘',
        '16C32G': '1T ESSD PL2'
    };
    return `${nodeCount}节点 × ${singleDisk[size] || '200G SSD云盘'} (总计${nodeCount * getDataDiskSize(size)}G)`;
}

function getCoreCount(size) {
    const cores = { '2C4G': 2, '4C8G': 4, '8C16G': 8, '16C32G': 16 };
    return cores[size] || 4;
}

function getMemSize(size) {
    const mems = { '2C4G': 4, '4C8G': 8, '8C16G': 16, '16C32G': 32 };
    return mems[size] || 8;
}

function getDataDiskSize(size) {
    const disks = { '2C4G': 100, '4C8G': 200, '8C16G': 500, '16C32G': 1024 };
    return disks[size] || 200;
}

function getClusterMaxConnections(size) {
    const connections = {
        '2C4G': '6000-30000',
        '4C8G': '120000-300000',
        '8C16G': '900000-1800000',
        '16C32G': '6000000-12000000'
    };
    return connections[size] || '120000-300000';
}

function getClusterOpsPerSecond(size) {
    const ops = {
        '2C4G': '60000-300000',
        '4C8G': '1200000-3000000',
        '8C16G': '9000000-18000000',
        '16C32G': '60000000-120000000'
    };
    return ops[size] || '1200000-3000000';
}

function getClusterDataSize(size) {
    const sizes = {
        '2C4G': '12GB',
        '4C8G': '48GB',
        '8C16G': '192GB',
        '16C32G': '384GB'
    };
    return sizes[size] || '48GB';
}

function getClusterDiskIOPS(size) {
    const iops = {
        '2C4G': '3000-6000',
        '4C8G': '28800',
        '8C16G': '28800',
        '16C32G': '300000'
    };
    return iops[size] || '28800';
}

function getClusterDiskThroughput(size) {
    const throughput = {
        '2C4G': '240-540',
        '4C8G': '840',
        '8C16G': '840',
        '16C32G': '3000'
    };
    return throughput[size] || '840';
}

function getClusterPriceLevel(size) {
    const levels = { '2C4G': '中等', '4C8G': '较贵', '8C16G': '最贵', '16C32G': '极贵' };
    return levels[size] || '较贵';
}

// 运行脚本
if (require.main === module) {
    fixRedisClusterDescriptions()
        .then((result) => {
            console.log('\n✅ Redis集群配置修复完成');
            console.log(`📝 成功插入: ${result.insertedCount} 条`);
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Redis集群配置修复失败:', error);
            process.exit(1);
        });
}

module.exports = { fixRedisClusterDescriptions };