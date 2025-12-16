import type { Planet, Resources } from '@/types/game'
import { BuildingType, ShipType, DefenseType } from '@/types/game'
import { MOON_CONFIG, FLEET_STORAGE_CONFIG } from '@/config/gameConfig'

/**
 * 计算月球生成概率
 * @param debrisField 战斗产生的残骸场
 * @returns 生成概率（0-100）
 */
export const calculateMoonGenerationChance = (debrisField: Resources): number => {
  const totalDebris = debrisField.metal + debrisField.crystal

  // 残骸不足最小值，无法生成月球
  if (totalDebris < MOON_CONFIG.minDebrisField) {
    return 0
  }

  // 计算概率：基础概率 + (残骸量 / 每单位增加量) * 1%
  const additionalChance = Math.floor(totalDebris / MOON_CONFIG.chancePerDebris)
  const chance = MOON_CONFIG.baseChance + additionalChance

  // 限制在最大概率内
  return Math.min(chance, MOON_CONFIG.maxChance)
}

/**
 * 尝试生成月球
 * @param debrisField 战斗产生的残骸场
 * @param planetPosition 星球坐标
 * @param playerId 玩家ID
 * @returns 生成的月球对象，如果未生成则返回null
 */
export const tryGenerateMoon = (
  debrisField: Resources,
  planetPosition: { galaxy: number; system: number; position: number },
  planetId: string,
  playerId: string
): Planet | null => {
  const chance = calculateMoonGenerationChance(debrisField)

  // 无法生成
  if (chance === 0) {
    return null
  }

  // 随机判断是否生成
  const roll = Math.random() * 100
  if (roll >= chance) {
    return null
  }

  // 生成月球
  const moon: Planet = {
    id: `moon_${Date.now()}`,
    name: `Moon [${planetPosition.galaxy}:${planetPosition.system}:${planetPosition.position}]`,
    ownerId: playerId,
    position: planetPosition,
    resources: { metal: 0, crystal: 0, deuterium: 0, darkMatter: 0, energy: 0 },
    buildings: {} as Record<BuildingType, number>,
    fleet: {
      [ShipType.LightFighter]: 0,
      [ShipType.HeavyFighter]: 0,
      [ShipType.Cruiser]: 0,
      [ShipType.Battleship]: 0,
      [ShipType.Battlecruiser]: 0,
      [ShipType.Bomber]: 0,
      [ShipType.Destroyer]: 0,
      [ShipType.SmallCargo]: 0,
      [ShipType.LargeCargo]: 0,
      [ShipType.ColonyShip]: 0,
      [ShipType.Recycler]: 0,
      [ShipType.EspionageProbe]: 0,
      [ShipType.SolarSatellite]: 0,
      [ShipType.DarkMatterHarvester]: 0,
      [ShipType.Deathstar]: 0
    },
    defense: {
      [DefenseType.RocketLauncher]: 0,
      [DefenseType.LightLaser]: 0,
      [DefenseType.HeavyLaser]: 0,
      [DefenseType.GaussCannon]: 0,
      [DefenseType.IonCannon]: 0,
      [DefenseType.PlasmaTurret]: 0,
      [DefenseType.SmallShieldDome]: 0,
      [DefenseType.LargeShieldDome]: 0,
      [DefenseType.AntiBallisticMissile]: 0,
      [DefenseType.InterplanetaryMissile]: 0,
      [DefenseType.PlanetaryShield]: 0
    },
    buildQueue: [],
    lastUpdate: Date.now(),
    maxSpace: MOON_CONFIG.baseSize,
    maxFleetStorage: FLEET_STORAGE_CONFIG.baseStorage,
    isMoon: true,
    parentPlanetId: planetId
  }

  // 初始化所有建筑为0级
  Object.values(BuildingType).forEach(building => {
    moon.buildings[building] = 0
  })

  return moon
}

/**
 * 检查坐标是否已有月球
 * @param planets 所有星球列表
 * @param position 坐标
 * @returns 是否已有月球
 */
export const hasMoonAtPosition = (planets: Planet[], position: { galaxy: number; system: number; position: number }): boolean => {
  return planets.some(
    p =>
      p.isMoon &&
      p.position.galaxy === position.galaxy &&
      p.position.system === position.system &&
      p.position.position === position.position
  )
}
