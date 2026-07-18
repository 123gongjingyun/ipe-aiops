/**
 * 将UAT环境的配置详细说明复制到压测环境
 * 解决压测环境配置详细说明缺失问题
 */

const db = require('../config/database');

async function copyUATtoPressureTest() {
  const connection = await db.promisePool.getConnection();

  try {
    await connection.beginTransaction();
    console.log('🔄 开始复制UAT环境配置详细说明到压测环境...\n');

    // 1. 获取UAT和压测环境的配置选项映射关系
    const [mapping] = await connection.query(`
      SELECT
        uat_co.id as uat_option_id,
        uat_co.name as config_name,
        uat_ct.name as type_name,
        pressure_co.id as pressure_option_id,
        uat_e.name as uat_env,
        pressure_e.name as pressure_env
      FROM config_options uat_co
      LEFT JOIN config_types uat_ct ON uat_co.type_id = uat_ct.id
      LEFT JOIN environments uat_e ON uat_co.environment_id = uat_e.id
      LEFT JOIN config_options pressure_co ON pressure_co.name = uat_co.name
        AND pressure_co.type_id = uat_co.type_id
      LEFT JOIN environments pressure_e ON pressure_co.environment_id = pressure_e.id
      WHERE uat_e.name = 'UAT' AND pressure_e.name = '压测'
      ORDER BY uat_ct.name, uat_co.name
    `);

    console.log(`📋 找到 ${mapping.length} 个配置选项需要复制配置详细说明\n`);

    let copiedCount = 0;
    let skippedCount = 0;

    for (const map of mapping) {
      console.log(`处理: ${map.type_name} - ${map.config_name}`);
      console.log(`  UAT配置ID: ${map.uat_option_id} → 压测配置ID: ${map.pressure_option_id}`);

      // 根据类型获取对应的表名
      let tableName = '';
      const normalizedType = map.type_name.toLowerCase().replace(/[\(\)]/g, '').trim();

      if (normalizedType.includes('数据库') || normalizedType.includes('mysql')) {
        tableName = 'config_descriptions_mysql';
      } else if (normalizedType.includes('rabbitmq')) {
        tableName = 'config_descriptions_rabbitmq';
      } else if (normalizedType.includes('redis')) {
        tableName = 'config_descriptions_redis';
      } else if (normalizedType.includes('kafka')) {
        tableName = 'config_descriptions_kafka';
      } else if (normalizedType.includes('ap') || normalizedType.includes('应用')) {
        tableName = 'config_descriptions_ap';
      } else {
        tableName = 'config_descriptions_general';
      }

      console.log(`  使用表: ${tableName}`);

      // 检查压测环境是否已有配置详细说明
      const [existing] = await connection.query(
        `SELECT id FROM ${tableName} WHERE config_option_id = ?`,
        [map.pressure_option_id]
      );

      if (existing.length > 0) {
        console.log(`  ⏭️  已存在配置详细说明，跳过\n`);
        skippedCount++;
        continue;
      }

      // 从UAT环境获取配置详细说明
      const [uatDescriptions] = await connection.query(
        `SELECT * FROM ${tableName} WHERE config_option_id = ?`,
        [map.uat_option_id]
      );

      if (uatDescriptions.length === 0) {
        console.log(`  ⚠️  UAT环境也没有配置详细说明，跳过\n`);
        skippedCount++;
        continue;
      }

      const uatDesc = uatDescriptions[0];

      // 复制配置详细说明到压测环境
      const fields = [];
      const values = [];
      const placeholders = [];

      // 排除不需要复制的字段
      const excludeFields = ['id', 'config_option_id', 'created_at', 'updated_at'];

      Object.keys(uatDesc).forEach(key => {
        if (!excludeFields.includes(key)) {
          fields.push(key);
          values.push(uatDesc[key]);
          placeholders.push('?');
        }
      });

      const insertSQL = `
        INSERT INTO ${tableName} (config_option_id, ${fields.join(', ')})
        VALUES (?, ${placeholders.join(', ')})
      `;

      await connection.query(insertSQL, [map.pressure_option_id, ...values]);

      console.log(`  ✅ 配置详细说明复制成功\n`);
      copiedCount++;
    }

    console.log(`📊 复制结果统计:`);
    console.log(`✅ 成功复制: ${copiedCount} 个`);
    console.log(`⏭️  跳过/已存在: ${skippedCount} 个`);
    console.log(`📋 总计处理: ${mapping.length} 个\n`);

    await connection.commit();
    console.log('🎉 UAT环境配置详细说明复制到压测环境完成！');

    return {
      total: mapping.length,
      copied: copiedCount,
      skipped: skippedCount
    };

  } catch (error) {
    await connection.rollback();
    console.error('❌ 复制配置详细说明失败，已回滚所有更改:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// 运行脚本
if (require.main === module) {
  copyUATtoPressureTest()
    .then((result) => {
      console.log('\n✅ 配置详细说明复制完成');
      console.log(`📊 复制统计: 成功${result.copied}个，跳过${result.skippeded}个，总计${result.total}个`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 复制失败:', error);
      process.exit(1);
    });
}

module.exports = { copyUATtoPressureTest };