import type { GameEvent } from '../types/game'

export const eventTypes = {
  positive: { icon: '🍀', color: '#67C23A', title: '幸运事件' },
  neutral: { icon: '⚖️', color: '#909399', title: '普通事件' },
  negative: { icon: '⚠️', color: '#E6A23C', title: '危险事件' },
  disaster: { icon: '🌋', color: '#F56C6C', title: '灾难事件' },
  special: { icon: '✨', color: '#8E44AD', title: '特殊事件' }
}

export const eventLibrary: GameEvent[] = [
  // 正面事件
  {
    id: 'wild_harvest',
    title: '野外丰收',
    description: '你在野外发现了一片未被发现的资源丰富区域。',
    type: 'positive',
    condition: (store) => true, // 无条件触发
    options: [
      {
        text: '采集食物',
        effect: (store) => {
          const amount = Math.floor(Math.random() * 10) + 5
          store.addResource('food', amount)
          store.addToEventLog(`你采集了${amount}单位食物`)
          return `你采集了${amount}单位食物`
        }
      },
      {
        text: '收集水源',
        effect: (store) => {
          const amount = Math.floor(Math.random() * 8) + 5
          store.addResource('water', amount)
          store.addToEventLog(`你收集了${amount}单位水`)
          return `你收集了${amount}单位水`
        }
      },
      {
        text: '寻找草药',
        effect: (store) => {
          const amount = Math.floor(Math.random() * 5) + 2
          store.addResource('herb', amount)
          store.addToEventLog(`你找到了${amount}单位草药`)
          return `你找到了${amount}单位草药`
        }
      }
    ],
    weight: 10,
    minDay: 1
  },
  {
    id: 'ancient_cache',
    title: '古代遗迹',
    description: '你发现了一个被掩埋的古代科技遗迹。',
    type: 'positive',
    condition: (store) => store.player.days >= 5,
    options: [
      {
        text: '仔细研究',
        effect: (store) => {
          store.addResource('techFragment', 2)
          store.addSkillExp('research', 30)
          store.addToEventLog('你获得了2个科技碎片并提升了研究技能')
          return '你获得了2个科技碎片并提升了研究技能'
        }
      },
      {
        text: '快速搜索',
        effect: (store) => {
          if (Math.random() < 0.7) {
            store.addResource('techFragment', 1)
            store.addResource('parts', 1)
            store.addToEventLog('你获得了1个科技碎片和1个零件')
            return '你获得了1个科技碎片和1个零件'
          } else {
            store.addToEventLog('你搜索时不小心触发了防护机制，一无所获')
            return '你搜索时不小心触发了防护机制，一无所获'
          }
        }
      }
    ],
    weight: 5,
    minDay: 5
  },
  // 中性事件
  {
    id: 'wandering_trader',
    title: '流浪商人',
    description: '一位神秘的流浪商人来到了你的营地，提供一些交易。',
    type: 'neutral',
    condition: (store) => true,
    options: [
      {
        text: '用5单位食物换取3单位草药',
        condition: (store) => store.resources.food >= 5,
        effect: (store) => {
          store.consumeResource('food', 5)
          store.addResource('herb', 3)
          store.addToEventLog('你用5单位食物换取了3单位草药')
          return '交易完成：-5食物，+3草药'
        }
      },
      {
        text: '用8单位木材换取2单位工具',
        condition: (store) => store.resources.wood >= 8,
        effect: (store) => {
          store.consumeResource('wood', 8)
          store.addResource('tools', 2)
          store.addToEventLog('你用8单位木材换取了2单位工具')
          return '交易完成：-8木材，+2工具'
        }
      },
      {
        text: '不进行交易',
        effect: (store) => {
          store.addToEventLog('你婉拒了商人的交易')
          return '你婉拒了商人的交易'
        }
      }
    ],
    weight: 8,
    minDay: 3
  },
  {
    id: 'lost_traveler',
    title: '迷路的旅行者',
    description: '你遇到了一位迷路的旅行者，他看起来又饿又渴。',
    type: 'neutral',
    condition: (store) => store.player.days >= 4,
    options: [
      {
        text: '分享食物和水',
        condition: (store) => store.resources.food >= 3 && store.resources.water >= 3,
        effect: (store) => {
          store.consumeResource('food', 3)
          store.consumeResource('water', 3)
          // 随机奖励
          const rewards = [
            () => {
              store.addResource('medicine', 1)
              store.addToEventLog('旅行者感谢你的帮助，给了你1单位药品')
              return '旅行者感谢你的帮助，给了你1单位药品'
            },
            () => {
              store.addResource('techFragment', 1)
              store.addToEventLog('旅行者感谢你的帮助，给了你1个科技碎片')
              return '旅行者感谢你的帮助，给了你1个科技碎片'
            },
            () => {
              store.player.exp += store.player.expToNextLevel * 0.1
              store.addToEventLog('旅行者感谢你的帮助，分享了一些有趣的故事，你获得了许多幸存者经验')
              return '旅行者感谢你的帮助，分享了一些有趣的故事，你获得了许多幸存者经验'
            }
          ]
          return rewards[Math.floor(Math.random() * rewards.length)]()
        }
      },
      {
        text: '无视他',
        effect: (store) => {
          store.player.health -= 5
          store.addToEventLog('你选择无视旅行者，这让你感到有些内疚')
          return '你选择无视旅行者，这让你感到有些内疚'
        }
      }
    ],
    weight: 7,
    minDay: 4
  },
  // 负面事件
  {
    id: 'food_spoilage',
    title: '食物腐败',
    description: '你储存的一些食物因为保存不当而腐败了。',
    type: 'negative',
    condition: (store) => store.resources.food >= 5,
    options: [
      {
        text: '丢弃腐败食物',
        effect: (store) => {
          const amount = Math.floor(store.resources.food * 0.3)
          store.consumeResource('food', amount)
          store.addToEventLog(`你丢弃了${amount}单位腐败的食物`)
          return `你丢弃了${amount}单位腐败的食物`
        }
      },
      {
        text: '尝试挽救',
        effect: (store) => {
          if (store.newSkills.survival.level >= 3) {
            const amount = Math.floor(store.resources.food * 0.15)
            store.consumeResource('food', amount)
            store.addToEventLog(`凭借你的生存技能，你只损失了${amount}单位食物`)
            return `凭借你的生存技能，你只损失了${amount}单位食物`
          } else {
            const amount = Math.floor(store.resources.food * 0.4)
            store.consumeResource('food', amount)
            store.player.health -= 5
            store.addToEventLog(`你尝试挽救腐败食物，但失败了，损失了${amount}单位食物，还感到有些不适`)
            return `你尝试挽救腐败食物，但失败了，损失了${amount}单位食物，还感到有些不适`
          }
        }
      }
    ],
    weight: 6,
    minDay: 5
  },
  {
    id: 'tool_break',
    title: '工具损坏',
    description: '你的一些工具在使用过程中损坏了。',
    type: 'negative',
    condition: (store) => store.resources.tools >= 1,
    options: [
      {
        text: '尝试修复',
        effect: (store) => {
          if (store.newSkills.crafting.level >= 2 && store.resources.metal >= 1) {
            store.consumeResource('metal', 1)
            store.addToEventLog('你成功修复了损坏的工具')
            return '你成功修复了损坏的工具'
          } else {
            store.consumeResource('tools', 1)
            store.addToEventLog('你无法修复工具，损失了1单位工具')
            return '你无法修复工具，损失了1单位工具'
          }
        }
      },
      {
        text: '放弃修复',
        effect: (store) => {
          store.consumeResource('tools', 1)
          store.addToEventLog('你放弃修复，损失了1单位工具')
          return '你放弃修复，损失了1单位工具'
        }
      }
    ],
    weight: 5,
    minDay: 6
  },
  // 灾难事件
  {
    id: 'severe_storm',
    title: '强烈风暴',
    description: '一场强烈的风暴袭击了你的营地，造成了严重破坏。',
    type: 'disaster',
    condition: (store) => store.player.days >= 10,
    options: [
      {
        text: '寻找庇护',
        effect: (store) => {
          const hasShelter = store.buildings.some(b => b.id === 'shelter' && b.level >= 2)
          if (hasShelter) {
            store.addToEventLog('你的高级庇护所提供了良好的保护，你安全度过了风暴')
            return '你的高级庇护所提供了良好的保护，你安全度过了风暴'
          } else {
            const healthLoss = Math.floor(Math.random() * 10) + 10
            store.player.health -= healthLoss
            // 随机损失资源
            const resources = ['food', 'water', 'wood', 'herb']
            resources.forEach(res => {
              if (store.resources[res] > 0) {
                const lossAmount = Math.floor(store.resources[res] * 0.3)
                if (lossAmount > 0) {
                  store.consumeResource(res, lossAmount)
                }
              }
            })

            store.addToEventLog(`你勉强在风暴中生存下来，但损失了健康和资源`)
            return `你勉强在风暴中生存下来，但损失了健康和资源`
          }
        }
      },
      {
        text: '加固营地',
        condition: (store) => store.resources.wood >= 5 && store.resources.stone >= 3,
        effect: (store) => {
          store.consumeResource('wood', 5)
          store.consumeResource('stone', 3)
          const healthLoss = Math.floor(Math.random() * 5) + 5
          store.player.health -= healthLoss
          // 减少资源损失
          const resources = ['food', 'water']
          resources.forEach(res => {
            if (store.resources[res] > 0) {
              const lossAmount = Math.floor(store.resources[res] * 0.15)
              if (lossAmount > 0) {
                store.consumeResource(res, lossAmount)
              }
            }
          })

          store.addSkillExp('survival', 20)
          store.addToEventLog('你成功加固了营地，减少了风暴造成的损失')
          return '你成功加固了营地，减少了风暴造成的损失'
        }
      }
    ],
    weight: 3,
    minDay: 10
  },
  // 特殊事件
  {
    id: 'mysterious_stranger',
    title: '神秘来客',
    description: '一位神秘的来客拜访了你的营地，他似乎知道很多关于这个世界的秘密。',
    type: 'special',
    condition: (store) => store.player.days >= 15,
    options: [
      {
        text: '询问生存技巧',
        effect: (store) => {
          store.addSkillExp('survival', 50)
          store.addToEventLog('神秘来客教给你一些高级生存技巧')
          return '神秘来客教给你一些高级生存技巧，你的生存技能得到提升'
        }
      },
      {
        text: '询问世界秘密',
        effect: (store) => {
          store.addResource('techFragment', 3)
          store.player.health += 10
          store.addToEventLog('神秘来客向你透露了一些世界的秘密，并给了你一些科技碎片')
          return '神秘来客向你透露了一些世界的秘密，并给了你一些科技碎片'
        }
      },
      {
        text: '保持警惕',
        effect: (store) => {
          store.addSkillExp('combat', 20)
          store.addToEventLog('你对神秘来客保持警惕，提高了你的战斗意识')
          return '你对神秘来客保持警惕，提高了你的战斗意识'
        }
      }
    ],
    weight: 2,
    minDay: 15
  }
]