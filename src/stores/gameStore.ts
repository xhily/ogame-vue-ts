import { defineStore } from 'pinia'
import type { Planet, Player, BuildQueueItem, FleetMission, BattleResult, SpyReport, Officer, SpiedNotification, NPCActivityNotification, IncomingFleetAlert, MissileAttack } from '@/types/game'
import { TechnologyType, OfficerType } from '@/types/game'
import type { Locale } from '@/locales'
import pkg from '../../package.json'
import { encryptData, decryptData } from '@/utils/crypto'

export const useGameStore = defineStore('game', {
  state: () => ({
    gameTime: Date.now(),
    isPaused: false,
    gameSpeed: 1,
    player: {
      id: 'player1',
      name: '',
      planets: [] as Planet[],
      technologies: {} as Record<TechnologyType, number>,
      officers: {} as Record<OfficerType, Officer>,
      researchQueue: [] as BuildQueueItem[],
      fleetMissions: [] as FleetMission[],
      missileAttacks: [] as MissileAttack[],
      battleReports: [] as BattleResult[],
      spyReports: [] as SpyReport[],
      spiedNotifications: [] as SpiedNotification[],
      npcActivityNotifications: [] as NPCActivityNotification[],
      missionReports: [],
      incomingFleetAlerts: [] as IncomingFleetAlert[],
      giftNotifications: [],
      giftRejectedNotifications: [],
      points: 0,
      isGMEnabled: false, // 明确设置 GM 模式默认为 false
      lastVersionCheckTime: 0 // 最后一次检查版本的时间戳，默认为0
    } as Player,
    currentPlanetId: '',
    isDark: '',
    locale: 'zh-CN' as Locale
  }),
  getters: {
    currentPlanet(): Planet | undefined {
      return this.player.planets.find(p => p.id === this.currentPlanetId)
    },
    getMoonForPlanet(): (planetId: string) => Planet | undefined {
      return (planetId: string) => {
        return this.player.planets.find(p => p.parentPlanetId === planetId && p.isMoon)
      }
    }
  },
  persist: {
    key: pkg.name,
    storage: localStorage,
    serializer: {
      serialize: state => encryptData(state),
      deserialize: value => decryptData(value)
    }
  }
})
