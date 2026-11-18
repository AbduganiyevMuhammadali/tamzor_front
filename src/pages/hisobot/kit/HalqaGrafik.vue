<script setup lang="ts">
/* Halqa (donut) grafik + legenda: ulushlarni ko'rsatish uchun
   (to'lov turlari, turkumlar, ombor tarkibi). Kichik bo'laklar "Boshqa"ga yig'iladi. */
import { ref, computed } from 'vue'
import { qisqa, fmt, foizFmt, RAMPA } from './hisobot'

const props = withDefaults(defineProps<{
  items: { nom: string; qiymat: number; rang?: string }[]
  markaz?: string
  markazIzoh?: string
  maks?: number
  olcham?: number
}>(), { markaz: '', markazIzoh: '', maks: 6, olcham: 168 })

const jami = computed(() => props.items.reduce((s, i) => s + Math.max(0, Number(i.qiymat) || 0), 0))
const bolaklar = computed(() => {
  const saralangan = [...props.items].filter(i => Number(i.qiymat) > 0).sort((a, b) => b.qiymat - a.qiymat)
  const kor = saralangan.slice(0, props.maks)
  const qolgan = saralangan.slice(props.maks)
  if (qolgan.length) kor.push({ nom: `Boshqa (${qolgan.length})`, qiymat: qolgan.reduce((s, i) => s + i.qiymat, 0), rang: '#94a3b8' })
  let burchak = -Math.PI / 2
  return kor.map((i, idx) => {
    const ulush = jami.value ? i.qiymat / jami.value : 0
    const a0 = burchak, a1 = burchak + ulush * Math.PI * 2
    burchak = a1
    return { ...i, rang: i.rang || RAMPA[idx % RAMPA.length], ulush, a0, a1 }
  })
})
const R = computed(() => props.olcham / 2), r = computed(() => props.olcham / 2 - 22)
function yoy(a0: number, a1: number) {
  const c = props.olcham / 2
  if (a1 - a0 >= Math.PI * 2 - 1e-6) a1 = a0 + Math.PI * 2 - 1e-4
  const kat = a1 - a0 > Math.PI ? 1 : 0
  const p = (rad: number, a: number) => `${(c + rad * Math.cos(a)).toFixed(2)},${(c + rad * Math.sin(a)).toFixed(2)}`
  return `M${p(R.value, a0)} A${R.value},${R.value} 0 ${kat} 1 ${p(R.value, a1)} L${p(r.value, a1)} A${r.value},${r.value} 0 ${kat} 0 ${p(r.value, a0)} Z`
}
const faol = ref<number | null>(null)
const faolB = computed(() => (faol.value === null ? null : bolaklar.value[faol.value] || null))
</script>

<template>
  <div class="hg">
    <div class="hg-q" :style="{ width: olcham + 'px', height: olcham + 'px' }">
      <svg :width="olcham" :height="olcham">
        <circle v-if="!bolaklar.length" :cx="olcham / 2" :cy="olcham / 2" :r="(R + r) / 2" fill="none" stroke="var(--act)" :stroke-width="R - r"/>
        <path v-for="(b, i) in bolaklar" :key="b.nom" :d="yoy(b.a0, b.a1)" :fill="b.rang" stroke="var(--surface)" stroke-width="1.5"
          :opacity="faol === null || faol === i ? 1 : .35" @mouseenter="faol = i" @mouseleave="faol = null"/>
      </svg>
      <div class="hg-m">
        <template v-if="faolB">
          <b>{{ foizFmt(faolB.ulush * 100) }}</b><span>{{ faolB.nom }}</span>
        </template>
        <template v-else><b>{{ markaz || qisqa(jami) }}</b><span>{{ markazIzoh }}</span></template>
      </div>
    </div>
    <ul class="hg-leg">
      <li v-for="(b, i) in bolaklar" :key="b.nom" :class="{ on: faol === i }" @mouseenter="faol = i" @mouseleave="faol = null">
        <i :style="{ background: b.rang }"/>
        <span class="hg-n">{{ b.nom }}</span>
        <span class="hg-v">{{ fmt(b.qiymat) }}</span>
        <span class="hg-p">{{ foizFmt(b.ulush * 100) }}</span>
      </li>
      <li v-if="!bolaklar.length" class="hg-bosh">Ma'lumot yo'q</li>
    </ul>
  </div>
</template>

<style scoped>
.hg { display:flex; align-items:center; gap:22px; flex-wrap:wrap; }
.hg-q { position:relative; flex-shrink:0; }
.hg-q svg { display:block; }
.hg-q path { transition:opacity .12s; cursor:default; }
.hg-m { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; pointer-events:none; padding:0 30px; }
.hg-m b { font-size:18px; font-weight:650; letter-spacing:-.02em; font-variant-numeric:tabular-nums; }
.hg-m span { font-size:11.5px; color:var(--mut); line-height:1.3; }
.hg-leg { flex:1; min-width:200px; list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:2px; }
.hg-leg li { display:flex; align-items:center; gap:9px; padding:6px 8px; border-radius:7px; font-size:12.5px; }
.hg-leg li.on { background:var(--hov); }
.hg-leg i { width:10px; height:10px; border-radius:3px; flex-shrink:0; }
.hg-n { flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:var(--ink2); }
.hg-v { font-weight:600; font-variant-numeric:tabular-nums; }
.hg-p { width:48px; text-align:right; color:var(--mut); font-variant-numeric:tabular-nums; }
.hg-bosh { color:var(--sub); }
</style>
