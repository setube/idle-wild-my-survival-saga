import type { Recipe, Technology, BuildingDefinition } from '../types/game'

export const recipes: Recipe[] = [
	// 基础采集配方
	{
		id: 'gather_food',
		name: '采集食物',
		inputs: { energy: 10 },
		outputs: { food: [5, 20] }, // [最小值, 最大值]
		duration: 60, // 秒
		skillRequired: { gathering: 1 },
		category: 'gathering'
	},
	{
		id: 'gather_water',
		name: '收集水',
		inputs: { energy: 10 },
		outputs: { water: [5, 20] },
		duration: 60,
		skillRequired: { gathering: 1 },
		category: 'gathering'
	},
	{
		id: 'gather_wood',
		name: '收集木材',
		inputs: { food: 5, water: 5, energy: 15 },
		outputs: { wood: [5, 10] },
		duration: 90,
		skillRequired: { gathering: 1 },
		category: 'gathering'
	},
	{
		id: 'gather_stone',
		name: '收集石头',
		inputs: { food: 5, water: 5, energy: 20 },
		outputs: { stone: [5, 10] },
		duration: 120,
		skillRequired: { gathering: 1 },
		category: 'gathering'
	},
	{
		id: 'gather_herb',
		name: '采集草药',
		inputs: { food: 5, water: 5, energy: 15 },
		outputs: { herb: [5, 10] },
		duration: 90,
		skillRequired: { gathering: 2 },
		category: 'gathering'
	},
	{
		id: 'gather_search_metal',
		name: '寻找金属',
		inputs: { food: 5, water: 5, energy: 25 },
		outputs: { metal: [1, 10] },
		duration: 150,
		skillRequired: { gathering: 3 },
		category: 'gathering'
	},
	{
		id: 'gather_rare_herb',
		name: '采集稀有草药',
		inputs: { food: 10, water: 10, energy: 30 },
		outputs: { rare_herb: [1, 3] },
		duration: 300,
		skillRequired: { gathering: 4 },
		category: 'gathering'
	},
	// 基础制作配方
	{
		id: 'craft_simple_tool',
		name: '制作简易工具',
		inputs: { energy: 15, wood: 5, stone: 3, metal: 2 },
		outputs: { tools: 1 },
		duration: 120,
		skillRequired: { crafting: 1 },
		techRequired: 'basic_crafting',
		category: 'crafting'
	},
	{
		id: 'craft_medicine',
		name: '制作药品',
		inputs: { energy: 15, herb: 5, water: 3, rare_herb: 2 },
		outputs: { medicine: 1 },
		duration: 180,
		skillRequired: { crafting: 2 },
		techRequired: 'medicine_brewing',
		category: 'crafting'
	},
	{
		id: 'craft_fuel',
		name: '制作燃料',
		inputs: { energy: 10, wood: 8, water: 10 },
		outputs: { fuel: 2 },
		duration: 150,
		skillRequired: { crafting: 2 },
		category: 'crafting'
	},
	{
		id: 'craft_parts',
		name: '制作零件',
		inputs: { energy: 20, metal: 5, tools: 1 },
		outputs: { parts: 2 },
		duration: 240,
		skillRequired: { crafting: 3 },
		techRequired: 'metallurgy',
		category: 'crafting'
	},
	{
		id: 'craft_advanced_parts',
		name: '制作高级零件',
		inputs: { parts: 5, energy: 20, metal: 5, tools: 1 },
		outputs: { advanced_parts: 1 },
		duration: 500,
		skillRequired: { crafting: 3 },
		techRequired: 'advanced_tools',
		category: 'crafting'
	},
	{
		id: 'craft_electronic_components',
		name: '制作电子元件',
		inputs: { advanced_parts: 2, parts: 5, energy: 20, metal: 5, tools: 1 },
		outputs: { electronic_components: 2 },
		duration: 500,
		skillRequired: { crafting: 5 },
		techRequired: 'advanced_tools',
		category: 'crafting'
	},
]

export const technologies: Technology[] = [
	// 基础科技
	{
		id: 'basic_survival',
		name: '基础生存',
		description: '掌握基本的生存技能',
		researched: true, // 默认已解锁
		cost: {},
		researchTime: 60,
		unlocks: ['basic_crafting', 'water_collection']
	},
	{
		id: 'basic_crafting',
		name: '基础制作',
		description: '学习简单工具的制作方法',
		researched: false,
		cost: { techFragment: 1 },
		unlocks: ['advanced_crafting', 'tool_making'],
		researchTime: 60,
			requirements: ['basic_survival']
	},
	{
		id: 'metallurgy',
		name: '冶金学',
		description: '研究金属加工，解锁零件制作',
		researched: false,
		cost: { techFragment: 3 },
		researchTime: 900,
		unlocks: ['advanced_tools'],
		requirements: ['advanced_crafting']
	},
	{
		id: 'advanced_tools',
		name: '高级工具',
		description: '研究先进工具与电子元件的制作方法',
		researched: false,
		cost: { techFragment: 4 },
		researchTime: 1200,
		unlocks: [],
		requirements: ['tool_making', 'metallurgy']
	},
	{
		id: 'water_collection',
		name: '集水技术',
		description: '更有效地收集和储存水资源',
		researched: false,
		cost: { techFragment: 1 },
		unlocks: ['water_purification'],
		researchTime: 60,
		requirements: ['basic_survival']
	},
	// 进阶科技
	{
		id: 'advanced_crafting',
		name: '进阶制作',
		description: '学习复杂物品的制作方法',
		researched: false,
		cost: { techFragment: 2 },
		unlocks: ['metallurgy'],
		researchTime: 600,
		requirements: ['basic_crafting']
	},
	{
		id: 'tool_making',
		name: '工具制作',
		description: '制作更高效的工具',
		researched: false,
		cost: { techFragment: 2, wood: 15, stone: 10 },
		unlocks: ['advanced_tools'],
		researchTime: 600,
		requirements: ['basic_crafting']
	},
	{
		id: 'water_purification',
		name: '水净化',
		description: '净化水源，减少疾病风险',
		researched: false,
		cost: { techFragment: 2, herb: 5 },
		unlocks: ['medicine_brewing'],
		researchTime: 600,
		requirements: ['water_collection']
	},
	{
		id: 'medicine_brewing',
		name: '药品调配',
		description: '研究草药与水的配比，解锁药品制作',
		researched: false,
		cost: { techFragment: 3, herb: 5 },
		researchTime: 900,
		unlocks: [],
		requirements: ['water_purification']
	}
]

export const availableBuildings: BuildingDefinition[] = [
	{
		id: 'shelter',
		name: '简易庇护所',
		description: '提供基本的居住场所，增加体力恢复速度',
		levels: [
			{
				level: 1,
				cost: { wood: 10, stone: 5 },
				effects: { energyRecovery: 1 },
				requirements: { survival: 1 },
				buildTime: 600
			},
			{
				level: 2,
				cost: { wood: 20, stone: 15, metal: 5 },
				effects: { energyRecovery: 2 },
				requirements: { survival: 2, crafting: 1 },
				buildTime: 1200
			},
			{
				level: 3,
				cost: { wood: 40, stone: 30, metal: 15, tools: 2 },
				effects: { energyRecovery: 3, maxHealth: 10 },
				requirements: { survival: 5, crafting: 10 },
				buildTime: 1800
			},
			{
				level: 4,
				cost: { crystal: 5, techFragment: 5, wood: 100, stone: 100, metal: 100, tools: 20 },
				effects: { energyRecovery: 5, maxHealth: 50 },
				requirements: { survival: 10, crafting: 10 },
				buildTime: 2400
			},
			{
				level: 5,
				cost: { crystal: 10, techFragment: 10, wood: 150, stone: 150, metal: 150, tools: 30 },
				effects: { energyRecovery: 10, maxHealth: 100 },
				requirements: { survival: 20, crafting: 20 },
				buildTime: 3000
			}
		]
	},
	{
		id: 'storage',
		name: '储物区',
		description: '增加资源存储上限',
		levels: [
			{
				level: 1,
				cost: { wood: 15, stone: 5 },
				effects: { storageMultiplier: 1.2 },
				requirements: { gathering: 1 },
				buildTime: 600
			},
			{
				level: 2,
				cost: { wood: 30, stone: 15, metal: 5 },
				effects: { storageMultiplier: 1.5 },
				requirements: { gathering: 2, crafting: 1 },
				buildTime: 1200
			},
			{
				level: 3,
				cost: { wood: 50, stone: 30, metal: 15, tools: 3 },
				effects: { storageMultiplier: 2 },
				requirements: { gathering: 3, crafting: 2 },
				buildTime: 1800
			},
			{
				level: 4,
				cost: { crystal: 5, techFragment: 5, wood: 100, stone: 100, metal: 100, tools: 20 },
				effects: { storageMultiplier: 2.5 },
				requirements: { gathering: 10, crafting: 10 },
				buildTime: 2400
			},
			{
				level: 5,
				cost: { crystal: 10, techFragment: 10, wood: 125, stone: 125, metal: 125, tools: 25 },
				effects: { storageMultiplier: 3 },
				requirements: { gathering: 20, crafting: 20 },
				buildTime: 3000
			}
		]
	},
	{
		id: 'workshop',
		name: '工作坊',
		description: '提高制作效率，解锁更多制作配方',
		levels: [
			{
				level: 1,
				cost: { wood: 20, stone: 10, metal: 5 },
				effects: { craftingSpeed: 1.1 },
				requirements: { crafting: 1 },
				buildTime: 600
			},
			{
				level: 2,
				cost: { wood: 35, stone: 20, metal: 15, tools: 2 },
				effects: { craftingSpeed: 1.25 },
				requirements: { crafting: 2 },
				buildTime: 1200
			},
			{
				level: 3,
				cost: { wood: 60, stone: 40, metal: 30, tools: 5, parts: 3 },
				effects: { craftingSpeed: 1.5 },
				requirements: { crafting: 3, research: 1 },
				buildTime: 1800
			},
			{
				level: 4,
				cost: { crystal: 5, techFragment: 5, wood: 150, stone: 100, metal: 100, tools: 20, parts: 20 },
				effects: { craftingSpeed: 2 },
				requirements: { crafting: 10, research: 10 },
				buildTime: 2400
			},
			{
				level: 5,
				cost: { crystal: 10, techFragment: 10, metal: 150, tools: 30 },
				effects: { craftingSpeed: 3 },
				requirements: { crafting: 20, research: 20 },
				buildTime: 3000
			}
		]
	},
	{
		id: 'garden',
		name: '菜园',
		description: '提供稳定的食物来源',
		levels: [
			{
				level: 1,
				cost: { crystal: 1, wood: 10, stone: 5, water: 10 },
				effects: { foodPerDay: 1 },
				requirements: { gathering: 2 },
				buildTime: 600
			},
			{
				level: 2,
				cost: { crystal: 3, wood: 20, stone: 10, water: 20, tools: 1 },
				effects: { foodPerDay: 2 },
				requirements: { gathering: 3 },
				buildTime: 1200
			},
			{
				level: 3,
				cost: { crystal: 5, wood: 40, stone: 20, water: 30, tools: 3 },
				effects: { foodPerDay: 3 },
				requirements: { gathering: 4 },
				buildTime: 1800
			},
			{
				level: 4,
				cost: { crystal: 10, techFragment: 5, wood: 100, stone: 100, water: 100, tools: 30 },
				effects: { foodPerDay: 4 },
				requirements: { gathering: 10 },
				buildTime: 2400
			},
			{
				level: 5,
				cost: { crystal: 20, techFragment: 10, wood: 150, stone: 100, water: 150, tools: 30 },
				effects: { foodPerDay: 5 },
				requirements: { gathering: 20 },
				buildTime: 3000
			}
		]
	},
	{
		id: 'well',
		name: '水井',
		description: '提供稳定的水源',
		levels: [
			{
				level: 1,
				cost: { crystal: 1, wood: 5, stone: 15 },
				effects: { waterPerDay: 1 },
				requirements: { survival: 2 },
				buildTime: 600
			},
			{
				level: 2,
				cost: { crystal: 3, wood: 10, stone: 30, tools: 1 },
				effects: { waterPerDay: 2 },
				requirements: { survival: 3 },
				buildTime: 1200
			},
			{
				level: 3,
				cost: { crystal: 5, wood: 20, stone: 50, metal: 10, tools: 2 },
				effects: { waterPerDay: 3 },
				requirements: { survival: 4 },
				buildTime: 1800
			},
			{
				level: 4,
				cost: { crystal: 10, techFragment: 5, wood: 100, stone: 100, metal: 100, tools: 30 },
				effects: { waterPerDay: 4 },
				requirements: { survival: 10 },
				buildTime: 2400
			},
			{
				level: 5,
				cost: { crystal: 20, techFragment: 10, wood: 150, stone: 150, metal: 100, tools: 30 },
				effects: { waterPerDay: 5 },
				requirements: { survival: 20 },
				buildTime: 3000
			}
		]
	},
	{
		id: 'medicinalGarden',
		name: '药草园',
		description: '种植和培育草药',
		levels: [
			{
				level: 1,
				cost: { wood: 15, water: 15, herb: 5 },
				effects: { herbPerDay: 2 },
				requirements: { gathering: 3 },
				buildTime: 600
			},
			{
				level: 2,
				cost: { wood: 25, water: 25, herb: 10, tools: 2 },
				effects: { herbPerDay: 4, medicinePerDay: 1 },
				requirements: { gathering: 4, research: 2 },
				buildTime: 1200
			},
			{
				level: 3,
				cost: { wood: 40, water: 40, herb: 20, tools: 4 },
				effects: { herbPerDay: 7, medicinePerDay: 2 },
				requirements: { gathering: 5, research: 3 },
				buildTime: 1800
			},
			{
				level: 4,
				cost: { crystal: 5, techFragment: 5, wood: 100, water: 100, herb: 90, tools: 30 },
				effects: { herbPerDay: 10, medicinePerDay: 3 },
				requirements: { gathering: 10, research: 10 },
				buildTime: 2400
			},
			{
				level: 5,
				cost: { crystal: 10, techFragment: 10, wood: 150, water: 150, herb: 90, tools: 30 },
				effects: { herbPerDay: 13, medicinePerDay: 4 },
				requirements: { gathering: 20, research: 20 },
				buildTime: 3000
			}
		]
	},
	{
		id: 'forge',
		name: '锻造坊',
		description: '加工金属，制作工具和零件',
		levels: [
			{
				level: 1,
				cost: { wood: 20, stone: 30, metal: 15 },
				effects: { toolsPerDay: 1 },
				requirements: { crafting: 3 },
				buildTime: 600
			},
			{
				level: 2,
				cost: { wood: 30, stone: 50, metal: 30, tools: 3 },
				effects: { toolsPerDay: 2, partsPerDay: 1 },
				requirements: { crafting: 4, research: 2 },
				buildTime: 1200
			},
			{
				level: 3,
				cost: { wood: 50, stone: 80, metal: 50, tools: 5, fuel: 10 },
				effects: { toolsPerDay: 3, partsPerDay: 2 },
				requirements: { crafting: 5, research: 3 },
				buildTime: 1800
			},
			{
				level: 4,
				cost: { crystal: 5, techFragment: 5, wood: 100, stone: 150, metal: 100, tools: 30, fuel: 60 },
				effects: { toolsPerDay: 4, partsPerDay: 3 },
				requirements: { crafting: 10, research: 10 },
				buildTime: 2400
			},
			{
				level: 5,
				cost: { crystal: 10, techFragment: 10, wood: 100, stone: 150, metal: 100, tools: 30, electronic_components: 30, fuel: 60 },
				effects: { toolsPerDay: 5, partsPerDay: 4 },
				requirements: { crafting: 20, research: 20 },
				buildTime: 3000
			}
		]
	},
	{
		id: 'lumberMill',
		name: '伐木场',
		description: '专业化的木材生产设施，提高木材产量',
		levels: [
			{
				level: 1,
				cost: { wood: 30, stone: 20, tools: 2 },
				effects: { woodPerDay: 1 },
				requirements: { gathering: 3, crafting: 2 },
				buildTime: 1200
			},
			{
				level: 2,
				cost: { wood: 50, stone: 30, metal: 10, tools: 4 },
				effects: { woodPerDay: 3 },
				requirements: { gathering: 4, crafting: 3 },
				buildTime: 1800
			},
			{
				level: 3,
				cost: { wood: 80, stone: 50, metal: 20, tools: 6, parts: 5 },
				effects: { woodPerDay: 5 },
				requirements: { gathering: 5, crafting: 4 },
				buildTime: 2400
			},
			{
				level: 4,
				cost: { crystal: 5, techFragment: 5, wood: 120, stone: 80, metal: 40, tools: 10, parts: 10 },
				effects: { woodPerDay: 7 },
				requirements: { gathering: 10, crafting: 10 },
				buildTime: 3000
			},
			{
				level: 5,
				cost: { crystal: 10, techFragment: 10, wood: 150, stone: 100, metal: 50, tools: 15, parts: 15 },
				effects: { woodPerDay: 10 },
				requirements: { gathering: 20, crafting: 20 },
				buildTime: 3600
			}
		]
	},
	{
		id: 'mine',
		name: '采矿场',
		description: '专业化的矿石开采设施，提高矿石与金属产量',
		levels: [
			{
				level: 1,
				cost: { wood: 20, stone: 30, tools: 3 },
				effects: { stonePerDay: 1, metalPerDay: 1 },
				requirements: { gathering: 4, crafting: 2 },
				buildTime: 1500
			},
			{
				level: 2,
				cost: { wood: 30, stone: 50, metal: 15, tools: 5 },
				effects: { stonePerDay: 3, metalPerDay: 1 },
				requirements: { gathering: 5, crafting: 3 },
				buildTime: 2100
			},
			{
				level: 3,
				cost: { wood: 50, stone: 80, metal: 25, tools: 8, parts: 5 },
				effects: { stonePerDay: 5, metalPerDay: 2 },
				requirements: { gathering: 6, crafting: 4 },
				buildTime: 2700
			},
			{
				level: 4,
				cost: { crystal: 5, techFragment: 5, wood: 100, stone: 120, metal: 50, tools: 12, parts: 10 },
				effects: { stonePerDay: 7, metalPerDay: 2 },
				requirements: { gathering: 10, crafting: 10 },
				buildTime: 3300
			},
			{
				level: 5,
				cost: { crystal: 10, techFragment: 10, wood: 120, stone: 150, metal: 80, tools: 15, parts: 15 },
				effects: { stonePerDay: 10, metalPerDay: 5 },
				requirements: { gathering: 20, crafting: 20 },
				buildTime: 3900
			}
		]
	}
]
