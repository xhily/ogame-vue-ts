import type { NPC, Planet, Player } from '@/types/game'
import { TechnologyType, BuildingType, ShipType } from '@/types/game'
import { BUILDINGS, SHIPS, TECHNOLOGIES } from '@/config/gameConfig'
import * as buildingLogic from './buildingLogic'
import * as researchLogic from './researchLogic'

/**
 * NPC成长系统
 *
 * 策略说明:
 * - Easy: NPC实力保持在玩家平均实力的60%左右，被动成长
 * - Medium: NPC实力保持在玩家平均实力的80%左右，半主动成长
 * - Hard: NPC实力保持在玩家平均实力的100-120%，主动成长
 */

// 简化的游戏状态接口（用于NPC成长系统）
export interface NPCGrowthGameState {
  planets: Planet[] // 所有星球（包括玩家和NPC的）
  player: Player // 玩家数据
  npcs: NPC[] // 所有NPC
}

// NPC成长配置（旧版，保留用于兼容）
export const NPC_GROWTH_CONFIG = {
  easy: {
    powerRatio: 0.6, // 实力比例(相对玩家)
    checkInterval: 300, // 检查间隔(秒) - 5分钟
    resourceGrowthRate: 0.5, // 资源增长速率系数
    buildingGrowthSpeed: 0.5, // 建筑升级速度系数
    techGrowthSpeed: 0.5 // 科技研究速度系数
  },
  medium: {
    powerRatio: 0.8,
    checkInterval: 180, // 3分钟
    resourceGrowthRate: 0.8,
    buildingGrowthSpeed: 0.8,
    techGrowthSpeed: 0.8
  },
  hard: {
    powerRatio: 1.1,
    checkInterval: 120, // 2分钟
    resourceGrowthRate: 1.2,
    buildingGrowthSpeed: 1.0,
    techGrowthSpeed: 1.0
  }
} as const

// 动态难度配置（基于玩家积分）
export interface DynamicDifficultyConfig {
  powerRatio: number
  checkInterval: number
  resourceGrowthRate: number
  buildingGrowthSpeed: number
  techGrowthSpeed: number
}

/**
 * 根据玩家积分计算动态难度配置
 */
export const calculateDynamicDifficulty = (playerPoints: number): DynamicDifficultyConfig => {
  // 积分区间和对应的难度参数
  if (playerPoints < 1000) {
    // 新手期：0-1,000分
    // NPC保持30-50%实力，给予充分发展空间
    const ratio = 0.3 + (playerPoints / 1000) * 0.2
    return {
      powerRatio: ratio,
      checkInterval: 300, // 5分钟
      resourceGrowthRate: 0.4,
      buildingGrowthSpeed: 0.4,
      techGrowthSpeed: 0.4
    }
  } else if (playerPoints < 5000) {
    // 初级期：1,000-5,000分
    // NPC保持50-70%实力，逐渐增加挑战
    const ratio = 0.5 + ((playerPoints - 1000) / 4000) * 0.2
    return {
      powerRatio: ratio,
      checkInterval: 240, // 4分钟
      resourceGrowthRate: 0.6,
      buildingGrowthSpeed: 0.6,
      techGrowthSpeed: 0.6
    }
  } else if (playerPoints < 20000) {
    // 中级期：5,000-20,000分
    // NPC保持70-90%实力，持续挑战
    const ratio = 0.7 + ((playerPoints - 5000) / 15000) * 0.2
    return {
      powerRatio: ratio,
      checkInterval: 180, // 3分钟
      resourceGrowthRate: 0.8,
      buildingGrowthSpeed: 0.8,
      techGrowthSpeed: 0.8
    }
  } else if (playerPoints < 50000) {
    // 高级期：20,000-50,000分
    // NPC保持90-110%实力，与玩家势均力敌
    const ratio = 0.9 + ((playerPoints - 20000) / 30000) * 0.2
    return {
      powerRatio: ratio,
      checkInterval: 150, // 2.5分钟
      resourceGrowthRate: 1.0,
      buildingGrowthSpeed: 1.0,
      techGrowthSpeed: 1.0
    }
  } else {
    // 专家期：50,000+分
    // NPC保持110-130%实力，超越玩家
    const ratio = Math.min(1.3, 1.1 + ((playerPoints - 50000) / 50000) * 0.2)
    return {
      powerRatio: ratio,
      checkInterval: 120, // 2分钟
      resourceGrowthRate: 1.2,
      buildingGrowthSpeed: 1.2,
      techGrowthSpeed: 1.2
    }
  }
}

/**
 * 计算玩家平均实力
 */
export const calculatePlayerAveragePower = (
  gameState: NPCGrowthGameState
): {
  avgBuildingLevel: number
  avgTechLevel: number
  totalFleetPower: number
  totalResources: number
} => {
  // 筛选出玩家的星球
  const playerPlanets = gameState.planets.filter(p => p.ownerId === gameState.player.id)

  if (playerPlanets.length === 0) {
    return {
      avgBuildingLevel: 0,
      avgTechLevel: 0,
      totalFleetPower: 0,
      totalResources: 0
    }
  }

  // 计算平均建筑等级
  let totalBuildingLevels = 0
  let buildingCount = 0
  playerPlanets.forEach(planet => {
    Object.values(planet.buildings).forEach(level => {
      totalBuildingLevels += level
      buildingCount++
    })
  })

  // 计算平均科技等级
  const techLevels = Object.values(gameState.player.technologies)
  const avgTechLevel = techLevels.length > 0 ? techLevels.reduce((sum, level) => sum + level, 0) / techLevels.length : 0

  // 计算总舰队战力
  let totalFleetPower = 0
  playerPlanets.forEach(planet => {
    Object.entries(planet.fleet).forEach(([shipType, count]) => {
      const shipConfig = SHIPS[shipType as ShipType]
      const power = shipConfig.attack + shipConfig.shield + shipConfig.armor / 10
      totalFleetPower += power * (count as number)
    })
  })

  // 计算总资源
  const totalResources = playerPlanets.reduce(
    (sum, planet) => sum + planet.resources.metal + planet.resources.crystal + planet.resources.deuterium,
    0
  )

  return {
    avgBuildingLevel: buildingCount > 0 ? totalBuildingLevels / buildingCount : 0,
    avgTechLevel,
    totalFleetPower,
    totalResources
  }
}

/**
 * 计算NPC当前实力
 */
export const calculateNPCPower = (
  npc: NPC
): {
  avgBuildingLevel: number
  avgTechLevel: number
  totalFleetPower: number
  totalResources: number
} => {
  // 计算平均建筑等级
  let totalBuildingLevels = 0
  let buildingCount = 0
  npc.planets.forEach(planet => {
    Object.values(planet.buildings).forEach(level => {
      totalBuildingLevels += level
      buildingCount++
    })
  })

  // 计算平均科技等级
  const techLevels = Object.values(npc.technologies)
  const avgTechLevel = techLevels.length > 0 ? techLevels.reduce((sum, level) => sum + level, 0) / techLevels.length : 0

  // 计算总舰队战力
  let totalFleetPower = 0
  npc.planets.forEach(planet => {
    Object.entries(planet.fleet).forEach(([shipType, count]) => {
      const shipConfig = SHIPS[shipType as ShipType]
      const power = shipConfig.attack + shipConfig.shield + shipConfig.armor / 10
      totalFleetPower += power * (count as number)
    })
  })

  // 计算总资源
  const totalResources = npc.planets.reduce(
    (sum, planet) => sum + planet.resources.metal + planet.resources.crystal + planet.resources.deuterium,
    0
  )

  return {
    avgBuildingLevel: buildingCount > 0 ? totalBuildingLevels / buildingCount : 0,
    avgTechLevel,
    totalFleetPower,
    totalResources
  }
}

/**
 * 自动升级NPC建筑
 */
export const autoUpgradeNPCBuildings = (npc: NPC): void => {
  const planet = npc.planets[0]
  if (!planet) return

  // 优先级队列：资源建筑 > 设施建筑 > 其他
  const priorityBuildings: BuildingType[] = [
    BuildingType.MetalMine,
    BuildingType.CrystalMine,
    BuildingType.DeuteriumSynthesizer,
    BuildingType.SolarPlant,
    BuildingType.RoboticsFactory,
    BuildingType.Shipyard,
    BuildingType.ResearchLab,
    BuildingType.MetalStorage,
    BuildingType.CrystalStorage,
    BuildingType.DeuteriumTank,
    BuildingType.DarkMatterCollector
  ]

  // 尝试升级建筑
  for (const buildingType of priorityBuildings) {
    const currentLevel = planet.buildings[buildingType] || 0
    const targetLevel = currentLevel + 1

    // 检查是否达到最大等级
    const buildingConfig = BUILDINGS[buildingType]
    if (buildingConfig.maxLevel && currentLevel >= buildingConfig.maxLevel) {
      continue
    }

    // 计算升级成本
    const cost = buildingLogic.calculateBuildingCost(buildingType, targetLevel)

    // 检查资源是否足够
    if (
      planet.resources.metal >= cost.metal &&
      planet.resources.crystal >= cost.crystal &&
      planet.resources.deuterium >= cost.deuterium &&
      planet.resources.darkMatter >= cost.darkMatter
    ) {
      // 扣除资源
      planet.resources.metal -= cost.metal
      planet.resources.crystal -= cost.crystal
      planet.resources.deuterium -= cost.deuterium
      planet.resources.darkMatter -= cost.darkMatter

      // 直接升级(NPC不需要等待建造时间)
      planet.buildings[buildingType] = targetLevel

      // 每次只升级一个建筑，避免一次性消耗太多资源
      break
    }
  }
}

/**
 * 自动研究NPC科技
 */
export const autoResearchNPCTechnologies = (npc: NPC): void => {
  const planet = npc.planets[0]
  if (!planet) return

  // 优先级队列：战斗科技 > 驱动科技 > 其他
  const priorityTechs: TechnologyType[] = [
    TechnologyType.EnergyTechnology,
    TechnologyType.ComputerTechnology,
    TechnologyType.WeaponsTechnology,
    TechnologyType.ShieldingTechnology,
    TechnologyType.ArmourTechnology,
    TechnologyType.CombustionDrive,
    TechnologyType.ImpulseDrive,
    TechnologyType.HyperspaceDrive,
    TechnologyType.LaserTechnology,
    TechnologyType.IonTechnology,
    TechnologyType.PlasmaTechnology,
    TechnologyType.Astrophysics,
    TechnologyType.EspionageTechnology
  ]

  // 尝试研究科技
  for (const techType of priorityTechs) {
    const currentLevel = npc.technologies[techType] || 0
    const targetLevel = currentLevel + 1

    // 检查是否达到最大等级
    const techConfig = TECHNOLOGIES[techType]
    if (techConfig.maxLevel && currentLevel >= techConfig.maxLevel) {
      continue
    }

    // 计算研究成本
    const cost = researchLogic.calculateTechnologyCost(techType, targetLevel)

    // 检查资源是否足够
    if (
      planet.resources.metal >= cost.metal &&
      planet.resources.crystal >= cost.crystal &&
      planet.resources.deuterium >= cost.deuterium &&
      planet.resources.darkMatter >= cost.darkMatter
    ) {
      // 扣除资源
      planet.resources.metal -= cost.metal
      planet.resources.crystal -= cost.crystal
      planet.resources.deuterium -= cost.deuterium
      planet.resources.darkMatter -= cost.darkMatter

      // 直接升级(NPC不需要等待研究时间)
      npc.technologies[techType] = targetLevel

      // 每次只研究一个科技
      break
    }
  }
}

/**
 * 自动建造NPC舰队
 */
export const autoBuildNPCFleet = (npc: NPC): void => {
  const planet = npc.planets[0]
  if (!planet) return

  // 根据难度决定舰队组成
  const fleetComposition: { shipType: ShipType; priority: number }[] = [
    { shipType: ShipType.LightFighter, priority: 1 },
    { shipType: ShipType.HeavyFighter, priority: 2 },
    { shipType: ShipType.Cruiser, priority: 3 },
    { shipType: ShipType.Battleship, priority: 4 },
    { shipType: ShipType.SmallCargo, priority: 5 },
    { shipType: ShipType.LargeCargo, priority: 6 },
    { shipType: ShipType.Recycler, priority: 7 },
    { shipType: ShipType.EspionageProbe, priority: 8 }
  ]

  // 按优先级排序
  fleetComposition.sort((a, b) => a.priority - b.priority)

  // 尝试建造舰船
  for (const { shipType } of fleetComposition) {
    const shipConfig = SHIPS[shipType]

    // 检查建造需求
    const canBuild = Object.entries(shipConfig.requirements || {}).every(([reqType, reqLevel]) => {
      if (reqType in BuildingType) {
        return (planet.buildings[reqType as BuildingType] || 0) >= reqLevel
      }
      if (reqType in TechnologyType) {
        return (npc.technologies[reqType as TechnologyType] || 0) >= reqLevel
      }
      return false
    })

    if (!canBuild) continue

    // 根据难度和当前资源决定建造数量
    const maxAffordable = Math.floor(
      Math.min(
        planet.resources.metal / shipConfig.cost.metal,
        planet.resources.crystal / shipConfig.cost.crystal,
        planet.resources.deuterium / shipConfig.cost.deuterium,
        shipConfig.cost.darkMatter > 0 ? planet.resources.darkMatter / shipConfig.cost.darkMatter : Infinity
      )
    )

    // 建造数量：简单1-5艘，中等5-10艘，困难10-20艘
    const buildCount = Math.min(maxAffordable, npc.difficulty === 'easy' ? 5 : npc.difficulty === 'medium' ? 10 : 20)

    if (buildCount > 0) {
      // 扣除资源
      planet.resources.metal -= shipConfig.cost.metal * buildCount
      planet.resources.crystal -= shipConfig.cost.crystal * buildCount
      planet.resources.deuterium -= shipConfig.cost.deuterium * buildCount
      planet.resources.darkMatter -= shipConfig.cost.darkMatter * buildCount

      // 添加舰船
      planet.fleet[shipType] = (planet.fleet[shipType] || 0) + buildCount

      // 建造一批后退出
      break
    }
  }
}

/**
 * 为NPC生成资源(模拟资源生产)
 */
export const generateNPCResources = (npc: NPC, deltaSeconds: number, config: DynamicDifficultyConfig): void => {
  const planet = npc.planets[0]
  if (!planet) return

  // 基于建筑等级计算资源产量
  const metalMineLevel = planet.buildings[BuildingType.MetalMine] || 0
  const crystalMineLevel = planet.buildings[BuildingType.CrystalMine] || 0
  const deuteriumLevel = planet.buildings[BuildingType.DeuteriumSynthesizer] || 0
  const darkMatterLevel = planet.buildings[BuildingType.DarkMatterCollector] || 0

  // 简化的资源产量计算(每秒产量)
  const metalProduction = 30 * metalMineLevel * Math.pow(1.1, metalMineLevel) * config.resourceGrowthRate
  const crystalProduction = 20 * crystalMineLevel * Math.pow(1.1, crystalMineLevel) * config.resourceGrowthRate
  const deuteriumProduction = 10 * deuteriumLevel * Math.pow(1.1, deuteriumLevel) * config.resourceGrowthRate
  const darkMatterProduction = ((25 * darkMatterLevel * Math.pow(1.5, darkMatterLevel)) / 3600) * config.resourceGrowthRate

  // 增加资源
  planet.resources.metal += metalProduction * deltaSeconds
  planet.resources.crystal += crystalProduction * deltaSeconds
  planet.resources.deuterium += deuteriumProduction * deltaSeconds
  planet.resources.darkMatter += darkMatterProduction * deltaSeconds

  // 确保不超过存储上限
  const metalStorage = planet.buildings[BuildingType.MetalStorage] || 0
  const crystalStorage = planet.buildings[BuildingType.CrystalStorage] || 0
  const deuteriumStorage = planet.buildings[BuildingType.DeuteriumTank] || 0
  const darkMatterStorage = planet.buildings[BuildingType.DarkMatterTank] || 0

  planet.resources.metal = Math.min(planet.resources.metal, 10000 * Math.pow(2, metalStorage))
  planet.resources.crystal = Math.min(planet.resources.crystal, 10000 * Math.pow(2, crystalStorage))
  planet.resources.deuterium = Math.min(planet.resources.deuterium, 10000 * Math.pow(2, deuteriumStorage))
  planet.resources.darkMatter = Math.min(planet.resources.darkMatter, 1000 * Math.pow(2, darkMatterStorage))
}

/**
 * 主NPC成长更新函数
 * 应该在游戏循环中定期调用
 */
export const updateNPCGrowth = (npc: NPC, gameState: NPCGrowthGameState, deltaSeconds: number): void => {
  // 使用动态难度（基于玩家积分）而不是固定难度
  const config = calculateDynamicDifficulty(gameState.player.points)

  // 1. 持续生成资源
  generateNPCResources(npc, deltaSeconds, config)

  // 2. 定期评估并调整实力(使用静态计数器或时间戳)
  const now = Date.now()
  const lastGrowthCheck = (npc as any).lastGrowthCheck || 0

  if (now - lastGrowthCheck >= config.checkInterval * 1000) {
    ;(npc as any).lastGrowthCheck = now

    // 计算玩家平均实力
    const playerPower = calculatePlayerAveragePower(gameState)
    const npcPower = calculateNPCPower(npc)

    // 计算目标实力
    const targetBuildingLevel = playerPower.avgBuildingLevel * config.powerRatio
    const targetTechLevel = playerPower.avgTechLevel * config.powerRatio
    const targetFleetPower = playerPower.totalFleetPower * config.powerRatio

    // 3. 如果实力不足，进行升级
    if (npcPower.avgBuildingLevel < targetBuildingLevel) {
      autoUpgradeNPCBuildings(npc)
    }

    if (npcPower.avgTechLevel < targetTechLevel) {
      autoResearchNPCTechnologies(npc)
    }

    if (npcPower.totalFleetPower < targetFleetPower) {
      autoBuildNPCFleet(npc)
    }
  }
}

/**
 * 初始化NPC时设置合理的起始实力
 */
export const initializeNPCStartingPower = (
  npc: NPC,
  playerPower: {
    avgBuildingLevel: number
    avgTechLevel: number
    totalFleetPower: number
    totalResources: number
  }
): void => {
  const config = NPC_GROWTH_CONFIG[npc.difficulty]
  const planet = npc.planets[0]
  if (!planet) return

  // 设置起始建筑等级(基于玩家实力)
  const targetBuildingLevel = Math.max(5, Math.floor(playerPower.avgBuildingLevel * config.powerRatio))

  // 设置资源建筑
  planet.buildings[BuildingType.MetalMine] = targetBuildingLevel
  planet.buildings[BuildingType.CrystalMine] = Math.floor(targetBuildingLevel * 0.8)
  planet.buildings[BuildingType.DeuteriumSynthesizer] = Math.floor(targetBuildingLevel * 0.6)
  planet.buildings[BuildingType.SolarPlant] = targetBuildingLevel + 2

  // 设置设施建筑
  planet.buildings[BuildingType.RoboticsFactory] = Math.floor(targetBuildingLevel * 0.5)
  planet.buildings[BuildingType.Shipyard] = Math.floor(targetBuildingLevel * 0.4)
  planet.buildings[BuildingType.ResearchLab] = Math.floor(targetBuildingLevel * 0.4)

  // 设置仓储
  planet.buildings[BuildingType.MetalStorage] = Math.floor(targetBuildingLevel * 0.3)
  planet.buildings[BuildingType.CrystalStorage] = Math.floor(targetBuildingLevel * 0.3)
  planet.buildings[BuildingType.DeuteriumTank] = Math.floor(targetBuildingLevel * 0.3)

  // 设置起始科技等级
  const targetTechLevel = Math.max(3, Math.floor(playerPower.avgTechLevel * config.powerRatio))

  npc.technologies[TechnologyType.EnergyTechnology] = targetTechLevel
  npc.technologies[TechnologyType.ComputerTechnology] = Math.floor(targetTechLevel * 0.8)
  npc.technologies[TechnologyType.WeaponsTechnology] = Math.floor(targetTechLevel * 0.7)
  npc.technologies[TechnologyType.ShieldingTechnology] = Math.floor(targetTechLevel * 0.7)
  npc.technologies[TechnologyType.ArmourTechnology] = Math.floor(targetTechLevel * 0.7)
  npc.technologies[TechnologyType.CombustionDrive] = Math.floor(targetTechLevel * 0.6)

  // 给予起始资源
  planet.resources.metal = 100000 * config.powerRatio
  planet.resources.crystal = 50000 * config.powerRatio
  planet.resources.deuterium = 20000 * config.powerRatio
  planet.resources.darkMatter = 1000 * config.powerRatio
}

/**
 * 初始化NPC外交关系网络
 * 为每个NPC随机分配盟友和敌人
 */
export const initializeNPCDiplomacy = (npcs: NPC[]): void => {
  // 确保所有NPC都有空的外交字段
  npcs.forEach(npc => {
    if (!npc.allies) npc.allies = []
    if (!npc.enemies) npc.enemies = []
    if (!npc.relations) npc.relations = {}
  })

  // 为每个NPC随机分配1-2个盟友
  npcs.forEach(npc => {
    // 获取还未建立关系的潜在盟友
    const potentialAllies = npcs.filter(
      n => n.id !== npc.id && !npc.allies!.includes(n.id) && !n.allies!.includes(npc.id)
    )

    if (potentialAllies.length === 0) return

    // 随机选择1-2个盟友
    const allyCount = Math.min(Math.floor(Math.random() * 2) + 1, potentialAllies.length)

    for (let i = 0; i < allyCount; i++) {
      if (potentialAllies.length === 0) break

      const allyIndex = Math.floor(Math.random() * potentialAllies.length)
      const ally = potentialAllies.splice(allyIndex, 1)[0]

      if (!ally) continue

      // 建立双向盟友关系
      if (!npc.allies!.includes(ally.id)) {
        npc.allies!.push(ally.id)
      }
      if (!ally.allies!.includes(npc.id)) {
        ally.allies!.push(npc.id)
      }
    }
  })
}
