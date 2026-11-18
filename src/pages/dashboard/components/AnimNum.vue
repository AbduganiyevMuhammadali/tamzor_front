<template><span class="an">{{ matn }}</span></template>

<script setup lang="ts">
/* Raqamni eski qiymatdan yangisiga silliq "sanab" chiqaradi.
   Birinchi ko'rinishda 0 dan boshlanadi; davr almashganda eski qiymatdan. */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { kamHarakat } from '../format'

const props = withDefaults(defineProps<{
  value: number
  format?: (n: number) => string
  duration?: number
}>(), { duration: 1000 })

const korinish = ref(0)
let raf = 0

function tween(dan: number, ga: number) {
  cancelAnimationFrame(raf)
  if (kamHarakat || dan === ga || !Number.isFinite(ga)) { korinish.value = ga; return }
  const t0 = performance.now()
  const qadam = (t: number) => {
    const p = Math.min(1, (t - t0) / props.duration)
    const e = 1 - Math.pow(1 - p, 4)          // easeOutQuart — oxirida sekinlashadi
    korinish.value = dan + (ga - dan) * e
    if (p < 1) raf = requestAnimationFrame(qadam)
  }
  raf = requestAnimationFrame(qadam)
}

onMounted(() => tween(0, Number(props.value) || 0))
watch(() => props.value, v => tween(korinish.value, Number(v) || 0))
onUnmounted(() => cancelAnimationFrame(raf))

const matn = computed(() => props.format
  ? props.format(korinish.value)
  : new Intl.NumberFormat('uz-UZ').format(Math.round(korinish.value)))
</script>

<style scoped>
.an { font-variant-numeric: tabular-nums; }
</style>
