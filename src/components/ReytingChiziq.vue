<script setup lang="ts">
/* O'rtacha mijoz reytingi dinamikasi — chiziq + ostidagi maydon, daraja chegaralari (70 / 110 / 150) uzuq chiziq bilan.
   Bosh sahifa (MijozReytingi.vue) va Hisobot → Mijozlar reytingi ishlatadi. Ma'lumot: /tahlil/reyting `trend`. */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { darajaOl, DARAJALAR } from '@/utils/reyting'

const props = withDefaults(defineProps<{ data: { k: string; ortacha: number }[]; balandlik?: number; guruh?: string }>(), { balandlik: 170, guruh: 'kun' })

const quti = ref<HTMLElement | null>(null)
const W = ref(560)
let ro: ResizeObserver | null = null
onMounted(() => { if (quti.value) { ro = new ResizeObserver(e => { W.value = Math.max(240, Math.floor(e[0]!.contentRect.width)) }); ro.observe(quti.value) } })
onUnmounted(() => ro?.disconnect())

const P = { l: 34, r: 10, t: 10, b: 22 }
const H = computed(() => props.balandlik)
const qiymatlar = computed(() => props.data.map(d => Number(d.ortacha) || 0))
const shkala = computed(() => {
  const v = qiymatlar.value.length ? qiymatlar.value : [100]
  let lo = Math.min(...v), hi = Math.max(...v)
  const pad = Math.max(4, (hi - lo) * 0.35)
  lo = Math.max(0, Math.floor((lo - pad) / 5) * 5); hi = Math.min(200, Math.ceil((hi + pad) / 5) * 5)
  if (hi - lo < 10) { hi = Math.min(200, lo + 10) }
  return { lo, hi }
})
const x = (i: number) => P.l + (props.data.length <= 1 ? (W.value - P.l - P.r) / 2 : (i / (props.data.length - 1)) * (W.value - P.l - P.r))
const y = (v: number) => P.t + (H.value - P.t - P.b) * (1 - (v - shkala.value.lo) / (shkala.value.hi - shkala.value.lo || 1))
const yol = computed(() => props.data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(Number(d.ortacha)).toFixed(1)}`).join(' '))
const maydon = computed(() => props.data.length ? `${yol.value} L${x(props.data.length - 1).toFixed(1)},${H.value - P.b} L${x(0).toFixed(1)},${H.value - P.b} Z` : '')
const oxirgi = computed(() => qiymatlar.value[qiymatlar.value.length - 1] ?? 100)
const rang = computed(() => darajaOl(oxirgi.value).rang)
const chegaralar = computed(() => DARAJALAR.filter(d => d.min > shkala.value.lo && d.min < shkala.value.hi).map(d => ({ v: d.min, nom: d.nom, rang: d.rang })))
const OY = ['yan', 'fev', 'mar', 'apr', 'may', 'iyun', 'iyul', 'avg', 'sen', 'okt', 'noy', 'dek']
const yorliq = (k: string) => {
  if (props.guruh === 'oy') { const [yy, m] = k.split('-'); return `${OY[Number(m) - 1]} ${String(yy).slice(2)}` }
  const d = new Date(k + 'T00:00:00'); return `${d.getDate()}-${OY[d.getMonth()]}`
}
const xYorliqlar = computed(() => {
  const n = props.data.length; if (!n) return []
  const qadam = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((W.value - P.l) / 70))))
  // Oxirgi yorliq har doim ko'rinadi; undan oldingisi juda yaqin bo'lsa — tushib qoladi (ustma-ust chiqmasin)
  const r = props.data.map((d, i) => ({ i, k: d.k })).filter(o => o.i % qadam === 0)
  if (r.length && r[r.length - 1]!.i !== n - 1) { if (n - 1 - r[r.length - 1]!.i < qadam * 0.7) r.pop(); r.push({ i: n - 1, k: props.data[n - 1]!.k }) }
  return r
})
const hover = ref<number | null>(null)
function harakat(e: MouseEvent) {
  const r = (e.currentTarget as SVGElement).getBoundingClientRect()
  const px = e.clientX - r.left
  const n = props.data.length; if (!n) return
  const i = Math.round(((px - P.l) / Math.max(1, W.value - P.l - P.r)) * (n - 1))
  hover.value = Math.max(0, Math.min(n - 1, i))
}
const gid = `rch-${Math.random().toString(36).slice(2, 8)}`
</script>

<template>
  <div ref="quti" class="rch">
    <svg :width="W" :height="H" :viewBox="`0 0 ${W} ${H}`" @mousemove="harakat" @mouseleave="hover = null" role="img" aria-label="O'rtacha reyting dinamikasi">
      <defs>
        <linearGradient :id="gid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="rang" stop-opacity=".22"/><stop offset="100%" :stop-color="rang" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <!-- o'q va chegaralar -->
      <text :x="P.l - 6" :y="y(shkala.hi) + 4" class="rch-ax" text-anchor="end">{{ shkala.hi }}</text>
      <text :x="P.l - 6" :y="y(shkala.lo) + 4" class="rch-ax" text-anchor="end">{{ shkala.lo }}</text>
      <line :x1="P.l" :x2="W - P.r" :y1="H - P.b" :y2="H - P.b" class="rch-base"/>
      <g v-for="c in chegaralar" :key="c.v">
        <line :x1="P.l" :x2="W - P.r" :y1="y(c.v)" :y2="y(c.v)" :stroke="c.rang" class="rch-chegara"/>
        <text :x="W - P.r - 2" :y="y(c.v) - 4" text-anchor="end" class="rch-cheg-t" :fill="c.rang">{{ c.nom }} · {{ c.v }}</text>
      </g>
      <path v-if="data.length" :d="maydon" :fill="`url(#${gid})`"/>
      <path v-if="data.length" :d="yol" fill="none" :stroke="rang" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      <circle v-if="data.length" :cx="x(data.length - 1)" :cy="y(oxirgi)" r="4" :fill="rang" class="rch-nuqta"/>
      <text v-for="o in xYorliqlar" :key="o.i" :x="x(o.i)" :y="H - 6" class="rch-ax" text-anchor="middle">{{ yorliq(o.k) }}</text>
      <g v-if="hover !== null && data[hover]">
        <line :x1="x(hover)" :x2="x(hover)" :y1="P.t" :y2="H - P.b" class="rch-hover"/>
        <circle :cx="x(hover)" :cy="y(Number(data[hover]!.ortacha))" r="4.5" :fill="rang" class="rch-nuqta"/>
      </g>
    </svg>
    <div v-if="hover !== null && data[hover]" class="rch-tip" :style="{ left: Math.min(W - 120, Math.max(0, x(hover) - 60)) + 'px' }">
      <b :style="{ color: darajaOl(data[hover]!.ortacha).rang }">{{ data[hover]!.ortacha }}</b> · {{ yorliq(data[hover]!.k) }}
    </div>
  </div>
</template>

<style scoped>
.rch { position:relative; width:100%; }
.rch svg { display:block; overflow:visible; }
.rch-ax { font-size:10.5px; fill:#94a3b8; font-variant-numeric:tabular-nums; }
.rch-base { stroke:rgba(148,163,184,.35); stroke-width:1; }
.rch-chegara { stroke-dasharray:4 4; stroke-width:1; opacity:.45; }
.rch-cheg-t { font-size:10px; font-weight:700; opacity:.75; }
.rch-nuqta { stroke:var(--surface, #fff); stroke-width:2; }
.rch-hover { stroke:rgba(148,163,184,.5); stroke-width:1; stroke-dasharray:3 3; }
.rch-tip { position:absolute; top:-4px; width:120px; text-align:center; font-size:11.5px; color:#64748b; background:var(--surface, #fff); border:1px solid rgba(148,163,184,.3); border-radius:8px; padding:3px 6px; pointer-events:none; box-shadow:0 4px 12px rgba(15,23,42,.08); }
.rch-tip b { font-size:13px; }
</style>
