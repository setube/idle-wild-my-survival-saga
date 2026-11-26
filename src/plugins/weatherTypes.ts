import type { GameContext, WeatherDefinition } from '../types/game'

export const weatherTypes: Record<string, WeatherDefinition> = {
  // 基础天气
  clear: {
    name: '晴朗',
    icon: '☀️',
    description: '天气晴朗，阳光明媚',
    color: '#f9d71c',
    probability: 0.25,
    duration: { min: 4, max: 12 },
    animation: 'weather-clear',
    effects: {
      gatheringEfficiency: 1.1,
      energyConsumption: 1.0,
      waterConsumption: 1.1,
      foodConsumption: 1.0,
      explorationEfficiency: 1.1
    },
    seasonModifiers: {
      spring: 1.0,
      summer: 1.5,
      autumn: 1.0,
      winter: 0.5,
    },
  },
  cloudy: {
    name: '多云',
    icon: '☁️',
    animation: 'weather-cloudy',
    description: '天空被云层覆盖，阳光被遮挡',
    color: '#b5b5b5',
    probability: 0.2,
    duration: { min: 3, max: 10 },
    effects: {
      gatheringEfficiency: 1.0,
      energyConsumption: 1.0,
      waterConsumption: 0.9,
      foodConsumption: 1.0,
      explorationEfficiency: 1.0
    },
    seasonModifiers: {
      spring: 1.2,
      summer: 1.0,
      autumn: 1.2,
      winter: 1.0,
    },
  },
  rainy: {
    name: '雨天',
    icon: '🌧️',
    description: '下着雨，地面湿滑，能见度降低',
    color: '#5d8aa8',
    probability: 0.15,
    animation: 'weather-rainy',
    duration: { min: 2, max: 8 },
    effects: {
      gatheringEfficiency: 0.8,
      energyConsumption: 1.2,
      waterConsumption: 0.7,
      foodConsumption: 1.1,
      explorationEfficiency: 0.7
    },
    seasonModifiers: {
      spring: 1.5,
      summer: 1.0,
      autumn: 1.2,
      winter: 0.3,
    },
  },
  // 扩展天气类型
  foggy: {
    name: '雾天',
    icon: '🌫️',
    description: '浓雾弥漫，能见度极低',
    color: '#d3d3d3',
    animation: 'weather-foggy',
    probability: 0.1,
    duration: { min: 2, max: 6 },
    effects: {
      gatheringEfficiency: 0.7,
      energyConsumption: 1.1,
      waterConsumption: 1.0,
      foodConsumption: 1.0,
      explorationEfficiency: 0.5
    },
    seasonModifiers: {
      spring: 1.2,
      summer: 0.5,
      autumn: 1.5,
      winter: 1.2,
    },
  },
  windy: {
    name: '大风',
    icon: '🌬️',
    description: '强风呼啸，行动受阻',
    color: '#a5a5a5',
    probability: 0.12,
    animation: 'weather-windy',
    duration: { min: 3, max: 7 },
    effects: {
      gatheringEfficiency: 0.8,
      energyConsumption: 1.3,
      waterConsumption: 1.2,
      foodConsumption: 1.1,
      explorationEfficiency: 0.7
    },
    seasonModifiers: {
      spring: 1.3,
      summer: 0.8,
      autumn: 1.5,
      winter: 1.0,
    },
  },
  stormy: {
    name: '暴风雨',
    icon: '⛈️',
    description: '雷电交加，暴雨倾盆',
    color: '#4682b4',
    probability: 0.08,
    animation: 'weather-heavy-rain',
    duration: { min: 1, max: 5 },
    effects: {
      gatheringEfficiency: 0.5,
      energyConsumption: 1.5,
      waterConsumption: 0.5,
      foodConsumption: 1.2,
      explorationEfficiency: 0.3
    },
    seasonModifiers: {
      spring: 1.0,
      summer: 1.5,
      autumn: 1.0,
      winter: 0.2,
    },
    events: [
      {
        id: 'lightning_strike',
        name: '雷击',
        probability: 0.05,
        effect: (store) => {
          // 随机损失一些健康
          const damage = Math.floor(Math.random() * 10) + 5
          store.player.health = Math.max(1, store.player.health - damage)
          store.addToEventLog(
            `暴风雨中你被雷电击中，损失了${damage}点健康！`
          )
        },
      },
    ],
  },
  heatwave: {
    name: '热浪',
    icon: '🔥',
    description: '酷热难耐，水分流失加快',
    color: '#ff7f50',
    probability: 0.07,
    animation: 'weather-hot',
    duration: { min: 2, max: 4 },
    effects: {
      gatheringEfficiency: 0.7,
      energyConsumption: 1.4,
      waterConsumption: 1.8,
      foodConsumption: 1.1,
      explorationEfficiency: 0.6
    },
    seasonModifiers: {
      spring: 0.2,
      summer: 2.0,
      autumn: 0.3,
      winter: 0.0,
    },
    events: [
      {
        id: 'dehydration',
        name: '脱水',
        probability: 0.1,
        effect: (store) => {
          // 如果水资源不足，会损失健康
          if (store.resources.water < 5) {
            const damage = Math.floor(Math.random() * 5) + 3
            store.player.health = Math.max(1, store.player.health - damage)
            store.addToEventLog(
              `热浪中你因缺水而脱水，损失了${damage}点健康！`
            )
          }
        },
      },
    ],
  },
  blizzard: {
    name: '暴风雪',
    icon: '❄️',
    description: '寒风凛冽，大雪纷飞',
    color: '#e0ffff',
    probability: 0.06,
    animation: 'weather-cold',
    duration: { min: 1, max: 3 },
    effects: {
      gatheringEfficiency: 0.4,
      energyConsumption: 1.7,
      waterConsumption: 0.8,
      foodConsumption: 1.5,
      explorationEfficiency: 0.2
    },
    seasonModifiers: {
      spring: 0.1,
      summer: 0.0,
      autumn: 0.2,
      winter: 2.0,
    },
    events: [
      {
        id: 'hypothermia',
        name: '低温症',
        probability: 0.15,
        effect: (store) => {
          // 如果没有足够的燃料，会损失健康
          if (store.resources.fuel < 3) {
            const healthDamage = Math.floor(Math.random() * 8) + 5
            store.player.health = Math.max(1, store.player.health - healthDamage)
            store.addToEventLog(`暴风雪中你因缺乏燃料而患上低温症，损失了${healthDamage}点健康！`)
          }
        },
      },
    ],
  },
  sandstorm: {
    name: '沙尘暴',
    icon: '🏜️',
    description: '沙尘肆虐，呼吸困难',
    color: '#d2b48c',
    probability: 0.05,
    animation: 'weather-sandstorm',
    duration: { min: 1, max: 4 },
    effects: {
      gatheringEfficiency: 0.3,
      energyConsumption: 1.6,
      waterConsumption: 1.5,
      foodConsumption: 1.2,
      explorationEfficiency: 0.3
    },
    seasonModifiers: {
      spring: 0.5,
      summer: 1.5,
      autumn: 0.5,
      winter: 0.1,
    },
    events: [
      {
        id: 'lost_resources',
        name: '资源损失',
        probability: 0.2,
        effect: (store) => {
          // 随机损失一些资源
          const resources = ['food', 'water', 'wood', 'herb']
          const randomResource =
            resources[Math.floor(Math.random() * resources.length)]
          const lossAmount = Math.floor(Math.random() * 5) + 3
          if (store.resources[randomResource] >= lossAmount) {
            store.resources[randomResource] -= lossAmount
            store.addToEventLog(
              `沙尘暴摧毁了你的一些${store.getResourceName(
                randomResource
              )}，损失了${lossAmount}单位！`
            )
          }
        },
      },
    ],
  },
  auroral: {
    name: '极光',
    icon: '🌌',
    description: '天空中出现绚丽的极光',
    color: '#9370db',
    probability: 0.03,
    animation: 'weather-aurora',
    duration: { min: 3, max: 6 },
    effects: {
      gatheringEfficiency: 1.0,
      energyConsumption: 0.9,
      waterConsumption: 1.0,
      foodConsumption: 0.9,
      explorationEfficiency: 1.2
    },
    seasonModifiers: {
      spring: 0.2,
      summer: 0.1,
      autumn: 0.3,
      winter: 1.8,
    },
    events: [
      {
        id: 'inspiration',
        name: '灵感迸发',
        probability: 0.3,
        effect: (store) => {
          // 获得额外的经验
          const expGain = Math.floor(Math.random() * 15) + 10
          store.addExperience(expGain)
          store.addToEventLog(`极光的美景给你带来灵感，获得了${expGain}点幸存者经验！`)
        },
      },
    ],
  },
  rainbow: {
    name: '彩虹',
    icon: '🌈',
    description: '雨后天晴，天空中出现美丽的彩虹',
    color: '#ff69b4',
    probability: 0.04,
    animation: 'weather-rainbow',
    duration: { min: 1, max: 3 },
    effects: {
      gatheringEfficiency: 1.2,
      energyConsumption: 0.8,
      waterConsumption: 0.9,
      foodConsumption: 0.9,
      explorationEfficiency: 1.3
    },
    seasonModifiers: {
      spring: 1.5,
      summer: 1.0,
      autumn: 1.0,
      winter: 0.2,
    },
    events: [
      {
        id: 'lucky_find',
        name: '幸运发现',
        probability: 0.25,
        effect: (store) => {
          // 随机获得一些资源
          const resources = ['food', 'water', 'wood', 'stone', 'herb', 'metal']
          const randomResource =
            resources[Math.floor(Math.random() * resources.length)]
          const gainAmount = Math.floor(Math.random() * 8) + 5
          store.addResource(randomResource, gainAmount)
          store.addToEventLog(
            `彩虹的祝福让你幸运地发现了${gainAmount}单位${store.getResourceName(
              randomResource
            )}！`
          )
        },
      },
    ],
  },
}

// 根据季节获取天气概率分布
export const getWeatherProbabilities = (season: string) => {
  const probabilities: Record<string, number> = {}
  for (const [weatherType, data] of Object.entries(weatherTypes)) {
    // 基础概率 * 季节修正
    const seasonModifier = data.seasonModifiers
      ? data.seasonModifiers[season] || 1.0
      : 1.0
    probabilities[weatherType] = data.probability * seasonModifier
  }
  // 归一化概率总和为1
  const totalProbability = Object.values(probabilities).reduce(
    (sum, p) => sum + p,
    0
  )
  for (const weatherType in probabilities) {
    probabilities[weatherType] /= totalProbability
  }
  return probabilities
}

// 随机选择天气类型
export const selectRandomWeather = (season: string, currentWeather: string | null = null) => {
  const probabilities = getWeatherProbabilities(season)
  // 如果提供了当前天气，稍微降低再次选择相同天气的概率
  if (currentWeather && probabilities[currentWeather]) {
    probabilities[currentWeather] *= 0.5
    // 重新归一化
    const totalProbability = Object.values(probabilities).reduce(
      (sum, p) => sum + p,
      0
    )
    for (const weatherType in probabilities) {
      probabilities[weatherType] /= totalProbability
    }
  }
  // 随机选择天气
  const random = Math.random()
  let cumulativeProbability = 0
  for (const [weatherType, probability] of Object.entries(probabilities)) {
    cumulativeProbability += probability
    if (random <= cumulativeProbability) {
      return weatherType
    }
  }
  // 默认返回晴朗天气
  return 'clear'
}

// 获取天气持续时间
export const getWeatherDuration = (weatherType: string) => {
  const weather = weatherTypes[weatherType]
  if (!weather || !weather.duration) return 6 // 默认6小时
  const { min, max } = weather.duration
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// 处理天气特殊事件
export const processWeatherEvents = (store: GameContext, weatherType: string) => {
  const weather = weatherTypes[weatherType]
  if (!weather || !weather.events) return
  for (const event of weather.events) {
    if (Math.random() <= event.probability) event.effect(store)
  }
}
