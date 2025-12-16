import { computed } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { locales, type Locale } from '@/locales'

export const useI18n = () => {
  const gameStore = useGameStore()

  const currentLocale = computed(() => gameStore.locale)

  const messages = computed(() => locales[currentLocale.value])

  // 获取翻译文本的辅助函数
  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.')
    let value: any = messages.value

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        return key // 如果找不到翻译，返回原始 key
      }
    }

    let result = typeof value === 'string' ? value : key

    // 替换参数占位符
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue))
      })
    }

    return result
  }

  const setLocale = (locale: Locale) => {
    gameStore.locale = locale
  }

  return {
    t,
    locale: currentLocale,
    setLocale,
    messages
  }
}
