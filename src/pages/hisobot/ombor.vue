<script setup lang="ts">
/* OMBOR — omborda qancha pul turibdi, u necha kunga yetadi, davrda nima
   kirdi va sotildi, qaysi tovar yotib qolgan, qaysi biri tugayapti.
   Avtolavka ichki ko'chirishlari kirim/chiqim hisoblanmaydi. */
import { computed } from 'vue'
// @ts-ignore
import { tahlilApi } from '@/api/api'
import HisobotSahifa from './kit/HisobotSahifa.vue'
import KpiKarta from './kit/KpiKarta.vue'
import UstunGrafik from './kit/UstunGrafik.vue'
import HalqaGrafik from './kit/HalqaGrafik.vue'
import { fmtMiqdor, davr, useYuklash, qisqa, fmt, foizFmt, kunOldin, csvYukla, IKON, RANG, GURUH_NOM } from './kit/hisobot'

const { data: d, yuklanmoqda } = useYuklash(() => tahlilApi.ombor({ dan: davr.dan.value, gacha: davr.gacha.value }))

const IZOH = [
  { nom: 'Ombor qiymati', matn: "Barcha omborlar va agentlardagi qoldiq × tannarx (o'rtacha kirim narxi). Brak ombori alohida ko'rsatiladi va jamiga kirmaydi." },
  { nom: 'Zaxira kuni', matn: "Ombor qiymati ÷ davrdagi o'rtacha kunlik sotuv tannarxi. Ya'ni yangi kirim bo'lmasa, tovar taxminan necha kunga yetadi." },
  { nom: 'Kirdi', matn: "Faqat yetkazuvchidan xarid (prixod), kirim narxida. Mijozdan qaytgan tovar alohida." },
  { nom: 'Sotildi', matn: 'Sotilgan tovarning tannarxi — kirim bilan bir xil o\'lchovda solishtirish uchun (sotuv narxida emas).' },
  { nom: "Ichki ko'chirish", matn: "Agentga yuk berish va qabul — tovar asosiy ombor va agent o'rtasida ko'chadi. Kompaniya zaxirasi o'zgarmaydi, shuning uchun kirim ham, sotuv ham emas." },
  { nom: 'Yotib qolgan / tugayapti', matn: "Yotib qolgan — qoldig'i bor, davrda sotilmagan. Tugayapti — hozirgi sotuv sur'atida 14 kundan kamroqqa yetadi." },
]

const j = computed(() => d.value?.jami || {})
const h = computed(() => d.value?.harakat || {})
const TUR_NOM: Record<string, string> = { asosiy: 'Asosiy ombor', xom_ashyo: 'Xom ashyo (sotilmaydi)', mashina: 'Agentdagi tovar', brak: 'Brak (yaroqsiz)' }
const omborRang = (t: string, i: number) => (t === 'asosiy' ? RANG.brand : t === 'brak' ? RANG.err : ['#a78bfa', '#c4b5fd', '#8b5cf6', '#ddd6fe'][i % 4])
const balans = computed(() => (h.value.kirim || 0) - (h.value.sotuv_tannarx || 0))

function eksport(tur: 'harakatsiz' | 'tugayapti') {
  csvYukla(`ombor_${tur}`, [
    { k: 'nomi', nom: 'Tovar' }, { k: 'turkum', nom: 'Turkum' }, { k: 'dona', nom: 'Qoldiq (kg)' }, { k: 'qiymat', nom: 'Qiymati' },
    { k: 'kunlik', nom: 'Kunlik sotuv' }, { k: 'yetadi_kun', nom: 'Yetadi (kun)' }, { k: 'sotilmagan_kun', nom: 'Oxirgi sotuvdan (kun)' },
  ], d.value?.[tur] || [])
}
</script>

<template>
  <HisobotSahifa :ikon="IKON.ombor" nom="Ombor" savol="Omborda qancha pul turibdi, u necha kunga yetadi va qaysi tovar yotib qolgan"
    :izohlar="IZOH" :yuklanmoqda="yuklanmoqda">

    <div v-if="!d" class="hs-grid hs-grid--kpi"><div v-for="i in 5" :key="i" class="hs-skelet" style="height:104px"/></div>

    <template v-else>
      <div class="hs-grid hs-grid--kpi">
        <KpiKarta nom="Ombor qiymati (hozir)" :ikon="IKON.ombor" :qiymat="j.qiymat" birlik="so'm" :izoh="`${fmtMiqdor(j.dona)} kg · ${j.tovar_turi} xil tovar`"/>
        <KpiKarta nom="Zaxira yetadi" :ikon="IKON.soat" :qiymat="j.zaxira_kun ? `${j.zaxira_kun} kun` : '—'"
          :ton="!j.zaxira_kun ? 'neytral' : j.zaxira_kun < 14 ? 'warn' : j.zaxira_kun > 90 ? 'warn' : 'ok'"
          :izoh="!j.zaxira_kun ? 'Davrda sotuv yo\'q' : j.zaxira_kun > 90 ? 'Zaxira ko\'p — pul muzlab qolgan' : j.zaxira_kun < 14 ? 'Kam — xarid rejalashtiring' : 'Me\'yorida'"/>
        <KpiKarta nom="Davrda kirdi (xarid)" :ikon="IKON.kirim" :qiymat="h.kirim" birlik="so'm" :izoh="`${fmtMiqdor(h.kirim_dona)} kg · kirim narxida`"/>
        <KpiKarta nom="Davrda sotildi" :ikon="IKON.savat" :qiymat="h.sotuv_tannarx" birlik="so'm" :izoh="`${fmtMiqdor(h.sotuv_dona)} kg · tannarxda`"/>
        <KpiKarta nom="Agentlarda" :ikon="IKON.mashina" :qiymat="j.mashina_qiymat" birlik="so'm" izoh="Van Sell agentlari qo'lidagi tovar" ton="neytral"/>
      </div>

      <div class="hs-tushuncha">
        <svg viewBox="0 0 24 24" v-html="IKON.info"/>
        <span>
          Tanlangan davrda omborga <b>{{ qisqa(h.kirim) }}</b> so'mlik tovar kirdi, tannarxi <b>{{ qisqa(h.sotuv_tannarx) }}</b> bo'lgan tovar sotildi —
          zaxira <b :class="balans >= 0 ? 'hs-ok' : 'hs-warn'">{{ balans >= 0 ? qisqa(balans) + " ga ko'paydi" : qisqa(-balans) + ' ga kamaydi' }}</b>.
          <template v-if="h.qaytgan"> Mijozlardan {{ qisqa(h.qaytgan) }} lik tovar qaytdi.</template>
          <template v-if="h.kochirish_son"> Van Sell uchun {{ fmtMiqdor(h.kochirish_dona) }} kg ichki ko'chirildi ({{ h.kochirish_son }} yozuv) — bu sotuv emas, hisobga kirmaydi.</template>
        </span>
      </div>

      <div class="hs-grid hs-grid--21">
        <section class="hs-karta">
          <div class="hs-karta-hd">
            <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.grafik"/></span>
            <div class="hs-kt"><h2>Kirdi va sotildi</h2><p>{{ GURUH_NOM[d.davr.guruh] }} bo'yicha, ikkalasi ham tannarxda — ustunlar teng bo'lsa zaxira o'zgarmaydi</p></div>
          </div>
          <div class="hs-karta-b">
            <UstunGrafik :data="d.trend" :guruh="d.davr.guruh" :balandlik="250"
              :seriyalar="[{ k: 'kirim', nom: 'Kirdi (xarid)', rang: RANG.brand }, { k: 'sotuv', nom: 'Sotildi (tannarx)', rang: RANG.brand3 }]"/>
          </div>
        </section>
        <section class="hs-karta">
          <div class="hs-karta-hd">
            <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.pirog"/></span>
            <div class="hs-kt"><h2>Pul qaysi turkumda turibdi</h2><p>Ombor qiymati tarkibi</p></div>
          </div>
          <div class="hs-karta-b">
            <HalqaGrafik :items="d.turkumlar.map((t: any) => ({ nom: t.nomi, qiymat: t.qiymat }))" markaz-izoh="ombor qiymati" :olcham="150" :maks="5"/>
          </div>
        </section>
      </div>

      <section class="hs-karta">
        <div class="hs-karta-hd">
          <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.qutilar"/></span>
          <div class="hs-kt"><h2>Omborlar va agentlar</h2><p>Tovar qayerda turibdi</p></div>
        </div>
        <div class="hs-karta-b hs-karta-b--0 hs-jw">
          <table class="hs-jadval">
            <thead><tr><th>Ombor</th><th>Turi</th><th class="r">Tovar turi</th><th class="r">Kg</th><th class="r">Qiymati</th><th class="r">Ulush</th></tr></thead>
            <tbody>
              <tr v-for="(o, i) in d.omborlar" :key="o.nomi">
                <td><span class="om-dot" :style="{ background: omborRang(o.tur, Number(i)) }"/><b>{{ o.nomi }}</b></td>
                <td><span class="hs-belgi" :class="o.tur === 'asosiy' || o.tur === 'xom_ashyo' ? 'hs-belgi--B' : o.tur === 'brak' ? 'hs-belgi--err' : 'hs-belgi--n'">{{ TUR_NOM[o.tur] }}</span></td>
                <td class="r">{{ o.tovar_turi }}</td>
                <td class="r">{{ fmtMiqdor(o.dona) }}</td>
                <td class="r"><b>{{ fmt(o.qiymat) }}</b></td>
                <td class="r m">{{ o.tur === 'brak' ? 'jamiga kirmaydi' : foizFmt(o.ulush) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div class="hs-grid hs-grid--2">
        <section class="hs-karta">
          <div class="hs-karta-hd">
            <span class="hs-karta-ic om-err"><svg viewBox="0 0 24 24" v-html="IKON.ogoh"/></span>
            <div class="hs-kt"><h2>Yotib qolgan tovarlar</h2><p>Qoldig'i bor, lekin davrda sotilmagan — pul muzlab qolgan</p></div>
            <div class="hs-kr"><button class="hs-btn hs-btn--s" @click="eksport('harakatsiz')"><svg viewBox="0 0 24 24" v-html="IKON.yuklab"/></button></div>
          </div>
          <div class="hs-karta-b hs-karta-b--0 hs-jw">
            <table class="hs-jadval">
              <thead><tr><th>Tovar</th><th class="r">Qoldiq</th><th class="r">Qiymati</th><th class="r">Oxirgi sotuv</th></tr></thead>
              <tbody>
                <tr v-for="r in d.harakatsiz" :key="r.id">
                  <td><div class="hs-nom"><b>{{ r.nomi }}</b><small>{{ r.turkum }}</small></div></td>
                  <td class="r">{{ fmtMiqdor(r.dona) }}</td>
                  <td class="r"><b>{{ fmt(r.qiymat) }}</b></td>
                  <td class="r"><span class="hs-belgi hs-belgi--err">{{ r.sotilmagan_kun === null ? 'hech qachon' : kunOldin(r.sotilmagan_kun) }}</span></td>
                </tr>
                <tr v-if="!d.harakatsiz.length"><td colspan="4"><div class="hs-bosh">Yotib qolgan tovar yo'q — hammasi sotilmoqda</div></td></tr>
              </tbody>
            </table>
          </div>
        </section>
        <section class="hs-karta">
          <div class="hs-karta-hd">
            <span class="hs-karta-ic om-warn"><svg viewBox="0 0 24 24" v-html="IKON.tugaydi"/></span>
            <div class="hs-kt"><h2>Tez orada tugaydi</h2><p>Hozirgi sotuv sur'atida 14 kundan kamroqqa yetadi — xarid qiling</p></div>
            <div class="hs-kr"><button class="hs-btn hs-btn--s" @click="eksport('tugayapti')"><svg viewBox="0 0 24 24" v-html="IKON.yuklab"/></button></div>
          </div>
          <div class="hs-karta-b hs-karta-b--0 hs-jw">
            <table class="hs-jadval">
              <thead><tr><th>Tovar</th><th class="r">Qoldiq</th><th class="r">Kuniga sotiladi</th><th class="r">Yetadi</th></tr></thead>
              <tbody>
                <tr v-for="r in d.tugayapti" :key="r.id">
                  <td><div class="hs-nom"><b>{{ r.nomi }}</b><small>{{ r.turkum }}</small></div></td>
                  <td class="r">{{ fmtMiqdor(r.dona) }}</td>
                  <td class="r">{{ fmt(r.kunlik) }}</td>
                  <td class="r"><span class="hs-belgi" :class="r.yetadi_kun < 7 ? 'hs-belgi--err' : 'hs-belgi--warn'">{{ r.yetadi_kun }} kun</span></td>
                </tr>
                <tr v-if="!d.tugayapti.length"><td colspan="4"><div class="hs-bosh">Yaqin 2 haftada tugaydigan tovar yo'q</div></td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </template>
  </HisobotSahifa>
</template>

<style scoped>
.om-dot { display:inline-block; width:9px; height:9px; border-radius:3px; margin-right:9px; vertical-align:middle; }
.om-err { background:color-mix(in srgb, #dc2626 10%, transparent) !important; color:#dc2626 !important; }
.om-warn { background:color-mix(in srgb, #d97706 12%, transparent) !important; color:#d97706 !important; }
</style>
