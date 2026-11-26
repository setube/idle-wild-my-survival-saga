import { achievements } from './achievements'
import { eventLibrary, eventTypes } from './eventLibrary'
import { explorationRegions } from './explorationRegions'
import { merchants } from './merchants'
import { availableBuildings, recipes, technologies } from './recipes'
import { resourceLimits, resources } from './resource'
import { skillTree, skills } from './skillTree'
import { weatherTypes } from './weatherTypes'
import { assert, assertFiniteNumber, assertRecord } from './assertions'

const resourceKeys = new Set(Object.keys(resources))
const skillKeys = new Set(Object.keys(skills))

function assertUniqueIds(items: readonly { id: string }[], label: string): void {
  const ids = new Set<string>()
  for (const item of items) {
    assert(!ids.has(item.id), `${label}包含重复 ID: ${item.id}`)
    ids.add(item.id)
  }
}

const buildingEffectKeys = new Set([
  'energyRecovery', 'healthRecovery', 'maxHealth', 'maxEnergy', 'storageMultiplier', 'craftingSpeed',
  'foodPerDay', 'waterPerDay', 'woodPerDay', 'stonePerDay', 'metalPerDay', 'herbPerDay',
  'medicinePerDay', 'toolsPerDay', 'partsPerDay', 'advanced_partsPerDay', 'electronic_componentsPerDay', 'fuelPerDay',
])
const tradeRewardKeys = new Set(['exp', 'health', 'maxHealth', 'energy', 'maxEnergy'])

function assertResourceMap(value: unknown, label: string, allowEnergy = false, extraKeys: ReadonlySet<string> = new Set()): void {
  assertRecord(value, label)
  for (const [key, amount] of Object.entries(value)) {
    assert(resourceKeys.has(key) || (allowEnergy && key === 'energy') || extraKeys.has(key), `${label}引用未知资源: ${key}`)
    if (Array.isArray(amount)) {
      assert(amount.length === 2, `${label}.${key}范围必须包含最小值和最大值`)
      for (const endpoint of amount) assertFiniteNumber(endpoint, `${label}.${key}`)
      assert(amount[0]! <= amount[1]!, `${label}.${key}最小值不能大于最大值`)
    } else assertFiniteNumber(amount, `${label}.${key}`)
  }
}

/** Validate static game content once before starting the game and in CI. */
export function validateGameConfiguration(): void {
  for (const key of resourceKeys) {
    assertFiniteNumber(resources[key], `初始资源.${key}`)
    assertFiniteNumber(resourceLimits[key], `资源上限.${key}`, 1)
  }
  assertUniqueIds(recipes, '配方')
  assertUniqueIds(technologies, '科技')
  assertUniqueIds(availableBuildings, '建筑')
  assertUniqueIds(explorationRegions, '探索地区')
  assertUniqueIds(eventLibrary, '随机事件')
  assertUniqueIds(achievements, '成就')
  assertUniqueIds(merchants, '商人')
  assertUniqueIds(Object.entries(skillTree).flatMap(([branch, data]) =>
    data.skills.map(skill => ({ id: `${branch}:${skill.id}` }))), '技能')

  const technologyIds = new Set(technologies.map(technology => technology.id))
  for (const recipe of recipes) {
    assertResourceMap(recipe.inputs, `配方.${recipe.id}.inputs`, true)
    assertResourceMap(recipe.outputs, `配方.${recipe.id}.outputs`)
    assert(recipe.duration > 0, `配方.${recipe.id}时长必须大于零`)
    for (const skill of Object.keys(recipe.skillRequired)) {
      assert(skillKeys.has(skill), `配方.${recipe.id}引用未知技能: ${skill}`)
    }
    if (recipe.techRequired) assert(technologyIds.has(recipe.techRequired), `配方.${recipe.id}引用未知科技: ${recipe.techRequired}`)
  }

  for (const technology of technologies) {
    assertResourceMap(technology.cost, `科技.${technology.id}.cost`)
    for (const id of [...(technology.unlocks ?? []), ...(technology.requirements ?? [])]) {
      assert(technologyIds.has(id), `科技.${technology.id}引用未知科技: ${id}`)
    }
    assert(technology.researchTime > 0, `科技.${technology.id}研究时间必须大于零`)
  }

  for (const building of availableBuildings) {
    for (const level of building.levels) {
      assertResourceMap(level.cost, `建筑.${building.id}.${level.level}.cost`)
      assertResourceMap(level.effects, `建筑.${building.id}.${level.level}.effects`, false, buildingEffectKeys)
      for (const skill of Object.keys(level.requirements)) assert(skillKeys.has(skill), `建筑.${building.id}引用未知技能: ${skill}`)
    }
  }

  for (const region of explorationRegions) {
    for (const resource of region.resources) assert(resourceKeys.has(resource), `地区.${region.id}引用未知资源: ${resource}`)
    assertResourceMap(region.resourceCost, `地区.${region.id}.resourceCost`)
    for (const skill of Object.keys(region.unlockRequirements)) assert(skillKeys.has(skill), `地区.${region.id}引用未知技能: ${skill}`)
  }

  for (const merchant of merchants) {
    for (const item of [...merchant.sellItems, ...merchant.buyItems]) {
      assert(resourceKeys.has(item.resourceId), `商人.${merchant.id}引用未知资源: ${item.resourceId}`)
      assertResourceMap('buyPrice' in item ? item.buyPrice : item.sellPrice, `商人.${merchant.id}.${item.id}.price`)
    }
    for (const trade of merchant.specialTrades) {
      assertResourceMap(trade.inputs, `商人.${merchant.id}.${trade.id}.inputs`)
      assertResourceMap(trade.outputs, `商人.${merchant.id}.${trade.id}.outputs`, false, tradeRewardKeys)
    }
  }

  assert(Object.keys(eventTypes).length > 0, '游戏事件必须有事件类型定义')
  assert(Object.keys(weatherTypes).length > 0, '游戏天气必须有天气类型定义')
}
