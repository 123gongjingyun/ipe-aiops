/**
 * 验证API响应字段是否正确
 */
const http = require('http');

async function testAPI() {
  console.log('🔍 验证API响应字段...\n');

  // 测试Zookeeper单节点配置
  console.log('📊 Zookeeper单节点配置 (OptionID: 23)');
  try {
    const zkResponse = await fetchAPI('http://localhost:3000/api/config/descriptions?configOptionId=23');
    if (zkResponse.success && zkResponse.data[0]) {
      const data = zkResponse.data[0];
      console.log('✅ 字段验证:');
      console.log(`  - 客户端连接数: ${data.client_connections || '❌ 缺失'}`);
      console.log(`  - 协调能力: ${data.coordination_capability || '❌ 缺失'}`);
      console.log(`  - 读QPS: ${data.read_qps || '❌ 缺失'}`);
      console.log(`  - 旧字段存在: ${data.performance_metric1_name ? '⚠️  是（应该没有）' : '✅ 否'}`);
    }
  } catch (error) {
    console.log('❌ API请求失败:', error.message);
  }

  console.log('\n📊 Zookeeper集群配置 (OptionID: 67)');
  try {
    const zkClusterResponse = await fetchAPI('http://localhost:3000/api/config/descriptions?configOptionId=67');
    if (zkClusterResponse.success && zkClusterResponse.data[0]) {
      const data = zkClusterResponse.data[0];
      console.log('✅ 字段验证:');
      console.log(`  - 集群客户端连接数: ${data.cluster_client_connections || '❌ 缺失'}`);
      console.log(`  - 集群写QPS: ${data.cluster_write_qps || '❌ 缺失'}`);
      console.log(`  - 集群读QPS: ${data.cluster_read_qps || '❌ 缺失'}`);
    }
  } catch (error) {
    console.log('❌ API请求失败:', error.message);
  }

  console.log('\n📊 综合一一体配置 (OptionID: 105)');
  try {
    const cpResponse = await fetchAPI('http://localhost:3000/api/config/descriptions?configOptionId=105');
    if (cpResponse.success && cpResponse.data[0]) {
      const data = cpResponse.data[0];
      console.log('✅ 字段验证:');
      console.log(`  - 并发用户数: ${data.concurrent_users || '❌ 缺失'}`);
      console.log(`  - 每秒请求数: ${data.requests_per_second || '⚠️  空'}`);
      console.log(`  - 响应时间: ${data.response_time || '❌ 缺失'}`);
      console.log(`  - 用户容量: ${data.user_capacity || '⚠️  空'}`);
    }
  } catch (error) {
    console.log('❌ API请求失败:', error.message);
  }

  console.log('\n✅ API验证完成！');
  console.log('\n🌐 请在浏览器中测试前端页面:');
  console.log('1. 选择Zookeeper类型，查看配置详情');
  console.log('2. 选择综合一体类型，查看配置详情');
  console.log('3. 验证核心指标是否正确显示');
}

function fetchAPI(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

testAPI();