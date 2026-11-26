import type { Merchant } from '../types/game'

export const merchants: Merchant[] = [
  {
    id: 'wandering_trader',
    name: '流浪商人',
    icon: '🧙‍♂️',
    description: '定期出现的神秘商人，提供各种稀有资源',
    greeting: '你好，旅行者！我有一些稀有物品，你可能会感兴趣...',
    availability: {
      minDay: 5,
      frequency: 7, // 每7天出现一次
      duration: 1,  // 持续1天
    },
    sellItems: [
      { id: 'rare_herb', name: '稀有草药', resourceId: 'rare_herb', buyPrice: { food: 10, water: 10, herb: 10 }, stock: 5, icon: '🌿', amount: 3 },
      { id: 'advanced_parts', name: '高级零件', resourceId: 'advanced_parts', buyPrice: { parts: 10, tools: 5, metal: 8, wood: 15 }, stock: 2, icon: '🔧', amount: 1 },
      { id: 'ancientRelic', name: '古代遗物', resourceId: 'ancientRelic', buyPrice: { crystal: 1 }, stock: 1, icon: '🏺', amount: 1 }
    ],
    buyItems: [
      { id: 'sell_food', name: '食物', resourceId: 'food', sellPrice: { water: 1 }, icon: '🍖' },
      { id: 'sell_water', name: '水', resourceId: 'water', sellPrice: { food: 1 }, icon: '💧' }
    ],
    specialTrades: [
      {
        id: 'knowledge_exchange',
        name: '知识交换',
        description: '用你的资源换取宝贵的研究知识',
        inputs: { ancientRelic: 1, crystal: 1, techFragment: 2 },
        outputs: { exp: 50 }
      }
    ]
  },
  {
    id: 'settlement_trader',
    name: '定居点商人',
    icon: '👨‍🌾',
    description: '来自附近定居点的友好商人，提供基础资源交易',
    greeting: '欢迎！我们定居点有很多物资可以交换。',
    availability: {
      minDay: 10,
      frequency: 5, // 每5天出现一次
      duration: 2,  // 持续2天
    },
    sellItems: [
      { id: 'bulk_food', name: '大量食物', resourceId: 'food', buyPrice: { wood: 15, stone: 10 }, stock: 30, icon: '🍗', amount: 20 },
      { id: 'bulk_water', name: '大量水', resourceId: 'water', buyPrice: { wood: 15, stone: 10 }, stock: 30, icon: '🚰', amount: 20 },
      { id: 'medicine_pack', name: '药品', resourceId: 'medicine', buyPrice: { food: 15, herb: 5 }, stock: 5, icon: '💊' }
    ],
    buyItems: [
      { id: 'sell_wood', name: '木材', resourceId: 'wood', sellPrice: { food: 1 }, icon: '🌲' },
      { id: 'sell_stone', name: '石头', resourceId: 'stone', sellPrice: { food: 1 }, icon: '🗿' },
      { id: 'sell_metal', name: '金属', resourceId: 'metal', sellPrice: { food: 3 }, icon: '⚙️' }
    ],
    specialTrades: [
      {
        id: 'community_support',
        name: '社区支持',
        description: '为定居点提供资源，获得他们的支持',
        inputs: { crystal: 1, food: 20, water: 20, medicine: 2 },
        outputs: { maxHealth: 5, maxEnergy: 5 }
      }
    ]
  },
  {
    id: 'mysterious_stranger',
    name: '精灵',
    icon: '🧚',
    description: '罕见的精灵，提供独特而危险的交易',
    greeting: '嘘...我有些特别的东西，但代价可能很高...',
    availability: {
      minDay: 20,
      frequency: 15, // 每15天出现一次
      duration: 1,   // 持续1天
    },
    sellItems: [
      { id: 'advanced_tech', name: '科技碎片', resourceId: 'techFragment', buyPrice: { crystal: 1, ancientRelic: 2 }, stock: 3, icon: '💾', amount: 2 },
      { id: 'rare_material', name: '水晶', resourceId: 'crystal', buyPrice: { metal: 15, tools: 2 }, stock: 3, icon: '💎', amount: 1 }
    ],
    buyItems: [
      { id: 'sell_tech', name: '科技碎片', resourceId: 'techFragment', sellPrice: { food: 25, water: 25 }, icon: '💾' },
      { id: 'sell_parts', name: '零件', resourceId: 'parts', sellPrice: { food: 15, metal: 5 }, icon: '⚙️' }
    ],
    specialTrades: [
      {
        id: 'risky_experiment',
        name: '危险实验',
        description: '参与一项危险的实验，可能获得巨大收益或损失',
        inputs: { fuel: 10, medicine: 20, ancientRelic: 10, crystal: 10 },
        outputs: { exp: 1000 }
      }
    ]
  },
  {
    id: 'vampire_stranger',
    name: '吸血鬼',
    icon: '🧛',
    description: '罕见的吸血鬼，顾名思义',
    greeting: '虽然价格高但是值得...',
    availability: {
      minDay: 30,
      frequency: 30, // 每15天出现一次
      duration: 1, // 持续1天
    },
    sellItems: [
      { id: 'advanced_tech', name: '科技碎片', resourceId: 'techFragment', buyPrice: { ancientRelic: 4 }, stock: 3, icon: '💾', amount: 2 },
      { id: 'rare_material', name: '水晶', resourceId: 'crystal', buyPrice: { techFragment: 4 }, stock: 3, icon: '💎', amount: 2 },
      { id: 'rare_ancientRelic', name: '古代遗物', resourceId: 'ancientRelic', buyPrice: { crystal: 4 }, stock: 3, icon: '🏺', amount: 2 }
    ],
    buyItems: [],
    specialTrades: []
  }
]