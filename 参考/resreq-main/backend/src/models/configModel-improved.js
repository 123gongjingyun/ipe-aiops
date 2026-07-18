/**
 * 配置管理数据模型 - 改进版
 * 支持按类型分表的配置详细说明
 */

const db = require('../config/database');

// 基础配置类型模型
class ConfigTypeModel {
  static async getAll() {
    const [rows] = await db.promisePool.query(
      'SELECT * FROM config_types ORDER BY sort_order, id'
    );
    return rows;
  }

  static async getById(id) {
    const [rows] = await db.promisePool.query(
      'SELECT * FROM config_types WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async getByName(name) {
    const [rows] = await db.promisePool.query(
      'SELECT * FROM config_types WHERE name = ?',
      [name]
    );
    return rows[0];
  }

  static async create(data) {
    const { name, description, sortOrder = 0 } = data;
    const [result] = await db.promisePool.query(
      'INSERT INTO config_types (name, description, sort_order) VALUES (?, ?, ?)',
      [name, description, sortOrder]
    );
    return result.insertId;
  }

  static async update(id, data) {
    const { name, description, sortOrder, isActive } = data;
    await db.promisePool.query(
      'UPDATE config_types SET name = ?, description = ?, sort_order = ?, is_active = ? WHERE id = ?',
      [name, description, sortOrder, isActive, id]
    );
  }

  static async delete(id) {
    await db.promisePool.query('DELETE FROM config_types WHERE id = ?', [id]);
  }

  static async toggleActive(id) {
    await db.promisePool.query(
      'UPDATE config_types SET is_active = NOT is_active WHERE id = ?',
      [id]
    );
  }
}

// 环境模型
class EnvironmentModel {
  static async getAll() {
    const [rows] = await db.promisePool.query(
      'SELECT * FROM environments ORDER BY sort_order, id'
    );
    return rows;
  }

  static async getById(id) {
    const [rows] = await db.promisePool.query(
      'SELECT * FROM environments WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async getByName(name) {
    const [rows] = await db.promisePool.query(
      'SELECT * FROM environments WHERE name = ?',
      [name]
    );
    return rows[0];
  }

  static async create(data) {
    const { name, description, sortOrder = 0 } = data;
    const [result] = await db.promisePool.query(
      'INSERT INTO environments (name, description, sort_order) VALUES (?, ?, ?)',
      [name, description, sortOrder]
    );
    return result.insertId;
  }

  static async update(id, data) {
    const { name, description, sortOrder, isActive } = data;
    await db.promisePool.query(
      'UPDATE environments SET name = ?, description = ?, sort_order = ?, is_active = ? WHERE id = ?',
      [name, description, sortOrder, isActive, id]
    );
  }

  static async delete(id) {
    await db.promisePool.query('DELETE FROM environments WHERE id = ?', [id]);
  }

  static async toggleActive(id) {
    await db.promisePool.query(
      'UPDATE environments SET is_active = NOT is_active WHERE id = ?',
      [id]
    );
  }
}

// 配置选项模型
class ConfigOptionModel {
  static async getAll(filters = {}) {
    let query = `
      SELECT co.*, ct.name as type_name, e.name as environment_name
      FROM config_options co
      LEFT JOIN config_types ct ON co.type_id = ct.id
      LEFT JOIN environments e ON co.environment_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.typeId) {
      query += ' AND co.type_id = ?';
      params.push(filters.typeId);
    }

    if (filters.environmentId) {
      query += ' AND co.environment_id = ?';
      params.push(filters.environmentId);
    }

    if (filters.isActive !== undefined) {
      query += ' AND co.is_active = ?';
      params.push(filters.isActive);
    }

    query += ' ORDER BY co.id';

    const [rows] = await db.promisePool.query(query, params);
    return rows;
  }

  static async getById(id) {
    const [rows] = await db.promisePool.query(
      'SELECT * FROM config_options WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async create(data) {
    const {
      typeId, environmentId, name, nodeCount = 1,
      cpu = 2, memory = 4, diskType = '高IO',
      systemDisk = 80, dataDisk = 100, description
    } = data;

    const [result] = await db.promisePool.query(
      `INSERT INTO config_options
       (type_id, environment_id, name, node_count, cpu, memory, disk_type, system_disk, data_disk, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [typeId, environmentId, name, nodeCount, cpu, memory, diskType, systemDisk, dataDisk, description]
    );
    return result.insertId;
  }

  static async update(id, data) {
    const {
      typeId, environmentId, name, nodeCount, cpu, memory,
      diskType, systemDisk, dataDisk, description, isActive
    } = data;

    await db.promisePool.query(
      `UPDATE config_options SET
       type_id = ?, environment_id = ?, name = ?, node_count = ?,
       cpu = ?, memory = ?, disk_type = ?, system_disk = ?,
       data_disk = ?, description = ?, is_active = ?
       WHERE id = ?`,
      [typeId, environmentId, name, nodeCount, cpu, memory, diskType,
       systemDisk, dataDisk, description, isActive, id]
    );
  }

  static async delete(id) {
    await db.promisePool.query('DELETE FROM config_options WHERE id = ?', [id]);
  }

  static async getByCombination(typeName, environmentName, configName) {
    const [rows] = await db.promisePool.query(
      `SELECT co.* FROM config_options co
       INNER JOIN config_types ct ON co.type_id = ct.id
       INNER JOIN environments e ON co.environment_id = e.id
       WHERE ct.name = ? AND e.name = ? AND co.name = ?`,
      [typeName, environmentName, configName]
    );
    return rows[0];
  }
}

// ==================== 配置详细说明模型工厂 ====================

// 根据类型获取对应的表名和模型
const getDescriptionTableConfig = (typeName) => {
  const typeMap = {
    '数据库': { table: 'config_descriptions_mysql', model: MySQLDescriptionModel },
    'mysql': { table: 'config_descriptions_mysql', model: MySQLDescriptionModel },
    'rabbitmq': { table: 'config_descriptions_rabbitmq', model: RabbitMQDescriptionModel },
    'redis': { table: 'config_descriptions_redis', model: RedisDescriptionModel },
    'kafka': { table: 'config_descriptions_kafka', model: KafkaDescriptionModel },
    'zookeeper': { table: 'config_descriptions_zookeeper', model: ZookeeperDescriptionModel },
    'AP': { table: 'config_descriptions_ap', model: APDescriptionModel },
    '综合一体': { table: 'config_descriptions_comprehensive', model: ComprehensiveDescriptionModel },
    'comprehensive': { table: 'config_descriptions_comprehensive', model: ComprehensiveDescriptionModel },
    '其他': { table: 'config_descriptions_general', model: GeneralDescriptionModel }
  };
  return typeMap[typeName.toLowerCase()] || typeMap['其他'];
};

// MySQL配置详细说明模型
class MySQLDescriptionModel {
  static async getAll(filters = {}) {
    let query = `
      SELECT cd.*, co.name as config_option_name,
             ct.name as type_name, e.name as environment_name
      FROM config_descriptions_mysql cd
      LEFT JOIN config_options co ON cd.config_option_id = co.id
      LEFT JOIN config_types ct ON co.type_id = ct.id
      LEFT JOIN environments e ON co.environment_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.configOptionId) {
      query += ' AND cd.config_option_id = ?';
      params.push(filters.configOptionId);
    }

    query += ' ORDER BY cd.id';

    const [rows] = await db.promisePool.query(query, params);
    return rows;
  }

  static async getByConfigOptionId(configOptionId) {
    const [rows] = await db.promisePool.query(
      'SELECT * FROM config_descriptions_mysql WHERE config_option_id = ?',
      [configOptionId]
    );
    return rows[0];
  }

  static async createOrUpdate(configOptionId, data) {
    const existing = await this.getByConfigOptionId(configOptionId);

    // 构建字段映射
    const fieldMap = {
      architectureType: 'architecture_type',
      masterCpuDetail: 'master_cpu_detail',
      masterMemoryDetail: 'master_memory_detail',
      masterSystemDisk: 'master_system_disk',
      masterDataDisk: 'master_data_disk',
      masterConnections: 'master_connections',
      masterDailyQps: 'master_daily_qps',
      masterPeakQps: 'master_peak_qps',
      diskIops: 'disk_iops',
      diskThroughput: 'disk_throughput',
      diskTypeDescription: 'disk_type_description',
      scenarioUsage: 'scenario_usage',
      scenarioUserScale: 'scenario_user_scale',
      recommendationLevel: 'recommendation_level',
      technicalNotes: 'technical_notes',
      priceLevel: 'price_level'
    };

    const dbFields = [];
    const dbValues = [];
    const setClause = [];

    Object.keys(fieldMap).forEach(key => {
      if (data[key] !== undefined) {
        const dbField = fieldMap[key];
        dbFields.push(dbField);
        dbValues.push(data[key]);
        setClause.push(`${dbField} = ?`);
      }
    });

    if (existing) {
      await db.promisePool.query(
        `UPDATE config_descriptions_mysql SET ${setClause.join(', ')} WHERE config_option_id = ?`,
        [...dbValues, configOptionId]
      );
      return existing.id;
    } else {
      const [result] = await db.promisePool.query(
        `INSERT INTO config_descriptions_mysql (config_option_id, ${dbFields.join(', ')})
         VALUES (?, ${dbFields.map(() => '?').join(', ')})`,
        [configOptionId, ...dbValues]
      );
      return result.insertId;
    }
  }
}

// RabbitMQ配置详细说明模型
class RabbitMQDescriptionModel {
  static async getAll(filters = {}) {
    let query = `
      SELECT cd.*, co.name as config_option_name,
             ct.name as type_name, e.name as environment_name
      FROM config_descriptions_rabbitmq cd
      LEFT JOIN config_options co ON cd.config_option_id = co.id
      LEFT JOIN config_types ct ON co.type_id = ct.id
      LEFT JOIN environments e ON co.environment_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.configOptionId) {
      query += ' AND cd.config_option_id = ?';
      params.push(filters.configOptionId);
    }

    query += ' ORDER BY cd.id';

    const [rows] = await db.promisePool.query(query, params);
    return rows;
  }

  static async getByConfigOptionId(configOptionId) {
    const [rows] = await db.promisePool.query(
      'SELECT * FROM config_descriptions_rabbitmq WHERE config_option_id = ?',
      [configOptionId]
    );
    return rows[0];
  }

  static async createOrUpdate(configOptionId, data) {
    const existing = await this.getByConfigOptionId(configOptionId);

    const fieldMap = {
      architectureType: 'architecture_type',
      resourceCpuDetail: 'resource_cpu_detail',
      resourceMemoryDetail: 'resource_memory_detail',
      resourceSystemDisk: 'resource_system_disk',
      resourceDataDisk: 'resource_data_disk',
      concurrentConnections: 'concurrent_connections',
      messageThroughput: 'message_throughput',
      queueCount: 'queue_count',
      diskIops: 'disk_iops',
      diskThroughput: 'disk_throughput',
      diskTypeDescription: 'disk_type_description',
      haFeatures: 'ha_features',
      scenarioUsage: 'scenario_usage',
      scenarioUserScale: 'scenario_user_scale',
      recommendationLevel: 'recommendation_level',
      technicalNotes: 'technical_notes',
      priceLevel: 'price_level'
    };

    const dbFields = [];
    const dbValues = [];
    const setClause = [];

    Object.keys(fieldMap).forEach(key => {
      if (data[key] !== undefined) {
        const dbField = fieldMap[key];
        dbFields.push(dbField);
        dbValues.push(data[key]);
        setClause.push(`${dbField} = ?`);
      }
    });

    if (existing) {
      await db.promisePool.query(
        `UPDATE config_descriptions_rabbitmq SET ${setClause.join(', ')} WHERE config_option_id = ?`,
        [...dbValues, configOptionId]
      );
      return existing.id;
    } else {
      const [result] = await db.promisePool.query(
        `INSERT INTO config_descriptions_rabbitmq (config_option_id, ${dbFields.join(', ')})
         VALUES (?, ${dbFields.map(() => '?').join(', ')})`,
        [configOptionId, ...dbValues]
      );
      return result.insertId;
    }
  }
}

// Redis配置详细说明模型
class RedisDescriptionModel {
  static async getByConfigOptionId(configOptionId) {
    const [rows] = await db.promisePool.query(
      'SELECT * FROM config_descriptions_redis WHERE config_option_id = ?',
      [configOptionId]
    );
    return rows[0];
  }

  static async createOrUpdate(configOptionId, data) {
    const existing = await this.getByConfigOptionId(configOptionId);

    const fieldMap = {
      architectureType: 'architecture_type',
      resourceCpuDetail: 'resource_cpu_detail',
      resourceMemoryDetail: 'resource_memory_detail',
      resourceSystemDisk: 'resource_system_disk',
      resourceDataDisk: 'resource_data_disk',
      maxConnections: 'max_connections',
      opsPerSecond: 'ops_per_second',
      memoryUsage: 'memory_usage',
      hitRate: 'hit_rate',
      dataSize: 'data_size',
      diskIops: 'disk_iops',
      diskThroughput: 'disk_throughput',
      diskTypeDescription: 'disk_type_description',
      persistenceMode: 'persistence_mode',
      scenarioUsage: 'scenario_usage',
      scenarioUserScale: 'scenario_user_scale',
      recommendationLevel: 'recommendation_level',
      technicalNotes: 'technical_notes',
      priceLevel: 'price_level'
    };

    const dbFields = [];
    const dbValues = [];
    const setClause = [];

    Object.keys(fieldMap).forEach(key => {
      if (data[key] !== undefined) {
        const dbField = fieldMap[key];
        dbFields.push(dbField);
        dbValues.push(data[key]);
        setClause.push(`${dbField} = ?`);
      }
    });

    if (existing) {
      await db.promisePool.query(
        `UPDATE config_descriptions_redis SET ${setClause.join(', ')} WHERE config_option_id = ?`,
        [...dbValues, configOptionId]
      );
      return existing.id;
    } else {
      const [result] = await db.promisePool.query(
        `INSERT INTO config_descriptions_redis (config_option_id, ${dbFields.join(', ')})
         VALUES (?, ${dbFields.map(() => '?').join(', ')})`,
        [configOptionId, ...dbValues]
      );
      return result.insertId;
    }
  }
}

// Kafka配置详细说明模型
class KafkaDescriptionModel {
  static async getByConfigOptionId(configOptionId) {
    const [rows] = await db.promisePool.query(
      'SELECT * FROM config_descriptions_kafka WHERE config_option_id = ?',
      [configOptionId]
    );
    return rows[0];
  }

  static async createOrUpdate(configOptionId, data) {
    const existing = await this.getByConfigOptionId(configOptionId);

    const fieldMap = {
      architectureType: 'architecture_type',
      resourceCpuDetail: 'resource_cpu_detail',
      resourceMemoryDetail: 'resource_memory_detail',
      resourceSystemDisk: 'resource_system_disk',
      resourceDataDisk: 'resource_data_disk',
      throughput: 'throughput',
      partitionCount: 'partition_count',
      replicationFactor: 'replication_factor',
      brokerCount: 'broker_count',
      retentionPeriod: 'retention_period',
      diskIops: 'disk_iops',
      diskThroughput: 'disk_throughput',
      diskTypeDescription: 'disk_type_description',
      scenarioUsage: 'scenario_usage',
      scenarioUserScale: 'scenario_user_scale',
      recommendationLevel: 'recommendation_level',
      technicalNotes: 'technical_notes',
      priceLevel: 'price_level'
    };

    const dbFields = [];
    const dbValues = [];
    const setClause = [];

    Object.keys(fieldMap).forEach(key => {
      if (data[key] !== undefined) {
        const dbField = fieldMap[key];
        dbFields.push(dbField);
        dbValues.push(data[key]);
        setClause.push(`${dbField} = ?`);
      }
    });

    if (existing) {
      await db.promisePool.query(
        `UPDATE config_descriptions_kafka SET ${setClause.join(', ')} WHERE config_option_id = ?`,
        [...dbValues, configOptionId]
      );
      return existing.id;
    } else {
      const [result] = await db.promisePool.query(
        `INSERT INTO config_descriptions_kafka (config_option_id, ${dbFields.join(', ')})
         VALUES (?, ${dbFields.map(() => '?').join(', ')})`,
        [configOptionId, ...dbValues]
      );
      return result.insertId;
    }
  }
}

// AP应用服务配置详细说明模型
class APDescriptionModel {
  static async getByConfigOptionId(configOptionId) {
    const [rows] = await db.promisePool.query(
      'SELECT * FROM config_descriptions_ap WHERE config_option_id = ?',
      [configOptionId]
    );
    return rows[0];
  }

  static async createOrUpdate(configOptionId, data) {
    const existing = await this.getByConfigOptionId(configOptionId);

    const fieldMap = {
      architectureType: 'architecture_type',
      resourceCpuDetail: 'resource_cpu_detail',
      resourceMemoryDetail: 'resource_memory_detail',
      resourceSystemDisk: 'resource_system_disk',
      resourceDataDisk: 'resource_data_disk',
      concurrentUsers: 'concurrent_users',
      requestsPerSecond: 'requests_per_second',
      responseTime: 'response_time',
      throughput: 'throughput',
      userCapacity: 'user_capacity',
      diskIops: 'disk_iops',
      diskThroughput: 'disk_throughput',
      diskTypeDescription: 'disk_type_description',
      scenarioUsage: 'scenario_usage',
      scenarioUserScale: 'scenario_user_scale',
      recommendationLevel: 'recommendation_level',
      technicalNotes: 'technical_notes',
      priceLevel: 'price_level'
    };

    const dbFields = [];
    const dbValues = [];
    const setClause = [];

    Object.keys(fieldMap).forEach(key => {
      if (data[key] !== undefined) {
        const dbField = fieldMap[key];
        dbFields.push(dbField);
        dbValues.push(data[key]);
        setClause.push(`${dbField} = ?`);
      }
    });

    if (existing) {
      await db.promisePool.query(
        `UPDATE config_descriptions_ap SET ${setClause.join(', ')} WHERE config_option_id = ?`,
        [...dbValues, configOptionId]
      );
      return existing.id;
    } else {
      const [result] = await db.promisePool.query(
        `INSERT INTO config_descriptions_ap (config_option_id, ${dbFields.join(', ')})
         VALUES (?, ${dbFields.map(() => '?').join(', ')})`,
        [configOptionId, ...dbValues]
      );
      return result.insertId;
    }
  }
}

// Zookeeper配置详细说明模型
class ZookeeperDescriptionModel {
  static async getAll(filters = {}) {
    let query = `
      SELECT cd.*, co.name as config_option_name,
             ct.name as type_name, e.name as environment_name
      FROM config_descriptions_zookeeper cd
      LEFT JOIN config_options co ON cd.config_option_id = co.id
      LEFT JOIN config_types ct ON co.type_id = ct.id
      LEFT JOIN environments e ON co.environment_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.configOptionId) {
      query += ' AND cd.config_option_id = ?';
      params.push(filters.configOptionId);
    }

    query += ' ORDER BY cd.id';

    const [rows] = await db.promisePool.query(query, params);
    return rows;
  }

  static async getByConfigOptionId(configOptionId) {
    const [rows] = await db.promisePool.query(
      'SELECT * FROM config_descriptions_zookeeper WHERE config_option_id = ?',
      [configOptionId]
    );
    return rows[0];
  }

  static async createOrUpdate(configOptionId, data) {
    const existing = await this.getByConfigOptionId(configOptionId);

    const fieldMap = {
      architectureType: 'architecture_type',
      resourceCpuDetail: 'resource_cpu_detail',
      resourceMemoryDetail: 'resource_memory_detail',
      resourceSystemDisk: 'resource_system_disk',
      resourceDataDisk: 'resource_data_disk',
      clientConnections: 'client_connections',
      coordinationCapability: 'coordination_capability',
      readQps: 'read_qps',
      clusterClientConnections: 'cluster_client_connections',
      clusterWriteQps: 'cluster_write_qps',
      clusterReadQps: 'cluster_read_qps',
      diskIops: 'disk_iops',
      diskThroughput: 'disk_throughput',
      diskTypeDescription: 'disk_type_description',
      haFeatures: 'ha_features',
      scenarioUsage: 'scenario_usage',
      scenarioUserScale: 'scenario_user_scale',
      recommendationLevel: 'recommendation_level',
      technicalNotes: 'technical_notes',
      priceLevel: 'price_level'
    };

    const dbFields = [];
    const dbValues = [];
    const setClause = [];

    Object.keys(fieldMap).forEach(key => {
      if (data[key] !== undefined) {
        const dbField = fieldMap[key];
        dbFields.push(dbField);
        dbValues.push(data[key]);
        setClause.push(`${dbField} = ?`);
      }
    });

    if (existing) {
      await db.promisePool.query(
        `UPDATE config_descriptions_zookeeper SET ${setClause.join(', ')} WHERE config_option_id = ?`,
        [...dbValues, configOptionId]
      );
      return existing.id;
    } else {
      const [result] = await db.promisePool.query(
        `INSERT INTO config_descriptions_zookeeper (config_option_id, ${dbFields.join(', ')})
         VALUES (?, ${dbFields.map(() => '?').join(', ')})`,
        [configOptionId, ...dbValues]
      );
      return result.insertId;
    }
  }
}

// 综合一体配置详细说明模型（参照AP应用服务字段）
class ComprehensiveDescriptionModel {
  static async getAll(filters = {}) {
    let query = `
      SELECT cd.*, co.name as config_option_name,
             ct.name as type_name, e.name as environment_name
      FROM config_descriptions_comprehensive cd
      LEFT JOIN config_options co ON cd.config_option_id = co.id
      LEFT JOIN config_types ct ON co.type_id = ct.id
      LEFT JOIN environments e ON co.environment_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.configOptionId) {
      query += ' AND cd.config_option_id = ?';
      params.push(filters.configOptionId);
    }

    query += ' ORDER BY cd.id';

    const [rows] = await db.promisePool.query(query, params);
    return rows;
  }

  static async getByConfigOptionId(configOptionId) {
    const [rows] = await db.promisePool.query(
      'SELECT * FROM config_descriptions_comprehensive WHERE config_option_id = ?',
      [configOptionId]
    );
    return rows[0];
  }

  static async createOrUpdate(configOptionId, data) {
    const existing = await this.getByConfigOptionId(configOptionId);

    const fieldMap = {
      architectureType: 'architecture_type',
      resourceCpuDetail: 'resource_cpu_detail',
      resourceMemoryDetail: 'resource_memory_detail',
      resourceSystemDisk: 'resource_system_disk',
      resourceDataDisk: 'resource_data_disk',
      concurrentUsers: 'concurrent_users',
      requestsPerSecond: 'requests_per_second',
      responseTime: 'response_time',
      throughput: 'throughput',
      userCapacity: 'user_capacity',
      diskIops: 'disk_iops',
      diskThroughput: 'disk_throughput',
      diskTypeDescription: 'disk_type_description',
      scenarioUsage: 'scenario_usage',
      scenarioUserScale: 'scenario_user_scale',
      recommendationLevel: 'recommendation_level',
      technicalNotes: 'technical_notes',
      priceLevel: 'price_level'
    };

    const dbFields = [];
    const dbValues = [];
    const setClause = [];

    Object.keys(fieldMap).forEach(key => {
      if (data[key] !== undefined) {
        const dbField = fieldMap[key];
        dbFields.push(dbField);
        dbValues.push(data[key]);
        setClause.push(`${dbField} = ?`);
      }
    });

    if (existing) {
      await db.promisePool.query(
        `UPDATE config_descriptions_comprehensive SET ${setClause.join(', ')} WHERE config_option_id = ?`,
        [...dbValues, configOptionId]
      );
      return existing.id;
    } else {
      const [result] = await db.promisePool.query(
        `INSERT INTO config_descriptions_comprehensive (config_option_id, ${dbFields.join(', ')})
         VALUES (?, ${dbFields.map(() => '?').join(', ')})`,
        [configOptionId, ...dbValues]
      );
      return result.insertId;
    }
  }
}

// 通用配置详细说明模型
class GeneralDescriptionModel {
  static async getByConfigOptionId(configOptionId) {
    const [rows] = await db.promisePool.query(
      'SELECT * FROM config_descriptions_general WHERE config_option_id = ?',
      [configOptionId]
    );
    return rows[0];
  }

  static async createOrUpdate(configOptionId, data) {
    const existing = await this.getByConfigOptionId(configOptionId);

    const fieldMap = {
      architectureType: 'architecture_type',
      resourceCpuDetail: 'resource_cpu_detail',
      resourceMemoryDetail: 'resource_memory_detail',
      resourceSystemDisk: 'resource_system_disk',
      resourceDataDisk: 'resource_data_disk',
      performanceMetric1Name: 'performance_metric1_name',
      performanceMetric1Value: 'performance_metric1_value',
      performanceMetric2Name: 'performance_metric2_name',
      performanceMetric2Value: 'performance_metric2_value',
      performanceMetric3Name: 'performance_metric3_name',
      performanceMetric3Value: 'performance_metric3_value',
      diskIops: 'disk_iops',
      diskThroughput: 'disk_throughput',
      diskTypeDescription: 'disk_type_description',
      scenarioUsage: 'scenario_usage',
      scenarioUserScale: 'scenario_user_scale',
      recommendationLevel: 'recommendation_level',
      technicalNotes: 'technical_notes',
      priceLevel: 'price_level'
    };

    const dbFields = [];
    const dbValues = [];
    const setClause = [];

    Object.keys(fieldMap).forEach(key => {
      if (data[key] !== undefined) {
        const dbField = fieldMap[key];
        dbFields.push(dbField);
        dbValues.push(data[key]);
        setClause.push(`${dbField} = ?`);
      }
    });

    if (existing) {
      await db.promisePool.query(
        `UPDATE config_descriptions_general SET ${setClause.join(', ')} WHERE config_option_id = ?`,
        [...dbValues, configOptionId]
      );
      return existing.id;
    } else {
      const [result] = await db.promisePool.query(
        `INSERT INTO config_descriptions_general (config_option_id, ${dbFields.join(', ')})
         VALUES (?, ${dbFields.map(() => '?').join(', ')})`,
        [configOptionId, ...dbValues]
      );
      return result.insertId;
    }
  }
}

// 统一的配置详细说明模型工厂
class ConfigDescriptionModel {
  static async getTypeByConfigOptionId(configOptionId) {
    const [rows] = await db.promisePool.query(
      `SELECT ct.name as type_name
       FROM config_options co
       INNER JOIN config_types ct ON co.type_id = ct.id
       WHERE co.id = ?`,
      [configOptionId]
    );
    return rows[0]?.type_name;
  }

  static async getAll(filters = {}) {
    const { configOptionId } = filters;
    if (!configOptionId) {
      return [];
    }

    const typeName = await this.getTypeByConfigOptionId(configOptionId);
    const config = getDescriptionTableConfig(typeName);

    if (config && config.model) {
      return await config.model.getAll(filters);
    }

    return [];
  }

  static async getByConfigOptionId(configOptionId) {
    const typeName = await this.getTypeByConfigOptionId(configOptionId);
    const config = getDescriptionTableConfig(typeName);

    if (config && config.model) {
      return await config.model.getByConfigOptionId(configOptionId);
    }

    return null;
  }

  static async createOrUpdate(configOptionId, data) {
    const typeName = await this.getTypeByConfigOptionId(configOptionId);
    const config = getDescriptionTableConfig(typeName);

    if (config && config.model) {
      return await config.model.createOrUpdate(configOptionId, data);
    }

    throw new Error(`不支持的配置类型: ${typeName}`);
  }
}

// 3级联动关系模型
class LinkageRelationModel {
  static async getAll(filters = {}) {
    let query = `
      SELECT lr.*, ct.name as type_name, e.name as environment_name, co.name as config_option_name
      FROM linkage_relations lr
      LEFT JOIN config_types ct ON lr.type_id = ct.id
      LEFT JOIN environments e ON lr.environment_id = e.id
      LEFT JOIN config_options co ON lr.config_option_id = co.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.typeId) {
      query += ' AND lr.type_id = ?';
      params.push(filters.typeId);
    }

    if (filters.isActive !== undefined) {
      query += ' AND lr.is_active = ?';
      params.push(filters.isActive);
    }

    query += ' ORDER BY lr.display_order, lr.id';

    const [rows] = await db.promisePool.query(query, params);
    return rows;
  }

  static async getByTypeId(typeId) {
    const [rows] = await db.promisePool.query(
      `SELECT lr.*, e.name as environment_name, co.name as config_option_name
       FROM linkage_relations lr
       LEFT JOIN environments e ON lr.environment_id = e.id
       LEFT JOIN config_options co ON lr.config_option_id = co.id
       WHERE lr.type_id = ? AND lr.is_active = TRUE
       ORDER BY lr.display_order`,
      [typeId]
    );
    return rows;
  }

  static async create(data) {
    const { typeId, environmentId, configOptionId, displayOrder = 0 } = data;
    const [result] = await db.promisePool.query(
      'INSERT INTO linkage_relations (type_id, environment_id, config_option_id, display_order) VALUES (?, ?, ?, ?)',
      [typeId, environmentId, configOptionId, displayOrder]
    );
    return result.insertId;
  }

  static async update(id, data) {
    const { typeId, environmentId, configOptionId, displayOrder, isActive } = data;
    await db.promisePool.query(
      'UPDATE linkage_relations SET type_id = ?, environment_id = ?, config_option_id = ?, display_order = ?, is_active = ? WHERE id = ?',
      [typeId, environmentId, configOptionId, displayOrder, isActive, id]
    );
  }

  static async delete(id) {
    await db.promisePool.query('DELETE FROM linkage_relations WHERE id = ?', [id]);
  }
}

module.exports = {
  ConfigTypeModel,
  EnvironmentModel,
  ConfigOptionModel,
  ConfigDescriptionModel,
  MySQLDescriptionModel,
  RabbitMQDescriptionModel,
  RedisDescriptionModel,
  KafkaDescriptionModel,
  ZookeeperDescriptionModel,
  APDescriptionModel,
  ComprehensiveDescriptionModel,
  GeneralDescriptionModel,
  LinkageRelationModel
};