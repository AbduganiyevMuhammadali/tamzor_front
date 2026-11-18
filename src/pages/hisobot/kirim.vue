<script setup lang="ts">
/* XARIDLAR (KIRIM) — kimdan, nima va qancha sotib oldik. Faqat tasdiqlangan
   prixod hujjatlari; avtolavka ichki ko'chirishlari kirmaydi. */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
// @ts-ignore
import { tahlilApi } from '@/api/api'
import HisobotSahifa from './kit/HisobotSahifa.vue'
import KpiKarta from './kit/KpiKarta.vue'
import UstunGrafik from './kit/UstunGrafik.vue'
import HalqaGrafik from './kit/HalqaGrafik.vue'
import ReytingRoyxat from './kit/ReytingRoyxat.vue'
import { fmtMiqdor, davr, useYuklash, qisqa, fmt, foizFmt, ozgarish, sanaQisqa, csvYukla, IKON, RANG, GURUH_NOM } from './kit/hisobot'

const router = useRouter()
const { data: d, yuklanmoqda } = useYuklash(() => tahlilApi.kirim({ dan: davr.dan.value, gacha: davr.gacha.value }))

const IZOH = [
  { nom: 'Xarid summasi', matn: "Tanlangan davrdagi tasdiqlangan kirim (prixod) hujjatlari summasi, hujjat sanasi bo'yicha. Qoralamalar kirmaydi." },
  { nom: "To'lanmagan", matn: "Hujjat summasidan hujjatda ko'rsatilgan to'langan summa ayiriladi. Yetkazuvchiga umumiy qarz — Yetkazuvchilar hisobotida." },
  { nom: "Ichki ko'chirish", matn: "Won Sell mashinasidan omborga qaytgan tovar xarid emas — bu yerda hisoblanmaydi." },
  { nom: "12 oy", matn: "Tanlangan davr oxiridan oldingi 12 oy — mavsumiylikni ko'rish uchun." },
]
const j = computed(() => d.value?.jami || {})
const yetkazuvchilar = computed(() => (d.value?.yetkazuvchilar || []).map((y: any) => ({
  id: y.id, nom: y.nomi, qiymat: y.summa, izoh: `${y.hujjat} hujjat · oxirgisi ${sanaQisqa(y.oxirgi)}`, ong: foizFmt(y.ulush),
})))
function eksport() {
  csvYukla('xaridlar', [
    { k: 'raqam', nom: 'Hujjat' }, { k: 'sana', nom: 'Sana' }, { k: 'yetkazuvchi', nom: 'Yetkazuvchi' }, { k: 'ombor', nom: 'Ombor' },
    { k: 'summa', nom: 'Summa' }, { k: 'tolangan', nom: "To'langan" },
  ], (d.value?.hujjatlar || []).map((h: any) => ({ ...h, sana: String(h.sana).slice(0, 10) })))
}
</script>

<template>
  <HisobotSahifa :ikon="IKON.kirim" nom="Xaridlar (kirim)" savol="Kimdan, nima va qancha sotib oldik"
    :izohlar="IZOH" :yuklanmoqda="yuklanmoqda">
    <template #amal>
      <button class="hs-btn hs-btn--s" :disabled="!d" @click="eksport"><svg viewBox="0 0 24 24" v-html="IKON.yuklab"/>Excel</button>
    </template>

    <div v-if="!d" class="hs-grid hs-grid--kpi"><div v-for="i in 5" :key="i" class="hs-skelet" style="height:104px"/></div>

    <template v-else>
      <div class="hs-grid hs-grid--kpi">
        <KpiKarta nom="Xarid summasi" :ikon="IKON.kirim" :qiymat="j.summa" birlik="so'm" :delta="ozgarish(j.summa, d.oldingi.summa)"
          :yaxshi="'neytral'" :izoh="`Oldingi davrda ${qisqa(d.oldingi.summa)}`" ton="brand"/>
        <KpiKarta nom="Kirim hujjatlari" :ikon="IKON.chek" :qiymat="j.hujjat" toliq :izoh="`${j.yetkazuvchi} ta yetkazuvchidan`"/>
        <KpiKarta nom="Tovar" :ikon="IKON.quti" :qiymat="`${j.tovar_turi} xil`" :izoh="`${fmtMiqdor(j.dona)} kg`"/>
        <KpiKarta nom="O'rtacha hujjat" :ikon="IKON.hamyon" :qiymat="j.hujjat ? j.summa / j.hujjat : 0" birlik="so'm" izoh="Bitta kirim hujjati summasi"/>
        <KpiKarta nom="Hujjatlarda to'lanmagan" :ikon="IKON.ogoh" :qiymat="j.tolanmagan" birlik="so'm" :ton="j.tolanmagan ? 'warn' : 'ok'"
          izoh="Shu davr hujjatlari bo'yicha" to="/hisobot/yetkazuvchilar"/>
      </div>

      <div class="hs-grid hs-grid--2">
        <section class="hs-karta">
          <div class="hs-karta-hd">
            <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.grafik"/></span>
            <div class="hs-kt"><h2>Davr ichida</h2><p>{{ GURUH_NOM[d.davr.guruh] }} bo'yicha xarid</p></div>
          </div>
          <div class="hs-karta-b">
            <UstunGrafik :data="d.trend" :guruh="d.davr.guruh" :balandlik="230" :seriyalar="[{ k: 'summa', nom: 'Xarid', rang: RANG.brand }]"/>
          </div>
        </section>
        <section class="hs-karta">
          <div class="hs-karta-hd">
            <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.osish"/></span>
            <div class="hs-kt"><h2>So'nggi 12 oy</h2><p>Oylik xarid — mavsumiylikni ko'rish uchun</p></div>
          </div>
          <div class="hs-karta-b">
            <UstunGrafik :data="d.oylik" guruh="oy" :balandlik="230" :seriyalar="[{ k: 'summa', nom: 'Xarid', rang: RANG.brand2 }]"/>
          </div>
        </section>
      </div>

      <div class="hs-grid hs-grid--2">
        <section class="hs-karta">
          <div class="hs-karta-hd">
            <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.zavod"/></span>
            <div class="hs-kt"><h2>Yetkazuvchilar</h2><p>Kimdan qancha olindi</p></div>
          </div>
          <div class="hs-karta-b"><ReytingRoyxat :items="yetkazuvchilar" :maks="8" toliq @tanla="(y: any) => y.id && router.push(`/yetkazuvchilar/${y.id}`)"/></div>
        </section>
        <section class="hs-karta">
          <div class="hs-karta-hd">
            <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.pirog"/></span>
            <div class="hs-kt"><h2>Turkumlar</h2><p>Pul qaysi tovar guruhiga sarflandi</p></div>
          </div>
          <div class="hs-karta-b">
            <HalqaGrafik :items="d.turkumlar.map((t: any) => ({ nom: t.nomi, qiymat: t.summa }))" markaz-izoh="xarid" :maks="6"/>
          </div>
        </section>
      </div>

      <div class="hs-grid hs-grid--2">
        <section class="hs-karta">
          <div class="hs-karta-hd">
            <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.quti"/></span>
            <div class="hs-kt"><h2>Eng ko'p olingan tovarlar</h2><p>Top 15, summa bo'yicha</p></div>
          </div>
          <div class="hs-karta-b hs-karta-b--0 hs-jw">
            <table class="hs-jadval">
              <thead><tr><th>Tovar</th><th class="r">Kg</th><th class="r">O'rtacha narx</th><th class="r">Summa</th></tr></thead>
              <tbody>
                <tr v-for="t in d.tovarlar" :key="t.id">
                  <td><div class="hs-nom"><b>{{ t.nomi }}</b><small>{{ t.turkum }}</small></div></td>
                  <td class="r">{{ fmtMiqdor(t.dona) }}</td><td class="r m">{{ fmt(t.ortacha_narx) }}</td><td class="r"><b>{{ fmt(t.summa) }}</b></td>
                </tr>
                <tr v-if="!d.tovarlar.length"><td colspan="4"><div class="hs-bosh">Bu davrda xarid yo'q</div></td></tr>
              </tbody>
            </table>
          </div>
        </section>
        <section class="hs-karta">
          <div class="hs-karta-hd">
            <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.chek"/></span>
            <div class="hs-kt"><h2>Kirim hujjatlari</h2><p>So'nggi 30 tasi · bosing — hujjat ochiladi</p></div>
          </div>
          <div class="hs-karta-b hs-karta-b--0 hs-jw kr-jw">
            <table class="hs-jadval">
              <thead><tr><th>Hujjat</th><th>Yetkazuvchi</th><th class="r">Summa</th><th class="r">To'langan</th></tr></thead>
              <tbody>
                <tr v-for="h in d.hujjatlar" :key="h.id" class="bos" @click="router.push(`/ombor/prixod/${h.id}`)">
                  <td><div class="hs-nom"><b>{{ h.raqam }}</b><small>{{ sanaQisqa(h.sana) }}</small></div></td>
                  <td>{{ h.yetkazuvchi }}</td>
                  <td class="r"><b>{{ fmt(h.summa) }}</b></td>
                  <td class="r">
                    <span class="hs-belgi" :class="h.tolangan >= h.summa ? 'hs-belgi--ok' : h.tolangan > 0 ? 'hs-belgi--warn' : 'hs-belgi--n'">
                      {{ h.tolangan >= h.summa ? "to'langan" : h.tolangan > 0 ? Math.round(h.tolangan / h.summa * 100) + '%' : "to'lanmagan" }}
                    </span>
                  </td>
                </tr>
                <tr v-if="!d.hujjatlar.length"><td colspan="4"><div class="hs-bosh">Bu davrda hujjat yo'q</div></td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </template>
  </HisobotSahifa>
</template>

<style scoped>
.kr-jw { max-height:520px; overflow:auto; }
</style>
