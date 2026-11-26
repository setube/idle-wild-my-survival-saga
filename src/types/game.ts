export type ResourceKey = 'food' | 'water' | 'wood' | 'stone' | 'metal' | 'herb' | 'rare_herb' | 'medicine' | 'tools' | 'parts' | 'advanced_parts' | 'electronic_components' | 'fuel' | 'crystal' | 'ancientRelic' | 'techFragment'
export type ResourceAmounts = Record<string, number>
export type SkillKey = 'gathering' | 'crafting' | 'combat' | 'survival' | 'research'
export interface Skill { name: string; level: number; exp: number; expToNextLevel: number }
export type SkillSet = Record<SkillKey, Skill> & Record<string, Skill>
export interface Player { [key: string]: number; level: number; exp: number; expToNextLevel: number; health: number; maxHealth: number; energy: number; maxEnergy: number; days: number; explorationCount: number }
export interface SkillEffects {
  [key: string]: number | boolean
  gatheringEfficiency: number; gatheringEnergyCost: number; rareHerbChance: number; gatheringYield: number
  craftingSpeed: number; resourceSaving: number; extraCraftingOutput: number; toolDurability: number; craftingQuality: number
  foodConsumption: number; waterConsumption: number; weatherResistance: number; energyConsumption: number; healthRecovery: number; allSurvivalStats: number
  researchSpeed: number; techFragmentYield: number; researchResourceSaving: number; allResearchBonus: number; breakthroughChance: number
  damageBonus: number; damageReduction: number; criticalChance: number; retreatEnergyCost: number; allCombatStats: number; maxHealth: number
  unlockAdvancedRecipes: boolean; unlockAdvancedTech: boolean; unlockSpecialCombat: boolean
}
export interface SkillDefinition { id: string; name: string; description: string; level: number; maxLevel: number; effects: Record<string, number | boolean>; cost: { exp: number }; requires: (Record<string, number | Record<string, number>> & { skills?: Record<string, number> }) | null; duration: number }
export interface SkillBranch { name: string; icon: string; description: string; skills: SkillDefinition[] }
export interface Recipe { id: string; name: string; inputs: ResourceAmounts; outputs: Record<string, number | [number, number]>; duration: number; skillRequired: ResourceAmounts; category: string; techRequired?: string }
export interface Technology { id: string; name: string; description: string; researched: boolean; cost: ResourceAmounts; researchTime: number; unlocks: string[]; requirements?: string[] }
export interface BuildingLevel { level: number; cost: ResourceAmounts; effects: ResourceAmounts; requirements: ResourceAmounts; buildTime: number }
export interface BuildingDefinition { id: string; name: string; description: string; levels: BuildingLevel[] }
export interface Building { id: string; name: string; level: number; effects: ResourceAmounts }
export interface ExplorationRegion { id: string; name: string; description: string; difficulty: number; amount: number; unlockRequirements: ResourceAmounts; resources: string[]; dangers: string[]; image: string; explorationTime: number; energyCost: number; resourceCost: ResourceAmounts }
export type ActivityId = string | number
export type TimerHandle = ReturnType<typeof setTimeout>
export interface TimedActivity { id: ActivityId; name: string; duration: number; completed: boolean; startTime: number; timer?: TimerHandle }
export interface Activity extends TimedActivity { recipeId: string }
export interface ResearchActivity extends Activity { tech: string }
export interface ExplorationActivity extends Activity { region: string }
export interface BuildingActivity extends TimedActivity { buildingId: string; level: number; cost: ResourceAmounts }
export interface SkillActivity extends TimedActivity { skillId: string; cost: { exp: number }; currentSkillBranch: string }
export interface Quest { id: string; name: string; icon: string; description: string; difficulty: number; objectives: ResourceAmounts; rewards: ResourceAmounts; timeLimit: number | null; unlockRequirements: { days?: number; skills?: ResourceAmounts } | null; acceptedAt?: number; completedAt?: number }
export interface WeatherEffects { gatheringEfficiency: number; energyConsumption: number; waterConsumption: number; foodConsumption: number; explorationEfficiency: number }
export interface WeatherState { current: string; duration: number; nextChangeDay: number; nextChangeHour: number; effects: WeatherEffects }
export interface GameState {
  appliedPermanentStats: { maxHealth: number; maxEnergy: number }
  player: Player; skillTreeEffects: SkillEffects; unlockedSkills: Record<string, number>
  season: { seasonLength: number; effects: ResourceAmounts }; weather: WeatherState; eventTriggered: boolean
  resources: ResourceAmounts; resourceLimits: ResourceAmounts; newSkills: SkillSet; buildings: Building[]
  currentActivities: Activity[]; pendingActivities: Activity[]; researchActivities: ResearchActivity[]; pendingResearchActivities: ResearchActivity[]
  explorationActivities: ExplorationActivity[]; pendingExplorationActivities: ExplorationActivity[]; buildingActivities: BuildingActivity[]; pendingBuildingActivities: BuildingActivity[]
  skillActivities: SkillActivity[]; pendingSkillActivities: SkillActivity[]
  gameTime: { day: number; hour: number; minute: number; timeScale: number; startTime: number; timestamp: number }
  researched: string[]; recipes: Recipe[]; settings: { autoSave: boolean; darkMode: boolean; soundEnabled: boolean; notificationsEnabled: boolean }
  eventLog: { timestamp: string; message: string }[]
  achievements: { unlocked: string[]; explorationCount: number; extremeWeatherSurvived: boolean; healthyDays: number; resourcesCollected: ResourceAmounts }
  gameState: 'playing' | 'paused' | 'gameover'; activeQuests: Quest[]; completedQuests: Quest[]
}
export interface MerchantSellItem { id: string; name: string; resourceId: string; buyPrice: ResourceAmounts; stock: number; icon: string; amount?: number }
export interface MerchantBuyItem { id: string; name: string; resourceId: string; sellPrice: ResourceAmounts; icon: string }
export interface SpecialTrade { id: string; name: string; description: string; inputs: ResourceAmounts; outputs: ResourceAmounts }
export interface Merchant { id: string; name: string; icon: string; description: string; greeting: string; availability: { minDay: number; frequency: number; duration: number }; sellItems: MerchantSellItem[]; buyItems: MerchantBuyItem[]; specialTrades: SpecialTrade[] }
export interface GameActions { addResource(resource: string, amount: number): boolean; consumeResource(resource: string, amount: number): boolean; addSkillExp(skill: string, exp: number): void; addExperience(exp: number): void; getResourceName(resource: string): string; addToEventLog(message: string, detail?: unknown): void }
export type GameContext = GameState & GameActions
export interface Achievement { id: string; name: string; description: string; icon: string; condition: (store: GameContext) => boolean; reward: ResourceAmounts; unlocked: boolean }
export type EventType = 'positive' | 'neutral' | 'negative' | 'disaster' | 'special'
export interface EventOption { text: string; condition?: (store: GameContext) => boolean; effect: (store: GameContext) => string }
export interface GameEvent { id: string; title: string; description: string; type: EventType; condition: (store: GameContext) => boolean; options: EventOption[]; weight: number; minDay: number }
export interface WeatherDefinition { name: string; icon: string; description: string; color: string; probability: number; duration: { min: number; max: number }; animation: string; effects: WeatherEffects; seasonModifiers?: ResourceAmounts; events?: { id: string; name: string; probability: number; effect: (store: GameContext) => void }[] }
