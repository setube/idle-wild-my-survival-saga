export {}

declare module 'vue' {
  interface GlobalComponents {
    AchievementSystem: typeof import('./components/AchievementSystem.vue')['default']
    ActivityPanel: typeof import('./components/ActivityPanel.vue')['default']
    BuildingPanel: typeof import('./components/BuildingPanel.vue')['default']
    EventLog: typeof import('./components/EventLog.vue')['default']
    ExplorationPanel: typeof import('./components/ExplorationPanel.vue')['default']
    GameInterface: typeof import('./components/GameInterface.vue')['default']
    PlayerStatus: typeof import('./components/PlayerStatus.vue')['default']
    QuestSystem: typeof import('./components/QuestSystem.vue')['default']
    RandomEventSystem: typeof import('./components/RandomEventSystem.vue')['default']
    ResearchPanel: typeof import('./components/ResearchPanel.vue')['default']
    ResourcePanel: typeof import('./components/ResourcePanel.vue')['default']
    SkillTreeSystem: typeof import('./components/SkillTreeSystem.vue')['default']
    TimeControl: typeof import('./components/TimeControl.vue')['default']
    TradingSystem: typeof import('./components/TradingSystem.vue')['default']
    WeatherSystem: typeof import('./components/WeatherSystem.vue')['default']
  }
}

declare global {
  const ElMessage: typeof import('element-plus')['ElMessage']
}
