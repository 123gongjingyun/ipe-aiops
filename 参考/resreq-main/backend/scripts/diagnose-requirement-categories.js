const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const [rows] = await connection.execute(
    'SELECT id, name, parent_id, level, sort_order, is_active FROM requirement_categories WHERE is_active = 1 ORDER BY sort_order, id'
  );

  console.log('原始数据行数:', rows.length);
  console.log('');

  const nodeMap = new Map();
  rows.forEach(row => {
    nodeMap.set(row.id, { ...row, children: [] });
  });

  const roots = [];
  rows.forEach(row => {
    const node = nodeMap.get(row.id);
    if (row.parent_id && nodeMap.has(row.parent_id)) {
      nodeMap.get(row.parent_id).children.push(node);
    } else if (!row.parent_id) {
      roots.push(node);
    }
  });

  function printTree(nodes, indent = '') {
    nodes.forEach(node => {
      const levelText = { 1: '一级', 2: '二级', 3: '三级' }[node.level] || `level${node.level}`;
      console.log(`${indent}[${levelText}] id=${node.id} parent=${node.parent_id || 'null'} sort=${node.sort_order} name=${node.name}`);
      if (node.children && node.children.length > 0) {
        printTree(node.children, indent + '  ');
      }
    });
  }

  printTree(roots);

  // 检查异常：三级节点挂到非二级节点下，或非三级节点出现在三级位置
  console.log('\n异常检查:');
  let abnormalCount = 0;
  roots.forEach(root => {
    (root.children || []).forEach(sub => {
      (sub.children || []).forEach(question => {
        if (question.level !== 3) {
          console.log(`  警告：在二级(id=${sub.id})下发现非三级节点 id=${question.id} level=${question.level}`);
          abnormalCount++;
        }
      });
    });
  });

  // 统计没有挂到二级下的三级节点
  const allThirdLevel = rows.filter(r => r.level === 3);
  const correctlyAttached = new Set();
  roots.forEach(root => {
    (root.children || []).forEach(sub => {
      (sub.children || []).forEach(q => correctlyAttached.add(q.id));
    });
  });
  const orphanThird = allThirdLevel.filter(q => !correctlyAttached.has(q.id));
  if (orphanThird.length > 0) {
    console.log(`  警告：${orphanThird.length} 个三级节点未正确挂载到二级下：`);
    orphanThird.forEach(q => console.log(`    id=${q.id} parent=${q.parent_id} name=${q.name}`));
    abnormalCount += orphanThird.length;
  }

  if (abnormalCount === 0) {
    console.log('  未发现异常层级关系');
  }

  await connection.end();
}

main().catch(err => {
  console.error('诊断失败:', err.message);
  process.exit(1);
});
