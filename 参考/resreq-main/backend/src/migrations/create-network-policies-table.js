const { promisePool } = require('../config/database');

async function createNetworkPoliciesTable() {
  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS network_policies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        environment VARCHAR(50) NOT NULL COMMENT '环境',
        source_asset_code VARCHAR(100) NOT NULL COMMENT '源资产编号',
        source_address VARCHAR(255) NOT NULL COMMENT '源地址',
        target_asset VARCHAR(255) NOT NULL COMMENT '目标资产',
        target_address VARCHAR(255) NOT NULL COMMENT '目标地址',
        system_name VARCHAR(255) NOT NULL COMMENT '所属系统',
        port_type VARCHAR(50) NOT NULL COMMENT '端口类型',
        port VARCHAR(100) NOT NULL COMMENT '端口',
        status VARCHAR(20) DEFAULT 'draft' COMMENT '状态：draft-草稿，submitted-已提交，approved-已通过，rejected-已拒绝',
        applicant_id INT NOT NULL COMMENT '申请人ID',
        applicant_name VARCHAR(100) NOT NULL COMMENT '申请人姓名',
        submitted_at DATETIME COMMENT '提交时间',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        KEY idx_applicant_id (applicant_id),
        KEY idx_status (status),
        KEY idx_environment (environment)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='网络策略申请表'
    `;

    await promisePool.query(sql);
    console.log('网络策略申请表创建成功');
    process.exit(0);
  } catch (error) {
    console.error('创建网络策略申请表失败:', error);
    process.exit(1);
  }
}

createNetworkPoliciesTable();
