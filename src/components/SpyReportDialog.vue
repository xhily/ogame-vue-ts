<template>
  <Dialog v-model:open="isOpen">
    <ScrollableDialogContent container-class="sm:max-w-2xl max-h-[90vh]">
      <template #header>
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <Eye class="h-5 w-5" />
            {{ t('messagesView.spyReport') }}
          </DialogTitle>
          <DialogDescription v-if="report">
            {{ formatDate(report.timestamp) }}
          </DialogDescription>
        </DialogHeader>
      </template>

      <div v-if="report" class="space-y-4">
        <!-- 目标星球信息 -->
        <div class="p-3 bg-muted rounded-lg">
          <p class="text-sm font-medium mb-2">{{ t('messagesView.targetPlanet') }}</p>
          <p class="text-xs text-muted-foreground">
            {{ report.targetPlanetName }} [{{ report.targetPosition.galaxy }}:{{ report.targetPosition.system }}:{{
              report.targetPosition.position
            }}]
          </p>
        </div>

        <!-- 资源 -->
        <div>
          <p class="text-sm font-medium mb-2">{{ t('messagesView.resources') }}:</p>
          <div class="flex flex-wrap gap-3 text-xs sm:text-sm">
            <span class="flex items-center gap-1">
              <ResourceIcon type="metal" size="sm" />
              {{ formatNumber(report.resources.metal) }}
            </span>
            <span class="flex items-center gap-1">
              <ResourceIcon type="crystal" size="sm" />
              {{ formatNumber(report.resources.crystal) }}
            </span>
            <span class="flex items-center gap-1">
              <ResourceIcon type="deuterium" size="sm" />
              {{ formatNumber(report.resources.deuterium) }}
            </span>
            <span class="flex items-center gap-1">
              <ResourceIcon type="darkMatter" size="sm" />
              {{ formatNumber(report.resources.darkMatter) }}
            </span>
          </div>
        </div>

        <!-- 舰队（如果有） -->
        <div v-if="report.fleet && Object.keys(report.fleet).length > 0">
          <p class="text-sm font-medium mb-2">{{ t('messagesView.fleet') }}:</p>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs sm:text-sm">
            <div v-for="(count, shipType) in report.fleet" :key="shipType">
              <span class="text-muted-foreground">{{ SHIPS[shipType].name }}:</span>
              <span class="ml-1 font-medium">{{ count }}</span>
            </div>
          </div>
        </div>

        <!-- 防御设施（如果有） -->
        <div v-if="report.defense && hasDefense(report.defense)">
          <p class="text-sm font-medium mb-2">{{ t('messagesView.defense') }}:</p>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs sm:text-sm">
            <div v-for="(count, defenseType) in report.defense" :key="defenseType">
              <span v-if="count && count > 0" class="block">
                <span class="text-muted-foreground">{{ DEFENSES[defenseType].name }}:</span>
                <span class="ml-1 font-medium">{{ count }}</span>
              </span>
            </div>
          </div>
        </div>

        <!-- 建筑（如果有） -->
        <div v-if="report.buildings && Object.keys(report.buildings).length > 0">
          <p class="text-sm font-medium mb-2">{{ t('messagesView.buildings') }}:</p>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs sm:text-sm">
            <div v-for="(level, buildingType) in report.buildings" :key="buildingType">
              <span class="text-muted-foreground">{{ BUILDINGS[buildingType].name }}:</span>
              <span class="ml-1 font-medium">Lv.{{ level }}</span>
            </div>
          </div>
        </div>
      </div>
    </ScrollableDialogContent>
  </Dialog>
</template>

<script setup lang="ts">
  import { ref, watch } from 'vue'
  import { useI18n } from '@/composables/useI18n'
  import { useGameConfig } from '@/composables/useGameConfig'
  import { Dialog, ScrollableDialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
  import ResourceIcon from '@/components/ResourceIcon.vue'
  import { formatNumber, formatDate } from '@/utils/format'
  import { Eye } from 'lucide-vue-next'
  import type { SpyReport } from '@/types/game'

  const props = defineProps<{
    report: SpyReport | null
    open: boolean
  }>()

  const emit = defineEmits<{
    (e: 'update:open', value: boolean): void
  }>()

  const { t } = useI18n()
  const { SHIPS, DEFENSES, BUILDINGS } = useGameConfig()

  const isOpen = ref(props.open)

  watch(
    () => props.open,
    newValue => {
      isOpen.value = newValue
    }
  )

  watch(isOpen, newValue => {
    emit('update:open', newValue)
  })

  // 检查是否有防御设施
  const hasDefense = (defense: any): boolean => {
    if (!defense) return false
    return Object.values(defense).some((count: any) => count > 0)
  }
</script>
