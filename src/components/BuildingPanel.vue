<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { availableBuildings } from '../plugins/recipes'

import type { ActivityId, BuildingActivity, BuildingDefinition, TimerHandle } from '../types/game'

const gameStore = useGameStore()

// 建筑计时器
const buildingTimer = ref<TimerHandle | null>(null)
// 建筑状态更新定时器
const buildingUpdateTimer = ref<TimerHandle | null>(null)
// 活动状态响应式数据
const buildingProgress = ref<Record<ActivityId, number>>({})
const buildingRemainingTime = ref<Record<ActivityId, string>>({})

// 建筑列表
const buildings = computed(() => {
  return availableBuildings.filter(building => canSeeBuilding(building))
})

// 检查是否满足建筑的技能要求
const canSeeBuilding = (building: BuildingDefinition) => {
  // 获取建筑的第一级所需技能
  const firstLevel = building.levels[0]
  if (!firstLevel.requirements) return true
  // 检查是否满足所有技能要求
  for (const [skill, level] of Object.entries(firstLevel.requirements)) {
    if (gameStore.newSkills[skill].level < level) return false
  }
  return true
}

// 获取建筑当前等级
const getBuildingLevel = (buildingId: string) => {
  const existingBuilding = gameStore.buildings.find(b => b.id === buildingId)
  return existingBuilding ? existingBuilding.level : 0
}

// 检查是否可以建造或升级
const canBuildOrUpgrade = (building: BuildingDefinition) => {
  const currentLevel = getBuildingLevel(building.id)
  // 如果已经是最高级，则不能再升级
  if (currentLevel >= building.levels.length) return false
  // 获取下一级所需资源和技能
  const nextLevel = building.levels[currentLevel]
  // 检查技能要求
  for (const [skill, level] of Object.entries(nextLevel.requirements)) {
    if (gameStore.newSkills[skill].level < level) return false
  }
  // 检查资源要求
  for (const [resource, amount] of Object.entries(nextLevel.cost)) {
    if (gameStore.resources[resource] < amount) return false
  }
  return true
}

// 建造或升级建筑
const buildOrUpgrade = (building: BuildingDefinition) => {
  const currentLevel = getBuildingLevel(building.id)
  const level = currentLevel ? currentLevel + 1 : 1
  // 查找建筑配置
  const buildingConfig = availableBuildings.find(b => b.id === building.id)
  if (!buildingConfig) {
    gameStore.addToEventLog(`未找到建筑: ${building.id}`)
    return
  }
  // 获取指定等级的配置
  const levelConfig = buildingConfig.levels.find(l => l.level === level)
  if (!levelConfig) {
    gameStore.addToEventLog(`未找到建筑等级配置: ${building.id} 等级 ${level}`)
    return
  }
  // 检查技能要求
  for (const [skill, requiredLevel] of Object.entries(levelConfig.requirements)) {
    if (gameStore.newSkills[skill].level < requiredLevel) {
      gameStore.addToEventLog(`你的${skill}技能等级不足，需要达到${requiredLevel}级`)
      return
    }
  }
  // 检查资源要求
  for (const [resource, amount] of Object.entries(levelConfig.cost)) {
    if (gameStore.resources[resource] < amount) {
      gameStore.addToEventLog(`资源不足: ${gameStore.getResourceName(resource)}`)
      return
    }
  }
  // 创建建筑活动
  const buildingActivity: BuildingActivity = {
    startTime: Date.now(),
    id: `building_${building.id}_${Date.now()}`,
    buildingId: building.id,
    name: `${building.name} ${currentLevel ? '升级' : '建造'}`,
    duration: levelConfig.buildTime * 1000, // 转换为毫秒
    level,
    cost: levelConfig.cost,
    completed: false
  }
  // 检查是否有正在进行的建筑活动
  if (gameStore.buildingActivities.length < gameStore.player.level) {
    // 消耗资源
    for (const [resource, amount] of Object.entries(levelConfig.cost)) {
      gameStore.consumeResource(resource, amount)
    }
    buildingActivity.startTime = Date.now()
    gameStore.buildingActivities.push(buildingActivity)
    startBuildingTimer()
    gameStore.addToEventLog(`开始${buildingActivity.name}`)
    // 设置定时器完成建筑
    buildingTimer.value = setTimeout(() => completeBuilding(buildingActivity.id), buildingActivity.duration)
  } else {
    gameStore.pendingBuildingActivities.push(buildingActivity)
    gameStore.addToEventLog(`已将${buildingActivity.name}加入等待队列`)
  }
  gameStore.saveGame()
}

// 完成建筑
const completeBuilding = (activityId: ActivityId) => {
  const activityIndex = gameStore.buildingActivities.findIndex(a => a.id === activityId)
  if (activityIndex === -1) return
  const activity = gameStore.buildingActivities[activityIndex]
  const buildingConfig = availableBuildings.find(b => b.id === activity.buildingId)
  if (!buildingConfig) return
  // 从当前活动中移除
  gameStore.buildingActivities.splice(activityIndex, 1)
  // 应用建筑效果
  const existingBuildingIndex = gameStore.buildings.findIndex(b => b.id === activity.buildingId)
  if (existingBuildingIndex !== -1) {
    // 升级建筑
    gameStore.buildings[existingBuildingIndex] = {
      id: activity.buildingId,
      name: buildingConfig.name,
      level: activity.level,
      effects: { ...buildingConfig.levels[activity.level - 1].effects }
    }
    gameStore.addToEventLog(`${buildingConfig.name}已升级到等级${activity.level}`)
  } else {
    // 新建建筑
    gameStore.buildings.push({
      id: activity.buildingId,
      name: buildingConfig.name,
      level: activity.level,
      effects: { ...buildingConfig.levels[activity.level - 1].effects }
    })
    gameStore.addToEventLog(`建造了${buildingConfig.name}(等级${activity.level})`)
  }
  // 重新初始化建筑效果
  gameStore.rebuildPermanentEffects()
  // 检查是否有等待中的建筑活动
  const nextBuilding = gameStore.pendingBuildingActivities.shift()
  if (nextBuilding) {
    // 消耗资源
    for (const [resource, amount] of Object.entries(nextBuilding.cost)) {
      gameStore.consumeResource(resource, amount)
    }
    nextBuilding.startTime = Date.now()
    gameStore.buildingActivities.push(nextBuilding)
    gameStore.addToEventLog(`开始${nextBuilding.name}`)
    // 设置定时器
    buildingTimer.value = setTimeout(() => completeBuilding(nextBuilding.id), nextBuilding.duration)
  }
}

// 取消建筑活动
const cancelBuilding = (activityId: ActivityId) => {
  // 检查当前活动
  const currentIndex = gameStore.buildingActivities.findIndex(a => a.id === activityId)
  if (currentIndex !== -1) {
    const activity = gameStore.buildingActivities[currentIndex]
    // 返还资源
    for (const [resource, amount] of Object.entries(activity.cost)) {
      gameStore.addResource(resource, amount)
    }
    // 清除定时器
    if (buildingTimer.value) {
      clearTimeout(buildingTimer.value)
      buildingTimer.value = null
    }
    gameStore.buildingActivities.splice(currentIndex, 1)
    gameStore.saveGame()
    gameStore.addToEventLog(`取消了${activity.name}并返还了资源`)
    // 检查并启动等待队列中的下一个建筑活动
    const nextBuilding = gameStore.pendingBuildingActivities.shift()
    if (nextBuilding) {
      // 消耗资源
      for (const [resource, amount] of Object.entries(nextBuilding.cost)) {
        gameStore.consumeResource(resource, amount)
      }
      nextBuilding.startTime = Date.now()
      gameStore.buildingActivities.push(nextBuilding)
      gameStore.addToEventLog(`开始${nextBuilding.name}`)
      // 设置定时器
      buildingTimer.value = setTimeout(() => completeBuilding(nextBuilding.id), nextBuilding.duration)
    }
    return true
  }
  // 检查等待队列
  const pendingIndex = gameStore.pendingBuildingActivities.findIndex(a => a.id === activityId)
  if (pendingIndex !== -1) {
    const activity = gameStore.pendingBuildingActivities[pendingIndex]
    gameStore.pendingBuildingActivities.splice(pendingIndex, 1)
    gameStore.addToEventLog(`取消了等待中的${activity.name}`)
    gameStore.saveGame()
    return true
  }
  return false
}

// 获取建筑活动剩余时间
const getBuildingRemainingTime = (activity: BuildingActivity) => {
  if (buildingRemainingTime.value[activity.id] !== undefined) return buildingRemainingTime.value[activity.id]
  const now = Date.now()
  const elapsed = now - activity.startTime
  const remaining = Math.max(0, activity.duration - elapsed)
  const seconds = Math.ceil(remaining / 1000)
  return seconds < 60 ? `${seconds}秒` : `${Math.floor(seconds / 60)}分${seconds % 60}秒`
}

// 获取建筑活动进度
const getBuildingProgress = (activity: BuildingActivity) => {
  if (buildingProgress.value[activity.id] !== undefined) return buildingProgress.value[activity.id]
  const now = Date.now()
  const elapsed = now - activity.startTime
  return Math.min(100, (elapsed / activity.duration) * 100)
}

// 更新建筑活动状态
const updateBuildingStatus = () => {
  gameStore.buildingActivities.forEach(activity => {
    const now = Date.now()
    const elapsed = now - activity.startTime
    const progress = Math.min(100, (elapsed / activity.duration) * 100)
    // 检查是否已完成
    if (progress >= 100) {
      completeBuilding(activity.id)
      return
    }
    buildingProgress.value[activity.id] = progress
    const remaining = Math.max(0, activity.duration - elapsed)
    const seconds = Math.ceil(remaining / 1000)
    buildingRemainingTime.value[activity.id] = seconds < 60 ?
      `${seconds}秒` : `${Math.floor(seconds / 60)}分${seconds % 60}秒`
  })
}

// 启动建筑状态更新定时器
const startBuildingTimer = () => {
  if (buildingUpdateTimer.value) return
  buildingUpdateTimer.value = setInterval(() => {
    if (gameStore.buildingActivities.length) {
      updateBuildingStatus()
    }
  }, 1000)
}

// 获取建筑状态文本
const getBuildingStatusText = (building: BuildingDefinition) => {
  const currentLevel = getBuildingLevel(building.id)
  if (currentLevel === 0) return '未建造'
  if (currentLevel >= building.levels.length) return `已达到最高等级 (${currentLevel}级)`
  return `当前等级: ${currentLevel}级`
}

// 获取建筑下一级所需资源文本
const getNextLevelCostText = (building: BuildingDefinition) => {
  const currentLevel = getBuildingLevel(building.id)
  if (currentLevel >= building.levels.length) return '已达到最高等级'
  const nextLevel = building.levels[currentLevel]
  return Object.entries(nextLevel.cost).map(([resource, amount]) => `${gameStore.getResourceName(resource)}: ${amount}`).join(', ')
}

// 获取建筑效果文本
const getBuildingEffectsText = (building: BuildingDefinition) => {
  const currentLevel = getBuildingLevel(building.id)
  if (currentLevel === 0) {
    // 显示第一级效果
    const firstLevel = building.levels[0]
    return Object.entries(firstLevel.effects).map(([effect, value]) => formatEffectText(effect, value)).join(', ')
  }
  // 显示当前等级效果
  const existingBuilding = gameStore.buildings.find(b => b.id === building.id)
  if (!existingBuilding) return '无效果'
  return Object.entries(existingBuilding.effects).map(([effect, value]) => formatEffectText(effect, value)).join(', ')
}

// 格式化效果文本
const formatEffectText = (effect: string, value: number) => {
  const effectTexts: Record<string, string> = {
    energyRecovery: `体力恢复 +${value}/小时`,
    maxHealth: `健康上限 +${value}`,
    storageMultiplier: `存储上限 x${value}`,
    craftingSpeed: `制作效率 x${value}`,
    foodPerDay: `食物 +${value}/小时`,
    waterPerDay: `水 +${value}/小时`,
    herbPerDay: `草药 +${value}/天`,
    medicinePerDay: `药品 +${value}/天`,
    toolsPerDay: `工具 +${value}/天`,
    partsPerDay: `零件 +${value}/天`,
    fuelPerDay: `燃料 +${value}/天`,
    metalPerDay: `金属 +${value}/天`,
    stonePerDay: `石头 +${value}/天`,
    woodPerDay: `木材 +${value}/天`
  }
  return effectTexts[effect] || `${effect}: ${value}`
}

// 检查建筑是否正在建造或升级中
const isBuilding = (buildingId: string) => {
  return gameStore.buildingActivities.some(activity => activity.buildingId === buildingId) ||
    gameStore.pendingBuildingActivities.some(activity => activity.id === buildingId)
}

// 组件挂载时启动定时器
onMounted(() => startBuildingTimer())

// 组件卸载时清除定时器
onUnmounted(() => {
  if (buildingUpdateTimer.value) {
    clearInterval(buildingUpdateTimer.value)
    buildingUpdateTimer.value = null
  }
  if (buildingTimer.value) {
    clearTimeout(buildingTimer.value)
  }
})
</script>

<template>
  <div class="building-panel">
    <div class="building-queue"
      v-if="gameStore.buildingActivities.length || gameStore.pendingBuildingActivities.length">
      <h4>建筑队列</h4>
      <el-scrollbar max-height="260" always>
        <div class="building-list">
          <div v-for="activity in gameStore.buildingActivities" :key="activity.id" class="building-card in-progress">
            <div class="building-header">
              <div class="building-name">{{ activity.name }}</div>
              <div class="building-time">剩余: {{ getBuildingRemainingTime(activity) }}</div>
            </div>
            <el-progress :percentage="getBuildingProgress(activity)" :stroke-width="10" :show-text="false" />
            <el-button type="danger" size="small" :disabled="gameStore.gameState !== 'playing'"
              @click="cancelBuilding(activity.id)" style="width: 100%; margin-top: 10px;">
              取消建造
            </el-button>
          </div>
          <div v-for="activity in gameStore.pendingBuildingActivities" :key="activity.id" class="building-card pending">
            <div class="building-header">
              <div class="building-name">{{ activity.name }}</div>
              <div class="building-time">等待中</div>
            </div>
            <el-progress :percentage="0" :stroke-width="10" :show-text="false" status="warning" />
            <el-button type="danger" size="small" :disabled="gameStore.gameState !== 'playing'"
              @click="cancelBuilding(activity.id)" style="width: 100%; margin-top: 10px;">
              取消队列
            </el-button>
          </div>
        </div>
      </el-scrollbar>
    </div>
    <h3>建筑</h3>
    <div class="buildings-list">
      <el-collapse>
        <el-collapse-item v-for="building in buildings" :key="building.id">
          <template #title>
            <div class="building-header">
              <span class="building-name">{{ building.name }}</span>
              <span class="building-status" :class="{
                'not-built': getBuildingLevel(building.id) === 0,
                'max-level': getBuildingLevel(building.id) >= building.levels.length
              }">
                {{ getBuildingStatusText(building) }}
              </span>
            </div>
          </template>
          <div class="building-details">
            <p class="building-description">{{ building.description }}</p>
            <el-descriptions border :column="1">
              <el-descriptions-item label="效果">{{ getBuildingEffectsText(building) }}</el-descriptions-item>
              <template v-if="getBuildingLevel(building.id) < building.levels.length">
                <el-descriptions-item label="所需资源">{{ getNextLevelCostText(building) }}</el-descriptions-item>
                <el-descriptions-item label="技能要求">
                  {{Object.entries(building.levels[getBuildingLevel(building.id)].requirements)
                    .map(([skill, level]) => `${gameStore.getResourceName(skill)} Lv.${level}`)
                    .join(', ')}}
                </el-descriptions-item>
              </template>
            </el-descriptions>
            <el-button type="primary" style="width: 100%;"
              :disabled="!canBuildOrUpgrade(building) || gameStore.gameState !== 'playing'"
              :loading="isBuilding(building.id)" @click="buildOrUpgrade(building)" class="build-button">
              {{ getBuildingLevel(building.id) === 0 ? '建造' : '升级' }}
            </el-button>
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>
  </div>
</template>

<style scoped>
.building-queue {
  margin-bottom: 20px;
}

.building-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 15px;
  margin: 10px;
}

.building-card {
  background-color: var(--el-bg-color);
  border-radius: 4px;
  padding: 12px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.building-card.pending {
  border-left: 4px solid #E6A23C;
  opacity: 0.8;
}

.building-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.building-name {
  font-weight: bold;
}

.building-time {
  color: var(--el-text-color-secondary);
  font-size: 0.9em;
}

.building-panel {
  background-color: var(--el-bg-color-overlay);
  border-radius: 4px;
  padding: 15px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.building-panel h3 {
  margin-top: 0;
  margin-bottom: 15px;
}

.buildings-list {
  flex: 1;
}

.building-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.building-name {
  font-weight: bold;
}

.building-status {
  font-size: 0.9em;
}

.not-built {
  color: var(--el-color-danger);
}

.max-level {
  color: var(--el-color-success);
}

.building-description {
  color: var(--el-text-color-secondary);
  margin-bottom: 15px;
}

.building-details h4 {
  margin: 10px 0 5px 0;
  font-size: 0.9em;
  color: var(--el-text-color-primary);
}

.building-details p {
  margin: 5px 0;
  font-size: 0.9em;
}

.build-button {
  margin-top: 15px;
}
</style>