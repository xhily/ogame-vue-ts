import type { NPC, Planet, Player, FleetMission, SpyReport, SpiedNotification, IncomingFleetAlert, Fleet, DebrisField } from '@/types/game'
import { MissionType, ShipType, TechnologyType, RelationStatus } from '@/types/game'
import * as fleetLogic from './fleetLogic'
import * as diplomaticLogic from './diplomaticLogic'
import { DIPLOMATIC_CONFIG, SHIPS } from '@/config/gameConfig'

/**
 * NPC行为决策系统
 *
 * 流程：
 * 1. NPC定期侦查玩家星球
 * 2. 玩家收到"被侦查"通知
 * 3. 基于侦查结果，NPC决定是否攻击
 * 4. NPC发起攻击，玩家收到实时警告
 * 5. NPC检测并回收自己星球附近的残骸
 * 6. NPC被攻击后会做出防御性反应或反击
 */

// 动态行为配置接口
export interface DynamicBehaviorConfig {
  spyInterval: number
  attackInterval: number
  attackProbability: number
  minSpyProbes: number
  attackFleetSizeRatio: number
  maxConcurrentSpyMissions: number // 同时最多多少个侦查任务
  maxConcurrentAttackMissions: number // 同时最多多少个攻击任务
}

/**
 * 根据玩家积分计算动态NPC行为配置
 * 积分越高，NPC越激进
 */
export const calculateDynamicBehavior = (playerPoints: number): DynamicBehaviorConfig => {
  if (playerPoints < 1000) {
    // 新手阶段：NPC温和但会主动侦查攻击
    return {
      spyInterval: 300, // 5分钟侦查一次
      attackInterval: 300, // 5分钟攻击一次（与侦查同步，侦查完就攻击）
      attackProbability: 0.4,
      minSpyProbes: 1,
      attackFleetSizeRatio: 0.3, // 只派30%舰队
      maxConcurrentSpyMissions: 3,
      maxConcurrentAttackMissions: 2
    }
  } else if (playerPoints < 5000) {
    // 初级阶段：NPC比较激进
    return {
      spyInterval: 420, // 7分钟侦查一次
      attackInterval: 420, // 7分钟攻击一次（与侦查同步）
      attackProbability: 0.45,
      minSpyProbes: 2,
      attackFleetSizeRatio: 0.5, // 派50%舰队
      maxConcurrentSpyMissions: 5,
      maxConcurrentAttackMissions: 3
    }
  } else if (playerPoints < 20000) {
    // 中级阶段：NPC很激进
    return {
      spyInterval: 360, // 6分钟侦查一次
      attackInterval: 360, // 6分钟攻击一次（与侦查同步）
      attackProbability: 0.55,
      minSpyProbes: 3,
      attackFleetSizeRatio: 0.7, // 派70%舰队
      maxConcurrentSpyMissions: 8,
      maxConcurrentAttackMissions: 5
    }
  } else if (playerPoints < 50000) {
    // 高级阶段：NPC非常激进
    return {
      spyInterval: 300, // 5分钟侦查一次
      attackInterval: 300, // 5分钟攻击一次（与侦查同步）
      attackProbability: 0.65,
      minSpyProbes: 4,
      attackFleetSizeRatio: 0.85, // 派85%舰队
      maxConcurrentSpyMissions: 10,
      maxConcurrentAttackMissions: 8
    }
  } else {
    // 专家阶段：NPC极度激进
    return {
      spyInterval: 240, // 4分钟侦查一次
      attackInterval: 240, // 4分钟攻击一次（与侦查同步）
      attackProbability: 0.8,
      minSpyProbes: 5,
      attackFleetSizeRatio: 0.95, // 派95%舰队
      maxConcurrentSpyMissions: 15,
      maxConcurrentAttackMissions: 12
    }
  }
}

/**
 * 检查NPC是否应该侦查玩家
 */
export const shouldNPCSpyPlayer = (npc: NPC, player: Player, currentTime: number, config: DynamicBehaviorConfig): boolean => {
  // 新手保护：积分低于1000的玩家不会被侦查
  const playerPoints = player.points || 0
  if (playerPoints < 1000) {
    return false
  }

  // 检查外交关系 - 统一使用 npc.relations
  const relation = npc.relations?.[player.id]

  // 如果没有关系数据，视为中立，不侦查
  if (!relation) {
    return false
  }

  // 友好或中立NPC不侦查
  if (relation.status === RelationStatus.Friendly || relation.status === RelationStatus.Neutral) {
    return false
  }

  // 只有敌对NPC才会继续
  if (relation.status !== RelationStatus.Hostile) {
    return false
  }

  // 只有敌对NPC才会到达这里，检查冷却时间
  const lastSpyTime = npc.lastSpyTime || 0
  if (currentTime - lastSpyTime < config.spyInterval * 1000) {
    return false
  }

  // 敌对NPC且冷却结束，执行侦查
  return true
}

/**
 * 检查NPC是否应该攻击玩家
 */
export const shouldNPCAttackPlayer = (npc: NPC, player: Player, currentTime: number, config: DynamicBehaviorConfig): boolean => {
  // 新手保护：积分低于1000的玩家不会被攻击
  const playerPoints = player.points || 0
  if (playerPoints < 1000) {
    return false
  }

  // 检查外交关系 - 统一使用 npc.relations
  const relation = npc.relations?.[player.id]

  // 如果没有关系数据，视为中立，不攻击
  if (!relation) {
    return false
  }

  // 友好或中立NPC不攻击
  if (relation.status === RelationStatus.Friendly || relation.status === RelationStatus.Neutral) {
    return false
  }

  // 只有敌对NPC才会继续
  if (relation.status !== RelationStatus.Hostile) {
    return false
  }

  // 检查攻击冷却
  const lastAttackTime = npc.lastAttackTime || 0
  if (currentTime - lastAttackTime < config.attackInterval * 1000) {
    return false
  }

  // 必须有侦查报告才能攻击
  if (!npc.playerSpyReports || Object.keys(npc.playerSpyReports).length === 0) {
    return false
  }

  // 有侦查报告的情况下，敌对NPC一定会攻击（移除概率限制）
  // 这样保证侦查后会跟进攻击，而不是无意义地反复侦查
  return true
}

/**
 * 检查NPC是否应该赠送资源给玩家
 */
export const shouldNPCGiftPlayer = (npc: NPC, player: Player, currentTime: number): boolean => {
  const { NPC_GIFT_CONFIG } = DIPLOMATIC_CONFIG

  // 检查功能是否启用
  if (!NPC_GIFT_CONFIG.ENABLED) {
    return false
  }

  // 检查上次赠送时间
  const lastGiftTime = (npc as any).lastGiftTime || 0
  if (currentTime - lastGiftTime < NPC_GIFT_CONFIG.CHECK_INTERVAL * 1000) {
    return false
  }

  // 检查好感度 - 统一使用 npc.relations
  const relation = npc.relations?.[player.id]
  if (!relation || relation.reputation < NPC_GIFT_CONFIG.MIN_REPUTATION) {
    return false
  }

  // 随机概率
  return Math.random() < NPC_GIFT_CONFIG.GIFT_PROBABILITY
}

/**
 * NPC向玩家赠送资源
 */
export const giftResourcesToPlayer = (npc: NPC, player: Player): void => {
  const { NPC_GIFT_CONFIG } = DIPLOMATIC_CONFIG

  // 随机生成赠送资源量
  const giftResources = {
    metal:
      Math.floor(Math.random() * (NPC_GIFT_CONFIG.GIFT_AMOUNT.METAL.max - NPC_GIFT_CONFIG.GIFT_AMOUNT.METAL.min + 1)) +
      NPC_GIFT_CONFIG.GIFT_AMOUNT.METAL.min,
    crystal:
      Math.floor(Math.random() * (NPC_GIFT_CONFIG.GIFT_AMOUNT.CRYSTAL.max - NPC_GIFT_CONFIG.GIFT_AMOUNT.CRYSTAL.min + 1)) +
      NPC_GIFT_CONFIG.GIFT_AMOUNT.CRYSTAL.min,
    deuterium:
      Math.floor(Math.random() * (NPC_GIFT_CONFIG.GIFT_AMOUNT.DEUTERIUM.max - NPC_GIFT_CONFIG.GIFT_AMOUNT.DEUTERIUM.min + 1)) +
      NPC_GIFT_CONFIG.GIFT_AMOUNT.DEUTERIUM.min,
    darkMatter: 0,
    energy: 0
  }

  // 处理赠送
  diplomaticLogic.handleNPCGiftToPlayer(npc, player, giftResources)

  // 更新上次赠送时间
  ;(npc as any).lastGiftTime = Date.now()
}

/**
 * 选择NPC的最佳攻击来源星球
 */
const selectBestNPCPlanet = (npc: NPC, targetPosition: { galaxy: number; system: number; position: number }): Planet | null => {
  if (npc.planets.length === 0) return null

  // 选择距离最近且有舰队的星球
  let bestPlanet: Planet | null = null
  let minDistance = Infinity

  for (const planet of npc.planets) {
    const distance = fleetLogic.calculateDistance(planet.position, targetPosition)
    const hasFleet = Object.values(planet.fleet).some(count => (count || 0) > 0)

    if (hasFleet && distance < minDistance) {
      minDistance = distance
      bestPlanet = planet
    }
  }

  return bestPlanet
}

/**
 * 计算NPC星球的战斗舰队总攻击力
 * 用于判断NPC是否有足够的战斗力来发起有意义的攻击
 */
const calculateNPCCombatPower = (npcPlanet: Planet): number => {
  // 各舰船的攻击力
  const shipAttackPower: Record<string, number> = {
    [ShipType.LightFighter]: 50,
    [ShipType.HeavyFighter]: 150,
    [ShipType.Cruiser]: 400,
    [ShipType.Battleship]: 1200,
    [ShipType.Bomber]: 700,
    [ShipType.Destroyer]: 2500,
    [ShipType.Battlecruiser]: 1000,
    [ShipType.Deathstar]: 200000
  }

  let totalPower = 0
  for (const [shipType, attack] of Object.entries(shipAttackPower)) {
    const count = npcPlanet.fleet[shipType as ShipType] || 0
    totalPower += count * attack
  }
  return totalPower
}

// 最小战斗力阈值：相当于约10艘轻型战斗机的攻击力
// 这样避免NPC只有几艘小飞机就频繁侦查骚扰玩家
const MIN_COMBAT_POWER_FOR_SPY = 500

/**
 * 创建NPC侦查任务
 */
export const createNPCSpyMission = (
  npc: NPC,
  targetPlanet: Planet,
  _planets: Planet[],
  config: DynamicBehaviorConfig
): FleetMission | null => {
  // 选择NPC的最佳星球作为起点
  const npcPlanet = selectBestNPCPlanet(npc, targetPlanet.position)
  if (!npcPlanet) {
    return null
  }

  // 检查NPC是否有足够的间谍探测器
  const spyProbes = npcPlanet.fleet[ShipType.EspionageProbe] || 0
  if (spyProbes < config.minSpyProbes) {
    return null
  }

  // 检查NPC是否有足够的战斗力
  // 战斗力太低的话侦查没有意义，也避免频繁骚扰玩家
  const combatPower = calculateNPCCombatPower(npcPlanet)
  if (combatPower < MIN_COMBAT_POWER_FOR_SPY) {
    return null
  }

  // 创建侦查舰队
  const fleet: Partial<Fleet> = {
    [ShipType.EspionageProbe]: config.minSpyProbes
  }

  // 从NPC星球扣除舰队
  npcPlanet.fleet[ShipType.EspionageProbe] = (npcPlanet.fleet[ShipType.EspionageProbe] || 0) - config.minSpyProbes

  // 计算飞行时间
  const distance = fleetLogic.calculateDistance(npcPlanet.position, targetPlanet.position)
  const spyProbeSpeed = 100000000 // 间谍探测器速度
  const flightTime = fleetLogic.calculateFlightTime(distance, spyProbeSpeed)

  const now = Date.now()
  const mission: FleetMission = {
    id: `npc-spy-${npc.id}-${now}`,
    playerId: npc.id,
    npcId: npc.id,
    isHostile: true,
    originPlanetId: npcPlanet.id,
    targetPosition: targetPlanet.position,
    targetPlanetId: targetPlanet.id,
    missionType: MissionType.Spy,
    fleet,
    cargo: { metal: 0, crystal: 0, deuterium: 0, darkMatter: 0, energy: 0 },
    departureTime: now,
    arrivalTime: now + flightTime * 1000,
    status: 'outbound'
  }

  // 更新NPC的上次侦查时间
  npc.lastSpyTime = now

  // 添加到NPC任务列表
  if (!npc.fleetMissions) {
    npc.fleetMissions = []
  }
  npc.fleetMissions.push(mission)

  return mission
}

/**
 * 处理NPC侦查到达
 * 返回：被侦查通知（给玩家）和侦查报告（给NPC）
 */
export const processNPCSpyArrival = (
  npc: NPC,
  mission: FleetMission,
  targetPlanet: Planet,
  player: Player
): { spiedNotification: SpiedNotification; spyReport: SpyReport } => {
  // 计算侦查等级（基于NPC的间谍科技）
  const npcSpyTech = npc.technologies[TechnologyType.EspionageTechnology] || 0
  const playerSpyTech = player.technologies[TechnologyType.EspionageTechnology] || 0
  const spyProbeCount = mission.fleet[ShipType.EspionageProbe] || 0

  // 计算被发现的概率
  const detectionChance = Math.max(0, Math.min(100, 50 + (playerSpyTech - npcSpyTech) * 10 - spyProbeCount * 5))
  const detected = Math.random() * 100 < detectionChance

  // 创建NPC的侦查报告
  const spyReport: SpyReport = {
    id: `npc-spy-report-${mission.id}`,
    timestamp: Date.now(),
    spyId: npc.id,
    targetPlanetId: targetPlanet.id,
    targetPlanetName: targetPlanet.name,
    targetPosition: targetPlanet.position,
    targetPlayerId: player.id,
    resources: { ...targetPlanet.resources },
    fleet: npcSpyTech >= 2 ? { ...targetPlanet.fleet } : undefined,
    defense: npcSpyTech >= 4 ? { ...targetPlanet.defense } : undefined,
    buildings: npcSpyTech >= 6 ? { ...targetPlanet.buildings } : undefined,
    technologies: npcSpyTech >= 8 ? { ...player.technologies } : undefined,
    detectionChance
  }

  // 保存到NPC的侦查报告
  if (!npc.playerSpyReports) {
    npc.playerSpyReports = {}
  }
  npc.playerSpyReports[targetPlanet.id] = spyReport

  // 创建被侦查通知（给玩家）
  const spiedNotification: SpiedNotification = {
    id: `spied-${mission.id}`,
    timestamp: Date.now(),
    npcId: npc.id,
    npcName: npc.name,
    targetPlanetId: targetPlanet.id,
    targetPlanetName: targetPlanet.name,
    detectionSuccess: detected,
    read: false
  }

  // 舰队返回
  mission.status = 'returning'
  mission.returnTime = Date.now() + (mission.arrivalTime - mission.departureTime)

  return { spiedNotification, spyReport }
}

/**
 * 决定NPC攻击舰队组成
 * 基于侦查报告和NPC实力
 */
const decideAttackFleet = (_npc: NPC, npcPlanet: Planet, _spyReport: SpyReport, config: DynamicBehaviorConfig): Partial<Fleet> | null => {
  // 简单策略：派出一定比例的可用舰队
  const attackFleet: Partial<Fleet> = {}
  let hasShips = false

  // 优先派出战斗舰船
  const combatShips = [
    ShipType.LightFighter,
    ShipType.HeavyFighter,
    ShipType.Cruiser,
    ShipType.Battleship,
    ShipType.Bomber,
    ShipType.Destroyer,
    ShipType.Battlecruiser,
    ShipType.Deathstar
  ]

  for (const shipType of combatShips) {
    const available = npcPlanet.fleet[shipType] || 0
    if (available > 0) {
      // 使用 Math.ceil 确保至少派出1艘（如果有的话）
      // 但不能超过可用数量
      const sendCount = Math.min(available, Math.max(1, Math.floor(available * config.attackFleetSizeRatio)))
      attackFleet[shipType] = sendCount
      hasShips = true
    }
  }

  return hasShips ? attackFleet : null
}

/**
 * 创建NPC攻击任务
 */
export const createNPCAttackMission = (
  npc: NPC,
  targetPlanet: Planet,
  spyReport: SpyReport,
  config: DynamicBehaviorConfig
): FleetMission | null => {
  // 选择NPC的最佳星球作为起点
  const npcPlanet = selectBestNPCPlanet(npc, targetPlanet.position)
  if (!npcPlanet) {
    return null
  }

  // 决定攻击舰队
  const attackFleet = decideAttackFleet(npc, npcPlanet, spyReport, config)
  if (!attackFleet) {
    return null
  }

  // 从NPC星球扣除舰队
  for (const [shipType, count] of Object.entries(attackFleet)) {
    npcPlanet.fleet[shipType as ShipType] = (npcPlanet.fleet[shipType as ShipType] || 0) - (count as number)
  }

  // 计算飞行时间
  const distance = fleetLogic.calculateDistance(npcPlanet.position, targetPlanet.position)
  // 找出舰队中最慢的船速
  let minSpeed = Infinity
  for (const _shipType of Object.keys(attackFleet)) {
    // 这里简化处理，实际应该从SHIPS配置中获取速度
    const baseSpeed = 10000 // 简化
    minSpeed = Math.min(minSpeed, baseSpeed)
  }
  const flightTime = fleetLogic.calculateFlightTime(distance, minSpeed)

  const now = Date.now()
  const mission: FleetMission = {
    id: `npc-attack-${npc.id}-${now}`,
    playerId: npc.id,
    npcId: npc.id,
    isHostile: true,
    originPlanetId: npcPlanet.id,
    targetPosition: targetPlanet.position,
    targetPlanetId: targetPlanet.id,
    missionType: MissionType.Attack,
    fleet: attackFleet,
    cargo: { metal: 0, crystal: 0, deuterium: 0, darkMatter: 0, energy: 0 },
    departureTime: now,
    arrivalTime: now + flightTime * 1000,
    status: 'outbound'
  }

  // 更新NPC的上次攻击时间
  npc.lastAttackTime = now

  // 添加到NPC任务列表
  if (!npc.fleetMissions) {
    npc.fleetMissions = []
  }
  npc.fleetMissions.push(mission)

  return mission
}

/**
 * 创建或更新即将到来的舰队警告
 */
export const createIncomingFleetAlert = (mission: FleetMission, npc: NPC, targetPlanet: Planet): IncomingFleetAlert => {
  const fleetSize = Object.values(mission.fleet).reduce((sum, count) => sum + (count || 0), 0)

  return {
    id: mission.id,
    npcId: npc.id,
    npcName: npc.name,
    missionType: mission.missionType,
    targetPlanetId: targetPlanet.id,
    targetPlanetName: targetPlanet.name,
    arrivalTime: mission.arrivalTime,
    fleetSize,
    read: false
  }
}

/**
 * 更新玩家的即将到来的舰队警告
 * 删除已到达或已返回的任务警告
 */
export const updateIncomingFleetAlerts = (player: Player, currentTime: number): void => {
  if (!player.incomingFleetAlerts) {
    player.incomingFleetAlerts = []
  }

  // 删除已过期的警告（舰队已到达）
  player.incomingFleetAlerts = player.incomingFleetAlerts.filter(alert => alert.arrivalTime > currentTime)
}

/**
 * NPC主动行为主更新函数
 * 应该在游戏循环中定期调用
 */
export const updateNPCBehavior = (
  npc: NPC,
  player: Player,
  allPlanets: Planet[],
  debrisFields: Record<string, DebrisField>,
  currentTime: number
): void => {
  // 根据玩家积分计算动态行为配置
  const config = calculateDynamicBehavior(player.points)

  // 1. 检查并回收附近的残骸（优先级最高）
  const nearbyDebris = findNearbyDebris(npc, debrisFields)
  if (nearbyDebris.length > 0) {
    // 检查是否已经有正在执行的回收任务
    const activeRecycleMissions = npc.fleetMissions?.filter(m => m.missionType === MissionType.Recycle && m.status === 'outbound') || []
    const activeDebrisIds = new Set(activeRecycleMissions.map(m => m.debrisFieldId).filter(Boolean))

    // 找到还没有被回收的残骸
    const availableDebris = nearbyDebris.filter(d => !activeDebrisIds.has(d.id))

    if (availableDebris.length > 0) {
      // 随机选择一个残骸场进行回收
      const targetDebris = availableDebris[Math.floor(Math.random() * availableDebris.length)]
      if (targetDebris) {
        createNPCRecycleMission(npc, targetDebris, player, allPlanets)
      }
    }
  }

  // 2. 检查是否应该反击（优先于普通攻击）
  if (shouldNPCRevenge(npc, currentTime)) {
    const revengeMission = createNPCRevengeMission(npc, allPlanets, config)
    if (revengeMission) {
      // 找到目标星球创建警告
      const targetPlanet = allPlanets.find(p => p.id === revengeMission.targetPlanetId)
      if (targetPlanet) {
        const alert = createIncomingFleetAlert(revengeMission, npc, targetPlanet)
        if (!player.incomingFleetAlerts) {
          player.incomingFleetAlerts = []
        }
        player.incomingFleetAlerts.push(alert)
      }
      // 反击后跳过普通攻击
      return
    }
  }

  // 3. 检查是否应该侦查玩家
  if (shouldNPCSpyPlayer(npc, player, currentTime, config)) {
    // 随机选择一个玩家星球进行侦查
    const playerPlanets = allPlanets.filter(p => p.ownerId === player.id)
    if (playerPlanets.length > 0) {
      const targetPlanet = playerPlanets[Math.floor(Math.random() * playerPlanets.length)]
      if (!targetPlanet) {
        return
      }

      const spyMission = createNPCSpyMission(npc, targetPlanet, allPlanets, config)

      if (spyMission) {
        // 创建即将到来的舰队警告
        const alert = createIncomingFleetAlert(spyMission, npc, targetPlanet)
        if (!player.incomingFleetAlerts) {
          player.incomingFleetAlerts = []
        }
        player.incomingFleetAlerts.push(alert)
      }
    }
  }

  // 4. 检查是否应该攻击玩家
  if (shouldNPCAttackPlayer(npc, player, currentTime, config)) {
    // 检查是否有最近的侦查报告
    if (npc.playerSpyReports && Object.keys(npc.playerSpyReports).length > 0) {
      // 选择一个侦查过的星球进行攻击
      const spyReports = Object.values(npc.playerSpyReports)
      const recentReport = spyReports[Math.floor(Math.random() * spyReports.length)]

      // 确保找到了侦查报告
      if (!recentReport) {
        return
      }

      // 找到目标星球
      const targetPlanet = allPlanets.find(p => p.id === recentReport.targetPlanetId)
      if (targetPlanet) {
        const attackMission = createNPCAttackMission(npc, targetPlanet, recentReport, config)

        if (attackMission) {
          // 创建即将到来的舰队警告
          const alert = createIncomingFleetAlert(attackMission, npc, targetPlanet)
          if (!player.incomingFleetAlerts) {
            player.incomingFleetAlerts = []
          }
          player.incomingFleetAlerts.push(alert)
        }
      }
    }
  }

  // 5. 检查是否应该赠送资源给玩家（仅友好NPC）
  if (shouldNPCGiftPlayer(npc, player, currentTime)) {
    giftResourcesToPlayer(npc, player)
  }

  // 6. 更新即将到来的舰队警告（删除过期的）
  updateIncomingFleetAlerts(player, currentTime)
}

/**
 * 带并发限制的NPC行为更新函数
 * 防止同时产生过多侦查和攻击任务导致游戏卡顿
 */
export const updateNPCBehaviorWithLimit = (
  npc: NPC,
  player: Player,
  allPlanets: Planet[],
  debrisFields: Record<string, DebrisField>,
  currentTime: number,
  limits: {
    activeSpyMissions: number
    activeAttackMissions: number
    config: DynamicBehaviorConfig
  }
): { spyCreated: boolean; attackCreated: boolean } => {
  const { activeSpyMissions, activeAttackMissions, config } = limits
  let spyCreated = false
  let attackCreated = false

  // 1. 检查并回收附近的残骸（优先级最高，不受并发限制）
  const nearbyDebris = findNearbyDebris(npc, debrisFields)
  if (nearbyDebris.length > 0) {
    const activeRecycleMissions = npc.fleetMissions?.filter(m => m.missionType === MissionType.Recycle && m.status === 'outbound') || []
    const activeDebrisIds = new Set(activeRecycleMissions.map(m => m.debrisFieldId).filter(Boolean))
    const availableDebris = nearbyDebris.filter(d => !activeDebrisIds.has(d.id))

    if (availableDebris.length > 0) {
      const targetDebris = availableDebris[Math.floor(Math.random() * availableDebris.length)]
      if (targetDebris) {
        createNPCRecycleMission(npc, targetDebris, player, allPlanets)
      }
    }
  }

  // 2. 检查是否应该反击（优先于普通攻击，受攻击并发限制）
  if (activeAttackMissions < config.maxConcurrentAttackMissions && shouldNPCRevenge(npc, currentTime)) {
    const revengeMission = createNPCRevengeMission(npc, allPlanets, config)
    if (revengeMission) {
      const targetPlanet = allPlanets.find(p => p.id === revengeMission.targetPlanetId)
      if (targetPlanet) {
        const alert = createIncomingFleetAlert(revengeMission, npc, targetPlanet)
        if (!player.incomingFleetAlerts) {
          player.incomingFleetAlerts = []
        }
        player.incomingFleetAlerts.push(alert)
        attackCreated = true
      }
      return { spyCreated, attackCreated }
    }
  }

  // 3. 检查是否应该侦查玩家（受侦查并发限制）
  if (activeSpyMissions < config.maxConcurrentSpyMissions && shouldNPCSpyPlayer(npc, player, currentTime, config)) {
    const playerPlanets = allPlanets.filter(p => p.ownerId === player.id)
    if (playerPlanets.length > 0) {
      const targetPlanet = playerPlanets[Math.floor(Math.random() * playerPlanets.length)]
      if (targetPlanet) {
        const spyMission = createNPCSpyMission(npc, targetPlanet, allPlanets, config)
        if (spyMission) {
          const alert = createIncomingFleetAlert(spyMission, npc, targetPlanet)
          if (!player.incomingFleetAlerts) {
            player.incomingFleetAlerts = []
          }
          player.incomingFleetAlerts.push(alert)
          spyCreated = true
        }
      }
    }
  }

  // 4. 检查是否应该攻击玩家（受攻击并发限制）
  if (activeAttackMissions < config.maxConcurrentAttackMissions && shouldNPCAttackPlayer(npc, player, currentTime, config)) {
    if (npc.playerSpyReports && Object.keys(npc.playerSpyReports).length > 0) {
      const spyReports = Object.values(npc.playerSpyReports)
      const recentReport = spyReports[Math.floor(Math.random() * spyReports.length)]

      if (recentReport) {
        const targetPlanet = allPlanets.find(p => p.id === recentReport.targetPlanetId)
        if (targetPlanet) {
          const attackMission = createNPCAttackMission(npc, targetPlanet, recentReport, config)
          if (attackMission) {
            const alert = createIncomingFleetAlert(attackMission, npc, targetPlanet)
            if (!player.incomingFleetAlerts) {
              player.incomingFleetAlerts = []
            }
            player.incomingFleetAlerts.push(alert)
            attackCreated = true
          }
        }
      }
    }
  }

  // 5. 检查是否应该赠送资源给玩家（仅友好NPC，不受并发限制）
  if (shouldNPCGiftPlayer(npc, player, currentTime)) {
    giftResourcesToPlayer(npc, player)
  }

  // 6. 更新即将到来的舰队警告（删除过期的）
  updateIncomingFleetAlerts(player, currentTime)

  return { spyCreated, attackCreated }
}

// ========== 测试辅助函数 ==========

/**
 * 测试函数：强制NPC立即侦查玩家
 * 用于开发和测试
 */
export const forceNPCSpyPlayer = (npc: NPC, player: Player, allPlanets: Planet[], targetPlanetIndex = 0): FleetMission | null => {
  const config = calculateDynamicBehavior(player.points)

  // 选择目标星球
  const playerPlanets = allPlanets.filter(p => p.ownerId === player.id)
  if (playerPlanets.length === 0) {
    console.error('[Test] No player planets found')
    return null
  }

  const targetPlanet = playerPlanets[targetPlanetIndex] || playerPlanets[0]
  if (!targetPlanet) {
    console.error('[Test] Target planet not found')
    return null
  }

  // 创建侦查任务
  const spyMission = createNPCSpyMission(npc, targetPlanet, allPlanets, config)

  if (spyMission) {
    // 创建即将到来的舰队警告
    const alert = createIncomingFleetAlert(spyMission, npc, targetPlanet)
    if (!player.incomingFleetAlerts) {
      player.incomingFleetAlerts = []
    }
    player.incomingFleetAlerts.push(alert)
  } else {
    console.error('[Test] Failed to create spy mission - NPC may not have spy probes')
  }

  return spyMission
}

/**
 * 测试函数：强制NPC立即攻击玩家
 * 需要先有侦查报告
 */
export const forceNPCAttackPlayer = (npc: NPC, player: Player, allPlanets: Planet[], targetPlanetIndex = 0): FleetMission | null => {
  const config = calculateDynamicBehavior(player.points)

  // 检查是否有侦查报告
  if (!npc.playerSpyReports || Object.keys(npc.playerSpyReports).length === 0) {
    console.error('[Test] No spy reports available - NPC must spy first!')
    return null
  }

  // 选择目标星球
  const playerPlanets = allPlanets.filter(p => p.ownerId === player.id)
  if (playerPlanets.length === 0) {
    console.error('[Test] No player planets found')
    return null
  }

  const targetPlanet = playerPlanets[targetPlanetIndex] || playerPlanets[0]
  if (!targetPlanet) {
    console.error('[Test] Target planet not found')
    return null
  }

  // 获取该星球的侦查报告
  const spyReport = npc.playerSpyReports[targetPlanet.id]
  if (!spyReport) {
    console.error(`[Test] No spy report for ${targetPlanet.name} - spy this planet first!`)
    return null
  }

  // 创建攻击任务
  const attackMission = createNPCAttackMission(npc, targetPlanet, spyReport, config)

  if (attackMission) {
    // 创建即将到来的舰队警告
    const alert = createIncomingFleetAlert(attackMission, npc, targetPlanet)
    if (!player.incomingFleetAlerts) {
      player.incomingFleetAlerts = []
    }
    player.incomingFleetAlerts.push(alert)
  } else {
    console.error('[Test] Failed to create attack mission - NPC may not have ships')
  }

  return attackMission
}

/**
 * 测试函数：强制NPC先侦查再攻击
 * 一步到位的测试函数
 */
export const forceNPCSpyAndAttack = (
  npc: NPC,
  player: Player,
  allPlanets: Planet[],
  targetPlanetIndex = 0
): { spyMission: FleetMission | null; attackMission: FleetMission | null } => {
  // 1. 先侦查
  const spyMission = forceNPCSpyPlayer(npc, player, allPlanets, targetPlanetIndex)

  if (!spyMission) {
    return { spyMission: null, attackMission: null }
  }

  // 2. 模拟侦查到达，立即生成侦查报告
  const playerPlanets = allPlanets.filter(p => p.ownerId === player.id)
  const targetPlanet = playerPlanets[targetPlanetIndex] || playerPlanets[0]
  if (!targetPlanet) {
    console.error('[Test] Target planet not found')
    return { spyMission, attackMission: null }
  }

  const { spyReport, spiedNotification } = processNPCSpyArrival(npc, spyMission, targetPlanet, player)

  // 保存侦查报告到NPC
  if (!npc.playerSpyReports) {
    npc.playerSpyReports = {}
  }
  npc.playerSpyReports[targetPlanet.id] = spyReport

  // 添加被侦查通知给玩家
  if (!player.spiedNotifications) {
    player.spiedNotifications = []
  }
  player.spiedNotifications.push(spiedNotification)

  // 3. 立即发起攻击
  const attackMission = forceNPCAttackPlayer(npc, player, allPlanets, targetPlanetIndex)

  return { spyMission, attackMission }
}

/**
 * 测试函数：加速舰队任务到达时间
 * 将任务的到达时间设置为现在+指定秒数
 */
export const accelerateNPCMission = (npc: NPC, missionId: string, arriveInSeconds = 5, player?: Player): boolean => {
  if (!npc.fleetMissions) {
    console.error('[Test] NPC has no fleet missions')
    return false
  }

  const mission = npc.fleetMissions.find(m => m.id === missionId)
  if (!mission) {
    console.error('[Test] Mission not found')
    return false
  }

  const now = Date.now()
  const flightTime = arriveInSeconds * 1000 // 飞行时间（毫秒）

  // 同时修改 departureTime 和 arrivalTime，保持飞行时间为指定秒数
  mission.departureTime = now
  mission.arrivalTime = now + flightTime

  // 同时更新对应的 IncomingFleetAlert
  if (player && player.incomingFleetAlerts) {
    const alert = player.incomingFleetAlerts.find(a => a.id === missionId)
    if (alert) {
      alert.arrivalTime = mission.arrivalTime
    }
  }

  return true
}

/**
 * 测试函数：加速所有NPC舰队任务
 */
export const accelerateAllNPCMissions = (npc: NPC, arriveInSeconds = 5, player?: Player): number => {
  if (!npc.fleetMissions) {
    console.error('[Test] NPC has no fleet missions')
    return 0
  }

  const now = Date.now()
  const flightTime = arriveInSeconds * 1000
  let count = 0

  npc.fleetMissions.forEach(mission => {
    if (mission.status === 'outbound') {
      // 同时修改 departureTime 和 arrivalTime
      mission.departureTime = now
      mission.arrivalTime = now + flightTime

      // 同时更新对应的 IncomingFleetAlert
      if (player && player.incomingFleetAlerts) {
        const alert = player.incomingFleetAlerts.find(a => a.id === mission.id)
        if (alert) {
          alert.arrivalTime = mission.arrivalTime
        }
      }

      count++
    } else if (mission.status === 'returning' && mission.returnTime) {
      // 对于返回任务，保持原来的逻辑
      mission.returnTime = now + flightTime
      count++
    }
  })

  return count
}

/**
 * 检查NPC星球附近是否有残骸场
 * 返回NPC可以回收的残骸场列表
 * NPC会主动寻找同一星系内的残骸进行回收
 */
export const findNearbyDebris = (npc: NPC, debrisFields: Record<string, DebrisField>): DebrisField[] => {
  const nearbyDebris: DebrisField[] = []

  for (const debris of Object.values(debrisFields)) {
    // 检查残骸是否在NPC的星球附近（同一星系内）
    for (const npcPlanet of npc.planets) {
      if (debris.position.galaxy === npcPlanet.position.galaxy && debris.position.system === npcPlanet.position.system) {
        // 检查残骸是否有足够资源值得回收（至少1000金属或水晶）
        if (debris.resources.metal > 1000 || debris.resources.crystal > 1000) {
          // 计算距离，确保不会太远（最多在同一星系内）
          const distance = Math.abs(debris.position.position - npcPlanet.position.position)
          if (distance <= 15) {
            // 同一星系内最多15个位置
            nearbyDebris.push(debris)
          }
        }
      }
    }
  }

  return nearbyDebris
}

/**
 * 创建NPC回收残骸任务
 */
export const createNPCRecycleMission = (npc: NPC, debris: DebrisField, player: Player, allPlanets: Planet[]): FleetMission | null => {
  // 找到离残骸最近的NPC星球
  let closestPlanet: Planet | null = null
  let minDistance = Infinity

  for (const npcPlanet of npc.planets) {
    if (npcPlanet.position.galaxy === debris.position.galaxy && npcPlanet.position.system === debris.position.system) {
      const distance = Math.abs(npcPlanet.position.position - debris.position.position)
      if (distance < minDistance) {
        minDistance = distance
        closestPlanet = npcPlanet
      }
    }
  }

  if (!closestPlanet) {
    return null
  }

  // 检查NPC是否有回收船
  const recyclers = closestPlanet.fleet[ShipType.Recycler] || 0
  if (recyclers === 0) {
    return null
  }

  // 计算需要多少回收船（每艘回收船容量20000）
  const totalDebris = debris.resources.metal + debris.resources.crystal
  const recyclersNeeded = Math.min(Math.ceil(totalDebris / 20000), recyclers)

  // 创建回收舰队
  const fleet: Partial<Fleet> = {
    [ShipType.Recycler]: recyclersNeeded
  }

  // 从NPC星球扣除舰队
  closestPlanet.fleet[ShipType.Recycler] = recyclers - recyclersNeeded

  // 计算飞行时间
  const distance = fleetLogic.calculateDistance(closestPlanet.position, debris.position)
  const recyclerSpeed = 2000 // 回收船基础速度
  const flightTime = fleetLogic.calculateFlightTime(distance, recyclerSpeed)

  const now = Date.now()
  const mission: FleetMission = {
    id: `npc-recycle-${npc.id}-${now}`,
    playerId: npc.id,
    npcId: npc.id,
    isHostile: false,
    originPlanetId: closestPlanet.id,
    targetPosition: debris.position,
    debrisFieldId: debris.id,
    missionType: MissionType.Recycle,
    fleet,
    cargo: { metal: 0, crystal: 0, deuterium: 0, darkMatter: 0, energy: 0 },
    departureTime: now,
    arrivalTime: now + flightTime * 1000,
    status: 'outbound'
  }

  // 添加到NPC任务列表
  if (!npc.fleetMissions) {
    npc.fleetMissions = []
  }
  npc.fleetMissions.push(mission)

  // 检查残骸位置是否有玩家星球，如果有则发送警告
  const playerPlanetAtDebris = allPlanets.find(
    p =>
      p.ownerId === player.id &&
      p.position.galaxy === debris.position.galaxy &&
      p.position.system === debris.position.system &&
      p.position.position === debris.position.position
  )

  if (playerPlanetAtDebris) {
    // 创建即将到来的舰队警告（非敌对）
    const alert = createIncomingFleetAlert(mission, npc, playerPlanetAtDebris)
    if (!player.incomingFleetAlerts) {
      player.incomingFleetAlerts = []
    }
    player.incomingFleetAlerts.push(alert)

    // 创建NPC活动通知
    if (!player.npcActivityNotifications) {
      player.npcActivityNotifications = []
    }
    player.npcActivityNotifications.push({
      id: `npc-activity-${mission.id}`,
      timestamp: now,
      npcId: npc.id,
      npcName: npc.name,
      activityType: 'recycle',
      targetPosition: debris.position,
      targetPlanetId: playerPlanetAtDebris.id,
      targetPlanetName: playerPlanetAtDebris.name,
      arrivalTime: mission.arrivalTime,
      read: false
    })
  }

  return mission
}

/**
 * NPC被攻击后的反应
 * 记录攻击者，并根据情况决定是否反击或加强防御
 */
export const handleNPCAttacked = (npc: NPC, attackerId: string, attackerPlanetId: string | undefined): void => {
  // 初始化被攻击记录
  if (!npc.attackedBy) {
    npc.attackedBy = {}
  }

  // 记录攻击者和被攻击次数
  if (!npc.attackedBy[attackerId]) {
    npc.attackedBy[attackerId] = {
      count: 0,
      lastAttackTime: 0,
      planetId: attackerPlanetId
    }
  }
  npc.attackedBy[attackerId].count++
  npc.attackedBy[attackerId].lastAttackTime = Date.now()
  if (attackerPlanetId) {
    npc.attackedBy[attackerId].planetId = attackerPlanetId
  }

  // 设置警戒状态（被攻击后1小时内保持警戒）
  npc.alertUntil = Date.now() + 3600 * 1000

  // 如果被同一个玩家攻击超过3次，标记为高优先级反击目标
  if (npc.attackedBy[attackerId].count >= 3) {
    npc.revengeTarget = attackerId
  }
}

/**
 * 检查NPC是否应该反击
 */
export const shouldNPCRevenge = (npc: NPC, currentTime: number): boolean => {
  // 如果没有复仇目标，不反击
  if (!npc.revengeTarget || !npc.attackedBy) {
    return false
  }

  const attackRecord = npc.attackedBy[npc.revengeTarget]
  if (!attackRecord) {
    return false
  }

  // 被攻击后24小时内可以反击
  const timeSinceLastAttack = currentTime - attackRecord.lastAttackTime
  if (timeSinceLastAttack > 24 * 3600 * 1000) {
    return false
  }

  // 至少等待10分钟后再反击（给NPC时间准备）
  if (timeSinceLastAttack < 600 * 1000) {
    return false
  }

  return true
}

/**
 * 创建NPC反击任务
 */
export const createNPCRevengeMission = (npc: NPC, allPlanets: Planet[], config: DynamicBehaviorConfig): FleetMission | null => {
  if (!npc.revengeTarget || !npc.attackedBy) {
    return null
  }

  const attackRecord = npc.attackedBy[npc.revengeTarget]
  if (!attackRecord || !attackRecord.planetId) {
    return null
  }

  // 找到攻击者的星球
  const targetPlanet = allPlanets.find(p => p.id === attackRecord.planetId)
  if (!targetPlanet) {
    return null
  }

  // 选择NPC的最佳星球作为起点
  const npcPlanet = selectBestNPCPlanet(npc, targetPlanet.position)
  if (!npcPlanet) {
    return null
  }

  // 反击时派出更多舰队（比正常攻击多50%）
  const revengeFleet = decideAttackFleet(npc, npcPlanet, {} as SpyReport, {
    ...config,
    attackFleetSizeRatio: Math.min(1.0, config.attackFleetSizeRatio * 1.5)
  })

  if (!revengeFleet) {
    return null
  }

  // 从NPC星球扣除舰队
  for (const [shipType, count] of Object.entries(revengeFleet)) {
    npcPlanet.fleet[shipType as ShipType] = (npcPlanet.fleet[shipType as ShipType] || 0) - (count as number)
  }

  // 计算飞行时间
  const distance = fleetLogic.calculateDistance(npcPlanet.position, targetPlanet.position)
  let minSpeed = Infinity
  for (const _shipType of Object.keys(revengeFleet)) {
    const baseSpeed = 10000
    minSpeed = Math.min(minSpeed, baseSpeed)
  }
  const flightTime = fleetLogic.calculateFlightTime(distance, minSpeed)

  const now = Date.now()
  const mission: FleetMission = {
    id: `npc-revenge-${npc.id}-${now}`,
    playerId: npc.id,
    npcId: npc.id,
    isHostile: true,
    originPlanetId: npcPlanet.id,
    targetPosition: targetPlanet.position,
    targetPlanetId: targetPlanet.id,
    missionType: MissionType.Attack,
    fleet: revengeFleet,
    cargo: { metal: 0, crystal: 0, deuterium: 0, darkMatter: 0, energy: 0 },
    departureTime: now,
    arrivalTime: now + flightTime * 1000,
    status: 'outbound'
  }

  // 添加到NPC任务列表
  if (!npc.fleetMissions) {
    npc.fleetMissions = []
  }
  npc.fleetMissions.push(mission)

  // 清除复仇目标（已经反击）
  npc.revengeTarget = undefined

  return mission
}

/**
 * NPC状态诊断函数 - 用于调试和了解NPC当前状态
 */

// 诊断原因类型，包含翻译键和参数
export interface DiagnosticReason {
  key: string // 翻译键，如 'friendlyNoAction', 'insufficientProbes'
  params?: Record<string, string | number> // 翻译参数，如 { current: 5, required: 10 }
}

// 关系状态翻译键类型
export type RelationStatusKey = 'friendly' | 'hostile' | 'neutral' | 'noRelation' | 'noRelationNeutral'

export interface NPCDiagnosticInfo {
  npcId: string
  npcName: string
  difficulty: string
  relationStatus: string // 保持原有字段用于显示
  relationStatusKey: RelationStatusKey // 翻译键
  reputation: number
  canSpy: boolean
  canAttack: boolean
  spyProbes: number
  totalFleetPower: number
  lastSpyTime: number
  lastAttackTime: number
  timeSinceLastSpy: number
  timeSinceLastAttack: number
  nextSpyIn: number
  nextAttackIn: number
  attackProbability: number
  reasons: DiagnosticReason[] // 改为结构化原因数组
}

export const diagnoseNPCBehavior = (npcs: NPC[], player: Player, currentTime: number): NPCDiagnosticInfo[] => {
  const playerPoints = player.points || 0
  const config = calculateDynamicBehavior(playerPoints)

  return npcs.map(npc => {
    const planet = npc.planets[0]
    const relation = npc.relations?.[player.id]
    const reasons: DiagnosticReason[] = []

    // 检查外交关系
    let canSpy = false // 默认不能侦查，只有敌对NPC才能侦查
    let canAttack = false // 默认不能攻击，只有敌对NPC才能攻击
    let relationStatus = ''
    let relationStatusKey: RelationStatusKey = 'noRelation'
    let reputation = 0

    if (relation) {
      reputation = relation.reputation || 0

      if (relation.status === RelationStatus.Friendly) {
        relationStatus = 'friendly'
        relationStatusKey = 'friendly'
        reasons.push({ key: 'friendlyNoAction' })
      } else if (relation.status === RelationStatus.Neutral) {
        relationStatus = 'neutral'
        relationStatusKey = 'neutral'
        reasons.push({ key: 'neutralNoAction' })
      } else if (relation.status === RelationStatus.Hostile) {
        relationStatus = 'hostile'
        relationStatusKey = 'hostile'
        canSpy = true
        canAttack = true
        reasons.push({ key: 'hostileWillAct' })
      }
    } else {
      // 无关系的NPC视为中立
      relationStatus = 'noRelationNeutral'
      relationStatusKey = 'noRelationNeutral'
      reasons.push({ key: 'noRelationNeutral' })
    }

    // 检查侦查探测器数量
    const spyProbes = planet?.fleet?.[ShipType.EspionageProbe] || 0
    if (spyProbes < config.minSpyProbes) {
      canSpy = false
      reasons.push({ key: 'insufficientProbes', params: { current: spyProbes, required: config.minSpyProbes } })
    }

    // 计算舰队战力
    let totalFleetPower = 0
    if (planet?.fleet) {
      Object.entries(planet.fleet).forEach(([shipType, count]) => {
        const shipConfig = SHIPS[shipType as ShipType]
        if (shipConfig) {
          const power = shipConfig.attack + shipConfig.shield + shipConfig.armor / 10
          totalFleetPower += power * (count as number)
        }
      })
    }

    if (totalFleetPower === 0) {
      canAttack = false
      reasons.push({ key: 'noFleet' })
    }

    // 时间检查
    const lastSpyTime = npc.lastSpyTime || 0
    const lastAttackTime = npc.lastAttackTime || 0
    const timeSinceLastSpy = Math.floor((currentTime - lastSpyTime) / 1000)
    const timeSinceLastAttack = Math.floor((currentTime - lastAttackTime) / 1000)

    const nextSpyIn = Math.max(0, config.spyInterval - timeSinceLastSpy)
    const nextAttackIn = Math.max(0, config.attackInterval - timeSinceLastAttack)

    if (timeSinceLastSpy < config.spyInterval) {
      reasons.push({ key: 'spyCooldown', params: { min: Math.floor(nextSpyIn / 60), sec: nextSpyIn % 60 } })
    }

    if (timeSinceLastAttack < config.attackInterval) {
      reasons.push({ key: 'attackCooldown', params: { min: Math.floor(nextAttackIn / 60), sec: nextAttackIn % 60 } })
    }

    // 检查是否已经侦查过玩家
    const hasSpiedPlayer = npc.playerSpyReports && Object.keys(npc.playerSpyReports).length > 0

    if (!hasSpiedPlayer && canAttack) {
      canAttack = false
      reasons.push({ key: 'notSpiedYet' })
    }

    // 计算实际攻击概率
    let actualAttackProbability = config.attackProbability
    if (relation?.status === RelationStatus.Hostile) {
      actualAttackProbability = Math.min(config.attackProbability * 2.0, 1.0)
    }

    return {
      npcId: npc.id,
      npcName: npc.name,
      difficulty: npc.difficulty,
      relationStatus,
      relationStatusKey,
      reputation,
      canSpy,
      canAttack,
      spyProbes,
      totalFleetPower: Math.floor(totalFleetPower),
      lastSpyTime,
      lastAttackTime,
      timeSinceLastSpy,
      timeSinceLastAttack,
      nextSpyIn,
      nextAttackIn,
      attackProbability: actualAttackProbability,
      reasons
    }
  })
}
