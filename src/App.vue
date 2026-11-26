<script setup lang="ts">
import GameInterface from './components/GameInterface.vue'

const gameName = __APP_TITLE__
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <div class="app-logo">
        <h1>{{ gameName }}</h1>
      </div>
    </header>
    <main class="app-main">
      <GameInterface />
    </main>
    <footer class="app-footer">
      <p>{{ gameName }} &copy; 2025</p>
    </footer>
  </div>
</template>

<style>
:root {
  --app-bg-color: #f5f7fa;
  --app-text-color: #303133;
}

a {
  text-decoration: inherit;
}

html.dark {
  --app-bg-color: #1e1e1e;
  --app-text-color: #e5eaf3;
}

body {
  margin: 0;
  padding: 0;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
  background-color: var(--app-bg-color);
  color: var(--app-text-color);
  transition: background-color 0.3s, color 0.3s;
}

::-webkit-scrollbar {
  width: 6px;
  background: transparent;
}

::-webkit-scrollbar:horizontal {
  height: 6px
}

::-webkit-scrollbar-track {
  border-radius: 10px
}

::-webkit-scrollbar-thumb {
  background-color: #0003;
  border-radius: 10px;
  transition: all .2s ease-in-out
}

::-webkit-scrollbar-thumb:hover {
  cursor: pointer;
  background-color: #0000004d;
}
</style>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
}

.app-header {
  position: fixed;
  width: 100%;
  z-index: 3;
  background-color: var(--el-color-primary);
  box-shadow: 0px 5px 40px 0px rgba(17, 58, 93, .1);
}

.app-logo {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  color: var(--el-color-white)
}

.app-header h1 {
  margin: 0;
  font-size: 1.5rem;
}

.app-main {
  flex: 1;
  padding: 0;
  margin-top: 53px;
}

.app-footer {
  text-align: center;
  padding: 10px;
  font-size: 0.8rem;
  background-color: var(--el-bg-color);
  color: var(--el-text-color-secondary);
}
</style>