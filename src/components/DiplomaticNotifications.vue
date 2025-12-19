<template>
  <Popover v-model:open="isOpen">
    <PopoverTrigger as-child>
      <Button variant="outline" size="icon" class="relative">
        <ScrollText class="h-4 w-4" />
        <Badge
          v-if="unreadCount > 0"
          variant="destructive"
          class="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
        >
          {{ unreadCount }}
        </Badge>
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-96 p-0" align="end">
      <div class="flex items-center justify-between p-4 border-b">
        <h3 class="font-semibold">{{ t('diplomacy.notifications') }}</h3>
        <Button v-if="unreadCount > 0" variant="ghost" size="sm" @click="markAllAsRead">
          {{ t('diplomacy.markAllRead') }}
        </Button>
      </div>
      <ScrollArea class="h-96">
        <Empty v-if="reports.length === 0" class="border-0">
          <EmptyContent>
            <ScrollText class="h-10 w-10 text-muted-foreground" />
            <EmptyDescription>{{ t('diplomacy.noReports') }}</EmptyDescription>
          </EmptyContent>
        </Empty>
        <div v-else class="divide-y">
          <div
            v-for="report in reports"
            :key="report.id"
            class="p-3 hover:bg-muted/50 cursor-pointer transition-colors"
            :class="{ 'bg-primary/5': !report.read }"
            @click="handleReportClick(report)"
          >
            <div class="flex items-center gap-3">
              <!-- 左侧：事件图标 -->
              <div class="flex-shrink-0">
                <component :is="getEventIcon(report.eventType)" class="h-5 w-5" :class="getEventIconColor(report.eventType)" />
              </div>
              <!-- 中间：主要信息 -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-sm truncate">{{ report.npcName }}</span>
                  <Badge :variant="getStatusBadgeVariant(report.newStatus)" class="text-xs flex-shrink-0">
                    {{ getStatusText(report.newStatus) }}
                  </Badge>
                </div>
                <p class="text-xs text-muted-foreground mt-0.5">
                  {{ getEventTypeText(report.eventType) }}
                </p>
              </div>
              <!-- 右侧：好感度变化和时间 -->
              <div class="flex-shrink-0 text-right">
                <span
                  class="text-sm font-bold block"
                  :class="report.reputationChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'"
                >
                  {{ report.reputationChange >= 0 ? '+' : '' }}{{ report.reputationChange }}
                </span>
                <span class="text-[10px] text-muted-foreground">
                  {{ formatRelativeTime((Date.now() - report.timestamp) / 1000, t) }}{{ t('diplomacy.ago') }}
                </span>
              </div>
              <!-- 未读标记 -->
              <span v-if="!report.read" class="h-2 w-2 rounded-full bg-destructive flex-shrink-0" />
            </div>
          </div>
        </div>
      </ScrollArea>
      <div v-if="reports.length > 0" class="p-2 border-t">
        <Button variant="ghost" size="sm" class="w-full" @click="goToDiplomacy">
          {{ t('diplomacy.viewAll') }}
        </Button>
      </div>
    </PopoverContent>
  </Popover>

  <!-- 外交报告详情对话框 -->
  <Dialog :open="detailDialogOpen" @update:open="detailDialogOpen = $event">
    <DialogContent class="max-w-2xl">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <component
            v-if="selectedReport"
            :is="getEventIcon(selectedReport.eventType)"
            class="h-5 w-5"
            :class="getEventIconColor(selectedReport.eventType)"
          />
          {{ t('diplomacy.reportDetails') }}
        </DialogTitle>
        <DialogDescription class="sr-only">
          {{ t('diplomacy.reportDetails') }}
        </DialogDescription>
      </DialogHeader>

      <div v-if="selectedReport" class="space-y-4">
        <!-- NPC信息 -->
        <div class="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <h3 class="font-semibold text-lg">{{ selectedReport.npcName }}</h3>
              <Badge :variant="getStatusBadgeVariant(selectedReport.newStatus)">
                {{ getStatusText(selectedReport.newStatus) }}
              </Badge>
            </div>
            <p class="text-sm text-muted-foreground">
              {{ formatRelativeTime((Date.now() - selectedReport.timestamp) / 1000, t) }}{{ t('diplomacy.ago') }}
            </p>
          </div>
        </div>

        <!-- 事件描述 -->
        <div class="space-y-2">
          <h4 class="font-semibold text-sm">{{ t('diplomacy.eventDescription') }}</h4>
          <p class="text-sm p-3 bg-muted/30 rounded-md">
            {{
              selectedReport.messageKey && selectedReport.messageParams
                ? t(selectedReport.messageKey, selectedReport.messageParams)
                : selectedReport.message
            }}
          </p>
        </div>

        <!-- 关系变化 -->
        <div class="grid grid-cols-2 gap-4">
          <!-- 好感度变化 -->
          <div class="space-y-2">
            <h4 class="font-semibold text-sm">{{ t('diplomacy.reputationChange') }}</h4>
            <div class="p-3 bg-muted/30 rounded-md">
              <div class="flex items-center justify-between text-sm mb-2">
                <span class="text-muted-foreground">{{ t('diplomacy.before') }}</span>
                <span class="font-semibold" :class="getReputationColor(selectedReport.newReputation - selectedReport.reputationChange)">
                  {{ selectedReport.newReputation - selectedReport.reputationChange > 0 ? '+' : ''
                  }}{{ selectedReport.newReputation - selectedReport.reputationChange }}
                </span>
              </div>
              <div
                class="flex items-center justify-center text-lg font-bold my-1"
                :class="selectedReport.reputationChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'"
              >
                {{ selectedReport.reputationChange >= 0 ? '+' : '' }}{{ selectedReport.reputationChange }}
              </div>
              <div class="flex items-center justify-between text-sm mt-2">
                <span class="text-muted-foreground">{{ t('diplomacy.after') }}</span>
                <span class="font-semibold" :class="getReputationColor(selectedReport.newReputation)">
                  {{ selectedReport.newReputation > 0 ? '+' : '' }}{{ selectedReport.newReputation }}
                </span>
              </div>
            </div>
          </div>

          <!-- 关系状态变化 -->
          <div class="space-y-2">
            <h4 class="font-semibold text-sm">{{ t('diplomacy.statusChange') }}</h4>
            <div class="p-3 bg-muted/30 rounded-md">
              <div class="flex items-center justify-between text-sm mb-2">
                <span class="text-muted-foreground">{{ t('diplomacy.before') }}</span>
                <Badge :variant="getStatusBadgeVariant(selectedReport.oldStatus)" class="text-xs">
                  {{ getStatusText(selectedReport.oldStatus) }}
                </Badge>
              </div>
              <div class="flex items-center justify-center my-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
              <div class="flex items-center justify-between text-sm mt-2">
                <span class="text-muted-foreground">{{ t('diplomacy.after') }}</span>
                <Badge :variant="getStatusBadgeVariant(selectedReport.newStatus)" class="text-xs">
                  {{ getStatusText(selectedReport.newStatus) }}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="detailDialogOpen = false">{{ t('common.close') }}</Button>
        <Button @click="goToDiplomacyFromDialog">{{ t('diplomacy.viewDiplomacy') }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { useGameStore } from '@/stores/gameStore'
  import { useI18n } from '@/composables/useI18n'
  import { Button } from '@/components/ui/button'
  import { Badge } from '@/components/ui/badge'
  import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
  import { ScrollArea } from '@/components/ui/scroll-area'
  import { ScrollText, Gift, Sword, Eye, Trash2, Skull } from 'lucide-vue-next'
  import { Empty, EmptyContent, EmptyDescription } from '@/components/ui/empty'
  import { RelationStatus, DiplomaticEventType } from '@/types/game'
  import type { DiplomaticReport } from '@/types/game'
  import { formatRelativeTime } from '@/utils/format'

  const router = useRouter()
  const gameStore = useGameStore()
  const { t } = useI18n()
  const isOpen = ref(false)
  const detailDialogOpen = ref(false)
  const selectedReport = ref<DiplomaticReport | null>(null)

  const reports = computed(() => {
    return (gameStore.player.diplomaticReports || []).slice().reverse().slice(0, 20) // 最近20条
  })

  const unreadCount = computed(() => {
    return (gameStore.player.diplomaticReports || []).filter(r => !r.read).length
  })

  const getEventIcon = (eventType: DiplomaticReport['eventType']) => {
    switch (eventType) {
      case DiplomaticEventType.GiftResources:
        return Gift
      case DiplomaticEventType.Attack:
      case DiplomaticEventType.AllyAttacked:
        return Sword
      case DiplomaticEventType.Spy:
        return Eye
      case DiplomaticEventType.StealDebris:
        return Trash2
      case DiplomaticEventType.DestroyPlanet:
        return Skull
      default:
        return ScrollText
    }
  }

  const getEventIconColor = (eventType: DiplomaticReport['eventType']) => {
    switch (eventType) {
      case DiplomaticEventType.GiftResources:
        return 'text-green-500'
      case DiplomaticEventType.Attack:
      case DiplomaticEventType.DestroyPlanet:
        return 'text-red-500'
      case DiplomaticEventType.AllyAttacked:
        return 'text-orange-500'
      case DiplomaticEventType.Spy:
        return 'text-purple-500'
      case DiplomaticEventType.StealDebris:
        return 'text-yellow-500'
      default:
        return 'text-muted-foreground'
    }
  }

  const getEventTypeText = (eventType: DiplomaticReport['eventType']) => {
    switch (eventType) {
      case DiplomaticEventType.GiftResources:
        return t('diplomacy.eventType.gift')
      case DiplomaticEventType.Attack:
        return t('diplomacy.eventType.attack')
      case DiplomaticEventType.AllyAttacked:
        return t('diplomacy.eventType.allyAttacked')
      case DiplomaticEventType.Spy:
        return t('diplomacy.eventType.spy')
      case DiplomaticEventType.StealDebris:
        return t('diplomacy.eventType.stealDebris')
      case DiplomaticEventType.DestroyPlanet:
        return t('diplomacy.eventType.destroyPlanet')
      default:
        return t('diplomacy.eventType.unknown')
    }
  }

  const getStatusBadgeVariant = (status: RelationStatus) => {
    switch (status) {
      case RelationStatus.Hostile:
        return 'destructive'
      case RelationStatus.Friendly:
        return 'default'
      case RelationStatus.Neutral:
      default:
        return 'secondary'
    }
  }

  const getStatusText = (status: RelationStatus) => {
    switch (status) {
      case RelationStatus.Hostile:
        return t('diplomacy.status.hostile')
      case RelationStatus.Friendly:
        return t('diplomacy.status.friendly')
      case RelationStatus.Neutral:
      default:
        return t('diplomacy.status.neutral')
    }
  }

  const getReputationColor = (reputation: number | null) => {
    if (reputation === null) return 'text-muted-foreground'
    if (reputation >= 20) return 'text-green-600 dark:text-green-400'
    if (reputation <= -20) return 'text-red-600 dark:text-red-400'
    return 'text-muted-foreground'
  }

  const handleReportClick = (report: DiplomaticReport) => {
    // 标记为已读
    report.read = true
    // 设置选中的报告
    selectedReport.value = report
    // 关闭通知面板
    isOpen.value = true
    // 打开对话框
    detailDialogOpen.value = true
  }

  const markAllAsRead = () => {
    gameStore.player.diplomaticReports?.forEach(report => {
      report.read = true
    })
  }

  const goToDiplomacy = () => {
    isOpen.value = false
    router.push('/diplomacy')
  }

  const goToDiplomacyFromDialog = () => {
    const npcId = selectedReport.value?.npcId
    detailDialogOpen.value = false
    router.push(npcId ? `/diplomacy?npcId=${npcId}` : '/diplomacy')
  }
</script>
