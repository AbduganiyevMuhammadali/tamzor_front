<script setup lang="ts">
/* HISOBOTLAR — UMUMIY KO'RINISH
   Biznes jarayoni 5 qadamda: xarid → ombor → sotuv → to'lov → kassa.
   Har qadamda raqam va u qaysi batafsil hisobotga olib borishi. */
import { computed } from 'vue'
// @ts-ignore
import { tahlilApi } from '@/api/api'
import HisobotSahifa from './kit/HisobotSahifa.vue'
import KpiKarta from './kit/KpiKarta.vue'
import UstunGrafik from './kit/UstunGrafik.vue'
import HalqaGrafik from './kit/HalqaGrafik.vue'
import ReytingRoyxat from './kit/ReytingRoyxat.vue'
import { fmtMiqdor, davr, useYuklash, qisqa, fmt, foizFmt, ozgarish, IKON, RANG, GURUH_NOM } from './kit/hisobot'

const { data: d, yuklanmoqda } = useYuklash(() => tahlilApi.umumiy({ dan: davr.dan.value, gacha: davr.gacha.value }))

const IZOH = [
  { nom: 'Sotuv (tushum)', matn: "Yetkazib berilgan buyurtmalar summasi, yetkazilgan kuni bo'yicha. Qabul qilingan qaytarishlar ayiriladi — bu \"sof tushum\"." },
  { nom: 'Tannarx', matn: "Sotilgan kg × tovarning o'rtacha kirim narxi (so'nggi 90 kundagi xaridlar bo'yicha, miqdorga qarab og'irlikli)." },
  { nom: 'Yalpi foyda va marja', matn: 'Foyda = sof tushum − tannarx. Marja = foyda ÷ tushum. Marja 18% — har 100 so\'m savdodan 18 so\'m foyda qoladi.' },
  { nom: 'Mijozlar qarzi', matn: "Mijoz balansi manfiy bo'lsa — qarz. Qarzning yoshi: to'lovlar eng eski savdolarni yopadi, qolgan qarz eng yangi savdolarga tegishli." },
  { nom: 'Ombor qiymati', matn: "Barcha omborlardagi (Won Sell mashinalari ham) qoldiq × tannarx. Brak hisobga olinmaydi. Zaxira kuni = qiymat ÷ kunlik sotuv tannarxi." },
  { nom: "Ichki ko'chirish", matn: "Won Sell yuklash/qabuli tovarni bir ombordan boshqasiga ko'chiradi — bu sotuv ham, xarid ham emas, hisobotlarda alohida." },
  { nom: 'Taqqoslash', matn: "Kartalardagi foiz — tanlangan davrni undan oldingi xuddi shuncha kunlik davr bilan solishtirish." },
]

const s = computed(() => d.value?.sotuv || {})
const o = computed(() => d.value?.oldingi || {})
const tolovRang: Record<string, string> = { naqd: RANG.brand, plastik: RANG.brand2, qarz: RANG.warn, nomalum: RANG.neytral }
const tolovJami = computed(() => (d.value?.tolov || []).reduce((a: number, t: any) => a + t.summa, 0) || 1)

/* Oddiy tilda xulosa — raqamlarni bir-ikki gapda */
const xulosa = computed(() => {
  if (!d.value) return ''
  const t = s.value, oz = ozgarish(t.sof_tushum, o.value.sof_tushum)
  const qism: string[] = []
  qism.push(`Bu davrda <b>${qisqa(t.sof_tushum)} so'm</b>lik tovar sotildi${oz !== null ? ` (oldingi davrga nisbatan <b>${oz > 0 ? '+' : ''}${foizFmt(oz)}</b>)` : ''}.`)
  if (t.sof_tushum > 0) qism.push(`Har 100 so'm savdodan <b>${Math.round(t.marja)} so'm</b> yalpi foyda qoldi — jami <b>${qisqa(t.foyda)} so'm</b>.`)
  const q = d.value.qarz
  if (q?.mijozlar) qism.push(`Mijozlar <b>${qisqa(q.mijozlar)} so'm</b> qarz${q.muddati_otgan ? `, shundan <b>${qisqa(q.muddati_otgan)}</b> muddati o'tgan` : ', muddati o\'tgani yo\'q'}.`)
  const om = d.value.ombor
  if (om?.zaxira_kun) qism.push(`Ombordagi tovar hozirgi sotuv sur'atida taxminan <b>${om.zaxira_kun} kun</b>ga yetadi.`)
  return qism.join(' ')
})

const qadamlar = computed(() => {
  if (!d.value) return []
  const x = d.value
  return [
    { n: 1, ikon: IKON.kirim, nom: 'Xarid', qiymat: x.kirim.summa, izoh: `${x.kirim.hujjat} ta kirim hujjati · ${x.kirim.yetkazuvchi} yetkazuvchi`,
      tagi: `Yetkazuvchilarga qarzimiz: ${qisqa(x.yetkazuvchi.qarzimiz)}`, tagiTon: x.yetkazuvchi.qarzimiz > 0 ? 'warn' : '',
      tushuncha: 'Yetkazuvchidan tovar keladi va omborga kirim qilinadi', yol: '/hisobot/kirim' },
    { n: 2, ikon: IKON.ombor, nom: 'Ombor', qiymat: x.ombor.qiymat, izoh: `${fmtMiqdor(x.ombor.dona)} kg · ${x.ombor.tovar_turi} xil tovar`,
      tagi: x.ombor.zaxira_kun ? `~${x.ombor.zaxira_kun} kunga yetadi` : 'Sotuv yo\'q — zaxira kuni noma\'lum', tagiTon: '',
      tushuncha: `Tovar saqlanadi${x.ombor.mashinalar ? `; ${qisqa(x.ombor.mashinalar)} si avtolavka mashinalarida` : ''}${x.ombor.xom_ashyo ? `; ${qisqa(x.ombor.xom_ashyo)} si xom ashyo` : ''}`, yol: '/hisobot/ombor' },
    { n: 3, ikon: IKON.savat, nom: 'Sotuv', qiymat: x.sotuv.sof_tushum, izoh: `${x.sotuv.buyurtma} buyurtma · ${x.sotuv.mijoz} mijoz`,
      tagi: `Foyda ${qisqa(x.sotuv.foyda)} · marja ${foizFmt(x.sotuv.marja)}`, tagiTon: x.sotuv.foyda >= 0 ? 'ok' : 'err',
      tushuncha: `Tannarxi ${qisqa(x.sotuv.tannarx)} bo'lgan tovar sotildi`, yol: '/hisobot/sotuv' },
    { n: 4, ikon: IKON.hamyon, nom: "To'lov", qiymat: null, tolov: true,
      tagi: `Mijozlar qarzi: ${qisqa(x.qarz.mijozlar)}`, tagiTon: x.qarz.muddati_otgan > 0 ? 'warn' : '',
      tushuncha: 'Mijoz naqd, plastik yoki qarzga to\'laydi', yol: '/hisobot/qarzlar' },
    { n: 5, ikon: IKON.kassa, nom: 'Kassa', qiymat: x.kassa.sof, izoh: `Kirdi ${qisqa(x.kassa.kirim)} · chiqdi ${qisqa(x.kassa.chiqim)}`,
      tagi: x.kassa.sof >= 0 ? 'Kassa sof o\'sdi' : 'Kassadan ko\'proq chiqdi', tagiTon: x.kassa.sof >= 0 ? 'ok' : 'err',
      tushuncha: 'Pul kassaga tushadi, xarajat va xaridga ketadi', yol: '/moliya' },
  ]
})

const kassaKirim = computed(() => (d.value?.kassa?.toifalar || []).filter((t: any) => t.tur === 'kirim').map((t: any) => ({ nom: t.nom, qiymat: t.summa, ong: `${t.son} ta`, rang: RANG.ok })))
const kassaChiqim = computed(() => (d.value?.kassa?.toifalar || []).filter((t: any) => t.tur === 'chiqim').map((t: any) => ({ nom: t.nom, qiymat: t.summa, ong: `${t.son} ta`, rang: RANG.brand2 })))

const HISOBOTLAR = computed(() => [
  { yol: '/hisobot/sotuv', ikon: IKON.osish, nom: 'Sotuv va foyda', savol: 'Qancha sotdik, qancha foyda qoldi — agent, turkum va mijoz kesimida', raqam: d.value ? qisqa(s.value.sof_tushum) : '' },
  { yol: '/hisobot/tovarlar', ikon: IKON.qutilar, nom: 'Tovarlar (ABC)', savol: 'Qaysi tovar pul topadi, qaysi biri yotib qolgan yoki tugayapti', raqam: '' },
  { yol: '/hisobot/qarzlar', ikon: IKON.dokon, nom: 'Mijozlar qarzi', savol: "Kim qancha qarz va qanchasi muddati o'tgan (debitorka)", raqam: d.value ? qisqa(d.value.qarz.mijozlar) : '' },
  { yol: '/hisobot/ombor', ikon: IKON.ombor, nom: 'Ombor', savol: 'Omborda qancha pul turibdi va u necha kunga yetadi', raqam: d.value ? qisqa(d.value.ombor.qiymat) : '' },
  { yol: '/hisobot/kirim', ikon: IKON.kirim, nom: 'Xaridlar (kirim)', savol: 'Kimdan, nima va qancha sotib oldik', raqam: d.value ? qisqa(d.value.kirim.summa) : '' },
  { yol: '/hisobot/yetkazuvchilar', ikon: IKON.zavod, nom: 'Yetkazuvchilar', savol: 'Yetkazuvchilarga qancha qarzmiz (kreditorka)', raqam: d.value ? qisqa(d.value.yetkazuvchi.qarzimiz) : '' },
  { yol: '/hisobot/register', ikon: IKON.kitob, nom: 'Ombor jurnali', savol: "Har bir tovar harakati: xarid, sotuv, qaytarish, ko'chirish", raqam: '' },
  { yol: '/hisobot/inkassatsiya', ikon: IKON.pul, nom: 'Inkassatsiya', savol: 'Agentlar yig\'gan naqd pul kassaga topshirildimi', raqam: '' },
])
</script>

<template>
  <HisobotSahifa :ikon="IKON.grafik" nom="Hisobotlar" savol="Biznes bir qarashda: tovar va pul qayerdan kelib, qayerga ketdi"
    :izohlar="IZOH" :yuklanmoqda="yuklanmoqda">

    <template v-if="!d">
      <div class="hs-grid hs-grid--kpi"><div v-for="i in 5" :key="i" class="hs-skelet" style="height:104px"/></div>
      <div class="hs-skelet" style="height:230px"/>
    </template>

    <template v-else>
      <div class="hu-xulosa">
        <svg viewBox="0 0 24 24" v-html="IKON.info"/>
        <p v-html="xulosa"/>
      </div>

      <div class="hs-grid hs-grid--kpi">
        <KpiKarta nom="Sof tushum" :ikon="IKON.savat" :qiymat="s.sof_tushum" birlik="so'm" :delta="ozgarish(s.sof_tushum, o.sof_tushum)"
          :izoh="`${s.buyurtma} buyurtma · o'rtacha chek ${qisqa(s.ortacha_chek)}`" to="/hisobot/sotuv"/>
        <KpiKarta nom="Yalpi foyda" :ikon="IKON.osish" :qiymat="s.foyda" birlik="so'm" :delta="ozgarish(s.foyda, o.foyda)"
          :ton="s.foyda >= 0 ? 'ok' : 'err'" :izoh="`Marja ${foizFmt(s.marja)} · tannarx ${qisqa(s.tannarx)}`" to="/hisobot/sotuv"/>
        <KpiKarta nom="Mijozlar qarzi" :ikon="IKON.dokon" :qiymat="d.qarz.mijozlar" birlik="so'm" :ton="d.qarz.muddati_otgan > 0 ? 'warn' : 'brand'"
          :izoh="d.qarz.muddati_otgan ? `${qisqa(d.qarz.muddati_otgan)} muddati o'tgan · ${d.qarz.qarzdor} qarzdor` : `${d.qarz.qarzdor} qarzdor · muddati o'tgani yo'q`" to="/hisobot/qarzlar"/>
        <KpiKarta nom="Ombor qiymati" :ikon="IKON.ombor" :qiymat="d.ombor.qiymat" birlik="so'm"
          :izoh="d.ombor.zaxira_kun ? `Hozirgi sur'atda ~${d.ombor.zaxira_kun} kunga yetadi` : 'Tannarx bo\'yicha'" to="/hisobot/ombor"/>
        <KpiKarta nom="Kassa sof oqimi" :ikon="IKON.kassa" :qiymat="d.kassa.sof" birlik="so'm" :ton="d.kassa.sof >= 0 ? 'ok' : 'err'"
          :delta="ozgarish(d.kassa.sof, o.kassa_sof)" :izoh="`Kirdi ${qisqa(d.kassa.kirim)} · chiqdi ${qisqa(d.kassa.chiqim)}`" to="/moliya"/>
      </div>

      <!-- ═══ JARAYON: tovar va pul aylanishi ═══ -->
      <section class="hs-karta">
        <div class="hs-karta-hd">
          <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.almash"/></span>
          <div class="hs-kt"><h2>Tovar va pul qanday aylanadi</h2><p>Tanlangan davrda har bosqichda nima bo'ldi — bosing, batafsil hisobot ochiladi</p></div>
        </div>
        <div class="hs-karta-b">
          <div class="hu-oqim">
            <template v-for="(q, i) in qadamlar" :key="q.n">
              <router-link :to="q.yol" class="hu-q">
                <div class="hu-q-hd">
                  <span class="hu-q-ic"><svg viewBox="0 0 24 24" v-html="q.ikon"/></span>
                  <span class="hu-q-n">{{ q.n }}-qadam</span>
                </div>
                <b class="hu-q-nom">{{ q.nom }}</b>
                <template v-if="q.tolov">
                  <div class="hu-tolov">
                    <i v-for="t in d.tolov" :key="t.k" :style="{ flex: t.summa, background: tolovRang[t.k] }" :title="`${t.nom}: ${fmt(t.summa)}`"/>
                  </div>
                  <ul class="hu-tolov-l">
                    <li v-for="t in d.tolov" :key="t.k"><i :style="{ background: tolovRang[t.k] }"/>{{ t.nom }}<em>{{ Math.round(t.summa / tolovJami * 100) }}%</em></li>
                  </ul>
                </template>
                <template v-else>
                  <span class="hu-q-v">{{ qisqa(q.qiymat) }} <small>so'm</small></span>
                  <span class="hu-q-iz">{{ q.izoh }}</span>
                </template>
                <span class="hu-q-tag" :class="q.tagiTon">{{ q.tagi }}</span>
                <span class="hu-q-tu">{{ q.tushuncha }}</span>
              </router-link>
              <span v-if="i < qadamlar.length - 1" class="hu-ok"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
            </template>
          </div>
        </div>
      </section>

      <div class="hs-grid hs-grid--21">
        <section class="hs-karta">
          <div class="hs-karta-hd">
            <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.grafik"/></span>
            <div class="hs-kt"><h2>Sotuv va foyda dinamikasi</h2><p>{{ GURUH_NOM[d.davr.guruh] }} bo'yicha · ustun — tushum, chiziq — yalpi foyda</p></div>
          </div>
          <div class="hs-karta-b">
            <UstunGrafik :data="d.trend" :guruh="d.davr.guruh" :balandlik="250"
              :seriyalar="[{ k: 'tushum', nom: 'Tushum', rang: RANG.brand }, { k: 'foyda', nom: 'Yalpi foyda', rang: RANG.ok, tur: 'chiziq' }]"/>
          </div>
        </section>
        <section class="hs-karta">
          <div class="hs-karta-hd">
            <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.hamyon"/></span>
            <div class="hs-kt"><h2>Sotuv qanday to'landi</h2><p>Qarzga sotilgani — mijozlar qarziga qo'shiladi</p></div>
          </div>
          <div class="hs-karta-b">
            <HalqaGrafik :items="d.tolov.map((t: any) => ({ nom: t.nom, qiymat: t.summa, rang: tolovRang[t.k] }))" markaz-izoh="jami tushum" :olcham="150"/>
          </div>
        </section>
      </div>

      <div class="hs-grid hs-grid--2">
        <section class="hs-karta">
          <div class="hs-karta-hd">
            <span class="hs-karta-ic hu-ok-ic"><svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg></span>
            <div class="hs-kt"><h2>Kassaga pul qayerdan keldi</h2><p>Jami {{ fmt(d.kassa.kirim) }} so'm</p></div>
          </div>
          <div class="hs-karta-b"><ReytingRoyxat :items="kassaKirim" :raqamli="false" toliq/></div>
        </section>
        <section class="hs-karta">
          <div class="hs-karta-hd">
            <span class="hs-karta-ic"><svg viewBox="0 0 24 24"><path d="M12 5v14M6 13l6 6 6-6"/></svg></span>
            <div class="hs-kt"><h2>Kassadan pul qayerga ketdi</h2><p>Jami {{ fmt(d.kassa.chiqim) }} so'm</p></div>
          </div>
          <div class="hs-karta-b"><ReytingRoyxat :items="kassaChiqim" :raqamli="false" toliq/></div>
        </section>
      </div>

      <section>
        <h2 class="hu-h2">Batafsil hisobotlar</h2>
        <div class="hu-hisobotlar">
          <router-link v-for="h in HISOBOTLAR" :key="h.yol" :to="h.yol" class="hu-h">
            <span class="hu-h-ic"><svg viewBox="0 0 24 24" v-html="h.ikon"/></span>
            <div class="hu-h-t">
              <b>{{ h.nom }}</b>
              <span>{{ h.savol }}</span>
            </div>
            <em v-if="h.raqam">{{ h.raqam }}</em>
            <svg class="hu-h-ok" viewBox="0 0 24 24" v-html="IKON.strelka"/>
          </router-link>
        </div>
      </section>
    </template>
  </HisobotSahifa>
</template>

<style scoped>
.hu-xulosa { display:flex; gap:12px; align-items:flex-start; padding:14px 18px; border-radius:12px; background:var(--acc-soft); border:1px solid color-mix(in srgb, var(--acc) 22%, var(--line)); }
.hu-xulosa svg { width:20px; height:20px; flex-shrink:0; margin-top:1px; fill:none; stroke:var(--acc); stroke-width:1.75; stroke-linecap:round; }
.hu-xulosa p { margin:0; font-size:14px; line-height:1.6; color:var(--ink2); }
.hu-xulosa p :deep(b) { color:var(--ink); font-weight:650; }

.hu-oqim { display:flex; align-items:stretch; gap:6px; }
.hu-q { flex:1; min-width:0; display:flex; flex-direction:column; gap:5px; padding:14px; border:1px solid var(--line); border-radius:11px; background:var(--bg);
  text-decoration:none; color:inherit; transition:border-color .12s, background .12s, box-shadow .12s; }
.hu-q:hover { border-color:var(--brand-300); background:var(--surface); box-shadow:0 8px 22px -14px rgba(79,70,229,.6); }
.hu-q-hd { display:flex; align-items:center; justify-content:space-between; margin-bottom:2px; }
.hu-q-ic { width:34px; height:34px; border-radius:9px; background:var(--brand-600); color:#fff; display:flex; align-items:center; justify-content:center; }
.hu-q-ic svg { width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:1.75; stroke-linecap:round; stroke-linejoin:round; }
.hu-q-n { font-size:11px; font-weight:600; color:var(--sub); letter-spacing:.02em; }
.hu-q-nom { font-size:13px; font-weight:600; color:var(--mut); }
.hu-q-v { font-size:21px; font-weight:650; letter-spacing:-.02em; font-variant-numeric:tabular-nums; white-space:nowrap; }
.hu-q-v small { font-size:12px; font-weight:500; color:var(--mut); }
.hu-q-iz { font-size:12px; color:var(--mut); }
.hu-q-tag { margin-top:auto; padding-top:6px; font-size:12px; font-weight:600; color:var(--ink2); }
.hu-q-tag.ok { color:#059669; } .hu-q-tag.warn { color:#b45309; } .hu-q-tag.err { color:#dc2626; }
.hu-q-tu { font-size:11.5px; color:var(--sub); line-height:1.4; border-top:1px dashed var(--line); padding-top:7px; }
.hu-ok { display:flex; align-items:center; color:var(--brand-300); flex-shrink:0; }
.hu-ok svg { width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
.hu-tolov { display:flex; height:10px; border-radius:5px; overflow:hidden; gap:2px; margin:6px 0 2px; background:var(--act); }
.hu-tolov i { display:block; min-width:3px; }
.hu-tolov-l { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:2px; font-size:12px; color:var(--ink2); }
.hu-tolov-l li { display:flex; align-items:center; gap:6px; }
.hu-tolov-l i { width:8px; height:8px; border-radius:2px; }
.hu-tolov-l em { margin-left:auto; font-style:normal; font-weight:600; font-variant-numeric:tabular-nums; }
.hu-ok-ic { background:color-mix(in srgb, #059669 12%, transparent) !important; color:#059669 !important; }

.hu-h2 { font-size:15px; font-weight:600; margin:6px 0 10px; }
.hu-hisobotlar { display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:10px; }
.hu-h { display:flex; align-items:center; gap:14px; padding:14px 16px; background:var(--surface); border:1px solid var(--line); border-radius:12px; text-decoration:none; color:inherit;
  transition:border-color .12s, box-shadow .12s; }
.hu-h:hover { border-color:var(--brand-300); box-shadow:0 8px 22px -14px rgba(79,70,229,.6); }
.hu-h-ic { width:40px; height:40px; flex-shrink:0; border-radius:10px; background:var(--acc-soft); color:var(--acc); display:flex; align-items:center; justify-content:center; }
.hu-h-ic svg { width:20px; height:20px; fill:none; stroke:currentColor; stroke-width:1.75; stroke-linecap:round; stroke-linejoin:round; }
.hu-h-t { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
.hu-h-t b { font-size:14px; font-weight:600; }
.hu-h-t span { font-size:12.5px; color:var(--mut); line-height:1.4; }
.hu-h em { font-style:normal; font-size:13px; font-weight:650; color:var(--acc); white-space:nowrap; font-variant-numeric:tabular-nums; }
.hu-h-ok { width:16px; height:16px; flex-shrink:0; fill:none; stroke:var(--sub); stroke-width:2; stroke-linecap:round; }

@media (max-width:1100px) {
  .hu-oqim { flex-direction:column; }
  .hu-ok { justify-content:center; transform:rotate(90deg); height:18px; }
}
</style>
