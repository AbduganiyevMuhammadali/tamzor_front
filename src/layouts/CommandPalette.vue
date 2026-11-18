<script setup lang="ts">
/* Buyruq oynasi (⌘K / Ctrl+K): istalgan sahifa, ish navbati yoki amal —
   bir necha harf yozib Enter. Sichqonchasiz ishlash uchun. */
import { ref, computed, watch, nextTick } from 'vue'
import { tekis, type Buyruq } from './nav'

const props = defineProps<{ ochiq: boolean; buyruqlar: Buyruq[] }>()
const emit = defineEmits<{ (e: 'yop'): void }>()

const soz = ref('')
const tanlov = ref(0)
const kirit = ref<HTMLInputElement | null>(null)
const royxat = ref<HTMLElement | null>(null)

const natija = computed(() => {
  const q = tekis(soz.value)
  const bolak = q.split(' ').filter(Boolean)
  const mos = props.buyruqlar.filter(b => {
    if (!bolak.length) return true
    const matn = tekis(`${b.nom} ${b.izoh || ''} ${b.guruh} ${b.kalit || ''}`)
    return bolak.every(t => matn.includes(t))
  })
  // Nomining boshidan mos kelganlar yuqorida
  if (bolak.length) mos.sort((a, b) => Number(tekis(b.nom).startsWith(bolak[0]!)) - Number(tekis(a.nom).startsWith(bolak[0]!)))
  return mos.slice(0, 40)
})
const guruhlar = computed(() => {
  const g: { nom: string; items: { b: Buyruq; i: number }[] }[] = []
  natija.value.forEach((b, i) => {
    let x = g.find(y => y.nom === b.guruh)
    if (!x) g.push(x = { nom: b.guruh, items: [] })
    x.items.push({ b, i })
  })
  return g
})

watch(() => props.ochiq, async (v) => {
  if (!v) return
  soz.value = ''; tanlov.value = 0
  await nextTick(); kirit.value?.focus()
})
watch(soz, () => { tanlov.value = 0 })

function tugma(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') { e.preventDefault(); tanlov.value = Math.min(natija.value.length - 1, tanlov.value + 1); korinsin() }
  else if (e.key === 'ArrowUp') { e.preventDefault(); tanlov.value = Math.max(0, tanlov.value - 1); korinsin() }
  else if (e.key === 'Enter') { e.preventDefault(); bajar(natija.value[tanlov.value]) }
  else if (e.key === 'Escape') { e.preventDefault(); emit('yop') }
}
function korinsin() {
  nextTick(() => royxat.value?.querySelector('.cp-i.on')?.scrollIntoView({ block: 'nearest' }))
}
function bajar(b?: Buyruq) {
  if (!b) return
  emit('yop')
  b.bajar()
}
</script>

<template>
  <Transition name="cp">
    <div v-if="ochiq" class="cp-ov" @mousedown.self="emit('yop')">
      <div class="cp" role="dialog" aria-label="Buyruq oynasi">
        <div class="cp-hd">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input ref="kirit" v-model="soz" placeholder="Sahifa, vazifa yoki amalni qidiring" @keydown="tugma"/>
          <kbd>esc</kbd>
        </div>
        <div ref="royxat" class="cp-list">
          <div v-if="!natija.length" class="cp-bos">"{{ soz }}" bo'yicha hech narsa topilmadi</div>
          <section v-for="g in guruhlar" :key="g.nom">
            <div class="cp-g">{{ g.nom }}</div>
            <button v-for="{ b, i } in g.items" :key="b.id" class="cp-i" :class="{ on: i === tanlov }"
              @mouseenter="tanlov = i" @click="bajar(b)">
              <span class="cp-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" v-html="b.ikon"/></span>
              <span class="cp-t"><b>{{ b.nom }}</b><small v-if="b.izoh">{{ b.izoh }}</small></span>
              <span v-if="b.son" class="cp-son">{{ b.son }}</span>
              <span class="cp-enter">↵</span>
            </button>
          </section>
        </div>
        <div class="cp-ft"><span><kbd>↑</kbd><kbd>↓</kbd> tanlash</span><span><kbd>↵</kbd> ochish</span><span><kbd>⌘</kbd><kbd>K</kbd> istalgan joydan</span></div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.cp-ov { position:fixed; inset:0; z-index:200; background:rgba(15,23,42,.4); display:flex; justify-content:center; align-items:flex-start; padding-top:14vh; }
.cp { --cp-bg:#ffffff; --cp-ink:#0f172a; --cp-mut:#64748b; --cp-sub:#94a3b8; --cp-line:#e6e3ef; --cp-sel:var(--brand-50); --cp-tile:#f3f1f9; --cp-acc:var(--brand-600);
  width:min(600px, calc(100vw - 32px)); max-height:64vh; display:flex; flex-direction:column; border-radius:12px; overflow:hidden;
  background:var(--cp-bg); color:var(--cp-ink); border:1px solid var(--cp-line); box-shadow:0 24px 64px rgba(0,0,0,.18); }
.shell.dark .cp, :root[data-theme="dark"] .cp { --cp-bg:#16131f; --cp-ink:#e8eaf0; --cp-mut:#8b93a7; --cp-sub:#5f6a7e; --cp-line:#29243a; --cp-sel:rgba(139,92,246,.16); --cp-tile:#1e2536; --cp-acc:var(--brand-400); box-shadow:0 24px 64px rgba(0,0,0,.6); }
.cp-hd { flex-shrink:0; display:flex; align-items:center; gap:10px; padding:0 14px; height:52px; border-bottom:1px solid var(--cp-line); }
.cp-hd svg { width:19px; height:19px; color:var(--cp-acc); flex-shrink:0; }
.cp-hd input { flex:1; border:none; outline:none; background:transparent; color:inherit; font-family:inherit; font-size:15px; }
.cp-hd input::placeholder { color:var(--cp-sub); }
kbd { font:500 11px/1 ui-sans-serif, system-ui, sans-serif; padding:3px 5px; border-radius:5px; border:1px solid var(--cp-line); color:var(--cp-mut); margin-right:3px; }
.cp-list { flex:1; min-height:0; overflow-y:auto; padding:6px; }
.cp-g { font-size:11px; font-weight:600; color:var(--cp-sub); padding:10px 10px 4px; }
.cp-i { width:100%; display:flex; align-items:center; gap:12px; height:48px; padding:0 10px; border:none; background:none; color:inherit; border-radius:8px; cursor:pointer; text-align:left; font:inherit; }
.cp-i.on { background:var(--cp-sel); }
.cp-ic { width:32px; height:32px; flex-shrink:0; border-radius:8px; background:var(--cp-tile); color:var(--cp-mut); display:flex; align-items:center; justify-content:center; transition:background .1s, color .1s; }
.cp-ic svg { width:17px; height:17px; }
.cp-i.on .cp-ic { background:var(--cp-acc); color:#fff; }
.cp-t { flex:1; min-width:0; display:flex; align-items:baseline; gap:8px; }
.cp-t b { font-size:13.5px; font-weight:500; white-space:nowrap; }
.cp-t small { font-size:12.5px; color:var(--cp-sub); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.cp-son { min-width:24px; height:20px; padding:0 7px; border-radius:10px; background:var(--cp-acc); color:#fff; font-size:11.5px; font-weight:600; line-height:20px; text-align:center; font-variant-numeric:tabular-nums; }
.cp-enter { opacity:0; color:var(--cp-sub); font-size:13px; }
.cp-i.on .cp-enter { opacity:1; color:var(--cp-acc); }
.cp-bos { padding:28px; text-align:center; color:var(--cp-mut); font-size:13px; }
.cp-ft { flex-shrink:0; display:flex; gap:16px; padding:10px 14px; border-top:1px solid var(--cp-line); font-size:12px; color:var(--cp-sub); }
.cp-enter-active, .cp-leave-active { transition:opacity .12s; }
.cp-enter-active .cp, .cp-leave-active .cp { transition:transform .14s ease; }
.cp-enter-from, .cp-leave-to { opacity:0; }
.cp-enter-from .cp, .cp-leave-to .cp { transform:scale(.98); }
</style>
