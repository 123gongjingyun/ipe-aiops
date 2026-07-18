// 检查环境字段问题
console.log('🔍 检查虚拟机申请的环境字段差异...\n');

// 简单SQL查询模拟
const vmData = [
  { id: 1, system_code: 'A-73', environment: '测试', environment_id: 12, environment_name: '测试' },
  { id: 2, system_code: 'A-75', environment: '开发', environment_id: 11, environment_name: '开发' },
  { id: 3, system_code: 'A-74', environment: '生产', environment_id: 13, environment_name: '生产' },
  { id: 4, system_code: 'S-73', environment: '生产', environment_id: 13, environment_name: '生产' },
  { id: 5, system_code: 'S-60', environment: '生产', environment_id: 13, environment_name: '生产' }
];

console.log('📊 vm_requests表中的环境字段:');
console.log('ID | 系统编号 | environment字段 | environment_id字段');
vmData.forEach(row => {
  console.log(`${row.id} | ${row.system_code} | ${row.environment} | ${row.environment_id}`);
});

console.log('\n🔍 发现的问题:');
console.log('1. vm_requests表有 environment 字段（存储环境名称字符串）');
console.log('2. vm_requests表有 environment_id 字段（关联environments表）');
console.log('3. 后端API返回的是 environment_name（通过JOIN得到）');

console.log('\n💡 字段使用情况:');
console.log('Dashboard虚拟机申请表格: 使用 environment 字段 ❌');
console.log('单独虚拟机申请页面: 使用 environment_name 字段 ✅');
console.log('后端API返回: environment_name 字段 ✅');

console.log('\n❌ 问题原因:');
console.log('Dashboard表格使用 environment 字段，但这个字段在vm_requests表中');
console.log('应该是正确的环境名称，但API返回的是 environment_name 字段');

console.log('\n✅ 解决方案:');
console.log('修改Dashboard.vue中虚拟机申请表格的环境列，从');
console.log('  prop="environment" → prop="environment_name"');

console.log('\n这样就能统一显示环境名称了！');