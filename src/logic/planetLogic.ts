import type { Planet, Resources } from '@/types/game'
import { ShipType, DefenseType, BuildingType } from '@/types/game'
import { MOON_CONFIG, PLANET_CONFIG, FLEET_STORAGE_CONFIG } from '@/config/gameConfig'

/**
 * 创建初始星球
 */
export const createInitialPlanet = (playerId: string, planetName: string = 'Home Planet'): Planet => {
  const initialPlanet: Planet = {
    id: 'planet1',
    name: planetName,
    ownerId: playerId,
    position: { galaxy: 1, system: 1, position: 1 },
    resources: {
      metal: 500,
      crystal: 500,
      deuterium: 0,
      darkMatter: 0,
      energy: 0
    },
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
    maxSpace: 200,
    maxFleetStorage: FLEET_STORAGE_CONFIG.baseStorage,
    isMoon: false
  }

  // 初始化建筑等级
  Object.values(BuildingType).forEach(building => {
    initialPlanet.buildings[building] = 0
  })

  return initialPlanet
}

/**
 * 创建NPC星球
 */
export const createNPCPlanet = (
  npcId: number,
  position: { galaxy: number; system: number; position: number },
  planetPrefix: string = 'Planet'
): Planet => {
  const npcPlanet: Planet = {
    id: `npc_planet_${npcId}`,
    name: `${planetPrefix} ${position.galaxy}:${position.system}:${position.position}`,
    ownerId: `npc_${npcId}`,
    position,
    resources: {
      metal: Math.floor(Math.random() * 10000) + 5000,
      crystal: Math.floor(Math.random() * 5000) + 2000,
      deuterium: Math.floor(Math.random() * 2000) + 500,
      darkMatter: Math.floor(Math.random() * 100),
      energy: 0
    },
    buildings: {} as Record<BuildingType, number>,
    fleet: {
      [ShipType.LightFighter]: Math.floor(Math.random() * 50),
      [ShipType.HeavyFighter]: Math.floor(Math.random() * 20),
      [ShipType.Cruiser]: Math.floor(Math.random() * 10),
      [ShipType.Battleship]: Math.floor(Math.random() * 5),
      [ShipType.Battlecruiser]: Math.floor(Math.random() * 3),
      [ShipType.Bomber]: Math.floor(Math.random() * 2),
      [ShipType.Destroyer]: Math.floor(Math.random() * 2),
      [ShipType.SmallCargo]: Math.floor(Math.random() * 10),
      [ShipType.LargeCargo]: Math.floor(Math.random() * 5),
      [ShipType.ColonyShip]: 0,
      [ShipType.Recycler]: 0,
      [ShipType.EspionageProbe]: 0,
      [ShipType.SolarSatellite]: Math.floor(Math.random() * 20),
      [ShipType.DarkMatterHarvester]: 0,
      [ShipType.Deathstar]: 0
    },
    defense: {
      [DefenseType.RocketLauncher]: Math.floor(Math.random() * 100),
      [DefenseType.LightLaser]: Math.floor(Math.random() * 50),
      [DefenseType.HeavyLaser]: Math.floor(Math.random() * 20),
      [DefenseType.GaussCannon]: Math.floor(Math.random() * 10),
      [DefenseType.IonCannon]: Math.floor(Math.random() * 10),
      [DefenseType.PlasmaTurret]: Math.floor(Math.random() * 5),
      [DefenseType.SmallShieldDome]: Math.random() > 0.5 ? 1 : 0,
      [DefenseType.LargeShieldDome]: Math.random() > 0.8 ? 1 : 0,
      [DefenseType.AntiBallisticMissile]: Math.floor(Math.random() * 3),
      [DefenseType.InterplanetaryMissile]: Math.floor(Math.random() * 2),
      [DefenseType.PlanetaryShield]: 0
    },
    buildQueue: [],
    lastUpdate: Date.now(),
    maxSpace: 200,
    maxFleetStorage: FLEET_STORAGE_CONFIG.baseStorage,
    isMoon: false
  }

  // 随机初始化建筑等级
  Object.values(BuildingType).forEach(building => {
    npcPlanet.buildings[building] = Math.floor(Math.random() * 10)
  })

  return npcPlanet
}

/**
 * 计算月球生成概率
 */
export const calculateMoonChance = (debrisField: Resources): number => {
  const totalDebris = debrisField.metal + debrisField.crystal
  if (totalDebris < MOON_CONFIG.minDebrisField) return 0

  const chance = MOON_CONFIG.baseChance + Math.floor(totalDebris / MOON_CONFIG.chancePerDebris)
  return Math.min(chance, MOON_CONFIG.maxChance)
}

/**
 * 创建月球
 * @param parentPlanet 母星球
 * @param position 坐标
 * @param playerId 玩家ID
 * @param moonSuffix 月球名称后缀
 * @param diameter 月球直径(km)，用于计算销毁概率
 */
export const createMoon = (
  parentPlanet: Planet,
  position: { galaxy: number; system: number; position: number },
  playerId: string,
  moonSuffix: string = "'s Moon",
  diameter?: number
): Planet => {
  const moonId = `moon_${Date.now()}`
  const moon: Planet = {
    id: moonId,
    name: `${parentPlanet.name}${moonSuffix}`,
    ownerId: playerId,
    position: { ...position },
    resources: {
      metal: 0,
      crystal: 0,
      deuterium: 0,
      darkMatter: 0,
      energy: 0
    },
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
    maxSpace: MOON_CONFIG.baseFields, // OGame规则：月球初始只有1格空间
    maxFleetStorage: FLEET_STORAGE_CONFIG.baseStorage,
    isMoon: true,
    parentPlanetId: parentPlanet.id,
    diameter: diameter || MOON_CONFIG.minDiameter // 月球直径(km)
  }

  // 初始化建筑等级
  Object.values(BuildingType).forEach(building => {
    moon.buildings[building] = 0
  })

  return moon
}

/**
 * 计算月球空间上限
 * OGame规则：月球初始1格，月球基地每级+3格（但月球基地本身占用1格，净增2格）
 */
export const calculateMoonMaxSpace = (moon: Planet): number => {
  if (!moon.isMoon) return 0
  const lunarBaseLevel = moon.buildings[BuildingType.LunarBase] || 0
  return MOON_CONFIG.baseFields + lunarBaseLevel * MOON_CONFIG.lunarBaseFieldsBonus
}

/**
 * 计算行星空间上限
 */
export const calculatePlanetMaxSpace = (planet: Planet, terraformingTechLevel: number): number => {
  if (planet.isMoon) return 0

  // 基础空间
  let maxSpace = PLANET_CONFIG.baseSize

  // 地形改造器增加的空间
  const terraformerLevel = planet.buildings[BuildingType.Terraformer] || 0
  maxSpace += terraformerLevel * PLANET_CONFIG.terraformerSpaceBonus

  // 地形改造技术全局增加空间
  maxSpace += terraformingTechLevel * PLANET_CONFIG.terraformingTechSpaceBonus

  return maxSpace
}
