import type { Resources, BuildQueueItem, Fleet } from '@/types/game'
import { ShipType, DefenseType, BuildingType, TechnologyType } from '@/types/game'
import { SHIPS, DEFENSES } from '@/config/gameConfig'

// 用于生成唯一ID的计数器
let shipQueueIdCounter = 0

/**
 * 计算舰船建造成本
 */
export const calculateShipCost = (shipType: ShipType, quantity: number): Resources => {
  const config = SHIPS[shipType]
  return {
    metal: config.cost.metal * quantity,
    crystal: config.cost.crystal * quantity,
    deuterium: config.cost.deuterium * quantity,
    darkMatter: config.cost.darkMatter * quantity,
    energy: 0
  }
}

/**
 * 计算防御设施建造成本
 */
export const calculateDefenseCost = (defenseType: DefenseType, quantity: number): Resources => {
  const config = DEFENSES[defenseType]
  return {
    metal: config.cost.metal * quantity,
    crystal: config.cost.crystal * quantity,
    deuterium: config.cost.deuterium * quantity,
    darkMatter: config.cost.darkMatter * quantity,
    energy: 0
  }
}

/**
 * 计算舰船建造时间
 * @param shipType 舰船类型
 * @param quantity 数量
 * @param buildingSpeedBonus 指挥官等提供的速度加成百分比
 * @param roboticsFactoryLevel 机器人工厂等级
 * @param naniteFactoryLevel 纳米工厂等级
 */
export const calculateShipBuildTime = (
  shipType: ShipType,
  quantity: number,
  buildingSpeedBonus: number = 0,
  roboticsFactoryLevel: number = 0,
  naniteFactoryLevel: number = 0
): number => {
  const config = SHIPS[shipType]
  const baseTime = config.buildTime * quantity

  // 机器人工厂和纳米工厂的加速：建造时间 / (1 + 机器人工厂等级 + 纳米工厂等级 × 2)
  const factorySpeedDivisor = 1 + roboticsFactoryLevel + naniteFactoryLevel * 2

  // 指挥官等的百分比加成
  const speedMultiplier = 1 - buildingSpeedBonus / 100

  return Math.floor((baseTime / factorySpeedDivisor) * speedMultiplier)
}

/**
 * 计算防御设施建造时间
 * @param defenseType 防御类型
 * @param quantity 数量
 * @param buildingSpeedBonus 指挥官等提供的速度加成百分比
 * @param roboticsFactoryLevel 机器人工厂等级
 * @param naniteFactoryLevel 纳米工厂等级
 */
export const calculateDefenseBuildTime = (
  defenseType: DefenseType,
  quantity: number,
  buildingSpeedBonus: number = 0,
  roboticsFactoryLevel: number = 0,
  naniteFactoryLevel: number = 0
): number => {
  const config = DEFENSES[defenseType]
  const baseTime = config.buildTime * quantity

  // 机器人工厂和纳米工厂的加速：建造时间 / (1 + 机器人工厂等级 + 纳米工厂等级 × 2)
  const factorySpeedDivisor = 1 + roboticsFactoryLevel + naniteFactoryLevel * 2

  // 指挥官等的百分比加成
  const speedMultiplier = 1 - buildingSpeedBonus / 100

  return Math.floor((baseTime / factorySpeedDivisor) * speedMultiplier)
}

/**
 * 检查舰船建造条件
 */
export const checkShipRequirements = (
  shipType: ShipType,
  buildings: Partial<Record<BuildingType, number>>,
  technologies: Partial<Record<TechnologyType, number>>
): boolean => {
  const config = SHIPS[shipType]
  if (!config.requirements) return true

  for (const [key, level] of Object.entries(config.requirements)) {
    if (Object.values(BuildingType).includes(key as BuildingType)) {
      if ((buildings[key as BuildingType] || 0) < level) {
        return false
      }
    } else if (Object.values(TechnologyType).includes(key as TechnologyType)) {
      if ((technologies[key as TechnologyType] || 0) < level) {
        return false
      }
    }
  }
  return true
}

/**
 * 检查防御设施建造条件
 */
export const checkDefenseRequirements = (
  defenseType: DefenseType,
  buildings: Partial<Record<BuildingType, number>>,
  technologies: Partial<Record<TechnologyType, number>>
): boolean => {
  const config = DEFENSES[defenseType]
  if (!config.requirements) return true

  for (const [key, level] of Object.entries(config.requirements)) {
    if (Object.values(BuildingType).includes(key as BuildingType)) {
      if ((buildings[key as BuildingType] || 0) < level) {
        return false
      }
    } else if (Object.values(TechnologyType).includes(key as TechnologyType)) {
      if ((technologies[key as TechnologyType] || 0) < level) {
        return false
      }
    }
  }
  return true
}

/**
 * 检查防御罩数量限制
 */
export const checkShieldDomeLimit = (
  defenseType: DefenseType,
  currentDefense: Partial<Record<DefenseType, number>>,
  quantity: number
): boolean => {
  if (defenseType === DefenseType.SmallShieldDome || defenseType === DefenseType.LargeShieldDome) {
    if ((currentDefense[defenseType] || 0) > 0) {
      return false
    }
    if (quantity > 1) {
      return false
    }
  }
  return true
}

/**
 * 计算导弹发射井容量
 */
export const calculateMissileSiloCapacity = (buildings: Partial<Record<BuildingType, number>>): number => {
  const siloLevel = buildings[BuildingType.MissileSilo] || 0
  return siloLevel * 10 // 每级存储10枚导弹
}

/**
 * 计算当前导弹总数
 */
export const calculateCurrentMissileCount = (defense: Partial<Record<DefenseType, number>>): number => {
  const interplanetaryMissiles = defense[DefenseType.InterplanetaryMissile] || 0
  const antiBallisticMissiles = defense[DefenseType.AntiBallisticMissile] || 0
  return interplanetaryMissiles + antiBallisticMissiles
}

/**
 * 计算建造队列中的导弹总数
 */
export const calculateQueueMissileCount = (buildQueue: Array<{ type: string; itemType: string; quantity?: number }>): number => {
  let queueMissileCount = 0

  for (const item of buildQueue) {
    if (item.type === 'defense') {
      const defenseType = item.itemType as DefenseType
      if (defenseType === DefenseType.InterplanetaryMissile || defenseType === DefenseType.AntiBallisticMissile) {
        queueMissileCount += item.quantity || 0
      }
    }
  }

  return queueMissileCount
}

/**
 * 检查导弹容量限制
 */
export const checkMissileSiloLimit = (
  defenseType: DefenseType,
  currentDefense: Partial<Record<DefenseType, number>>,
  buildings: Partial<Record<BuildingType, number>>,
  quantity: number,
  buildQueue?: Array<{ type: string; itemType: string; quantity?: number }>
): boolean => {
  // 只对导弹类型进行检查
  if (defenseType !== DefenseType.InterplanetaryMissile && defenseType !== DefenseType.AntiBallisticMissile) {
    return true
  }

  const maxCapacity = calculateMissileSiloCapacity(buildings)
  const currentCount = calculateCurrentMissileCount(currentDefense)
  const queueCount = buildQueue ? calculateQueueMissileCount(buildQueue) : 0
  const newCount = currentCount + queueCount + quantity

  return newCount <= maxCapacity
}

/**
 * 创建舰船建造队列项
 */
export const createShipQueueItem = (shipType: ShipType, quantity: number, buildTime: number): BuildQueueItem => {
  const now = Date.now()
  shipQueueIdCounter++
  return {
    id: `ship_${now}_${shipQueueIdCounter}`,
    type: 'ship',
    itemType: shipType,
    quantity,
    startTime: now,
    endTime: now + buildTime * 1000
  }
}

/**
 * 创建防御设施建造队列项
 */
export const createDefenseQueueItem = (defenseType: DefenseType, quantity: number, buildTime: number): BuildQueueItem => {
  const now = Date.now()
  shipQueueIdCounter++
  return {
    id: `defense_${now}_${shipQueueIdCounter}`,
    type: 'defense',
    itemType: defenseType,
    quantity,
    startTime: now,
    endTime: now + buildTime * 1000
  }
}

/**
 * 检查舰队是否足够
 */
export const checkFleetAvailable = (currentFleet: Partial<Fleet>, requiredFleet: Partial<Fleet>): boolean => {
  for (const [shipType, count] of Object.entries(requiredFleet)) {
    if ((currentFleet[shipType as ShipType] || 0) < count) {
      return false
    }
  }
  return true
}

/**
 * 计算舰队燃料消耗（包含货物重量影响）
 * @param fleet 舰队组成
 * @param fuelConsumptionReduction 燃料消耗减少百分比
 * @param cargo 携带的货物（可选）
 * @returns 总燃料消耗（重氢）
 */
export const calculateFleetFuelConsumption = (fleet: Partial<Fleet>, fuelConsumptionReduction: number = 0, cargo?: Resources): number => {
  // 计算舰船基础燃料消耗
  let baseFuelNeeded = 0
  for (const [shipType, count] of Object.entries(fleet)) {
    const config = SHIPS[shipType as ShipType]
    baseFuelNeeded += config.fuelConsumption * count
  }

  // 计算货物额外燃料消耗
  // 每1000单位资源增加1点燃料消耗
  let cargoFuelNeeded = 0
  if (cargo) {
    const totalCargo = cargo.metal + cargo.crystal + cargo.deuterium + cargo.darkMatter
    cargoFuelNeeded = Math.floor(totalCargo / 1000)
  }

  // 应用燃料消耗减少加成（仅应用于基础燃料，不影响货物燃料）
  const reductionMultiplier = 1 - fuelConsumptionReduction / 100
  const reducedBaseFuel = Math.floor(baseFuelNeeded * reductionMultiplier)

  return reducedBaseFuel + cargoFuelNeeded
}

/**
 * 计算舰队最慢速度
 */
export const calculateFleetMinSpeed = (fleet: Partial<Fleet>, fleetSpeedBonus: number = 0): number => {
  let minSpeed = Infinity
  for (const [shipType, count] of Object.entries(fleet)) {
    if (count > 0) {
      const config = SHIPS[shipType as ShipType]
      minSpeed = Math.min(minSpeed, config.speed)
    }
  }
  const speedMultiplier = 1 + fleetSpeedBonus / 100
  return Math.floor(minSpeed * speedMultiplier)
}

/**
 * 扣除舰队
 */
export const deductFleet = (currentFleet: Fleet, fleet: Partial<Fleet>): void => {
  for (const [shipType, count] of Object.entries(fleet)) {
    currentFleet[shipType as ShipType] -= count
  }
}

/**
 * 添加舰队
 */
export const addFleet = (currentFleet: Fleet, fleet: Partial<Fleet>): void => {
  for (const [shipType, count] of Object.entries(fleet)) {
    if (count > 0) {
      currentFleet[shipType as ShipType] += count
    }
  }
}
