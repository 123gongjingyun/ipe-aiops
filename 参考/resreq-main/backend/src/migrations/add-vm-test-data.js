/**
 * 添加虚拟机申请测试数据
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../backend/.env') });
const { promisePool } = require('../config/database');

async function addTestData() {
  console.log('🧪 添加虚拟机申请测试数据...');

  try {
    // 获取用户ID
    const [users] = await promisePool.query('SELECT id, real_name FROM users LIMIT 1');
    if (users.length === 0) {
      console.log('❌ 没有用户数据');
      return;
    }

    const userId = users[0].id;
    const userName = users[0].real_name || users[0].username;

    // 获取环境ID
    const [environments] = await promisePool.query('SELECT id, name FROM environments WHERE name IN ("开发", "测试", "生产")');

    const testData = [
      {
        system_code: 'A-73',
        system_name: '车联网',
        module_name: '车联网平台GTSP相关改造',
        owner: '唐晖',
        type: 'MySQL',
        environment: '测试',
        config_option: '配置A-小型',
        node_count: 1,
        cpu: 2,
        memory: 4,
        disk_type: '高IO',
        system_disk: 80,
        data_disk: 100,
        status: 'submitted',
        applicant_id: userId,
        applicant_name: userName,
        submitted_at: new Date(),
        environment_id: environments.find(e => e.name === '测试')?.id
      },
      {
        system_code: 'A-74',
        system_name: '电商系统',
        module_name: '订单服务',
        owner: '李明',
        type: 'AP应用',
        environment: '生产',
        config_option: '配置B-中型',
        node_count: 1,
        cpu: 4,
        memory: 8,
        disk_type: '高IO',
        system_disk: 80,
        data_disk: 200,
        status: 'draft',
        applicant_id: userId,
        applicant_name: userName,
        submitted_at: null,
        environment_id: environments.find(e => e.name === '生产')?.id
      },
      {
        system_code: 'A-75',
        system_name: '支付系统',
        module_name: '支付核心',
        owner: '王强',
        type: 'Redis',
        environment: '开发',
        config_option: '配置A-小型',
        node_count: 1,
        cpu: 1,
        memory: 2,
        disk_type: '高IO',
        system_disk: 40,
        data_disk: 50,
        status: 'approved',
        applicant_id: userId,
        applicant_name: userName,
        submitted_at: new Date(),
        environment_id: environments.find(e => e.name === '开发')?.id
      }
    ];

    for (const data of testData) {
      const sql = `
        INSERT INTO vm_requests
        (system_code, system_name, module_name, owner, type, environment, config_option,
         node_count, cpu, memory, disk_type, system_disk, data_disk, status,
         applicant_id, applicant_name, submitted_at, environment_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        data.system_code, data.system_name, data.module_name, data.owner,
        data.type, data.environment, data.config_option, data.node_count,
        data.cpu, data.memory, data.disk_type, data.system_disk, data.data_disk,
        data.status, data.applicant_id, data.applicant_name, data.submitted_at,
        data.environment_id
      ];

      await promisePool.query(sql, values);
      console.log(`✅ 已添加测试数据: ${data.system_name} - ${data.module_name}`);
    }

    console.log('✅ 虚拟机申请测试数据添加完成');

    // 验证数据
    const [rows] = await promisePool.query('SELECT COUNT(*) as total FROM vm_requests');
    console.log(`📊 当前vm_requests表记录数: ${rows[0].total}`);

  } catch (error) {
    console.error('❌ 添加测试数据失败:', error);
    throw error;
  }
}

addTestData()
  .then(() => {
    console.log('✅ 测试数据添加完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 测试数据添加失败:', error);
    process.exit(1);
  });