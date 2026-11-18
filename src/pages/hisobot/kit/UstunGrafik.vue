<script setup lang="ts">
/* Vaqt bo'yicha grafik: ustunlar (masalan tushum) + chiziq (masalan foyda).
   Kenglik konteynerga moslashadi, sichqoncha bilan har nuqta qiymati ko'rinadi. */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { qisqa, fmt, kalitNom } from './hisobot'

export interface Seriya { k: string; nom: string; rang: string; tur?: 'ustun' | 'chiziq' }
const props = withDefaults(defineProps<{
  data: Record<string, any>[]
  seriyalar: Seriya[]
  guruh?: string
  balandlik?: number
  birlik?: string
}>(), { guruh: 'kun', balandlik: 240, birlik: "so'm" })

const quti = ref<HTMLElement | null>(null)
const W = ref(600)
let ro: ResizeObserver | null = null
onMounted(() => {
  ro = new ResizeObserver(e => { W.value = Math.max(280, Math.floor(e[0]!.contentRect.width)) })
  if (quti.value) ro.observe(quti.value)
})
onUnmounted(() => ro?.disconnect())

const P = { l: 52, r: 10, t: 12, b: 26 }
const ichW = computed(() => W.value - P.l - P.r)
const ichH = computed(() => props.balandlik - P.t - P.b)
const ustunlar = computed(() => props.seriyalar.filter(s => (s.tur || 'ustun') === 'ustun'))
const chiziqlar = computed(() => props.seriyalar.filter(s => s.tur === 'chiziq'))

function chiroyli(v: number) {
  if (v <= 0) return 1
  const e = Math.pow(10, Math.floor(Math.log10(v)))
  const f = v / e
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e
}
const shkala = computed(() => {
  let max = 0, min = 0
  for (const d of props.data) for (const s of props.seriyalar) { const v = Number(d[s.k]) || 0; max = Math.max(max, v); min = Math.min(min, v) }
  const qadam = chiroyli((max - min) / 4 || 1)
  const yuqori = Math.ceil(max / qadam) * qadam || qadam
  const quyi = Math.floor(min / qadam) * qadam
  const chiziqlar: number[] = []
  for (let v = quyi; v <= yuqori + qadam / 2; v += qadam) chiziqlar.push(v)
  return { yuqori, quyi, chiziqlar }
})
const y = (v: number) => P.t + ichH.value * (1 - (v - shkala.value.quyi) / (shkala.value.yuqori - shkala.value.quyi || 1))
const band = computed(() => ichW.value / Math.max(1, props.data.length))
const xMarkaz = (i: number) => P.l + band.value * (i + 0.5)
const ustunEni = computed(() => Math.max(2, Math.min(30, (band.value * 0.68) / Math.max(1, ustunlar.value.length))))

const xBelgi = computed(() => {
  const qadam = Math.max(1, Math.ceil(props.data.length / Math.max(1, Math.floor(ichW.value / 62))))
  return props.data.map((d, i) => ({ i, nom: kalitNom(d.k, props.guruh) })).filter(x => x.i % qadam === 0)
})
function yol(s: Seriya) {
  return props.data.map((d, i) => `${i ? 'L' : 'M'}${xMarkaz(i).toFixed(1)},${y(Number(d[s.k]) || 0).toFixed(1)}`).join(' ')
}

const faol = ref<number | null>(null)
function harakat(e: MouseEvent) {
  const r = (e.currentTarget as SVGElement).getBoundingClientRect()
  const i = Math.floor((e.clientX - r.left - P.l) / band.value)
  faol.value = i >= 0 && i < props.data.length ? i : null
}
const tip = computed(() => {
  if (faol.value === null) return null
  const d = props.data[faol.value]!
  const x = xMarkaz(faol.value)
  return { d, chap: x > W.value * 0.62, x }
})
const bosh = computed(() => props.data.every(d => props.seriyalar.every(s => !Number(d[s.k]))))
</script>

<template>
  <div ref="quti" class="ug">
    <div class="ug-leg">
      <span v-for="s in seriyalar" :key="s.k"><i :class="s.tur || 'ustun'" :style="{ background: s.rang }"/>{{ s.nom }}</span>
    </div>
    <div class="ug-q">
      <svg :width="W" :height="balandlik" @mousemove="harakat" @mouseleave="faol = null">
        <g class="ug-grid">
          <template v-for="v in shkala.chiziqlar" :key="v">
            <line :x1="P.l" :x2="W - P.r" :y1="y(v)" :y2="y(v)" :class="{ nol: v === 0 }"/>
            <text :x="P.l - 8" :y="y(v) + 4">{{ qisqa(v) }}</text>
          </template>
        </g>
        <rect v-if="faol !== null" class="ug-hl" :x="P.l + band * faol" :y="P.t" :width="band" :height="ichH"/>
        <g v-for="(s, si) in ustunlar" :key="s.k">
          <rect v-for="(d, i) in data" :key="i"
            :x="xMarkaz(i) - (ustunEni * ustunlar.length) / 2 + si * ustunEni + 0.5"
            :y="Math.min(y(Number(d[s.k]) || 0), y(0))"
            :width="Math.max(1, ustunEni - 1)"
            :height="Math.abs(y(0) - y(Number(d[s.k]) || 0))"
            :fill="s.rang" :opacity="faol === null || faol === i ? 1 : .55" rx="3"/>
        </g>
        <g v-for="s in chiziqlar" :key="s.k">
          <path :d="yol(s)" fill="none" :stroke="s.rang" stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round"/>
          <template v-if="data.length <= 40">
            <circle v-for="(d, i) in data" :key="i" :cx="xMarkaz(i)" :cy="y(Number(d[s.k]) || 0)" :r="faol === i ? 4.5 : 2.6"
              :fill="faol === i ? s.rang : 'var(--surface)'" :stroke="s.rang" stroke-width="2"/>
          </template>
        </g>
        <g class="ug-x">
          <text v-for="b in xBelgi" :key="b.i" :x="xMarkaz(b.i)" :y="balandlik - 7">{{ b.nom }}</text>
        </g>
      </svg>
      <div v-if="tip" class="ug-tip" :style="tip.chap ? { right: (W - tip.x + 14) + 'px' } : { left: (tip.x + 14) + 'px' }">
        <b>{{ kalitNom(tip.d.k, guruh, true) }}</b>
        <div v-for="s in seriyalar" :key="s.k" class="ug-tip-r">
          <i :style="{ background: s.rang }"/><span>{{ s.nom }}</span><em>{{ fmt(tip.d[s.k]) }}</em>
        </div>
        <slot name="tip" :d="tip.d"/>
      </div>
      <div v-if="bosh" class="ug-bosh">Bu davrda ma'lumot yo'q</div>
    </div>
  </div>
</template>

<style scoped>
.ug { position:relative; width:100%; }
.ug-leg { display:flex; gap:16px; flex-wrap:wrap; font-size:12px; color:var(--mut); margin-bottom:8px; }
.ug-leg span { display:inline-flex; align-items:center; gap:6px; }
.ug-leg i { width:10px; height:10px; border-radius:3px; }
.ug-leg i.chiziq { height:3px; border-radius:2px; width:14px; }
.ug-q { position:relative; }
svg { display:block; overflow:visible; }
.ug-grid line { stroke:var(--line2); stroke-width:1; }
.ug-grid line.nol { stroke:var(--line); }
.ug-grid text { fill:var(--sub); font-size:10.5px; text-anchor:end; font-variant-numeric:tabular-nums; }
.ug-x text { fill:var(--sub); font-size:10.5px; text-anchor:middle; }
.ug-hl { fill:var(--acc-soft); }
.ug-tip { position:absolute; top:8px; z-index:5; min-width:180px; padding:9px 11px; border-radius:9px; background:var(--surface); border:1px solid var(--line);
  box-shadow:0 10px 28px rgba(15,23,42,.14); pointer-events:none; font-size:12px; }
.ug-tip b { display:block; font-size:12px; font-weight:600; margin-bottom:5px; color:var(--ink); }
.ug-tip-r { display:flex; align-items:center; gap:7px; color:var(--mut); line-height:1.7; }
.ug-tip-r i { width:8px; height:8px; border-radius:2px; flex-shrink:0; }
.ug-tip-r span { flex:1; }
.ug-tip-r em { font-style:normal; font-weight:600; color:var(--ink); font-variant-numeric:tabular-nums; }
.ug-bosh { position:absolute; inset:0 0 26px 52px; display:flex; align-items:center; justify-content:center; font-size:13px; color:var(--sub); }
</style>
