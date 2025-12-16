<template>
  <!-- 无权限时显示404 -->
  <div v-if="!gameStore.player.isGMEnabled" class="container mx-auto p-4 sm:p-6 flex items-center justify-center min-h-[60vh]">
    <Empty class="border-0">
      <EmptyMedia>
        <div class="text-8xl sm:text-9xl font-bold text-muted-foreground/20">404</div>
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>{{ t('notFound.title') }}</EmptyTitle>
        <EmptyDescription>{{ t('notFound.description') }}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button @click="goHome" size="lg">
          <Home class="mr-2 h-4 w-4" />
          {{ t('notFound.goHome') }}
        </Button>
      </EmptyContent>
    </Empty>
  </div>

  <!-- 有权限时显示GM页面 -->
  <div v-else class="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl sm:text-3xl font-bold">{{ t('gmView.title') }}</h1>
      <Badge variant="destructive">{{ t('gmView.adminOnly') }}</Badge>
    </div>

    <!-- 星球选择 -->
    <Card>
      <CardHeader>
        <CardTitle>{{ t('gmView.selectPlanet') }}</CardTitle>
      </CardHeader>
      <CardContent>
        <Select v-model="selectedPlanetId">
          <SelectTrigger class="w-full">
            <SelectValue :placeholder="t('gmView.choosePlanet')" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="planet in gameStore.player.planets" :key="planet.id" :value="planet.id">
              {{ planet.name }} ({{ planet.position.galaxy }}:{{ planet.position.system }}:{{ planet.position.position }})
            </SelectItem>
          </SelectContent>
        </Select>
      </CardContent>
    </Card>

    <!-- 标签切换 -->
    <Tabs v-if="selectedPlanet" default-value="resources" class="w-full">
      <TabsList class="grid w-full" :style="{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }">
        <TabsTrigger v-for="tab in tabs" :key="tab.value" :value="tab.value">
          {{ t(tab.label) }}
        </TabsTrigger>
      </TabsList>

      <!-- 资源 -->
      <TabsContent value="resources" class="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{{ t('gmView.modifyResources') }}</CardTitle>
            <CardDescription>{{ t('gmView.resourcesDesc') }}</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <!-- 一键拉满按钮 -->
            <Button @click="maxAllResources" variant="outline" class="w-full">
              {{ t('gmView.maxAllResources') }}
            </Button>

            <div v-for="resource in resourceTypes" :key="resource" class="space-y-2">
              <Label>{{ t(`resources.${resource}`) }}</Label>
              <div class="flex gap-2">
                <Input v-model.number="selectedPlanet.resources[resource]" type="number" min="0" class="flex-1" />
                <Button @click="setResourceAmount(resource, 1000000)" variant="outline" size="sm">+1M</Button>
                <Button @click="setResourceAmount(resource, 10000000)" variant="outline" size="sm">+10M</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- 建筑 -->
      <TabsContent value="buildings" class="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{{ t('gmView.modifyBuildings') }}</CardTitle>
            <CardDescription>{{ t('gmView.buildingsDesc') }}</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div v-for="building in buildingTypes" :key="building" class="space-y-2">
                <Label>{{ BUILDINGS[building].name }}</Label>
                <div class="flex gap-2">
                  <Input v-model.number="selectedPlanet.buildings[building]" type="number" min="0" max="100" class="flex-1" />
                  <Button @click="setBuildingLevel(building, 10)" variant="outline" size="sm">Lv 10</Button>
                  <Button @click="setBuildingLevel(building, 30)" variant="outline" size="sm">Lv 30</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- 科技 -->
      <TabsContent value="research" class="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{{ t('gmView.modifyResearch') }}</CardTitle>
            <CardDescription>{{ t('gmView.researchDesc') }}</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div v-for="tech in technologyTypes" :key="tech" class="space-y-2">
                <Label>{{ TECHNOLOGIES[tech].name }}</Label>
                <div class="flex gap-2">
                  <Input v-model.number="gameStore.player.technologies[tech]" type="number" min="0" max="50" class="flex-1" />
                  <Button @click="setTechnologyLevel(tech, 10)" variant="outline" size="sm">Lv 10</Button>
                  <Button @click="setTechnologyLevel(tech, 20)" variant="outline" size="sm">Lv 20</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- 舰船 -->
      <TabsContent value="ships" class="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{{ t('gmView.modifyShips') }}</CardTitle>
            <CardDescription>{{ t('gmView.shipsDesc') }}</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div v-for="ship in shipTypes" :key="ship" class="space-y-2">
                <Label>{{ SHIPS[ship].name }}</Label>
                <div class="flex gap-2">
                  <Input v-model.number="selectedPlanet.fleet[ship]" type="number" min="0" class="flex-1" />
                  <Button @click="setShipCount(ship, 100)" variant="outline" size="sm">+100</Button>
                  <Button @click="setShipCount(ship, 1000)" variant="outline" size="sm">+1K</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- 防御 -->
      <TabsContent value="defense" class="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{{ t('gmView.modifyDefense') }}</CardTitle>
            <CardDescription>{{ t('gmView.defenseDesc') }}</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div v-for="defense in defenseTypes" :key="defense" class="space-y-2">
                <Label>{{ DEFENSES[defense].name }}</Label>
                <div class="flex gap-2">
                  <Input v-model.number="selectedPlanet.defense[defense]" type="number" min="0" class="flex-1" />
                  <Button @click="setDefenseCount(defense, 100)" variant="outline" size="sm">+100</Button>
                  <Button @click="setDefenseCount(defense, 1000)" variant="outline" size="sm">+1K</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- 军官 -->
      <TabsContent value="officers" class="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{{ t('gmView.modifyOfficers') }}</CardTitle>
            <CardDescription>{{ t('gmView.officersDesc') }}</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div v-for="officer in officerTypes" :key="officer" class="space-y-2">
                <Label>{{ OFFICERS[officer].name }}</Label>
                <div class="flex gap-2">
                  <Input v-model.number="officerDays[officer]" type="number" min="0" :placeholder="t('gmView.days')" class="flex-1" />
                  <Button @click="setOfficerDays(officer, 7)" variant="outline" size="sm">7{{ t('gmView.days') }}</Button>
                  <Button @click="setOfficerDays(officer, 30)" variant="outline" size="sm">30{{ t('gmView.days') }}</Button>
                  <Button @click="setOfficerDays(officer, 365)" variant="outline" size="sm">365{{ t('gmView.days') }}</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    <!-- NPC测试 -->
    <Card class="border-primary">
      <CardHeader>
        <CardTitle>{{ t('gmView.npcTesting') || 'NPC Testing' }}</CardTitle>
        <CardDescription>{{ t('gmView.npcTestingDesc') || 'Test NPC spy and attack behavior' }}</CardDescription>
      </CardHeader>
      <CardContent class="space-y-3">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="space-y-2">
            <Label>{{ t('gmView.selectNPC') || 'Select NPC' }}</Label>
            <Select v-model="selectedNPCId">
              <SelectTrigger class="w-full">
                <SelectValue :placeholder="t('gmView.chooseNPC') || 'Choose NPC'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="npc in npcStore.npcs" :key="npc.id" :value="npc.id">{{ npc.name }} ({{ npc.difficulty }})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label>{{ t('gmView.targetPlanet') || 'Target Planet' }}</Label>
            <Select v-model="targetPlanetIndex">
              <SelectTrigger class="w-full">
                <SelectValue :placeholder="t('gmView.chooseTarget') || 'Choose Target Planet'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="(planet, index) in gameStore.player.planets" :key="planet.id" :value="index.toString()">
                  {{ planet.name }} ({{ planet.position.galaxy }}:{{ planet.position.system }}:{{ planet.position.position }})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <Button @click="testNPCSpy" variant="outline" class="w-full" :disabled="!selectedNPC">
            {{ t('gmView.testSpy') || 'Test Spy' }}
          </Button>
          <Button @click="testNPCAttack" variant="outline" class="w-full" :disabled="!selectedNPC">
            {{ t('gmView.testAttack') || 'Test Attack' }}
          </Button>
        </div>

        <Button @click="testNPCSpyAndAttack" variant="default" class="w-full" :disabled="!selectedNPC">
          {{ t('gmView.testSpyAndAttack') || 'Test Spy & Attack' }}
        </Button>

        <Button @click="initializeNPCFleet" variant="secondary" class="w-full" :disabled="!selectedNPC">
          {{ t('gmView.initializeFleet') || 'Initialize NPC Fleet' }}
        </Button>

        <Button @click="accelerateAllMissions" variant="secondary" class="w-full" :disabled="!selectedNPC">
          {{ t('gmView.accelerateMissions') || 'Accelerate All Missions (5s)' }}
        </Button>
      </CardContent>
    </Card>

    <!-- 队列管理 -->
    <Card class="border-primary">
      <CardHeader>
        <CardTitle>{{ t('gmView.completeAllQueues') }}</CardTitle>
        <CardDescription>{{ t('gmView.completeAllQueuesDesc') }}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button @click="completeAllQueues" variant="default" class="w-full">{{ t('gmView.completeQueues') }}</Button>
      </CardContent>
    </Card>

    <!-- 危险操作 -->
    <Card class="border-destructive">
      <CardHeader>
        <CardTitle class="text-destructive">{{ t('gmView.dangerZone') }}</CardTitle>
        <CardDescription>{{ t('gmView.dangerZoneDesc') }}</CardDescription>
      </CardHeader>
      <CardContent class="space-y-2">
        <Button @click="showResetConfirmDialog" variant="destructive" class="w-full">{{ t('gmView.resetGame') }}</Button>
      </CardContent>
    </Card>

    <!-- Reset Game 确认对话框 -->
    <AlertDialog :open="resetDialogOpen" @update:open="handleResetDialogClose">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ t('gmView.resetGame') }}</AlertDialogTitle>
          <AlertDialogDescription>
            {{ t('gmView.resetGameConfirm') }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="handleResetCancel">{{ t('common.cancel') }}</AlertDialogCancel>
          <AlertDialogAction @click="confirmResetGame">{{ t('common.confirm') }}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- AlertDialog 提示对话框 -->
    <AlertDialog :open="alertDialogOpen" @update:open="alertDialogOpen = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ alertDialogTitle }}</AlertDialogTitle>
          <AlertDialogDescription v-if="alertDialogMessage" class="whitespace-pre-line">
            {{ alertDialogMessage }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction @click="handleAlertConfirm">{{ t('common.confirm') }}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { toast } from 'vue-sonner'
  import { useGameStore } from '@/stores/gameStore'
  import { useNPCStore } from '@/stores/npcStore'
  import { useUniverseStore } from '@/stores/universeStore'
  import { useI18n } from '@/composables/useI18n'
  import { useGameConfig } from '@/composables/useGameConfig'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
  import { Button } from '@/components/ui/button'
  import { Input } from '@/components/ui/input'
  import { Label } from '@/components/ui/label'
  import { Badge } from '@/components/ui/badge'
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
  import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
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
  import { BuildingType, TechnologyType, ShipType, DefenseType, OfficerType } from '@/types/game'
  import * as npcBehaviorLogic from '@/logic/npcBehaviorLogic'
  import { Home } from 'lucide-vue-next'

  const router = useRouter()
  const gameStore = useGameStore()
  const npcStore = useNPCStore()
  const universeStore = useUniverseStore()
  const { t } = useI18n()
  const { BUILDINGS, TECHNOLOGIES, SHIPS, DEFENSES, OFFICERS } = useGameConfig()

  const goHome = () => {
    router.push('/')
  }

  const selectedPlanetId = ref<string>(gameStore.player.planets[0]?.id || '')
  const officerDays = ref<Record<OfficerType, number>>({} as Record<OfficerType, number>)
  const selectedNPCId = ref<string>(npcStore.npcs[0]?.id || '')
  const targetPlanetIndex = ref<string>('0')

  // AlertDialog 状态
  const alertDialogOpen = ref(false)
  const alertDialogTitle = ref('')
  const alertDialogMessage = ref('')
  const alertDialogCallback = ref<(() => void) | null>(null)

  // Reset Dialog 状态
  const resetDialogOpen = ref(false)

  // 初始化军官天数显示
  Object.values(OfficerType).forEach(officer => {
    const officerData = gameStore.player.officers[officer]
    if (officerData && officerData.expiresAt) {
      const daysLeft = Math.ceil((officerData.expiresAt - Date.now()) / (1000 * 60 * 60 * 24))
      officerDays.value[officer] = Math.max(0, daysLeft)
    } else {
      officerDays.value[officer] = 0
    }
  })

  const selectedPlanet = computed(() => {
    return gameStore.player.planets.find(p => p.id === selectedPlanetId.value)
  })

  const selectedNPC = computed(() => {
    return npcStore.npcs.find(npc => npc.id === selectedNPCId.value)
  })

  const allPlanets = computed(() => {
    return [...gameStore.player.planets, ...Object.values(universeStore.planets)]
  })

  const resourceTypes = ['metal', 'crystal', 'deuterium', 'darkMatter'] as const
  const buildingTypes = Object.values(BuildingType)
  const technologyTypes = Object.values(TechnologyType)
  const shipTypes = Object.values(ShipType)
  const defenseTypes = Object.values(DefenseType)
  const officerTypes = Object.values(OfficerType)

  // Tab配置
  const tabs = [
    { value: 'resources' as const, label: 'gmView.resources' },
    { value: 'buildings' as const, label: 'gmView.buildings' },
    { value: 'research' as const, label: 'gmView.research' },
    { value: 'ships' as const, label: 'gmView.ships' },
    { value: 'defense' as const, label: 'gmView.defense' },
    { value: 'officers' as const, label: 'gmView.officers' }
  ]

  const setResourceAmount = (resource: string, amount: number) => {
    if (selectedPlanet.value) {
      selectedPlanet.value.resources[resource as keyof typeof selectedPlanet.value.resources] += amount
    }
  }

  const setBuildingLevel = (building: BuildingType, level: number) => {
    if (selectedPlanet.value) {
      selectedPlanet.value.buildings[building] = level
    }
  }

  const setTechnologyLevel = (tech: TechnologyType, level: number) => {
    gameStore.player.technologies[tech] = level
  }

  const setShipCount = (ship: ShipType, count: number) => {
    if (selectedPlanet.value) {
      selectedPlanet.value.fleet[ship] = (selectedPlanet.value.fleet[ship] || 0) + count
    }
  }

  const setDefenseCount = (defense: DefenseType, count: number) => {
    if (selectedPlanet.value) {
      selectedPlanet.value.defense[defense] = (selectedPlanet.value.defense[defense] || 0) + count
    }
  }

  const setOfficerDays = (officer: OfficerType, days: number) => {
    officerDays.value[officer] = days
    const now = Date.now()
    const expiresAt = now + days * 24 * 60 * 60 * 1000

    if (!gameStore.player.officers[officer]) {
      gameStore.player.officers[officer] = {
        type: officer,
        active: true,
        hiredAt: now,
        expiresAt: expiresAt
      }
    } else {
      gameStore.player.officers[officer].expiresAt = expiresAt
      gameStore.player.officers[officer].active = true
      if (!gameStore.player.officers[officer].hiredAt) {
        gameStore.player.officers[officer].hiredAt = now
      }
    }
  }

  // 显示重置游戏确认对话框
  const showResetConfirmDialog = () => {
    // 暂停游戏
    gameStore.isPaused = true
    resetDialogOpen.value = true
  }

  // 处理重置对话框关闭
  const handleResetDialogClose = (open: boolean) => {
    if (!open) {
      // 如果对话框关闭，恢复游戏
      gameStore.isPaused = false
    }
    resetDialogOpen.value = open
  }

  // 取消重置
  const handleResetCancel = () => {
    resetDialogOpen.value = false
    gameStore.isPaused = false
  }

  // 确认重置游戏
  const confirmResetGame = () => {
    gameStore.isPaused = true
    resetDialogOpen.value = false
    try {
      gameStore.player.isGMEnabled = false
      localStorage.clear()
      location.reload()
    } catch (error) {
      console.error('Failed to reset game:', error)
      window.location.reload()
    }
  }

  // 显示AlertDialog的辅助函数
  const showAlert = (title: string, message: string, callback?: () => void) => {
    alertDialogTitle.value = title
    alertDialogMessage.value = message
    alertDialogCallback.value = callback || null
    alertDialogOpen.value = true
  }

  // AlertDialog确认处理
  const handleAlertConfirm = () => {
    alertDialogOpen.value = false
    if (alertDialogCallback.value) {
      alertDialogCallback.value()
      alertDialogCallback.value = null
    }
  }

  // NPC测试函数
  const testNPCSpy = () => {
    if (!selectedNPC.value) {
      showAlert(t('gmView.selectNPCFirst') || 'Please select an NPC first', '')
      return
    }

    const mission = npcBehaviorLogic.forceNPCSpyPlayer(
      selectedNPC.value,
      gameStore.player,
      allPlanets.value,
      parseInt(targetPlanetIndex.value)
    )

    if (mission) {
      showAlert(t('gmView.npcWillSpyIn5s', { npcName: selectedNPC.value.name }), t('gmView.testSpyMessage'), () => {
        // 加速任务到5秒后到达（在确认后执行，这样时间更准确）
        npcBehaviorLogic.accelerateNPCMission(selectedNPC.value!, mission.id, 5, gameStore.player)
      })
    } else {
      showAlert(t('gmView.npcNoProbes') || 'NPC does not have spy probes', '')
    }
  }

  const testNPCAttack = () => {
    if (!selectedNPC.value) {
      showAlert(t('gmView.selectNPCFirst') || 'Please select an NPC first', '')
      return
    }

    const mission = npcBehaviorLogic.forceNPCAttackPlayer(
      selectedNPC.value,
      gameStore.player,
      allPlanets.value,
      parseInt(targetPlanetIndex.value)
    )

    if (mission) {
      showAlert(t('gmView.npcWillAttackIn5s', { npcName: selectedNPC.value.name }), t('gmView.testAttackMessage'), () => {
        // 加速任务到5秒后到达（在确认后执行，这样时间更准确）
        npcBehaviorLogic.accelerateNPCMission(selectedNPC.value!, mission.id, 5, gameStore.player)
      })
    } else {
      showAlert(t('gmView.npcNoSpyReport') || 'NPC needs to spy first', '')
    }
  }

  const testNPCSpyAndAttack = () => {
    if (!selectedNPC.value) {
      showAlert(t('gmView.selectNPCFirst') || 'Please select an NPC first', '')
      return
    }

    const { spyMission, attackMission } = npcBehaviorLogic.forceNPCSpyAndAttack(
      selectedNPC.value,
      gameStore.player,
      allPlanets.value,
      parseInt(targetPlanetIndex.value)
    )

    if (spyMission && attackMission) {
      showAlert(t('gmView.npcWillSpyAndAttack', { npcName: selectedNPC.value.name }), t('gmView.testSpyAndAttackMessage'), () => {
        // 加速任务：侦查5秒后到达，攻击10秒后到达（在确认后执行，这样时间更准确）
        npcBehaviorLogic.accelerateNPCMission(selectedNPC.value!, spyMission.id, 5, gameStore.player)
        npcBehaviorLogic.accelerateNPCMission(selectedNPC.value!, attackMission.id, 10, gameStore.player)
      })
    } else {
      showAlert(t('gmView.npcMissionFailed') || 'Failed to create missions', '')
    }
  }

  const accelerateAllMissions = () => {
    if (!selectedNPC.value) {
      showAlert(t('gmView.selectNPCFirst') || 'Please select an NPC first', '')
      return
    }

    const count = npcBehaviorLogic.accelerateAllNPCMissions(selectedNPC.value, 5, gameStore.player)
    showAlert(t('gmView.acceleratedMissions', { count }), '')
  }

  // 初始化NPC舰队
  const initializeNPCFleet = () => {
    if (!selectedNPC.value) {
      showAlert(t('gmView.selectNPCFirst') || 'Please select an NPC first', '')
      return
    }

    // 给NPC的第一个星球添加基础舰队
    const npcPlanet = selectedNPC.value.planets[0]
    if (!npcPlanet) {
      showAlert(t('gmView.npcNoPlanets'), '')
      return
    }

    // 添加间谍探测器
    npcPlanet.fleet[ShipType.EspionageProbe] = (npcPlanet.fleet[ShipType.EspionageProbe] || 0) + 100

    // 添加战斗舰船
    npcPlanet.fleet[ShipType.LightFighter] = (npcPlanet.fleet[ShipType.LightFighter] || 0) + 500
    npcPlanet.fleet[ShipType.HeavyFighter] = (npcPlanet.fleet[ShipType.HeavyFighter] || 0) + 300
    npcPlanet.fleet[ShipType.Cruiser] = (npcPlanet.fleet[ShipType.Cruiser] || 0) + 200
    npcPlanet.fleet[ShipType.Battleship] = (npcPlanet.fleet[ShipType.Battleship] || 0) + 100
    npcPlanet.fleet[ShipType.Bomber] = (npcPlanet.fleet[ShipType.Bomber] || 0) + 50
    npcPlanet.fleet[ShipType.Destroyer] = (npcPlanet.fleet[ShipType.Destroyer] || 0) + 30
    npcPlanet.fleet[ShipType.Battlecruiser] = (npcPlanet.fleet[ShipType.Battlecruiser] || 0) + 20

    showAlert(t('gmView.npcFleetInitialized', { npcName: selectedNPC.value.name }), t('gmView.npcFleetDetails'))
  }

  // 一键拉满所有资源
  const maxAllResources = () => {
    if (!selectedPlanet.value) return

    const maxAmount = 1000000000 // 10亿
    selectedPlanet.value.resources.metal = maxAmount
    selectedPlanet.value.resources.crystal = maxAmount
    selectedPlanet.value.resources.deuterium = maxAmount
    selectedPlanet.value.resources.darkMatter = maxAmount

    toast.success(t('gmView.maxAllResourcesSuccess'))
  }

  // 一键完成所有队列和任务
  const completeAllQueues = () => {
    const now = Date.now()
    let buildingCount = 0
    let researchCount = 0
    let missionCount = 0
    let missileCount = 0

    // 完成所有星球的建筑队列
    gameStore.player.planets.forEach(planet => {
      planet.buildQueue.forEach(item => {
        if (item.endTime > now) {
          // 根据队列类型完成建筑/拆除/舰船/防御
          if (item.type === 'building') {
            planet.buildings[item.itemType as BuildingType] = item.targetLevel || 0
          } else if (item.type === 'demolish') {
            planet.buildings[item.itemType as BuildingType] = item.targetLevel || 0
          } else if (item.type === 'ship') {
            planet.fleet[item.itemType as ShipType] = (planet.fleet[item.itemType as ShipType] || 0) + (item.quantity || 0)
          } else if (item.type === 'defense') {
            planet.defense[item.itemType as DefenseType] = (planet.defense[item.itemType as DefenseType] || 0) + (item.quantity || 0)
          }
          buildingCount++
        }
      })
      planet.buildQueue = []
    })

    // 完成科技队列
    gameStore.player.researchQueue.forEach(item => {
      if (item.endTime > now && item.type === 'technology') {
        gameStore.player.technologies[item.itemType as TechnologyType] = item.targetLevel || 0
        researchCount++
      }
    })
    gameStore.player.researchQueue = []

    // 完成所有飞行任务（设置到达时间为现在，让游戏逻辑自动处理）
    gameStore.player.fleetMissions.forEach(mission => {
      if (mission.status === 'outbound') {
        // 计算原始飞行时间
        const originalFlightTime = mission.arrivalTime - mission.departureTime
        // 将到达时间设置为现在减1毫秒，确保游戏逻辑能立即检测到
        mission.arrivalTime = now - 1
        // 同时更新返回时间为：现在 + 原始飞行时间 - 1毫秒
        mission.returnTime = now + originalFlightTime - 1
        missionCount++
      } else if (mission.status === 'returning') {
        // 返航中的任务设置返回时间为现在减1毫秒，确保游戏逻辑能立即检测到
        if (mission.returnTime) {
          mission.returnTime = now - 1
        }
        missionCount++
      } else if (mission.status === 'arrived') {
        // 修复卡在 arrived 状态的任务
        // 将状态改为 returning 并设置返回时间为现在
        mission.status = 'returning'
        mission.returnTime = now - 1
        missionCount++
      }
    })

    // 完成所有NPC任务
    npcStore.npcs.forEach(npc => {
      if (npc.fleetMissions) {
        npc.fleetMissions.forEach(mission => {
          if (mission.status === 'outbound') {
            const originalFlightTime = mission.arrivalTime - mission.departureTime
            mission.arrivalTime = now - 1
            mission.returnTime = now + originalFlightTime - 1
          } else if (mission.status === 'returning' && mission.returnTime) {
            mission.returnTime = now - 1
          }
        })
      }
    })

    // 完成所有导弹攻击（设置到达时间为现在，让游戏逻辑自动处理）
    gameStore.player.missileAttacks.forEach(attack => {
      if (attack.status === 'flying') {
        attack.arrivalTime = now - 1
        missileCount++
      }
    })

    toast.success(
      t('gmView.completeQueuesSuccess', {
        buildingCount,
        researchCount,
        missionCount,
        missileCount
      })
    )
  }
</script>
