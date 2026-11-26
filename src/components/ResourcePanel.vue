<script setup lang="ts">
import { computed, ref } from 'vue'
import { getResourceSources } from '../plugins/resourceGuide'
import type { ResourceKey } from '../types/game'
import { useGameStore } from '../stores/gameStore'
import { ElMessage, ElMessageBox } from 'element-plus'
import { resources, resourceLimits } from '../plugins/resource'

const gameStore = useGameStore()
interface ResourceDisplay { key: ResourceKey; name: string; icon: string }
const sourceHelpVisible = ref(false)
const selectedResource = ref<ResourceKey>('crystal')
const resourceSources = computed(() => getResourceSources(selectedResource.value, gameStore.getResourceName))
const showResourceSources = (resource: ResourceKey) => {
  selectedResource.value = resource
  sourceHelpVisible.value = true
}

// 资源列表
const basicResources = computed<ResourceDisplay[]>(() => [
  { key: 'food', name: '食物', icon: '🍖' },
  { key: 'water', name: '水', icon: '💧' },
  { key: 'wood', name: '木材', icon: '🌲' },
  { key: 'stone', name: '石头', icon: '🗿' },
  { key: 'metal', name: '金属', icon: '⚙️' },
  { key: 'herb', name: '草药', icon: '🌿' },
  { key: 'rare_herb', name: '稀有草药', icon: '🌱' },
])

const advancedResources = computed<ResourceDisplay[]>(() => [
  { key: 'medicine', name: '药品', icon: '💊' },
  { key: 'tools', name: '工具', icon: '🔨' },
  { key: 'parts', name: '零件', icon: '⚙️' },
  { key: 'advanced_parts', name: '高级零件', icon: '🔧' },
  { key: 'electronic_components', name: '电子元件', icon: '🔌' },
  { key: 'fuel', name: '燃料', icon: '⛽' },
])

const specialResources = computed<ResourceDisplay[]>(() => [
  { key: 'crystal', name: '水晶', icon: '💎' },
  { key: 'ancientRelic', name: '古代遗物', icon: '🏺' },
  { key: 'techFragment', name: '科技碎片', icon: '💾' },
])

// 获取资源数量
const getResourceAmount = (key: ResourceKey) => {
  return Math.ceil(gameStore.resources[key] || 0)
}

// 获取资源上限
const getResourceLimit = (key: ResourceKey) => {
  return Math.ceil(gameStore.resourceLimits[key] || 0)
}

// 计算资源百分比
const getResourcePercentage = (key: ResourceKey) => {
  const amount = getResourceAmount(key)
  const limit = getResourceLimit(key)
  // 防止除以零或未定义值导致NaN
  if (!limit || limit <= 0) return 0
  // 确保百分比不超过100
  return Math.ceil(Math.min((amount / limit) * 100, 100))
}

// 重置资源上限到基础值
const resetResourceLimits = () => {
  for (const resource in resourceLimits) {
    // 资源
    if (typeof gameStore.resources[resource] !== 'number') {
      gameStore.resources[resource] = resources[resource]
    }
    // 资源上限
    if (typeof gameStore.resourceLimits[resource] !== 'number') {
      gameStore.resourceLimits[resource] = resourceLimits[resource]
    }
  }
}

// 同步资源上限数据
const refreshResourceData = () => {
  ElMessageBox.confirm('是否需要同步资源的数据?', '提示', {
    confirmButtonText: '确定',
    showCancelButton: true,
    cancelButtonText: '取消',
    lockScroll: false
  }).then(() => {
    resetResourceLimits()
    gameStore.saveGame()
    ElMessage.success('资源上限数据已同步')
  }).catch(() => { })
}
</script>

<template>
  <div class="resource-panel">
    <h3 class="resource-panel-h3">
      <span>资源</span>
      <span class="resource-panel-name" @click="refreshResourceData">
        <el-icon>
          <Refresh />
        </el-icon>
      </span>
    </h3>
    <div class="resource-section">
      <h4>基础资源</h4>
      <div class="resource-grid">
        <div v-for="resource in basicResources" :key="resource.key" class="resource-item">
          <div class="resource-icon">{{ resource.icon }}</div>
          <div class="resource-info">
            <button type="button" class="resource-name resource-help-button" :aria-label="'查看' + resource.name + '获取方式'" @click="showResourceSources(resource.key)">
              {{ resource.name }} <span aria-hidden="true">ⓘ</span>
            </button>
            <el-progress :percentage="getResourcePercentage(resource.key)"
              :format="() => `${getResourceAmount(resource.key)}/${getResourceLimit(resource.key)}`" :stroke-width="10"
              :color="getResourcePercentage(resource.key) < 20 ? '#F56C6C' : ''" />
          </div>
        </div>
      </div>
    </div>
    <div class="resource-section">
      <h4>高级资源</h4>
      <div class="resource-grid">
        <div v-for="resource in advancedResources" :key="resource.key" class="resource-item">
          <div class="resource-icon">{{ resource.icon }}</div>
          <div class="resource-info">
            <button type="button" class="resource-name resource-help-button" :aria-label="'查看' + resource.name + '获取方式'" @click="showResourceSources(resource.key)">
              {{ resource.name }} <span aria-hidden="true">ⓘ</span>
            </button>
            <el-progress :percentage="getResourcePercentage(resource.key)"
              :format="() => `${getResourceAmount(resource.key)}/${getResourceLimit(resource.key)}`"
              :stroke-width="10" />
          </div>
        </div>
      </div>
    </div>
    <div class="resource-section">
      <h4>特殊资源</h4>
      <div class="resource-grid">
        <div v-for="resource in specialResources" :key="resource.key" class="resource-item">
          <div class="resource-icon">{{ resource.icon }}</div>
          <div class="resource-info">
            <button type="button" class="resource-name resource-help-button" :aria-label="'查看' + resource.name + '获取方式'" @click="showResourceSources(resource.key)">
              {{ resource.name }} <span aria-hidden="true">ⓘ</span>
            </button>
            <el-progress :percentage="getResourcePercentage(resource.key)"
              :format="() => `${getResourceAmount(resource.key)}/${getResourceLimit(resource.key)}`" :stroke-width="10"
              color="#67C23A" />
          </div>
        </div>
      </div>
    </div>
    <el-dialog v-model="sourceHelpVisible" :title="gameStore.getResourceName(selectedResource) + '获取方式'" width="min(620px, calc(100vw - 32px))" append-to-body>
      <p>点击任意资源名称可查看来源。探索和事件奖励具有随机性；资源满仓时新增资源会受存储上限限制。</p>
      <ul class="resource-source-list">
        <li v-for="source in resourceSources" :key="source.title + source.detail">
          <strong>{{ source.title }}</strong>
          <p>{{ source.detail }}</p>
        </li>
      </ul>
      <el-empty v-if="resourceSources.length === 0" description="当前游戏尚未配置该资源的获取途径" :image-size="80" />
      <template #footer><el-button type="primary" @click="sourceHelpVisible = false">知道了</el-button></template>
    </el-dialog>
  </div>
</template>

<style scoped>
.resource-help-button {
  min-height: 44px;
  height: auto;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--el-color-primary);
  font: inherit;
  cursor: pointer;
}
.resource-help-button:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}
.resource-source-list {
  padding-left: 20px;
  line-height: 1.6;
}
.resource-source-list li + li {
  margin-top: 14px;
}
.resource-source-list p {
  margin: 4px 0 0;
}

.resource-panel {
  background-color: var(--el-bg-color-overlay);
  border-radius: 4px;
  padding: 10px;
}

.resource-panel-h3 {
  display: flex;
}

.resource-panel-name {
  margin-left: 10px;
  display: flex;
  align-items: center;
}

.resource-section {
  margin-bottom: 15px;
}

.resource-section h4 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 1em;
  color: var(--el-text-color-secondary);
}

.resource-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}

.resource-item {
  display: flex;
  align-items: center;
  padding: 5px;
  border-radius: 4px;
  background-color: var(--el-bg-color);
  transition: background-color 0.3s;
}

.resource-item:hover {
  background-color: var(--el-fill-color-light);
}

.resource-icon {
  font-size: 1.5em;
  margin-right: 10px;
  width: 30px;
  text-align: center;
}

.resource-info {
  flex: 1;
}

.resource-name {
  font-size: 0.9em;
  margin-bottom: 5px;
}
</style>
