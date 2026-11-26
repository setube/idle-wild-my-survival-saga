import { defineStore } from 'pinia'
import { omit } from 'lodash-es'
import { encryptData, decryptData } from '../plugins/crypto'
import { skillTree, skills } from '../plugins/skillTree'
import { merchants } from '../plugins/merchants'
import { resources, resourceLimits } from '../plugins/resource'
import { availableBuildings, technologies } from '../plugins/recipes'
import type { GameState, ResourceAmounts } from '../types/game'
import { assert, assertFiniteNumber } from '../plugins/assertions'
import { normalizeSave } from '../plugins/saveValidation'

export const createInitialState = (): GameState => ({
    appliedPermanentStats: { maxHealth: 0, maxEnergy: 0 },
    // 玩家基本信息
    player: {
      level: 1,
      exp: 0,
      expToNextLevel: 100,
      health: 100,
      maxHealth: 100,
      energy: 100,
      maxEnergy: 100,
      // 生存天数
      days: 0,
      // 探索次数
      explorationCount: 0,
    },
    // 技能系统
    skillTreeEffects: {
      // 采集效果
      gatheringEfficiency: 0,
      gatheringEnergyCost: 0,
      rareHerbChance: 0,
      gatheringYield: 0,
      // 制作效果
      craftingSpeed: 0,
      maxHealth: 0,
      resourceSaving: 0,
      extraCraftingOutput: 0,
      toolDurability: 0,
      craftingQuality: 0,
      unlockAdvancedRecipes: false,
      // 生存效果
      foodConsumption: 0,
      waterConsumption: 0,
      weatherResistance: 0,
      energyConsumption: 0,
      healthRecovery: 0,
      allSurvivalStats: 0,
      // 研究效果
      researchSpeed: 0,
      techFragmentYield: 0,
      researchResourceSaving: 0,
      unlockAdvancedTech: false,
      allResearchBonus: 0,
      breakthroughChance: 0,
      // 战斗效果
      damageBonus: 0,
      damageReduction: 0,
      criticalChance: 0,
      retreatEnergyCost: 0,
      allCombatStats: 0,
      unlockSpecialCombat: false
    },
    // 已解锁的技能
    unlockedSkills: {},
    // 季节系统
    season: {
      // 季节长度（天）
      seasonLength: 30,
      // 季节效果
      effects: {
        foodGrowthRate: 1.0,
        herbGrowthRate: 1.0,
        energyConsumption: 1.0,
        waterConsumption: 1.0
      }
    },
    // 天气系统
    weather: {
      current: 'clear', // 当前天气类型
      duration: 6, // 持续时间（小时）
      nextChangeDay: 1, // 下次变化的天数
      nextChangeHour: 6, // 下次变化的小时
      effects: {
        gatheringEfficiency: 1.0, // 采集效率修正
        energyConsumption: 1.0, // 体力消耗修正
        waterConsumption: 1.0, // 水消耗修正
        foodConsumption: 1.0, // 食物消耗修正
        explorationEfficiency: 1.0 // 探索效率修正
      }
    },
    // 今天是否已经触发了事件
    eventTriggered: false,
    // 基础资源
    resources: { ...resources },
    // 资源上限
    resourceLimits: { ...resourceLimits },
    // 技能等级
    newSkills: structuredClone(skills),
    // 已解锁的建筑
    buildings: [],
    // 当前进行中的活动
    currentActivities: [],
    // 等待中的活动队列
    pendingActivities: [],
    // 当前进行中的研究
    researchActivities: [],
    // 等待中的研究队列
    pendingResearchActivities: [],
    // 当前进行中的探索
    explorationActivities: [],
    // 等待中的探索队列
    pendingExplorationActivities: [],
    // 当前进行中的建筑
    buildingActivities: [],
    // 等待中的建筑队列
    pendingBuildingActivities: [],
    // 当前进行中的技能
    skillActivities: [],
    // 等待中的技能队列
    pendingSkillActivities: [],
    // 游戏时间
    gameTime: {
      day: 1,
      hour: 6, // 游戏从早上6点开始
      minute: 0,
      // 时间流逝速度，实际秒:游戏分钟
      timeScale: 1, // 1秒 = 1分钟游戏时间
      // 游戏开始的时间戳
      startTime: Date.now(),
      // 当前游戏时间戳
      get timestamp() {
        return Date.now()
      }
    },
    // 已研究
    researched: ['basic_survival'],
    recipes: [],
    // 游戏设置
    settings: {
      autoSave: true,
      darkMode: false,
      soundEnabled: true,
      notificationsEnabled: true,
    },
    // 事件日志
    eventLog: [],
    // 成就系统
    achievements: {
      // 已解锁的成就ID列表
      unlocked: [],
      // 成就相关的计数器
      explorationCount: 0,
      extremeWeatherSurvived: false,
      healthyDays: 0,
      // 其他成就相关的状态
      resourcesCollected: {
        food: 0,
        water: 0,
        wood: 0,
        stone: 0,
        metal: 0,
        herb: 0
      }
    },
    // 游戏状态
    gameState: 'playing', // playing, paused, gameover
    // 任务系统
    activeQuests: [], // 进行中的任务
    completedQuests: [] // 已完成的任务
  })

/** Recreate derived bonuses from their sources; calling this repeatedly is safe. */
export function rebuildStateEffects(state: GameState): void {
  const effects = createInitialState().skillTreeEffects
  const knownSkills = new Set<string>()
  for (const branch of Object.values(skillTree)) {
    for (const skill of branch.skills) {
      knownSkills.add(skill.id)
      const level = state.unlockedSkills[skill.id] || 0
      assert(Number.isInteger(level) && level >= 0 && level <= skill.maxLevel, '技能等级超出范围: ' + skill.id)
      for (const [key, value] of Object.entries(skill.effects)) {
        if (typeof value === 'number') {
          const current = effects[key]
          assert(typeof current === 'number', '未知技能数值效果: ' + key)
          effects[key] = Number((current + value * level).toFixed(8))
        } else if (level > 0) effects[key] = value
      }
    }
  }
  for (const key of Object.keys(state.unlockedSkills)) assert(knownSkills.has(key), '未知技能: ' + key)
  let maxHealthBonus = 0
  let maxEnergyBonus = 0
  let storageMultiplier = 1
  const buildingIds = new Set<string>()
  for (const building of state.buildings) {
    assert(!buildingIds.has(building.id), '建筑重复: ' + building.id)
    buildingIds.add(building.id)
    const config = availableBuildings.find(item => item.id === building.id)
    const level = config?.levels.find(item => item.level === building.level)
    assert(config && level, '建筑等级无效: ' + building.id)
    building.name = config.name
    building.effects = { ...level.effects }
    maxHealthBonus += level.effects.maxHealth || 0
    maxEnergyBonus += level.effects.maxEnergy || 0
    storageMultiplier *= level.effects.storageMultiplier || 1
    effects.craftingSpeed += level.effects.craftingSpeed || 0
  }
  state.skillTreeEffects = effects
  state.resourceLimits = Object.fromEntries(Object.entries(resourceLimits).map(([key, value]) => [key, value * storageMultiplier]))
  const baseHealth = Math.max(1, state.player.maxHealth - state.appliedPermanentStats.maxHealth)
  const baseEnergy = Math.max(1, state.player.maxEnergy - state.appliedPermanentStats.maxEnergy)
  maxHealthBonus += Math.floor(baseHealth * effects.maxHealth)
  state.player.maxHealth = baseHealth + maxHealthBonus
  state.player.maxEnergy = baseEnergy + maxEnergyBonus
  state.appliedPermanentStats = { maxHealth: maxHealthBonus, maxEnergy: maxEnergyBonus }
  state.player.health = Math.min(state.player.health, state.player.maxHealth)
  state.player.energy = Math.min(state.player.energy, state.player.maxEnergy)
}

export const useGameStore = defineStore('game', {
  state: createInitialState,
  getters: {
    // 计算玩家总体实力
    playerPower: (state) => {
      return Object.values(state.newSkills).reduce((sum, skill) => sum + skill.level, 0)
    },
    // 计算资源总量
    totalResources: (state) => {
      return Object.values(state.resources).reduce((sum, amount) => sum + amount, 0)
    },
    // 计算当前时间字符串
    currentTimeString: (state) => {
      const { day, hour, minute } = state.gameTime
      return `第${day}天 ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    },
    // 检查资源是否足够
    hasEnoughResources: (state) => (requirements: ResourceAmounts) => {
      for (const [resource, amount] of Object.entries(requirements)) {
        if (state.resources[resource] < amount) return false
      }
      return true
    },
  },
  actions: {
    // 初始化游戏
    initGame() {
      // 重置游戏状态
      this.$reset()
      localStorage.removeItem(__APP_NAME__)
      this.saveGame()
      this.loadGame()
      this.addToEventLog('你醒来了，发现自己身处一片荒野...')
    },
    // 保存游戏
    saveGame() {
      const filteredState = omit(this.$state, ['eventLog'])
      const encryptedData = encryptData(filteredState)
      if (encryptedData) {
        try {
          const encodedAppName = btoa(`+++${__APP_NAME__}`)
          localStorage.setItem(__APP_NAME__, `${encryptedData}${encodedAppName}`)
          this.addToEventLog('游戏数据已保存')
        } catch (error) {
          this.addToEventLog('数据保存失败:', error)
        }
      } else {
        this.addToEventLog('数据加密失败')
      }
    },
    // Decode and validate before changing either live state or the stored save.
    restoreSave(data: string, persist = false): boolean {
      try {
        assert(typeof data === 'string' && data.length > 0, '存档不能为空')
        const suffix = btoa('+++' + __APP_NAME__)
        assert(data.endsWith(suffix), '存档标识不正确')
        const decoded = decryptData(data.slice(0, -suffix.length))
        const restored = normalizeSave(decoded, createInitialState())
        // Legacy saves already include these health/energy bonuses.
        if (typeof decoded === 'object' && decoded !== null && !('appliedPermanentStats' in decoded)) {
          restored.appliedPermanentStats = restored.buildings.reduce((total, building) => ({
            maxHealth: total.maxHealth + (building.effects.maxHealth || 0),
            maxEnergy: total.maxEnergy + (building.effects.maxEnergy || 0),
          }), { maxHealth: 0, maxEnergy: 0 })
        }
        rebuildStateEffects(restored)
        if (persist) localStorage.setItem(__APP_NAME__, data)
        this.$state = restored
        this.syncConfiguration()
        this.addToEventLog('游戏已加载')
        return true
      } catch (error) {
        this.addToEventLog('数据加载失败:', error)
        return false
      }
    },
    loadGame(): boolean {
      try {
        const data = localStorage.getItem(__APP_NAME__)
        return data ? this.restoreSave(data) : false
      } catch (error) {
        this.addToEventLog('数据加载失败:', error)
        return false
      }
    },
    importGame(data: string): boolean { return this.restoreSave(data, true) },
    syncConfiguration() {
      for (const branch of Object.values(skillTree)) {
        for (const skill of branch.skills) skill.level = this.unlockedSkills[skill.id] || 0
      }
      for (const tech of technologies) tech.researched = this.researched.includes(tech.id)
    },
    rebuildPermanentEffects() {
      rebuildStateEffects(this.$state)
      this.syncConfiguration()
    },
    initBuildingEffects() { this.rebuildPermanentEffects() },
    resetSkillEffects() { this.rebuildPermanentEffects() },
    fixSkills() {
      for (const [key, skill] of Object.entries(skills)) {
        if (typeof this.newSkills[key] !== 'object') this.newSkills[key] = structuredClone(skill)
      }
    },
    // 添加资源
    addResource(resource: string, amount: number) {
      assertFiniteNumber(amount, '资源数量')
      if (!Object.hasOwn(this.resources, resource)) return false
      // 确保不超过上限
      const newAmount = this.resources[resource] + amount
      this.resources[resource] = Math.min(newAmount, this.resourceLimits[resource])
      return true
    },
    // 消耗资源
    consumeResource(resource: string, amount: number) {
      assertFiniteNumber(amount, '资源数量')
      if (!Object.hasOwn(this.resources, resource)) return false
      if (this.resources[resource] < amount) return false
      this.resources[resource] -= amount
      return true
    },
    // 增加技能经验
    addSkillExp(skill: string, exp: number) {
      assertFiniteNumber(exp, '技能经验')
      assert(Object.hasOwn(this.newSkills, skill), '技能不存在')
      this.newSkills[skill].exp += exp
      this.addToEventLog(`你获得了${exp}点${this.getResourceName(skill)}技能经验`)
      if (this.newSkills[skill].exp >= this.newSkills[skill].expToNextLevel) {
        this.newSkills[skill].exp -= this.newSkills[skill].expToNextLevel
        this.newSkills[skill].level += 1
        // 增加下一级所需经验
        this.newSkills[skill].expToNextLevel = Math.floor(this.newSkills[skill].expToNextLevel * 1.5)
        this.addToEventLog(`${this.getResourceName(skill)}技能提升到${this.newSkills[skill].level}级！`)
      }
      this.saveGame()
    },
    addExperience(exp: number) {
      assertFiniteNumber(exp, '幸存者经验')
      this.player.exp += exp
      this.addToEventLog(`你获得了${exp}点幸存者经验`)
      this.saveGame()
    },
    // 计算当前可用的商人
    availableMerchants() {
      const currentDay = this.gameTime.day
      return merchants.filter(merchant => {
        // 检查是否达到最小天数要求
        if (currentDay < merchant.availability.minDay) return false
        // 计算商人是否在当前日期出现
        const daysSinceMinDay = currentDay - merchant.availability.minDay
        const cyclePosition = daysSinceMinDay % merchant.availability.frequency
        return cyclePosition < merchant.availability.duration
      })
    },
    // 获取资源名称
    getResourceName(resourceKey: string) {
      const resourceNames: Record<string, string> = {
        exp: '幸存者经验',
        maxHealth: '最大健康',
        maxEnergy: '最大体力',
        health: '健康',
        energy: '体力',
        food: '食物',
        water: '水',
        wood: '木材',
        stone: '石头',
        metal: '金属',
        herb: '草药',
        medicine: '药品',
        tools: '工具',
        parts: '零件',
        fuel: '燃料',
        gathering: '采集',
        crafting: '制作',
        combat: '战斗',
        survival: '生存',
        research: '研究',
        predator: '野兽袭击',
        storm: '遭遇风暴',
        rockslide: '遭遇坍塌',
        radiation: '受到辐射',
        hostiles: '遭遇敌对人员',
        thirst: '消耗额外水资源',
        creatures: '遭遇奇怪的生物',
        ancientRelic: '古代遗物',
        techFragment: '科技碎片',
        advanced_parts: '高级零件',
        electronic_components: '电子元件',
        rare_herb: '稀有草药',
        crystal: '水晶',
        explorationCount: '探索次数',
      }
      return resourceNames[resourceKey] || resourceKey
    },
    // 检查是否需要更新天气
    checkWeatherChange() {
      const currentDay = this.gameTime.day
      const currentHour = this.gameTime.hour
      // 生成天气
      if (currentDay > this.weather.nextChangeDay ||
        (currentDay === this.weather.nextChangeDay &&
          currentHour >= this.weather.nextChangeHour)) {

        // 获取当前季节
        const day = this.gameTime.day
        const seasonLength = 30 // 每个季节30天
        const seasonIndex = Math.floor((day - 1) % (seasonLength * 4) / seasonLength)
        const seasons = ['spring', 'summer', 'autumn', 'winter']
        const currentSeason = seasons[seasonIndex]
        // 各季节天气概率
        const weatherProbabilities: Record<string, Record<string, number>> = {
          spring: {
            clear: 0.3,
            cloudy: 0.3,
            rainy: 0.25,
            foggy: 0.1,
            windy: 0.05
          },
          summer: {
            clear: 0.4,
            cloudy: 0.2,
            rainy: 0.15,
            hot: 0.15,
            storm: 0.1
          },
          autumn: {
            clear: 0.25,
            cloudy: 0.3,
            rainy: 0.2,
            foggy: 0.15,
            windy: 0.1
          },
          winter: {
            clear: 0.2,
            cloudy: 0.2,
            cold: 0.3,
            snow: 0.2,
            windy: 0.1
          }
        }
        // 获取当前季节的天气概率
        const probabilities = weatherProbabilities[currentSeason]
        // 随机选择天气
        let random = Math.random()
        let cumulativeProbability = 0
        let selectedWeather = 'clear' // 默认晴天
        for (const [weather, probability] of Object.entries(probabilities)) {
          cumulativeProbability += probability
          if (random <= cumulativeProbability) {
            selectedWeather = weather
            break
          }
        }
        // 更新天气状态
        const oldWeather = this.weather.current
        this.weather.current = selectedWeather
        // 设置天气持续时间（4-8小时）
        this.weather.duration = 4 + Math.floor(Math.random() * 5)
        // 更新下次天气变化时间
        let nextHour = this.gameTime.hour + this.weather.duration
        let nextDay = this.gameTime.day
        while (nextHour >= 24) {
          nextHour -= 24
          nextDay += 1
        }
        this.weather.nextChangeDay = nextDay
        this.weather.nextChangeHour = nextHour
        const weatherEffects: Record<string, string> = {
          clear: '视野良好，采集效率+10%',
          cloudy: '温度适宜，体力消耗-5%',
          rainy: '水资源收集+20%，移动速度-10%',
          foggy: '视野受限，探索效率-20%',
          windy: '体力消耗+10%，有机会发现特殊资源',
          hot: '水分消耗+30%，体力恢复-20%',
          cold: '食物消耗+30%，体力恢复-20%',
          snow: '移动速度-30%，采集效率-20%',
          storm: '无法外出，有触发灾害风险',
          heavyRain: '水资源收集+50%，采集效率-30%，有触发洪水风险'
        }
        // 只有当天气变化时才记录日志
        if (oldWeather !== selectedWeather) this.addToEventLog(`天气变为${this.getWeatherName()}，${weatherEffects[this.weather.current] || ''}`)
        // 重置天气效果
        this.weather.effects = {
          gatheringEfficiency: 1.0,
          energyConsumption: 1.0,
          waterConsumption: 1.0,
          foodConsumption: 1.0,
          explorationEfficiency: 1.0
        }
      }
    },
    // 获取天气名称
    getWeatherName() {
      const weatherNames: Record<string, string> = {
        clear: '晴朗',
        cloudy: '多云',
        rainy: '小雨',
        foggy: '雾天',
        windy: '大风',
        hot: '酷热',
        cold: '寒冷',
        snow: '降雪',
        storm: '风暴',
        heavyRain: '暴雨'
      }
      return weatherNames[this.weather.current] || '未知'
    },
    // 触发随机事件
    triggerRandomEvent() {
      // 基础事件
      const basicEvents: { id: string; name: string; effect: () => void; weight: number; minDay?: number }[] = [
        {
          id: 'rain', name: '下雨了', effect: () => {
            this.addResource('water', 10)
            this.addToEventLog('下雨了，你收集了一些雨水')
          },
          weight: 10 // 权重，决定事件触发概率
        },
        {
          id: 'animal', name: '野生动物', effect: () => {
            if (this.newSkills.combat.level > 2) {
              this.addResource('food', 15)
              this.addToEventLog('你成功猎到了一只野兔，获得了食物')
            } else {
              this.addToEventLog('你看到一只野兔，但它跑得太快了')
            }
          },
          weight: 8
        },
        {
          id: 'stranger', name: '陌生人', effect: () => {
            this.addToEventLog('你遇到了一个陌生人，他给了你一些建议就离开了')
            this.addSkillExp('survival', 20)
          },
          weight: 6
        },
        {
          id: 'wild_fruits', name: '野果丰收', effect: () => {
            this.addResource('food', 8)
            this.addToEventLog('你发现了一片野果丛，收获了不少食物')
          },
          weight: 10
        },
        {
          id: 'herb_discovery', name: '草药发现', effect: () => {
            this.addResource('herb', 5)
            this.addToEventLog('你发现了一片罕见的草药，这对制作药品很有帮助')
          },
          weight: 7
        },
      ]
      // 危险事件
      const dangerEvents = [
        {
          id: 'storm', name: '暴风雨', effect: () => {
            // 检查是否有庇护所
            const hasShelter = this.buildings.some(b => b.id === 'shelter' && b.level >= 1)
            if (hasShelter) {
              this.addToEventLog('一场暴风雨来袭，但你的庇护所提供了良好的保护')
              this.player.health -= this.player.health * 0.05 // 仍有轻微影响
            } else {
              this.addToEventLog('一场暴风雨来袭，你被淋得浑身湿透，健康都受到了影响')
              this.player.health -= this.player.health * 0.1
            }
          },
          weight: 5,
          minDay: 3 // 最早在第3天触发
        },
        {
          id: 'illness', name: '疾病', effect: () => {
            if (this.resources.medicine > 0) {
              this.consumeResource('medicine', 1)
              this.addToEventLog('你感到身体不适，但幸好有药品治疗，很快就恢复了')
            } else {
              this.player.health -= this.player.health * 0.15
              this.player.energy -= this.player.energy * 0.2
              this.addToEventLog('你生病了，没有药品治疗，健康状况恶化')
            }
          },
          weight: 4,
          minDay: 5
        },
        {
          id: 'predator', name: '掠食者', effect: () => {
            if (this.newSkills.combat.level >= 3) {
              this.addToEventLog('一只野兽袭击了你，但你成功击退了它，还获得了一些食物')
              this.addResource('food', 20)
              this.addSkillExp('combat', 20)
            } else {
              this.player.health -= this.player.health * 0.2
              this.addToEventLog('一只野兽袭击了你，你勉强逃脱，但受了伤')
            }
          },
          weight: 3,
          minDay: 7
        },
      ]
      // 幸运事件
      const luckyEvents = [
        {
          id: 'abandoned_supplies', name: '废弃物资', effect: () => {
            this.addResource('food', 10)
            this.addResource('water', 10)
            this.addResource('medicine', 1)
            this.addToEventLog('你发现了一些废弃的物资，获得了食物、水和药品')
          },
          weight: 3,
          minDay: 4
        },
        {
          id: 'tech_discovery', name: '科技发现', effect: () => {
            this.addResource('techFragment', 2)
            this.addToEventLog('你发现了一些古老的科技碎片，这对研究很有帮助')
          },
          weight: 2,
          minDay: 10
        },
        {
          id: 'ancient_cache', name: '古代宝藏', effect: () => {
            this.addResource('ancientRelic', 1)
            this.addResource('metal', 15)
            this.addResource('parts', 3)
            this.addToEventLog('你发现了一个古代文明的宝藏，获得了珍贵的资源')
          },
          weight: 1,
          minDay: 15
        },
      ]
      // 根据游戏天数选择可用事件
      let availableEvents = [...basicEvents]
      if (this.gameTime.day >= 3) availableEvents = availableEvents.concat(dangerEvents.filter(e => this.gameTime.day >= (e.minDay || 0)))
      if (this.gameTime.day >= 4) availableEvents = availableEvents.concat(luckyEvents.filter(e => this.gameTime.day >= (e.minDay || 0)))
      // 计算总权重
      const totalWeight = availableEvents.reduce((sum, event) => sum + (event.weight || 1), 0)
      // 25%概率触发随机事件
      if (Math.random() < 0.25) {
        // 根据权重随机选择事件
        let randomWeight = Math.random() * totalWeight
        let selectedEvent = null
        for (const event of availableEvents) {
          randomWeight -= (event.weight || 1)
          if (randomWeight <= 0) {
            selectedEvent = event
            break
          }
        }
        if (selectedEvent) selectedEvent.effect()
      }
    },
    // 游戏结束
    gameOver() {
      this.gameState = 'gameover'
      this.saveGame()
      this.addToEventLog('你没能生存下来...')
    },
    // 添加事件日志
    addToEventLog(message: string, detail?: unknown) {
      const timestamp = `${this.gameTime.day}天 ${this.gameTime.hour}:${this.gameTime.minute}`
      const detailText = detail instanceof Error ? detail.message : detail === undefined ? '' : String(detail)
      this.eventLog.unshift({ timestamp, message: message + detailText })
      // 限制日志长度
      if (this.eventLog.length > 100) this.eventLog.pop()
    },
  },
})
