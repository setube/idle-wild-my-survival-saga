import { describe, expect, test } from 'bun:test'
import { getEnergyRecovery } from '../src/plugins/energyMechanics'
import { getResourceSources } from '../src/plugins/resourceGuide'
import type { Building, GameState, ResourceKey } from '../src/types/game'

const describeResource = (resource: string) => resource
interface EnergyTestInput { day?: number; hour?: number; currentWeather?: string; buildings?: Building[] }

const makeEnergyState = (input: EnergyTestInput = {}): Pick<GameState, 'player' | 'gameTime' | 'weather' | 'season' | 'buildings'> => ({
  player: { level: 1, exp: 0, expToNextLevel: 100, health: 100, maxHealth: 100, energy: 50, maxEnergy: 100, days: 0, explorationCount: 0 },
  gameTime: { day: input.day ?? 1, hour: input.hour ?? 12, minute: 0, timeScale: 1, startTime: 0, timestamp: 0 },
  weather: { current: input.currentWeather ?? 'clear', duration: 6, nextChangeDay: 1, nextChangeHour: 6, effects: { gatheringEfficiency: 1, energyConsumption: 1, waterConsumption: 1, foodConsumption: 1, explorationEfficiency: 1 } },
  season: { seasonLength: 30, effects: {} },
  buildings: input.buildings ?? [],
})

describe('issue #4 energy recovery guide', () => {
  test('matches day and night natural recovery and extreme-weather effects', () => {
    expect(getEnergyRecovery(makeEnergyState()).natural).toBe(1)
    expect(getEnergyRecovery(makeEnergyState({ hour: 22 })).natural).toBe(5)
    expect(getEnergyRecovery(makeEnergyState({
      hour: 12, currentWeather: 'hot',
    })).natural).toBe(0.8)
  })

  test('includes existing shelter bonuses with each season multiplier', () => {
    const shelter = { id: 'shelter', name: '简易庇护所', level: 1, effects: { energyRecovery: 2 } }
    expect(getEnergyRecovery(makeEnergyState({ buildings: [shelter] })).building).toBe(2.2)
    expect(getEnergyRecovery(makeEnergyState({
      day: 31, buildings: [shelter],
    })).building).toBe(1.8)
  })
})

describe('issue #7 resource sources', () => {
  test('shows actual recipes, tech locks, exploration, and special-finding sources', () => {
    const simpleTool = getResourceSources('tools', describeResource)
    expect(simpleTool.some(source => source.title === '活动：制作简易工具')).toBe(true)
    expect(simpleTool.some(source => source.detail.includes('研究「基础制作」'))).toBe(true)
    expect(getResourceSources('crystal', describeResource).some(source => source.title === '探索：洞穴')).toBe(true)
    expect(getResourceSources('ancientRelic', describeResource).some(source => source.title === '探索特殊发现：神秘遗物')).toBe(true)
  })

  test('provides at least one verified way to find every configured resource', () => {
    const resources: ResourceKey[] = ['food', 'water', 'wood', 'stone', 'metal', 'herb', 'rare_herb', 'medicine', 'tools', 'parts', 'advanced_parts', 'electronic_components', 'fuel', 'crystal', 'ancientRelic', 'techFragment']
    expect(resources).toHaveLength(16)
    for (const resource of resources) {
      expect(getResourceSources(resource, describeResource).length).toBeGreaterThan(0)
    }
    expect(getResourceSources('electronic_components', describeResource).some(source => source.title === '活动：制作电子元件')).toBe(true)
  })
})
