<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { eventLibrary, eventTypes } from '../plugins/eventLibrary'
import { ElMessageBox } from 'element-plus'
import type { GameEvent, EventOption } from '../types/game'

const gameStore = useGameStore()

// 当前活跃事件
const activeEvent = ref<GameEvent | null>(null)
// 控制事件面板显示
const showEventPanel = ref(false)

// 计算当前可能触发的事件
const getPossibleEvents = () => {
  return eventLibrary.filter(event => {
    // 检查条件
    if (!event.condition(gameStore)) return false
    // 检查最低天数要求
    if (event.minDay && gameStore.player.days < event.minDay) return false
    return true
  })
}

// 随机选择一个事件
const selectRandomEvent = () => {
  const possibleEvents = getPossibleEvents()
  if (possibleEvents.length === 0) return null
  // 根据权重选择事件
  const totalWeight = possibleEvents.reduce((sum, event) => sum + (event.weight || 1), 0)
  let random = Math.random() * totalWeight
  for (const event of possibleEvents) {
    random -= (event.weight || 1)
    if (random <= 0) return event
  }
  return possibleEvents[0] // 防止浮点数精度问题
}

// 触发随机事件
const triggerRandomEvent = () => {
  // 如果游戏暂停，不触发事件
  if (gameStore.gameState == 'paused') return
  // 如果已经有活跃事件，不触发新事件
  if (activeEvent.value) return
  // 如果今天已经触发过事件，不触发新事件
  if (gameStore.eventTriggered) return
  // 随机决定是否触发事件
  const eventChance = 0.3 // 30%的概率触发事件
  if (Math.random() > eventChance) return
  const event = selectRandomEvent()
  if (!event) return
  // 设置当前事件
  activeEvent.value = event
  // 自动打开事件面板
  showEventPanel.value = true
}

// 选择事件选项
const selectOption = async (option: EventOption) => {
  if (!activeEvent.value) return
  // 检查选项条件
  if (option.condition && !option.condition(gameStore)) {
    ElMessageBox.alert('你不满足选择这个选项的条件', '无法选择', {
      confirmButtonText: '确定',
      type: 'warning'
    })
    return
  }
  // 执行选项效果
  const result = option.effect(gameStore)
  // 确保玩家属性不会低于0
  gameStore.player.health = Math.max(0, gameStore.player.health)
  gameStore.player.energy = Math.max(0, gameStore.player.energy)
  // 关闭事件面板
  showEventPanel.value = false
  // 显示结果
  await ElMessageBox.alert(result, '事件结果', {
    lockScroll: false,
    confirmButtonText: '确定',
    type: 'info'
  })
  // 清除当前事件
  activeEvent.value = null
  // 标记事件已触发
  gameStore.eventTriggered = true
  // 保存游戏
  gameStore.saveGame()
}

// 监听游戏日期变化，触发随机事件
watch(() => gameStore.gameTime.day, (newDay, oldDay) => {
  if (newDay > oldDay) triggerRandomEvent()
})

onMounted(() => {
  // 保存原始方法
  const originalTriggerRandomEvent = gameStore.triggerRandomEvent
  // 重写方法
  gameStore.triggerRandomEvent = () => {
    // 调用原始方法
    originalTriggerRandomEvent.call(gameStore)
    // 调用组件的事件触发逻辑
    triggerRandomEvent()
  }
})
</script>

<template>
  <div class="random-event-system">
    <div v-if="activeEvent" class="event-indicator" @click="showEventPanel = true">
      <span class="event-icon">{{ eventTypes[activeEvent.type].icon }}</span>
      <span class="event-title">{{ activeEvent.title }}</span>
    </div>
    <el-dialog v-model="showEventPanel"
      :title="activeEvent ? `${eventTypes[activeEvent.type].icon} ${activeEvent.title}` : '事件'" width="412px"
      :close-on-click-modal="false" :show-close="false" class="event-dialog">
      <div v-if="activeEvent" class="event-panel" :class="`event-type-${activeEvent.type}`">
        <div class="event-header">
          <span class="event-type-label">{{ eventTypes[activeEvent.type].title }}</span>
        </div>
        <div class="event-content">
          <p class="event-description">{{ activeEvent.description }}</p>
          <div class="event-options">
            <el-button class="button" v-for="(option, index) in activeEvent.options" :key="index"
              :disabled="option.condition && !option.condition(gameStore)"
              :type="option.condition && !option.condition(gameStore) ? 'info' : 'primary'"
              @click="selectOption(option)">
              {{ option.text }}
              <span v-if="option.condition && !option.condition(gameStore)" class="option-locked">(条件不满足)</span>
            </el-button>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.random-event-system {
  position: relative;
  width: 100%;
  height: auto;
}

/* 事件指示器样式 */
.event-indicator {
  display: flex;
  align-items: center;
  background-color: var(--el-bg-color-overlay);
  border-radius: 8px;
  padding: 10px 15px;
  margin-bottom: 15px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  border-left: 4px solid #909399;
  animation: pulse 2s infinite;
}

.event-indicator:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(142, 68, 173, 0.4);
  }

  70% {
    box-shadow: 0 0 0 10px rgba(142, 68, 173, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(142, 68, 173, 0);
  }
}

.event-panel {
  background-color: var(--el-bg-color);
  border-radius: 8px;
  padding: 15px;
  border-left: 4px solid #909399;
  /* 默认边框颜色 */
}

.event-type-positive {
  border-left-color: #67C23A;
}

.event-type-neutral {
  border-left-color: #909399;
}

.event-type-negative {
  border-left-color: #E6A23C;
}

.event-type-disaster {
  border-left-color: #F56C6C;
}

.event-type-special {
  border-left-color: #8E44AD;
}

.event-header {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.event-icon {
  font-size: 24px;
  margin-right: 10px;
}

.event-title {
  margin: 0;
  flex-grow: 1;
  font-size: 16px;
  font-weight: bold;
}

.event-type-label {
  font-size: 14px;
  padding: 2px 8px;
  border-radius: 4px;
  background-color: var(--el-bg-color-page);
}

.event-content {
  margin-bottom: 15px;
}

.event-description {
  margin-bottom: 15px;
  line-height: 1.5;
}

.event-options {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}

.event-options .button {
  margin-bottom: 10px;
}

.option-locked {
  margin-left: 5px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

/* 对话框自定义样式 */
:deep(.event-dialog) {
  border-radius: 8px;
  overflow: hidden;
}

:deep(.event-dialog .el-dialog__header) {
  padding: 15px 20px;
  margin-right: 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

:deep(.event-dialog .el-dialog__body) {
  padding: 20px;
}

:deep(.event-dialog .el-dialog__footer) {
  padding: 10px 20px 15px;
  border-top: 1px solid var(--el-border-color-lighter);
}
</style>
