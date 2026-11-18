<template>
  <div class="fx">
    <!-- Xulosa qatori: hover bo'lmasa — eng faol vaqt -->
    <div class="fx-info" aria-live="polite">
      <template v-if="korsat">
        <span class="fx-info-k">{{ hover ? 'Tanlangan' : 'Eng faol vaqt' }}</span>
        <b>{{ korsat.kun }}, {{ pad(korsat.h) }}:00–{{ pad(korsat.h + 1) }}:00</b>
        <span class="fx-info-s">{{ korsat.son }} buyurtma · {{ fmtShort(korsat.summa) }} so'm</span>
      </template>
      <span v-else class="fx-info-s">So'nggi 8 haftada buyurtma yo'q</span>
    </div>

    <div class="fx-grid" :style="{ '--n': soatlar.length }" role="img"
      :aria-label="eng ? `Faollik xaritasi. Eng faol vaqt: ${eng.kun}, soat ${eng.h}:00` : 'Faollik xaritasi'"
      @mouseleave="hover = null">
      <!-- Yuqori gistogramma: soatlar bo'yicha jami -->
      <span class="fx-corner"/>
      <span v-for="(h, c) in soatlar" :key="'c' + h" class="fx-col" :class="{ on: hover?.c === c }">
        <i :style="{ height: pct(ustunJami[c] ?? 0, ustunMax), animationDelay: c * 25 + 'ms' }"/>
      </span>
      <span class="fx-corner"/>

      <template v-for="(kun, r) in KUNLAR" :key="kun.dw">
        <span class="fx-day" :class="{ on: hover?.r === r }">{{ kun.qisqa }}</span>
        <span v-for="(h, c) in soatlar" :key="kun.dw + '-' + h" class="fx-cell"
          :class="{ on: hover?.r === r && hover?.c === c, nol: !qiymat(r, c) }"
          :style="{ '--p': rang(qiymat(r, c)), animationDelay: (c * 22 + r * 45) + 'ms' }"
          :title="`${kun.toliq}, ${pad(h)}:00 — ${qiymat(r, c)} buyurtma`"
          @mouseenter="hover = { r, c }"/>
        <span class="fx-row" :class="{ on: hover?.r === r }">
          <i :style="{ width: pct(qatorJami[r] ?? 0, qatorMax), animationDelay: r * 50 + 'ms' }"/>
        </span>
      </template>

      <span/>
      <span v-for="h in soatlar" :key="'h' + h" class="fx-hr">{{ h % 2 === 0 ? pad(h) : '' }}</span>
      <span/>
    </div>

    <div class="fx-ft">
      <span class="fx-leg">
        Kam
        <i v-for="q in [0.15, 0.35, 0.55, 0.75, 1]" :key="q"
          :style="{ background: `color-mix(in oklab, var(--accent) ${Math.round(q * 100)}%, var(--surface-sunken))` }"/>
        Ko'p
      </span>
      <span class="fx-ft-s">so'nggi 8 hafta · buyurtmalar soni</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { fmtShort, HAFTA } from '../format'

interface Qator { dw: number; h: number; son: number; summa: number }
const props = defineProps<{ rows: Qator[] }>()

/* MySQL DAYOFWEEK: 1 = yakshanba ... 7 = shanba. Ko'rinish dushanbadan boshlanadi. */
const KUNLAR = [2, 3, 4, 5, 6, 7, 1].map(dw => {
  const toliq = HAFTA[dw - 1] ?? ''
  return { dw, toliq: toliq.charAt(0).toUpperCase() + toliq.slice(1), qisqa: toliq.slice(0, 2).replace(/^./, c => c.toUpperCase()) }
})

const hover = ref<{ r: number; c: number } | null>(null)
const pad = (n: number) => String(n).padStart(2, '0')

/* Ko'rinadigan soatlar oralig'i: ish vaqti (8–20) doim, faollik undan
   chiqsa kengayadi — tungi bo'sh ustunlar joy egallamaydi */
const soatlar = computed(() => {
  const faol = props.rows.filter(r => r.son > 0).map(r => r.h)
  const lo = Math.min(8, ...faol), hi = Math.max(20, ...faol)
  return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
})

const matritsa = computed(() => {
  const m = KUNLAR.map(() => soatlar.value.map(() => ({ son: 0, summa: 0 })))
  const lo = soatlar.value[0] ?? 0
  props.rows.forEach(r => {
    const ri = KUNLAR.findIndex(k => k.dw === r.dw)
    const cell = m[ri]?.[r.h - lo]
    if (cell) { cell.son += r.son; cell.summa += r.summa }
  })
  return m
})
function qiymat(r: number, c: number) { return matritsa.value[r]?.[c]?.son ?? 0 }

const katakMax  = computed(() => Math.max(1, ...matritsa.value.flat().map(x => x.son)))
const ustunJami = computed(() => soatlar.value.map((_, c) => matritsa.value.reduce((s, q) => s + (q[c]?.son ?? 0), 0)))
const qatorJami = computed(() => matritsa.value.map(q => q.reduce((s, x) => s + x.son, 0)))
const ustunMax  = computed(() => Math.max(1, ...ustunJami.value))
const qatorMax  = computed(() => Math.max(1, ...qatorJami.value))

/* Bitta rang (teal), och → to'q. Nol katak — sirt rangida qoladi */
function rang(v: number) { return v ? Math.round(15 + 85 * (v / katakMax.value)) + '%' : '0%' }
function pct(v: number, max: number) { return Math.max(v ? 6 : 0, (v / max) * 100) + '%' }

function katak(r: number, c: number) {
  const x = matritsa.value[r]?.[c]
  const kun = KUNLAR[r]
  return x && kun ? { kun: kun.toliq, h: soatlar.value[c] ?? 0, son: x.son, summa: x.summa } : null
}
const eng = computed(() => {
  let br = -1, bc = -1, max = 0
  matritsa.value.forEach((q, r) => q.forEach((x, c) => { if (x.son > max) { max = x.son; br = r; bc = c } }))
  return br >= 0 ? katak(br, bc) : null
})
const korsat = computed(() => hover.value ? katak(hover.value.r, hover.value.c) : eng.value)
</script>

<style scoped>
.fx { display:flex; flex-direction:column; gap:12px; }

.fx-info { display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; min-height:20px;
           font-size:12px; color:var(--ink-muted); }
.fx-info-k { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.06em;
             color:var(--accent); background:var(--accent-wash); padding:2px 7px; border-radius:20px; }
.fx-info b { font-size:13px; color:var(--ink); }
.fx-info-s { font-variant-numeric:tabular-nums; }

.fx-grid { display:grid; grid-template-columns:24px repeat(var(--n), minmax(0,1fr)) 48px;
           gap:3px; align-items:center; }
.fx-corner { height:28px; }

.fx-col { height:28px; display:flex; align-items:flex-end; }
.fx-col i { display:block; width:100%; border-radius:3px 3px 0 0;
            background:color-mix(in oklab, var(--accent) 40%, var(--surface-sunken));
            transform-origin:bottom; transition:background .15s, height .5s; }
.fx-col.on i { background:var(--accent); }

.fx-day { font-size:10.5px; font-weight:700; color:var(--ink-muted); transition:color .15s; }
.fx-day.on { color:var(--ink); }

.fx-cell { height:26px; border-radius:4px; cursor:crosshair;
           background:color-mix(in oklab, var(--accent) var(--p), var(--surface-sunken));
           transition:transform .15s, box-shadow .15s, background .4s; }
.fx-cell.nol { background:var(--surface-sunken); }
.fx-cell:hover, .fx-cell.on { transform:scale(1.18); position:relative; z-index:2;
                              box-shadow:0 0 0 2px var(--surface), 0 0 0 3.5px var(--ink); }

.fx-row { height:8px; border-radius:0 4px 4px 0; background:var(--surface-sunken); overflow:hidden; margin-left:4px; }
.fx-row i { display:block; height:100%; border-radius:0 4px 4px 0;
            background:color-mix(in oklab, var(--accent) 55%, var(--surface-sunken));
            transform-origin:left; transition:background .15s, width .5s; }
.fx-row.on i { background:var(--accent); }

.fx-hr { font-size:9px; color:var(--ink-muted); text-align:center; font-variant-numeric:tabular-nums; }

.fx-ft { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;
         font-size:10.5px; color:var(--ink-muted); }
.fx-leg { display:inline-flex; align-items:center; gap:3px; }
.fx-leg i { width:16px; height:9px; border-radius:2px; }
.fx-leg i:first-of-type { margin-left:4px; }
.fx-leg i:last-of-type { margin-right:4px; }

/* Kartaga ko'rinish maydoniga kirganda "to'lqin" bo'lib paydo bo'ladi */
.is-in .fx-cell { animation:fx-pop .5s cubic-bezier(.22,1,.36,1) both; }
.is-in .fx-col i { animation:fx-up .6s cubic-bezier(.22,1,.36,1) both; }
.is-in .fx-row i { animation:fx-right .6s cubic-bezier(.22,1,.36,1) both; }
@keyframes fx-pop   { from { opacity:0; transform:scale(.3) } }
@keyframes fx-up    { from { transform:scaleY(0) } }
@keyframes fx-right { from { transform:scaleX(0) } }

@media (prefers-reduced-motion: reduce) {
  .is-in .fx-cell, .is-in .fx-col i, .is-in .fx-row i { animation:none; }
}
</style>
