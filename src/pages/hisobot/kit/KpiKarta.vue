<script setup lang="ts">
/* Ko'rsatkich kartasi: ikon, nom, qiymat, izoh va oldingi davrga nisbatan
   o'zgarish (yaxshi tomonga — yashil, yomon tomonga — qizil). */
import { computed } from 'vue'
import { qisqa, fmt, foizFmt } from './hisobot'

const props = withDefaults(defineProps<{
  nom: string
  qiymat: number | string | null | undefined
  ikon?: string
  birlik?: string
  izoh?: string
  delta?: number | null
  /** o'sish yaxshimi ('yuqori') yoki kamayish yaxshimi ('past') */
  yaxshi?: 'yuqori' | 'past' | 'neytral'
  ton?: 'brand' | 'ok' | 'warn' | 'err' | 'neytral'
  toliq?: boolean
  to?: string
}>(), { birlik: '', izoh: '', delta: null, yaxshi: 'yuqori', ton: 'brand', toliq: false })

const qiymatMatn = computed(() => {
  const v = props.qiymat
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'string') return v
  return props.toliq ? fmt(v) : qisqa(v)
})
const deltaMatn = computed(() => {
  const d = props.delta ?? 0
  if (deltaHolat.value === 'teng') return "o'zgarmadi"
  return Math.abs(d) >= 400 ? `${Math.round(1 + d / 100)} barobar` : foizFmt(Math.abs(d))
})
const deltaHolat = computed(() => {
  if (props.delta === null || props.delta === undefined) return null
  if (Math.abs(props.delta) < 0.05) return 'teng'
  if (props.yaxshi === 'neytral') return 'neytral'
  return (props.delta > 0) === (props.yaxshi === 'yuqori') ? 'yaxshi' : 'yomon'
})
</script>

<template>
  <component :is="to ? 'router-link' : 'div'" :to="to" class="kk" :class="[`kk--${ton}`, { 'kk--link': to }]">
    <div class="kk-top">
      <span v-if="ikon" class="kk-ic"><svg viewBox="0 0 24 24" v-html="ikon"/></span>
      <span class="kk-nom">{{ nom }}</span>
    </div>
    <div class="kk-v">{{ qiymatMatn }}<small v-if="birlik">{{ birlik }}</small></div>
    <div v-if="izoh || deltaHolat || $slots.default" class="kk-iz">
      <span v-if="deltaHolat" class="kk-d" :class="deltaHolat" title="Oldingi xuddi shuncha kunlik davrga nisbatan">
        <svg v-if="deltaHolat !== 'teng'" viewBox="0 0 24 24"><path :d="delta! > 0 ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'"/></svg>
        {{ deltaMatn }}
      </span>
      <slot>{{ izoh }}</slot>
    </div>
  </component>
</template>

<style scoped>
.kk { --t:var(--acc); --ts:var(--acc-soft); display:flex; flex-direction:column; gap:6px; padding:15px 16px; background:var(--surface); border:1px solid var(--line); border-radius:12px;
  text-decoration:none; color:inherit; min-width:0; transition:border-color .12s, box-shadow .12s; }
.kk--ok { --t:#059669; --ts:color-mix(in srgb, #059669 11%, transparent); }
.kk--warn { --t:#d97706; --ts:color-mix(in srgb, #d97706 12%, transparent); }
.kk--err { --t:#dc2626; --ts:color-mix(in srgb, #dc2626 10%, transparent); }
.kk--neytral { --t:var(--mut); --ts:var(--hov); }
.kk--link:hover { border-color:color-mix(in srgb, var(--t) 40%, var(--line)); box-shadow:0 6px 18px -10px color-mix(in srgb, var(--t) 60%, transparent); }
.kk-top { display:flex; align-items:center; gap:10px; min-width:0; }
.kk-ic { width:34px; height:34px; flex-shrink:0; border-radius:9px; background:var(--ts); color:var(--t); display:flex; align-items:center; justify-content:center; }
.kk-ic svg { width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:1.75; stroke-linecap:round; stroke-linejoin:round; }
.kk-nom { flex:1; min-width:0; font-size:12.5px; color:var(--mut); line-height:1.3; }
.kk-d { flex-shrink:0; display:inline-flex; margin-right:6px; vertical-align:1px; align-items:center; gap:2px; height:20px; padding:0 6px; border-radius:10px; font-size:11px; font-weight:600; white-space:nowrap; font-variant-numeric:tabular-nums; }
.kk-d svg { width:13px; height:13px; fill:none; stroke:currentColor; stroke-width:2.2; stroke-linecap:round; stroke-linejoin:round; }
.kk-d.yaxshi { background:color-mix(in srgb, #059669 12%, transparent); color:#059669; }
.kk-d.yomon { background:color-mix(in srgb, #dc2626 11%, transparent); color:#dc2626; }
.kk-d.teng, .kk-d.neytral { background:var(--hov); color:var(--mut); }
.kk-v { min-width:0; font-size:24px; font-weight:650; letter-spacing:-.02em; line-height:1.15; font-variant-numeric:tabular-nums; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.kk--err .kk-v { color:#dc2626; }
.kk-v small { font-size:12.5px; font-weight:500; color:var(--mut); margin-left:5px; letter-spacing:0; }
.kk-iz { font-size:12px; color:var(--sub); line-height:1.4; }
</style>
