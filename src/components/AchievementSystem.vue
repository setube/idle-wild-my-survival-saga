<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { technologies } from '../plugins/recipes'
import { achievements } from '../plugins/achievements'

const gameStore = useGameStore()

// 本地成就状态
const localAchievements = ref(achievements.map(achievement => ({ ...achievement })))

// 已解锁的成就
const unlockedAchievements = computed(() => {
  return localAchievements.value.filter(a => gameStore.achievements.unlocked.includes(a.id))
})

// 未解锁的成就
const lockedAchievements = computed(() => {
  return localAchievements.value.filter(a => !gameStore.achievements.unlocked.includes(a.id))
})

// 成就完成百分比
const achievementProgress = computed(() => {
  return Math.min(100, (unlockedAchievements.value.length / localAchievements.value.length) * 100)
})

// 检查成就是否达成
const checkAchievements = () => {
  localAchievements.value.forEach(achievement => {
    if (!achievement.unlocked && achievement.condition(gameStore)) unlockAchievement(achievement)
  })
}

// 解锁成就
const unlockAchievement = (achievement: (typeof achievements)[number]) => {
  if (gameStore.achievements.unlocked.includes(achievement.id)) return
  // 标记为已解锁
  achievement.unlocked = true
  // 添加到游戏存档中
  gameStore.achievements.unlocked.push(achievement.id)
  // 发放奖励
  if (!achievement.reward) return
  if (!achievement.reward.exp) return
  // 增加经验值
  gameStore.player.exp += achievement.reward.exp
  // 记录到事件日志
  gameStore.addToEventLog(`成就解锁: ${achievement.name}`)
}

// 监听游戏状态变化，检查成就
watch(
  () => [gameStore.player.days, gameStore.resources, gameStore.newSkills, gameStore.buildings, technologies],
  () => checkAchievements(),
  { deep: true }
)

// 初始化成就系统
const initAchievements = () => {
  // 从游戏存档中恢复已解锁的成就
  gameStore.achievements.unlocked.forEach(achievementId => {
    const achievement = localAchievements.value.find(a => a.id === achievementId)
    if (achievement) achievement.unlocked = true
  })
  // 初始检查一次成就
  checkAchievements()
}

// 组件挂载时初始化
initAchievements()
</script>

<template>
  <div class="achievement-system">
    <div class="achievement-header">
      <h3>成就系统</h3>
      <el-progress :percentage="achievementProgress"
        :format="() => `${unlockedAchievements.length}/${localAchievements.length}`" :stroke-width="10" />
    </div>
    <el-tabs type="border-card">
      <el-tab-pane label="已解锁">
        <div class="achievement-list" v-if="unlockedAchievements.length">
          <div v-for="achievement in unlockedAchievements" :key="achievement.id" class="achievement-item unlocked">
            <div class="achievement-icon">{{ achievement.icon }}</div>
            <div class="achievement-content">
              <div class="achievement-name">{{ achievement.name }}</div>
              <div class="achievement-description">{{ achievement.description }}</div>
              <div class="achievement-reward" v-if="achievement.reward">
                奖励: <span v-if="achievement.reward.exp">+{{ achievement.reward.exp }} 幸存者经验</span>
              </div>
            </div>
          </div>
        </div>
        <div class="empty-message" v-else>还没有解锁任何成就</div>
      </el-tab-pane>
      <el-tab-pane label="未解锁">
        <div class="achievement-list" v-if="lockedAchievements.length">
          <div v-for="achievement in lockedAchievements" :key="achievement.id" class="achievement-item locked">
            <div class="achievement-icon">?</div>
            <div class="achievement-content">
              <div class="achievement-name">{{ achievement.name }}</div>
              <div class="achievement-description">{{ achievement.description }}</div>
              <div class="achievement-reward" v-if="achievement.reward">
                奖励: <span v-if="achievement.reward.exp">+{{ achievement.reward.exp }} 经验</span>
              </div>
            </div>
          </div>
        </div>
        <div class="empty-message" v-else>你已解锁所有成就！</div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.achievement-system {
  margin-top: 15px;
  background-color: var(--el-bg-color-overlay);
  border-radius: 4px;
  padding: 15px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.achievement-header {
  margin-bottom: 15px;
}

.achievement-header h3 {
  margin-top: 0;
  margin-bottom: 10px;
}

.achievement-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.achievement-item {
  display: flex;
  padding: 10px;
  border-radius: 4px;
  transition: all 0.3s;
}

.achievement-item.unlocked {
  background-color: rgba(103, 194, 58, 0.1);
  border-left: 4px solid var(--el-color-success);
}

.achievement-item.locked {
  background-color: var(--el-fill-color-light);
  border-left: 4px solid var(--el-color-info);
  opacity: 0.8;
}

.achievement-icon {
  font-size: 1.8rem;
  margin-right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background-color: var(--el-fill-color);
  border-radius: 50%;
}

.achievement-content {
  flex: 1;
}

.achievement-name {
  font-weight: bold;
  margin-bottom: 5px;
}

.achievement-description {
  font-size: 0.9rem;
  color: var(--el-text-color-secondary);
  margin-bottom: 5px;
}

.achievement-reward {
  font-size: 0.85rem;
  color: var(--el-color-warning);
}

.empty-message {
  text-align: center;
  padding: 20px;
  color: var(--el-text-color-secondary);
  font-style: italic;
}
</style>