import { availableBuildings, recipes, technologies } from './recipes'
import { explorationRegions } from './explorationRegions'
import { merchants } from './merchants'
import { eventLibrary } from './eventLibrary'
import type { ResourceAmounts, ResourceKey } from '../types/game'

export interface ResourceSource { title: string; detail: string }

const skillNames: Record<string, string> = { gathering: '采集', crafting: '制作', combat: '战斗', survival: '生存', research: '研究' }
const requirementsText = (requirements: ResourceAmounts) => Object.entries(requirements).map(([key, level]) => `${skillNames[key] ?? key} Lv.${level}`).join('、') || '无技能要求'
const eventRewards: Partial<Record<ResourceKey, { id: string; choice: string }[]>> = {
  food: [{ id: 'wild_harvest', choice: '采集食物' }],
  water: [{ id: 'wild_harvest', choice: '收集水源' }],
  herb: [{ id: 'wild_harvest', choice: '寻找草药' }, { id: 'wandering_trader', choice: '用食物交换草药' }],
  tools: [{ id: 'wandering_trader', choice: '用木材交换工具' }],
  medicine: [{ id: 'lost_traveler', choice: '分享食物和水，有机会获得药品' }],
  parts: [{ id: 'ancient_cache', choice: '快速搜索，有机会获得零件' }],
  techFragment: [{ id: 'ancient_cache', choice: '仔细研究或快速搜索' }, { id: 'lost_traveler', choice: '分享食物和水，有机会获得科技碎片' }, { id: 'mysterious_stranger', choice: '询问世界秘密' }],
}
const seasonalRewards: Partial<Record<ResourceKey, string[]>> = {
  food: ['春季：每游戏日有 30% 概率额外获得 1–3 单位食物', '秋季：每游戏日有 30% 概率额外获得 2–5 单位食物'],
  water: ['夏季来临时：有 40% 概率额外收集 3–7 单位水'],
  wood: ['秋季：每游戏日有 20% 概率额外获得 2–4 单位木材'],
  stone: ['夏季：每游戏日有 15% 概率额外发现 1–2 单位石头'],
  metal: ['夏季：每游戏日有 15% 概率额外发现 1–2 单位金属'],
  herb: ['春季：每游戏日有 40% 概率额外获得 1–2 单位草药', '春季来临时：有 40% 概率额外收集 3–7 单位草药'],
  fuel: ['冬季来临时：有 40% 概率额外准备 2–4 单位燃料', '夏季：每游戏日有 15% 概率额外发现 1–2 单位燃料'],
}

/** Derive ordinary sources and unlock conditions from the same data used by gameplay. */
export const getResourceSources = (resource: ResourceKey, name: (key: string) => string): ResourceSource[] => {
  const sources: ResourceSource[] = []
  for (const recipe of recipes) {
    if (!(resource in recipe.outputs)) continue
    const technology = recipe.techRequired ? technologies.find(item => item.id === recipe.techRequired) : undefined
    const unlock = [requirementsText(recipe.skillRequired), technology ? `先研究「${technology.name}」` : undefined].filter(Boolean).join('；')
    sources.push({ title: `活动：${recipe.name}`, detail: `${unlock}；消耗 ${Object.entries(recipe.inputs).map(([key, amount]) => `${key === 'energy' ? '体力' : name(key)} ×${amount}`).join('、')}。` })
  }
  for (const region of explorationRegions) {
    if (!region.resources.includes(resource)) continue
    sources.push({ title: `探索：${region.name}`, detail: `${requirementsText(region.unlockRequirements)}；消耗体力 ${region.energyCost} 和 ${Object.entries(region.resourceCost).map(([key, amount]) => `${name(key)} ×${amount}`).join('、')}。每次探索有概率发现，科技碎片和古代遗物的常规发现概率更低。` })
  }
  for (const merchant of merchants) {
    for (const item of merchant.sellItems) {
      if (item.resourceId !== resource) continue
      sources.push({ title: `交易：${merchant.name}`, detail: `生存天数达到 ${merchant.availability.minDay} 天后，每 ${merchant.availability.frequency} 天出现一次，停留 ${merchant.availability.duration} 天；用 ${Object.entries(item.buyPrice).map(([key, amount]) => `${name(key)} ×${amount}`).join('、')} 换取 ${item.amount ?? 1} 个，库存有限。` })
    }
    for (const item of merchant.buyItems) {
      const amount = item.sellPrice[resource]
      if (amount) sources.push({ title: `出售物品：${merchant.name}`, detail: `商人到访时，出售 1 个${name(item.resourceId)}可换取 ${amount} 个${name(resource)}。` })
    }
  }
  for (const building of availableBuildings) {
    const level = building.levels.find(item => (item.effects[`${resource}PerDay`] ?? 0) > 0)
    if (!level) continue
    sources.push({ title: `建筑：${building.name}`, detail: `该建筑达到 ${level.level} 级后开始产出。所需技能：${requirementsText(level.requirements)}；升至该级还需 ${Object.entries(level.cost).map(([key, amount]) => `${name(key)} ×${amount}`).join('、')}。${resource === 'food' || resource === 'water' ? '每游戏小时' : '每游戏天'}自动提供资源。` })
  }
  for (const reward of eventRewards[resource] ?? []) {
    const event = eventLibrary.find(item => item.id === reward.id)
    if (event) sources.push({ title: `随机事件：${event.title}`, detail: `生存 ${event.minDay} 天起可能遇到；${reward.choice}。事件出现和部分奖励具有随机性。` })
  }
  for (const detail of seasonalRewards[resource] ?? []) {
    sources.push({ title: '季节事件', detail })
  }
  if (['food', 'water', 'medicine'].includes(resource)) sources.push({ title: '探索特殊发现：隐藏补给', detail: '任意已解锁区域探索时，可能额外发现食物、水和药品。' })
  if (resource === 'techFragment' || resource === 'parts') sources.push({ title: '探索特殊发现：古代科技', detail: '任意已解锁区域探索时，可能额外获得科技碎片和零件。' })
  if (resource === 'ancientRelic') sources.push({ title: '探索特殊发现：神秘遗物', detail: '任意已解锁区域探索时，可能额外获得 1 个古代遗物。' })
  if (resource === 'rare_herb') sources.push({ title: '技能：稀有草药寻觅', detail: '采集技能中的「稀有草药寻觅」升至 1 级后，采集草药时有 15% 概率额外获得稀有草药；升至 2 级可进一步提高概率。' })
  return sources
}
