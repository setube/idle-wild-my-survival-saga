import type { ResourceAmounts } from '../types/game'

export const resourceLimits: ResourceAmounts = {
  food: 50,
  water: 50,
  wood: 50,
  stone: 50,
  metal: 50,
  herb: 30,
  rare_herb: 30,
  medicine: 20,
  tools: 10,
  parts: 10,
  advanced_parts: 10,
  electronic_components: 10,
  crystal: 10,
  fuel: 20,
  ancientRelic: 5,
  techFragment: 5,
}

export const resources: ResourceAmounts = {
  food: 50,
  water: 50,
  wood: 0,
  stone: 0,
  metal: 0,
  herb: 0,
  rare_herb: 0,
  // 高级资源
  medicine: 1,
  tools: 0,
  parts: 0,
  advanced_parts: 0,
  electronic_components: 0,
  fuel: 0,
  // 特殊资源
  crystal: 0,
  ancientRelic: 0,
  techFragment: 0,
}