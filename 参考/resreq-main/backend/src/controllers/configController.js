/**
 * 配置管理控制器
 */

const {
  ConfigTypeModel,
  EnvironmentModel,
  ConfigOptionModel,
  ConfigDescriptionModel,
  LinkageRelationModel
} = require('../models/configModel');
const { validateUsername, sanitizeInput } = require('../utils/security');

// 配置类型控制器
class ConfigTypeController {
  static async getAll(req, res) {
    try {
      const types = await ConfigTypeModel.getAll();
      res.json({
        success: true,
        data: types
      });
    } catch (error) {
      console.error('获取配置类型失败:', error);
      res.status(500).json({
        success: false,
        message: '获取配置类型失败'
      });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const type = await ConfigTypeModel.getById(id);

      if (!type) {
        return res.status(404).json({
          success: false,
          message: '配置类型不存在'
        });
      }

      res.json({
        success: true,
        data: type
      });
    } catch (error) {
      console.error('获取配置类型详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取配置类型详情失败'
      });
    }
  }

  static async create(req, res) {
    try {
      const { name, description, sortOrder } = req.body;

      // 输入验证
      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: '配置类型名称不能为空'
        });
      }

      // 安全处理
      const sanitizedName = sanitizeInput(name.trim());
      const sanitizedDescription = description ? sanitizeInput(description) : '';

      const id = await ConfigTypeModel.create({
        name: sanitizedName,
        description: sanitizedDescription,
        sortOrder: sortOrder || 0
      });

      res.status(201).json({
        success: true,
        message: '配置类型创建成功',
        data: { id }
      });
    } catch (error) {
      console.error('创建配置类型失败:', error);
      res.status(500).json({
        success: false,
        message: '创建配置类型失败'
      });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const { name, description, sortOrder, isActive } = req.body;

      // 检查是否存在
      const existing = await ConfigTypeModel.getById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: '配置类型不存在'
        });
      }

      // 安全处理
      const sanitizedName = name ? sanitizeInput(name.trim()) : existing.name;
      const sanitizedDescription = description !== undefined ? sanitizeInput(description) : existing.description;

      await ConfigTypeModel.update(id, {
        name: sanitizedName,
        description: sanitizedDescription,
        sortOrder: sortOrder !== undefined ? sortOrder : existing.sort_order,
        isActive: isActive !== undefined ? isActive : existing.is_active
      });

      res.json({
        success: true,
        message: '配置类型更新成功'
      });
    } catch (error) {
      console.error('更新配置类型失败:', error);
      res.status(500).json({
        success: false,
        message: '更新配置类型失败'
      });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;

      const existing = await ConfigTypeModel.getById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: '配置类型不存在'
        });
      }

      await ConfigTypeModel.delete(id);

      res.json({
        success: true,
        message: '配置类型删除成功'
      });
    } catch (error) {
      console.error('删除配置类型失败:', error);
      res.status(500).json({
        success: false,
        message: '删除配置类型失败'
      });
    }
  }

  static async toggleActive(req, res) {
    try {
      const { id } = req.params;
      await ConfigTypeModel.toggleActive(id);

      res.json({
        success: true,
        message: '状态切换成功'
      });
    } catch (error) {
      console.error('切换状态失败:', error);
      res.status(500).json({
        success: false,
        message: '切换状态失败'
      });
    }
  }
}

// 环境控制器
class EnvironmentController {
  static async getAll(req, res) {
    try {
      const environments = await EnvironmentModel.getAll();
      res.json({
        success: true,
        data: environments
      });
    } catch (error) {
      console.error('获取环境列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取环境列表失败'
      });
    }
  }

  static async create(req, res) {
    try {
      const { name, description, sortOrder } = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: '环境名称不能为空'
        });
      }

      const sanitizedName = sanitizeInput(name.trim());
      const sanitizedDescription = description ? sanitizeInput(description) : '';

      const id = await EnvironmentModel.create({
        name: sanitizedName,
        description: sanitizedDescription,
        sortOrder: sortOrder || 0
      });

      res.status(201).json({
        success: true,
        message: '环境创建成功',
        data: { id }
      });
    } catch (error) {
      console.error('创建环境失败:', error);
      res.status(500).json({
        success: false,
        message: '创建环境失败'
      });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const { name, description, sortOrder, isActive } = req.body;

      const existing = await EnvironmentModel.getById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: '环境不存在'
        });
      }

      const sanitizedName = name ? sanitizeInput(name.trim()) : existing.name;
      const sanitizedDescription = description !== undefined ? sanitizeInput(description) : existing.description;

      await EnvironmentModel.update(id, {
        name: sanitizedName,
        description: sanitizedDescription,
        sortOrder: sortOrder !== undefined ? sortOrder : existing.sort_order,
        isActive: isActive !== undefined ? isActive : existing.is_active
      });

      res.json({
        success: true,
        message: '环境更新成功'
      });
    } catch (error) {
      console.error('更新环境失败:', error);
      res.status(500).json({
        success: false,
        message: '更新环境失败'
      });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      await EnvironmentModel.delete(id);

      res.json({
        success: true,
        message: '环境删除成功'
      });
    } catch (error) {
      console.error('删除环境失败:', error);
      res.status(500).json({
        success: false,
        message: '删除环境失败'
      });
    }
  }

  static async toggleActive(req, res) {
    try {
      const { id } = req.params;
      await EnvironmentModel.toggleActive(id);

      res.json({
        success: true,
        message: '状态切换成功'
      });
    } catch (error) {
      console.error('切换状态失败:', error);
      res.status(500).json({
        success: false,
        message: '切换状态失败'
      });
    }
  }
}

// 配置选项控制器
class ConfigOptionController {
  static async getAll(req, res) {
    try {
      const { typeId, environmentId, isActive, page, pageSize } = req.query;
      const options = await ConfigOptionModel.getAll({
        typeId: typeId ? parseInt(typeId) : undefined,
        environmentId: environmentId ? parseInt(environmentId) : undefined,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        page: page ? parseInt(page) : undefined,
        pageSize: pageSize ? parseInt(pageSize) : undefined
      });

      res.json({
        success: true,
        data: options
      });
    } catch (error) {
      console.error('获取配置选项失败:', error);
      res.status(500).json({
        success: false,
        message: '获取配置选项失败'
      });
    }
  }

  static async create(req, res) {
    try {
      const {
        typeId, environmentId, name, nodeCount, cpu, memory,
        diskType, systemDisk, dataDisk, description
      } = req.body;

      // 验证必填字段
      if (!typeId || !environmentId || !name) {
        return res.status(400).json({
          success: false,
          message: '缺少必填字段'
        });
      }

      const sanitizedName = sanitizeInput(name.trim());
      const sanitizedDescription = description ? sanitizeInput(description) : '';

      const id = await ConfigOptionModel.create({
        typeId: parseInt(typeId),
        environmentId: parseInt(environmentId),
        name: sanitizedName,
        nodeCount: nodeCount || 1,
        cpu: cpu || 2,
        memory: memory || 4,
        diskType: diskType || '高IO',
        systemDisk: systemDisk || 80,
        dataDisk: dataDisk || 100,
        description: sanitizedDescription
      });

      res.status(201).json({
        success: true,
        message: '配置选项创建成功',
        data: { id }
      });
    } catch (error) {
      console.error('创建配置选项失败:', error);
      res.status(500).json({
        success: false,
        message: '创建配置选项失败'
      });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      await ConfigOptionModel.update(id, updateData);

      res.json({
        success: true,
        message: '配置选项更新成功'
      });
    } catch (error) {
      console.error('更新配置选项失败:', error);
      res.status(500).json({
        success: false,
        message: '更新配置选项失败'
      });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      await ConfigOptionModel.delete(id);

      res.json({
        success: true,
        message: '配置选项删除成功'
      });
    } catch (error) {
      console.error('删除配置选项失败:', error);
      res.status(500).json({
        success: false,
        message: '删除配置选项失败'
      });
    }
  }
}

// 配置详细说明控制器
class ConfigDescriptionController {
  static async getAll(req, res) {
    try {
      const { configOptionId } = req.query;
      const descriptions = await ConfigDescriptionModel.getAll({
        configOptionId: configOptionId ? parseInt(configOptionId) : undefined
      });

      res.json({
        success: true,
        data: descriptions
      });
    } catch (error) {
      console.error('获取配置详细说明失败:', error);
      res.status(500).json({
        success: false,
        message: '获取配置详细说明失败'
      });
    }
  }

  static async update(req, res) {
    try {
      const { configOptionId } = req.params;
      const data = req.body;

      await ConfigDescriptionModel.createOrUpdate(parseInt(configOptionId), data);

      res.json({
        success: true,
        message: '配置详细说明更新成功'
      });
    } catch (error) {
      console.error('更新配置详细说明失败:', error);
      res.status(500).json({
        success: false,
        message: '更新配置详细说明失败'
      });
    }
  }
}

// 3级联动关系控制器
class LinkageRelationController {
  static async getAll(req, res) {
    try {
      const { typeId } = req.query;
      const relations = await LinkageRelationModel.getAll({
        typeId: typeId ? parseInt(typeId) : undefined
      });

      res.json({
        success: true,
        data: relations
      });
    } catch (error) {
      console.error('获取联动关系失败:', error);
      res.status(500).json({
        success: false,
        message: '获取联动关系失败'
      });
    }
  }

  static async getByType(req, res) {
    try {
      const { typeId } = req.params;
      const relations = await LinkageRelationModel.getByTypeId(parseInt(typeId));

      // 按环境分组
      const grouped = {};
      relations.forEach(rel => {
        if (!grouped[rel.environment_name]) {
          grouped[rel.environment_name] = [];
        }
        if (rel.config_option_name) {
          grouped[rel.environment_name].push({
            id: rel.config_option_id,
            name: rel.config_option_name
          });
        }
      });

      res.json({
        success: true,
        data: grouped
      });
    } catch (error) {
      console.error('获取类型联动关系失败:', error);
      res.status(500).json({
        success: false,
        message: '获取类型联动关系失败'
      });
    }
  }
}

module.exports = {
  ConfigTypeController,
  EnvironmentController,
  ConfigOptionController,
  ConfigDescriptionController,
  LinkageRelationController
};