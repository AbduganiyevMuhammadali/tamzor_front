<template>
  <div class="bh" :class="'bh--' + turi">
    <div class="bh-ic" v-html="ikona"/>
    <div class="bh-t">{{ sarlavha }}</div>
    <div v-if="matn" class="bh-m">{{ matn }}</div>
    <button v-if="amal" class="bh-btn" @click="$emit('amal')">{{ amal }}</button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

/**
 * Bo'sh holat — ma'lumot topilmaganda ko'rsatiladi.
 * Quruq "Ma'lumot yo'q" o'rniga tushunarli xabar va ikonka beradi.
 *
 *   <BoshHolat turi="qidiruv" sarlavha="Hech narsa topilmadi"
 *              matn="Filtrni o'zgartirib ko'ring" amal="Tozalash" @amal="tozala"/>
 */
const props = defineProps({
  turi:     { type: String, default: 'malumot' },   // malumot | qidiruv | xato | ok | reja
  sarlavha: { type: String, required: true },
  matn:     { type: String, default: '' },
  amal:     { type: String, default: '' },          // tugma matni (ixtiyoriy)
})
defineEmits(['amal'])

const IKONKALAR = {
  malumot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/></svg>',
  qidiruv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
  xato:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>',
  ok:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M22 11.1V12a10 10 0 11-5.9-9.1"/><polyline points="22 4 12 14 9 11"/></svg>',
  reja:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
}
const ikona = computed(() => IKONKALAR[props.turi] || IKONKALAR.malumot)
</script>

<style scoped>
.bh { display:flex; flex-direction:column; align-items:center; justify-content:center;
      gap:9px; padding:44px 22px; text-align:center;
      animation:bh-in .38s cubic-bezier(.22,1,.36,1) both; }

.bh-ic { width:52px; height:52px; border-radius:16px; display:flex; align-items:center;
         justify-content:center; background:#f1f5f9; color:#94a3b8; margin-bottom:2px; }
.bh-ic :deep(svg) { width:26px; height:26px; }

.bh-t { font-size:13.5px; font-weight:700; color:#475569; }
.bh-m { font-size:12px; color:#94a3b8; max-width:290px; line-height:1.55; }

.bh-btn { margin-top:6px; padding:7px 16px; border:1px solid #e2e8f0; border-radius:9px;
          background:#fff; font-size:12.5px; font-weight:600; color:#4f46e5;
          cursor:pointer; transition:.14s; }
.bh-btn:hover { background:#eef2ff; border-color:#c7d2fe; }

/* Turlar bo'yicha ranglar */
.bh--ok   .bh-ic { background:rgba(16,185,129,.1);  color:#10b981; }
.bh--xato .bh-ic { background:rgba(239,68,68,.1);   color:#ef4444; }
.bh--reja .bh-ic { background:rgba(99,102,241,.1);  color:#6366f1; }

@keyframes bh-in { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
@media (prefers-reduced-motion: reduce) { .bh { animation:none } }
</style>
