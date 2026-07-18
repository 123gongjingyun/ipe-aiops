/**
 * 前端代码验证脚本
 * 检查ConfigManagement-improved.vue文件中是否包含正确的Zookeeper和综合一体代码
 */

const fs = require('fs');
const path = require('path');

const filePath = '/Users/jiangli/claude-code-projects/vmconf-web/frontend/src/views/ConfigManagement-improved.vue';

console.log('🔍 验证前端代码文件...\n');

// 读取文件内容
const content = fs.readFileSync(filePath, 'utf-8');

// 检查Zookeeper相关代码
console.log('📊 检查 Zookeeper 相关代码:');
const zkChecks = [
  { name: 'Zookeeper模板条件', pattern: /v-else-if="currentConfigType === 'zookeeper'"/ },
  { name: '客户端连接数字段', pattern: /descriptionForm\.clientConnections/ },
  { name: '协调能力字段', pattern: /descriptionForm\.coordinationCapability/ },
  { name: '读QPS字段', pattern: /descriptionForm\.readQps/ },
  { name: 'Zookeeper核心指标标题', pattern: /Zookeeper核心性能指标/ },
  { name: '集群客户端连接数字段', pattern: /clusterClientConnections/ }
];

zkChecks.forEach(check => {
  const found = check.pattern.test(content);
  console.log(`   ${found ? '✅' : '❌'} ${check.name}: ${found ? '已找到' : '未找到'}`);
});

// 检查综合一体相关代码
console.log('\n📊 检查 综合一一体 相关代码:');
const cpChecks = [
  { name: '综合一体模板条件', pattern: /v-else-if="currentConfigType === '综合一体' \|\| currentConfigType === 'comprehensive'"/ },
  { name: '并发用户数字段', pattern: /descriptionForm\.concurrentUsers/ },
  { name: '每秒请求数字段', pattern: /descriptionForm\.requestsPerSecond/ },
  { name: '响应时间字段', pattern: /descriptionForm\.responseTime/ },
  { name: '应用性能指标标题', pattern: /应用性能指标/ }
];

cpChecks.forEach(check => {
  const found = check.pattern.test(content);
  console.log(`   ${found ? '✅' : '❌'} ${check.name}: ${found ? '已找到' : '未找到'}`);
});

// 检查类型判断逻辑
console.log('\n📊 检查 handleEditDescription 函数中的类型判断:');
const typeChecks = [
  { name: 'Zookeeper类型判断', pattern: /else if.*zookeeper.*currentConfigType\.value = 'zookeeper'/ },
  { name: '综合一体类型判断', pattern: /else if.*综合一体.*comprehensive.*currentConfigType\.value = 'comprehensive'/ }
];

typeChecks.forEach(check => {
  const found = check.pattern.test(content);
  console.log(`   ${found ? '✅' : '❌'} ${check.name}: ${found ? '已找到' : '未找到'}`);
});

// 检查descriptionForm字段定义
console.log('\n📊 检查 descriptionForm 字段定义:');
const formChecks = [
  { name: 'clientConnections字段', pattern: /clientConnections:\s*''/ },
  { name: 'coordinationCapability字段', pattern: /coordinationCapability:\s*''/ },
  { name: 'readQps字段', pattern: /readQps:\s*''/ },
  { name: 'clusterClientConnections字段', pattern: /clusterClientConnections:\s*''/ },
  { name: 'concurrentUsers字段(通用)', pattern: /concurrentUsers:\s*''/ }
];

formChecks.forEach(check => {
  const found = check.pattern.test(content);
  console.log(`   ${found ? '✅' : '❌'} ${check.name}: ${found ? '已找到' : '未找到'}`);
});

console.log('\n🎯 验证结果:');
const allZkFound = zkChecks.every(check => check.pattern.test(content));
const allCpFound = cpChecks.every(check => check.pattern.test(content));
const allTypeFound = typeChecks.every(check => check.pattern.test(content));

if (allZkFound && allCpFound && allTypeFound) {
  console.log('✅ 所有代码都已正确添加！');
  console.log('\n🚀 请执行以下步骤:');
  console.log('1. 硬刷新浏览器 (Ctrl+Shift+R 或 Cmd+Shift+R)');
  console.log('2. 进入"配置管理" → "配置选项"');
  console.log('3. 点击 Zookeeper 配置的"详细说明"按钮');
  console.log('4. 应该能看到 Zookeeper 核心指标字段');
} else {
  console.log('❌ 某些代码可能没有正确添加');
  console.log('   请检查文件是否正确保存');
}

// 创建一个快速测试函数来模拟前端的逻辑
console.log('\n🧪 模拟前端逻辑测试:');

function simulateHandleEditDescription(typeName) {
  const normalized = typeName.toLowerCase();
  let currentConfigType = 'other';

  if (normalized.includes('数据库') || normalized.includes('mysql')) {
    currentConfigType = 'mysql';
  } else if (normalized.includes('rabbitmq')) {
    currentConfigType = 'rabbitmq';
  } else if (normalized.includes('redis')) {
    currentConfigType = 'redis';
  } else if (normalized.includes('kafka')) {
    currentConfigType = 'kafka';
  } else if (normalized.includes('zookeeper')) {
    currentConfigType = 'zookeeper';
  } else if (normalized.includes('综合一体') || normalized.includes('comprehensive')) {
    currentConfigType = 'comprehensive';
  } else if (normalized.includes('ap') || normalized.includes('应用')) {
    currentConfigType = 'ap';
  }

  return currentConfigType;
}

const testTypes = ['Zookeeper', '综合一体', 'MySQL', 'RabbitMQ'];
testTypes.forEach(type => {
  const result = simulateHandleEditDescription(type);
  console.log(`   "${type}" → currentConfigType = "${result}" ${result !== 'other' ? '✅' : ''}`);
});