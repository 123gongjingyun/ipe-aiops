<template>
  <div class="config-management">
    <div class="page-header">
      <h2 class="page-title">配置管理</h2>
    </div>

    <el-tabs v-model="activeTab" type="border-card" @tab-change="handleTabChange">
      <!-- 类型管理 -->
      <el-tab-pane label="类型管理" name="types">
        <div class="tab-header">
          <el-button type="primary" :icon="Plus" @click="handleAddType">
            添加类型
          </el-button>
          <el-button @click="loadTypes">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>

        <el-table :data="types" border stripe v-loading="loading.types">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="name" label="类型名称" />
          <el-table-column prop="description" label="描述" />
          <el-table-column prop="sort_order" label="排序" width="100" />
          <el-table-column prop="is_active" label="状态" width="100">
            <template #default="{ row }">
              <el-switch
                :model-value="!!row.is_active"
                @change="toggleTypeActive(row)"
                :loading="row.toggling"
              />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200">
            <template #default="{ row }">
              <el-button size="small" @click="handleEditType(row)">编辑</el-button>
              <el-button size="small" type="danger" @click="handleDeleteType(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 环境管理 -->
      <el-tab-pane label="环境管理" name="environments">
        <div class="tab-header">
          <el-button type="primary" :icon="Plus" @click="handleAddEnvironment">
            添加环境
          </el-button>
          <el-button @click="loadEnvironments">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>

        <el-table :data="environments" border stripe v-loading="loading.environments">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="name" label="环境名称" />
          <el-table-column prop="description" label="描述" />
          <el-table-column prop="sort_order" label="排序" width="100" />
          <el-table-column prop="is_active" label="状态" width="100">
            <template #default="{ row }">
              <el-switch
                :model-value="!!row.is_active"
                @change="toggleEnvironmentActive(row)"
                :loading="row.toggling"
              />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200">
            <template #default="{ row }">
              <el-button size="small" @click="handleEditEnvironment(row)">编辑</el-button>
              <el-button size="small" type="danger" @click="handleDeleteEnvironment(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 配置选项管理 -->
      <el-tab-pane label="配置选项" name="options">
        <div class="tab-header">
          <el-button type="primary" :icon="Plus" @click="handleAddOption">
            添加配置选项
          </el-button>
          <el-button @click="loadConfigOptions">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>

        <div class="filter-bar">
          <el-select v-model="filters.typeId" placeholder="按类型筛选" clearable style="width: 150px" @change="handleFilterChange">
            <el-option v-for="type in types" :key="type.id" :label="type.name" :value="type.id" />
          </el-select>
          <el-select v-model="filters.environmentId" placeholder="按环境筛选" clearable style="width: 150px" @change="handleFilterChange">
            <el-option v-for="env in environments" :key="env.id" :label="env.name" :value="env.id" />
          </el-select>
        </div>

        <el-table :data="configOptions" border stripe v-loading="loading.options">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="type_name" label="类型" width="120" />
          <el-table-column prop="environment_name" label="环境" width="100" />
          <el-table-column prop="name" label="配置名称" width="150" />
          <el-table-column prop="node_count" label="节点数" width="80" />
          <el-table-column prop="cpu" label="CPU" width="80" />
          <el-table-column prop="memory" label="内存" width="80" />
          <el-table-column prop="disk_type" label="磁盘类型" width="100" />
          <el-table-column prop="system_disk" label="系统盘" width="100" />
          <el-table-column prop="data_disk" label="数据盘" width="100" />
          <el-table-column label="操作" width="250">
            <template #default="{ row }">
              <el-button size="small" @click="handleEditOption(row)">编辑</el-button>
              <el-button size="small" type="success" @click="handleEditDescription(row)">详细说明</el-button>
              <el-button size="small" type="danger" @click="handleDeleteOption(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页组件 -->
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="pagination.currentPage"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 类型编辑对话框 -->
    <el-dialog v-model="dialogs.type" :title="typeForm.isEdit ? '编辑类型' : '添加类型'" width="500px">
      <el-form :model="typeForm" :rules="typeRules" ref="typeFormRef" label-width="100px">
        <el-form-item label="类型名称" prop="name">
          <el-input v-model="typeForm.name" placeholder="如：数据库、RabbitMQ" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="typeForm.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="排序" prop="sortOrder">
          <el-input-number v-model="typeForm.sortOrder" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogs.type = false">取消</el-button>
        <el-button type="primary" @click="saveType" :loading="loading.save">保存</el-button>
      </template>
    </el-dialog>

    <!-- 环境编辑对话框 -->
    <el-dialog v-model="dialogs.environment" :title="environmentForm.isEdit ? '编辑环境' : '添加环境'" width="500px">
      <el-form :model="environmentForm" :rules="environmentRules" ref="environmentFormRef" label-width="100px">
        <el-form-item label="环境名称" prop="name">
          <el-input v-model="environmentForm.name" placeholder="如：测试、生产" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="environmentForm.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="排序" prop="sortOrder">
          <el-input-number v-model="environmentForm.sortOrder" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogs.environment = false">取消</el-button>
        <el-button type="primary" @click="saveEnvironment" :loading="loading.save">保存</el-button>
      </template>
    </el-dialog>

    <!-- 配置选项编辑对话框 -->
    <el-dialog v-model="dialogs.option" :title="optionForm.isEdit ? '编辑配置选项' : '添加配置选项'" width="600px">
      <el-form :model="optionForm" :rules="optionRules" ref="optionFormRef" label-width="120px">
        <el-form-item label="配置类型" prop="typeId">
          <el-select v-model="optionForm.typeId" placeholder="选择类型" style="width: 100%">
            <el-option v-for="type in activeTypes" :key="type.id" :label="type.name" :value="type.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="环境" prop="environmentId">
          <el-select v-model="optionForm.environmentId" placeholder="选择环境" style="width: 100%">
            <el-option v-for="env in activeEnvironments" :key="env.id" :label="env.name" :value="env.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="配置名称" prop="name">
          <el-input v-model="optionForm.name" placeholder="如：配置A-小型" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="节点数" prop="nodeCount">
              <el-input-number v-model="optionForm.nodeCount" :min="1" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="CPU" prop="cpu">
              <el-input-number v-model="optionForm.cpu" :min="1" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="内存(GB)" prop="memory">
              <el-input-number v-model="optionForm.memory" :min="1" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="磁盘类型" prop="diskType">
              <el-select v-model="optionForm.diskType" style="width: 100%">
                <el-option label="高IO" value="高IO" />
                <el-option label="超高IO" value="超高IO" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="系统盘(GB)" prop="systemDisk">
              <el-input-number v-model="optionForm.systemDisk" :min="1" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="数据盘(GB)" prop="dataDisk">
              <el-input-number v-model="optionForm.dataDisk" :min="1" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="描述" prop="description">
          <el-input v-model="optionForm.description" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogs.option = false">取消</el-button>
        <el-button type="primary" @click="saveOption" :loading="loading.save">保存</el-button>
      </template>
    </el-dialog>

    <!-- 配置详细说明编辑对话框 - 改进版 -->
    <el-dialog v-model="dialogs.description" title="配置详细说明" width="900px">
      <el-form :model="descriptionForm" ref="descriptionFormRef" label-width="140px">

        <!-- MySQL专用字段 -->
        <template v-if="currentConfigType === 'mysql' || currentConfigType === '数据库'">
          <el-divider content-position="left">基本信息</el-divider>
          <el-form-item label="配置选项">
            <el-input v-model="currentConfigOptionName" disabled />
          </el-form-item>
          <el-form-item label="架构类型">
            <el-input v-model="descriptionForm.architectureType" placeholder="如：单节点、主从架构、集群架构" />
          </el-form-item>

          <el-divider content-position="left">资源配置</el-divider>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="CPU详细说明">
                <el-input v-model="descriptionForm.masterCpuDetail" placeholder="如：2核Intel Xeon" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="内存详细说明">
                <el-input v-model="descriptionForm.masterMemoryDetail" placeholder="如：4GB DDR4" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="系统盘详细说明">
                <el-input v-model="descriptionForm.masterSystemDisk" placeholder="如：40 GB 高IO云盘" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="数据盘详细说明">
                <el-input v-model="descriptionForm.masterDataDisk" placeholder="如：100 GB 高IO块存储" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="最大连接数">
                <el-input v-model="descriptionForm.masterConnections" placeholder="如：50-80" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="日均QPS">
                <el-input v-model="descriptionForm.masterDailyQps" placeholder="如：800-2,000" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="峰值QPS">
                <el-input v-model="descriptionForm.masterPeakQps" placeholder="如：2,000-4,000" />
              </el-form-item>
            </el-col>
          </el-row>
        </template>

        <!-- RabbitMQ专用字段 -->
        <template v-else-if="currentConfigType === 'rabbitmq'">
          <el-divider content-position="left">基本信息</el-divider>
          <el-form-item label="配置选项">
            <el-input v-model="currentConfigOptionName" disabled />
          </el-form-item>
          <el-form-item label="架构类型">
            <el-input v-model="descriptionForm.architectureType" placeholder="如：单节点、集群架构" />
          </el-form-item>

          <el-divider content-position="left">资源配置详情</el-divider>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="CPU详细说明">
                <el-input v-model="descriptionForm.resourceCpuDetail" placeholder="如：2核Intel Xeon" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="内存详细说明">
                <el-input v-model="descriptionForm.resourceMemoryDetail" placeholder="如：4GB DDR4" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="系统盘详细说明">
                <el-input v-model="descriptionForm.resourceSystemDisk" placeholder="如：40 GB 高IO云盘" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="数据盘详细说明">
                <el-input v-model="descriptionForm.resourceDataDisk" placeholder="如：100 GB 高IO块存储" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left">消息队列性能指标</el-divider>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="并发连接数">
                <el-input v-model="descriptionForm.concurrentConnections" placeholder="如：100-200" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="消息吞吐量">
                <el-input v-model="descriptionForm.messageThroughput" placeholder="如：1,000-3,000" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="队列数量">
                <el-input v-model="descriptionForm.queueCount" placeholder="如：10-50" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="磁盘IOPS">
                <el-input v-model="descriptionForm.diskIops" placeholder="如：500-1000" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="磁盘吞吐量">
                <el-input v-model="descriptionForm.diskThroughput" placeholder="如：40-90" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="高可用特性">
            <el-input v-model="descriptionForm.haFeatures" placeholder="如：支持故障转移" />
          </el-form-item>
        </template>

        <!-- Redis专用字段 -->
        <template v-else-if="currentConfigType === 'redis'">
          <el-divider content-position="left">基本信息</el-divider>
          <el-form-item label="配置选项">
            <el-input v-model="currentConfigOptionName" disabled />
          </el-form-item>
          <el-form-item label="架构类型">
            <el-input v-model="descriptionForm.architectureType" placeholder="如：单节点、主从、哨兵、集群" />
          </el-form-item>

          <el-divider content-position="left">资源配置详情</el-divider>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="CPU详细说明">
                <el-input v-model="descriptionForm.resourceCpuDetail" placeholder="如：2核Intel Xeon" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="内存详细说明">
                <el-input v-model="descriptionForm.resourceMemoryDetail" placeholder="如：4GB DDR4" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="系统盘详细说明">
                <el-input v-model="descriptionForm.resourceSystemDisk" placeholder="如：40 GB 高IO云盘" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="数据盘详细说明">
                <el-input v-model="descriptionForm.resourceDataDisk" placeholder="如：100 GB 高IO块存储" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left">Redis性能指标</el-divider>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="最大连接数">
                <el-input v-model="descriptionForm.maxConnections" placeholder="如：10000" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="每秒操作数">
                <el-input v-model="descriptionForm.opsPerSecond" placeholder="如：50000" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="内存使用量">
                <el-input v-model="descriptionForm.memoryUsage" placeholder="如：2GB" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="缓存命中率">
                <el-input v-model="descriptionForm.hitRate" placeholder="如：95%+" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="数据容量">
                <el-input v-model="descriptionForm.dataSize" placeholder="如：10GB" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="持久化模式">
                <el-input v-model="descriptionForm.persistenceMode" placeholder="如：RDB/AOF/混合" />
              </el-form-item>
            </el-col>
          </el-row>
        </template>

        <!-- Kafka专用字段 -->
        <template v-else-if="currentConfigType === 'kafka'">
          <el-divider content-position="left">基本信息</el-divider>
          <el-form-item label="配置选项">
            <el-input v-model="currentConfigOptionName" disabled />
          </el-form-item>
          <el-form-item label="架构类型">
            <el-input v-model="descriptionForm.architectureType" placeholder="如：单节点、集群" />
          </el-form-item>

          <el-divider content-position="left">资源配置详情</el-divider>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="CPU详细说明">
                <el-input v-model="descriptionForm.resourceCpuDetail" placeholder="如：2核Intel Xeon" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="内存详细说明">
                <el-input v-model="descriptionForm.resourceMemoryDetail" placeholder="如：4GB DDR4" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="系统盘详细说明">
                <el-input v-model="descriptionForm.resourceSystemDisk" placeholder="如：40 GB 高IO云盘" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="数据盘详细说明">
                <el-input v-model="descriptionForm.resourceDataDisk" placeholder="如：100 GB 高IO块存储" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left">Kafka性能指标</el-divider>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="消息吞吐量">
                <el-input v-model="descriptionForm.throughput" placeholder="如：100000 msg/s" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="分区数量">
                <el-input v-model="descriptionForm.partitionCount" placeholder="如：12" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="副本因子">
                <el-input v-model="descriptionForm.replicationFactor" placeholder="如：3" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="Broker节点数">
                <el-input v-model="descriptionForm.brokerCount" placeholder="如：3" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="消息保留期">
                <el-input v-model="descriptionForm.retentionPeriod" placeholder="如：7天" />
              </el-form-item>
            </el-col>
          </el-row>
        </template>

        <!-- AP应用专用字段 -->
        <template v-else-if="currentConfigType === 'ap'">
          <el-divider content-position="left">基本信息</el-divider>
          <el-form-item label="配置选项">
            <el-input v-model="currentConfigOptionName" disabled />
          </el-form-item>
          <el-form-item label="架构类型">
            <el-input v-model="descriptionForm.architectureType" placeholder="如：单节点、集群" />
          </el-form-item>

          <el-divider content-position="left">资源配置详情</el-divider>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="CPU详细说明">
                <el-input v-model="descriptionForm.resourceCpuDetail" placeholder="如：2核Intel Xeon" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="内存详细说明">
                <el-input v-model="descriptionForm.resourceMemoryDetail" placeholder="如：4GB DDR4" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="系统盘详细说明">
                <el-input v-model="descriptionForm.resourceSystemDisk" placeholder="如：40 GB 高IO云盘" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="数据盘详细说明">
                <el-input v-model="descriptionForm.resourceDataDisk" placeholder="如：100 GB 高IO块存储" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left">应用性能指标</el-divider>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="并发用户数">
                <el-input v-model="descriptionForm.concurrentUsers" placeholder="如：1000" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="每秒请求数">
                <el-input v-model="descriptionForm.requestsPerSecond" placeholder="如：500" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="响应时间">
                <el-input v-model="descriptionForm.responseTime" placeholder="如：<100ms" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="吞吐量">
                <el-input v-model="descriptionForm.throughput" placeholder="如：1000 req/s" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="用户容量">
                <el-input v-model="descriptionForm.userCapacity" placeholder="如：10000用户" />
              </el-form-item>
            </el-col>
          </el-row>
        </template>

        <!-- Zookeeper专用字段 -->
        <template v-else-if="currentConfigType === 'zookeeper'">
          <el-divider content-position="left">基本信息</el-divider>
          <el-form-item label="配置选项">
            <el-input v-model="currentConfigOptionName" disabled />
          </el-form-item>
          <el-form-item label="架构类型">
            <el-input v-model="descriptionForm.architectureType" placeholder="如：单节点、3节点集群" />
          </el-form-item>

          <el-divider content-position="left">资源配置详情</el-divider>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="CPU详细说明">
                <el-input v-model="descriptionForm.resourceCpuDetail" placeholder="如：2核Intel Xeon" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="内存详细说明">
                <el-input v-model="descriptionForm.resourceMemoryDetail" placeholder="如：4GB DDR4" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="系统盘详细说明">
                <el-input v-model="descriptionForm.resourceSystemDisk" placeholder="如：40 GB 高IO云盘" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="数据盘详细说明">
                <el-input v-model="descriptionForm.resourceDataDisk" placeholder="如：100 GB 高IO块存储" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left">Zookeeper核心性能指标</el-divider>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="客户端连接数">
                <el-input v-model="descriptionForm.clientConnections" placeholder="如：100-500" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="协调能力">
                <el-input v-model="descriptionForm.coordinationCapability" placeholder="如：支持5-10个客户端" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="读QPS">
                <el-input v-model="descriptionForm.readQps" placeholder="如：5000-20000" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left">集群性能指标（3节点集群）</el-divider>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="集群客户端连接数">
                <el-input v-model="descriptionForm.clusterClientConnections" placeholder="如：×3节点" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="集群写QPS">
                <el-input v-model="descriptionForm.clusterWriteQps" placeholder="如：45000-135000" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="集群读QPS">
                <el-input v-model="descriptionForm.clusterReadQps" placeholder="如：225000-675000" />
              </el-form-item>
            </el-col>
          </el-row>
        </template>

        <!-- 综合一体专用字段 -->
        <template v-else-if="currentConfigType === 'comprehensive'">
          <el-divider content-position="left">基本信息</el-divider>
          <el-form-item label="配置选项">
            <el-input v-model="currentConfigOptionName" disabled />
          </el-form-item>
          <el-form-item label="架构类型">
            <el-input v-model="descriptionForm.architectureType" placeholder="如：单节点、集群" />
          </el-form-item>

          <el-divider content-position="left">资源配置详情</el-divider>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="CPU详细说明">
                <el-input v-model="descriptionForm.resourceCpuDetail" placeholder="如：2核Intel Xeon" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="内存详细说明">
                <el-input v-model="descriptionForm.resourceMemoryDetail" placeholder="如：4GB DDR4" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="系统盘详细说明">
                <el-input v-model="descriptionForm.resourceSystemDisk" placeholder="如：40 GB 高IO云盘" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="数据盘详细说明">
                <el-input v-model="descriptionForm.resourceDataDisk" placeholder="如：100 GB 高IO块存储" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left">应用性能指标</el-divider>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="并发用户数">
                <el-input v-model="descriptionForm.concurrentUsers" placeholder="如：500-2000" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="每秒请求数">
                <el-input v-model="descriptionForm.requestsPerSecond" placeholder="如：100" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="响应时间">
                <el-input v-model="descriptionForm.responseTime" placeholder="如：<100ms" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="吞吐量">
                <el-input v-model="descriptionForm.throughput" placeholder="如：1000 req/s" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="用户容量">
                <el-input v-model="descriptionForm.userCapacity" placeholder="如：日活<100" />
              </el-form-item>
            </el-col>
          </el-row>
        </template>

        <!-- 通用字段（所有类型都有） -->
        <template v-if="currentConfigType">
          <el-divider content-position="left">磁盘性能指标</el-divider>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="磁盘IOPS">
                <el-input v-model="descriptionForm.diskIops" placeholder="如：1200~5000" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="磁盘吞吐量">
                <el-input v-model="descriptionForm.diskThroughput" placeholder="如：100-150 MB/s" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="磁盘类型技术说明">
            <el-input v-model="descriptionForm.diskTypeDescription" type="textarea" :rows="2" placeholder="技术说明" />
          </el-form-item>

          <el-divider content-position="left">使用场景</el-divider>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="适用场景">
                <el-input v-model="descriptionForm.scenarioUsage" placeholder="如：开发测试环境" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="适用用户规模">
                <el-input v-model="descriptionForm.scenarioUserScale" placeholder="如：日活<3,000" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="推荐等级">
                <el-select v-model="descriptionForm.recommendationLevel" style="width: 100%">
                  <el-option label="不推荐" value="不推荐" />
                  <el-option label="一般" value="一般" />
                  <el-option label="推荐" value="推荐" />
                  <el-option label="强烈推荐" value="强烈推荐" />
                  <el-option label="顶级" value="顶级" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="价格等级">
                <el-select v-model="descriptionForm.priceLevel" style="width: 100%">
                  <el-option label="便宜" value="便宜" />
                  <el-option label="中等" value="中等" />
                  <el-option label="较贵" value="较贵" />
                  <el-option label="最贵" value="最贵" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="技术说明">
            <el-input v-model="descriptionForm.technicalNotes" type="textarea" :rows="3" placeholder="技术选型建议和注意事项" />
          </el-form-item>
        </template>

        <!-- 通用类型（综合一体、Zookeeper等） -->
        <template v-else>
          <el-divider content-position="left">基本信息</el-divider>
          <el-form-item label="配置选项">
            <el-input v-model="currentConfigOptionName" disabled />
          </el-form-item>
          <el-form-item label="架构类型">
            <el-input v-model="descriptionForm.architectureType" placeholder="如：单节点、集群架构" />
          </el-form-item>

          <el-divider content-position="left">资源配置详情</el-divider>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="CPU详细说明">
                <el-input v-model="descriptionForm.resourceCpuDetail" placeholder="如：2核Intel Xeon" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="内存详细说明">
                <el-input v-model="descriptionForm.resourceMemoryDetail" placeholder="如：4GB DDR4" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="系统盘详细说明">
                <el-input v-model="descriptionForm.resourceSystemDisk" placeholder="如：40 GB 高IO云盘" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="数据盘详细说明">
                <el-input v-model="descriptionForm.resourceDataDisk" placeholder="如：100 GB 高IO块存储" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left">性能指标</el-divider>
          <el-row :gutter="20">
            <el-col :span="6">
              <el-form-item label="指标1名称">
                <el-input v-model="descriptionForm.performanceMetric1Name" placeholder="如：连接数" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="指标1数值">
                <el-input v-model="descriptionForm.performanceMetric1Value" placeholder="如：1000-5000" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="指标2名称">
                <el-input v-model="descriptionForm.performanceMetric2Name" placeholder="如：吞吐量" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="指标2数值">
                <el-input v-model="descriptionForm.performanceMetric2Value" placeholder="如：10000-50000" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="6">
              <el-form-item label="指标3名称">
                <el-input v-model="descriptionForm.performanceMetric3Name" placeholder="如：响应时间" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="指标3数值">
                <el-input v-model="descriptionForm.performanceMetric3Value" placeholder="如：<100ms" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left">磁盘信息</el-divider>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="磁盘IOPS">
                <el-input v-model="descriptionForm.diskIops" placeholder="如：500-1000" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="磁盘吞吐量(MB/s)">
                <el-input v-model="descriptionForm.diskThroughput" placeholder="如：40-90" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="磁盘类型说明">
            <el-input v-model="descriptionForm.diskTypeDescription" type="textarea" :rows="2" placeholder="磁盘类型技术说明" />
          </el-form-item>

          <el-divider content-position="left">应用场景和推荐</el-divider>
          <el-form-item label="适用场景">
            <el-input v-model="descriptionForm.scenarioUsage" type="textarea" :rows="2" placeholder="如：开发测试环境、生产环境等" />
          </el-form-item>
          <el-form-item label="适用用户规模">
            <el-input v-model="descriptionForm.scenarioUserScale" placeholder="如：日活<1000、日活<10000等" />
          </el-form-item>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="推荐等级">
                <el-select v-model="descriptionForm.recommendationLevel" placeholder="选择推荐等级" style="width: 100%">
                  <el-option label="不推荐" value="不推荐" />
                  <el-option label="一般" value="一般" />
                  <el-option label="推荐" value="推荐" />
                  <el-option label="强烈推荐" value="强烈推荐" />
                  <el-option label="顶级" value="顶级" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="价格等级">
                <el-select v-model="descriptionForm.priceLevel" placeholder="选择价格等级" style="width: 100%">
                  <el-option label="便宜" value="便宜" />
                  <el-option label="中等" value="中等" />
                  <el-option label="较贵" value="较贵" />
                  <el-option label="最贵" value="最贵" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="技术说明">
            <el-input v-model="descriptionForm.technicalNotes" type="textarea" :rows="3" placeholder="技术选型建议和注意事项" />
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="dialogs.description = false">取消</el-button>
        <el-button type="primary" @click="saveDescription" :loading="loading.save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const activeTab = ref('types')

// 加载状态
const loading = reactive({
  types: false,
  environments: false,
  options: false,
  linkage: false,
  save: false
})

// 对话框状态
const dialogs = reactive({
  type: false,
  environment: false,
  option: false,
  description: false
})

// 数据存储
const types = ref([])
const environments = ref([])
const configOptions = ref([])

// 当前编辑的配置类型
const currentConfigType = ref('')
const currentConfigOptionId = ref(null)
const currentConfigOptionName = ref('')

// 筛选条件
const filters = reactive({
  typeId: null,
  environmentId: null
})

// 分页数据
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 用于下拉选择的类型和环境（显示所有，包括未启用的）
const activeTypes = computed(() => types.value)
const activeEnvironments = computed(() => environments.value)

// 类型表单
const typeFormRef = ref(null)
const typeForm = reactive({
  id: null,
  name: '',
  description: '',
  sortOrder: 0,
  isEdit: false
})

const typeRules = {
  name: [
    { required: true, message: '请输入类型名称', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在2-20个字符', trigger: 'blur' }
  ]
}

// 环境表单
const environmentFormRef = ref(null)
const environmentForm = reactive({
  id: null,
  name: '',
  description: '',
  sortOrder: 0,
  isEdit: false
})

const environmentRules = {
  name: [
    { required: true, message: '请输入环境名称', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在2-20个字符', trigger: 'blur' }
  ]
}

// 配置选项表单
const optionFormRef = ref(null)
const optionForm = reactive({
  id: null,
  typeId: null,
  environmentId: null,
  name: '',
  nodeCount: 1,
  cpu: 2,
  memory: 4,
  diskType: '高IO',
  systemDisk: 80,
  dataDisk: 100,
  description: '',
  isEdit: false
})

const optionRules = {
  typeId: [{ required: true, message: '请选择配置类型', trigger: 'change' }],
  environmentId: [{ required: true, message: '请选择环境', trigger: 'change' }],
  name: [
    { required: true, message: '请输入配置名称', trigger: 'blur' },
    { min: 3, max: 50, message: '长度在3-50个字符', trigger: 'blur' }
  ]
}

// 配置详细说明表单（动态字段）
const descriptionFormRef = ref(null)
const descriptionForm = reactive({
  // 通用字段
  architectureType: '',
  diskIops: '',
  diskThroughput: '',
  diskTypeDescription: '',
  scenarioUsage: '',
  scenarioUserScale: '',
  recommendationLevel: '一般',
  technicalNotes: '',
  priceLevel: '中等',

  // 通用类型性能指标字段
  performanceMetric1Name: '',
  performanceMetric1Value: '',
  performanceMetric2Name: '',
  performanceMetric2Value: '',
  performanceMetric3Name: '',
  performanceMetric3Value: '',

  // MySQL专用字段
  masterCpuDetail: '',
  masterMemoryDetail: '',
  masterSystemDisk: '',
  masterDataDisk: '',
  masterConnections: '',
  masterDailyQps: '',
  masterPeakQps: '',

  // RabbitMQ专用字段
  resourceCpuDetail: '',
  resourceMemoryDetail: '',
  resourceSystemDisk: '',
  resourceDataDisk: '',
  concurrentConnections: '',
  messageThroughput: '',
  queueCount: '',
  haFeatures: '',

  // Redis专用字段
  maxConnections: '',
  opsPerSecond: '',
  memoryUsage: '',
  hitRate: '',
  dataSize: '',
  persistenceMode: '',

  // Kafka专用字段
  throughput: '',
  partitionCount: '',
  replicationFactor: '',
  brokerCount: '',
  retentionPeriod: '',

  // AP应用专用字段
  concurrentUsers: '',
  requestsPerSecond: '',
  responseTime: '',
  userCapacity: '',

  // Zookeeper专用字段
  clientConnections: '',
  coordinationCapability: '',
  readQps: '',
  clusterClientConnections: '',
  clusterWriteQps: '',
  clusterReadQps: '',

  // 综合一体专用字段（与AP使用相同字段名）
  concurrentUsers: '',
  requestsPerSecond: '',
  responseTime: '',
  userCapacity: '',
  throughput: ''
})

// ==================== 数据加载方法 ====================

const loadTypes = async () => {
  loading.types = true
  try {
    const response = await fetch('/api/config/types', {
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })
    const data = await response.json()

    if (data.success) {
      types.value = data.data
      console.log('✅ 配置类型已从数据库加载:', data.data.length, '个类型')
    } else {
      throw new Error('API返回失败')
    }
  } catch (error) {
    console.error('加载配置类型失败:', error)
    ElMessage.error('加载配置类型失败')
  } finally {
    loading.types = false
  }
}

const loadEnvironments = async () => {
  loading.environments = true
  try {
    const response = await fetch('/api/config/environments', {
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })
    const data = await response.json()

    if (data.success) {
      environments.value = data.data
      console.log('✅ 环境配置已从数据库加载:', data.data.length, '个环境')
    } else {
      throw new Error('API返回失败')
    }
  } catch (error) {
    console.error('加载环境失败:', error)
    ElMessage.error('加载环境失败')
  } finally {
    loading.environments = false
  }
}

const loadConfigOptions = async () => {
  loading.options = true
  try {
    // 构建查询参数
    const params = new URLSearchParams()
    if (filters.typeId) params.append('typeId', filters.typeId)
    if (filters.environmentId) params.append('environmentId', filters.environmentId)
    // 添加分页参数
    params.append('page', pagination.currentPage)
    params.append('pageSize', pagination.pageSize)

    const response = await fetch(`/api/config/options?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })
    const data = await response.json()

    if (data.success) {
      // 检查是否是分页数据结构
      if (data.data && data.data.data && data.data.pagination) {
        // 后端分页数据结构
        configOptions.value = data.data.data
        pagination.total = data.data.pagination.total
        console.log('✅ 配置选项已从数据库加载(后端分页):', configOptions.value.length, '个选项，总计:', pagination.total, '个')
      } else {
        // 兼容旧的数据结构，使用前端分页
        let filtered = data.data

        // 应用筛选条件
        if (filters.typeId) {
          filtered = filtered.filter(opt => opt.type_id === filters.typeId)
        }
        if (filters.environmentId) {
          filtered = filtered.filter(opt => opt.environment_id === filters.environmentId)
        }

        // 更新总数
        pagination.total = filtered.length

        // 应用分页
        const start = (pagination.currentPage - 1) * pagination.pageSize
        const end = start + pagination.pageSize
        configOptions.value = filtered.slice(start, end)

        console.log('✅ 配置选项已从数据库加载(前端分页):', filtered.length, '个选项，当前页显示:', configOptions.value.length, '个')
      }
    } else {
      throw new Error('API返回失败')
    }
  } catch (error) {
    console.error('加载配置选项失败:', error)
    ElMessage.error('加载配置选项失败')
  } finally {
    loading.options = false
  }
}

// 分页处理函数
const handleSizeChange = (val) => {
  pagination.pageSize = val
  pagination.currentPage = 1 // 改变每页大小时重置到第一页
  loadConfigOptions()
}

const handleCurrentChange = (val) => {
  pagination.currentPage = val
  loadConfigOptions()
}

// 筛选条件变化处理
const handleFilterChange = () => {
  pagination.currentPage = 1 // 筛选条件改变时重置到第一页
  loadConfigOptions()
}

// ==================== 配置详细说明管理方法（改进版）====================

const handleEditDescription = async (row) => {
  try {
    currentConfigOptionId.value = row.id
    currentConfigOptionName.value = `${row.type_name} - ${row.environment_name} - ${row.name}`

    // 确定配置类型（用于显示不同的字段）
    const typeName = row.type_name?.toLowerCase() || ''
    if (typeName.includes('数据库') || typeName.includes('mysql')) {
      currentConfigType.value = 'mysql'
    } else if (typeName.includes('rabbitmq')) {
      currentConfigType.value = 'rabbitmq'
    } else if (typeName.includes('redis')) {
      currentConfigType.value = 'redis'
    } else if (typeName.includes('kafka')) {
      currentConfigType.value = 'kafka'
    } else if (typeName.includes('zookeeper')) {
      currentConfigType.value = 'zookeeper'
    } else if (typeName.includes('综合一体') || typeName.includes('comprehensive')) {
      currentConfigType.value = 'comprehensive'
    } else if (typeName.includes('ap') || typeName.includes('应用')) {
      currentConfigType.value = 'ap'
    } else {
      currentConfigType.value = 'other'
    }

    console.log('🔍 当前配置类型:', currentConfigType.value)

    // 从API获取配置详细说明
    const response = await fetch(`/api/config/descriptions?configOptionId=${row.id}`, {
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })

    if (response.ok) {
      const data = await response.json()

      if (data.success && data.data.length > 0) {
        // 清空表单
        Object.keys(descriptionForm).forEach(key => {
          descriptionForm[key] = ''
        })

        // 使用API返回的真实数据
        const description = data.data[0]
        Object.keys(description).forEach(key => {
          // 转换数据库字段名到前端字段名（下划线转驼峰）
          const camelKey = key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase())
          if (camelKey in descriptionForm) {
            descriptionForm[camelKey] = description[key]
          }
        })

        console.log('✅ 配置详细说明已从API加载')
      } else {
        // 如果API没有数据，使用默认值
        resetDescriptionForm()
        console.log('ℹ️ API无数据，使用默认值')
      }
    } else {
      throw new Error('获取配置详细说明失败')
    }

    dialogs.description = true
  } catch (error) {
    console.error('加载配置详细说明失败:', error)
    // 如果加载失败，使用默认值并打开对话框
    resetDescriptionForm()
    dialogs.description = true
  }
}

const resetDescriptionForm = () => {
  Object.keys(descriptionForm).forEach(key => {
    descriptionForm[key] = ''
  })
  // 设置一些默认值
  descriptionForm.architectureType = '单节点'
  descriptionForm.recommendationLevel = '一般'
  descriptionForm.priceLevel = '中等'
}

const saveDescription = async () => {
  try {
    loading.save = true

    // 调用真实的API保存配置详细说明
    const response = await fetch(`/api/config/descriptions/${currentConfigOptionId.value}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`
      },
      body: JSON.stringify(descriptionForm)
    })

    if (response.ok) {
      ElMessage.success('配置详细说明保存成功')
      dialogs.description = false
    } else {
      const data = await response.json()
      throw new Error(data.message || '保存失败')
    }
  } catch (error) {
    console.error('保存配置详细说明失败:', error)
    ElMessage.error('保存失败: ' + error.message)
  } finally {
    loading.save = false
  }
}

// ==================== 类型管理方法 ====================

const handleAddType = () => {
  Object.assign(typeForm, {
    id: null,
    name: '',
    description: '',
    sortOrder: types.value.length + 1,
    isEdit: false
  })
  dialogs.type = true
}

const handleEditType = (row) => {
  Object.assign(typeForm, {
    id: row.id,
    name: row.name,
    description: row.description,
    sortOrder: row.sort_order,
    isEdit: true
  })
  dialogs.type = true
}

const saveType = async () => {
  try {
    const valid = await typeFormRef.value.validate()
    if (!valid) return

    loading.save = true

    if (typeForm.isEdit) {
      await fetch(`/api/config/types/${typeForm.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userStore.token}`
        },
        body: JSON.stringify({
          name: typeForm.name,
          description: typeForm.description,
          sortOrder: typeForm.sortOrder,
          isActive: true
        })
      })
      ElMessage.success('类型更新成功')
    } else {
      await fetch('/api/config/types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userStore.token}`
        },
        body: JSON.stringify({
          name: typeForm.name,
          description: typeForm.description,
          sortOrder: typeForm.sortOrder
        })
      })
      ElMessage.success('类型添加成功')
    }

    dialogs.type = false
    await loadTypes()

    window.dispatchEvent(new CustomEvent('config-changed', { detail: { type: 'types' } }))
  } catch (error) {
    console.error('保存类型失败:', error)
    ElMessage.error('保存失败: ' + error.message)
  } finally {
    loading.save = false
  }
}

const handleDeleteType = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除类型"${row.name}"吗？`, '确认删除', {
      type: 'warning'
    })

    const response = await fetch(`/api/config/types/${row.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })

    if (response.ok) {
      ElMessage.success('删除成功')
      await loadTypes()
      window.dispatchEvent(new CustomEvent('config-changed', { detail: { type: 'types' } }))
    } else {
      const data = await response.json()
      throw new Error(data.message || '删除失败')
    }
  } catch (error) {
    console.error('删除类型失败:', error)
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + error.message)
    }
  }
}

const toggleTypeActive = async (row) => {
  row.toggling = true
  try {
    const response = await fetch(`/api/config/types/${row.id}/toggle`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })

    if (response.ok) {
      ElMessage.success('状态更新成功')
      await loadTypes()
      window.dispatchEvent(new CustomEvent('config-changed', { detail: { type: 'types' } }))
    } else {
      throw new Error('状态更新失败')
    }
  } catch (error) {
    console.error('切换类型状态失败:', error)
    ElMessage.error('状态更新失败')
  } finally {
    row.toggling = false
  }
}

// ==================== 环境管理方法 ====================

const handleAddEnvironment = () => {
  Object.assign(environmentForm, {
    id: null,
    name: '',
    description: '',
    sortOrder: environments.value.length + 1,
    isEdit: false
  })
  dialogs.environment = true
}

const handleEditEnvironment = (row) => {
  Object.assign(environmentForm, {
    id: row.id,
    name: row.name,
    description: row.description,
    sortOrder: row.sort_order,
    isEdit: true
  })
  dialogs.environment = true
}

const saveEnvironment = async () => {
  try {
    const valid = await environmentFormRef.value.validate()
    if (!valid) return

    loading.save = true

    if (environmentForm.isEdit) {
      await fetch(`/api/config/environments/${environmentForm.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userStore.token}`
        },
        body: JSON.stringify({
          name: environmentForm.name,
          description: environmentForm.description,
          sortOrder: environmentForm.sortOrder,
          isActive: true
        })
      })
      ElMessage.success('环境更新成功')
    } else {
      await fetch('/api/config/environments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userStore.token}`
        },
        body: JSON.stringify({
          name: environmentForm.name,
          description: environmentForm.description,
          sortOrder: environmentForm.sortOrder
        })
      })
      ElMessage.success('环境添加成功')
    }

    dialogs.environment = false
    await loadEnvironments()

    window.dispatchEvent(new CustomEvent('config-changed', { detail: { type: 'environments' } }))
  } catch (error) {
    console.error('保存环境失败:', error)
    ElMessage.error('保存失败: ' + error.message)
  } finally {
    loading.save = false
  }
}

const handleDeleteEnvironment = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除环境"${row.name}"吗？`, '确认删除', {
      type: 'warning'
    })

    const response = await fetch(`/api/config/environments/${row.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })

    if (response.ok) {
      ElMessage.success('删除成功')
      await loadEnvironments()
      window.dispatchEvent(new CustomEvent('config-changed', { detail: { type: 'environments' } }))
    } else {
      const data = await response.json()
      throw new Error(data.message || '删除失败')
    }
  } catch (error) {
    console.error('删除环境失败:', error)
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + error.message)
    }
  }
}

const toggleEnvironmentActive = async (row) => {
  row.toggling = true
  try {
    const response = await fetch(`/api/config/environments/${row.id}/toggle`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })

    if (response.ok) {
      ElMessage.success('状态更新成功')
      await loadEnvironments()
      window.dispatchEvent(new CustomEvent('config-changed', { detail: { type: 'environments' } }))
    } else {
      throw new Error('状态更新失败')
    }
  } catch (error) {
    console.error('切换环境状态失败:', error)
    ElMessage.error('状态更新失败')
  } finally {
    row.toggling = false
  }
}

// ==================== 配置选项管理方法 ====================

const handleAddOption = () => {
  Object.assign(optionForm, {
    id: null,
    typeId: null,
    environmentId: null,
    name: '',
    nodeCount: 1,
    cpu: 2,
    memory: 4,
    diskType: '高IO',
    systemDisk: 80,
    dataDisk: 100,
    description: '',
    isEdit: false
  })
  dialogs.option = true
}

const handleEditOption = (row) => {
  Object.assign(optionForm, {
    id: row.id,
    typeId: row.type_id,
    environmentId: row.environment_id,
    name: row.name,
    nodeCount: row.node_count,
    cpu: row.cpu,
    memory: row.memory,
    diskType: row.disk_type,
    systemDisk: row.system_disk,
    dataDisk: row.data_disk,
    description: row.description || '',
    isEdit: true
  })
  dialogs.option = true
}

const saveOption = async () => {
  try {
    const valid = await optionFormRef.value.validate()
    if (!valid) return

    loading.save = true

    if (optionForm.isEdit) {
      await fetch(`/api/config/options/${optionForm.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userStore.token}`
        },
        body: JSON.stringify({
          typeId: optionForm.typeId,
          environmentId: optionForm.environmentId,
          name: optionForm.name,
          nodeCount: optionForm.nodeCount,
          cpu: optionForm.cpu,
          memory: optionForm.memory,
          diskType: optionForm.diskType,
          systemDisk: optionForm.systemDisk,
          dataDisk: optionForm.dataDisk,
          description: optionForm.description
        })
      })
      ElMessage.success('配置选项更新成功')
    } else {
      await fetch('/api/config/options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userStore.token}`
        },
        body: JSON.stringify({
          typeId: optionForm.typeId,
          environmentId: optionForm.environmentId,
          name: optionForm.name,
          nodeCount: optionForm.nodeCount,
          cpu: optionForm.cpu,
          memory: optionForm.memory,
          diskType: optionForm.diskType,
          systemDisk: optionForm.systemDisk,
          dataDisk: optionForm.dataDisk,
          description: optionForm.description
        })
      })
      ElMessage.success('配置选项添加成功')
    }

    dialogs.option = false
    await loadConfigOptions()

    window.dispatchEvent(new CustomEvent('config-changed', { detail: { type: 'options' } }))
  } catch (error) {
    console.error('保存配置选项失败:', error)
    ElMessage.error('保存失败: ' + error.message)
  } finally {
    loading.save = false
  }
}

const handleDeleteOption = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除配置选项"${row.name}"吗？`, '确认删除', {
      type: 'warning'
    })

    const response = await fetch(`/api/config/options/${row.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })

    if (response.ok) {
      ElMessage.success('删除成功')
      await loadConfigOptions()
      window.dispatchEvent(new CustomEvent('config-changed', { detail: { type: 'options' } }))
    } else {
      const data = await response.json()
      throw new Error(data.message || '删除失败')
    }
  } catch (error) {
    console.error('删除配置选项失败:', error)
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + error.message)
    }
  }
}

// ==================== 通用方法 ====================

const handleTabChange = (tabName) => {
  switch (tabName) {
    case 'types':
      if (types.value.length === 0) loadTypes()
      break
    case 'environments':
      if (environments.value.length === 0) loadEnvironments()
      break
    case 'options':
      if (configOptions.value.length === 0) loadConfigOptions()
      break
  }
}

// 初始化
onMounted(() => {
  loadTypes()
  loadEnvironments()
})
</script>

<style scoped>
.config-management {
  padding: 20px;
}

.tab-header {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.filter-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  padding: 10px 0;
}
</style>