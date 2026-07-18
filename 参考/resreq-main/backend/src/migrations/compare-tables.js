/**
 * 比较resource_requests表和vm_requests表的结构差异
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../backend/.env') });
const { promisePool } = require('../config/database');

async function compareTableStructures() {
  console.log('🔍 比较resource_requests表和vm_requests表的结构...\n');

  try {
    // 获取resource_requests表结构
    const [resourceStructure] = await promisePool.query('DESC resource_requests');
    console.log('📋 resource_requests表结构:');
    resourceStructure.forEach(field => {
      console.log(`  - ${field.Field}: ${field.Type} ${field.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${field.Default ? `DEFAULT ${field.Default}` : ''}`);
    });

    console.log('\n📋 vm_requests表结构:');
    const [vmStructure] = await promisePool.query('DESC vm_requests');
    vmStructure.forEach(field => {
      console.log(`  - ${field.Field}: ${field.Type} ${field.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${field.Default ? `DEFAULT ${field.Default}` : ''}`);
    });

    // 比较字段差异
    console.log('\n🔍 字段差异分析:');

    const resourceFields = resourceStructure.map(f => f.Field);
    const vmFields = vmStructure.map(f => f.Field);

    const inResourceNotInVM = resourceFields.filter(f => !vmFields.includes(f));
    const inVMNotInResource = vmFields.filter(f => !resourceFields.includes(f));
    const commonFields = resourceFields.filter(f => vmFields.includes(f));

    console.log('\n✅ 共同字段:');
    commonFields.forEach(field => {
      const resourceDef = resourceStructure.find(f => f.Field === field);
      const vmDef = vmStructure.find(f => f.Field === field);
      console.log(`  - ${field}: ${resourceDef.type} (完全相同)`);
    });

    if (inResourceNotInVM.length > 0) {
      console.log('\n❌ resource_requests独有字段:');
      inResourceNotInVM.forEach(field => {
        const def = resourceStructure.find(f => f.Field === field);
        console.log(`  - ${field}: ${def.Type}`);
      });
    }

    if (inVMNotInResource.length > 0) {
      console.log('\n🆕 vm_requests独有字段:');
      inVMNotInResource.forEach(field => {
        const def = vmStructure.find(f => f.Field === field);
        console.log(`  - ${field}: ${def.Type}`);
      });
    }

    // 分析数据内容
    console.log('\n📊 数据内容分析:');

    const [resourceData] = await promisePool.query('SELECT * FROM resource_requests LIMIT 3');
    console.log('\nresource_requests样本数据 (前3条):');
    resourceData.forEach((row, index) => {
      console.log(`${index + 1}. ${row.system_code} - ${row.system_name} (${row.type}) - ${row.environment} - 用户ID:${row.user_id}`);
    });

    const [vmData] = await promisePool.query('SELECT * FROM vm_requests LIMIT 3');
    console.log('\nvm_requests样本数据 (前3条):');
    vmData.forEach((row, index) => {
      console.log(`${index + 1}. ${row.system_name} (${row.type}) - ${row.environment} - 申请人ID:${row.applicant_id}`);
    });

    // 系统架构分析
    console.log('\n🏗️ 系统架构分析:');
    const [allTables] = await promisePool.query("SHOW TABLES LIKE '%requests%'");
    console.log('所有申请相关表:');
    allTables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`  - ${tableName}`);
    });

  } catch (error) {
    console.error('❌ 比较失败:', error);
    throw error;
  }
}

compareTableStructures()
  .then(() => {
    console.log('\n✅ 比较完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 比较失败:', error);
    process.exit(1);
  });