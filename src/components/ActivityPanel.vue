<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { recipes } from '../plugins/recipes'

import type { Activity, ActivityId, Recipe, ResourceAmounts, TimerHandle } from '../types/game'

const gameStore = useGameStore()

// 活动更新定时器
const activityTimerId = ref<TimerHandle | null>(null)

// 活动类型标签
const activityTabs = ref<string | number>('gathering')

// 按类型分组的活动
const gatheringActivities = computed(() => {
  return recipes.filter(recipe =>
    recipe.id.startsWith('gather_') &&
    meetsSkillRequirements(recipe)
  )
})

const craftingActivities = computed(() => {
  return recipes.filter(recipe =>
    recipe.id.startsWith('craft_') &&
    meetsSkillRequirements(recipe)
  )
})

// 检查是否满足技能要求
const meetsSkillRequirements = (recipe: Recipe) => {
  if (!recipe.skillRequired) return true
  for (const [skill, level] of Object.entries(recipe.skillRequired)) {
    if (gameStore.newSkills[skill].level < level) return false
  }
  return true
}

// 检查是否有足够的资源
const hasEnoughResources = (recipe: Recipe) => {
  if (!recipe.inputs) return true
  // 检查体力是否足够
  if (recipe.inputs.energy && gameStore.player.energy < recipe.inputs.energy) {
    return false
  }
  // 检查其他资源是否足够
  for (const [resource, amount] of Object.entries(recipe.inputs)) {
    if (resource !== 'energy' && gameStore.resources[resource] < amount) {
      return false
    }
  }
  return true
}

// 开始活动
const startActivity = (recipeId: string) => {
  const recipe = recipes.find(r => r.id === recipeId)
  if (!recipe) return
  // 双重检查资源是否足够
  if (!hasEnoughResources(recipe)) {
    gameStore.addToEventLog('资源不足，无法开始制作')
    return
  }
  // 检查技能要求
  for (const [skill, level] of Object.entries(recipe.skillRequired)) {
    if (gameStore.newSkills[skill].level < level) {
      gameStore.addToEventLog(`你的${skill}技能等级不足，无法进行${recipe.name}`)
      return
    }
  }
  // 检查并消耗输入资源
  for (const [resource, amount] of Object.entries(recipe.inputs)) {
    if (resource === 'energy') {
      let energyAmount = amount
      if (recipe.category === 'gathering' && gameStore.skillTreeEffects.gatheringEnergyCost < 0) {
        energyAmount = Math.floor(energyAmount * (1 + gameStore.skillTreeEffects.gatheringEnergyCost))
      }
      if (gameStore.skillTreeEffects.energyConsumption < 0) {
        energyAmount = Math.floor(energyAmount * (1 + gameStore.skillTreeEffects.energyConsumption))
      }
      energyAmount = Math.max(1, energyAmount)
      if (gameStore.player.energy < energyAmount) {
        gameStore.addToEventLog('你的体力不足')
        return false
      }
      gameStore.player.energy -= energyAmount
    } else {
      if (!gameStore.consumeResource(resource, amount)) {
        gameStore.addToEventLog(`资源不足: ${gameStore.getResourceName(resource)}`)
        return false
      }
    }
  }
  // 计算活动持续时间
  let activityDuration = recipe.duration
  if (recipe.category === 'gathering' && gameStore.skillTreeEffects.gatheringEfficiency > 0) {
    activityDuration = Math.floor(activityDuration / (1 + gameStore.skillTreeEffects.gatheringEfficiency))
  }
  if (recipe.category === 'crafting' && gameStore.skillTreeEffects.craftingSpeed > 0) {
    activityDuration = Math.floor(activityDuration / (1 + gameStore.skillTreeEffects.craftingSpeed))
  }
  activityDuration = Math.max(1, activityDuration)
  const activity: Activity = {
    startTime: Date.now(),
    id: Date.now(),
    recipeId,
    name: recipe.name,
    duration: activityDuration * 1000,
    completed: false
  }
  const gathering = gameStore.currentActivities.filter(a => a.recipeId.startsWith('gather_')).length
  const crafting = gameStore.currentActivities.filter(a => a.recipeId.startsWith('craft_')).length
  // 如果没有正在进行的活动，立即开始
  if ((gathering + crafting) < gameStore.player.level) {
    activity.startTime = Date.now()
    gameStore.currentActivities.push(activity)
    activityTimer(activity)
    gameStore.addToEventLog(`开始${recipe.name}`)
  } else {
    // 否则加入等待队列
    gameStore.pendingActivities.push(activity)
    gameStore.addToEventLog(`已将${recipe.name}加入等待队列`)
  }
  gameStore.saveGame()
}

// 计算当前效果
const getSkillEffect = (recipe: Recipe) => {
  // 计算活动持续时间
  let activityDuration = recipe.duration
  if (recipe.category === 'gathering' && gameStore.skillTreeEffects.gatheringEfficiency > 0) {
    activityDuration = Math.floor(activityDuration / (1 + gameStore.skillTreeEffects.gatheringEfficiency))
  }
  if (recipe.category === 'crafting' && gameStore.skillTreeEffects.craftingSpeed > 0) {
    activityDuration = Math.floor(activityDuration / (1 + gameStore.skillTreeEffects.craftingSpeed))
  }
  return Math.max(1, activityDuration)
}

const activityTimer = (activity: Activity) => {
  activity.timer = setTimeout(() => {
    completeActivity(activity.id)
    // 检查是否有等待中的活动
    startNextActivity()
  }, activity.duration)
}

// 开始下一个活动
const startNextActivity = () => {
  if (gameStore.pendingActivities.length) {
    const nextActivity = gameStore.pendingActivities.shift()
    if (!nextActivity) return
    nextActivity.startTime = Date.now()
    gameStore.currentActivities.push(nextActivity)
    activityTimer(nextActivity)
    gameStore.saveGame()
    gameStore.addToEventLog(`开始${nextActivity.name}`)
  }
}

// 完成活动
const completeActivity = (activityId: ActivityId) => {
  const activityIndex = gameStore.currentActivities.findIndex(a => a.id === activityId)
  if (activityIndex === -1) return false
  const activity = gameStore.currentActivities[activityIndex]
  const recipe = recipes.find(r => r.id === activity.recipeId)
  if (!recipe) return false
  // 清除定时器
  if (activity.timer) clearTimeout(activity.timer)
  // 移除活动
  gameStore.currentActivities.splice(activityIndex, 1)
  // 应用技能效果到输出资源
  const modifiedOutputs: ResourceAmounts = {}
  // 添加输出资源
  for (const [resource, output] of Object.entries(recipe.outputs)) {
    let amount
    // 处理不同类型的输出格式
    if (Array.isArray(output)) {
      // 如果是[min, max]范围
      const [min, max] = output
      amount = Math.floor(Math.random() * (max - min + 1)) + min
    } else if (typeof output === 'number') {
      // 如果是固定数量
      amount = output
    } else {
      // 其他格式跳过
      continue
    }
    // 应用技能效果
    if (recipe.category === 'gathering') {
      amount = applyGatheringSkillEffects(amount, resource) // 应用采集技能效果
    } else if (recipe.category === 'crafting') {
      modifiedOutputs[resource] = amount // 对于制作活动，先收集所有输出，稍后应用技能效果
    } else if (recipe.category === 'research' && resource === 'techFragment') {
      amount = applyResearchSkillEffects(amount) // 应用研究技能效果
    }
    // 如果不是制作活动，直接添加资源
    if (recipe.category !== 'crafting') {
      gameStore.addResource(resource, amount)
      gameStore.addToEventLog(`获得 ${amount} ${gameStore.getResourceName(resource)}`)
      // 更新成就系统的资源收集计数
      if (gameStore.achievements.resourcesCollected.hasOwnProperty(resource)) {
        gameStore.achievements.resourcesCollected[resource] += amount
      }
    }
  }
  // 对制作活动应用技能效果并添加资源
  if (recipe.category === 'crafting' && Object.keys(modifiedOutputs).length) {
    // 应用制作技能效果
    const finalOutputs = applyCraftingSkillEffects(recipe, modifiedOutputs)
    // 添加最终资源
    for (const [resource, amount] of Object.entries(finalOutputs)) {
      gameStore.addResource(resource, amount)
      gameStore.addToEventLog(`获得 ${amount} ${gameStore.getResourceName(resource)}`)
      // 更新成就系统的资源收集计数
      if (gameStore.achievements.resourcesCollected.hasOwnProperty(resource)) {
        gameStore.achievements.resourcesCollected[resource] += amount
      }
    }
  }
  // 如果是探索活动，增加探索计数
  if (recipe.category === 'exploration') gameStore.achievements.explorationCount += 1
  // 增加相关技能经验
  for (const skill in recipe.skillRequired) gameStore.addSkillExp(skill, 10)
  return true
}

// 应用技能效果到资源收集
const applyGatheringSkillEffects = (baseAmount: number, resourceType: string) => {
  let amount = baseAmount
  // 应用采集效率加成
  if (gameStore.skillTreeEffects.gatheringEfficiency > 0) amount *= (1 + gameStore.skillTreeEffects.gatheringEfficiency)
  // 应用产出加成
  if (gameStore.skillTreeEffects.gatheringYield > 0) amount *= (1 + gameStore.skillTreeEffects.gatheringYield)
  // 对特定资源类型应用额外效果
  if (resourceType === 'herb' && gameStore.skillTreeEffects.rareHerbChance > 0) {
    // 有几率获得稀有草药
    if (Math.random() < gameStore.skillTreeEffects.rareHerbChance) {
      gameStore.addResource('rare_herb', 1)
      gameStore.addToEventLog('你的技能帮助你发现了一株稀有草药！')
    }
  }
  return Math.floor(amount)
}

// 应用技能效果到制作活动
const applyCraftingSkillEffects = (recipe: Recipe, outputs: ResourceAmounts) => {
  let modifiedOutputs = { ...outputs }
  // 应用制作质量加成
  if (gameStore.skillTreeEffects.craftingQuality > 0) {
    // 对于数值型输出，增加产量
    for (const [resource, amount] of Object.entries(modifiedOutputs)) {
      if (typeof amount === 'number') modifiedOutputs[resource] = Math.floor(amount * (1 + gameStore.skillTreeEffects.craftingQuality))
    }
  }
  // 应用额外产出几率
  if (gameStore.skillTreeEffects.extraCraftingOutput > 0 && Math.random() < gameStore.skillTreeEffects.extraCraftingOutput) {
    // 随机选择一种资源增加产量
    const resources = Object.keys(modifiedOutputs)
    if (resources.length) {
      const resource = resources[Math.floor(Math.random() * resources.length)]
      if (typeof modifiedOutputs[resource] === 'number') {
        modifiedOutputs[resource] += 1
        gameStore.addToEventLog(`你的制作技能帮助你获得了额外的 ${gameStore.getResourceName(resource)}！`)
      }
    }
  }
  return modifiedOutputs
}

// 应用技能效果到研究活动
const applyResearchSkillEffects = (techFragment: number) => {
  let amount = techFragment
  // 应用研究加成
  if (gameStore.skillTreeEffects.techFragmentYield > 0) amount = Math.floor(amount * (1 + gameStore.skillTreeEffects.techFragmentYield))
  // 应用突破性发现几率
  if (gameStore.skillTreeEffects.breakthroughChance > 0 && Math.random() < gameStore.skillTreeEffects.breakthroughChance) {
    amount += 1
    gameStore.addToEventLog('你取得了突破性的研究发现！')
  }
  return amount
}

// 计算活动时间文本
const getActivityDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds}秒`
  return `${Math.floor(seconds / 60)}分${seconds % 60}秒`
}

// 获取资源输入文本
const getInputText = (inputs: ResourceAmounts) => {
  if (!inputs) return '无消耗'
  return Object.entries(inputs).map(([resource, amount]) => {
    if (resource === 'energy') return `体力x${amount}`
    return `${gameStore.getResourceName(resource)}x${amount}`
  }).join(', ')
}

// 获取资源输出文本
const getOutputText = (outputs: Recipe["outputs"]) => {
  if (!outputs) return '无产出'
  return Object.entries(outputs).map(([resource, range]) => {
    if (Array.isArray(range)) return `${gameStore.getResourceName(resource)} ${range[0]}~${range[1]}`
    return `${gameStore.getResourceName(resource)}x${range}`
  }).join(', ')
}

// 获取技能要求文本
const getSkillRequirementText = (skillRequired: ResourceAmounts) => {
  if (!skillRequired) return '无要求'
  const skillNames: Record<string, string> = {
    gathering: '采集',
    crafting: '制作',
    combat: '战斗',
    survival: '生存',
    research: '研究'
  }
  return Object.entries(skillRequired).map(([skill, level]) => {
    return `${skillNames[skill] || skill} Lv.${level}`
  }).join(', ')
}

// 获取技能效果加成文本
const getSkillEffectText = (recipe: Recipe) => {
  const effects = []
  const category = recipe.category
  if (category === 'gathering') {
    // 采集效率加成
    if (gameStore.skillTreeEffects.gatheringEfficiency > 0) effects.push(`采集效率 +${Math.round(gameStore.skillTreeEffects.gatheringEfficiency * 100)}%`)
    // 采集产出加成
    if (gameStore.skillTreeEffects.gatheringYield > 0) effects.push(`产出增加 +${Math.round(gameStore.skillTreeEffects.gatheringYield * 100)}%`)
    // 体力消耗减少
    if (gameStore.skillTreeEffects.gatheringEnergyCost < 0) effects.push(`体力消耗 ${Math.round(gameStore.skillTreeEffects.gatheringEnergyCost * 100)}%`)
    // 稀有资源几率
    if (recipe.id.includes('herb') && gameStore.skillTreeEffects.rareHerbChance > 0) effects.push(`稀有草药几率 +${Math.round(gameStore.skillTreeEffects.rareHerbChance * 100)}%`)
  } else if (category === 'crafting') {
    // 制作速度加成
    if (gameStore.skillTreeEffects.craftingSpeed > 0) effects.push(`制作速度 +${Math.round(gameStore.skillTreeEffects.craftingSpeed * 100)}%`)
    // 资源节约几率
    if (gameStore.skillTreeEffects.resourceSaving > 0) effects.push(`资源节约几率 +${Math.round(gameStore.skillTreeEffects.resourceSaving * 100)}%`)
    // 额外产出几率
    if (gameStore.skillTreeEffects.extraCraftingOutput > 0) effects.push(`额外产出几率 +${Math.round(gameStore.skillTreeEffects.extraCraftingOutput * 100)}%`)
    // 工具耐久度
    if (recipe.id.includes('tool') && gameStore.skillTreeEffects.toolDurability > 0) effects.push(`工具耐久度 +${Math.round(gameStore.skillTreeEffects.toolDurability * 100)}%`)
  } else if (category === 'research') {
    // 研究速度加成
    if (gameStore.skillTreeEffects.researchSpeed > 0) effects.push(`研究速度 +${Math.round(gameStore.skillTreeEffects.researchSpeed * 100)}%`)
    // 科技碎片产出
    if (gameStore.skillTreeEffects.techFragmentYield > 0) effects.push(`科技碎片产出 +${Math.round(gameStore.skillTreeEffects.techFragmentYield * 100)}%`)
    // 突破性发现几率
    if (gameStore.skillTreeEffects.breakthroughChance > 0) effects.push(`突破性发现几率 +${Math.round(gameStore.skillTreeEffects.breakthroughChance * 100)}%`)
  }
  // 通用体力消耗减少
  if (gameStore.skillTreeEffects.energyConsumption < 0 && !effects.some(e => e.includes('体力消耗'))) effects.push(`体力消耗 ${Math.round(gameStore.skillTreeEffects.energyConsumption * 100)}%`)
  return effects.length ? effects.join('，') : '无加成效果'
}

// 活动进度和时间的响应式数据
const activityProgress = ref<Record<ActivityId, number>>({})
const activityRemainingTime = ref<Record<ActivityId, string>>({})

// 更新所有进行中活动的进度和时间
const updateActivitiesStatus = () => {
  gameStore.currentActivities.forEach(activity => {
    const now = Date.now()
    const elapsed = now - activity.startTime
    const progress = Math.min(100, (elapsed / activity.duration) * 100)
    if (progress >= 100) {
      completeActivity(activity.id)
      startNextActivity()
      return
    }
    activityProgress.value[activity.id] = progress
    const remaining = Math.max(0, activity.duration - elapsed)
    const seconds = Math.floor(remaining / 1000)
    activityRemainingTime.value[activity.id] = seconds < 60 ? `${seconds}秒` : `${Math.floor(seconds / 60)}分${seconds % 60}秒`
  })
}

// 计算进行中的活动完成百分比
const getActivityProgress = (activity: Activity) => {
  if (activityProgress.value[activity.id] !== undefined) return activityProgress.value[activity.id]
  // 初始计算
  const now = Date.now()
  const elapsed = now - activity.startTime
  const progress = Math.min(100, (elapsed / activity.duration) * 100)
  return progress
}

// 计算活动剩余时间
const getActivityRemainingTime = (activity: Activity) => {
  if (activityRemainingTime.value[activity.id] !== undefined) return activityRemainingTime.value[activity.id]
  // 初始计算
  const now = Date.now()
  const elapsed = now - activity.startTime
  const remaining = Math.max(0, activity.duration - elapsed)
  const seconds = Math.floor(remaining / 1000)
  if (seconds < 60) return `${seconds}秒`
  return `${Math.floor(seconds / 60)}分${seconds % 60}秒`
}

// 启动活动状态更新定时器
const startActivityTimer = () => {
  if (activityTimerId.value) return
  // 每秒更新一次活动状态
  activityTimerId.value = setInterval(() => {
    if (gameStore.gameState === 'playing' && gameStore.currentActivities.length) updateActivitiesStatus()
  }, 1000)
}

// 取消活动
const cancelActivity = (activityId: ActivityId) => {
  // 先检查当前活动
  const currentIndex = gameStore.currentActivities.findIndex(a => a.id === activityId)
  if (currentIndex !== -1) {
    const activity = gameStore.currentActivities[currentIndex]
    const recipe = recipes.find(r => r.id === activity.recipeId)
    // 返还资源
    if (recipe) {
      // 返还体力
      if (recipe.inputs.energy) {
        let energyAmount = recipe.inputs.energy
        if (recipe.category === 'gathering' && gameStore.skillTreeEffects.gatheringEnergyCost < 0)
          energyAmount = Math.floor(energyAmount * (1 + gameStore.skillTreeEffects.gatheringEnergyCost))
        if (gameStore.skillTreeEffects.energyConsumption < 0)
          energyAmount = Math.floor(energyAmount * (1 + gameStore.skillTreeEffects.energyConsumption))
        energyAmount = Math.max(1, energyAmount)
        gameStore.player.energy = Math.min(gameStore.player.maxEnergy, gameStore.player.energy + energyAmount)
      }
      // 返还其他资源
      for (const [resource, amount] of Object.entries(recipe.inputs)) {
        if (resource !== 'energy') {
          gameStore.addResource(resource, amount)
        }
      }
    }
    // 移除活动
    if (activity.timer) clearTimeout(activity.timer)
    gameStore.currentActivities.splice(currentIndex, 1)
    gameStore.addToEventLog(`取消了${activity.name}活动并返还了资源`)
    gameStore.saveGame()
    // 检查并启动等待队列中的下一个活动
    startNextActivity()
  }
  // 检查等待队列
  const pendingIndex = gameStore.pendingActivities.findIndex(a => a.id === activityId)
  if (pendingIndex !== -1) {
    const activity = gameStore.pendingActivities[pendingIndex]
    const recipe = recipes.find(r => r.id === activity.recipeId)
    // 返还资源
    if (recipe) {
      // 返还体力
      if (recipe.inputs.energy) {
        let energyAmount = recipe.inputs.energy
        if (recipe.category === 'gathering' && gameStore.skillTreeEffects.gatheringEnergyCost < 0)
          energyAmount = Math.floor(energyAmount * (1 + gameStore.skillTreeEffects.gatheringEnergyCost))
        if (gameStore.skillTreeEffects.energyConsumption < 0)
          energyAmount = Math.floor(energyAmount * (1 + gameStore.skillTreeEffects.energyConsumption))
        energyAmount = Math.max(1, energyAmount)
        gameStore.player.energy = Math.min(gameStore.player.maxEnergy, gameStore.player.energy + energyAmount)
      }
      // 返还其他资源
      for (const [resource, amount] of Object.entries(recipe.inputs)) {
        if (resource !== 'energy') {
          gameStore.addResource(resource, amount)
        }
      }
    }
    gameStore.pendingActivities.splice(pendingIndex, 1)
    gameStore.addToEventLog(`取消了等待中的${activity.name}活动并返还了资源`)
    gameStore.saveGame()
  }
}

// 组件挂载时启动定时器
onMounted(() => startActivityTimer())

// 组件卸载时清除定时器
onUnmounted(() => {
  if (activityTimerId.value) {
    clearInterval(activityTimerId.value)
    activityTimerId.value = null
  }
})

const currentActivities = computed(() =>
  gameStore.currentActivities.filter(a => {
    const recipe = recipes.find(r => r.id === a.recipeId)
    return recipe && ['gathering', 'crafting'].includes(recipe.category)
  })
)

const pendingActivities = computed(() =>
  gameStore.pendingActivities.filter(a => {
    const recipe = recipes.find(r => r.id === a.recipeId)
    return recipe && ['gathering', 'crafting'].includes(recipe.category)
  })
)
</script>
<template>
  <el-scrollbar class="activity-panel">
    <div class="current-activities" v-if="currentActivities.length || pendingActivities.length">
      <h4>活动队列</h4>
      <el-scrollbar max-height="260" always>
        <div class="activity-list">
          <div v-for="activity in currentActivities" :key="activity.id" class="activity-card in-progress">
            <div class="activity-header">
              <div class="activity-name">{{ activity.name }}</div>
              <div class="activity-time">剩余: {{ getActivityRemainingTime(activity) }}</div>
            </div>
            <el-progress :percentage="getActivityProgress(activity)" :stroke-width="10" :show-text="false" />
            <div class="activity-actions">
              <el-button style="width: 100%;margin-top: 5px;" type="danger" size="small"
                @click="cancelActivity(activity.id)" :disabled="gameStore.gameState !== 'playing'">
                取消
              </el-button>
            </div>
          </div>
          <div v-for="activity in pendingActivities" :key="activity.id" class="activity-card pending">
            <div class="activity-header">
              <div class="activity-name">{{ activity.name }}</div>
              <div class="activity-time">等待中</div>
            </div>
            <el-progress :percentage="0" :stroke-width="10" :show-text="false" status="warning" />
            <div class="activity-actions">
              <el-button style="width: 100%;margin-top: 5px;" type="danger" size="small"
                @click="cancelActivity(activity.id)" :disabled="gameStore.gameState !== 'playing'">
                取消
              </el-button>
            </div>
          </div>
        </div>
      </el-scrollbar>
    </div>
    <div class="available-activities">
      <h4>可用活动</h4>
      <el-tabs v-model="activityTabs">
        <el-tab-pane label="采集" name="gathering">
          <div class="activity-list">
            <div v-for="recipe in gatheringActivities" :key="recipe.id" class="activity-card">
              <div class="activity-header">
                <div class="activity-name">{{ recipe.name }}</div>
                <div class="activity-time">{{ getActivityDuration(getSkillEffect(recipe)) }}</div>
              </div>
              <div class="activity-details">
                <div class="activity-resources">
                  <div class="activity-inputs">消耗: {{ getInputText(recipe.inputs) }}</div>
                  <div class="activity-outputs">产出: {{ getOutputText(recipe.outputs) }}</div>
                </div>
                <div class="activity-requirements">
                  需求: {{ getSkillRequirementText(recipe.skillRequired) }}
                </div>
                <div class="activity-requirements" v-if="getSkillEffectText(recipe) !== '无加成效果'">
                  加成: {{ getSkillEffectText(recipe) }}
                </div>
              </div>
              <div class="activity-actions">
                <el-button type="primary" size="small" @click="startActivity(recipe.id)"
                  :disabled="!hasEnoughResources(recipe) || gameStore.gameState !== 'playing'">
                  {{ hasEnoughResources(recipe) ? '开始' : '资源不足' }}
                </el-button>
              </div>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="制作" name="crafting">
          <div class="activity-list">
            <div v-for="recipe in craftingActivities" :key="recipe.id" class="activity-card">
              <div class="activity-header">
                <div class="activity-name">{{ recipe.name }}</div>
                <div class="activity-time">{{ getActivityDuration(getSkillEffect(recipe)) }}</div>
              </div>
              <div class="activity-details">
                <div class="activity-resources">
                  <div class="activity-inputs">消耗: {{ getInputText(recipe.inputs) }}</div>
                  <div class="activity-outputs">产出: {{ getOutputText(recipe.outputs) }}</div>
                </div>
                <div class="activity-requirements">
                  需求: {{ getSkillRequirementText(recipe.skillRequired) }}
                </div>
                <div class="activity-requirements" v-if="getSkillEffectText(recipe) !== '无加成效果'">
                  加成: {{ getSkillEffectText(recipe) }}
                </div>
              </div>
              <div class="activity-actions">
                <el-button type="primary" size="small" @click="startActivity(recipe.id)"
                  :disabled="!hasEnoughResources(recipe) || gameStore.gameState !== 'playing'">
                  {{ hasEnoughResources(recipe) ? '开始' : '资源不足' }}
                </el-button>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </el-scrollbar>
</template>

<style scoped>
/* 添加等待中活动的样式 */
.activity-card.pending {
  border-left: 4px solid #E6A23C;
  opacity: 0.8;
}

.activity-panel {
  background-color: var(--el-bg-color-overlay);
  border-radius: 4px;
  padding: 15px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.activity-panel h3 {
  margin-top: 0;
  margin-bottom: 15px;
}

.current-activities {
  margin-bottom: 20px;
}

.activity-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 15px;
  margin: 10px;
}

.activity-card {
  background-color: var(--el-bg-color);
  border-radius: 4px;
  padding: 12px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  transition: transform 0.3s;
}

.activity-card:hover {
  transform: translateY(-3px);
}

.activity-card.in-progress {
  border-left: 4px solid #409EFF;
}

.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.activity-name {
  font-weight: bold;
}

.activity-time {
  font-size: 0.8em;
  color: var(--el-text-color-secondary);
}

.activity-details {
  margin-bottom: 10px;
  font-size: 0.9em;
}

.activity-resources {
  margin-bottom: 5px;
}

.activity-inputs,
.activity-outputs,
.activity-requirements {
  color: var(--el-text-color-secondary);
  margin-bottom: 3px;
}

.activity-actions {
  display: flex;
  justify-content: flex-end;
}

.available-activities {
  flex: 1;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .activity-list {
    grid-template-columns: 1fr;
  }
}
</style>
