<script setup lang="ts">
/* SOTUV VA FOYDA — qancha sotdik, qancha foyda qoldi; agent, turkum, mijoz,
   to'lov turi va hafta kunlari kesimida. */
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
// @ts-ignore
import { tahlilApi } from '@/api/api'
import HisobotSahifa from './kit/HisobotSahifa.vue'
import KpiKarta from './kit/KpiKarta.vue'
import UstunGrafik from './kit/UstunGrafik.vue'
import HalqaGrafik from './kit/HalqaGrafik.vue'
import { fmtMiqdor, davr, useYuklash, qisqa, fmt, foizFmt, ozgarish, sanaQisqa, csvYukla, IKON, RANG, GURUH_NOM } from './kit/hisobot'

const router = useRouter()
const agent = ref<number | ''>('')
const { data: d, yuklanmoqda } = useYuklash(() => tahlilApi.sotuv({ dan: davr.dan.value, gacha: davr.gacha.value, agent_id: agent.value }), [agent])

const IZOH = [
  { nom: 'Tushum', matn: 'Yetkazib berilgan buyurtmalar summasi, yetkazilgan kuni bo\'yicha. Yangi, yo\'ldagi va bekor qilingan buyurtmalar kirmaydi.' },
  { nom: 'Sof tushum', matn: 'Tushumdan shu davrda qabul qilingan qaytarishlar ayiriladi.' },
  { nom: 'Tannarx', matn: "Sotilgan kg × o'rtacha kirim narxi (so'nggi 90 kundagi xaridlar, miqdorga qarab og'irlikli)." },
  { nom: 'Yalpi foyda / marja', matn: 'Foyda = sof tushum − tannarx; marja = foyda ÷ sof tushum. Xarajatlar (ijara, ish haqi) bu yerda ayirilmaydi — ular Moliya bo\'limida.' },
  { nom: "O'rtacha chek", matn: 'Tushum ÷ buyurtmalar soni.' },
  { nom: 'Hafta kunlari', matn: "Har hafta kunining o'rtacha bir kunlik tushumi — qaysi kunlari savdo kuchli ekanini ko'rsatadi." },
]

const j = computed(() => d.value?.jami || {})
const o = computed(() => d.value?.oldingi || {})
const tolovRang: Record<string, string> = { naqd: RANG.brand, plastik: RANG.brand2, qarz: RANG.warn, nomalum: RANG.neytral }

/* Jadval saralash */
const agSaralash = ref<{ k: string; t: 1 | -1 }>({ k: 'tushum', t: -1 })
const agentlar = computed(() => {
  const r = [...(d.value?.agentlar || [])]
  const { k, t } = agSaralash.value
  return r.sort((a: any, b: any) => (typeof a[k] === 'string' ? a[k].localeCompare(b[k]) : a[k] - b[k]) * t)
})
function sarala(k: string) { agSaralash.value = { k, t: agSaralash.value.k === k ? (agSaralash.value.t === 1 ? -1 : 1) : -1 } }
const maxAgent = computed(() => Math.max(1, ...(d.value?.agentlar || []).map((a: any) => a.tushum)))

const eKuchliKun = computed(() => {
  const h = d.value?.hafta_kunlari || []
  if (!h.length) return null
  const top = [...h].sort((a: any, b: any) => b.ortacha - a.ortacha)
  return { kuchli: top[0], kuchsiz: top[top.length - 1] }
})
const KUN_NOM: Record<string, string> = { Du: 'dushanba', Se: 'seshanba', Ch: 'chorshanba', Pa: 'payshanba', Ju: 'juma', Sh: 'shanba', Ya: 'yakshanba' }

function eksport() {
  csvYukla('sotuv_agentlar', [
    { k: 'nomi', nom: 'Agent' }, { k: 'tushum', nom: 'Tushum' }, { k: 'foyda', nom: 'Yalpi foyda' }, { k: 'marja', nom: 'Marja %' },
    { k: 'buyurtma', nom: 'Buyurtmalar' }, { k: 'mijoz', nom: 'Mijozlar' }, { k: 'ortacha_chek', nom: "O'rtacha chek" }, { k: 'ulush', nom: 'Ulush %' },
  ], d.value?.agentlar || [])
}
</script>

<template>
  <HisobotSahifa :ikon="IKON.osish" nom="Sotuv va foyda" savol="Qancha sotdik, qancha foyda qoldi — va bu kimning, nimaning hisobiga"
    :izohlar="IZOH" :yuklanmoqda="yuklanmoqda">
    <template #amal>
      <button class="hs-btn hs-btn--s" :disabled="!d" @click="eksport"><svg viewBox="0 0 24 24" v-html="IKON.yuklab"/>Excel</button>
    </template>
    <template #filtr>
      <select v-model="agent" class="hs-sel">
        <option value="">Barcha agentlar</option>
        <option v-for="a in d?.agentlar_royxat || []" :key="a.id" :value="a.id">{{ a.nomi }}</option>
      </select>
    </template>

    <div v-if="!d" class="hs-grid hs-grid--kpi"><div v-for="i in 5" :key="i" class="hs-skelet" style="height:104px"/></div>

    <template v-else>
      <div class="hs-grid hs-grid--kpi">
        <KpiKarta nom="Sof tushum" :ikon="IKON.savat" :qiymat="j.sof_tushum" birlik="so'm" :delta="ozgarish(j.sof_tushum, o.sof_tushum)"
          :izoh="j.qaytarish ? `Qaytarish ${qisqa(j.qaytarish)} ayirildi` : 'Qaytarish yo\'q'"/>
        <KpiKarta nom="Yalpi foyda" :ikon="IKON.osish" :qiymat="j.foyda" birlik="so'm" :ton="j.foyda >= 0 ? 'ok' : 'err'"
          :delta="ozgarish(j.foyda, o.foyda)" :izoh="`Tannarx ${qisqa(j.tannarx)}`"/>
        <KpiKarta nom="Marja" :ikon="IKON.pirog" :qiymat="foizFmt(j.marja)" :izoh="`Oldingi davrda ${foizFmt(o.marja)}`"
          :ton="j.marja >= o.marja ? 'ok' : 'warn'"/>
        <KpiKarta nom="Buyurtmalar" :ikon="IKON.chek" :qiymat="j.buyurtma" toliq :delta="ozgarish(j.buyurtma, o.buyurtma)"
          :izoh="`${fmtMiqdor(j.dona)} kg tovar`"/>
        <KpiKarta nom="O'rtacha chek" :ikon="IKON.hamyon" :qiymat="j.ortacha_chek" birlik="so'm" :delta="ozgarish(j.ortacha_chek, o.ortacha_chek)"
          :izoh="`${j.mijoz} ta mijoz xarid qildi`"/>
      </div>

      <section class="hs-karta">
        <div class="hs-karta-hd">
          <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.grafik"/></span>
          <div class="hs-kt"><h2>Tushum va foyda dinamikasi</h2><p>{{ GURUH_NOM[d.davr.guruh] }} bo'yicha · sichqonchani ustun ustiga olib boring</p></div>
        </div>
        <div class="hs-karta-b">
          <UstunGrafik :data="d.trend" :guruh="d.davr.guruh" :balandlik="270"
            :seriyalar="[{ k: 'tushum', nom: 'Tushum', rang: RANG.brand }, { k: 'foyda', nom: 'Yalpi foyda', rang: RANG.ok, tur: 'chiziq' }]">
            <template #tip="{ d: t }"><div class="ss-tip">{{ t.buyurtma }} buyurtma</div></template>
          </UstunGrafik>
        </div>
      </section>

      <!-- ═══ AGENTLAR ═══ -->
      <section class="hs-karta">
        <div class="hs-karta-hd">
          <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.agent"/></span>
          <div class="hs-kt"><h2>Agentlar bo'yicha</h2><p>Kim qancha sotdi va qancha foyda keltirdi · ustun nomini bosib saralang · agentni bosing — xodim hisoboti</p></div>
        </div>
        <div class="hs-karta-b hs-karta-b--0 hs-jw">
          <table class="hs-jadval">
            <thead><tr>
              <th class="s" :class="{ on: agSaralash.k === 'nomi' }" @click="sarala('nomi')">Agent</th>
              <th class="s r" :class="{ on: agSaralash.k === 'tushum' }" @click="sarala('tushum')">Tushum</th>
              <th class="s r" :class="{ on: agSaralash.k === 'foyda' }" @click="sarala('foyda')">Yalpi foyda</th>
              <th class="s r" :class="{ on: agSaralash.k === 'marja' }" @click="sarala('marja')">Marja</th>
              <th class="s r" :class="{ on: agSaralash.k === 'buyurtma' }" @click="sarala('buyurtma')">Buyurtma</th>
              <th class="s r" :class="{ on: agSaralash.k === 'mijoz' }" @click="sarala('mijoz')">Mijoz</th>
              <th class="s r" :class="{ on: agSaralash.k === 'ortacha_chek' }" @click="sarala('ortacha_chek')">O'rtacha chek</th>
              <th class="r">Ulush</th>
            </tr></thead>
            <tbody>
              <tr v-for="a in agentlar" :key="a.id ?? 0" :class="{ bos: a.id }" :title="a.id ? 'Xodim hisobotini ochish' : ''"
                @click="a.id && router.push(`/hisobot/xodim?agent=${a.id}`)">
                <td><div class="hs-nom"><b>{{ a.nomi }}</b></div></td>
                <td class="r"><span class="hs-mini"><i :style="{ width: (a.tushum / maxAgent * 100) + '%' }"/></span><b>{{ fmt(a.tushum) }}</b></td>
                <td class="r" :class="a.foyda >= 0 ? '' : 'hs-err'">{{ fmt(a.foyda) }}</td>
                <td class="r"><span class="hs-belgi" :class="a.marja >= j.marja ? 'hs-belgi--ok' : 'hs-belgi--n'">{{ foizFmt(a.marja) }}</span></td>
                <td class="r">{{ a.buyurtma }}</td>
                <td class="r">{{ a.mijoz }}</td>
                <td class="r">{{ fmt(a.ortacha_chek) }}</td>
                <td class="r m">{{ foizFmt(a.ulush) }}</td>
              </tr>
              <tr v-if="!agentlar.length"><td colspan="8"><div class="hs-bosh">Bu davrda sotuv yo'q</div></td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <div class="hs-grid hs-grid--2">
        <section class="hs-karta">
          <div class="hs-karta-hd">
            <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.qutilar"/></span>
            <div class="hs-kt"><h2>Turkumlar bo'yicha</h2><p>Qaysi tovar guruhi ko'p sotiladi va qaysi biri foydaliroq</p></div>
          </div>
          <div class="hs-karta-b">
            <HalqaGrafik :items="d.turkumlar.map((t: any) => ({ nom: t.nomi, qiymat: t.tushum }))" markaz-izoh="tushum" :maks="6"/>
            <table class="hs-jadval ss-tk">
              <thead><tr><th>Turkum</th><th class="r">Foyda</th><th class="r">Marja</th></tr></thead>
              <tbody>
                <tr v-for="t in d.turkumlar.slice(0, 6)" :key="t.nomi">
                  <td>{{ t.nomi }}</td><td class="r">{{ qisqa(t.foyda) }}</td>
                  <td class="r"><span class="hs-belgi" :class="t.marja >= j.marja ? 'hs-belgi--ok' : 'hs-belgi--n'">{{ foizFmt(t.marja) }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <div class="ss-col">
          <section class="hs-karta">
            <div class="hs-karta-hd">
              <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.hamyon"/></span>
              <div class="hs-kt"><h2>To'lov turlari</h2><p>Qarzga sotilgani mijozlar qarzini oshiradi</p></div>
            </div>
            <div class="hs-karta-b">
              <HalqaGrafik :items="d.tolov.map((t: any) => ({ nom: t.nom, qiymat: t.summa, rang: tolovRang[t.k] }))" markaz-izoh="tushum" :olcham="140"/>
            </div>
          </section>
          <section class="hs-karta">
            <div class="hs-karta-hd">
              <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.soat"/></span>
              <div class="hs-kt"><h2>Hafta kunlari</h2><p>O'rtacha bir kunlik tushum</p></div>
            </div>
            <div class="hs-karta-b">
              <div class="ss-hk">
                <div v-for="h in d.hafta_kunlari" :key="h.kun" class="ss-hk-k" :title="`${KUN_NOM[h.kun]}: o'rtacha ${fmt(h.ortacha)} so'm`">
                  <span class="ss-hk-v">{{ qisqa(h.ortacha) }}</span>
                  <i :style="{ height: Math.max(3, h.ortacha / Math.max(1, ...d.hafta_kunlari.map((x: any) => x.ortacha)) * 100) + '%' }"
                    :class="{ top: eKuchliKun && h.kun === eKuchliKun.kuchli.kun }"/>
                  <b>{{ h.kun }}</b>
                </div>
              </div>
              <p v-if="eKuchliKun && eKuchliKun.kuchli.ortacha > 0" class="hs-tushuncha ss-hk-iz">
                <svg viewBox="0 0 24 24" v-html="IKON.info"/>
                <span>Eng kuchli kun — <b>{{ KUN_NOM[eKuchliKun.kuchli.kun] }}</b>, eng sust — <b>{{ KUN_NOM[eKuchliKun.kuchsiz.kun] }}</b>.</span>
              </p>
            </div>
          </section>
        </div>
      </div>

      <section class="hs-karta">
        <div class="hs-karta-hd">
          <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.dokon"/></span>
          <div class="hs-kt"><h2>Eng ko'p xarid qilgan mijozlar</h2><p>Top 15 · qatorni bosing — mijozning oldi-berdisi ochiladi</p></div>
        </div>
        <div class="hs-karta-b hs-karta-b--0 hs-jw">
          <table class="hs-jadval">
            <thead><tr><th>#</th><th>Mijoz</th><th class="r">Tushum</th><th class="r">Yalpi foyda</th><th class="r">Marja</th><th class="r">Buyurtma</th><th class="r">O'rtacha chek</th><th class="r">Oxirgi xarid</th></tr></thead>
            <tbody>
              <tr v-for="(m, i) in d.mijozlar" :key="m.id" class="bos" @click="router.push(`/mijozlar/oldi-berdi?mijoz=${m.id}`)">
                <td class="m">{{ Number(i) + 1 }}</td>
                <td><div class="hs-nom"><b>{{ m.nomi }}</b><small>{{ m.agent }}</small></div></td>
                <td class="r"><b>{{ fmt(m.tushum) }}</b></td>
                <td class="r">{{ fmt(m.foyda) }}</td>
                <td class="r m">{{ foizFmt(m.marja) }}</td>
                <td class="r">{{ m.buyurtma }}</td>
                <td class="r">{{ fmt(m.ortacha_chek) }}</td>
                <td class="r m">{{ sanaQisqa(m.oxirgi) }}</td>
              </tr>
              <tr v-if="!d.mijozlar.length"><td colspan="8"><div class="hs-bosh">Bu davrda sotuv yo'q</div></td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </HisobotSahifa>
</template>

<style scoped>
.ss-tip { margin-top:4px; padding-top:5px; border-top:1px solid var(--line2); color:var(--mut); }
.ss-tk { margin-top:12px; }
.ss-tk td, .ss-tk th { padding:7px 6px; }
.ss-col { display:flex; flex-direction:column; gap:12px; min-width:0; }
.ss-hk { display:grid; grid-template-columns:repeat(7, 1fr); gap:8px; height:150px; align-items:end; }
.ss-hk-k { height:100%; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; gap:5px; }
.ss-hk-k i { width:100%; max-width:40px; border-radius:6px 6px 3px 3px; background:var(--brand-200); transition:background .12s; }
.ss-hk-k i.top { background:var(--brand-600); }
.ss-hk-k:hover i { background:var(--brand-400); }
.ss-hk-k b { font-size:12px; font-weight:600; color:var(--mut); }
.ss-hk-v { font-size:10.5px; color:var(--sub); font-variant-numeric:tabular-nums; white-space:nowrap; }
.shell.dark .ss-hk-k i { background:rgba(139,92,246,.35); }
.shell.dark .ss-hk-k i.top { background:var(--brand-500); }
.ss-hk-iz { margin:12px 0 0; }
</style>
