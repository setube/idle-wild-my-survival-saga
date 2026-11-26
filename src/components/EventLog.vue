<script setup lang="ts">
import { useGameStore } from '../stores/gameStore'

const gameStore = useGameStore()
</script>

<template>
  <h3>事件日志</h3>
  <div class="log-entries">
    <el-scrollbar max-height="500" class="event-log">
      <div v-for="(entry, index) in gameStore.eventLog" :key="index" class="log-entry">
        <div class="log-timestamp">第{{ entry.timestamp }}</div>
        <div class="log-message">{{ entry.message }}</div>
      </div>
    </el-scrollbar>
  </div>
</template>

<style scoped>
.event-log {
  background-color: var(--el-bg-color-overlay);
  border-radius: 4px;
  padding: 15px;
  height: auto;
  display: flex;
  flex-direction: column;
}

.event-log h3 {
  margin-top: 0;
  margin-bottom: 15px;
}

.log-entries {
  flex: 1;
  overflow-y: auto;
  font-size: 0.9em;
}

.empty-log {
  color: var(--el-text-color-secondary);
  font-style: italic;
  text-align: center;
  margin-top: 20px;
}

.log-entry {
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.log-entry:last-child {
  border-bottom: none;
}

.log-timestamp {
  font-size: 0.8em;
  color: var(--el-text-color-secondary);
  margin-bottom: 3px;
}

.log-message {
  line-height: 1.4;
}
</style>