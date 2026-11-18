<template>
  <div class="ko">
    <div class="ko-sum">
      <div class="ko-sum-i">
        <span class="ko-sw" style="background:var(--c1)"/>
        <span class="ko-sum-l">Kirim</span>
        <b><AnimNum :value="jami.kirim" :format="fmtShort"/></b>
      </div>
      <div class="ko-sum-i">
        <span class="ko-sw" style="background:var(--c2)"/>
        <span class="ko-sum-l">Chiqim</span>
        <b><AnimNum :value="jami.chiqim" :format="fmtShort"/></b>
      </div>
      <div class="ko-sum-i ko-sum-i--net">
        <span class="ko-sum-l">Sof oqim</span>
        <b :class="jami.kirim - jami.chiqim >= 0 ? 'ko-ok' : 'ko-bad'">
          {{ jami.kirim - jami.chiqim >= 0 ? '+' : '' }}<AnimNum :value="jami.kirim - jami.chiqim" :format="fmtShort"/>
        </b>
      </div>
    </div>

    <div v-if="!jami.kirim && !jami.chiqim" class="ko-empty">So'nggi 14 kunda kassa harakati yo'q</div>

    <div v-else class="ko-plot" @mouseleave="hover = null" role="img"
      :aria-label="`So'nggi 14 kun: kirim ${fmtShort(jami.kirim)}, chiqim ${fmtShort(jami.chiqim)} so'm`">
      <!-- Yuqori va pastki chegara belgilari -->
      <span class="ko-tick" :style="{ top: '0%' }">{{ fmtTick(shkala * yuqori) }}</span>
      <span class="ko-tick" :style="{ top: yuqori + '%' }">0</span>
      <span class="ko-tick" :style="{ top: '100%' }">−{{ fmtTick(shkala * (100 - yuqori)) }}</span>
      <span class="ko-base" :style="{ top: yuqori + '%' }"/>

      <div class="ko-cols">
        <div v-for="(k, i) in kunlar" :key="k.sana" class="ko-col" :class="{ on: hover === i }"
          @mouseenter="hover = i">
          <div class="ko-up" :style="{ height: yuqori + '%' }">
            <span v-if="k.kirim" class="ko-bar ko-bar--up"
              :style="{ height: balandlik(k.kirim, yuqori), animationDelay: i * 40 + 'ms' }"/>
          </div>
          <div class="ko-dn" :style="{ height: (100 - yuqori) + '%' }">
            <span v-if="k.chiqim" class="ko-bar ko-bar--dn"
              :style="{ height: balandlik(k.chiqim, 100 - yuqori), animationDelay: i * 40 + 120 + 'ms' }"/>
          </div>
        </div>
      </div>

      <div v-if="hover !== null && kunlar[hover]" class="ko-tip"
        :style="hover > kunlar.length / 2 ? { right: (100 - (hover / kunlar.length) * 100) + '%' } : { left: ((hover + 1) / kunlar.length) * 100 + '%' }">
        <div class="ko-tip-t">{{ sanaUz(kunDan(kunlar[hover]!.sana), true) }}</div>
        <div class="ko-tip-r"><i style="background:var(--c1)"/>Kirim<b>{{ fmtNum(kunlar[hover]!.kirim) }}</b></div>
        <div class="ko-tip-r"><i style="background:var(--c2)"/>Chiqim<b>{{ fmtNum(kunlar[hover]!.chiqim) }}</b></div>
        <div class="ko-tip-r">Sof<b>{{ fmtNum(kunlar[hover]!.kirim - kunlar[hover]!.chiqim) }}</b></div>
      </div>
    </div>

    <div class="ko-x">
      <span v-for="(k, i) in kunlar" :key="'x' + k.sana">
        {{ i === kunlar.length - 1 ? 'bugun' : i % 2 === 1 ? kunDan(k.sana).getDate() : '' }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AnimNum from './AnimNum.vue'
import { fmtNum, fmtShort, fmtTick, sanaUz, kunDan } from '../format'

interface Kun { sana: string; kirim: number; chiqim: number }
const props = defineProps<{ kunlar: Kun[] }>()

const hover = ref<number | null>(null)
const jami = computed(() => props.kunlar.reduce(
  (s, k) => ({ kirim: s.kirim + k.kirim, chiqim: s.chiqim + k.chiqim }), { kirim: 0, chiqim: 0 }))
const maxK = computed(() => Math.max(0, ...props.kunlar.map(k => k.kirim)))
const maxC = computed(() => Math.max(0, ...props.kunlar.map(k => k.chiqim)))
/* Nol chizig'i kirim/chiqim maksimumlari nisbatida joylashadi (chetlarda
   kamida 12% joy qoladi). Shkala bitta: bir xil summa yuqorida ham,
   pastda ham bir xil uzunlikda chiziladi. */
const yuqori = computed(() => {
  const k = maxK.value, c = maxC.value
  if (!k && !c) return 50
  return Math.min(88, Math.max(12, (k / (k + c)) * 100))
})
/* so'm / grafik-foizi: ikkala yarim ham sig'adigan eng kichik shkala */
const shkala = computed(() =>
  Math.max(maxK.value / yuqori.value, maxC.value / (100 - yuqori.value)) || 1)
function balandlik(v: number, qism: number) { return ((v / shkala.value) / qism) * 100 + '%' }
</script>

<style scoped>
.ko { display:flex; flex-direction:column; gap:12px; }

.ko-sum { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; }
.ko-sum-i { display:flex; flex-direction:column; gap:2px; padding:9px 11px; border-radius:10px;
            background:var(--surface-sunken); min-width:0; position:relative; }
.ko-sum-i b { font-size:15px; font-weight:800; color:var(--ink); font-variant-numeric:tabular-nums;
              white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ko-sum-l { font-size:10.5px; color:var(--ink-muted); }
.ko-sw { position:absolute; top:11px; right:11px; width:9px; height:9px; border-radius:3px; }
.ko-ok  { color:var(--good) !important; }
.ko-bad { color:var(--critical) !important; }

.ko-empty { padding:40px 12px; text-align:center; color:var(--ink-muted); font-size:12.5px; }

.ko-plot { position:relative; height:180px; margin-right:52px; }
.ko-tick { position:absolute; right:-52px; width:46px; transform:translateY(-50%);
           font-size:9px; color:var(--ink-muted); font-variant-numeric:tabular-nums; }
.ko-base { position:absolute; left:0; right:0; height:1px; background:var(--grid); }

.ko-cols { position:absolute; inset:0; display:flex; gap:2px; }
.ko-col { flex:1; display:flex; flex-direction:column; border-radius:6px; transition:background .15s; cursor:default; }
.ko-col.on { background:color-mix(in oklab, var(--ink) 5%, transparent); }
.ko-up, .ko-dn { display:flex; justify-content:center; }
.ko-up { align-items:flex-end; padding-bottom:1px; }
.ko-dn { align-items:flex-start; padding-top:1px; }
.ko-bar { display:block; width:58%; max-width:20px; min-height:2px; transition:height .5s cubic-bezier(.4,0,.2,1), opacity .15s; }
.ko-bar--up { background:var(--c1); border-radius:4px 4px 0 0; transform-origin:bottom; }
.ko-bar--dn { background:var(--c2); border-radius:0 0 4px 4px; transform-origin:top; }
.ko-plot:hover .ko-col:not(.on) .ko-bar { opacity:.45; }

.ko-tip { position:absolute; top:4px; z-index:5; margin:0 8px; min-width:150px; pointer-events:none;
          background:var(--surface); border:1px solid var(--border); border-radius:10px;
          padding:9px 11px; box-shadow:var(--shadow-lift); font-size:11.5px; }
.ko-tip-t { font-weight:800; color:var(--ink); margin-bottom:5px; }
.ko-tip-r { display:flex; align-items:center; gap:7px; color:var(--ink-muted); padding:1px 0; }
.ko-tip-r i { width:8px; height:8px; border-radius:2px; }
.ko-tip-r b { margin-left:auto; color:var(--ink); font-variant-numeric:tabular-nums; }

.ko-x { display:flex; gap:2px; margin-right:52px; }
.ko-x span { flex:1; text-align:center; font-size:9px; color:var(--ink-muted); font-variant-numeric:tabular-nums; }

.is-in .ko-bar { animation:ko-grow .7s cubic-bezier(.22,1,.36,1) both; }
@keyframes ko-grow { from { transform:scaleY(0) } }

@media (prefers-reduced-motion: reduce) { .is-in .ko-bar { animation:none; } }
</style>
