import type { GameState } from '../types/game'
import { assert, assertFiniteNumber, assertRecord, isRecord } from './assertions'

const forbiddenKeys = new Set(['__proto__', 'prototype', 'constructor', 'timer'])

function mergeState(defaults: unknown, incoming: unknown): unknown {
  if (incoming === undefined) return structuredClone(defaults)
  if (Array.isArray(defaults)) {
    assert(Array.isArray(incoming), '存档队列必须是数组')
    return incoming.map(item => isRecord(item) ? Object.fromEntries(Object.entries(item).filter(([key]) => !forbiddenKeys.has(key))) : item)
  }
  if (isRecord(defaults)) {
    assertRecord(incoming, '存档字段')
    const merged: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(defaults)) merged[key] = mergeState(value, incoming[key])
    // Records with dynamic keys (unlocked skills and counters).
    if (Object.keys(defaults).length === 0) {
      for (const [key, value] of Object.entries(incoming)) if (!forbiddenKeys.has(key)) merged[key] = value
    }
    return merged
  }
  assert(typeof incoming === typeof defaults, '存档字段类型不正确')
  if (typeof incoming === 'number') assert(Number.isFinite(incoming), '存档包含无效数值')
  return incoming
}

function assertShape(value: unknown, schema: unknown, label: string): void {
  if (Array.isArray(schema)) {
    assert(Array.isArray(value), `${label}必须是数组`)
    if (schema.length) value.forEach((item, index) => assertShape(item, schema[0], `${label}[${index}]`))
  } else if (isRecord(schema)) {
    assertRecord(value, label)
    for (const [key, item] of Object.entries(schema)) assertShape(value[key], item, `${label}.${key}`)
  } else if (schema === null) {
    assert(value === null || (typeof value === 'number' && Number.isFinite(value)), `${label}必须为空或有限数值`)
  } else {
    assert(typeof value === typeof schema, `${label}类型错误`)
    if (typeof value === 'number') assert(Number.isFinite(value), `${label}数值无效`)
  }
}

function assertNumberRecord(value: unknown, label: string, min = 0): void {
  assertRecord(value, label)
  for (const item of Object.values(value)) assertFiniteNumber(item, label, min)
}

/** Merge older saves with fresh defaults, then validate every persisted boundary. */
export function normalizeSave(data: unknown, defaults: GameState): GameState {
  assertRecord(data, '存档')
  for (const key of ['player', 'resources', 'gameTime', 'newSkills']) assertRecord(data[key], key)
  const newSkills = data.newSkills
  assertRecord(newSkills, '基础技能')
  const incoming = { ...data, newSkills: { ...newSkills }, eventLog: [] }
  for (const [key, skill] of Object.entries(incoming.newSkills as Record<string, unknown>)) {
    if (typeof skill === 'string') (incoming.newSkills as Record<string, unknown>)[key] = defaults.newSkills[key]
  }
  const merged = mergeState(defaults, incoming)
  assertRecord(merged, '存档')
  const timed = { id: '', name: '', duration: 1, completed: false, startTime: 0 }
  const queueSchemas: Record<string, Record<string, unknown>> = {
    currentActivities: { ...timed, recipeId: '' }, pendingActivities: { ...timed, recipeId: '' },
    researchActivities: { ...timed, recipeId: '', tech: '' }, pendingResearchActivities: { ...timed, recipeId: '', tech: '' },
    explorationActivities: { ...timed, recipeId: '', region: '' }, pendingExplorationActivities: { ...timed, recipeId: '', region: '' },
    buildingActivities: { ...timed, buildingId: '', level: 1, cost: {} }, pendingBuildingActivities: { ...timed, buildingId: '', level: 1, cost: {} },
    skillActivities: { ...timed, skillId: '', cost: { exp: 0 }, currentSkillBranch: '' }, pendingSkillActivities: { ...timed, skillId: '', cost: { exp: 0 }, currentSkillBranch: '' },
  }
  for (const [key, schema] of Object.entries(queueSchemas)) {
    const queue = merged[key]
    assert(Array.isArray(queue), key)
    for (const item of queue) {
      assertRecord(item, key)
      if (item.startTime === undefined) item.startTime = Date.now() // Legacy activity timers restart at import time.
      assert(typeof item.id === 'string' || (typeof item.id === 'number' && Number.isFinite(item.id)), '活动ID无效')
      assertShape({ ...item, id: '' }, schema, key)
      assertFiniteNumber(item.duration, '活动时长', 1)
      if (item.cost !== undefined) assertNumberRecord(item.cost, '活动花费')
    }
  }
  const questSchema = { id: '', name: '', icon: '', description: '', difficulty: 1, objectives: {}, rewards: {}, timeLimit: null }
  const schema = { ...defaults, buildings: [{ id: '', name: '', level: 1, effects: {} }], researched: [''], activeQuests: [questSchema], completedQuests: [questSchema] }
  assertShape(merged, schema, '存档')
  assertNumberRecord(merged.resources, '资源')
  assertNumberRecord(merged.resourceLimits, '资源上限')
  assertNumberRecord(merged.unlockedSkills, '技能等级')
  assertRecord(merged.player, '玩家')
  assertFiniteNumber(merged.player.level, '幸存者数量', 1)
  assertFiniteNumber(merged.player.maxHealth, '最大健康', 1)
  assertFiniteNumber(merged.player.maxEnergy, '最大体力', 1)
  assertRecord(merged.gameTime, '游戏时间')
  assertFiniteNumber(merged.gameTime.day, '天数', 1)
  assertFiniteNumber(merged.gameTime.timeScale, '时间倍率', Number.MIN_VALUE)
  assert(typeof merged.gameTime.hour === 'number' && merged.gameTime.hour >= 0 && merged.gameTime.hour < 24, '小时无效')
  assert(typeof merged.gameTime.minute === 'number' && merged.gameTime.minute >= 0 && merged.gameTime.minute < 60, '分钟无效')
  assert(['playing', 'paused', 'gameover'].includes(String(merged.gameState)), '游戏状态无效')
  assertRecord(merged.newSkills, '基础技能')
  for (const skill of Object.values(merged.newSkills)) {
    assertRecord(skill, '基础技能')
    assertFiniteNumber(skill.level, '基础技能等级', 1)
    assertFiniteNumber(skill.exp, '基础技能经验')
    assertFiniteNumber(skill.expToNextLevel, '升级经验', 1)
  }
  assert(Array.isArray(merged.buildings), '建筑')
  for (const building of merged.buildings) { assertRecord(building, '建筑'); assertNumberRecord(building.effects, '建筑效果'); assertFiniteNumber(building.level, '建筑等级', 1) }
  for (const key of ['activeQuests', 'completedQuests']) {
    const quests = merged[key]
    assert(Array.isArray(quests), key)
    for (const quest of quests) {
      assertShape(quest, questSchema, '任务')
      assertRecord(quest, '任务'); assertNumberRecord(quest.objectives, '任务目标'); assertNumberRecord(quest.rewards, '任务奖励')
      if (quest.acceptedAt !== undefined) assertFiniteNumber(quest.acceptedAt, '接受任务时间')
      if (quest.completedAt !== undefined) assertFiniteNumber(quest.completedAt, '完成任务时间')
      if (quest.unlockRequirements !== null) {
        assertRecord(quest.unlockRequirements, '任务解锁条件')
        if (quest.unlockRequirements.days !== undefined) assertFiniteNumber(quest.unlockRequirements.days, '任务解锁天数')
        if (quest.unlockRequirements.skills !== undefined) assertNumberRecord(quest.unlockRequirements.skills, '任务解锁技能')
      }
    }
  }
  // Shape and dynamic record checks above establish the complete GameState contract.
  return merged as unknown as GameState
}
