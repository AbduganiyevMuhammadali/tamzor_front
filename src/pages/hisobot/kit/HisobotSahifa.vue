<script setup lang="ts">
/* Har bir hisobot sahifasining umumiy qolipi:
   sarlavha + "bu hisobot qaysi savolga javob beradi", davr tanlagich (barcha
   hisobotlar uchun umumiy), qo'shimcha filtrlar, eksport va
   "Qanday hisoblanadi?" izohi. */
import { ref, computed } from 'vue'
import { davr, PRESETLAR, presetDavr, presetTop, davrMatn, IKON } from './hisobot'
import './hisobot.css'

const props = withDefaults(defineProps<{
  ikon: string
  nom: string
  savol: string
  davrli?: boolean
  yuklanmoqda?: boolean
  izohlar?: { nom: string; matn: string }[]
}>(), { davrli: true, yuklanmoqda: false, izohlar: () => [] })
defineEmits<{ (e: 'yangila'): void }>()

const izohOchiq = ref(false)
const preset = computed(() => presetTop(davr.dan.value, davr.gacha.value))
function tanla(k: string) { const d = presetDavr(k); davr.dan.value = d.dan; davr.gacha.value = d.gacha }
function sana(k: 'dan' | 'gacha', v: string) {
  if (!v) return
  davr[k].value = v
  if (davr.dan.value > davr.gacha.value) (k === 'dan' ? davr.gacha : davr.dan).value = v
}
</script>

<template>
  <div class="hs">
    <header class="hs-hd">
      <div class="hs-hd-l">
        <span class="hs-hd-ic"><svg viewBox="0 0 24 24" v-html="ikon"/></span>
        <div class="hs-hd-t">
          <h1>{{ nom }}</h1>
          <p>{{ savol }}</p>
        </div>
      </div>
      <div class="hs-hd-r">
        <slot name="amal"/>
        <button v-if="izohlar.length" class="hs-btn hs-btn--s" :class="{ on: izohOchiq }" @click="izohOchiq = !izohOchiq">
          <svg viewBox="0 0 24 24" v-html="IKON.info"/>Qanday hisoblanadi?
        </button>
      </div>
    </header>

    <div v-if="davrli || $slots.filtr" class="hs-bar">
      <template v-if="davrli">
        <div class="hs-seg" role="group" aria-label="Davr">
          <button v-for="p in PRESETLAR" :key="p.k" :class="{ on: preset === p.k }" @click="tanla(p.k)">{{ p.nom }}</button>
        </div>
        <div class="hs-sana">
          <svg viewBox="0 0 24 24"><rect x="3" y="4.5" width="18" height="16.5" rx="2.2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/></svg>
          <input type="date" :value="davr.dan.value" :max="davr.gacha.value" @change="sana('dan', ($event.target as HTMLInputElement).value)"/>
          <span>–</span>
          <input type="date" :value="davr.gacha.value" @change="sana('gacha', ($event.target as HTMLInputElement).value)"/>
        </div>
        <span class="hs-davr-matn">{{ davrMatn(davr.dan.value, davr.gacha.value) }}</span>
      </template>
      <div class="hs-bar-filtr"><slot name="filtr"/></div>
      <span v-if="yuklanmoqda" class="hs-yukl"><i/>Yangilanmoqda</span>
    </div>

    <transition name="hs-izoh">
      <section v-if="izohOchiq" class="hs-izoh">
        <div class="hs-izoh-hd"><svg viewBox="0 0 24 24" v-html="IKON.info"/><b>Bu hisobot qanday hisoblanadi</b></div>
        <dl>
          <div v-for="i in izohlar" :key="i.nom"><dt>{{ i.nom }}</dt><dd>{{ i.matn }}</dd></div>
        </dl>
      </section>
    </transition>

    <slot/>
  </div>
</template>

<style scoped>
.hs { display:flex; flex-direction:column; gap:16px; padding-bottom:40px; color:var(--ink); }
.hs-hd { display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap; }
.hs-hd-l { display:flex; align-items:center; gap:14px; min-width:0; }
.hs-hd-ic { width:46px; height:46px; flex-shrink:0; border-radius:12px; background:var(--brand-600); color:#fff; display:flex; align-items:center; justify-content:center;
  box-shadow:0 6px 16px -6px rgba(79,70,229,.55); }
.hs-hd-ic svg { width:23px; height:23px; fill:none; stroke:currentColor; stroke-width:1.75; stroke-linecap:round; stroke-linejoin:round; }
.hs-hd-t h1 { font-size:22px; font-weight:650; letter-spacing:-.02em; margin:0; }
.hs-hd-t p { font-size:13.5px; color:var(--mut); margin:3px 0 0; }
.hs-hd-r { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }

.hs-bar { display:flex; align-items:center; gap:10px; flex-wrap:wrap; padding:10px; background:var(--surface); border:1px solid var(--line); border-radius:12px; }
.hs-seg { display:inline-flex; padding:3px; gap:2px; background:var(--bg); border:1px solid var(--line); border-radius:9px; }
.hs-seg button { height:30px; padding:0 11px; border:none; border-radius:7px; background:none; color:var(--mut); font:inherit; font-size:12.5px; font-weight:500; cursor:pointer; white-space:nowrap; }
.hs-seg button:hover { color:var(--ink); }
.hs-seg button.on { background:var(--surface); color:var(--acc); font-weight:600; box-shadow:0 1px 2px rgba(15,23,42,.08), 0 0 0 1px var(--line); }
.hs-sana { display:inline-flex; align-items:center; gap:6px; height:38px; padding:0 10px; border:1px solid var(--line); border-radius:9px; background:var(--surface); color:var(--mut); font-size:13px; }
.hs-sana svg { width:16px; height:16px; fill:none; stroke:currentColor; stroke-width:1.75; stroke-linecap:round; }
.hs-sana input { border:none; background:none; color:var(--ink); font:inherit; font-size:13px; width:118px; }
.shell.dark .hs-sana input { color-scheme:dark; }
.hs-davr-matn { font-size:12.5px; color:var(--sub); }
.hs-bar-filtr { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-left:auto; }
.hs-yukl { display:inline-flex; align-items:center; gap:7px; font-size:12px; color:var(--mut); }
.hs-yukl i { width:12px; height:12px; border:2px solid var(--line); border-top-color:var(--acc); border-radius:50%; animation:hs-spin .8s linear infinite; }
@keyframes hs-spin { to { transform:rotate(360deg) } }

.hs-izoh { background:var(--acc-soft); border:1px solid color-mix(in srgb, var(--acc) 25%, var(--line)); border-radius:12px; padding:14px 18px; }
.hs-izoh-hd { display:flex; align-items:center; gap:8px; color:var(--acc-ink); font-size:13.5px; margin-bottom:10px; }
.hs-izoh-hd svg { width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:1.75; stroke-linecap:round; }
.hs-izoh dl { margin:0; display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:10px 24px; }
.hs-izoh dt { font-size:12.5px; font-weight:600; color:var(--ink); }
.hs-izoh dd { margin:2px 0 0; font-size:12.5px; color:var(--ink2); line-height:1.5; }
.hs-izoh-enter-active, .hs-izoh-leave-active { transition:opacity .15s, transform .15s; }
.hs-izoh-enter-from, .hs-izoh-leave-to { opacity:0; transform:translateY(-4px); }
@media (max-width:760px) { .hs-bar-filtr { margin-left:0; } .hs-sana input { width:110px; } .hs-seg { flex-wrap:wrap; max-width:100%; } .hs-davr-matn { display:none; } }
</style>
