import { describe, expect, test } from 'bun:test'
import { validateGameConfiguration } from '../src/plugins/configAssertions'

describe('游戏配置边界断言', () => {
  test('所有游戏资源、配方、科技、技能、建筑、探索地区和商人交易均引用有效配置', () => {
    expect(() => validateGameConfiguration()).not.toThrow()
  })
})
