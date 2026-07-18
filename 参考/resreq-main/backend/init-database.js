require('dotenv').config();
const { promisePool } = require('./src/config/database');

async function initDatabase() {
  try {
    console.log('开始初始化数据库...\n');

    // 创建配置类型表
    console.log('创建配置类型表...');
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS config_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 创建环境表
    console.log('创建环境表...');
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS environments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 创建配置选项表
    console.log('创建配置选项表...');
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS config_options (
        id INT AUTO_INCREMENT PRIMARY KEY,
        config_type_id INT NOT NULL,
        environment_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        node_count INT,
        cpu VARCHAR(20),
        memory INT,
        disk_type VARCHAR(50),
        system_disk INT,
        data_disk INT,
        description TEXT,
        is_recommended BOOLEAN DEFAULT FALSE,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (config_type_id) REFERENCES config_types(id) ON DELETE CASCADE,
        FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE,
        UNIQUE KEY unique_option (config_type_id, environment_id, name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 创建用户表
    console.log('创建用户表...');
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        real_name VARCHAR(100) NOT NULL,
        role ENUM('user', 'admin') DEFAULT 'user',
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 创建资源申请表
    console.log('创建资源申请表...');
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS resource_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        system_code VARCHAR(50) NOT NULL,
        system_name VARCHAR(100) NOT NULL,
        module_name VARCHAR(100) NOT NULL,
        owner VARCHAR(50) NOT NULL,
        config_type_id INT NOT NULL,
        environment_id INT NOT NULL,
        config_option_id INT NOT NULL,
        node_count INT,
        cpu VARCHAR(20),
        memory INT,
        disk_type VARCHAR(50),
        system_disk INT,
        data_disk INT,
        status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (config_type_id) REFERENCES config_types(id) ON DELETE RESTRICT,
        FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE RESTRICT,
        FOREIGN KEY (config_option_id) REFERENCES config_options(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    console.log('✅ 数据库表创建成功\n');

    // 插入初始数据
    console.log('插入初始配置类型...');
    await promisePool.query(`
      INSERT IGNORE INTO config_types (name, description, sort_order) VALUES
      ('MySQL', 'MySQL数据库配置', 1),
      ('RabbitMQ', 'RabbitMQ消息队列配置', 2),
      ('Redis', 'Redis缓存配置', 3),
      ('Zookeeper', 'Zookeeper配置', 4)
    `);

    console.log('插入初始环境...');
    await promisePool.query(`
      INSERT IGNORE INTO environments (name, description, sort_order) VALUES
      ('开发环境', 'Development环境', 1),
      ('测试环境', 'Testing环境', 2),
      ('生产环境', 'Production环境', 3)
    `);

    console.log('✅ 初始数据插入成功\n');

    // 创建管理员账户
    console.log('创建管理员账户...');
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('bgt56yhN$', 10);

    await promisePool.query(`
      INSERT IGNORE INTO users (username, password, real_name, role) VALUES
      ('admin', ?, '系统管理员', 'admin')
    `, [hashedPassword]);

    console.log('✅ 管理员账户创建成功');
    console.log('   用户名: admin');
    console.log('   密码: bgt56yhN$\n');

    console.log('🎉 数据库初始化完成！');

  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

initDatabase();
