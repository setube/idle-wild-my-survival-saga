import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'
import { encryptData } from '../src/plugins/crypto'
import { resources } from '../src/plugins/resource'
import { createInitialState, rebuildStateEffects, useGameStore } from '../src/stores/gameStore'
import type { GameState } from '../src/types/game'

declare const __APP_NAME__: string

class MemoryStorage implements Storage {
  private data = new Map<string, string>()
  get length(): number { return this.data.size }
  clear(): void { this.data.clear() }
  getItem(key: string): string | null { return this.data.get(key) ?? null }
  key(index: number): string | null { return [...this.data.keys()][index] ?? null }
  removeItem(key: string): void { this.data.delete(key) }
  setItem(key: string, value: string): void { this.data.set(key, value) }
}

let storage: MemoryStorage

function packSave(state: unknown): string {
  const cipher = encryptData(state)
  if (!cipher) throw new Error('test save encryption failed')
  return cipher + btoa(`+++${__APP_NAME__}`)
}

beforeEach(() => {
  setActivePinia(createPinia())
  storage = new MemoryStorage()
  Object.defineProperty(globalThis, '__APP_NAME__', { configurable: true, value: 'idle-wild-my-survival-saga' })
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
})

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'localStorage')
  Reflect.deleteProperty(globalThis, '__APP_NAME__')
})

describe('save import and permanent bonuses', () => {
  test('keeps skill and workshop crafting bonuses when a save moves between devices', () => {
    const saved = createInitialState()
    saved.unlockedSkills.efficient_crafting = 3
    saved.buildings.push({ id: 'workshop', name: 'old name', level: 5, effects: { craftingSpeed: 0 } })
    rebuildStateEffects(saved)
    expect(saved.skillTreeEffects.craftingSpeed).toBe(3.45)

    const incoming = packSave(saved)
    storage.setItem(__APP_NAME__, incoming)
    const store = useGameStore()
    expect(store.loadGame()).toBe(true)
    expect(store.skillTreeEffects.craftingSpeed).toBe(3.45)
    expect(store.buildings[0]?.effects.craftingSpeed).toBe(3)
  })

  test('rebuilding bonuses repeatedly does not compound buildings or skill effects', () => {
    const state = createInitialState()
    state.unlockedSkills.efficient_crafting = 3
    state.buildings.push({ id: 'workshop', name: '工作坊', level: 5, effects: { craftingSpeed: 3 } })
    rebuildStateEffects(state)
    rebuildStateEffects(state)
    rebuildStateEffects(state)
    expect(state.skillTreeEffects.craftingSpeed).toBe(3.45)
  })

  test('rejects malformed imported saves without changing the live game or stored save', () => {
    const store = useGameStore()
    store.resources.food = 23
    storage.setItem(__APP_NAME__, 'previous valid value')
    const liveState = store.$state
    expect(store.importGame(packSave({ resources: { food: 'invalid' } }))).toBe(false)
    expect(store.$state).toEqual(liveState)
    expect(storage.getItem(__APP_NAME__)).toBe('previous valid value')
  })

  test('rejects NaN and negative amounts at the resource boundary', () => {
    const store = useGameStore()
    expect(() => store.addResource('food', Number.NaN)).toThrow()
    expect(() => store.consumeResource('wood', -1)).toThrow()
    expect(store.resources).toEqual({ ...resources })
  })

  test('fills legacy saves with current defaults while restoring their purchased buildings', () => {
    const legacy: Partial<GameState> & Record<string, unknown> = {
      ...createInitialState(),
      buildings: [{ id: 'workshop', name: '工作坊', level: 2, effects: { craftingSpeed: 1.25 } }],
      skillTreeEffects: { ...createInitialState().skillTreeEffects, craftingSpeed: 0.45 },
    }
    delete legacy.appliedPermanentStats
    const store = useGameStore()
    expect(store.importGame(packSave(legacy))).toBe(true)
    expect(store.skillTreeEffects.craftingSpeed).toBe(1.25)
  })
})
