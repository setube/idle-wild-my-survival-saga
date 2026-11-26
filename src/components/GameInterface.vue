<script setup lang="ts">
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
import { ElMessage, ElMessageBox } from 'element-plus'
import type { UploadRequestOptions } from 'element-plus'
import { saveAs } from 'file-saver'
import { getEnergyRecovery } from '../plugins/energyMechanics'

const gameStore = useGameStore()
const gameTimerId = ref<ReturnType<typeof setInterval> | null>(null)

const gameState = computed(() => gameStore.gameState)
const isGameOver = computed(() => gameStore.gameState === 'gameover')
const playerDays = computed(() => gameStore.player.days)
const handleGameOverVisibilityChange = (visible: boolean) => {
	gameStore.gameState = visible ? 'gameover' : 'playing'
}
const restartFromGameOver = () => gameStore.initGame()

// 中央面板标签页
const centerPanelTab = ref<string | number>('activity')

// 推进游戏时间
const advanceTime = (minutes: number) => {
	gameStore.gameTime.minute += minutes
	// 处理时间进位
	while (gameStore.gameTime.minute >= 60) {
		gameStore.gameTime.minute -= 60
		gameStore.gameTime.hour += 1
		// 每小时消耗水和食物
		hourlyUpdate()
	}
	while (gameStore.gameTime.hour >= 24) {
		gameStore.gameTime.hour -= 24
		gameStore.gameTime.day += 1
		gameStore.player.days += 1
		gameStore.eventTriggered = false
		// 每日更新
		dailyUpdate()
	}
}

// 计算季节对建筑效果的影响
const calculateSeasonBuildingMultiplier = () => {
	const day = gameStore.gameTime.day
	const seasonLength = gameStore.season.seasonLength
	const seasonIndex = Math.floor((day - 1) % (seasonLength * 4) / seasonLength)
	// 季节对建筑效果的影响
	const seasonMultipliers = [
		// 春季 - 适中
		{ energy: 1.1, health: 1.1, production: 1.2 },
		// 夏季 - 体力消耗高，生产高
		{ energy: 0.9, health: 1.0, production: 1.3 },
		// 秋季 - 生产最高
		{ energy: 1.0, health: 1.0, production: 1.4 },
		// 冬季 - 各方面都受限
		{ energy: 0.8, health: 0.9, production: 0.7 }
	]
	return seasonMultipliers[seasonIndex]
}

// 应用建筑的小时效果
const applyBuildingEffectsHourly = () => {
	// 计算季节对建筑效果的影响
	const seasonMultiplier = calculateSeasonBuildingMultiplier()
	// 获取天气对建筑生产的影响
	const weatherMultiplier = getWeatherBuildingMultiplier()
	const { building: buildingEnergyRecovery } = getEnergyRecovery(gameStore.$state)
	gameStore.player.energy = Math.min(gameStore.player.energy + buildingEnergyRecovery, gameStore.player.maxEnergy)
	// 遍历所有建筑
	for (const building of gameStore.buildings) {
		if (!building.effects) continue
		// 应用每日资源生产（考虑季节和天气影响）
		if (building.effects.foodPerDay) {
			const amount = Math.ceil(building.effects.foodPerDay * seasonMultiplier.production * weatherMultiplier.production)
			gameStore.addResource('food', amount)
			gameStore.addToEventLog(`${building.name}提供了${amount}单位食物`)
		}
		if (building.effects.waterPerDay) {
			const amount = Math.ceil(building.effects.waterPerDay * weatherMultiplier.waterCollection)
			gameStore.addResource('water', amount)
			gameStore.addToEventLog(`${building.name}提供了${amount}单位水`)
		}
		// 应用健康恢复效果
		if (building.effects.healthRecovery) {
			const recovery = building.effects.healthRecovery * seasonMultiplier.health
			gameStore.player.health = Math.min(gameStore.player.health + recovery, gameStore.player.maxHealth)
		}
	}
}

// 获取天气对建筑效果的影响
const getWeatherBuildingMultiplier = () => {
	// 不同天气对建筑效果的影响
	const weatherEffects: Record<string, { production: number; waterCollection: number; protection: number }> = {
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
	return weatherEffects[gameStore.weather.current] || { production: 1.0, waterCollection: 1.0, protection: 1.0 }
}

// 应用建筑效果(每天)
const applyBuildingEffectsDay = () => {
	// 获取季节对建筑生产的影响
	const seasonMultiplier = calculateSeasonBuildingMultiplier()
	// 遍历所有建筑
	for (const building of gameStore.buildings) {
		if (!building.effects) continue
		// 应用其他资源生产
		if (building.effects.woodPerDay) {
			const amount = Math.ceil(building.effects.woodPerDay * seasonMultiplier.production)
			gameStore.addResource('wood', amount)
			gameStore.addToEventLog(`${building.name}提供了${amount}单位木材`)
		}
		if (building.effects.stonePerDay) {
			const amount = Math.ceil(building.effects.stonePerDay * seasonMultiplier.production)
			gameStore.addResource('stone', amount)
			gameStore.addToEventLog(`${building.name}提供了${amount}单位石头`)
		}
		if (building.effects.metalPerDay) {
			const amount = Math.ceil(building.effects.metalPerDay * seasonMultiplier.production)
			gameStore.addResource('metal', amount)
			gameStore.addToEventLog(`${building.name}提供了${amount}单位金属`)
		}
		if (building.effects.herbPerDay) {
			const amount = Math.ceil(building.effects.herbPerDay * seasonMultiplier.production)
			gameStore.addResource('herb', amount)
			gameStore.addToEventLog(`${building.name}提供了${amount}单位草药`)
		}
		// 高级资源生产
		if (building.effects.medicinePerDay) {
			gameStore.addResource('medicine', building.effects.medicinePerDay)
			gameStore.addToEventLog(`${building.name}提供了${building.effects.medicinePerDay}单位药品`)
		}
		if (building.effects.toolsPerDay) {
			gameStore.addResource('tools', building.effects.toolsPerDay)
			gameStore.addToEventLog(`${building.name}提供了${building.effects.toolsPerDay}单位工具`)
		}
		if (building.effects.partsPerDay) {
			gameStore.addResource('parts', building.effects.partsPerDay)
			gameStore.addToEventLog(`${building.name}提供了${building.effects.partsPerDay}单位零件`)
		}
		if (building.effects.fuelPerDay) {
			gameStore.addResource('fuel', building.effects.fuelPerDay)
			gameStore.addToEventLog(`${building.name}提供了${building.effects.fuelPerDay}单位燃料`)
		}
	}
}

// 更新季节效果
const updateSeasonEffects = (seasonKey: 'spring' | 'summer' | 'autumn' | 'winter') => {
	const seasonEffects = {
		spring: {
			foodGrowthRate: 1.2,
			herbGrowthRate: 1.3,
			energyConsumption: 0.9,
			waterConsumption: 1.0
		},
		summer: {
			foodGrowthRate: 1.0,
			herbGrowthRate: 0.8,
			energyConsumption: 1.2,
			waterConsumption: 1.3
		},
		autumn: {
			foodGrowthRate: 1.4,
			herbGrowthRate: 0.7,
			energyConsumption: 1.0,
			waterConsumption: 0.9
		},
		winter: {
			foodGrowthRate: 0.6,
			herbGrowthRate: 0.4,
			energyConsumption: 1.3,
			waterConsumption: 0.8
		}
	}
	gameStore.season.effects = seasonEffects[seasonKey]
}

// 应用季节性效果
const applySeasonalEffects = () => {
	const day = gameStore.gameTime.day
	const seasonLength = gameStore.season.seasonLength
	const seasonIndex = Math.floor((day - 1) % (seasonLength * 4) / seasonLength)
	const seasonKeys = ['spring', 'summer', 'autumn', 'winter'] as const
	const currentSeasonKey = seasonKeys[seasonIndex]
	// 更新季节效果
	updateSeasonEffects(currentSeasonKey)
	// 根据季节应用不同效果
	switch (seasonIndex) {
		case 0: // 春季
			// 植物生长旺盛
			if (Math.random() < 0.3 * gameStore.season.effects.foodGrowthRate) {
				const foodAmount = Math.floor(Math.random() * 3) + 1
				gameStore.addResource('food', foodAmount)
				gameStore.addToEventLog(`春季植物生长旺盛，你额外获得了${foodAmount}单位食物`)
			}
			if (Math.random() < 0.4 * gameStore.season.effects.herbGrowthRate) {
				const herbAmount = Math.floor(Math.random() * 2) + 1
				gameStore.addResource('herb', herbAmount)
				gameStore.addToEventLog(`春季草药生长旺盛，你额外获得了${herbAmount}单位草药`)
			}
			break
		case 1: // 夏季
			// 高温导致水分消耗增加
			if (Math.random() < 0.3 * gameStore.season.effects.waterConsumption) {
				gameStore.consumeResource('water', 1)
				gameStore.addToEventLog('夏季高温导致额外的水分消耗')
			}
			// 夏季可能发现特殊资源
			if (Math.random() < 0.15) {
				const randomResource = ['metal', 'stone', 'fuel'][Math.floor(Math.random() * 3)]
				const amount = Math.floor(Math.random() * 2) + 1
				gameStore.addResource(randomResource, amount)
				gameStore.addToEventLog(`在炎热的夏季，你发现了${amount}单位${gameStore.getResourceName(randomResource)}`)
			}
			break
		case 2: // 秋季
			// 收获季节
			if (Math.random() < 0.3 * gameStore.season.effects.foodGrowthRate) {
				const foodAmount = Math.floor(Math.random() * 4) + 2
				gameStore.addResource('food', foodAmount)
				gameStore.addToEventLog(`秋季是收获的季节，你额外获得了${foodAmount}单位食物`)
			}
			// 秋季可能找到额外的木材
			if (Math.random() < 0.2) {
				const woodAmount = Math.floor(Math.random() * 3) + 2
				gameStore.addResource('wood', woodAmount)
				gameStore.addToEventLog(`秋季落叶，你收集了${woodAmount}单位额外的木材`)
			}
			break
		case 3: // 冬季
			// 寒冷导致食物消耗增加
			if (Math.random() < 0.3 * gameStore.season.effects.energyConsumption) {
				gameStore.consumeResource('food', 1)
				gameStore.addToEventLog('冬季寒冷导致额外的食物消耗')
			}
			// 冬季健康状态可能下降
			if (Math.random() < 0.2 && gameStore.player.health > 10) {
				gameStore.player.health -= 2
				gameStore.addToEventLog('漫长的冬季让你感到有些压抑')
			}
			break
	}
	// 季节变化检测
	checkSeasonChange(day, seasonLength, seasonIndex)
}

// 检查季节变化
const checkSeasonChange = (day: number, seasonLength: number, currentSeasonIndex: number) => {
	// 计算前一天的季节索引
	const previousDay = day - 1
	if (previousDay < 1) return // 游戏第一天，不检查
	const previousSeasonIndex = Math.floor((previousDay - 1) % (seasonLength * 4) / seasonLength)
	// 如果季节发生变化
	if (previousSeasonIndex !== currentSeasonIndex) {
		const seasonNames = ['春季', '夏季', '秋季', '冬季']
		gameStore.addToEventLog(`季节已变为${seasonNames[currentSeasonIndex]}`)
		// 季节变化特殊事件
		triggerSeasonChangeEvent(currentSeasonIndex)
	}
}

// 季节变化特殊事件
const triggerSeasonChangeEvent = (seasonIndex: number) => {
	// 根据季节触发不同的特殊事件
	switch (seasonIndex) {
		case 0: // 春季开始
			if (Math.random() < 0.4) {
				const herbAmount = Math.floor(Math.random() * 5) + 3
				gameStore.addResource('herb', herbAmount)
				gameStore.addToEventLog(`春季到来，你发现了${herbAmount}单位新鲜草药`)
			}
			break
		case 1: // 夏季开始
			if (Math.random() < 0.4) {
				const waterAmount = Math.floor(Math.random() * 5) + 3
				gameStore.addResource('water', waterAmount)
				gameStore.addToEventLog(`夏季雷雨增多，你收集了${waterAmount}单位额外的水`)
			}
			break
		case 2: // 秋季开始
			if (Math.random() < 0.4) {
				const foodAmount = Math.floor(Math.random() * 8) + 5
				gameStore.addResource('food', foodAmount)
				gameStore.addToEventLog(`秋季丰收，你获得了${foodAmount}单位额外的食物`)
			}
			break
		case 3: // 冬季开始
			if (Math.random() < 0.4) {
				const fuelAmount = Math.floor(Math.random() * 3) + 2
				gameStore.addResource('fuel', fuelAmount)
				gameStore.addToEventLog(`冬季来临，你准备了${fuelAmount}单位额外的燃料`)
			}
			break
	}
}

// 每日更新
const dailyUpdate = () => {
	// 随机事件
	gameStore.triggerRandomEvent()
	// 季节性资源自然恢复
	applySeasonalEffects()
	// 应用建筑效果(每天)
	applyBuildingEffectsDay()
	// 检查是否需要更新天气
	gameStore.checkWeatherChange()
	// 更新成就系统的健康天数计数
	if (gameStore.player.health >= (gameStore.player.health * 0.9)) {
		gameStore.achievements.healthyDays += 1
	} else {
		gameStore.achievements.healthyDays = 0 // 重置连续健康天数
	}
	if (gameStore.availableMerchants().length) {
		gameStore.addToEventLog(`今天有商人出现`)
	}
	gameStore.addToEventLog(`第${gameStore.gameTime.day}天开始了`)
	// 自动保存
	if (gameStore.settings.autoSave) gameStore.saveGame()
}

// 每小时更新
const hourlyUpdate = () => {
	// 应用天气效果
	applyWeatherEffects()
	// 消耗基本资源（考虑天气和技能影响）
	let waterConsumptionRate = 1 * gameStore.weather.effects.waterConsumption
	let foodConsumptionRate = 1 * gameStore.weather.effects.foodConsumption
	// 应用技能效果 - 水和食物消耗减少
	if (gameStore.skillTreeEffects.waterConsumption < 0) waterConsumptionRate *= (1 + gameStore.skillTreeEffects.waterConsumption) // 负值表示减少消耗
	if (gameStore.skillTreeEffects.foodConsumption < 0) foodConsumptionRate *= (1 + gameStore.skillTreeEffects.foodConsumption) // 负值表示减少消耗
	const waterConsumption = Math.max(1, Math.ceil(waterConsumptionRate)) // 至少消耗1点
	const foodConsumption = Math.max(1, Math.ceil(foodConsumptionRate)) // 至少消耗1点
	gameStore.consumeResource('water', waterConsumption)
	gameStore.consumeResource('food', foodConsumption)
	// 应用建筑的小时效果
	applyBuildingEffectsHourly()
	// 与体力说明共用同一恢复公式。
	const { natural: baseEnergyRecovery } = getEnergyRecovery(gameStore.$state)
	// 应用基础体力恢复
	gameStore.player.energy = Math.min(gameStore.player.energy + baseEnergyRecovery, gameStore.player.maxEnergy)
	// 应用技能中的健康恢复效果
	if (gameStore.skillTreeEffects.healthRecovery > 0) {
		const healthRecovery = Math.floor(gameStore.player.maxHealth * 0.01 * gameStore.skillTreeEffects.healthRecovery)
		gameStore.player.health = Math.min(gameStore.player.health + healthRecovery, gameStore.player.maxHealth)
	}
	// 检查资源状态并影响健康
	if (gameStore.resources.food == 0 || gameStore.resources.water == 0) {
		// 极端天气下，缺乏资源的影响更严重
		let healthPenalty = 0.05
		if (['hot', 'cold', 'storm'].includes(gameStore.weather.current)) {
			healthPenalty = 0.08
			gameStore.addToEventLog(`在${gameStore.getWeatherName()}天气下，缺乏基本资源使你的健康迅速恶化！`)
		} else {
			gameStore.addToEventLog('你感到饥饿和口渴，健康下降了')
		}
		gameStore.player.health -= gameStore.player.maxHealth * healthPenalty
		gameStore.player.energy -= gameStore.player.maxEnergy * healthPenalty
	}
	// 检查游戏结束条件
	if (gameStore.player.health <= 0) gameStore.gameOver()
}

// 应用天气效果
const applyWeatherEffects = () => {
	// 根据当前天气应用不同效果
	switch (gameStore.weather.current) {
		case 'clear':
			gameStore.weather.effects.gatheringEfficiency = 1.1 // 采集效率+10%
			break
		case 'cloudy':
			gameStore.weather.effects.energyConsumption = 0.95 // 体力消耗-5%
			break
		case 'rainy':
			// 下雨时随机增加水资源
			if (Math.random() < 0.2) {
				const lossAmount = Math.floor(gameStore.resources.water * 0.2)
				gameStore.addResource('water', lossAmount)
			}
			break
		case 'heavyRain':
			// 暴雨时更多水资源，但有洪水风险
			if (Math.random() < 0.4) {
				const waterAmount = Math.floor(gameStore.resources.water * 0.4)
				gameStore.addResource('water', waterAmount)
			}
			// 洪水风险
			if (Math.random() < 0.05) {
				// 随机损失资源
				const resources = ['food', 'wood', 'herb']
				const randomResource = resources[Math.floor(Math.random() * resources.length)]
				const lossAmount = Math.floor(gameStore.resources[randomResource] * 0.05)
				gameStore.consumeResource(randomResource, lossAmount)
				gameStore.addToEventLog(`暴雨引发了洪水，你损失了${lossAmount}%单位的${gameStore.getResourceName(randomResource)}！`)

			}
			gameStore.weather.effects.gatheringEfficiency = 0.7 // 采集效率-30%
			// 极端天气成就跟踪
			gameStore.achievements.extremeWeatherSurvived = true
			break
		case 'foggy':
			gameStore.weather.effects.explorationEfficiency = 0.8 // 探索效率-20%
			break
		case 'windy':
			gameStore.weather.effects.energyConsumption = 1.1 // 体力消耗+10%
			// 有机会发现特殊资源
			if (Math.random() < 0.1) {
				const specialResources = ['metal', 'parts', 'techFragment']
				const randomResource = specialResources[Math.floor(Math.random() * specialResources.length)]
				gameStore.addResource(randomResource, 1)
				gameStore.addToEventLog(`大风带来了一些特殊资源，你获得了1单位${gameStore.getResourceName(randomResource)}！`)
			}
			break
		case 'hot':
			gameStore.weather.effects.waterConsumption = 1.3 // 水分消耗+30%
			// 有中暑风险
			if (Math.random() < 0.1 && gameStore.resources.water < 5) {
				gameStore.player.health -= gameStore.player.maxHealth * 0.05
				gameStore.addToEventLog('酷热天气导致你中暑，健康下降了！')
			}
			// 极端天气成就跟踪
			gameStore.achievements.extremeWeatherSurvived = true
			break
		case 'cold':
			gameStore.weather.effects.foodConsumption = 1.3 // 食物消耗+30%
			// 有冻伤风险
			if (Math.random() < 0.1 && gameStore.resources.food < 5) {
				gameStore.player.health -= gameStore.player.maxHealth * 0.05
				gameStore.addToEventLog('寒冷天气导致你受冻，健康下降了！')
			}
			// 极端天气成就跟踪
			gameStore.achievements.extremeWeatherSurvived = true
			break
		case 'snow':
			gameStore.weather.effects.gatheringEfficiency = 0.8 // 采集效率-20%
			gameStore.weather.effects.foodConsumption = 1.2 // 食物消耗+20%
			break
		case 'storm':
			// 风暴天气有灾害风险

			// 应用技能中的天气抵抗效果
			if (gameStore.skillTreeEffects.weatherResistance > 0) {
				// 减轻负面天气效果
				const resistance = gameStore.skillTreeEffects.weatherResistance
				// 只有当天气效果是负面的时候才应用抵抗
				if (gameStore.weather.effects.gatheringEfficiency < 1.0) {
					gameStore.weather.effects.gatheringEfficiency = Math.min(1.0,
						gameStore.weather.effects.gatheringEfficiency * (1 + resistance))
				}
				if (gameStore.weather.effects.energyConsumption > 1.0) {
					gameStore.weather.effects.energyConsumption = Math.max(1.0,
						gameStore.weather.effects.energyConsumption / (1 + resistance))
				}
				if (gameStore.weather.effects.waterConsumption > 1.0) {
					gameStore.weather.effects.waterConsumption = Math.max(1.0,
						gameStore.weather.effects.waterConsumption / (1 + resistance))
				}
				if (gameStore.weather.effects.foodConsumption > 1.0) {
					gameStore.weather.effects.foodConsumption = Math.max(1.0,
						gameStore.weather.effects.foodConsumption / (1 + resistance))
				}
				if (gameStore.weather.effects.explorationEfficiency < 1.0) {
					gameStore.weather.effects.explorationEfficiency = Math.min(1.0,
						gameStore.weather.effects.explorationEfficiency * (1 + resistance))
				}
			}
			if (Math.random() < 0.2) {
				// 检查是否有庇护所
				const hasShelter = gameStore.buildings.some(b => b.id === 'shelter' && b.level >= 1)
				if (hasShelter) {
					gameStore.addToEventLog('风暴肆虐，但你的庇护所提供了保护。')
					gameStore.player.health -= gameStore.player.maxHealth * 0.05 // 仍有轻微影响
				} else {
					gameStore.addToEventLog('风暴肆虐，你的健康都受到了严重影响！')
					gameStore.player.health -= gameStore.player.maxHealth * 0.1
					// 随机损失资源
					const resources = ['food', 'water', 'wood', 'herb']
					for (let i = 0; i < 2; i++) {
						const randomResource = resources[Math.floor(Math.random() * resources.length)]
						const lossAmount = Math.floor(gameStore.resources[randomResource] * 0.05)
						gameStore.consumeResource(randomResource, lossAmount)
						gameStore.addToEventLog(`风暴肆虐，你损失了${lossAmount}%单位的${gameStore.getResourceName(randomResource)}！`)
					}
				}
			}
			// 极端天气成就跟踪
			gameStore.achievements.extremeWeatherSurvived = true
			break
	}
}

// 开始游戏时间循环
const startGameTimer = () => {
	if (gameTimerId.value) return
	gameTimerId.value = setInterval(() => {
		// 每秒推进游戏时间
		if (gameState.value === 'playing') advanceTime(gameStore.gameTime.timeScale)
	}, 1000)
}

// 初始化游戏
const initGame = () => {
	// 尝试加载存档
	const loaded = gameStore.loadGame()
	if (!loaded) {
		// 没有存档，初始化新游戏
		gameStore.initGame()
		ElMessage.success('新游戏已开始')
	} else {
		ElMessage.success('游戏存档已加载')
	}
	startGameTimer()
}

// 重新开始游戏
const restartGame = () => {
	ElMessageBox.confirm('你确定要删除数据吗?', '提示', {
		type: 'warning',
		distinguishCancelAndClose: true,
		confirmButtonText: '确定',
		cancelButtonText: '不确定',
	}).then(() => {
		gameStore.initGame()
		ElMessage.success('游戏已重新开始')
		startGameTimer()
	}).catch(() => { })
}

// 保存游戏
const saveGame = () => {
	gameStore.saveGame()
	ElMessage.success('游戏数据已保存')
}

// 暂停/继续游戏
const togglePause = () => {
	// 所有活动队列统计
	const activeQueues = gameStore.currentActivities.length + gameStore.pendingActivities.length +
		gameStore.researchActivities.length + gameStore.pendingResearchActivities.length +
		gameStore.explorationActivities.length + gameStore.pendingExplorationActivities.length +
		gameStore.buildingActivities.length + gameStore.pendingBuildingActivities.length +
		gameStore.skillActivities.length + gameStore.pendingSkillActivities.length
	if (gameStore.gameState === 'playing') {
		if (activeQueues) {
			ElMessage.warning('活动队列正在进行中, 无法暂停游戏')
			return
		}
		gameStore.gameState = 'paused'
		ElMessage.info('游戏已暂停')
	} else if (gameStore.gameState === 'paused') {
		gameStore.gameState = 'playing'
		ElMessage.info('游戏已继续')
	}
}

// 导出前保存当前进度。
const download = () => {
	try {
		gameStore.saveGame()
		const data = localStorage.getItem(__APP_NAME__)
		if (!data) throw new Error('没有可导出的存档')
		saveAs(
			new Blob([data], { type: 'application/json' }),
			`${__APP_TITLE__}存档数据-${new Date().toISOString().slice(0, 10)}-${Date.now()}.json`
		)
		ElMessage.success('存档已导出')
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		ElMessage.error('存档导出失败：' + message)
		gameStore.addToEventLog('存档导出失败：' + message)
	}
}

// 文件导入和本地读取共用校验流程，失败时保留当前进度。
const upload = async ({ file }: UploadRequestOptions) => {
	try {
		const data = await file.text()
		if (!gameStore.importGame(data)) throw new Error('存档格式或数据无效')
		ElMessage.success('存档已导入')
		location.reload()
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		ElMessage.error('存档导入失败：' + message)
	}
}

// 切换暗黑模式
const toggleDarkMode = () => {
	gameStore.settings.darkMode = !gameStore.settings.darkMode
	clickDarkMode()
}

const clickDarkMode = () => document.documentElement.classList.toggle('dark', gameStore.settings.darkMode)

// 组件挂载时
onMounted(() => {
	initGame()
	clickDarkMode()
})

// 组件卸载时清除定时器
onUnmounted(() => {
	if (gameTimerId.value) clearInterval(gameTimerId.value)
})
</script>

<template>
	<div class="game-container">
		<div class="game-header">
			<div class="game-controls">
				<el-button class="button" @click="toggleDarkMode" size="small">
					<el-icon v-if="gameStore.settings.darkMode">
						<Sunny />
					</el-icon>
					<el-icon v-else>
						<Moon />
					</el-icon>
					{{ !gameStore.settings.darkMode ? '夜间模式' : '白天模式' }}
				</el-button>
				<el-button class="button" @click="saveGame" :disabled="gameState !== 'playing'" size="small">
					<el-icon>
						<MessageBox />
					</el-icon>
					保存数据
				</el-button>
				<el-button class="button" @click="restartGame" :disabled="gameState !== 'playing'" size="small">
					<el-icon>
						<Delete />
					</el-icon>
					删除数据
				</el-button>
				<el-button class="button" @click="togglePause" size="small">
					<el-icon v-if="gameState === 'playing'">
						<VideoPause />
					</el-icon>
					<el-icon v-else>
						<VideoPlay />
					</el-icon>
					{{ gameState === 'playing' ? '暂停游戏' : '继续游戏' }}
				</el-button>
				<el-button class="button" @click="download" :disabled="gameState !== 'playing'" size="small">
					<el-icon>
						<Download />
					</el-icon>
					导出存档
				</el-button>
				<el-upload class="button el-button el-button--small" action="#" style="display: unset" :http-request="upload"
					:show-file-list="false" accept="application/json">
					<el-icon>
						<Upload />
					</el-icon>
					导入存档
				</el-upload>
				<el-button tag="a" target="_blank" href="https://github.com/setube/idle-wild-my-survival-saga" class="button"
					size="small">
					<el-icon>
						<Link />
					</el-icon>
					开源地址
				</el-button>
				<el-popover class="box-item" content="QQ群:920930589" placement="top-start">
					<template #reference>
						<el-button class="button" size="small">
							<el-icon>
								<Position />
							</el-icon>
							游戏群聊
						</el-button>
					</template>
				</el-popover>
			</div>
		</div>
		<div class="game-main">
			<div class="game-panel left-panel">
				<PlayerStatus />
				<ResourcePanel />
			</div>
			<div class="game-panel center-panel">
				<el-tabs v-model="centerPanelTab" class="full-height-tabs">
					<el-tab-pane label="活动" name="activity">
						<ActivityPanel />
					</el-tab-pane>
					<el-tab-pane label="建筑" name="building">
						<BuildingPanel />
					</el-tab-pane>
					<el-tab-pane label="研究" name="research">
						<ResearchPanel />
					</el-tab-pane>
					<el-tab-pane label="探索" name="exploration">
						<ExplorationPanel />
					</el-tab-pane>
					<el-tab-pane label="交易" name="trading">
						<TradingSystem :key="centerPanelTab === 'trading' ? 'trading-active' : 'trading-inactive'" />
					</el-tab-pane>
					<el-tab-pane label="任务" name="quests">
						<QuestSystem />
					</el-tab-pane>
					<el-tab-pane label="技能" name="skilltree">
						<SkillTreeSystem />
					</el-tab-pane>
					<el-tab-pane label="成就" name="achievements">
						<AchievementSystem />
					</el-tab-pane>
				</el-tabs>
			</div>
			<div class="game-panel right-panel">
				<TimeControl />
				<WeatherSystem />
				<RandomEventSystem />
				<EventLog />
			</div>
		</div>
		<el-dialog :model-value="isGameOver"
			@update:model-value="handleGameOverVisibilityChange" title="游戏结束" width="30%"
			:close-on-click-modal="false" :show-close="false">
			<span>你没能在这个严酷的世界生存下来...</span>
			<span>生存天数: {{ playerDays }}</span>
			<template #footer>
				<span class="dialog-footer">
					<el-button @click="restartFromGameOver">重新开始</el-button>
				</span>
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
}

.game-controls {
	display: flex;
	flex-wrap: wrap;
}

@media (max-width: 768px) {
	.game-controls {
		justify-content: center;
	}

	.button {
		width: calc(33% - 12px);
		margin-top: 10px;
	}

	.button:nth-child(4) {
		margin-left: 0;
	}
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
</style>
