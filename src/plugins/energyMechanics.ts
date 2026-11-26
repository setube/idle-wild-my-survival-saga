import type { GameState } from '../types/game'

type EnergyState = Pick<GameState, 'player' | 'gameTime' | 'weather' | 'season' | 'buildings'>

/** Amount recovered at each game-hour boundary, before shortages and the energy cap. */
export const getEnergyRecovery = (state: EnergyState) => {
  const isNight = state.gameTime.hour >= 22 || state.gameTime.hour <= 6
  const weatherMultiplier = ['hot', 'cold'].includes(state.weather.current) ? 0.8 : 1
  const seasonIndex = Math.floor(((state.gameTime.day - 1) % (state.season.seasonLength * 4)) / state.season.seasonLength)
  const seasonMultiplier = [1.1, 0.9, 1, 0.8][seasonIndex] ?? 1
  const natural = state.player.maxEnergy * (isNight ? 0.05 : 0.01) * weatherMultiplier
  const building = state.buildings.reduce((total, item) => total + (item.effects.energyRecovery ?? 0) * seasonMultiplier, 0)
  return { natural, building, total: natural + building, isNight, weatherMultiplier, seasonMultiplier }
}
