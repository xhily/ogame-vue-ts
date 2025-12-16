/**
 * 舰队仓储逻辑模块
 * 处理舰队仓储容量计算和使用量统计
 */

import type { Planet, Fleet } from '@/types/game'
import { ShipType, BuildingType, TechnologyType } from '@/types/game'
import { SHIPS, FLEET_STORAGE_CONFIG, BUILDINGS, TECHNOLOGIES } from '@/config/gameConfig'

/**
 * 计算舰队当前使用的仓储量
 * @param fleet 舰队对象
 * @returns 当前使用的仓储量
 */
export const calculateFleetStorageUsage = (fleet: Fleet): number => {
  let totalUsage = 0

  for (const shipType of Object.values(ShipType)) {
    const shipCount = fleet[shipType] || 0
    const shipConfig = SHIPS[shipType]
    totalUsage += shipCount * shipConfig.storageUsage
  }

  return totalUsage
}

/**
 * 计算星球的最大舰队仓储容量
 * @param planet 星球对象
 * @param technologies 玩家的科技等级
 * @returns 最大舰队仓储容量
 */
export const calculateMaxFleetStorage = (planet: Planet, technologies: Record<TechnologyType, number>): number => {
  // 1. 基础仓储
  let maxStorage = FLEET_STORAGE_CONFIG.baseStorage

  // 2. 造船厂建筑加成（每个星球独立）
  const shipyardLevel = planet.buildings[BuildingType.Shipyard] || 0
  const shipyardBonus = BUILDINGS[BuildingType.Shipyard].fleetStorageBonus || 0
  maxStorage += shipyardLevel * shipyardBonus

  // 3. 计算机技术全局加成
  const computerTechLevel = technologies[TechnologyType.ComputerTechnology] || 0
  const computerTechBonus = TECHNOLOGIES[TechnologyType.ComputerTechnology].fleetStorageBonus || 0
  maxStorage += computerTechLevel * computerTechBonus

  return maxStorage
}

/**
 * 检查是否有足够的舰队仓储空间建造新舰船
 * @param planet 星球对象
 * @param shipType 要建造的舰船类型
 * @param quantity 要建造的数量
 * @param technologies 玩家的科技等级
 * @returns 是否有足够的空间
 */
export const hasEnoughFleetStorage = (
  planet: Planet,
  shipType: ShipType,
  quantity: number,
  technologies: Record<TechnologyType, number>
): boolean => {
  const currentUsage = calculateFleetStorageUsage(planet.fleet)
  const maxStorage = calculateMaxFleetStorage(planet, technologies)
  const newShipUsage = SHIPS[shipType].storageUsage * quantity

  return currentUsage + newShipUsage <= maxStorage
}

/**
 * 计算当前可以建造的最大舰船数量（基于仓储限制）
 * @param planet 星球对象
 * @param shipType 要建造的舰船类型
 * @param technologies 玩家的科技等级
 * @returns 最大可建造数量
 */
export const getMaxBuildableShips = (planet: Planet, shipType: ShipType, technologies: Record<TechnologyType, number>): number => {
  const currentUsage = calculateFleetStorageUsage(planet.fleet)
  const maxStorage = calculateMaxFleetStorage(planet, technologies)
  const availableStorage = maxStorage - currentUsage
  const shipStorageUsage = SHIPS[shipType].storageUsage

  if (shipStorageUsage === 0) return Number.MAX_SAFE_INTEGER
  return Math.floor(availableStorage / shipStorageUsage)
}
