<script setup lang="ts">
/* TOVARLAR (ABC) — qaysi tovar pul topadi (A), qaysi biri yotib qolgan
   (harakatsiz) va qaysi biri tez orada tugaydi. */
import { ref, computed } from 'vue'
// @ts-ignore
import { tahlilApi } from '@/api/api'
import HisobotSahifa from './kit/HisobotSahifa.vue'
import KpiKarta from './kit/KpiKarta.vue'
import { fmtMiqdor, davr, useYuklash, qisqa, fmt, foizFmt, kunOldin, csvYukla, IKON } from './kit/hisobot'

const { data: d, yuklanmoqda } = useYuklash(() => tahlilApi.tovarlar({ dan: davr.dan.value, gacha: davr.gacha.value }))

const IZOH = [
  { nom: 'ABC tahlili', matn: "Tovarlar tushum bo'yicha kamayish tartibida saralanadi. Tushumning birinchi 80% ini beradiganlar — A, keyingi 15% — B, oxirgi 5% — C." },
  { nom: 'Nima qilish kerak', matn: "A — hech qachon tugatmang, B — me'yorida ushlang, C — zaxirasini kamaytiring yoki assortimentdan chiqarishni o'ylang." },
  { nom: 'Yalpi foyda va marja', matn: "Tushum − sotilgan kg × o'rtacha kirim narxi. Qaytarilgan tovar ayiriladi." },
  { nom: 'Yetadi (kun)', matn: "Hozirgi qoldiq ÷ davrdagi o'rtacha kunlik sotuv. 7 kundan kam — buyurtma berish vaqti." },
  { nom: 'Harakatsiz', matn: "Qoldig'i bor, lekin tanlangan davrda bir kg ham sotilmagan tovar — pul omborda yotibdi." },
  { nom: 'Qoldiq', matn: "Barcha omborlar va Van Sell mashinalaridagi qoldiq (brak omboridan tashqari), tannarx bo'yicha qiymati bilan." },
]

const filtr = ref<'' | 'A' | 'B' | 'C' | 'harakatsiz' | 'kam'>('')
const turkum = ref('')
const qidir = ref('')
const sar = ref<{ k: string; t: 1 | -1 }>({ k: 'tushum', t: -1 })

const rows = computed(() => {
  let r = [...(d.value?.rows || [])]
  if (filtr.value === 'harakatsiz') r = r.filter((x: any) => !x.tushum && x.qoldiq > 0)
  else if (filtr.value === 'kam') r = r.filter((x: any) => x.yetadi_kun !== null && x.yetadi_kun < 7)
  else if (filtr.value) r = r.filter((x: any) => x.abc === filtr.value)
  if (turkum.value) r = r.filter((x: any) => x.turkum === turkum.value)
  const q = qidir.value.trim().toLowerCase()
  if (q) r = r.filter((x: any) => x.nomi.toLowerCase().includes(q))
  const { k, t } = sar.value
  return r.sort((a: any, b: any) => {
    const av = a[k] ?? (t === 1 ? Infinity : -Infinity), bv = b[k] ?? (t === 1 ? Infinity : -Infinity)
    return (typeof av === 'string' ? av.localeCompare(bv) : av - bv) * t
  })
})
function sarala(k: string) { sar.value = { k, t: sar.value.k === k ? (sar.value.t === 1 ? -1 : 1) : (k === 'yetadi_kun' || k === 'nomi' ? 1 : -1) } }
const turkumlar = computed(() => (d.value?.turkumlar || []).map((t: any) => t.nomi))
const soni = (f: string) => {
  const r = d.value?.rows || []
  if (f === 'harakatsiz') return r.filter((x: any) => !x.tushum && x.qoldiq > 0).length
  if (f === 'kam') return r.filter((x: any) => x.yetadi_kun !== null && x.yetadi_kun < 7).length
  return r.filter((x: any) => x.abc === f).length
}
const ABC_IZOH: Record<string, string> = { A: 'Tushumning 80% ini beradi — doim omborda bo\'lsin', B: 'Keyingi 15% — me\'yorida ushlang', C: 'Oxirgi 5% — zaxirani kamaytiring' }
const yetadiTon = (k: number | null) => (k === null ? 'hs-belgi--n' : k < 7 ? 'hs-belgi--err' : k < 14 ? 'hs-belgi--warn' : 'hs-belgi--ok')
const maxTushum = computed(() => Math.max(1, ...(d.value?.rows || []).map((r: any) => r.tushum)))

function eksport() {
  csvYukla('tovarlar_abc', [
    { k: 'nomi', nom: 'Tovar' }, { k: 'turkum', nom: 'Turkum' }, { k: 'abc', nom: 'ABC' }, { k: 'dona', nom: 'Sotildi (kg)' },
    { k: 'tushum', nom: 'Tushum' }, { k: 'foyda', nom: 'Yalpi foyda' }, { k: 'marja', nom: 'Marja %' }, { k: 'ortacha_narx', nom: "O'rtacha sotuv narxi" },
    { k: 'kirim_narx', nom: 'Tannarx (1 kg)' }, { k: 'qoldiq', nom: 'Qoldiq (kg)' }, { k: 'qoldiq_qiymat', nom: 'Qoldiq qiymati' }, { k: 'yetadi_kun', nom: 'Yetadi (kun)' },
  ], rows.value)
}
</script>

<template>
  <HisobotSahifa :ikon="IKON.qutilar" nom="Tovarlar (ABC)" savol="Qaysi tovar pul topadi, qaysi biri yotib qolgan va qaysi biri tugayapti"
    :izohlar="IZOH" :yuklanmoqda="yuklanmoqda">
    <template #amal>
      <button class="hs-btn hs-btn--s" :disabled="!d" @click="eksport"><svg viewBox="0 0 24 24" v-html="IKON.yuklab"/>Excel</button>
    </template>

    <div v-if="!d" class="hs-grid hs-grid--kpi"><div v-for="i in 5" :key="i" class="hs-skelet" style="height:104px"/></div>

    <template v-else>
      <div class="hs-grid hs-grid--kpi">
        <KpiKarta nom="Sotilgan tovar turlari" :ikon="IKON.savat" :qiymat="d.jami.sotilgan_tur" toliq :izoh="`Tushum ${qisqa(d.jami.tushum)} · foyda ${qisqa(d.jami.foyda)}`"/>
        <KpiKarta nom="A guruh" :ikon="IKON.osish" :qiymat="`${d.abc[0].soni} ta`" :izoh="`Tushumning ${foizFmt(d.abc[0].ulush)} i shu tovarlardan`" ton="brand"/>
        <KpiKarta nom="Tugayapti (7 kundan kam)" :ikon="IKON.tugaydi" :qiymat="`${d.jami.kam_soni} ta`" :ton="d.jami.kam_soni ? 'warn' : 'ok'"
          izoh="Hozirgi sur'atda bir haftaga yetmaydi"/>
        <KpiKarta nom="Harakatsiz tovar" :ikon="IKON.ogoh" :qiymat="`${d.jami.harakatsiz_soni} ta`" :ton="d.jami.harakatsiz_soni ? 'err' : 'ok'"
          :izoh="d.jami.harakatsiz_soni ? `${qisqa(d.jami.harakatsiz_qiymat)} so'm omborda yotibdi` : 'Hammasi sotilmoqda'"/>
        <KpiKarta nom="Ombordagi qiymat" :ikon="IKON.ombor" :qiymat="d.jami.qoldiq_qiymat" birlik="so'm" izoh="Tannarx bo'yicha, brakdan tashqari"/>
      </div>

      <!-- ABC tushuntirish -->
      <section class="tv-abc">
        <button v-for="g in d.abc" :key="g.k" class="tv-abc-g" :class="[`tv-abc-g--${g.k}`, { on: filtr === g.k }]" @click="filtr = filtr === g.k ? '' : g.k">
          <span class="hs-belgi" :class="`hs-belgi--${g.k}`">{{ g.k }}</span>
          <div class="tv-abc-t">
            <b>{{ g.soni }} ta tovar → tushumning {{ foizFmt(g.ulush) }}</b>
            <span>{{ ABC_IZOH[g.k] }}</span>
          </div>
          <em>{{ qisqa(g.tushum) }}</em>
        </button>
        <div class="tv-abc-bar">
          <i v-for="g in d.abc" :key="g.k" :class="`tv-${g.k}`" :style="{ flex: g.ulush || 0.0001 }"/>
        </div>
      </section>

      <section class="hs-karta">
        <div class="hs-karta-hd">
          <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.quti"/></span>
          <div class="hs-kt"><h2>Tovarlar ro'yxati</h2><p>{{ rows.length }} ta · ustun nomini bosib saralang</p></div>
          <div class="hs-kr">
            <select v-model="turkum" class="hs-sel"><option value="">Barcha turkumlar</option><option v-for="t in turkumlar" :key="t">{{ t }}</option></select>
            <input v-model="qidir" class="hs-inp" placeholder="Tovar nomi…"/>
          </div>
        </div>
        <div class="tv-chip hs-chiplar">
          <button class="hs-chip" :class="{ on: !filtr }" @click="filtr = ''">Barchasi<i>{{ d.rows.length }}</i></button>
          <button v-for="g in ['A', 'B', 'C']" :key="g" class="hs-chip" :class="{ on: filtr === g }" @click="filtr = g as any">{{ g }} guruh<i>{{ soni(g) }}</i></button>
          <button class="hs-chip" :class="{ on: filtr === 'kam' }" @click="filtr = 'kam'">Tugayapti<i>{{ soni('kam') }}</i></button>
          <button class="hs-chip" :class="{ on: filtr === 'harakatsiz' }" @click="filtr = 'harakatsiz'">Harakatsiz<i>{{ soni('harakatsiz') }}</i></button>
        </div>
        <div class="hs-karta-b hs-karta-b--0 hs-jw tv-jw">
          <table class="hs-jadval">
            <thead><tr>
              <th class="s" :class="{ on: sar.k === 'nomi' }" @click="sarala('nomi')">Tovar</th>
              <th class="s" :class="{ on: sar.k === 'abc' }" @click="sarala('abc')">ABC</th>
              <th class="s r" :class="{ on: sar.k === 'dona' }" @click="sarala('dona')">Sotildi</th>
              <th class="s r" :class="{ on: sar.k === 'tushum' }" @click="sarala('tushum')">Tushum</th>
              <th class="s r" :class="{ on: sar.k === 'foyda' }" @click="sarala('foyda')">Yalpi foyda</th>
              <th class="s r" :class="{ on: sar.k === 'marja' }" @click="sarala('marja')">Marja</th>
              <th class="s r" :class="{ on: sar.k === 'qoldiq' }" @click="sarala('qoldiq')">Qoldiq</th>
              <th class="s r" :class="{ on: sar.k === 'qoldiq_qiymat' }" @click="sarala('qoldiq_qiymat')">Qiymati</th>
              <th class="s r" :class="{ on: sar.k === 'yetadi_kun' }" @click="sarala('yetadi_kun')">Yetadi</th>
              <th class="r">Oxirgi sotuv</th>
            </tr></thead>
            <tbody>
              <tr v-for="r in rows" :key="r.id">
                <td><div class="hs-nom"><b>{{ r.nomi }}</b><small>{{ r.turkum }} · tannarx {{ fmt(r.kirim_narx) }}</small></div></td>
                <td><span v-if="r.abc" class="hs-belgi" :class="`hs-belgi--${r.abc}`">{{ r.abc }}</span><span v-else class="hs-belgi hs-belgi--err">yo'q</span></td>
                <td class="r">{{ r.dona ? fmtMiqdor(r.dona) : '—' }}</td>
                <td class="r"><span class="hs-mini"><i :style="{ width: (r.tushum / maxTushum * 100) + '%' }"/></span><b>{{ r.tushum ? fmt(r.tushum) : '—' }}</b></td>
                <td class="r" :class="{ 'hs-err': r.foyda < 0 }">{{ r.tushum ? fmt(r.foyda) : '—' }}</td>
                <td class="r m">{{ r.tushum ? foizFmt(r.marja) : '—' }}</td>
                <td class="r">{{ fmtMiqdor(r.qoldiq) }}</td>
                <td class="r m">{{ qisqa(r.qoldiq_qiymat) }}</td>
                <td class="r"><span class="hs-belgi" :class="yetadiTon(r.yetadi_kun)">{{ r.yetadi_kun === null ? (r.qoldiq ? 'sotilmayapti' : '—') : r.yetadi_kun + ' kun' }}</span></td>
                <td class="r m">{{ kunOldin(r.sotilmagan_kun) }}</td>
              </tr>
              <tr v-if="!rows.length"><td colspan="10"><div class="hs-bosh"><svg viewBox="0 0 24 24" v-html="IKON.qidir"/>Mos tovar topilmadi</div></td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="hs-karta">
        <div class="hs-karta-hd">
          <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.pirog"/></span>
          <div class="hs-kt"><h2>Turkumlar</h2><p>Tushum, foyda va omborda turgan pul — turkum kesimida</p></div>
        </div>
        <div class="hs-karta-b hs-karta-b--0 hs-jw">
          <table class="hs-jadval">
            <thead><tr><th>Turkum</th><th class="r">Tovar turi</th><th class="r">Tushum</th><th class="r">Yalpi foyda</th><th class="r">Marja</th><th class="r">Ombordagi qiymat</th></tr></thead>
            <tbody>
              <tr v-for="t in d.turkumlar" :key="t.nomi" class="bos" @click="turkum = t.nomi; filtr = ''">
                <td><b>{{ t.nomi }}</b></td><td class="r">{{ t.soni }}</td><td class="r">{{ fmt(t.tushum) }}</td>
                <td class="r">{{ fmt(t.foyda) }}</td><td class="r m">{{ foizFmt(t.marja) }}</td><td class="r">{{ fmtMiqdor(t.qoldiq_qiymat) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </HisobotSahifa>
</template>

<style scoped>
.tv-abc { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:10px; }
.tv-abc-g { display:flex; align-items:center; gap:12px; padding:13px 14px; background:var(--surface); border:1px solid var(--line); border-radius:12px; cursor:pointer; text-align:left; font:inherit; color:inherit; }
.tv-abc-g:hover, .tv-abc-g.on { border-color:var(--brand-300); background:var(--acc-soft); }
.tv-abc-g .hs-belgi { width:30px; height:30px; font-size:14px; border-radius:8px; flex-shrink:0; }
.tv-abc-t { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
.tv-abc-t b { font-size:13px; font-weight:600; }
.tv-abc-t span { font-size:12px; color:var(--mut); }
.tv-abc-g em { font-style:normal; font-weight:650; font-size:13px; color:var(--acc); font-variant-numeric:tabular-nums; }
.tv-abc-bar { grid-column:1 / -1; display:flex; height:8px; border-radius:4px; overflow:hidden; gap:2px; }
.tv-abc-bar i { display:block; }
.tv-A { background:var(--brand-600); } .tv-B { background:var(--brand-300); } .tv-C { background:var(--line); }
.tv-chip { padding:12px 16px 0; }
.tv-jw { max-height:620px; overflow:auto; }
@media (max-width:900px) { .tv-abc { grid-template-columns:1fr; } }
</style>
