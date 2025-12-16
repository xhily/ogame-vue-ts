<template>
  <Popover>
    <PopoverTrigger as-child>
      <span class="cursor-pointer underline decoration-dotted underline-offset-4 touch-manipulation">{{ formatNumber(value, 1) }}</span>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-2" side="top" align="center">
      <p class="font-mono text-sm">{{ formattedValue }}</p>
    </PopoverContent>
  </Popover>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
  import { formatNumber } from '@/utils/format'

  const props = defineProps<{
    value: number
  }>()

  // 完整格式化的数字（带千位分隔符）
  const formattedValue = computed(() => {
    return props.value.toLocaleString()
  })
</script>
