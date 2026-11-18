<script setup lang="ts">
/* Reyting ro'yxati: nom, qiymat va ulush chizig'i (agentlar, yetkazuvchilar,
   omborlar...). Qator bosilsa — 'tanla' hodisasi. */
import { computed } from 'vue'
import { qisqa, fmt } from './hisobot'

const props = withDefaults(defineProps<{
  items: { nom: string; qiymat: number; izoh?: string; ong?: string; rang?: string; id?: unknown }[]
  maks?: number
  toliq?: boolean
  raqamli?: boolean
}>(), { maks: 8, toliq: false, raqamli: true })
defineEmits<{ (e: 'tanla', item: any): void }>()

const katta = computed(() => Math.max(1, ...props.items.map(i => Math.abs(Number(i.qiymat) || 0))))
const kor = computed(() => props.items.slice(0, props.maks))
</script>

<template>
  <ol class="rr">
    <li v-for="(it, i) in kor" :key="String(it.id ?? it.nom)" @click="$emit('tanla', it)">
      <span v-if="raqamli" class="rr-o" :class="{ top: i < 3 }">{{ i + 1 }}</span>
      <div class="rr-b">
        <div class="rr-t">
          <span class="rr-n">{{ it.nom }}</span>
          <span class="rr-v">{{ toliq ? fmt(it.qiymat) : qisqa(it.qiymat) }}</span>
        </div>
        <div class="rr-bar"><i :style="{ width: Math.max(1.5, Math.abs(it.qiymat) / katta * 100) + '%', background: it.rang || 'var(--acc)' }"/></div>
        <div v-if="it.izoh || it.ong" class="rr-s"><span>{{ it.izoh }}</span><span>{{ it.ong }}</span></div>
      </div>
    </li>
    <li v-if="!kor.length" class="rr-bosh">Ma'lumot yo'q</li>
  </ol>
</template>

<style scoped>
.rr { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; }
.rr li { display:flex; align-items:flex-start; gap:12px; padding:9px 4px; border-bottom:1px solid var(--line2); }
.rr li:last-child { border-bottom:none; }
.rr-o { width:24px; height:24px; flex-shrink:0; border-radius:7px; background:var(--hov); color:var(--mut); font-size:11.5px; font-weight:600; display:flex; align-items:center; justify-content:center; font-variant-numeric:tabular-nums; }
.rr-o.top { background:var(--acc-soft); color:var(--acc); }
.rr-b { flex:1; min-width:0; display:flex; flex-direction:column; gap:5px; }
.rr-t { display:flex; align-items:baseline; gap:10px; }
.rr-n { flex:1; min-width:0; font-size:13px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.rr-v { font-size:13px; font-weight:650; font-variant-numeric:tabular-nums; white-space:nowrap; }
.rr-bar { height:5px; border-radius:3px; background:var(--act); overflow:hidden; }
.rr-bar i { display:block; height:100%; border-radius:3px; }
.rr-s { display:flex; justify-content:space-between; gap:10px; font-size:11.5px; color:var(--sub); }
.rr-bosh { color:var(--sub); font-size:13px; justify-content:center; padding:24px !important; }
</style>
