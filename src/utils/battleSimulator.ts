import type { Fleet, Resources } from '@/types/game'
import { ShipType, DefenseType } from '@/types/game'
import { SHIPS, DEFENSES } from '@/config/gameConfig'

// 战斗单位接口
interface CombatUnit {
  type: ShipType | DefenseType
  count: number
  attack: number
  shield: number
  armor: number
  rapidFire?: Record<string, number> // 快速射击
}

// 战斗方
interface BattleSide {
  ships: Partial<Fleet>
  defense?: Partial<Record<DefenseType, number>>
  weaponTech?: number
  shieldTech?: number
  armorTech?: number
}

// 战斗轮次结果
interface RoundResult {
  attackerLosses: Partial<Fleet>
  defenderLosses: {
    fleet: Partial<Fleet>
    defense: Partial<Record<DefenseType, number>>
  }
  attackerRemainingPower: number
  defenderRemainingPower: number
}

/**
 * 计算科技加成后的数值
 */
const applyTechBonus = (baseValue: number, techLevel: number = 0, bonusPerLevel: number = 0.1): number => {
  return Math.floor(baseValue * (1 + techLevel * bonusPerLevel))
}

/**
 * 将舰队和防御转换为战斗单位数组
 */
const prepareCombatUnits = (side: BattleSide, isDefender: boolean = false): CombatUnit[] => {
  const units: CombatUnit[] = []

  // 处理舰船
  if (side.ships) {
    for (const [shipType, count] of Object.entries(side.ships)) {
      if (count > 0) {
        const config = SHIPS[shipType as ShipType]
        units.push({
          type: shipType as ShipType,
          count: count,
          attack: applyTechBonus(config.attack, side.weaponTech),
          shield: applyTechBonus(config.shield, side.shieldTech),
          armor: applyTechBonus(config.armor, side.armorTech)
        })
      }
    }
  }

  // 处理防御设施（仅防守方）
  if (isDefender && side.defense) {
    for (const [defenseType, count] of Object.entries(side.defense)) {
      if (count > 0) {
        const config = DEFENSES[defenseType as DefenseType]
        units.push({
          type: defenseType as DefenseType,
          count: count,
          attack: applyTechBonus(config.attack, side.weaponTech),
          shield: applyTechBonus(config.shield, side.shieldTech),
          armor: applyTechBonus(config.armor, side.armorTech)
        })
      }
    }
  }

  return units
}

/**
 * 计算一个单位对另一个单位造成的伤害
 */
const calculateDamage = (attacker: CombatUnit, defender: CombatUnit): { destroyed: number; damagedShield: number } => {
  const attackPower = attacker.attack
  const defenderShield = defender.shield
  const defenderArmor = defender.armor

  let destroyed = 0
  let damagedShield = 0

  // 如果攻击力小于护盾的1%，有很大概率无法击穿护盾
  if (attackPower < defenderShield * 0.01) {
    if (Math.random() > 0.01) {
      return { destroyed: 0, damagedShield: 0 }
    }
  }

  // 计算伤害
  let remainingDamage = attackPower

  // 先消耗护盾
  if (remainingDamage > defenderShield) {
    remainingDamage -= defenderShield
    damagedShield = defenderShield
  } else {
    damagedShield = remainingDamage
    return { destroyed: 0, damagedShield }
  }

  // 再消耗装甲
  if (remainingDamage > defenderArmor) {
    destroyed = 1
  } else {
    // 有概率摧毁
    const destroyChance = remainingDamage / defenderArmor
    if (Math.random() < destroyChance) {
      destroyed = 1
    }
  }

  return { destroyed, damagedShield }
}

/**
 * 执行一轮战斗
 */
const executeRound = (attackerUnits: CombatUnit[], defenderUnits: CombatUnit[]): RoundResult => {
  const attackerLosses: Partial<Fleet> = {}
  const defenderShipLosses: Partial<Fleet> = {}
  const defenderDefenseLosses: Partial<Record<DefenseType, number>> = {}

  // 攻击方向防守方射击
  for (const attacker of attackerUnits) {
    for (let i = 0; i < attacker.count; i++) {
      // 随机选择一个目标
      if (defenderUnits.length === 0) break

      const targetIndex = Math.floor(Math.random() * defenderUnits.length)
      const target = defenderUnits[targetIndex]

      if (!target) continue

      const { destroyed } = calculateDamage(attacker, target)

      if (destroyed > 0) {
        target.count -= destroyed

        // 记录损失
        if (Object.values(ShipType).includes(target.type as ShipType)) {
          const shipType = target.type as ShipType
          defenderShipLosses[shipType] = (defenderShipLosses[shipType] || 0) + destroyed
        } else {
          const defenseType = target.type as DefenseType
          defenderDefenseLosses[defenseType] = (defenderDefenseLosses[defenseType] || 0) + destroyed
        }

        // 如果目标被全部摧毁，从列表中移除
        if (target.count <= 0) {
          defenderUnits.splice(targetIndex, 1)
        }
      }
    }
  }

  // 防守方向攻击方射击
  for (const defender of defenderUnits) {
    for (let i = 0; i < defender.count; i++) {
      // 随机选择一个目标
      if (attackerUnits.length === 0) break

      const targetIndex = Math.floor(Math.random() * attackerUnits.length)
      const target = attackerUnits[targetIndex]

      if (!target) continue

      const { destroyed } = calculateDamage(defender, target)

      if (destroyed > 0) {
        target.count -= destroyed

        // 记录损失
        const shipType = target.type as ShipType
        attackerLosses[shipType] = (attackerLosses[shipType] || 0) + destroyed

        // 如果目标被全部摧毁，从列表中移除
        if (target.count <= 0) {
          attackerUnits.splice(targetIndex, 1)
        }
      }
    }
  }

  // 计算剩余战斗力
  const attackerPower = attackerUnits.reduce((sum, unit) => sum + unit.count * unit.attack, 0)
  const defenderPower = defenderUnits.reduce((sum, unit) => sum + unit.count * unit.attack, 0)

  return {
    attackerLosses,
    defenderLosses: {
      fleet: defenderShipLosses,
      defense: defenderDefenseLosses
    },
    attackerRemainingPower: attackerPower,
    defenderRemainingPower: defenderPower
  }
}

/**
 * 模拟完整战斗
 * @param attacker 攻击方
 * @param defender 防守方
 * @param maxRounds 最大回合数（默认6回合）
 */
export const simulateBattle = (
  attacker: BattleSide,
  defender: BattleSide,
  maxRounds: number = 6
): {
  winner: 'attacker' | 'defender' | 'draw'
  rounds: number
  attackerLosses: Partial<Fleet>
  defenderLosses: {
    fleet: Partial<Fleet>
    defense: Partial<Record<DefenseType, number>>
  }
  attackerRemaining: Partial<Fleet>
  defenderRemaining: {
    fleet: Partial<Fleet>
    defense: Partial<Record<DefenseType, number>>
  }
  roundDetails: Array<{
    round: number
    attackerLosses: Partial<Fleet>
    defenderLosses: {
      fleet: Partial<Fleet>
      defense: Partial<Record<DefenseType, number>>
    }
    attackerRemainingPower: number
    defenderRemainingPower: number
  }>
} => {
  // 准备战斗单位
  let attackerUnits = prepareCombatUnits(attacker, false)
  let defenderUnits = prepareCombatUnits(defender, true)

  const totalAttackerLosses: Partial<Fleet> = {}
  const totalDefenderShipLosses: Partial<Fleet> = {}
  const totalDefenderDefenseLosses: Partial<Record<DefenseType, number>> = {}
  const roundDetails: Array<{
    round: number
    attackerLosses: Partial<Fleet>
    defenderLosses: {
      fleet: Partial<Fleet>
      defense: Partial<Record<DefenseType, number>>
    }
    attackerRemainingPower: number
    defenderRemainingPower: number
  }> = []

  let rounds = 0

  // 执行最多maxRounds轮战斗
  for (let round = 0; round < maxRounds; round++) {
    if (attackerUnits.length === 0 || defenderUnits.length === 0) {
      break
    }

    rounds++

    const roundResult = executeRound(attackerUnits, defenderUnits)

    // 保存当前回合详情
    roundDetails.push({
      round: rounds,
      attackerLosses: { ...roundResult.attackerLosses },
      defenderLosses: {
        fleet: { ...roundResult.defenderLosses.fleet },
        defense: { ...roundResult.defenderLosses.defense }
      },
      attackerRemainingPower: roundResult.attackerRemainingPower,
      defenderRemainingPower: roundResult.defenderRemainingPower
    })

    // 累计损失
    for (const [shipType, count] of Object.entries(roundResult.attackerLosses)) {
      totalAttackerLosses[shipType as ShipType] = (totalAttackerLosses[shipType as ShipType] || 0) + count
    }

    for (const [shipType, count] of Object.entries(roundResult.defenderLosses.fleet)) {
      totalDefenderShipLosses[shipType as ShipType] = (totalDefenderShipLosses[shipType as ShipType] || 0) + count
    }

    for (const [defenseType, count] of Object.entries(roundResult.defenderLosses.defense)) {
      totalDefenderDefenseLosses[defenseType as DefenseType] = (totalDefenderDefenseLosses[defenseType as DefenseType] || 0) + count
    }
  }

  // 防御设施有概率修复（70%概率）
  const repairedDefense: Partial<Record<DefenseType, number>> = {}
  for (const [defenseType, count] of Object.entries(totalDefenderDefenseLosses)) {
    const repaired = Math.floor(count * 0.7)
    if (repaired > 0) {
      repairedDefense[defenseType as DefenseType] = repaired
      totalDefenderDefenseLosses[defenseType as DefenseType] = count - repaired
    }
  }

  // 计算剩余单位
  const attackerRemaining: Partial<Fleet> = {}
  for (const unit of attackerUnits) {
    if (unit.count > 0) {
      attackerRemaining[unit.type as ShipType] = unit.count
    }
  }

  const defenderShipRemaining: Partial<Fleet> = {}
  const defenderDefenseRemaining: Partial<Record<DefenseType, number>> = {}
  for (const unit of defenderUnits) {
    if (unit.count > 0) {
      if (Object.values(ShipType).includes(unit.type as ShipType)) {
        defenderShipRemaining[unit.type as ShipType] = unit.count
      } else {
        defenderDefenseRemaining[unit.type as DefenseType] = unit.count
      }
    }
  }

  // 添加修复的防御设施
  for (const [defenseType, count] of Object.entries(repairedDefense)) {
    defenderDefenseRemaining[defenseType as DefenseType] = (defenderDefenseRemaining[defenseType as DefenseType] || 0) + count
  }

  // 判断胜负
  let winner: 'attacker' | 'defender' | 'draw'
  if (attackerUnits.length === 0 && defenderUnits.length === 0) {
    winner = 'draw'
  } else if (attackerUnits.length === 0) {
    winner = 'defender'
  } else if (defenderUnits.length === 0) {
    winner = 'attacker'
  } else {
    // OGame原版规则：6回合后双方都有剩余单位时判定为平局
    winner = 'draw'
  }

  return {
    winner,
    rounds,
    attackerLosses: totalAttackerLosses,
    defenderLosses: {
      fleet: totalDefenderShipLosses,
      defense: totalDefenderDefenseLosses
    },
    attackerRemaining,
    defenderRemaining: {
      fleet: defenderShipRemaining,
      defense: defenderDefenseRemaining
    },
    roundDetails
  }
}

/**
 * 计算掠夺的资源
 * 攻击方最多可以掠夺防守方50%的资源，但受运输船载货量限制
 */
export const calculatePlunder = (defenderResources: Resources, attackerFleet: Partial<Fleet>): Resources => {
  // 计算总载货量
  let totalCapacity = 0
  for (const [shipType, count] of Object.entries(attackerFleet)) {
    const config = SHIPS[shipType as ShipType]
    totalCapacity += config.cargoCapacity * count
  }

  // 计算可掠夺资源（50%）
  const availableResources = {
    metal: Math.floor(defenderResources.metal * 0.5),
    crystal: Math.floor(defenderResources.crystal * 0.5),
    deuterium: Math.floor(defenderResources.deuterium * 0.5),
    darkMatter: Math.floor(defenderResources.darkMatter * 0.5),
    energy: 0
  }

  const totalAvailable =
    availableResources.metal + availableResources.crystal + availableResources.deuterium + availableResources.darkMatter

  // 如果载货量足够，全部掠夺
  if (totalCapacity >= totalAvailable) {
    return availableResources
  }

  // 否则按比例分配
  const ratio = totalCapacity / totalAvailable
  return {
    metal: Math.floor(availableResources.metal * ratio),
    crystal: Math.floor(availableResources.crystal * ratio),
    deuterium: Math.floor(availableResources.deuterium * ratio),
    darkMatter: Math.floor(availableResources.darkMatter * ratio),
    energy: 0
  }
}

/**
 * 计算残骸场
 * 被摧毁的舰船和防御会产生30%的金属和晶体残骸
 */
export const calculateDebrisField = (
  attackerLosses: Partial<Fleet>,
  defenderLosses: {
    fleet: Partial<Fleet>
    defense: Partial<Record<DefenseType, number>>
  }
): Resources => {
  let totalMetal = 0
  let totalCrystal = 0

  // 计算攻击方损失产生的残骸
  for (const [shipType, count] of Object.entries(attackerLosses)) {
    const config = SHIPS[shipType as ShipType]
    totalMetal += config.cost.metal * count * 0.3
    totalCrystal += config.cost.crystal * count * 0.3
  }

  // 计算防守方舰船损失产生的残骸
  for (const [shipType, count] of Object.entries(defenderLosses.fleet)) {
    const config = SHIPS[shipType as ShipType]
    totalMetal += config.cost.metal * count * 0.3
    totalCrystal += config.cost.crystal * count * 0.3
  }

  // 计算防守方防御损失产生的残骸
  for (const [defenseType, count] of Object.entries(defenderLosses.defense)) {
    const config = DEFENSES[defenseType as DefenseType]
    totalMetal += config.cost.metal * count * 0.3
    totalCrystal += config.cost.crystal * count * 0.3
  }

  return {
    metal: Math.floor(totalMetal),
    crystal: Math.floor(totalCrystal),
    deuterium: 0,
    darkMatter: 0,
    energy: 0
  }
}
