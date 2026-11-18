<script setup lang="ts">
/* Tovar tanlash — qidiruvli ro'yxat: nomi, turkumi, o'z omboridagi mavjud qoldiq va o'rtacha tannarx.
   Guruhlar: xom ashyo rejimida avval xom ashyo (Xom ashyo omboridan), keyin savdo tovarlari (asosiy skladdan);
   mahsulot rejimida avval savdo tovarlari (skladga kiradi), keyin yarim tayyor — xom ashyo turidagilar.
   Klaviatura: ↑ ↓ tanlash, Enter — olish, Esc — yopish. */
import { ref, computed, nextTick, watch, onBeforeUnmount } from 'vue'

export interface Tovar { id: number; nomi: string; turkum: string; olchov: string; qoldiq: number; tannarx: number; optom_narx: number; chakana_narx: number; turi?: 'tovar' | 'xom_ashyo'; ombor?: string }

const props = withDefaults(defineProps<{
  modelValue: number | null
  tovarlar: Tovar[]
  placeholder?: string
  /** "xom" — omborda bori yuqorida, qoldiq ko'rinadi; "mahsulot" — hammasi, sotuv narxi ko'rinadi */
  rejim?: 'xom' | 'mahsulot'
  band?: number[]
}>(), { placeholder: 'Tovar tanlang…', rejim: 'xom', band: () => [] })
const emit = defineEmits<{ (e: 'update:modelValue', v: number | null): void; (e: 'tanla', t: Tovar): void }>()

const ochiq = ref(false)
const q = ref('')
const faol = ref(0)
const inp = ref<HTMLInputElement | null>(null)
const tanlangan = computed(() => props.tovarlar.find(t => t.id === props.modelValue) || null)
const fmt = (v: number) => new Intl.NumberFormat('ru-RU').format(Math.round(v * 1000) / 1000)

const xomMi = (t: Tovar) => t.turi === 'xom_ashyo'
/* Guruh tartibi: rejimga mos tur birinchi; xom ashyoda — qoldig'i borlari yuqorida */
const guruhi = (t: Tovar) => (props.rejim === 'xom' ? (xomMi(t) ? 0 : 1) : (xomMi(t) ? 1 : 0))
const GURUH_NOM = computed(() => (props.rejim === 'xom'
  ? ['Xom ashyo · Xom ashyo omboridan', 'Savdo tovarlari · asosiy skladdan']
  : ['Savdo tovarlari · skladga kiradi', 'Yarim tayyor (xom ashyo) · Xom ashyo omboriga']))
const royxat = computed(() => {
  const s = q.value.trim().toLowerCase()
  let r = props.tovarlar.filter(t => !props.band.includes(t.id) || t.id === props.modelValue)
  if (s) r = r.filter(t => `${t.nomi} ${t.turkum}`.toLowerCase().includes(s))
  r = [...r].sort((a, b) => guruhi(a) - guruhi(b) || (props.rejim === 'xom' ? Number(b.qoldiq > 0) - Number(a.qoldiq > 0) : 0))
  return r.slice(0, 60)
})
/* Guruh sarlavhasi: ro'yxatdagi birinchi element yoki guruh almashgan joy */
const sarlavha = (i: number) => (i === 0 || guruhi(royxat.value[i]) !== guruhi(royxat.value[i - 1]) ? GURUH_NOM.value[guruhi(royxat.value[i])] : '')

/* Menyu qobiqqa (.shell) chiqariladi va qatorga nisbatan fixed joylanadi — karta (overflow) uni qirqmaydi.
   Pastda joy bo'lmasa tepaga ochiladi. */
const menuStil = ref<Record<string, string>>({})
function joyla() {
  const r = inp.value?.getBoundingClientRect()
  if (!r) return
  const pastda = window.innerHeight - r.bottom - 12
  const tepaga = pastda < 220 && r.top > pastda
  const balandlik = Math.max(160, Math.min(340, (tepaga ? r.top : pastda) - 8))
  const kenglik = Math.max(320, r.width)
  menuStil.value = {
    left: `${Math.max(8, Math.min(r.left, window.innerWidth - kenglik - 8))}px`, width: `${kenglik}px`, maxHeight: `${balandlik}px`,
    ...(tepaga ? { bottom: `${window.innerHeight - r.top + 4}px` } : { top: `${r.bottom + 4}px` }),
  }
}
watch(ochiq, v => {
  if (v) { window.addEventListener('scroll', joyla, true); window.addEventListener('resize', joyla) }
  else { window.removeEventListener('scroll', joyla, true); window.removeEventListener('resize', joyla) }
})
onBeforeUnmount(() => { window.removeEventListener('scroll', joyla, true); window.removeEventListener('resize', joyla) })
function och() { ochiq.value = true; q.value = ''; faol.value = 0; nextTick(() => { inp.value?.focus(); joyla() }) }
function tanla(t: Tovar) { emit('update:modelValue', t.id); emit('tanla', t); ochiq.value = false }
function tugma(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') { faol.value = Math.min(royxat.value.length - 1, faol.value + 1); e.preventDefault() }
  else if (e.key === 'ArrowUp') { faol.value = Math.max(0, faol.value - 1); e.preventDefault() }
  else if (e.key === 'Enter' && royxat.value[faol.value]) { tanla(royxat.value[faol.value]); e.preventDefault() }
  else if (e.key === 'Escape') ochiq.value = false
}
</script>

<template>
  <div class="tt">
    <button v-if="!ochiq" type="button" class="tt-btn" :class="{ bosh: !tanlangan }" :title="tanlangan ? `${tanlangan.nomi}${tanlangan.turkum ? ' · ' + tanlangan.turkum : ''}` : ''" @click="och">
      <span v-if="tanlangan" class="tt-nom">{{ tanlangan.nomi }}</span>
      <span v-else class="tt-ph">{{ placeholder }}</span>
      <svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>
    </button>
    <template v-else>
      <input ref="inp" v-model="q" class="tt-inp" :placeholder="tanlangan?.nomi || 'Nomi yoki turkum…'"
        @keydown="tugma" @blur="ochiq = false" @input="faol = 0" />
      <Teleport to=".shell">
      <div class="tt-menu" :style="menuStil" @mousedown.prevent>
        <div v-if="!royxat.length" class="tt-bos">Topilmadi</div>
        <template v-for="(t, i) in royxat" :key="t.id">
          <div v-if="sarlavha(i)" class="tt-g">{{ sarlavha(i) }}</div>
          <button type="button" class="tt-i" :class="{ on: i === faol }" @mouseenter="faol = i" @click="tanla(t)">
            <span class="tt-i-t"><b>{{ t.nomi }}</b><small>{{ t.turkum || '—' }}</small></span>
            <span v-if="rejim === 'xom'" class="tt-i-v" :class="{ yoq: t.qoldiq <= 0 }">
              {{ t.qoldiq > 0 ? `${fmt(t.qoldiq)} ${t.olchov}` : "omborda yo'q" }}<small v-if="t.tannarx">{{ fmt(t.tannarx) }} so'm</small>
            </span>
            <span v-else class="tt-i-v">{{ t.olchov }}<small v-if="t.chakana_narx">sotuv {{ fmt(t.chakana_narx) }}</small></span>
          </button>
        </template>
      </div>
      </Teleport>
    </template>
  </div>
</template>

<style scoped>
.tt { position:relative; min-width:0; }
.tt-btn, .tt-inp { width:100%; height:38px; border:1px solid var(--line); border-radius:9px; background:var(--surface); color:var(--ink); font:inherit; font-size:13px; }
.tt-btn { display:flex; align-items:center; gap:8px; padding:0 10px; cursor:pointer; text-align:left; }
.tt-btn:hover { border-color:var(--brand-300); }
.tt-btn svg { width:15px; height:15px; margin-left:auto; flex-shrink:0; fill:none; stroke:var(--sub); stroke-width:2; }
.tt-nom { flex:0 1 auto; min-width:0; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.tt-ph { color:var(--sub); }
.tt-btn.bosh { border-style:dashed; }
.tt-inp { padding:0 10px; border-color:var(--acc); box-shadow:0 0 0 3px var(--acc-soft); outline:none; }
.tt-menu { position:fixed; z-index:120; overflow:auto; background:var(--surface); border:1px solid var(--line); border-radius:11px; box-shadow:0 14px 34px rgba(15,23,42,.14); padding:5px; }
.tt-bos { padding:14px; color:var(--mut); font-size:13px; text-align:center; }
.tt-g { padding:8px 9px 4px; font-size:10.5px; font-weight:600; color:var(--sub); text-transform:uppercase; letter-spacing:.04em; }
.tt-g:not(:first-child) { margin-top:4px; border-top:1px solid var(--line); padding-top:10px; }
.tt-i { width:100%; display:flex; align-items:center; gap:10px; padding:8px 9px; border:0; border-radius:8px; background:transparent; color:var(--ink); font:inherit; text-align:left; cursor:pointer; }
.tt-i.on { background:var(--acc-soft); }
.tt-i-t { flex:1; min-width:0; display:flex; flex-direction:column; }
.tt-i-t b { font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.tt-i-t small, .tt-i-v small { font-size:11px; color:var(--sub); }
.tt-i-v { display:flex; flex-direction:column; align-items:flex-end; font-size:12.5px; font-weight:600; font-variant-numeric:tabular-nums; white-space:nowrap; }
.tt-i-v.yoq { color:var(--sub); font-weight:500; }
</style>
