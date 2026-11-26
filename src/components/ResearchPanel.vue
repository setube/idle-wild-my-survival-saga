<script setup lang="ts">
import { ref, computed, onUnmounted, onMounted } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { technologies } from '../plugins/recipes'

import type { ActivityId, ResearchActivity, Technology, TimerHandle } from '../types/game'

const gameStore = useGameStore()

// 当前选中的科技
const selectedTech = ref<string | null>(null)
const selectedTechnology = computed(() => technologies.find(tech => tech.id === selectedTech.value))
// 研究计时器
const researchTimer = ref<TimerHandle | null>(null)
// 活动状态响应式数据
const researchProgress = ref<Record<ActivityId, number>>({})
const researchRemainingTime = ref<Record<ActivityId, string>>({})
// 正在研究的科技ID
const researchingTech = ref<string[]>([])

// 确保gameStore中有researched数组
if (!gameStore.researched) {
  gameStore.researched = []
  // 初始化已研究的科技
  const initialTechs = technologies.filter(tech => tech.researched)
  for (const tech of initialTechs) {
    gameStore.researched.push(tech.id)
  }
}

// 可研究的科技
const availableTechnologies = computed(() => {
  return technologies.filter(tech => {
    // 过滤未研究且满足前置条件的科技
    if (gameStore.researched.includes(tech.id)) return false
    // 检查前置科技要求
    if (tech.requirements) {
      for (const reqTech of tech.requirements) {
        if (!gameStore.researched.includes(reqTech)) return false
      }
    }
    return true
  })
})

// 已研究的科技
const researchedTechnologies = computed(() => {
  return technologies.filter(tech => gameStore.researched.includes(tech.id))
})

// 检查是否有足够的资源研究科技
const canResearch = computed(() => {
  if (!selectedTech.value) return false
  const tech = technologies.find(t => t.id === selectedTech.value)
  if (!tech || gameStore.researched.includes(tech.id)) return false
  // 检查资源
  for (const [resource, amount] of Object.entries(tech.cost)) {
    if (gameStore.resources[resource] < amount) return false
  }
  return true
})

// 获取科技成本文本
const getTechCost = (tech: Technology) => {
  if (!tech.cost || Object.keys(tech.cost).length === 0) return '无消耗'
  return Object.entries(tech.cost).map(([resource, amount]) => {
    return `${gameStore.getResourceName(resource)}x${amount}`
  }).join(', ')
}

// 研究选中的科技
const researchTech = () => {
  if (!selectedTech.value || !canResearch.value) return
  const tech = technologies.find(t => t.id === selectedTech.value)
  if (!tech) return
  let activityDuration = tech.researchTime
  if (gameStore.skillTreeEffects.researchSpeed > 0) {
    activityDuration = Math.floor(activityDuration / (1 + gameStore.skillTreeEffects.researchSpeed))
  }
  activityDuration = Math.max(1, activityDuration)
  // 创建研究活动
  const researchActivity: ResearchActivity = {
    startTime: Date.now(),
    id: `research_${tech.id}_${Date.now()}`,
    recipeId: `research_${tech.id}`,
    name: `${tech.name}`,
    duration: activityDuration * 1000, // 转换为毫秒
    completed: false,
    tech: tech.id
  }
  // 检查是否有正在进行的研究活动
  if (gameStore.researchActivities.length < gameStore.player.level) {
    // 消耗资源
    for (const [resource, amount] of Object.entries(tech.cost)) {
      let actualAmount = amount
      if (gameStore.skillTreeEffects.researchResourceSaving > 0) {
        const savedAmount = Math.floor(amount * gameStore.skillTreeEffects.researchResourceSaving)
        actualAmount = Math.max(1, amount - savedAmount)
        if (savedAmount > 0) gameStore.addToEventLog(`研究技能帮你节约了 ${savedAmount} 个 ${gameStore.getResourceName(resource)}`)
      }
      gameStore.consumeResource(resource, actualAmount)
    }
    researchActivity.startTime = Date.now()
    gameStore.researchActivities.push(researchActivity)
    // 立即更新状态
    updateResearchStatus()
    startResearchTimer()
    gameStore.addToEventLog(`开始研究${tech.name}`)
    // 设置定时器完成研究
    researchTimer.value = setTimeout(() => completeResearch(researchActivity.id, tech), researchActivity.duration)
  } else {
    // 加入等待队列
    gameStore.pendingResearchActivities.push(researchActivity)
    gameStore.addToEventLog(`已将研究${tech.name}加入等待队列`)
  }
  selectedTech.value = null
  gameStore.saveGame()
}

// 完成研究
const completeResearch = (activityId: ActivityId, tech: Technology) => {
  // 从当前活动中移除
  const activityIndex = gameStore.researchActivities.findIndex(a => a.id === activityId)
  if (activityIndex === -1) return false
  const activity = gameStore.researchActivities[activityIndex]
  // 清除定时器
  if (activity.timer) clearTimeout(activity.timer)
  // 移除研究
  gameStore.researchActivities.splice(activityIndex, 1)
  if (!gameStore.researched.includes(tech.id)) gameStore.researched.push(tech.id)
  tech.researched = true
  // 增加研究技能经验
  gameStore.addSkillExp('research', 20)
  gameStore.addToEventLog(`你成功研究了${tech.name}！`)
  gameStore.saveGame()
  // 检查是否有等待中的研究活动
  const nextResearch = gameStore.pendingResearchActivities.find(a => String(a.id).startsWith('research_'))
  if (nextResearch) {
    const nextTech = technologies.find(t => t.id === nextResearch.tech)
    if (nextTech) {
      // 消耗资源
      for (const [resource, amount] of Object.entries(nextTech.cost)) {
        let actualAmount = amount
        if (gameStore.skillTreeEffects.researchResourceSaving > 0) {
          const savedAmount = Math.floor(amount * gameStore.skillTreeEffects.researchResourceSaving)
          actualAmount = Math.max(1, amount - savedAmount)
          if (savedAmount > 0) gameStore.addToEventLog(`研究技能帮你节约了 ${savedAmount} 个 ${gameStore.getResourceName(resource)}`)
        }
        gameStore.consumeResource(resource, actualAmount)
      }
      // 从等待队列移除并添加到当前活动
      const pendingIndex = gameStore.pendingResearchActivities.findIndex(a => a.id === nextResearch.id)
      if (pendingIndex !== -1) gameStore.pendingResearchActivities.splice(pendingIndex, 1)
      nextResearch.startTime = Date.now()
      gameStore.researchActivities.push(nextResearch)
      gameStore.addToEventLog(`开始研究${nextTech.name}`)
      // 设置定时器
      researchTimer.value = setTimeout(() => completeResearch(nextResearch.id, nextTech), nextResearch.duration)
      gameStore.saveGame()
    }
  }
}

// 取消研究活动
const cancelResearch = (activityId: ActivityId) => {
  // 先检查当前活动
  const currentIndex = gameStore.researchActivities.findIndex(a => a.id === activityId)
  if (currentIndex !== -1) {
    const activity = gameStore.researchActivities[currentIndex]
    const tech = technologies.find(t => t.id === activity.tech)
    if (tech) {
      // 返还资源
      for (const [resource, amount] of Object.entries(tech.cost)) {
        let actualAmount = amount
        if (gameStore.skillTreeEffects.researchResourceSaving > 0) {
          const savedAmount = Math.floor(amount * gameStore.skillTreeEffects.researchResourceSaving)
          actualAmount = Math.max(1, amount - savedAmount)
        }
        gameStore.addResource(resource, actualAmount)
      }
      // 清除定时器
      if (researchTimer.value) {
        clearTimeout(researchTimer.value)
        researchTimer.value = null
      }
      gameStore.researchActivities.splice(currentIndex, 1)
      gameStore.addToEventLog(`取消了研究${tech.name}并返还了资源`)
      gameStore.saveGame()
      // 检查并启动等待队列中的下一个研究活动
      const nextResearch = gameStore.pendingResearchActivities.find(a => String(a.id).startsWith('research_'))
      if (nextResearch) {
        const nextTech = technologies.find(t => t.id === nextResearch.tech)
        if (nextTech) {
          // 消耗资源
          for (const [resource, amount] of Object.entries(nextTech.cost)) {
            let actualAmount = amount
            if (gameStore.skillTreeEffects.researchResourceSaving > 0) {
              const savedAmount = Math.floor(amount * gameStore.skillTreeEffects.researchResourceSaving)
              actualAmount = Math.max(1, amount - savedAmount)
              if (savedAmount > 0) gameStore.addToEventLog(`研究技能帮你节约了 ${savedAmount} 个 ${gameStore.getResourceName(resource)}`)
            }
            gameStore.consumeResource(resource, actualAmount)
          }
          // 从等待队列移除并添加到当前活动
          const pendingIndex = gameStore.pendingResearchActivities.findIndex(a => a.id === nextResearch.id)
          if (pendingIndex !== -1) gameStore.pendingResearchActivities.splice(pendingIndex, 1)
          nextResearch.startTime = Date.now()
          gameStore.researchActivities.push(nextResearch)
          gameStore.addToEventLog(`开始研究${nextTech.name}`)
          gameStore.saveGame()
          // 设置定时器
          researchTimer.value = setTimeout(() => completeResearch(nextResearch.id, nextTech), nextResearch.duration)
        }
      }
      return true
    }
  }
  // 检查等待队列
  const pendingIndex = gameStore.pendingResearchActivities.findIndex(a => a.id === activityId)
  if (pendingIndex !== -1) {
    const activity = gameStore.pendingResearchActivities[pendingIndex]
    gameStore.pendingResearchActivities.splice(pendingIndex, 1)
    gameStore.addToEventLog(`取消了等待中的研究${activity.name}`)
    gameStore.saveGame()
    return true
  }
  return false
}

// 获取研究技能效果文本
const getResearchSkillEffects = () => {
  const effects = []
  // 研究速度加成
  if (gameStore.skillTreeEffects.researchSpeed > 0) effects.push(`研究速度 +${Math.round(gameStore.skillTreeEffects.researchSpeed * 100)}%`)
  // 科技碎片产出
  if (gameStore.skillTreeEffects.techFragmentYield > 0) effects.push(`科技碎片产出 +${Math.round(gameStore.skillTreeEffects.techFragmentYield * 100)}%`)
  // 研究资源节约
  if (gameStore.skillTreeEffects.researchResourceSaving > 0) effects.push(`研究资源节约 +${Math.round(gameStore.skillTreeEffects.researchResourceSaving * 100)}%`)
  // 突破性发现几率
  if (gameStore.skillTreeEffects.breakthroughChance > 0) effects.push(`突破性发现几率 +${Math.round(gameStore.skillTreeEffects.breakthroughChance * 100)}%`)
  return effects.length ? effects.join('，') : '无加成效果'
}

// 获取科技解锁内容文本
const getTechUnlocks = (tech: Technology) => {
  if (!tech.unlocks || tech.unlocks.length === 0) return '无特殊解锁'
  const unlockTexts = []
  for (const unlockId of tech.unlocks) {
    // 检查是否解锁了新科技
    const unlockedTech = technologies.find(t => t.id === unlockId)
    if (unlockedTech) {
      unlockTexts.push(`${unlockedTech.name}`)
      continue
    }
    // 检查是否解锁了新配方
    const unlockedRecipes = gameStore.recipes.filter(r => r.techRequired === tech.id)
    for (const recipe of unlockedRecipes) {
      unlockTexts.push(`配方: ${recipe.name}`)
    }
  }
  return unlockTexts.length ? unlockTexts.join(', ') : '无特殊解锁'
}

// 获取活动剩余时间（格式化为分钟:秒）
const getActivityRemainingTime = (activity: ResearchActivity) => {
  if (researchRemainingTime.value[activity.id] !== undefined) return researchRemainingTime.value[activity.id]
  const now = Date.now()
  const elapsed = now - activity.startTime
  const remaining = Math.max(0, activity.duration - elapsed)
  const seconds = Math.ceil(remaining / 1000)
  return seconds < 60 ? `${seconds}秒` : `${Math.floor(seconds / 60)}分${seconds % 60}秒`
}

// 获取活动进度百分比（0-100）
const getActivityProgress = (activity: ResearchActivity) => {
  if (researchProgress.value[activity.id] !== undefined) return researchProgress.value[activity.id]
  const now = Date.now()
  const elapsed = now - activity.startTime
  return Math.min(100, (elapsed / activity.duration) * 100)
}

// 更新所有研究活动的状态
const updateResearchStatus = () => {
  gameStore.researchActivities.forEach(activity => {
    if (!String(activity.id).startsWith('research_')) return
    const now = Date.now()
    const elapsed = now - activity.startTime
    const progress = Math.min(100, (elapsed / activity.duration) * 100)
    // 检查是否已完成
    if (progress >= 100) {
      const tech = technologies.find(t => t.id === activity.tech)
      if (tech) completeResearch(activity.id, tech)
      return
    }
    researchProgress.value[activity.id] = progress
    const remaining = Math.max(0, activity.duration - elapsed)
    const seconds = Math.ceil(remaining / 1000)
    researchRemainingTime.value[activity.id] = seconds < 60 ?
      `${seconds}秒` : `${Math.floor(seconds / 60)}分${seconds % 60}秒`
  })
}

// 研究更新定时器
const researchUpdateTimer = ref<TimerHandle | null>(null)

// 启动研究状态更新定时器
const startResearchTimer = () => {
  if (researchUpdateTimer.value) return
  researchUpdateTimer.value = setInterval(() => {
    if (gameStore.researchActivities.some(a => String(a.id).startsWith('research_'))) {
      updateResearchStatus()
    }
  }, 1000)
}

const clickSelectedTech = (id: string) => {
  if (selectedTech.value === id) {
    selectedTech.value = null
  } else {
    selectedTech.value = id
  }
}

const isLoading = (tech: string) => {
  return gameStore.researchActivities.some(activity => activity.tech === tech) ||
    gameStore.pendingResearchActivities.some(activity => activity.tech === tech)
}

// 组件挂载时启动定时器
onMounted(() => {
  startResearchTimer()
})

// 组件卸载时清除所有定时器
onUnmounted(() => {
  if (researchUpdateTimer.value) {
    clearInterval(researchUpdateTimer.value)
    researchUpdateTimer.value = null
  }
  if (researchTimer.value) {
    clearTimeout(researchTimer.value)
  }
})
</script>

<template>
  <el-scrollbar class="research-panel">
    <div class="tech-tree">
      <div v-if="getResearchSkillEffects() !== '无加成效果'" class="research-skill-effects">
        <el-alert title="当前研究技能效果" type="success" :closable="false" show-icon>
          <div>{{ getResearchSkillEffects() }}</div>
        </el-alert>
      </div>
      <div class="research-queue"
        v-if="gameStore.researchActivities.length || gameStore.pendingResearchActivities.length">
        <h4>研究队列</h4>
        <el-scrollbar max-height="260" always>
          <div class="research-list">
            <div v-for="activity in gameStore.researchActivities" :key="activity.id" class="research-card in-progress">
              <div class="research-header">
                <div class="research-name">{{ activity.name }}</div>
                <div class="research-time">
                  剩余: {{ getActivityRemainingTime(activity) }}
                </div>
              </div>
              <el-progress :percentage="getActivityProgress(activity)" :stroke-width="10" :show-text="false" />
              <el-button type="danger" size="small" :disabled="gameStore.gameState !== 'playing'"
                @click="cancelResearch(activity.id)" style="width: 100%; margin-top: 10px;">
                取消研究
              </el-button>
            </div>
            <div v-for="activity in gameStore.pendingResearchActivities" :key="activity.id"
              class="research-card pending">
              <div class="research-header">
                <div class="research-name">{{ activity.name }}</div>
                <div class="research-time">等待中</div>
              </div>
              <el-progress :percentage="0" :stroke-width="10" :show-text="false" status="warning" />
              <el-button type="danger" size="small" :disabled="gameStore.gameState !== 'playing'"
                @click="cancelResearch(activity.id)" style="width: 100%; margin-top: 10px;">
                取消队列
              </el-button>
            </div>
          </div>
        </el-scrollbar>
      </div>
      <div v-if="selectedTechnology" class="tech-details">
        <h4>科技详情</h4>
        <div class="selected-tech">
          <div class="tech-name">
            {{selectedTechnology.name}}
          </div>
          <div class="tech-description">
            {{selectedTechnology.description}}
          </div>
          <div class="tech-requirements">
            <div class="tech-cost">
              需要资源: {{getTechCost(selectedTechnology)}}
            </div>
            <div class="tech-unlocks">
              解锁: {{getTechUnlocks(selectedTechnology)}}
            </div>
          </div>
          <div class="tech-actions">
            <el-button type="primary" :loading="isLoading(selectedTechnology.id)" @click="researchTech"
              :disabled="!canResearch || gameStore.gameState !== 'playing'">
              {{ canResearch ? '研究' : '资源不足' }}
            </el-button>
          </div>
        </div>
      </div>
      <div class="tech-categories">
        <h4>可研究科技</h4>
        <div class="tech-list">
          <div v-for="tech in availableTechnologies" :key="tech.id" class="tech-card"
            :class="{ 'selected': selectedTech === tech.id }" @click="clickSelectedTech(tech.id)">
            <div class="tech-name">{{ tech.name }}</div>
            <div class="tech-description">{{ tech.description }}</div>
            <div class="tech-cost">需要: {{ getTechCost(tech) }}</div>
          </div>
          <div v-if="availableTechnologies.length === 0" class="no-tech-message">
            当前没有可研究的科技
          </div>
        </div>
        <h4>已研究科技</h4>
        <div class="tech-list researched">
          <div v-for="tech in researchedTechnologies" :key="tech.id" class="tech-card researched"
            :class="{ 'selected': selectedTech === tech.id }" @click="clickSelectedTech(tech.id)">
            <div class="tech-name">{{ tech.name }}</div>
            <div class="tech-description">{{ tech.description }}</div>
            <div class="tech-unlocks">解锁: {{ getTechUnlocks(tech) }}</div>
          </div>
          <div v-if="researchedTechnologies.length === 0" class="no-tech-message">
            尚未研究任何科技
          </div>
        </div>
      </div>
    </div>
  </el-scrollbar>
</template>

<style scoped>
.research-panel {
  background-color: var(--el-bg-color-overlay);
  border-radius: 4px;
  padding: 15px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.research-panel h3 {
  margin-top: 0;
  margin-bottom: 15px;
}

.tech-tree {
  flex: 1;
  overflow-y: auto;
}

.research-queue {
  margin-top: 20px;
}

.research-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 15px;
  margin: 10px;
}

.research-card {
  background-color: var(--el-bg-color);
  border-radius: 4px;
  padding: 12px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.research-card.pending {
  border-left: 4px solid #E6A23C;
  opacity: 0.8;
}

.research-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.research-name {
  font-weight: bold;
}

.research-time {
  color: var(--el-text-color-secondary);
  font-size: 0.9em;
}

.tech-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.tech-card {
  background-color: var(--el-bg-color);
  border-radius: 4px;
  padding: 12px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s;
  border-left: 4px solid #909399;
}

.tech-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.2);
}

.tech-card.selected {
  border-left: 4px solid #409EFF;
  background-color: var(--el-color-primary-light-9);
}

.tech-card.researched {
  border-left: 4px solid #67C23A;
  opacity: 0.8;
  cursor: default;
}

.tech-name {
  font-weight: bold;
  margin-bottom: 5px;
}

.tech-description {
  font-size: 0.9em;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}

.tech-cost,
.tech-unlocks {
  font-size: 0.85em;
  color: var(--el-text-color-secondary);
}

.tech-details {
  margin-top: 20px;
  padding: 15px;
  background-color: var(--el-bg-color);
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.tech-requirements {
  margin: 10px 0;
}

.tech-actions {
  margin-top: 15px;
  display: flex;
  justify-content: flex-end;
}

.no-tech-message {
  grid-column: 1 / -1;
  padding: 15px;
  text-align: center;
  color: var(--el-text-color-secondary);
  font-style: italic;
}

@media (max-width: 768px) {
  .tech-list {
    grid-template-columns: 1fr;
  }
}
</style>
