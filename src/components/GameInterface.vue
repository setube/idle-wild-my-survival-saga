<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/gameStore'
import ResourcePanel from './ResourcePanel.vue'
import BuildingPanel from './BuildingPanel.vue'
import EventLog from './EventLog.vue'
import PlayerStatus from './PlayerStatus.vue'
import ResearchPanel from './ResearchPanel.vue'
import ActivityPanel from './ActivityPanel.vue'
import ExplorationPanel from './ExplorationPanel.vue'
import TimeControl from './TimeControl.vue'
import WeatherSystem from './WeatherSystem.vue'
import AchievementSystem from './AchievementSystem.vue'
import RandomEventSystem from './RandomEventSystem.vue'
import TradingSystem from './TradingSystem.vue'
import QuestSystem from './QuestSystem.vue'
import SkillTreeSystem from './SkillTreeSystem.vue'
import { ElMessage, ElDialog } from 'element-plus'
import { saveAs } from 'file-saver'

const gameStore = useGameStore()
const gameTimerId = ref(null)
const gameState = computed(() => gameStore.gameState)
const centerPanelTab = ref('activity')

// 存档列表相关
const showSaveDialog = ref(false)
const saveList = ref([])
const currentSaveId = ref('')

const startGameTimer = () => {
  if (gameTimerId.value) return
  gameTimerId.value = setInterval(() => {
    if (gameState.value === 'playing') gameStore.advanceTime(gameStore.gameTime.timeScale)
  }, 1000)
}

const initGame = async () => {
  const saves = await gameStore.getSaveList()
  if (saves.length === 0) {
    // 如果没有存档，创建新存档并更新列表
    gameStore.initGame()
    const newSaveId = await gameStore.saveGame()
    currentSaveId.value = newSaveId
    ElMessage.success(`新游戏已开始并保存为 ${newSaveId}`)
    await refreshSaveList() // 确保存档列表刷新
    startGameTimer()
  } else {
    // 如果有存档，显示存档管理对话框
    await refreshSaveList() // 刷新存档列表
    showSaveDialog.value = true
  }
}

const createNewSave = async () => {
  gameStore.initGame()
  const newSaveId = await gameStore.saveGame()
  currentSaveId.value = newSaveId
  ElMessage.success(`新存档 ${newSaveId} 已创建`)
  await refreshSaveList()
  startGameTimer()
  showSaveDialog.value = false
}

const loadSave = async (saveId) => {
  if (await gameStore.loadGame(saveId)) {
    currentSaveId.value = saveId
    ElMessage.success(`存档 ${saveId} 已加载`)
    showSaveDialog.value = false
    startGameTimer()
  }
}

const deleteSave = async (saveId) => {
  if (await gameStore.deleteSave(saveId)) {
    ElMessage.success(`存档 ${saveId} 已删除`)
    if (currentSaveId.value === saveId) currentSaveId.value = ''
    await refreshSaveList()
    // 如果删除了所有存档，自动创建新存档
    if (saveList.value.length === 0) {
      await createNewSave()
    }
  }
}

const exportSave = async (saveId) => {
  const saveData = await gameStore.exportSave(saveId)
  if (saveData) {
    saveAs(
        new Blob([saveData], { type: 'application/json' }),
        `${__APP_TITLE__}-存档-${saveId}.json`
    )
  }
}

const exportCurrentSave = async () => {
  if (!currentSaveId.value) {
    ElMessage.error('当前没有存档可导出')
    return
  }
  const saveData = await gameStore.exportSave(currentSaveId.value)
  if (saveData) {
    saveAs(
        new Blob([saveData], { type: 'application/json' }),
        `${__APP_TITLE__}-当前存档-${currentSaveId.value}.json`
    )
  }
}

const importSave = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async (e) => {
    const newSaveId = await gameStore.importSave(undefined, e.target.result)
    if (newSaveId) {
      ElMessage.success(`存档 ${newSaveId} 已导入`)
      await refreshSaveList()
    }
  }
  reader.readAsText(file)
}

const saveCurrentGame = async () => {
  if (!currentSaveId.value) {
    currentSaveId.value = await gameStore.saveGame()
  } else {
    await gameStore.saveGame(currentSaveId.value)
  }
  ElMessage.success(`当前存档 ${currentSaveId.value} 已保存`)
}

const refreshSaveList = async () => {
  saveList.value = await gameStore.getSaveList()
}

const togglePause = () => {
  if (gameStore.gameState === 'playing') {
    gameStore.gameState = 'paused'
    ElMessage.info('游戏已暂停')
  } else if (gameStore.gameState === 'paused') {
    gameStore.gameState = 'playing'
    ElMessage.info('游戏已继续')
  }
}

const toggleDarkMode = () => {
  gameStore.settings.darkMode = !gameStore.settings.darkMode
  document.documentElement.classList.toggle('dark', gameStore.settings.darkMode)
}

onMounted(async () => {
  await initGame() // 在挂载时直接调用 initGame，包含刷新逻辑
  toggleDarkMode()
})

onUnmounted(() => {
  if (gameTimerId.value) clearInterval(gameTimerId.value)
})
</script>

<template>
  <div class="game-container">
    <div class="game-header">
      <div class="game-controls">
        <el-button @click="toggleDarkMode" size="small">
          <el-icon v-if="gameStore.settings.darkMode"><Sunny /></el-icon>
          <el-icon v-else><Moon /></el-icon>
          {{ !gameStore.settings.darkMode ? '夜间模式' : '白天模式' }}
        </el-button>
        <el-button @click="saveCurrentGame" :disabled="gameState !== 'playing'" size="small">
          <el-icon><MessageBox /></el-icon> 保存当前存档
        </el-button>
        <el-button @click="showSaveDialog = true" size="small">
          <el-icon><Folder /></el-icon> 存档管理
        </el-button>
        <el-button @click="togglePause" size="small">
          <el-icon v-if="gameState === 'playing'"><VideoPause /></el-icon>
          <el-icon v-else><VideoPlay /></el-icon>
          {{ gameState === 'playing' ? '暂停游戏' : '继续游戏' }}
        </el-button>
        <el-button @click="exportCurrentSave" size="small">
          <el-icon><Download /></el-icon> 导出当前存档
        </el-button>
        <el-upload action="#" :http-request="importSave" :show-file-list="false" accept="application/json" class="inline-upload">
          <el-button size="small">
            <el-icon><Upload /></el-icon> 导入存档
          </el-button>
        </el-upload>
      </div>
    </div>
    <div class="game-main">
      <div class="game-panel left-panel">
        <PlayerStatus />
        <ResourcePanel />
      </div>
      <div class="game-panel center-panel">
        <el-tabs v-model="centerPanelTab" class="full-height-tabs">
          <el-tab-pane label="活动" name="activity"><ActivityPanel /></el-tab-pane>
          <el-tab-pane label="建筑" name="building"><BuildingPanel /></el-tab-pane>
          <el-tab-pane label="研究" name="research"><ResearchPanel /></el-tab-pane>
          <el-tab-pane label="探索" name="exploration"><ExplorationPanel /></el-tab-pane>
          <el-tab-pane label="交易" name="trading"><TradingSystem /></el-tab-pane>
          <el-tab-pane label="任务" name="quests"><QuestSystem /></el-tab-pane>
          <el-tab-pane label="技能树" name="skilltree"><SkillTreeSystem /></el-tab-pane>
          <el-tab-pane label="成就" name="achievements"><AchievementSystem /></el-tab-pane>
        </el-tabs>
      </div>
      <div class="game-panel right-panel">
        <TimeControl />
        <WeatherSystem />
        <RandomEventSystem />
        <EventLog />
      </div>
    </div>

    <!-- 存档管理对话框 -->
    <el-dialog v-model="showSaveDialog" title="存档管理" width="40%">
      <el-button @click="createNewSave" type="primary">创建新存档</el-button>
      <el-table :data="saveList.map(id => ({ id }))" style="margin-top: 10px">
        <el-table-column prop="id" label="存档名称" />
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="loadSave(row.id)">载入</el-button>
            <el-button size="small" @click="exportSave(row.id)">导出</el-button>
            <el-button size="small" type="danger" @click="deleteSave(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog :model-value="gameStore.gameState === 'gameover'" @update:model-value="gameStore.gameState = $event ? 'gameover' : 'playing'" title="游戏结束" width="30%" :close-on-click-modal="false" :show-close="false">
      <span>你没能在这个严酷的世界生存下来...</span>
      <span>生存天数: {{ gameStore.player.days }}</span>
      <template #footer>
        <el-button @click="gameStore.initGame(); startGameTimer()">重新开始</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.game-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 10px;
  box-sizing: border-box;
  background-color: var(--el-bg-color);
  color: var(--el-text-color-primary);
}

.game-header {
  display: grid;
  justify-content: end;
  align-items: center;
  padding: 10px;
  margin-bottom: 10px;
}

.game-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.game-main {
  display: flex;
  flex: 1;
  gap: 10px;
  overflow: hidden;
}

.game-panel {
  background-color: var(--el-bg-color-overlay);
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 15px;
  overflow-y: auto;
}

.left-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.center-panel {
  flex: 2;
}

.right-panel {
  flex: 1;
}

@media (max-width: 768px) {
  .game-main {
    flex-direction: column;
  }
}

.full-height-tabs {
  height: auto;
}

.full-height-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow: hidden;
}

.full-height-tabs :deep(.el-tab-pane) {
  height: 100%;
  overflow-y: auto;
}

.inline-upload {
  display: inline-block;
}
</style>