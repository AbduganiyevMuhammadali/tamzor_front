<template>
  <div class="ah">
    <div class="ah-ring">
      <svg viewBox="0 0 168 168" role="img"
        :aria-label="`Agentlar reja bajarilishi: ${halqalar.map(h => h.fullname + ' ' + h.foiz + '%').join(', ')}`">
        <g v-for="(h, i) in halqalar" :key="h.id"
          :opacity="hover !== null && hover !== i ? .3 : 1" class="ah-g"
          @mouseenter="hover = i" @mouseleave="hover = null">
          <circle cx="84" cy="84" :r="h.r" fill="none" stroke="var(--surface-sunken)" :stroke-width="SW"/>
          <circle cx="84" cy="84" :r="h.r" fill="none" :stroke="`var(${h.c})`" :stroke-width="SW"
            stroke-linecap="round" transform="rotate(-90 84 84)" class="ah-arc"
            :stroke-dasharray="h.C" :stroke-dashoffset="h.C * (1 - Math.min(100, h.foiz) / 100)"
            :style="{ '--C': h.C + 'px', animationDelay: i * 140 + 'ms' }"/>
        </g>
      </svg>
      <div class="ah-c">
        <b><AnimNum :value="umumiy" :format="v => Math.round(v) + '%'"/></b>
        <span>jamoa</span>
      </div>
    </div>

    <div class="ah-list">
      <button v-for="(h, i) in halqalar" :key="h.id" class="ah-r" :class="{ on: hover === i }"
        @mouseenter="hover = i" @mouseleave="hover = null" @click="router.push('/agentlar/nazorat')">
        <span class="ah-sw" :style="{ background: `var(${h.c})` }"/>
        <span class="ah-b">
          <span class="ah-t">{{ h.fullname }}</span>
          <span class="ah-s">{{ fmtShort(h.savdo) }} / {{ fmtShort(h.plan) }}</span>
        </span>
        <span class="ah-tag" :class="daraja(h.foiz)">{{ h.foiz }}%</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import AnimNum from './AnimNum.vue'
import { fmtShort } from '../format'

interface Agent { id: number; fullname: string; savdo: number; plan: number; foiz: number }
const props = defineProps<{ agentlar: Agent[] }>()
const router = useRouter()
const hover = ref<number | null>(null)

const SW = 10, R0 = 76, QADAM = 14
const CAT = ['--c1', '--c2', '--c3', '--c4', '--c5']

/* Rang agentga biriktiriladi (id tartibida), reytingdagi o'rniga emas —
   davr almashib tartib o'zgarganda ham agent o'z rangida qoladi */
const halqalar = computed(() => {
  const idTartib = [...props.agentlar].map(a => a.id).sort((a, b) => a - b)
  return props.agentlar.slice(0, 5).map((a, i) => {
    const r = R0 - i * QADAM
    return { ...a, r, C: 2 * Math.PI * r, c: CAT[idTartib.indexOf(a.id) % CAT.length] ?? '--c1' }
  })
})
const umumiy = computed(() => {
  const plan = props.agentlar.reduce((s, a) => s + a.plan, 0)
  const savdo = props.agentlar.reduce((s, a) => s + a.savdo, 0)
  return plan ? Math.min(100, (savdo / plan) * 100) : 0
})
function daraja(f: number) { return f >= 100 ? 'is-ok' : f >= 70 ? 'is-warn' : 'is-crit' }
</script>

<style scoped>
.ah { display:flex; align-items:center; gap:18px; flex-wrap:wrap; }
.ah-ring { position:relative; width:168px; height:168px; flex-shrink:0; }
.ah-ring svg { width:100%; height:100%; overflow:visible; }
.ah-g { cursor:pointer; transition:opacity .18s; }
.ah-c { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center;
        justify-content:center; pointer-events:none; }
.ah-c b { font-size:15px; font-weight:800; color:var(--ink); line-height:1; }
.ah-c > span { font-size:9px; color:var(--ink-muted); margin-top:2px; }

.ah-list { flex:1; min-width:190px; display:flex; flex-direction:column; gap:2px; }
.ah-r { display:flex; align-items:center; gap:10px; padding:8px 8px; border-radius:9px; border:none;
        background:none; cursor:pointer; font:inherit; text-align:left; transition:background .14s; }
.ah-r:hover, .ah-r.on { background:var(--surface-sunken); }
.ah-sw { width:10px; height:10px; border-radius:50%; flex-shrink:0; box-shadow:0 0 0 2px var(--surface); }
.ah-b { flex:1; min-width:0; display:block; }
.ah-t { display:block; font-size:12.5px; font-weight:600; color:var(--ink);
        overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ah-s { display:block; font-size:10.5px; color:var(--ink-muted); font-variant-numeric:tabular-nums; }
.ah-tag { font-size:10.5px; font-weight:800; padding:2px 8px; border-radius:20px; font-variant-numeric:tabular-nums; }
.ah-tag.is-ok   { background:var(--good-wash);     color:var(--good); }
.ah-tag.is-warn { background:var(--warning-wash);  color:var(--warning); }
.ah-tag.is-crit { background:var(--critical-wash); color:var(--critical); }

.ah-arc { transition:stroke-dashoffset .8s cubic-bezier(.4,0,.2,1); }
.is-in .ah-arc { animation:ah-sweep 1.4s cubic-bezier(.22,1,.36,1) both; }
@keyframes ah-sweep { from { stroke-dashoffset:var(--C) } }

@media (prefers-reduced-motion: reduce) { .is-in .ah-arc { animation:none; } }
</style>
