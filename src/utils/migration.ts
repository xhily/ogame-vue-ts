import type { Planet, DebrisField, NPC } from '@/types/game'
import { decryptData, encryptData } from './crypto'
import pkg from '../../package.json'

/**
 * 数据迁移工具
 * 用于从旧版本数据结构迁移到新版本
 */

/**
 * 执行数据迁移
 * 将旧版本的 universePlanets 和 debrisFields 从 gameStore 迁移到 universeStore
 */
export const migrateGameData = (): void => {
  try {
    const storageKey = pkg.name
    const universeStorageKey = `${pkg.name}-universe`

    // 读取旧的加密存档
    const oldEncryptedData = localStorage.getItem(storageKey)
    if (!oldEncryptedData) return

    // 尝试解密（如果是加密格式）
    let oldData: any
    try {
      oldData = decryptData(oldEncryptedData)
    } catch {
      // 解密失败，可能是新格式（未加密），直接解析
      try {
        oldData = JSON.parse(oldEncryptedData)
      } catch {
        return // 无法解析，放弃迁移
      }
    }

    // 检查是否需要迁移
    const hasOldMapData = oldData.universePlanets || oldData.debrisFields
    if (!hasOldMapData) return

    // 准备 universeStore 数据
    const universeData: {
      planets: Record<string, Planet>
      debrisFields: Record<string, DebrisField>
    } = {
      planets: {},
      debrisFields: {}
    }

    // 迁移星球数据（排除玩家星球）
    if (oldData.universePlanets) {
      const oldPlanets = oldData.universePlanets as Record<string, Planet>
      const playerPlanets = oldData.player?.planets || []
      const playerPlanetIds = new Set(playerPlanets.map((p: Planet) => p.id))
      Object.entries(oldPlanets).forEach(([key, planet]) => {
        // 只迁移非玩家星球
        if (!playerPlanetIds.has(planet.id)) {
          universeData.planets[key] = planet
        }
      })
      delete oldData.universePlanets
    }

    // 迁移残骸场数据
    if (oldData.debrisFields) {
      universeData.debrisFields = oldData.debrisFields
      delete oldData.debrisFields
    }

    // 修复NPC数据（确保所有必需字段都存在）
    if (oldData.npcs && Array.isArray(oldData.npcs)) {
      const now = Date.now()
      oldData.npcs.forEach((npc: NPC) => {
        // 确保NPC有必需的时间字段，并设置随机冷却避免同时行动
        if (npc.lastSpyTime === undefined || npc.lastSpyTime === 0) {
          // 0-4分钟的随机延迟
          const randomSpyOffset = Math.random() * 240 * 1000
          npc.lastSpyTime = now - randomSpyOffset
        }
        if (npc.lastAttackTime === undefined || npc.lastAttackTime === 0) {
          // 0-8分钟的随机延迟
          const randomAttackOffset = Math.random() * 480 * 1000
          npc.lastAttackTime = now - randomAttackOffset
        }
        // 确保NPC有必需的数组字段
        if (!npc.fleetMissions) {
          npc.fleetMissions = []
        }
        if (!npc.playerSpyReports) {
          npc.playerSpyReports = {}
        }
        if (!npc.relations) {
          npc.relations = {}
        }
        if (!npc.allies) {
          npc.allies = []
        }
        if (!npc.enemies) {
          npc.enemies = []
        }
      })
    }

    // 初始化玩家积分（如果不存在）
    if (oldData.player && oldData.player.points === undefined) {
      // 积分会在游戏启动时通过 initGame 计算，这里设置为0
      oldData.player.points = 0
    }

    // 保存迁移后的数据
    localStorage.setItem(universeStorageKey, encryptData(universeData))
    localStorage.setItem(storageKey, encryptData(oldData))

    console.log('[Migration] Game data migrated successfully')
  } catch (error) {
    console.error('[Migration] Failed to migrate game data:', error)
  }
}
