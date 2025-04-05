import { defineStore } from 'pinia'
import { omit } from 'lodash-es'
import { recipes, availableBuildings } from '../plugins/recipes'

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(__APP_NAME__, 1)
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('saves')) {
        db.createObjectStore('saves', { keyPath: 'id' })
      }
    }
    request.onsuccess = (event) => resolve(event.target.result)
    request.onerror = (event) => reject(event.target.error)
  })
}

const saveToIndexedDB = async (id, data) => {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['saves'], 'readwrite')
    const store = transaction.objectStore('saves')
    const request = store.put({ id, data })
    request.onsuccess = () => { db.close(); resolve(true) }
    request.onerror = (event) => { db.close(); reject(event.target.error) }
  })
}

const loadFromIndexedDB = async (id) => {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['saves'], 'readonly')
    const store = transaction.objectStore('saves')
    const request = store.get(id)
    request.onsuccess = (event) => { db.close(); resolve(event.target.result ? event.target.result.data : null) }
    request.onerror = (event) => { db.close(); reject(event.target.error) }
  })
}

const getAllSavesFromIndexedDB = async () => {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['saves'], 'readonly')
    const store = transaction.objectStore('saves')
    const request = store.getAll()
    request.onsuccess = (event) => { db.close(); resolve(event.target.result.map(item => ({ id: item.id, data: item.data }))) }
    request.onerror = (event) => { db.close(); reject(event.target.error) }
  })
}

const deleteFromIndexedDB = async (id) => {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['saves'], 'readwrite')
    const store = transaction.objectStore('saves')
    const request = store.delete(id)
    request.onsuccess = () => { db.close(); resolve(true) }
    request.onerror = (event) => { db.close(); reject(event.target.error) }
  })
}

// 生成带日期时间的存档名
const generateSaveId = (baseName = 'Save') => {
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 19).replace(/T/, '-').replace(/:/g, '-')
  return `${baseName}-${dateStr}`
}

export const useGameStore = defineStore(__APP_NAME__, {
  state: () => ({
    // 玩家基本信息
    player: {
      name: '幸存者',
      level: 1,
      exp: 0,
      expToNextLevel: 100,
      health: 100,
      maxHealth: 100,
      energy: 100,
      maxEnergy: 100,
      mental: 100,
      maxMental: 100,
      days: 0,
      cycles: 0,
    },
    skillTreeEffects: {
      gatheringEfficiency: 0,
      rareResourceChance: 0,
      gatheringEnergyCost: 0,
      rareHerbChance: 0,
      gatheringYield: 0,
      craftingSpeed: 0,
      resourceSaving: 0,
      extraCraftingOutput: 0,
      toolDurability: 0,
      craftingQuality: 0,
      unlockAdvancedRecipes: false,
      foodConsumption: 0,
      waterConsumption: 0,
      weatherResistance: 0,
      energyConsumption: 0,
      healthRecovery: 0,
      mentalRecovery: 0,
      allSurvivalStats: 0,
      researchSpeed: 0,
      techFragmentYield: 0,
      researchResourceSaving: 0,
      unlockAdvancedTech: false,
      allResearchBonus: 0,
      breakthroughChance: 0,
      damageBonus: 0,
      damageReduction: 0,
      criticalChance: 0,
      retreatEnergyCost: 0,
      allCombatStats: 0,
      unlockSpecialCombat: false
    },
    unlockedSkills: {},
    season: {
      seasonLength: 30,
      effects: {
        foodGrowthRate: 1.0,
        herbGrowthRate: 1.0,
        energyConsumption: 1.0,
        waterConsumption: 1.0,
        mentalRecovery: 1.0
      }
    },
    weather: {
      current: 'clear',
      duration: 6,
      nextChangeDay: 1,
      nextChangeHour: 6,
      effects: {
        gatheringEfficiency: 1.0,
        energyConsumption: 1.0,
        waterConsumption: 1.0,
        foodConsumption: 1.0,
        movementSpeed: 1.0,
        explorationEfficiency: 1.0
      }
    },
    resources: {
      food: 10,
      water: 10,
      wood: 0,
      stone: 0,
      metal: 0,
      herb: 0,
      rare_herb: 0,
      medicine: 0,
      tools: 0,
      rope: 0,
      parts: 0,
      advanced_parts: 0,
      electronic_components: 0,
      fuel: 0,
      crystal: 0,
      ancientRelic: 0,
      techFragment: 0,
    },
    resourceLimits: {
      food: 50,
      water: 50,
      wood: 50,
      stone: 50,
      metal: 50,
      herb: 30,
      rare_herb: 30,
      medicine: 20,
      tools: 10,
      rope: 10,
      parts: 10,
      advanced_parts: 10,
      electronic_components: 10,
      crystal: 10,
      fuel: 20,
      ancientRelic: 5,
      techFragment: 5,
    },
    skills: {
      gathering: 1,
      crafting: 1,
      combat: 1,
      survival: 1,
      research: 1,
    },
    buildings: [],
    currentActivities: [],
    gameTime: {
      day: 1,
      hour: 6,
      minute: 0,
      timeScale: 1,
      startTime: Date.now(),
      get timestamp() {
        return Date.now()
      }
    },
    settings: {
      autoSave: true,
      darkMode: false,
      soundEnabled: true,
      notificationsEnabled: true,
    },
    eventLog: [],
    achievements: {
      unlocked: [],
      explorationCount: 0,
      extremeWeatherSurvived: false,
      healthyDays: 0,
      resourcesCollected: {
        food: 0,
        water: 0,
        wood: 0,
        stone: 0,
        metal: 0,
        herb: 0
      }
    },
    gameState: 'playing',
    activeQuests: [],
    completedQuests: []
  }),
  getters: {
    playerPower: (state) => {
      return Object.values(state.skills).reduce((sum, level) => sum + level, 0)
    },
    totalResources: (state) => {
      return Object.values(state.resources).reduce((sum, amount) => sum + amount, 0)
    },
    currentTimeString: (state) => {
      const { day, hour, minute } = state.gameTime
      return `第${day}天 ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    },
    hasEnoughResources: (state) => (requirements) => {
      for (const [resource, amount] of Object.entries(requirements)) {
        if (state.resources[resource] < amount) return false
      }
      return true
    },
  },
  actions: {
    // 初始化游戏
    initGame() {
      this.$reset()
      this.addToEventLog('你醒来了，发现自己身处一片荒野...')
    },
    async saveGame(saveId = generateSaveId()) {
      try {
        const filteredState = omit(this.$state, ['eventLog', 'currentActivities'])
        const saveData = encryptData ? encryptData(filteredState) : JSON.stringify(filteredState)
        await saveToIndexedDB(saveId, saveData)
        this.addToEventLog(`存档 ${saveId} 已保存`)
        return saveId // 返回生成的存档 ID
      } catch (error) {
        this.addToEventLog('存档保存失败: ' + error.message)
        return null
      }
    },

    async loadGame(saveId) {
      try {
        const rawData = await loadFromIndexedDB(saveId)
        if (rawData) {
          const decryptedData = decryptData ? decryptData(rawData) : JSON.parse(rawData)
          this.$patch(decryptedData)
          this.initBuildingEffects()
          this.addToEventLog(`存档 ${saveId} 已加载`)
          return true
        } else {
          this.addToEventLog(`未找到存档 ${saveId}`)
          return false
        }
      } catch (error) {
        this.addToEventLog('存档加载失败: ' + error.message)
        return false
      }
    },

    async getSaveList() {
      try {
        const saves = await getAllSavesFromIndexedDB()
        return saves.map(save => save.id)
      } catch (error) {
        this.addToEventLog('获取存档列表失败: ' + error.message)
        return []
      }
    },

    async deleteSave(saveId) {
      try {
        await deleteFromIndexedDB(saveId)
        this.addToEventLog(`存档 ${saveId} 已删除`)
        return true
      } catch (error) {
        this.addToEventLog('存档删除失败: ' + error.message)
        return false
      }
    },

    async exportSave(saveId) {
      try {
        const rawData = await loadFromIndexedDB(saveId)
        if (rawData) {
          this.addToEventLog(`存档 ${saveId} 已导出`)
          return rawData
        } else {
          this.addToEventLog(`未找到存档 ${saveId}`)
          return null
        }
      } catch (error) {
        this.addToEventLog('存档导出失败: ' + error.message)
        return null
      }
    },

    async importSave(saveId = generateSaveId('Imported'), saveData) {
      try {
        const parsedData = decryptData ? decryptData(saveData) : JSON.parse(saveData)
        if (!parsedData || typeof parsedData !== 'object') throw new Error('无效的存档数据')
        const encryptedData = encryptData ? encryptData(parsedData) : JSON.stringify(parsedData)
        await saveToIndexedDB(saveId, encryptedData)
        this.addToEventLog(`存档 ${saveId} 已导入`)
        return saveId
      } catch (error) {
        this.addToEventLog('存档导入失败: ' + error.message)
        return null
      }
    },
    // 获取技能名称
    getSkillName(skillId) {
      const skillNames = {
        gathering: '采集',
        crafting: '制作',
        combat: '战斗',
        survival: '生存',
        research: '研究'
      }
      return skillNames[skillId] || skillId
    },
    // 更新技能效果
    updateSkillEffects(skillId, effects, level) {
      if (!this.unlockedSkills[skillId]) this.unlockedSkills[skillId] = 0
      this.unlockedSkills[skillId] = level
      for (const [effect, value] of Object.entries(effects)) {
        if (this.skillTreeEffects[effect] !== undefined) {
          if (typeof value === 'number') this.skillTreeEffects[effect] = parseFloat((this.skillTreeEffects[effect] + value).toFixed(2))
          else this.skillTreeEffects[effect] = value
        }
      }
      if (skillId.includes('efficient_metabolism') ||
          skillId.includes('weather_adaptation') ||
          skillId.includes('energy_conservation') ||
          skillId.includes('natural_healing') ||
          skillId.includes('survival_expert')) {
        this.applySurvivalSkillEffects()
      }
      this.addToEventLog(`技能效果已更新: ${this.getSkillName(skillId.split('_')[0])}技能`)
    },
    // 获取技能效果修正值
    getSkillEffectModifier(effectType) {
      const effect = this.skillTreeEffects[effectType]
      if (effect === undefined) return 0
      return effect
    },
    // 应用技能效果到资源收集
    applyGatheringSkillEffects(baseAmount, resourceType) {
      let amount = baseAmount
      if (this.skillTreeEffects.gatheringEfficiency > 0) amount *= (1 + this.skillTreeEffects.gatheringEfficiency)
      if (this.skillTreeEffects.gatheringYield > 0) amount *= (1 + this.skillTreeEffects.gatheringYield)
      if (resourceType === 'herb' && this.skillTreeEffects.rareHerbChance > 0) {
        if (Math.random() < this.skillTreeEffects.rareHerbChance) {
          this.addResource('rare_herb', 1)
          this.addToEventLog('你的技能帮助你发现了一株稀有草药！')
        }
      }
      return Math.floor(amount)
    },
    // 添加资源
    addResource(resource, amount) {
      if (!this.resources.hasOwnProperty(resource)) return false
      const newAmount = this.resources[resource] + amount
      this.resources[resource] = Math.min(newAmount, this.resourceLimits[resource])
      return true
    },
    // 接受任务
    acceptQuest(quest) {
      if (this.activeQuests.some(q => q.id === quest.id)) {
        this.addToEventLog(`任务 ${quest.name} 已经在进行中`)
        return false
      }
      if (this.completedQuests.some(q => q.id === quest.id)) {
        this.addToEventLog(`任务 ${quest.name} 已经完成`)
        return false
      }
      this.activeQuests.push(quest)
      this.addToEventLog(`接受了任务: ${quest.name}`)
      return true
    },
    // 完成任务
    completeQuest(quest) {
      const questIndex = this.activeQuests.findIndex(q => q.id === quest.id)
      if (questIndex === -1) {
        this.addToEventLog(`任务 ${quest.name} 不在进行中`)
        return false
      }
      const completedQuest = this.activeQuests.splice(questIndex, 1)[0]
      this.completedQuests.push(completedQuest)
      this.giveQuestRewards(completedQuest)
      this.addToEventLog(`完成了任务: ${completedQuest.name}`)
      return true
    },
    // 放弃任务
    abandonQuest(quest) {
      const questIndex = this.activeQuests.findIndex(q => q.id === quest.id)
      if (questIndex === -1) {
        this.addToEventLog(`任务 ${quest.name} 不在进行中`)
        return false
      }
      this.activeQuests.splice(questIndex, 1)
      this.addToEventLog(`放弃了任务: ${quest.name}`)
      return true
    },
    // 发放任务奖励
    giveQuestRewards(quest) {
      if (!quest.rewards) return
      for (const [rewardType, amount] of Object.entries(quest.rewards)) {
        switch (rewardType) {
          case 'exp':
            this.player.exp += amount
            this.checkLevelUp()
            break
          case 'maxHealth':
            this.player.maxHealth += amount
            this.player.health += amount
            break
          case 'maxEnergy':
            this.player.maxEnergy += amount
            this.player.energy += amount
            break
          case 'maxMental':
            this.player.maxMental += amount
            this.player.mental += amount
            break
          default:
            if (this.resources.hasOwnProperty(rewardType)) this.addResource(rewardType, amount)
            break
        }
      }
    },
    // 检查玩家是否可以升级
    checkLevelUp() {
      while (this.player.exp >= this.player.expToNextLevel) {
        this.player.exp -= this.player.expToNextLevel
        this.player.level += 1
        this.player.expToNextLevel = Math.floor(this.player.expToNextLevel * 1.5)
        this.player.maxHealth += 5
        this.player.health = this.player.maxHealth
        this.player.maxEnergy += 5
        this.player.energy = this.player.maxEnergy
        this.player.maxMental += 5
        this.player.mental = this.player.maxMental
        this.addToEventLog(`升级了！当前等级: ${this.player.level}`)
      }
    },
    // 消耗资源
    consumeResource(resource, amount) {
      if (!this.resources.hasOwnProperty(resource)) return false
      if (this.resources[resource] < amount) return false
      this.resources[resource] -= amount
      return true
    },
    // 开始一个活动
    startActivity(recipeId) {
      const recipe = recipes().find(r => r.id === recipeId)
      if (!recipe) return false
      for (const [skill, level] of Object.entries(recipe.skillRequired)) {
        if (this.skills[skill] < level) {
          this.addToEventLog(`你的${skill}技能等级不足，无法进行${recipe.name}`)
          return false
        }
      }
      for (const [resource, amount] of Object.entries(recipe.inputs)) {
        if (resource === 'energy') {
          let energyAmount = amount
          if (recipe.category === 'gathering' && this.skillTreeEffects.gatheringEnergyCost < 0) energyAmount = Math.floor(energyAmount * (1 + this.skillTreeEffects.gatheringEnergyCost))
          if (this.skillTreeEffects.energyConsumption < 0) energyAmount = Math.floor(energyAmount * (1 + this.skillTreeEffects.energyConsumption))
          energyAmount = Math.max(1, energyAmount)
          if (this.player.energy < energyAmount) {
            this.addToEventLog('你的体力不足')
            return false
          }
          this.player.energy -= energyAmount
        } else {
          if (!this.consumeResource(resource, amount)) {
            this.addToEventLog(`资源不足: ${resource}`)
            return false
          }
        }
      }
      let activityDuration = recipe.duration
      if (recipe.category === 'gathering' && this.skillTreeEffects.gatheringEfficiency > 0) activityDuration = Math.floor(activityDuration / (1 + this.skillTreeEffects.gatheringEfficiency))
      if (recipe.category === 'crafting' && this.skillTreeEffects.craftingSpeed > 0) activityDuration = Math.floor(activityDuration / (1 + this.skillTreeEffects.craftingSpeed))
      if (recipe.category === 'research' && this.skillTreeEffects.researchSpeed > 0) activityDuration = Math.floor(activityDuration / (1 + this.skillTreeEffects.researchSpeed))
      activityDuration = Math.max(1, activityDuration)
      const activity = {
        id: Date.now(),
        recipeId,
        name: recipe.name,
        startTime: Date.now(),
        duration: activityDuration * 1000,
        completed: false
      }
      this.currentActivities.push(activity)
      this.addToEventLog(`开始${recipe.name}`)
      setTimeout(() => this.completeActivity(activity.id), activityDuration * 1000)
      return true
    },
    // 取消活动
    cancelActivity(activityId) {
      const activityIndex = this.currentActivities.findIndex(a => a.id === activityId)
      if (activityIndex === -1) return false
      const activity = this.currentActivities[activityIndex]
      this.currentActivities.splice(activityIndex, 1)
      this.addToEventLog(`取消了${activity.name}活动`)
      return true
    },
    // 完成活动
    completeActivity(activityId) {
      const activityIndex = this.currentActivities.findIndex(a => a.id === activityId)
      if (activityIndex === -1) return false
      const activity = this.currentActivities[activityIndex]
      const recipe = recipes().find(r => r.id === activity.recipeId)
      this.currentActivities.splice(activityIndex, 1)
      let modifiedOutputs = {}
      for (const [resource, range] of Object.entries(recipe.outputs)) {
        let amount = Array.isArray(range) ? Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0] : range
        if (recipe.category === 'gathering') amount = this.applyGatheringSkillEffects(amount, resource)
        else if (recipe.category === 'crafting') modifiedOutputs[resource] = amount
        else if (recipe.category === 'research' && resource === 'techFragment') amount = this.applyResearchSkillEffects(amount)
        if (recipe.category !== 'crafting') {
          this.addResource(resource, amount)
          this.addToEventLog(`获得 ${amount} ${this.getResourceName(resource)}`)
          if (this.achievements.resourcesCollected.hasOwnProperty(resource)) this.achievements.resourcesCollected[resource] += amount
        }
      }
      if (recipe.category === 'crafting' && Object.keys(modifiedOutputs).length > 0) {
        const finalOutputs = this.applyCraftingSkillEffects(recipe, modifiedOutputs)
        for (const [resource, amount] of Object.entries(finalOutputs)) {
          this.addResource(resource, amount)
          this.addToEventLog(`获得 ${amount} ${this.getResourceName(resource)}`)
          if (this.achievements.resourcesCollected.hasOwnProperty(resource)) this.achievements.resourcesCollected[resource] += amount
        }
      }
      if (recipe.category === 'exploration') this.achievements.explorationCount += 1
      for (const skill in recipe.skillRequired) this.addSkillExp(skill, 1)
      return true
    },
    // 增加技能经验
    addSkillExp(skill, exp) {
      if (!this.skills.hasOwnProperty(skill)) return false
      const skillNames = {
        gathering: '采集',
        crafting: '制作',
        combat: '战斗',
        survival: '生存',
        research: '研究'
      }
      const currentLevel = this.skills[skill]
      const chanceToLevel = 0.1 * exp / Math.sqrt(currentLevel)
      if (Math.random() < chanceToLevel) {
        this.skills[skill] += 1
        this.addToEventLog(`${skillNames[skill] || skill}技能提升到${this.skills[skill]}级！`)
        if (this.skills[skill] % 5 === 0) {
          switch (skill) {
            case 'gathering':
              this.player.maxEnergy += 5
              this.addToEventLog('你的采集技能提高，增加了最大体力值！')
              break
            case 'crafting':
              this.addToEventLog('你的制作技能提高，可以制作更复杂的物品了！')
              break
            case 'combat':
              this.player.maxHealth += 10
              this.player.health += 10
              this.addToEventLog('你的战斗技能提高，增加了最大健康值！')
              break
            case 'survival':
              for (const key in this.resourceLimits) {
                this.resourceLimits[key] *= 1.1
              }
              this.addToEventLog('你的生存技能提高，可以储存更多资源了！')
              break
            case 'research':
              this.player.maxMental += 5
              this.player.mental += 5
              this.addToEventLog('你的研究技能提高，增加了最大精神值！')
              break
          }
        }
      }
      return true
    },
    // 应用技能效果到制作活动
    applyCraftingSkillEffects(recipe, outputs) {
      let modifiedOutputs = { ...outputs }
      if (this.skillTreeEffects.craftingQuality > 0) {
        for (const [resource, amount] of Object.entries(modifiedOutputs)) {
          if (typeof amount === 'number') modifiedOutputs[resource] = Math.floor(amount * (1 + this.skillTreeEffects.craftingQuality))
        }
      }
      if (this.skillTreeEffects.extraCraftingOutput > 0 && Math.random() < this.skillTreeEffects.extraCraftingOutput) {
        const resources = Object.keys(modifiedOutputs)
        if (resources.length > 0) {
          const resource = resources[Math.floor(Math.random() * resources.length)]
          if (typeof modifiedOutputs[resource] === 'number') {
            modifiedOutputs[resource] += 1
            this.addToEventLog(`你的制作技能帮助你获得了额外的 ${this.getResourceName(resource)}！`)
          }
        }
      }
      return modifiedOutputs
    },
    // 应用技能效果到研究活动
    applyResearchSkillEffects(techFragment) {
      let amount = techFragment
      if (this.skillTreeEffects.techFragmentYield > 0) amount = Math.floor(amount * (1 + this.skillTreeEffects.techFragmentYield))
      if (this.skillTreeEffects.breakthroughChance > 0 && Math.random() < this.skillTreeEffects.breakthroughChance) {
        amount += 1
        this.addToEventLog('你取得了突破性的研究发现！')
      }
      return amount
    },
    // 应用技能效果到生存属性
    applySurvivalSkillEffects() {
      if (this.skillTreeEffects.maxHealth > 0) {
        const healthBonus = Math.floor(this.player.maxHealth * this.skillTreeEffects.maxHealth)
        this.player.maxHealth += healthBonus
      }
      if (this.skillTreeEffects.maxMental > 0) {
        const mentalBonus = Math.floor(this.player.maxMental * this.skillTreeEffects.maxMental)
        this.player.maxMental += mentalBonus
      }
    },
    // 推进游戏时间
    advanceTime(minutes) {
      this.gameTime.minute += minutes
      while (this.gameTime.minute >= 60) {
        this.gameTime.minute -= 60
        this.gameTime.hour += 1
        this.hourlyUpdate()
      }
      while (this.gameTime.hour >= 24) {
        this.gameTime.hour -= 24
        this.gameTime.day += 1
        this.player.days += 1
        this.dailyUpdate()
      }
    },
    // 每小时更新
    hourlyUpdate() {
      this.applyWeatherEffects()
      let waterConsumptionRate = 1 * this.weather.effects.waterConsumption
      let foodConsumptionRate = 1 * this.weather.effects.foodConsumption
      if (this.skillTreeEffects.waterConsumption < 0) waterConsumptionRate *= (1 + this.skillTreeEffects.waterConsumption)
      if (this.skillTreeEffects.foodConsumption < 0) foodConsumptionRate *= (1 + this.skillTreeEffects.foodConsumption)
      const waterConsumption = Math.max(1, Math.ceil(waterConsumptionRate))
      const foodConsumption = Math.max(1, Math.ceil(foodConsumptionRate))
      this.consumeResource('water', waterConsumption)
      this.consumeResource('food', foodConsumption)
      this.applyBuildingEffectsHourly()
      let baseEnergyRecovery = this.gameTime.hour >= 22 || this.gameTime.hour <= 6 ? 5 : 1
      if (this.weather.current === 'hot' || this.weather.current === 'cold') baseEnergyRecovery *= 0.8
      this.player.energy = Math.min(this.player.energy + baseEnergyRecovery, this.player.maxEnergy)
      if (this.skillTreeEffects.healthRecovery > 0) {
        const healthRecovery = Math.floor(this.player.maxHealth * 0.01 * this.skillTreeEffects.healthRecovery)
        this.player.health = Math.min(this.player.health + healthRecovery, this.player.maxHealth)
      }
      if (this.skillTreeEffects.mentalRecovery > 0) {
        const mentalRecovery = Math.floor(this.player.maxMental * 0.01 * this.skillTreeEffects.mentalRecovery)
        this.player.mental = Math.min(this.player.mental + mentalRecovery, this.player.maxMental)
      }
      if (this.resources.food <= 0 || this.resources.water <= 0) {
        let healthPenalty = ['hot', 'cold', 'storm'].includes(this.weather.current) ? 8 : 5
        this.player.health -= healthPenalty
        this.addToEventLog(['hot', 'cold', 'storm'].includes(this.weather.current)
            ? `在${this.getWeatherName()}天气下，缺乏基本资源使你的健康迅速恶化！`
            : '你感到饥饿和口渴，健康下降了')
      }
      if (this.player.health <= 0) this.gameOver()
    },
    // 每日更新
    dailyUpdate() {
      this.triggerRandomEvent()
      this.applySeasonalEffects()
      this.applyBuildingEffectsDay()
      this.checkWeatherChange()
      if (this.player.health >= 90) {
        this.achievements.healthyDays += 1
      } else {
        this.achievements.healthyDays = 0
      }
      this.addToEventLog(`第${this.gameTime.day}天开始了`)
    },
    // 建造新建筑
    buildNewBuilding(buildingId, level) {
      const buildingConfig = availableBuildings().find(b => b.id === buildingId)
      if (!buildingConfig) {
        this.addToEventLog(`未找到建筑: ${buildingId}`)
        return false
      }
      const levelConfig = buildingConfig.levels.find(l => l.level === level)
      if (!levelConfig) {
        this.addToEventLog(`未找到建筑等级配置: ${buildingId} 等级 ${level}`)
        return false
      }
      for (const [skill, requiredLevel] of Object.entries(levelConfig.requirements)) {
        if (this.skills[skill] < requiredLevel) {
          this.addToEventLog(`你的${skill}技能等级不足，需要达到${requiredLevel}级`)
          return false
        }
      }
      for (const [resource, amount] of Object.entries(levelConfig.cost)) {
        if (!this.consumeResource(resource, amount)) {
          this.addToEventLog(`资源不足: ${resource}`)
          return false
        }
      }
      const existingBuildingIndex = this.buildings.findIndex(b => b.id === buildingId)
      if (existingBuildingIndex !== -1) {
        const existingBuilding = this.buildings[existingBuildingIndex]
        if (existingBuilding.level >= level) {
          this.addToEventLog(`${buildingConfig.name}已经是等级${existingBuilding.level}，无需重复建造`)
          return false
        }
        this.buildings[existingBuildingIndex] = {
          id: buildingId,
          name: buildingConfig.name,
          level: level,
          effects: { ...levelConfig.effects }
        }
        this.addToEventLog(`${buildingConfig.name}已升级到等级${level}`)
      } else {
        this.buildings.push({
          id: buildingId,
          name: buildingConfig.name,
          level: level,
          effects: { ...levelConfig.effects }
        })
        this.addToEventLog(`建造了${buildingConfig.name}(等级${level})`)
      }
      this.initBuildingEffects()
      return true
    },
    // 应用季节性效果
    applySeasonalEffects() {
      const day = this.gameTime.day
      const seasonLength = this.season.seasonLength
      const seasonIndex = Math.floor((day - 1) % (seasonLength * 4) / seasonLength)
      const seasonKeys = ['spring', 'summer', 'autumn', 'winter']
      const currentSeasonKey = seasonKeys[seasonIndex]
      this.updateSeasonEffects(currentSeasonKey)
      switch (seasonIndex) {
        case 0:
          if (Math.random() < 0.3 * this.season.effects.foodGrowthRate) {
            const foodAmount = Math.floor(Math.random() * 3) + 1
            this.addResource('food', foodAmount)
            this.addToEventLog(`春季植物生长旺盛，你额外获得了${foodAmount}单位食物`)
          }
          if (Math.random() < 0.4 * this.season.effects.herbGrowthRate) {
            const herbAmount = Math.floor(Math.random() * 2) + 1
            this.addResource('herb', herbAmount)
            this.addToEventLog(`春季草药生长旺盛，你额外获得了${herbAmount}单位草药`)
          }
          break
        case 1:
          if (Math.random() < 0.3 * this.season.effects.waterConsumption) {
            this.consumeResource('water', 1)
            this.addToEventLog('夏季高温导致额外的水分消耗')
          }
          if (Math.random() < 0.15) {
            const randomResource = ['metal', 'stone', 'fuel'][Math.floor(Math.random() * 3)]
            const amount = Math.floor(Math.random() * 2) + 1
            this.addResource(randomResource, amount)
            this.addToEventLog(`在炎热的夏季，你发现了${amount}单位${this.getResourceName(randomResource)}`)
          }
          break
        case 2:
          if (Math.random() < 0.3 * this.season.effects.foodGrowthRate) {
            const foodAmount = Math.floor(Math.random() * 4) + 2
            this.addResource('food', foodAmount)
            this.addToEventLog(`秋季是收获的季节，你额外获得了${foodAmount}单位食物`)
          }
          if (Math.random() < 0.2) {
            const woodAmount = Math.floor(Math.random() * 3) + 2
            this.addResource('wood', woodAmount)
            this.addToEventLog(`秋季落叶，你收集了${woodAmount}单位额外的木材`)
          }
          break
        case 3:
          if (Math.random() < 0.3 * this.season.effects.energyConsumption) {
            this.consumeResource('food', 1)
            this.addToEventLog('冬季寒冷导致额外的食物消耗')
          }
          if (Math.random() < 0.2 && this.player.mental > 10) {
            this.player.mental -= 2
            this.addToEventLog('漫长的冬季让你感到有些压抑')
          }
          break
      }
      this.checkSeasonChange(day, seasonLength, seasonIndex)
    },
    // 更新季节效果
    updateSeasonEffects(seasonKey) {
      const seasonEffects = {
        spring: { foodGrowthRate: 1.2, herbGrowthRate: 1.3, energyConsumption: 0.9, waterConsumption: 1.0, mentalRecovery: 1.1 },
        summer: { foodGrowthRate: 1.0, herbGrowthRate: 0.8, energyConsumption: 1.2, waterConsumption: 1.3, mentalRecovery: 0.9 },
        autumn: { foodGrowthRate: 1.4, herbGrowthRate: 0.7, energyConsumption: 1.0, waterConsumption: 0.9, mentalRecovery: 1.0 },
        winter: { foodGrowthRate: 0.6, herbGrowthRate: 0.4, energyConsumption: 1.3, waterConsumption: 0.8, mentalRecovery: 0.8 }
      }
      this.season.effects = seasonEffects[seasonKey]
    },
    // 检查季节变化
    checkSeasonChange(day, seasonLength, currentSeasonIndex) {
      const previousDay = day - 1
      if (previousDay < 1) return
      const previousSeasonIndex = Math.floor((previousDay - 1) % (seasonLength * 4) / seasonLength)
      if (previousSeasonIndex !== currentSeasonIndex) {
        const seasonNames = ['春季', '夏季', '秋季', '冬季']
        this.addToEventLog(`季节已变为${seasonNames[currentSeasonIndex]}`)
        this.triggerSeasonChangeEvent(currentSeasonIndex)
      }
    },
    // 季节变化特殊事件
    triggerSeasonChangeEvent(seasonIndex) {
      switch (seasonIndex) {
        case 0:
          if (Math.random() < 0.4) {
            const herbAmount = Math.floor(Math.random() * 5) + 3
            this.addResource('herb', herbAmount)
            this.addToEventLog(`春季到来，你发现了${herbAmount}单位新鲜草药`)
          }
          break
        case 1:
          if (Math.random() < 0.4) {
            const waterAmount = Math.floor(Math.random() * 5) + 3
            this.addResource('water', waterAmount)
            this.addToEventLog(`夏季雷雨增多，你收集了${waterAmount}单位额外的水`)
          }
          break
        case 2:
          if (Math.random() < 0.4) {
            const foodAmount = Math.floor(Math.random() * 8) + 5
            this.addResource('food', foodAmount)
            this.addToEventLog(`秋季丰收，你获得了${foodAmount}单位额外的食物`)
          }
          break
        case 3:
          if (Math.random() < 0.4) {
            const fuelAmount = Math.floor(Math.random() * 3) + 2
            this.addResource('fuel', fuelAmount)
            this.addToEventLog(`冬季来临，你准备了${fuelAmount}单位额外的燃料`)
          }
          break
      }
    },
    // 获取资源名称
    getResourceName(resourceKey) {
      const resourceNames = {
        exp: '幸存者经验',
        maxMental: '最大精神值',
        maxHealth: '最大健康值',
        maxEnergy: '最大体力值',
        mental: '精神值',
        health: '健康值',
        energy: '体力值',
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
        rope: '绳索',
        rare_herb: '稀有草药',
        crystal: '水晶',
      }
      return resourceNames[resourceKey] || resourceKey
    },
    // 检查是否需要更新天气
    checkWeatherChange() {
      const currentDay = this.gameTime.day
      const currentHour = this.gameTime.hour
      if (currentDay > this.weather.nextChangeDay || (currentDay === this.weather.nextChangeDay && currentHour >= this.weather.nextChangeHour)) this.generateWeather()
    },
    // 生成天气
    generateWeather() {
      const day = this.gameTime.day
      const seasonLength = 30
      const seasonIndex = Math.floor((day - 1) % (seasonLength * 4) / seasonLength)
      const seasons = ['spring', 'summer', 'autumn', 'winter']
      const currentSeason = seasons[seasonIndex]
      const weatherProbabilities = {
        spring: { clear: 0.3, cloudy: 0.3, rainy: 0.25, foggy: 0.1, windy: 0.05 },
        summer: { clear: 0.4, cloudy: 0.2, rainy: 0.15, hot: 0.15, storm: 0.1 },
        autumn: { clear: 0.25, cloudy: 0.3, rainy: 0.2, foggy: 0.15, windy: 0.1 },
        winter: { clear: 0.2, cloudy: 0.2, cold: 0.3, snow: 0.2, windy: 0.1 }
      }
      const probabilities = weatherProbabilities[currentSeason]
      let random = Math.random()
      let cumulativeProbability = 0
      let selectedWeather = 'clear'
      for (const [weather, probability] of Object.entries(probabilities)) {
        cumulativeProbability += probability
        if (random <= cumulativeProbability) {
          selectedWeather = weather
          break
        }
      }
      const oldWeather = this.weather.current
      this.weather.current = selectedWeather
      this.weather.duration = 4 + Math.floor(Math.random() * 5)
      let nextHour = this.gameTime.hour + this.weather.duration
      let nextDay = this.gameTime.day
      while (nextHour >= 24) {
        nextHour -= 24
        nextDay += 1
      }
      this.weather.nextChangeDay = nextDay
      this.weather.nextChangeHour = nextHour
      if (oldWeather !== selectedWeather) this.addToEventLog(`天气变为${this.getWeatherName()}，${this.getWeatherEffect()}`)
      this.resetWeatherEffects()
    },
    // 获取天气名称
    getWeatherName() {
      const weatherNames = {
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
    // 获取天气对建筑效果的影响
    getWeatherBuildingMultiplier() {
      const weatherEffects = {
        clear: { production: 1.2, waterCollection: 0.8, protection: 1.0 },
        cloudy: { production: 1.0, waterCollection: 1.0, protection: 1.0 },
        rainy: { production: 0.9, waterCollection: 1.5, protection: 0.9 },
        foggy: { production: 0.8, waterCollection: 1.0, protection: 0.8 },
        windy: { production: 0.9, waterCollection: 1.2, protection: 0.7 },
        hot: { production: 0.8, waterCollection: 0.5, protection: 0.8 },
        cold: { production: 0.7, waterCollection: 0.7, protection: 0.7 },
        snow: { production: 0.6, waterCollection: 0.6, protection: 0.6 },
        storm: { production: 0.5, waterCollection: 1.8, protection: 0.5 },
        heavyRain: { production: 0.7, waterCollection: 2.0, protection: 0.7 }
      }
      return weatherEffects[this.weather.current] || { production: 1.0, waterCollection: 1.0, protection: 1.0 }
    },
    // 获取天气效果描述
    getWeatherEffect() {
      const weatherEffects = {
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
      return weatherEffects[this.weather.current] || ''
    },
    // 重置天气效果
    resetWeatherEffects() {
      this.weather.effects = {
        gatheringEfficiency: 1.0,
        energyConsumption: 1.0,
        waterConsumption: 1.0,
        foodConsumption: 1.0,
        movementSpeed: 1.0,
        explorationEfficiency: 1.0
      }
    },
    // 应用天气效果
    applyWeatherEffects() {
      switch (this.weather.current) {
        case 'clear':
          this.weather.effects.gatheringEfficiency = 1.1
          break
        case 'cloudy':
          this.weather.effects.energyConsumption = 0.95
          break
        case 'rainy':
          if (Math.random() < 0.2) {
            const waterAmount = Math.floor(Math.random() * 3) + 1
            this.addResource('water', waterAmount)
          }
          this.weather.effects.movementSpeed = 0.9
          break
        case 'heavyRain':
          if (Math.random() < 0.4) {
            const waterAmount = Math.floor(Math.random() * 5) + 2
            this.addResource('water', waterAmount)
          }
          if (Math.random() < 0.05) {
            this.addToEventLog('暴雨引发了洪水，你损失了一些资源！')
            const resources = ['food', 'wood', 'herb']
            const randomResource = resources[Math.floor(Math.random() * resources.length)]
            const lossAmount = Math.floor(Math.random() * 5) + 1
            this.consumeResource(randomResource, lossAmount)
          }
          this.weather.effects.gatheringEfficiency = 0.7
          this.weather.effects.movementSpeed = 0.7
          this.achievements.extremeWeatherSurvived = true
          break
        case 'foggy':
          this.weather.effects.explorationEfficiency = 0.8
          break
        case 'windy':
          this.weather.effects.energyConsumption = 1.1
          if (Math.random() < 0.1) {
            const specialResources = ['metal', 'parts', 'techFragment']
            const randomResource = specialResources[Math.floor(Math.random() * specialResources.length)]
            this.addResource(randomResource, 1)
            this.addToEventLog(`大风带来了一些特殊资源，你获得了1单位${randomResource}！`)
          }
          break
        case 'hot':
          this.weather.effects.waterConsumption = 1.3
          if (Math.random() < 0.1 && this.resources.water < 5) {
            this.player.health -= 5
            this.addToEventLog('酷热天气导致你中暑，健康下降了！')
          }
          this.achievements.extremeWeatherSurvived = true
          break
        case 'cold':
          this.weather.effects.foodConsumption = 1.3
          if (Math.random() < 0.1 && this.resources.food < 5) {
            this.player.health -= 5
            this.addToEventLog('寒冷天气导致你受冻，健康下降了！')
          }
          this.achievements.extremeWeatherSurvived = true
          break
        case 'snow':
          this.weather.effects.movementSpeed = 0.7
          this.weather.effects.gatheringEfficiency = 0.8
          this.weather.effects.foodConsumption = 1.2
          break
        case 'storm':
          if (this.skillTreeEffects.weatherResistance > 0) {
            const resistance = this.skillTreeEffects.weatherResistance
            if (this.weather.effects.gatheringEfficiency < 1.0) this.weather.effects.gatheringEfficiency = Math.min(1.0, this.weather.effects.gatheringEfficiency * (1 + resistance))
            if (this.weather.effects.energyConsumption > 1.0) this.weather.effects.energyConsumption = Math.max(1.0, this.weather.effects.energyConsumption / (1 + resistance))
            if (this.weather.effects.waterConsumption > 1.0) this.weather.effects.waterConsumption = Math.max(1.0, this.weather.effects.waterConsumption / (1 + resistance))
            if (this.weather.effects.foodConsumption > 1.0) this.weather.effects.foodConsumption = Math.max(1.0, this.weather.effects.foodConsumption / (1 + resistance))
            if (this.weather.effects.movementSpeed < 1.0) this.weather.effects.movementSpeed = Math.min(1.0, this.weather.effects.movementSpeed * (1 + resistance))
            if (this.weather.effects.explorationEfficiency < 1.0) this.weather.effects.explorationEfficiency = Math.min(1.0, this.weather.effects.explorationEfficiency * (1 + resistance))
          }
          if (Math.random() < 0.2) {
            const hasShelter = this.buildings.some(b => b.id === 'shelter' && b.level >= 1)
            if (hasShelter) {
              this.addToEventLog('风暴肆虐，但你的庇护所提供了保护。')
              this.player.mental -= 5
            } else {
              this.addToEventLog('风暴肆虐，你的健康和精神都受到了严重影响！')
              this.player.health -= 10
              this.player.mental -= 15
              const resources = ['food', 'water', 'wood', 'herb']
              for (let i = 0; i < 2; i++) {
                const randomResource = resources[Math.floor(Math.random() * resources.length)]
                const lossAmount = Math.floor(Math.random() * 5) + 3
                this.consumeResource(randomResource, lossAmount)
              }
            }
          }
          this.achievements.extremeWeatherSurvived = true
          break
      }
    },
    // 应用建筑效果(每天)
    applyBuildingEffectsDay() {
      const seasonMultiplier = this.calculateSeasonBuildingMultiplier()
      const weatherMultiplier = this.getWeatherBuildingMultiplier()
      for (const building of this.buildings) {
        if (!building.effects) continue
        if (building.effects.foodPerDay) {
          const amount = Math.ceil(building.effects.foodPerDay * seasonMultiplier.production * weatherMultiplier.production)
          this.addResource('food', amount)
          this.addToEventLog(`${building.name}提供了${amount}单位食物`)
        }
        if (building.effects.waterPerDay) {
          const amount = Math.ceil(building.effects.waterPerDay * weatherMultiplier.waterCollection)
          this.addResource('water', amount)
          this.addToEventLog(`${building.name}提供了${amount}单位水`)
        }
        if (building.effects.woodPerDay) {
          const amount = Math.ceil(building.effects.woodPerDay * seasonMultiplier.production)
          this.addResource('wood', amount)
          this.addToEventLog(`${building.name}提供了${amount}单位木材`)
        }
        if (building.effects.stonePerDay) {
          const amount = Math.ceil(building.effects.stonePerDay * seasonMultiplier.production)
          this.addResource('stone', amount)
          this.addToEventLog(`${building.name}提供了${amount}单位石头`)
        }
        if (building.effects.metalPerDay) {
          const amount = Math.ceil(building.effects.metalPerDay * seasonMultiplier.production)
          this.addResource('metal', amount)
          this.addToEventLog(`${building.name}提供了${amount}单位金属`)
        }
        if (building.effects.herbPerDay) {
          const amount = Math.ceil(building.effects.herbPerDay * seasonMultiplier.production)
          this.addResource('herb', amount)
          this.addToEventLog(`${building.name}提供了${amount}单位草药`)
        }
        if (building.effects.medicinePerDay) {
          this.addResource('medicine', building.effects.medicinePerDay)
          this.addToEventLog(`${building.name}提供了${building.effects.medicinePerDay}单位药品`)
        }
        if (building.effects.toolsPerDay) {
          this.addResource('tools', building.effects.toolsPerDay)
          this.addToEventLog(`${building.name}提供了${building.effects.toolsPerDay}单位工具`)
        }
        if (building.effects.partsPerDay) {
          this.addResource('parts', building.effects.partsPerDay)
          this.addToEventLog(`${building.name}提供了${building.effects.partsPerDay}单位零件`)
        }
        if (building.effects.fuelPerDay) {
          this.addResource('fuel', building.effects.fuelPerDay)
          this.addToEventLog(`${building.name}提供了${building.effects.fuelPerDay}单位燃料`)
        }
      }
    },
    // 初始化建筑效果
    initBuildingEffects() {
      this.resetResourceLimits()
      for (const building of this.buildings) {
        if (!building.effects) continue
        if (building.effects.storageMultiplier) {
          for (const resource in this.resourceLimits) {
            this.resourceLimits[resource] *= building.effects.storageMultiplier
          }
        }
        if (building.effects.maxHealth) this.player.maxHealth += building.effects.maxHealth
        if (building.effects.maxEnergy) this.player.maxEnergy += building.effects.maxEnergy
        if (building.effects.maxMental) this.player.maxMental += building.effects.maxMental
      }
    },
    // 重置资源上限到基础值
    resetResourceLimits() {
      this.resourceLimits = {
        food: 50,
        water: 50,
        wood: 50,
        stone: 50,
        metal: 50,
        herb: 30,
        medicine: 20,
        tools: 10,
        parts: 10,
        fuel: 20,
        ancientRelic: 5,
        techFragment: 5,
      }
    },
    // 应用建筑的小时效果
    applyBuildingEffectsHourly() {
      const seasonMultiplier = this.calculateSeasonBuildingMultiplier()
      for (const building of this.buildings) {
        if (!building.effects) continue
        if (building.effects.energyRecovery) {
          const recovery = building.effects.energyRecovery * seasonMultiplier.energy
          this.player.energy = Math.min(this.player.energy + recovery, this.player.maxEnergy)
        }
        if (building.effects.mentalRecovery) {
          const recovery = building.effects.mentalRecovery * seasonMultiplier.mental
          this.player.mental = Math.min(this.player.mental + recovery, this.player.maxMental)
        }
        if (building.effects.healthRecovery) {
          const recovery = building.effects.healthRecovery * seasonMultiplier.health
          this.player.health = Math.min(this.player.health + recovery, this.player.maxHealth)
        }
      }
    },
    // 计算季节对建筑效果的影响
    calculateSeasonBuildingMultiplier() {
      const day = this.gameTime.day
      const seasonLength = this.season.seasonLength
      const seasonIndex = Math.floor((day - 1) % (seasonLength * 4) / seasonLength)
      const seasonMultipliers = [
        { energy: 1.1, mental: 1.2, health: 1.1, production: 1.2 },
        { energy: 0.9, mental: 1.0, health: 1.0, production: 1.3 },
        { energy: 1.0, mental: 0.9, health: 1.0, production: 1.4 },
        { energy: 0.8, mental: 0.7, health: 0.9, production: 0.7 }
      ]
      return seasonMultipliers[seasonIndex]
    },
    // 触发随机事件
    triggerRandomEvent() {
      const basicEvents = [
        { id: 'rain', name: '下雨了', effect: () => { this.addResource('water', 10); this.addToEventLog('下雨了，你收集了一些雨水') }, weight: 10 },
        { id: 'animal', name: '野生动物', effect: () => { if (this.skills.combat > 2) { this.addResource('food', 15); this.addToEventLog('你成功猎到了一只野兔，获得了食物') } else { this.addToEventLog('你看到一只野兔，但它跑得太快了') } }, weight: 8 },
        { id: 'stranger', name: '陌生人', effect: () => { this.addToEventLog('你遇到了一个陌生人，他给了你一些建议就离开了'); this.addSkillExp('survival', 2) }, weight: 6 },
        { id: 'wild_fruits', name: '野果丰收', effect: () => { this.addResource('food', 8); this.addToEventLog('你发现了一片野果丛，收获了不少食物') }, weight: 10 },
        { id: 'herb_discovery', name: '草药发现', effect: () => { this.addResource('herb', 5); this.addToEventLog('你发现了一片罕见的草药，这对制作药品很有帮助') }, weight: 7 },
      ]
      const dangerEvents = [
        { id: 'storm', name: '暴风雨', effect: () => { const hasShelter = this.buildings.some(b => b.id === 'shelter' && b.level >= 1); if (hasShelter) { this.addToEventLog('一场暴风雨来袭，但你的庇护所提供了良好的保护'); this.player.mental -= 5 } else { this.addToEventLog('一场暴风雨来袭，你被淋得浑身湿透，精神和健康都受到了影响'); this.player.health -= 10; this.player.mental -= 15 } }, weight: 5, minDay: 3 },
        { id: 'illness', name: '疾病', effect: () => { if (this.resources.medicine > 0) { this.consumeResource('medicine', 1); this.addToEventLog('你感到身体不适，但幸好有药品治疗，很快就恢复了') } else { this.player.health -= 15; this.player.energy -= 20; this.addToEventLog('你生病了，没有药品治疗，健康状况恶化') } }, weight: 4, minDay: 5 },
        { id: 'predator', name: '掠食者', effect: () => { if (this.skills.combat >= 3) { this.addToEventLog('一只野兽袭击了你，但你成功击退了它，还获得了一些食物'); this.addResource('food', 20); this.addSkillExp('combat', 2) } else { this.player.health -= 20; this.addToEventLog('一只野兽袭击了你，你勉强逃脱，但受了伤') } }, weight: 3, minDay: 7 },
      ]
      const luckyEvents = [
        { id: 'abandoned_supplies', name: '废弃物资', effect: () => { this.addResource('food', 10); this.addResource('water', 10); this.addResource('medicine', 1); this.addToEventLog('你发现了一些废弃的物资，获得了食物、水和药品') }, weight: 3, minDay: 4 },
        { id: 'tech_discovery', name: '科技发现', effect: () => { this.addResource('techFragment', 2); this.addToEventLog('你发现了一些古老的科技碎片，这对研究很有帮助') }, weight: 2, minDay: 10 },
        { id: 'ancient_cache', name: '古代宝藏', effect: () => { this.addResource('ancientRelic', 1); this.addResource('metal', 15); this.addResource('parts', 3); this.addToEventLog('你发现了一个古代文明的宝藏，获得了珍贵的资源') }, weight: 1, minDay: 15 },
      ]
      let availableEvents = [...basicEvents]
      if (this.gameTime.day >= 3) availableEvents = availableEvents.concat(dangerEvents.filter(e => this.gameTime.day >= (e.minDay || 0)))
      if (this.gameTime.day >= 4) availableEvents = availableEvents.concat(luckyEvents.filter(e => this.gameTime.day >= (e.minDay || 0)))
      const totalWeight = availableEvents.reduce((sum, event) => sum + (event.weight || 1), 0)
      if (Math.random() < 0.25) {
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
      this.addToEventLog('你没能生存下来...')
    },
    // 添加事件日志
    addToEventLog(message) {
      const timestamp = `${this.gameTime.day}天 ${this.gameTime.hour}:${this.gameTime.minute}`
      this.eventLog.unshift({ timestamp, message })
      if (this.eventLog.length > 100) this.eventLog.pop()
    },
  },
  persist: {
    // 使用 pinia-plugin-persistedstate 的默认配置
    key: __APP_NAME__, // 存储的键名
    storage: localStorage, // 使用 localStorage
    serializer: {
      serialize: (state) => {
        const filteredState = omit(state, ['eventLog', 'currentActivities'])
        const encryptedData = encryptData(filteredState)
        const encodedAppName = btoa(`+++${__APP_NAME__}`)
        return `${encryptedData}${encodedAppName}`
      },
      deserialize: (value) => {
        const encodedAppName = btoa(`+++${__APP_NAME__}`)
        const saveData = value.replace(encodedAppName, '');
        return decryptData(saveData)
      }
    }
  }
})