<template>
  <div class="ms">
    <div class="ms-top">
      <div class="ms-ring">
        <svg viewBox="0 0 120 120" role="img"
          :aria-label="`Mijozlar: ${segs.map(s => s.label + ' ' + s.son).join(', ')}`">
          <defs>
            <mask id="msSweep">
              <circle cx="60" cy="60" r="46" fill="none" stroke="#fff" stroke-width="22"
                :stroke-dasharray="C46" :stroke-dashoffset="C46" transform="rotate(-90 60 60)" class="ms-sweep"/>
            </mask>
          </defs>
          <circle cx="60" cy="60" r="46" fill="none" stroke="var(--surface-sunken)" stroke-width="13"/>
          <g mask="url(#msSweep)">
            <circle v-for="(s, i) in arcs" :key="s.key" cx="60" cy="60" r="46" fill="none"
              :stroke="`var(${s.c})`" :stroke-width="hover === i ? 16 : 13"
              :stroke-dasharray="`${s.len} ${C46 - s.len}`" :stroke-dashoffset="-s.off"
              transform="rotate(-90 60 60)" class="ms-arc"
              :opacity="hover !== null && hover !== i ? .35 : 1"
              @mouseenter="hover = i" @mouseleave="hover = null"/>
          </g>
        </svg>
        <div class="ms-c">
          <b><AnimNum :value="markaz.foiz" :format="v => Math.round(v) + '%'"/></b>
          <span>{{ markaz.label }}</span>
        </div>
      </div>

      <div class="ms-leg">
        <div v-for="(s, i) in segs" :key="s.key" class="ms-leg-r" :class="{ on: hover === i }"
          :style="{ '--c': `var(${s.c})` }" @mouseenter="hover = i" @mouseleave="hover = null">
          <span class="ms-leg-ic" v-html="s.icon" aria-hidden="true"/>
          <span class="ms-leg-b">
            <span class="ms-leg-t">{{ s.label }}</span>
            <span class="ms-leg-s">{{ s.izoh }}</span>
          </span>
          <b><AnimNum :value="s.son"/></b>
          <span class="ms-leg-f">{{ foiz(s.son) }}%</span>
        </div>
      </div>
    </div>

    <div class="ms-back">
      <div class="ms-back-hd">Qayta jalb qilish kerak</div>
      <div v-if="!holat.qayta_jalb.length" class="ms-back-ok">
        <span v-html="IC.check" aria-hidden="true"/>Barcha xaridorlar so'nggi 30 kunda faol
      </div>
      <button v-for="m in holat.qayta_jalb" :key="m.id" class="ms-back-r" @click="router.push('/mijozlar')">
        <span class="ms-av">{{ (m.nomi || '?')[0] }}</span>
        <span class="ms-back-b">
          <span class="ms-back-t">{{ m.nomi }}</span>
          <span class="ms-back-s">{{ m.kun }} kundan beri xarid yo'q</span>
        </span>
        <span class="ms-back-v">{{ fmtShort(m.jami) }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import AnimNum from './AnimNum.vue'
import { fmtShort } from '../format'

interface Holat {
  jami: number; faol: number; sust: number; yoqotilgan: number; hech: number
  qayta_jalb: { id: number; nomi: string; telefon: string; kun: number; jami: number }[]
}
const props = defineProps<{ holat: Holat }>()
const router = useRouter()
const hover = ref<number | null>(null)
const C46 = 2 * Math.PI * 46

const IC = {
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 6L9 17l-5-5"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  x:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  dash:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14"/></svg>',
}

/* Holat ranglari ma'no tashiydi (yaxshi / ogohlantirish / xavf) —
   shuning uchun har biri belgi va yozuv bilan birga chiqadi */
const segs = computed(() => [
  { key: 'faol',  label: 'Faol',            izoh: '30 kun ichida xarid',  son: props.holat.faol,       c: '--good',         icon: IC.check },
  { key: 'sust',  label: 'Sust',            izoh: '31–90 kun oldin',      son: props.holat.sust,       c: '--warning',      icon: IC.clock },
  { key: 'yoq',   label: "Yo'qotilgan",     izoh: '90 kundan ortiq',      son: props.holat.yoqotilgan, c: '--critical',     icon: IC.x },
  { key: 'hech',  label: 'Xarid qilmagan',  izoh: 'hali buyurtma yo‘q',   son: props.holat.hech,       c: '--neutral-mark', icon: IC.dash },
])
const jami = computed(() => segs.value.reduce((s, x) => s + x.son, 0) || 1)
function foiz(n: number) { return Math.round((n / jami.value) * 100) }

const arcs = computed(() => {
  const korinadi = segs.value.filter(s => s.son > 0).length
  let off = 0
  return segs.value.map(s => {
    const toliq = C46 * (s.son / jami.value)
    const bosh = korinadi > 1 && s.son > 0 ? Math.min(2, toliq / 2) : 0
    const a = { ...s, len: Math.max(0, toliq - bosh), off }
    off += toliq
    return a
  })
})

const markaz = computed(() => {
  const s = hover.value !== null ? segs.value[hover.value] : segs.value[0]
  return { foiz: s ? (s.son / jami.value) * 100 : 0, label: s ? s.label.toLowerCase() : '' }
})
</script>

<style scoped>
.ms { display:flex; flex-direction:column; gap:14px; }
.ms-top { display:flex; align-items:center; gap:16px; flex-wrap:wrap; }

.ms-ring { position:relative; width:132px; height:132px; flex-shrink:0; }
.ms-ring svg { width:100%; height:100%; }
.ms-arc { cursor:pointer; transition:stroke-width .18s, opacity .18s; }
.ms-c { position:absolute; inset:28px; display:flex; flex-direction:column; align-items:center;
        justify-content:center; pointer-events:none; text-align:center; }
.ms-c b { font-size:22px; font-weight:800; color:var(--ink); letter-spacing:-.02em; line-height:1.05; }
.ms-c > span { font-size:10px; color:var(--ink-muted); margin-top:2px; }

.ms-leg { flex:1; min-width:170px; display:flex; flex-direction:column; gap:2px; }
.ms-leg-r { display:flex; align-items:center; gap:9px; padding:6px 7px; border-radius:8px;
            transition:background .14s; cursor:default; }
.ms-leg-r.on { background:var(--surface-sunken); }
.ms-leg-ic { width:22px; height:22px; border-radius:7px; flex-shrink:0; display:flex; align-items:center;
             justify-content:center; color:var(--c);
             background:color-mix(in oklab, var(--c) 14%, transparent); }
.ms-leg-ic :deep(svg) { width:12px; height:12px; }
.ms-leg-b { flex:1; min-width:0; display:block; }
.ms-leg-t { display:block; font-size:12px; font-weight:600; color:var(--ink); }
.ms-leg-s { display:block; font-size:10px; color:var(--ink-muted); }
.ms-leg-r b { font-size:13px; color:var(--ink); font-variant-numeric:tabular-nums; }
.ms-leg-f { min-width:38px; text-align:right; font-size:10.5px; font-weight:800; color:var(--ink-muted);
            font-variant-numeric:tabular-nums; }

.ms-back { display:flex; flex-direction:column; gap:2px; border-top:1px solid var(--border); padding-top:12px; }
.ms-back-hd { font-size:10.5px; font-weight:800; text-transform:uppercase; letter-spacing:.06em;
              color:var(--ink-muted); margin-bottom:4px; }
.ms-back-ok { display:flex; align-items:center; gap:8px; font-size:12px; color:var(--ink-secondary);
              padding:9px 10px; border-radius:9px; background:var(--good-wash); }
.ms-back-ok :deep(svg) { width:14px; height:14px; color:var(--good); }
.ms-back-r { display:flex; align-items:center; gap:10px; padding:7px 8px; border-radius:9px; border:none;
             background:none; cursor:pointer; font:inherit; text-align:left; transition:background .14s; }
.ms-back-r:hover { background:var(--surface-sunken); }
.ms-av { width:28px; height:28px; border-radius:9px; flex-shrink:0; display:flex; align-items:center;
         justify-content:center; font-size:12px; font-weight:800;
         background:var(--warning-wash); color:var(--warning); }
.ms-back-b { flex:1; min-width:0; display:block; }
.ms-back-t { display:block; font-size:12.5px; font-weight:600; color:var(--ink);
             overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ms-back-s { display:block; font-size:10.5px; color:var(--ink-muted); }
.ms-back-v { font-size:12.5px; font-weight:800; color:var(--ink); font-variant-numeric:tabular-nums; }

/* Halqa soat yo'nalishida "chizilib" chiqadi */
.ms-sweep { stroke-dashoffset:0; }
.is-in .ms-sweep { animation:ms-sweep 1.3s cubic-bezier(.65,0,.35,1) both .1s; }
@keyframes ms-sweep { from { stroke-dashoffset:289.03px } }

@media (prefers-reduced-motion: reduce) { .is-in .ms-sweep { animation:none; } }
</style>
