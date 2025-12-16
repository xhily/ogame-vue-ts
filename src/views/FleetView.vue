<template>
  <div v-if="planet" class="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
    <!-- 未解锁遮罩 -->
    <UnlockRequirement :required-building="BuildingType.Shipyard" :required-level="1" />

    <h1 class="text-2xl sm:text-3xl font-bold">{{ t('fleetView.title') }}</h1>

    <!-- 标签切换 -->
    <Tabs v-model="activeTab" class="w-full">
      <TabsList class="grid w-full grid-cols-3">
        <TabsTrigger value="fleet">{{ t('fleetView.fleetOverview') }}</TabsTrigger>
        <TabsTrigger value="send">{{ t('fleetView.sendFleet') }}</TabsTrigger>
        <TabsTrigger value="missions">
          {{ t('fleetView.flightMissions') }}
          <Badge v-if="gameStore.player.fleetMissions.length > 0" variant="destructive" class="ml-1">
            {{ gameStore.player.fleetMissions.length }}
          </Badge>
        </TabsTrigger>
      </TabsList>

      <!-- 舰队总览 -->
      <TabsContent value="fleet" class="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>{{ t('fleetView.currentPlanetFleet') }}</CardTitle>
            <CardDescription>
              {{ planet.name }} [{{ planet.position.galaxy }}:{{ planet.position.system }}:{{ planet.position.position }}]
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              <div v-for="(count, shipType) in planet.fleet" :key="shipType" class="p-3 sm:p-4 border rounded-lg space-y-2">
                <div class="flex justify-between items-start">
                  <div>
                    <h3 class="font-semibold text-sm sm:text-base">{{ SHIPS[shipType].name }}</h3>
                    <p class="text-xl sm:text-2xl font-bold">{{ formatNumber(count) }}</p>
                  </div>
                </div>
                <div class="text-xs sm:text-sm text-muted-foreground space-y-1">
                  <p>{{ t('fleetView.attack') }}: {{ SHIPS[shipType].attack }}</p>
                  <p>{{ t('fleetView.shield') }}: {{ SHIPS[shipType].shield }}</p>
                  <p>{{ t('fleetView.armor') }}: {{ SHIPS[shipType].armor }}</p>
                  <p>{{ t('fleetView.speed') }}: {{ formatNumber(SHIPS[shipType].speed) }}</p>
                  <p>{{ t('fleetView.cargo') }}: {{ formatNumber(SHIPS[shipType].cargoCapacity) }}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- 派遣舰队 -->
      <TabsContent value="send" class="mt-4 space-y-4">
        <!-- 舰队任务槽位信息 -->
        <Card>
          <CardContent class="py-4">
            <div class="flex justify-between items-center">
              <span class="text-sm font-medium">{{ t('fleetView.fleetMissionSlots') }}:</span>
              <span class="text-sm font-bold">{{ gameStore.player.fleetMissions.length }} / {{ maxFleetMissions }}</span>
            </div>
          </CardContent>
        </Card>

        <!-- 选择舰队 -->
        <Card>
          <CardHeader>
            <CardTitle>{{ t('fleetView.selectFleet') }}</CardTitle>
            <CardDescription>{{ t('fleetView.selectFleetDescription') }}</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div v-for="(count, shipType) in planet.fleet" :key="shipType" class="space-y-2">
                <Label :for="`ship-${shipType}`" class="text-xs sm:text-sm">
                  {{ SHIPS[shipType].name }} ({{ t('fleetView.available') }}: {{ count }})
                </Label>
                <div class="flex gap-2">
                  <Input
                    :id="`ship-${shipType}`"
                    v-model.number="selectedFleet[shipType]"
                    type="number"
                    min="0"
                    :max="count"
                    placeholder="0"
                    class="text-sm"
                  />
                  <Button @click="selectedFleet[shipType] = count" variant="outline" size="sm">{{ t('fleetView.all') }}</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- 目标坐标 -->
        <Card>
          <CardHeader>
            <CardTitle>{{ t('fleetView.targetCoordinates') }}</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="grid grid-cols-3 gap-2 sm:gap-4">
              <div class="space-y-2">
                <Label for="galaxy" class="text-xs sm:text-sm">{{ t('fleetView.galaxy') }}</Label>
                <Input id="galaxy" v-model.number="targetPosition.galaxy" type="number" min="1" max="9" placeholder="1" />
              </div>
              <div class="space-y-2">
                <Label for="system" class="text-xs sm:text-sm">{{ t('fleetView.system') }}</Label>
                <Input id="system" v-model.number="targetPosition.system" type="number" min="1" max="10" placeholder="1" />
              </div>
              <div class="space-y-2">
                <Label for="position" class="text-xs sm:text-sm">{{ t('fleetView.position') }}</Label>
                <Input id="position" v-model.number="targetPosition.position" type="number" min="1" max="10" placeholder="1" />
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- 任务类型 -->
        <Card>
          <CardHeader>
            <CardTitle>{{ t('fleetView.missionType') }}</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Button
                v-for="mission in availableMissions"
                :key="mission.type"
                @click="selectedMission = mission.type"
                :variant="selectedMission === mission.type ? 'default' : 'outline'"
                class="justify-start"
              >
                <component :is="mission.icon" class="h-4 w-4 mr-2" />
                {{ mission.name }}
              </Button>
            </div>
          </CardContent>
        </Card>

        <!-- 运输资源（仅运输任务） -->
        <Card v-if="selectedMission === MissionType.Transport">
          <CardHeader>
            <CardTitle>{{ t('fleetView.transportResources') }}</CardTitle>
          </CardHeader>
          <CardContent>
            <!-- 赠送模式切换（仅当目标是NPC星球时显示） -->
            <div v-if="targetNpc" class="mb-4 p-3 border rounded-lg bg-muted/50">
              <div class="flex items-center gap-2 mb-2">
                <Checkbox id="gift-mode" :default-value="isGiftMode" />
                <Label for="gift-mode" class="flex items-center gap-2 cursor-pointer">
                  <Gift class="h-4 w-4" />
                  {{ t('fleetView.giftMode') }}
                </Label>
              </div>
              <p class="text-xs text-muted-foreground">{{ t('fleetView.giftModeDescription') }} {{ targetNpc.name }}</p>
              <div v-if="isGiftMode && (cargo.metal > 0 || cargo.crystal > 0 || cargo.deuterium > 0)" class="mt-2 text-xs">
                <span class="text-muted-foreground">{{ t('fleetView.estimatedReputationGain') }}:</span>
                <span class="ml-1 font-semibold text-green-600 dark:text-green-400">+{{ calculateGiftReputation() }}</span>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div class="space-y-2">
                <Label for="cargo-metal" class="text-xs sm:text-sm flex items-center gap-2">
                  <ResourceIcon type="metal" size="sm" />
                  {{ t('resources.metal') }} ({{ t('fleetView.available') }}: {{ formatNumber(planet.resources.metal) }})
                </Label>
                <Input id="cargo-metal" v-model.number="cargo.metal" type="number" min="0" :max="planet.resources.metal" placeholder="0" />
              </div>
              <div class="space-y-2">
                <Label for="cargo-crystal" class="text-xs sm:text-sm flex items-center gap-2">
                  <ResourceIcon type="crystal" size="sm" />
                  {{ t('resources.crystal') }} ({{ t('fleetView.available') }}: {{ formatNumber(planet.resources.crystal) }})
                </Label>
                <Input
                  id="cargo-crystal"
                  v-model.number="cargo.crystal"
                  type="number"
                  min="0"
                  :max="planet.resources.crystal"
                  placeholder="0"
                />
              </div>
              <div class="space-y-2">
                <Label for="cargo-deuterium" class="text-xs sm:text-sm flex items-center gap-2">
                  <ResourceIcon type="deuterium" size="sm" />
                  {{ t('resources.deuterium') }} ({{ t('fleetView.available') }}: {{ formatNumber(planet.resources.deuterium) }})
                </Label>
                <Input
                  id="cargo-deuterium"
                  v-model.number="cargo.deuterium"
                  type="number"
                  min="0"
                  :max="planet.resources.deuterium"
                  placeholder="0"
                />
              </div>
            </div>
            <p class="text-xs sm:text-sm text-muted-foreground mt-2">
              {{ t('fleetView.totalCargoCapacity') }}: {{ formatNumber(getTotalCargoCapacity()) }} | {{ t('fleetView.used') }}:
              {{ formatNumber(getTotalCargo()) }}
            </p>
          </CardContent>
        </Card>

        <!-- 任务信息 -->
        <Card>
          <CardHeader>
            <CardTitle>{{ t('fleetView.missionInfo') }}</CardTitle>
          </CardHeader>
          <CardContent class="space-y-2">
            <div class="flex justify-between text-xs sm:text-sm">
              <span class="text-muted-foreground">{{ t('fleetView.fuelConsumption') }}:</span>
              <span class="flex items-center gap-1.5">
                <ResourceIcon type="deuterium" size="sm" />
                <span :class="getFuelConsumption() > planet.resources.deuterium ? 'text-red-600 dark:text-red-400 font-medium' : ''">
                  {{ formatNumber(getFuelConsumption()) }}
                </span>
                <span class="text-muted-foreground">/ {{ formatNumber(planet.resources.deuterium) }}</span>
              </span>
            </div>
            <div v-if="Object.values(selectedFleet).some(c => c > 0)" class="flex justify-between text-xs sm:text-sm">
              <span class="text-muted-foreground">{{ t('fleetView.flightTime') }}:</span>
              <span>{{ formatTime(getFlightTime()) }}</span>
            </div>
          </CardContent>
        </Card>

        <!-- 派遣按钮 -->
        <Button @click="handleSendFleet" :disabled="!canSendFleet()" class="w-full" size="lg">{{ t('fleetView.sendFleet') }}</Button>
      </TabsContent>

      <!-- 飞行任务 -->
      <TabsContent value="missions" class="mt-4 space-y-4">
        <Card v-if="gameStore.player.fleetMissions.length === 0">
          <CardContent class="py-8 text-center text-muted-foreground">{{ t('fleetView.noFlightMissions') }}</CardContent>
        </Card>

        <Card v-for="mission in gameStore.player.fleetMissions" :key="mission.id">
          <CardHeader>
            <div class="flex justify-between items-start">
              <div>
                <CardTitle class="text-base sm:text-lg">{{ getMissionName(mission.missionType) }}</CardTitle>
                <CardDescription class="text-xs sm:text-sm">
                  {{ getPlanetName(mission.originPlanetId) }} → [{{ mission.targetPosition.galaxy }}:{{ mission.targetPosition.system }}:{{
                    mission.targetPosition.position
                  }}]
                </CardDescription>
              </div>
              <Badge :variant="mission.status === 'outbound' ? 'default' : 'secondary'">
                {{ mission.status === 'outbound' ? t('fleetView.outbound') : t('fleetView.returning') }}
              </Badge>
            </div>
          </CardHeader>
          <CardContent class="space-y-3">
            <!-- 舰队组成 -->
            <div>
              <p class="text-xs sm:text-sm font-medium mb-2">{{ t('fleetView.fleetComposition') }}:</p>
              <div class="flex flex-wrap gap-2">
                <Badge v-for="(count, shipType) in mission.fleet" :key="shipType" variant="outline">
                  {{ SHIPS[shipType].name }}: {{ count }}
                </Badge>
              </div>
            </div>

            <!-- 携带资源 -->
            <div v-if="mission.cargo.metal > 0 || mission.cargo.crystal > 0 || mission.cargo.deuterium > 0 || mission.cargo.darkMatter > 0">
              <p class="text-xs sm:text-sm font-medium mb-2">{{ t('fleetView.carryingResources') }}:</p>
              <div class="flex flex-wrap gap-2 text-xs">
                <span v-if="mission.cargo.metal > 0" class="flex items-center gap-1">
                  <ResourceIcon type="metal" size="sm" />
                  {{ formatNumber(mission.cargo.metal) }}
                </span>
                <span v-if="mission.cargo.crystal > 0" class="flex items-center gap-1">
                  <ResourceIcon type="crystal" size="sm" />
                  {{ formatNumber(mission.cargo.crystal) }}
                </span>
                <span v-if="mission.cargo.deuterium > 0" class="flex items-center gap-1">
                  <ResourceIcon type="deuterium" size="sm" />
                  {{ formatNumber(mission.cargo.deuterium) }}
                </span>
                <span v-if="mission.cargo.darkMatter > 0" class="flex items-center gap-1">
                  <ResourceIcon type="darkMatter" size="sm" />
                  {{ formatNumber(mission.cargo.darkMatter) }}
                </span>
              </div>
            </div>

            <!-- 进度条 -->
            <div class="space-y-2">
              <div class="flex justify-between text-xs sm:text-sm">
                <span>{{ mission.status === 'outbound' ? t('fleetView.arrivalTime') : t('fleetView.returnTime') }}:</span>
                <span>{{ formatTime(getRemainingTime(mission)) }}</span>
              </div>
              <Progress :model-value="getMissionProgress(mission)" />
            </div>

            <!-- 操作 -->
            <div class="flex gap-2">
              <Button
                v-if="mission.status === 'outbound'"
                @click="handleRecallFleet(mission.id)"
                variant="outline"
                size="sm"
                class="w-full"
              >
                {{ t('fleetView.recallFleet') }}
              </Button>
              <Button
                v-if="mission.status === 'returning' || mission.status === 'arrived'"
                @click="handleAbortMission(mission.id)"
                variant="destructive"
                size="sm"
                class="w-full"
              >
                {{ t('fleetView.abortMission') }}
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    <!-- 提示对话框 -->
    <AlertDialog :open="alertDialogOpen" @update:open="alertDialogOpen = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ alertDialogTitle }}</AlertDialogTitle>
          <AlertDialogDescription class="whitespace-pre-line">
            {{ alertDialogMessage }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel v-if="alertDialogCallback">{{ t('common.cancel') }}</AlertDialogCancel>
          <AlertDialogAction @click="handleAlertConfirm">{{ t('common.confirm') }}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<script setup lang="ts">
  import { useGameStore } from '@/stores/gameStore'
  import { useUniverseStore } from '@/stores/universeStore'
  import { useNPCStore } from '@/stores/npcStore'
  import { useI18n } from '@/composables/useI18n'
  import { useGameConfig } from '@/composables/useGameConfig'
  import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { ShipType, MissionType, BuildingType } from '@/types/game'
  import type { Fleet, Resources } from '@/types/game'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
  import { Button } from '@/components/ui/button'
  import { Input } from '@/components/ui/input'
  import { Label } from '@/components/ui/label'
  import { Badge } from '@/components/ui/badge'
  import { Progress } from '@/components/ui/progress'
  import { Checkbox } from '@/components/ui/checkbox'
  import ResourceIcon from '@/components/ResourceIcon.vue'
  import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
  } from '@/components/ui/alert-dialog'
  import UnlockRequirement from '@/components/UnlockRequirement.vue'
  import { Sword, Package, Rocket as RocketIcon, Eye, Users, Recycle, Skull, Gift } from 'lucide-vue-next'
  import { formatNumber, formatTime } from '@/utils/format'
  import * as shipValidation from '@/logic/shipValidation'
  import * as fleetLogic from '@/logic/fleetLogic'
  import * as shipLogic from '@/logic/shipLogic'
  import * as officerLogic from '@/logic/officerLogic'
  import * as publicLogic from '@/logic/publicLogic'
  import * as diplomaticLogic from '@/logic/diplomaticLogic'

  const route = useRoute()
  const router = useRouter()
  const gameStore = useGameStore()
  const universeStore = useUniverseStore()
  const npcStore = useNPCStore()
  const { t } = useI18n()
  const { SHIPS } = useGameConfig()
  const planet = computed(() => gameStore.currentPlanet)

  // AlertDialog 状态
  const alertDialogOpen = ref(false)
  const alertDialogTitle = ref('')
  const alertDialogMessage = ref('')
  const alertDialogCallback = ref<(() => void) | null>(null)

  // 当前时间（响应式）
  const currentTime = ref(Date.now())
  let timeInterval: number | null = null

  // 计算最大舰队任务槽位
  const maxFleetMissions = computed(() => {
    const bonuses = officerLogic.calculateActiveBonuses(gameStore.player.officers, Date.now())
    return publicLogic.getMaxFleetMissions(bonuses.additionalFleetSlots)
  })

  const activeTab = ref<'fleet' | 'send' | 'missions'>('fleet')

  // 选择的舰队
  const selectedFleet = ref<Partial<Fleet>>({
    [ShipType.LightFighter]: 0,
    [ShipType.HeavyFighter]: 0,
    [ShipType.Cruiser]: 0,
    [ShipType.Battleship]: 0,
    [ShipType.SmallCargo]: 0,
    [ShipType.LargeCargo]: 0,
    [ShipType.ColonyShip]: 0,
    [ShipType.Recycler]: 0,
    [ShipType.EspionageProbe]: 0,
    [ShipType.DarkMatterHarvester]: 0,
    [ShipType.Deathstar]: 0
  })

  // 目标坐标
  const targetPosition = ref({ galaxy: 1, system: 1, position: 1 })

  // 选择的任务类型
  const selectedMission = ref<MissionType>(MissionType.Attack)

  // 运输资源
  const cargo = ref({ metal: 0, crystal: 0, deuterium: 0, darkMatter: 0, energy: 0 })

  // 从 URL query 参数初始化
  onMounted(() => {
    // 启动定时器更新当前时间
    timeInterval = window.setInterval(() => {
      currentTime.value = Date.now()
    }, 1000) // 每秒更新一次

    const { galaxy, system, position, mission, gift } = route.query

    // 如果有参数，填充数据
    if (galaxy || system || position) {
      // 设置目标坐标
      if (galaxy) targetPosition.value.galaxy = Number(galaxy)
      if (system) targetPosition.value.system = Number(system)
      if (position) targetPosition.value.position = Number(position)

      // 设置任务类型
      if (mission === 'spy') {
        selectedMission.value = MissionType.Spy
      } else if (mission === 'attack') {
        selectedMission.value = MissionType.Attack
      } else if (mission === 'colonize') {
        selectedMission.value = MissionType.Colonize
      } else if (gift === '1') {
        // 如果有gift参数，设置为运输任务并启用赠送模式
        selectedMission.value = MissionType.Transport
        isGiftMode.value = true
      }

      // 自动切换到派遣舰队标签
      activeTab.value = 'send'

      // 清除 URL 参数，保持 URL 整洁
      router.replace({ path: '/fleet' })
    }
  })

  // 清理定时器
  onUnmounted(() => {
    if (timeInterval) {
      clearInterval(timeInterval)
    }
  })

  // 检查目标是否为NPC星球
  const targetNpc = computed(() => {
    return npcStore.npcs.find(npc =>
      npc.planets.some(
        p =>
          p.position.galaxy === targetPosition.value.galaxy &&
          p.position.system === targetPosition.value.system &&
          p.position.position === targetPosition.value.position
      )
    )
  })

  // 是否为赠送模式
  const isGiftMode = ref(false)

  // 监听目标NPC变化，当目标不再是NPC时自动禁用赠送模式
  watch(targetNpc, newValue => {
    if (!newValue && isGiftMode.value) {
      isGiftMode.value = false
    }
  })

  // 计算赠送的预估好感度增加值
  const calculateGiftReputation = (): number => {
    return diplomaticLogic.calculateGiftReputationGain(cargo.value)
  }

  // 可用任务类型
  const availableMissions = computed(() => [
    { type: MissionType.Attack, name: t('fleetView.attackMission'), icon: Sword },
    { type: MissionType.Transport, name: t('fleetView.transport'), icon: Package },
    { type: MissionType.Colonize, name: t('fleetView.colonize'), icon: RocketIcon },
    { type: MissionType.Spy, name: t('fleetView.spy'), icon: Eye },
    { type: MissionType.Deploy, name: t('fleetView.deploy'), icon: Users },
    { type: MissionType.Recycle, name: t('fleetView.recycle'), icon: Recycle },
    { type: MissionType.Destroy, name: t('fleetView.destroy'), icon: Skull }
  ])

  // 获取任务名称
  const getMissionName = (type: MissionType): string => {
    const mission = availableMissions.value.find(m => m.type === type)
    return mission?.name || type
  }

  // 获取星球名称
  const getPlanetName = (planetId: string): string => {
    const p = gameStore.player.planets.find(p => p.id === planetId)
    return p?.name || t('fleetView.unknownPlanet')
  }

  // 计算总载货量
  const getTotalCargoCapacity = (): number => {
    let total = 0
    for (const [shipType, count] of Object.entries(selectedFleet.value)) {
      if (count > 0) {
        const config = SHIPS.value[shipType as ShipType]
        total += config.cargoCapacity * count
      }
    }
    return total
  }

  // 计算总货物
  const getTotalCargo = (): number => {
    return cargo.value.metal + cargo.value.crystal + cargo.value.deuterium + cargo.value.darkMatter
  }

  // 计算燃料消耗（包含货物重量影响）
  const getFuelConsumption = (): number => {
    const bonuses = officerLogic.calculateActiveBonuses(gameStore.player.officers, Date.now())
    return shipLogic.calculateFleetFuelConsumption(selectedFleet.value, bonuses.fuelConsumptionReduction, cargo.value)
  }

  // 计算飞行时间
  const getFlightTime = (): number => {
    if (!planet.value) return 0
    const distance = fleetLogic.calculateDistance(planet.value.position, targetPosition.value)
    const bonuses = officerLogic.calculateActiveBonuses(gameStore.player.officers, Date.now())
    const minSpeed = shipLogic.calculateFleetMinSpeed(selectedFleet.value, bonuses.fleetSpeedBonus)
    return fleetLogic.calculateFlightTime(distance, minSpeed)
  }

  // 检查是否可以派遣
  const canSendFleet = (): { valid: boolean; errorKey?: string } => {
    // 检查是否选择了舰船
    const hasShips = Object.values(selectedFleet.value).some(count => count > 0)
    if (!hasShips) return { valid: false, errorKey: 'fleetView.noShipsSelected' }

    // 检查是否派遣到自己的星球
    // 回收任务和部署任务除外（回收残骸可能在同位置，部署可能到自己的月球）
    if (planet.value && selectedMission.value !== MissionType.Recycle && selectedMission.value !== MissionType.Deploy) {
      const isSamePlanet =
        targetPosition.value.galaxy === planet.value.position.galaxy &&
        targetPosition.value.system === planet.value.position.system &&
        targetPosition.value.position === planet.value.position.position
      if (isSamePlanet) {
        return { valid: false, errorKey: 'fleetView.cannotSendToOwnPlanet' }
      }
    }

    // 检查载货量
    if (selectedMission.value === MissionType.Transport) {
      if (getTotalCargo() > getTotalCargoCapacity()) {
        return { valid: false, errorKey: 'fleetView.cargoExceedsCapacity' }
      }
    }

    // 检查殖民船
    if (selectedMission.value === MissionType.Colonize) {
      if (!selectedFleet.value[ShipType.ColonyShip] || (selectedFleet.value[ShipType.ColonyShip] ?? 0) < 1) {
        return { valid: false, errorKey: 'fleetView.noColonyShip' }
      }
    }

    // 检查回收任务是否有残骸
    if (selectedMission.value === MissionType.Recycle) {
      const debrisId = `debris_${targetPosition.value.galaxy}_${targetPosition.value.system}_${targetPosition.value.position}`
      const debrisField = universeStore.debrisFields[debrisId]
      if (!debrisField || (debrisField.resources.metal === 0 && debrisField.resources.crystal === 0)) {
        return { valid: false, errorKey: 'fleetView.noDebrisAtTarget' }
      }
    }

    // 检查毁灭任务是否有死星
    if (selectedMission.value === MissionType.Destroy) {
      if (!selectedFleet.value[ShipType.Deathstar] || (selectedFleet.value[ShipType.Deathstar] ?? 0) < 1) {
        return { valid: false, errorKey: 'fleetView.noDeathstar' }
      }
    }

    return { valid: true }
  }

  const sendFleet = (
    targetPosition: { galaxy: number; system: number; position: number },
    missionType: MissionType,
    fleet: Partial<Fleet>,
    cargo: Resources = { metal: 0, crystal: 0, deuterium: 0, darkMatter: 0, energy: 0 }
  ): boolean => {
    if (!gameStore.currentPlanet) return false
    const currentMissions = gameStore.player.fleetMissions.length
    const validation = shipValidation.validateFleetDispatch(
      gameStore.currentPlanet,
      fleet,
      cargo,
      gameStore.player.officers,
      currentMissions
    )
    if (!validation.valid) return false
    const shouldDeductCargo = missionType === MissionType.Transport
    shipValidation.executeFleetDispatch(gameStore.currentPlanet, fleet, validation.fuelNeeded!, shouldDeductCargo, cargo)
    const distance = fleetLogic.calculateDistance(gameStore.currentPlanet.position, targetPosition)
    const bonuses = officerLogic.calculateActiveBonuses(gameStore.player.officers, Date.now())
    const minSpeed = shipLogic.calculateFleetMinSpeed(fleet, bonuses.fleetSpeedBonus)
    const flightTime = fleetLogic.calculateFlightTime(distance, minSpeed)
    const mission = fleetLogic.createFleetMission(
      gameStore.player.id,
      gameStore.currentPlanet.id,
      targetPosition,
      missionType,
      fleet,
      cargo,
      flightTime
    )

    // 如果是赠送模式，标记任务
    if (missionType === MissionType.Transport && isGiftMode.value && targetNpc.value) {
      mission.isGift = true
      mission.giftTargetNpcId = targetNpc.value.id
    }

    gameStore.player.fleetMissions.push(mission)
    return true
  }

  // 派遣舰队
  const handleSendFleet = () => {
    if (!planet.value) return

    // 验证是否可以派遣
    const validation = canSendFleet()
    if (!validation.valid) {
      alertDialogTitle.value = t('fleetView.sendFailed')
      alertDialogMessage.value = validation.errorKey ? t(validation.errorKey) : t('fleetView.sendFailedMessage')
      alertDialogOpen.value = true
      return
    }

    // 过滤出实际选择的舰船
    const fleet: Partial<Fleet> = {}
    for (const [shipType, count] of Object.entries(selectedFleet.value)) {
      if (count > 0) {
        fleet[shipType as ShipType] = count
      }
    }

    const success = sendFleet(
      targetPosition.value,
      selectedMission.value,
      fleet,
      selectedMission.value === MissionType.Transport ? cargo.value : undefined
    )

    if (success) {
      // 重置选择
      Object.keys(selectedFleet.value).forEach(key => {
        selectedFleet.value[key as ShipType] = 0
      })
      cargo.value = { metal: 0, crystal: 0, deuterium: 0, darkMatter: 0, energy: 0 }
      isGiftMode.value = false
      activeTab.value = 'missions'
    } else {
      alertDialogTitle.value = t('fleetView.sendFailed')
      alertDialogMessage.value = t('fleetView.sendFailedMessage')
      alertDialogOpen.value = true
    }
  }

  const recallFleet = (missionId: string): boolean => {
    const mission = gameStore.player.fleetMissions.find(m => m.id === missionId)
    if (!mission) return false
    return fleetLogic.recallFleetMission(mission, Date.now())
  }

  // 召回舰队
  const handleRecallFleet = (missionId: string) => {
    const success = recallFleet(missionId)
    if (!success) {
      alertDialogTitle.value = t('fleetView.recallFailed')
      alertDialogMessage.value = t('fleetView.recallFailedMessage')
      alertDialogCallback.value = null
      alertDialogOpen.value = true
    }
  }

  // 处理终止任务（返航中）
  const handleAbortMission = (missionId: string) => {
    const mission = gameStore.player.fleetMissions.find(m => m.id === missionId)
    if (!mission) return

    // 计算损失资源总量
    const totalResources = mission.cargo.metal + mission.cargo.crystal + mission.cargo.deuterium + mission.cargo.darkMatter

    // 计算舰队总数
    const totalShips = Object.values(mission.fleet).reduce((sum, count) => sum + count, 0)

    alertDialogTitle.value = t('fleetView.abortMissionTitle')
    alertDialogMessage.value = t('fleetView.abortMissionWarning', {
      ships: totalShips.toString(),
      resources: formatNumber(totalResources)
    })
    alertDialogCallback.value = () => {
      abortMission(missionId)
    }
    alertDialogOpen.value = true
  }

  // 终止任务（不返还任何东西）
  const abortMission = (missionId: string) => {
    const missionIndex = gameStore.player.fleetMissions.findIndex(m => m.id === missionId)
    if (missionIndex > -1) {
      gameStore.player.fleetMissions.splice(missionIndex, 1)
      alertDialogTitle.value = t('fleetView.abortMissionSuccess')
      alertDialogMessage.value = t('fleetView.abortMissionSuccessMessage')
      alertDialogCallback.value = null
      alertDialogOpen.value = true
    }
  }

  // 处理 AlertDialog 确认
  const handleAlertConfirm = () => {
    if (alertDialogCallback.value) {
      alertDialogCallback.value()
      alertDialogCallback.value = null
    }
    alertDialogOpen.value = false
  }

  // 获取任务剩余时间
  const getRemainingTime = (mission: any): number => {
    const now = currentTime.value
    const targetTime = mission.status === 'outbound' ? mission.arrivalTime : mission.returnTime
    return Math.max(0, (targetTime - now) / 1000)
  }

  // 获取任务进度
  const getMissionProgress = (mission: any): number => {
    const now = currentTime.value
    if (mission.status === 'outbound') {
      const total = mission.arrivalTime - mission.departureTime
      const elapsed = now - mission.departureTime
      return Math.max(0, Math.min(100, (elapsed / total) * 100))
    } else {
      const departTime = mission.arrivalTime
      const total = mission.returnTime - departTime
      const elapsed = now - departTime
      return Math.max(0, Math.min(100, (elapsed / total) * 100))
    }
  }
</script>
