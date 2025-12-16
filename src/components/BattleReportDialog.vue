<template>
  <Dialog v-model:open="isOpen">
    <ScrollableDialogContent container-class="sm:max-w-4xl max-h-[90vh]">
      <template #header>
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <Trophy class="h-5 w-5" />
            {{ t('messagesView.battleReport') }}
          </DialogTitle>
          <DialogDescription v-if="report">
            {{ formatDate(report.timestamp) }}
          </DialogDescription>
        </DialogHeader>
      </template>

      <div v-if="report" class="space-y-4">
        <!-- 战斗双方信息 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <!-- 攻击方星球 -->
          <div class="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <p class="font-medium text-blue-600 dark:text-blue-400 mb-1">{{ t('simulatorView.attacker') }}</p>
            <p v-if="attackerPlanet" class="text-xs text-muted-foreground">
              {{ attackerPlanet.name }} [{{ attackerPlanet.position.galaxy }}:{{ attackerPlanet.position.system }}:{{
                attackerPlanet.position.position
              }}]
            </p>
            <p v-else class="text-xs text-muted-foreground">{{ report.attackerPlanetId }}</p>
          </div>

          <!-- 防守方星球 -->
          <div class="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
            <p class="font-medium text-red-600 dark:text-red-400 mb-1">{{ t('simulatorView.defender') }}</p>
            <p v-if="defenderPlanet" class="text-xs text-muted-foreground">
              {{ defenderPlanet.name }} [{{ defenderPlanet.position.galaxy }}:{{ defenderPlanet.position.system }}:{{
                defenderPlanet.position.position
              }}]
            </p>
            <p v-else class="text-xs text-muted-foreground">{{ report.defenderPlanetId }}</p>
          </div>
        </div>

        <!-- 胜利者 -->
        <div class="text-center p-4 rounded-lg" :class="getWinnerStyle(report.winner)">
          <p class="text-lg font-bold">
            {{
              report.winner === 'attacker'
                ? t('messagesView.victory')
                : report.winner === 'defender'
                ? t('messagesView.defeat')
                : t('messagesView.draw')
            }}
          </p>
          <p v-if="report.rounds" class="text-sm mt-1">{{ t('simulatorView.afterRounds').replace('{rounds}', String(report.rounds)) }}</p>
        </div>

        <!-- 损失对比 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- 攻击方损失 -->
          <div class="space-y-2">
            <p class="text-sm font-medium text-red-600 dark:text-red-400">{{ t('messagesView.attackerLosses') }}</p>
            <div class="p-3 bg-muted rounded-lg space-y-1 text-xs">
              <div v-for="(count, shipType) in report.attackerLosses" :key="shipType">
                <span class="text-muted-foreground">{{ SHIPS[shipType].name }}:</span>
                <span class="ml-2 font-medium">{{ count }}</span>
              </div>
              <p v-if="Object.keys(report.attackerLosses).length === 0" class="text-muted-foreground">
                {{ t('messagesView.noLosses') }}
              </p>
            </div>
          </div>

          <!-- 防守方损失 -->
          <div class="space-y-2">
            <p class="text-sm font-medium text-red-600 dark:text-red-400">{{ t('messagesView.defenderLosses') }}</p>
            <div class="p-3 bg-muted rounded-lg space-y-1 text-xs">
              <div v-for="(count, shipType) in report.defenderLosses.fleet" :key="shipType">
                <span class="text-muted-foreground">{{ SHIPS[shipType].name }}:</span>
                <span class="ml-2 font-medium">{{ count }}</span>
              </div>
              <div v-for="(count, defenseType) in report.defenderLosses.defense" :key="defenseType">
                <span class="text-muted-foreground">{{ DEFENSES[defenseType].name }}:</span>
                <span class="ml-2 font-medium">{{ count }}</span>
              </div>
              <p
                v-if="Object.keys(report.defenderLosses.fleet).length === 0 && Object.keys(report.defenderLosses.defense).length === 0"
                class="text-muted-foreground"
              >
                {{ t('messagesView.noLosses') }}
              </p>
            </div>
          </div>
        </div>

        <!-- 剩余单位 -->
        <div v-if="report.attackerRemaining || report.defenderRemaining" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- 攻击方剩余 -->
          <div v-if="report.attackerRemaining && Object.keys(report.attackerRemaining).length > 0" class="space-y-2">
            <p class="text-sm font-medium text-blue-600 dark:text-blue-400">{{ t('messagesView.attackerRemaining') }}</p>
            <div class="p-3 bg-muted rounded-lg space-y-1 text-xs">
              <div v-for="(count, shipType) in report.attackerRemaining" :key="shipType">
                <span class="text-muted-foreground">{{ SHIPS[shipType].name }}:</span>
                <span class="ml-2 font-medium">{{ count }}</span>
              </div>
            </div>
          </div>

          <!-- 防守方剩余 -->
          <div
            v-if="
              report.defenderRemaining &&
              (Object.keys(report.defenderRemaining.fleet || {}).length > 0 ||
                Object.keys(report.defenderRemaining.defense || {}).length > 0)
            "
            class="space-y-2"
          >
            <p class="text-sm font-medium text-blue-600 dark:text-blue-400">{{ t('messagesView.defenderRemaining') }}</p>
            <div class="p-3 bg-muted rounded-lg space-y-1 text-xs">
              <div v-for="(count, shipType) in report.defenderRemaining.fleet" :key="shipType">
                <span class="text-muted-foreground">{{ SHIPS[shipType].name }}:</span>
                <span class="ml-2 font-medium">{{ count }}</span>
              </div>
              <div v-for="(count, defenseType) in report.defenderRemaining.defense" :key="defenseType">
                <span class="text-muted-foreground">{{ DEFENSES[defenseType].name }}:</span>
                <span class="ml-2 font-medium">{{ count }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 战利品和残骸 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- 掠夺资源 -->
          <div
            v-if="report.plunder && (report.plunder.metal > 0 || report.plunder.crystal > 0 || report.plunder.deuterium > 0)"
            class="p-3 bg-green-50 dark:bg-green-950 rounded-lg"
          >
            <p class="text-sm font-medium mb-2 text-green-600 dark:text-green-400">{{ t('messagesView.plunder') }}</p>
            <div class="flex flex-wrap gap-3 text-xs">
              <span v-if="report.plunder.metal > 0" class="flex items-center gap-1">
                <ResourceIcon type="metal" size="sm" />
                {{ formatNumber(report.plunder.metal) }}
              </span>
              <span v-if="report.plunder.crystal > 0" class="flex items-center gap-1">
                <ResourceIcon type="crystal" size="sm" />
                {{ formatNumber(report.plunder.crystal) }}
              </span>
              <span v-if="report.plunder.deuterium > 0" class="flex items-center gap-1">
                <ResourceIcon type="deuterium" size="sm" />
                {{ formatNumber(report.plunder.deuterium) }}
              </span>
            </div>
          </div>

          <!-- 残骸场 -->
          <div
            v-if="report.debrisField && (report.debrisField.metal > 0 || report.debrisField.crystal > 0)"
            class="p-3 bg-muted rounded-lg"
          >
            <p class="text-sm font-medium mb-2">{{ t('messagesView.debrisField') }}</p>
            <div class="flex flex-wrap gap-3 text-xs">
              <span v-if="report.debrisField.metal > 0" class="flex items-center gap-1">
                <ResourceIcon type="metal" size="sm" />
                {{ formatNumber(report.debrisField.metal) }}
              </span>
              <span v-if="report.debrisField.crystal > 0" class="flex items-center gap-1">
                <ResourceIcon type="crystal" size="sm" />
                {{ formatNumber(report.debrisField.crystal) }}
              </span>
            </div>
            <!-- 月球生成概率 -->
            <p v-if="report.moonChance && report.moonChance > 0" class="text-xs text-muted-foreground mt-2">
              {{ t('messagesView.moonChance') }}: {{ (report.moonChance * 100).toFixed(1) }}%
            </p>
          </div>
        </div>

        <!-- 回合详情 -->
        <div v-if="report.roundDetails && report.roundDetails.length > 0" class="space-y-2">
          <Button @click="showRoundDetails = !showRoundDetails" variant="outline" size="sm" class="w-full">
            {{ showRoundDetails ? t('messagesView.hideRoundDetails') : t('messagesView.showRoundDetails') }}
          </Button>

          <div v-if="showRoundDetails" class="relative pl-6 space-y-4">
            <!-- 时间线 -->
            <div class="absolute left-2 top-0 bottom-0 w-0.5 bg-border" />

            <div v-for="detail in report.roundDetails" :key="detail.round" class="relative">
              <!-- 时间线节点 -->
              <div class="absolute -left-6 top-3 w-4 h-4 rounded-full bg-primary border-2 border-background" />

              <!-- 回合内容卡片 -->
              <div class="border rounded-lg p-3 bg-card hover:shadow-md transition-shadow">
                <div class="flex items-center justify-between mb-3">
                  <p class="text-sm font-semibold">{{ t('messagesView.round').replace('{round}', String(detail.round)) }}</p>
                  <TooltipProvider :delay-duration="300">
                    <div class="flex gap-3 text-xs text-muted-foreground">
                      <Tooltip>
                        <TooltipTrigger as-child>
                          <span class="flex items-center gap-1">
                            <Sword class="h-3 w-3" />
                            {{ formatNumber(detail.attackerRemainingPower) }}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{{ t('messagesView.attackerRemainingPower') }}</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger as-child>
                          <span class="flex items-center gap-1">
                            <Shield class="h-3 w-3" />
                            {{ formatNumber(detail.defenderRemainingPower) }}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{{ t('messagesView.defenderRemainingPower') }}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <!-- 攻击方本回合损失 -->
                  <div class="bg-red-50 dark:bg-red-950/20 rounded p-2">
                    <p class="text-xs font-medium text-red-600 dark:text-red-400 mb-1.5">{{ t('messagesView.attackerLosses') }}</p>
                    <div class="text-xs space-y-0.5">
                      <div v-for="(count, shipType) in detail.attackerLosses" :key="shipType" class="flex justify-between">
                        <span class="text-muted-foreground">{{ SHIPS[shipType].name }}</span>
                        <span class="font-medium">-{{ count }}</span>
                      </div>
                      <p v-if="Object.keys(detail.attackerLosses).length === 0" class="text-muted-foreground italic">
                        {{ t('messagesView.noLosses') }}
                      </p>
                    </div>
                  </div>

                  <!-- 防守方本回合损失 -->
                  <div class="bg-blue-50 dark:bg-blue-950/20 rounded p-2">
                    <p class="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1.5">{{ t('messagesView.defenderLosses') }}</p>
                    <div class="text-xs space-y-0.5">
                      <div v-for="(count, shipType) in detail.defenderLosses.fleet" :key="shipType" class="flex justify-between">
                        <span class="text-muted-foreground">{{ SHIPS[shipType].name }}</span>
                        <span class="font-medium">-{{ count }}</span>
                      </div>
                      <div v-for="(count, defenseType) in detail.defenderLosses.defense" :key="defenseType" class="flex justify-between">
                        <span class="text-muted-foreground">{{ DEFENSES[defenseType].name }}</span>
                        <span class="font-medium">-{{ count }}</span>
                      </div>
                      <p
                        v-if="
                          Object.keys(detail.defenderLosses.fleet).length === 0 && Object.keys(detail.defenderLosses.defense).length === 0
                        "
                        class="text-muted-foreground italic"
                      >
                        {{ t('messagesView.noLosses') }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScrollableDialogContent>
  </Dialog>
</template>

<script setup lang="ts">
  import { ref, watch, computed } from 'vue'
  import { useGameStore } from '@/stores/gameStore'
  import { useUniverseStore } from '@/stores/universeStore'
  import { useI18n } from '@/composables/useI18n'
  import { useGameConfig } from '@/composables/useGameConfig'
  import { Dialog, ScrollableDialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
  import { Button } from '@/components/ui/button'
  import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
  import ResourceIcon from '@/components/ResourceIcon.vue'
  import { formatNumber, formatDate } from '@/utils/format'
  import { Trophy, Sword, Shield } from 'lucide-vue-next'
  import type { BattleResult } from '@/types/game'

  const props = defineProps<{
    report: BattleResult | null
    open: boolean
  }>()

  const emit = defineEmits<{
    (e: 'update:open', value: boolean): void
  }>()

  const gameStore = useGameStore()
  const universeStore = useUniverseStore()
  const { t } = useI18n()
  const { SHIPS, DEFENSES } = useGameConfig()

  const isOpen = ref(props.open)
  const showRoundDetails = ref(false)

  // 获取攻击方星球信息
  const attackerPlanet = computed(() => {
    if (!props.report) return null
    return gameStore.player.planets.find(p => p.id === props.report!.attackerPlanetId)
  })

  // 获取防守方星球信息
  const defenderPlanet = computed(() => {
    if (!props.report) return null
    // 先从玩家星球中查找
    const playerPlanet = gameStore.player.planets.find(p => p.id === props.report!.defenderPlanetId)
    if (playerPlanet) return playerPlanet
    // 再从宇宙星球地图中查找
    return Object.values(universeStore.planets).find(p => p.id === props.report!.defenderPlanetId)
  })

  watch(
    () => props.open,
    newValue => {
      isOpen.value = newValue
      if (newValue) {
        showRoundDetails.value = false
      }
    }
  )

  watch(isOpen, newValue => {
    emit('update:open', newValue)
  })

  // 获取胜利者样式
  const getWinnerStyle = (winner: string) => {
    if (winner === 'attacker') return 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300'
    if (winner === 'defender') return 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300'
    return 'bg-gray-50 dark:bg-gray-950 text-gray-700 dark:text-gray-300'
  }
</script>
