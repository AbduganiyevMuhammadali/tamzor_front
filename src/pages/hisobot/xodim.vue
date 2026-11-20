<script setup lang="ts">
/* XODIM HISOBOTI — bitta agent bo'yicha hammasi bir sahifada: qancha sotdi va qancha foyda
   keltirdi, rejani bajardimi, qaysi mijozlarga bordi, naqdni to'liq topshirdimi, mijozlari
   qancha qarz, avtolavka bo'lsa — har kuni mashinaga nima yuklandi, sotildi va qaytdi. */
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
// @ts-ignore
import { tahlilApi } from '@/api/api'
import HisobotSahifa from './kit/HisobotSahifa.vue'
import KpiKarta from './kit/KpiKarta.vue'
import UstunGrafik from './kit/UstunGrafik.vue'
import HalqaGrafik from './kit/HalqaGrafik.vue'
import ReytingRoyxat from './kit/ReytingRoyxat.vue'
import { fmtMiqdor, davr, useYuklash, qisqa, fmt, foizFmt, ozgarish, sanaQisqa, csvYukla, IKON, RANG, GURUH_NOM } from './kit/hisobot'

const route = useRoute()
const router = useRouter()
const agent = ref<number | ''>(route.query.agent ? Number(route.query.agent) : '')
const { data: d, yuklanmoqda } = useYuklash(() => tahlilApi.xodim({ dan: davr.dan.value, gacha: davr.gacha.value, agent_id: agent.value }), [agent])
/* Tanlov: agent tanlanmagan bo'lsa server birinchisini qaytaradi — ro'yxatda o'shani ko'rsatamiz */
const tanlov = computed({
  get: () => agent.value || d.value?.agent?.id || '',
  set: (v: number | '') => { agent.value = v },
})
watch(agent, v => router.replace({ query: { ...route.query, agent: v ? String(v) : undefined } }))

const IZOH = computed(() => [
  { nom: 'Sof tushum va foyda', matn: "Shu xodim yozgan va yetkazilgan buyurtmalar, yetkazilgan kuni bo'yicha. Qoida \"Sotuv va foyda\" hisoboti bilan bir xil: tannarx — so'nggi 90 kundagi o'rtacha kirim narxi, qaytarishlar ayiriladi." },
  { nom: 'Oylik reja', matn: "Agent kartasidagi oylik reja va tanlangan davr oxirigacha shu oyda yetkazilgan savdo. Bonus — savdo × agent bonus foizi." },
  { nom: 'Tashrif → savdo', matn: "Savdo bilan tugagan tashriflar ÷ jami tashriflar. \"Sotilmadi\" — agent sabab ko'rsatib chiqqan tashriflar." },
  { nom: 'Naqd', matn: "Yig'ildi — agent qo'lidan o'tgan naqd: naqd sotuv va mijozlardan qarz undirish. Topshirildi — kassir inkassatsiyada qabul qilgani. Kamomad — kassir qayd etgan yetishmovchilik." },
  { nom: 'Uzoqdan sotuv', matn: `Sotuv mijoz nuqtasidan ${d.value?.sotuv?.radius || 300} m dan uzoqda rasmiylashtirilgan — tekshirish kerak bo'lishi mumkin.` },
  { nom: 'Qamrov', matn: "Xodimga biriktirilgan faol mijozlardan shu davrda xarid qilganlari. Xarid qilmaganlar ro'yxati — keyingi tashrif uchun." },
  { nom: 'Kunlar', matn: "Har kuni agentga berilgan, sotilgan, omborga qaytgan tovar va topshirilgan naqd. Farq — tushuntirilmagan tovar yoki pul." },
])

const s = computed(() => d.value?.sotuv?.jami || {})
const o = computed(() => d.value?.sotuv?.oldingi || {})
const ag = computed(() => d.value?.agent || null)
const bosh = (nom: string) => (nom || '?').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase()

const KUN_NOM: Record<string, string> = { Du: 'Dushanba', Se: 'Seshanba', Ch: 'Chorshanba', Pa: 'Payshanba', Ju: 'Juma', Sh: 'Shanba', Ya: 'Yakshanba' }
const vaqt = (v: string) => { const t = new Date(v); return isNaN(+t) ? '' : `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}` }
const masofa = (m: number) => m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`

/* Kun yo'li: voqea matni va rangi (Avtolavka sahifasi bilan bir xil so'zlar) */
function voqeaMatn(e: any) {
  switch (e.tur) {
    case 'sorov': return `Yuklash so'radi ${e.raqam} · ${fmtMiqdor(e.dona)} kg${e.holat === 'qoralama' ? ' · omborchida' : e.holat === 'bekor' ? ' · bekor' : ''}`
    case 'yuklash': return `Omborchi yukladi ${e.raqam} · ${fmtMiqdor(e.dona)} kg · ${qisqa(e.summa)} so'm`
    case 'agent_qabul': return `Yukni sanab qabul qildi ${e.raqam}`
    case 'sotuv': return `${e.mijoz} · ${e.naqd ? 'naqd' : 'qarzga'} ${fmt(e.summa)} so'm${e.uzoq ? ` · mijoz nuqtasidan ${masofa(e.masofa)} uzoqda` : ''}`
    case 'tolov': return `${e.mijoz} · qarzdan to'ladi ${fmt(e.summa)} so'm`
    case 'sotmaslik': return `${e.mijoz} · sotilmadi${e.sabab ? ` (${e.sabab})` : ''}`
    case 'mijozda': return `${e.mijoz} · tashrif yopilmagan`
    case 'tashrif': return `${e.mijoz} · tashrif${e.ochiq ? ' (yopilmagan)' : ''}`
    case 'kun_yopish': return `Kunni yopdi${e.naqd != null ? ` · o'zi sanagan naqd ${fmt(e.naqd)} so'm` : ''}`
    case 'qabul': return `Qoldiq omborga qaytdi ${e.raqam || ''}${e.farq ? ` · farq ${e.farq}` : ''}`
    case 'kassa': return `Kassaga topshirdi ${fmt(e.summa)} so'm${e.kutilgan != null && Math.abs(e.kutilgan - e.summa) > 0.5 ? ` · kerak edi ${fmt(e.kutilgan)}` : ''}`
  }
  return e.tur
}
const voqeaTon = (e: any) => e.tur === 'sotmaslik' || (e.tur === 'kassa' && e.holat === 'kamomad') || e.uzoq ? 'warn'
  : ['sotuv', 'tolov', 'kassa', 'agent_qabul'].includes(e.tur) ? 'ok' : 'brand'

const maxMijoz = computed(() => Math.max(1, ...(d.value?.mijozlar || []).map((m: any) => m.tushum)))
const avtoJami = computed(() => {
  const k = d.value?.avtolavka?.kunlar || []
  return k.reduce((a: any, x: any) => ({
    yuklandi: a.yuklandi + x.yuklandi, sotildi: a.sotildi + x.sotildi, qaytdi: a.qaytdi + x.qaytdi, tovar_farq: a.tovar_farq + (x.bosqich >= 3 ? x.tovar_farq : 0),
    sotuv: a.sotuv + x.sotuv, naqd_kerak: a.naqd_kerak + x.naqd_kerak, naqd_topshirildi: a.naqd_topshirildi + x.naqd_topshirildi, naqd_farq: a.naqd_farq + (x.bosqich >= 3 ? x.naqd_farq : 0),
  }), { yuklandi: 0, sotildi: 0, qaytdi: 0, tovar_farq: 0, sotuv: 0, naqd_kerak: 0, naqd_topshirildi: 0, naqd_farq: 0 })
})

function chopEt() { window.print() }

function eksport() {
  if (!d.value) return
  csvYukla(`xodim_${(ag.value?.nomi || 'agent').replace(/\s+/g, '_')}`, [
    { k: 'nomi', nom: 'Mijoz' }, { k: 'tashrif', nom: 'Tashrif' }, { k: 'buyurtma', nom: 'Buyurtma' }, { k: 'tushum', nom: 'Sotuv' },
    { k: 'naqd', nom: 'Naqd' }, { k: 'qarzga', nom: 'Qarzga' }, { k: 'qarz', nom: 'Hozirgi qarz' }, { k: 'oxirgi', nom: 'Oxirgi xarid' },
  ], d.value.mijozlar || [])
}
</script>

<template>
  <HisobotSahifa :ikon="IKON.agent" nom="Agent hisoboti" savol="Bu agent qanday ishladi: qancha sotdi, qayerga bordi, pulni to'liq topshirdimi"
    :izohlar="IZOH" :yuklanmoqda="yuklanmoqda">
    <template #amal>
      <button class="hs-btn hs-btn--s" :disabled="!d" @click="eksport"><svg viewBox="0 0 24 24" v-html="IKON.yuklab"/>Excel</button>
      <button class="hs-btn hs-btn--s" :disabled="!d" @click="chopEt"><svg viewBox="0 0 24 24" v-html="IKON.chek"/>Chop etish</button>
    </template>
    <template #filtr>
      <select v-model="tanlov" class="hs-sel xh-sel">
        <option v-for="a in d?.agentlar_royxat || []" :key="a.id" :value="a.id">{{ a.nomi }}{{ a.avtolavka ? ' · Van Sell' : '' }}</option>
      </select>
    </template>

    <div v-if="!d" class="hs-grid hs-grid--kpi"><div v-for="i in 6" :key="i" class="hs-skelet" style="height:104px"/></div>
    <div v-else-if="!ag" class="hs-karta"><div class="hs-bosh">Agentlar yo'q</div></div>

    <template v-else>
      <!-- ═══ PROFIL ═══ -->
      <section class="hs-karta xh-profil">
        <div class="xh-av">{{ bosh(ag.nomi) }}</div>
        <div class="xh-pt">
          <h2>{{ ag.nomi }}</h2>
          <div class="xh-chips">
            <span v-if="ag.avtolavka" class="hs-belgi hs-belgi--ok">Van Sell{{ ag.mashina_raqam ? ' · ' + ag.mashina_raqam : '' }}</span>
            <span v-else class="hs-belgi hs-belgi--n">Agent (buyurtma yozadi)</span>
            <span v-if="ag.hudud" class="xh-c">{{ ag.hudud }}</span>
            <span v-if="ag.telefon" class="xh-c">{{ ag.telefon }}</span>
            <span class="xh-c">{{ ag.mijoz_soni }} ta mijoz biriktirilgan</span>
            <span v-if="ag.ish_boshlagan" class="xh-c">ishda {{ sanaQisqa(ag.ish_boshlagan) }} dan</span>
          </div>
        </div>
        <div class="xh-davr">
          <small>Davr</small>
          <b>{{ d.davr.dan === d.davr.gacha ? sanaQisqa(d.davr.dan) : `${sanaQisqa(d.davr.dan)} – ${sanaQisqa(d.davr.gacha)}` }}</b>
          <small>{{ d.davr.kunlar }} kun</small>
        </div>
      </section>

      <!-- ═══ KPI ═══ -->
      <div class="hs-grid hs-grid--kpi xh-kpi">
        <KpiKarta nom="Sof tushum" :ikon="IKON.savat" :qiymat="s.sof_tushum" birlik="so'm" :delta="ozgarish(s.sof_tushum, o.sof_tushum)"
          :izoh="`${s.buyurtma || 0} buyurtma · ${s.mijoz || 0} mijoz`"/>
        <KpiKarta nom="Yalpi foyda" :ikon="IKON.osish" :qiymat="s.foyda" birlik="so'm" :ton="s.foyda >= 0 ? 'ok' : 'err'"
          :delta="ozgarish(s.foyda, o.foyda)" :izoh="`marja ${foizFmt(s.marja)}`"/>
        <KpiKarta nom="Oylik reja" :ikon="IKON.pirog" :qiymat="d.plan.plan ? foizFmt(d.plan.foiz, 0) : '—'"
          :ton="!d.plan.plan ? 'neytral' : d.plan.foiz >= 100 ? 'ok' : 'warn'"
          :izoh="d.plan.plan ? `${qisqa(d.plan.fakt)} / ${qisqa(d.plan.plan)} · bonus ${qisqa(d.plan.bonus)}` : `Reja belgilanmagan · fakt ${qisqa(d.plan.fakt)}`"/>
        <KpiKarta nom="Tashrif → savdo" :ikon="IKON.dokon" :qiymat="foizFmt(d.tashrif.konversiya, 0)"
          :ton="d.tashrif.konversiya >= 60 ? 'ok' : d.tashrif.jami ? 'warn' : 'neytral'"
          :izoh="`${d.tashrif.jami} tashrif · ${d.tashrif.sotmaslik} sotilmadi`"/>
        <KpiKarta nom="Naqd topshirildi" :ikon="IKON.kassa" :qiymat="d.pul.topshirildi" birlik="so'm"
          :ton="d.pul.kamomad > 0 ? 'err' : 'ok'"
          :izoh="d.pul.kamomad > 0 ? `kamomad ${fmt(d.pul.kamomad)} so'm` : `yig'ildi ${qisqa(d.pul.yigildi)} · kamomad yo'q`"/>
        <KpiKarta nom="Mijozlar qarzi" :ikon="IKON.hamyon" :qiymat="d.qarz.jami" birlik="so'm" yaxshi="past"
          :ton="d.qarz.muddati_otgan > 0 ? 'err' : 'brand'"
          :izoh="`${d.qarz.qarzdor} qarzdor · muddati o'tgan ${qisqa(d.qarz.muddati_otgan)}`"/>
      </div>

      <!-- ═══ DINAMIKA ═══ -->
      <section class="hs-karta">
        <div class="hs-karta-hd">
          <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.grafik"/></span>
          <div class="hs-kt"><h2>Savdo dinamikasi</h2><p>{{ GURUH_NOM[d.davr.guruh] }} bo'yicha tushum va yalpi foyda</p></div>
        </div>
        <div class="hs-karta-b">
          <UstunGrafik :data="d.trend" :guruh="d.davr.guruh" :balandlik="240"
            :seriyalar="[{ k: 'tushum', nom: 'Tushum', rang: RANG.brand }, { k: 'foyda', nom: 'Yalpi foyda', rang: RANG.ok, tur: 'chiziq' }]">
            <template #tip="{ d: t }"><div class="xh-tip">{{ t.buyurtma }} buyurtma</div></template>
          </UstunGrafik>
        </div>
      </section>

      <div class="hs-grid hs-grid--2">
        <!-- ═══ PUL ═══ -->
        <section class="hs-karta">
          <div class="hs-karta-hd">
            <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.pul"/></span>
            <div class="hs-kt"><h2>Pul: naqd va qarz</h2><p>Sotuv qanday to'landi va naqd kassaga yetdimi</p></div>
          </div>
          <div class="hs-karta-b">
            <HalqaGrafik :items="[{ nom: 'Naqd', qiymat: d.sotuv.naqd, rang: RANG.ok }, { nom: 'Qarzga', qiymat: d.sotuv.qarzga, rang: RANG.warn }]"
              markaz-izoh="sotuv" :olcham="140"/>
            <div class="xh-kv">
              <div><span>Naqd sotuv</span><b>{{ fmt(d.sotuv.naqd) }}</b></div>
              <div><span>Qarzga sotuv</span><b class="xh-warn">{{ fmt(d.sotuv.qarzga) }}</b></div>
              <div><span>Mijozlardan qarz undirildi</span><b>{{ fmt(d.pul.qarz_undirish) }}</b></div>
              <div class="xh-kv-j"><span>Agent qo'lidan o'tgan naqd</span><b>{{ fmt(d.pul.yigildi) }}</b></div>
              <div><span>Kassaga topshirildi</span><b class="xh-ok">{{ fmt(d.pul.topshirildi) }}</b></div>
              <div v-if="d.pul.kamomad"><span>Kamomad</span><b class="hs-err">−{{ fmt(d.pul.kamomad) }}</b></div>
              <div v-if="d.pul.ortiqcha"><span>Ortiqcha</span><b>+{{ fmt(d.pul.ortiqcha) }}</b></div>
            </div>
          </div>
        </section>

        <!-- ═══ TASHRIFLAR ═══ -->
        <section class="hs-karta">
          <div class="hs-karta-hd">
            <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.dokon"/></span>
            <div class="hs-kt"><h2>Tashriflar</h2><p>{{ d.tashrif.mijoz }} ta mijozga bordi · o'rtacha {{ d.tashrif.ort_daqiqa }} daqiqa{{ d.tashrif.reja ? ` · rejada ${d.tashrif.reja}` : '' }}</p></div>
          </div>
          <div class="hs-karta-b">
            <HalqaGrafik :items="[{ nom: 'Savdo', qiymat: d.tashrif.savdo, rang: RANG.ok }, { nom: 'Sotilmadi', qiymat: d.tashrif.sotmaslik, rang: RANG.warn }, { nom: 'Yopilmagan', qiymat: d.tashrif.ochiq, rang: RANG.neytral }]"
              markaz-izoh="tashrif" :olcham="140"/>
            <p class="xh-sub">Nega sotilmadi</p>
            <ReytingRoyxat v-if="d.sabablar.length" :items="d.sabablar.map((x: any) => ({ nom: x.nom, qiymat: x.soni, ong: `${x.soni} marta` }))" :raqamli="false"/>
            <div v-else class="hs-bosh">Sotmaslik qayd etilmagan</div>
            <p v-if="d.sotuv.uzoq || d.tashrif.uzoq" class="hs-tushuncha xh-oq">
              <svg viewBox="0 0 24 24" v-html="IKON.ogoh"/>
              <span><b>{{ d.sotuv.uzoq }}</b> ta sotuv va <b>{{ d.tashrif.uzoq }}</b> ta tashrif mijoz nuqtasidan {{ d.sotuv.radius }} m dan uzoqda qilingan.</span>
            </p>
          </div>
        </section>
      </div>

      <!-- ═══ MASHINA KUNLARI (avtolavka) ═══ -->
      <section v-if="d.avtolavka" class="hs-karta">
        <div class="hs-karta-hd">
          <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.mashina"/></span>
          <div class="hs-kt"><h2>Agent kunlari</h2><p>Yuk berildi → sotildi → omborga qaytdi, naqd → kassa · qatorni bosing — o'sha kun paneli ochiladi</p></div>
        </div>
        <div class="hs-karta-b hs-karta-b--0 hs-jw">
          <table class="hs-jadval">
            <thead><tr>
              <th>Sana</th><th>Holat</th><th class="r">Yuklandi</th><th class="r">Sotildi</th><th class="r">Qaytdi</th><th class="r">Tovar farqi</th>
              <th class="r">Sotuv</th><th class="r">Naqd kerak</th><th class="r">Topshirdi</th><th class="r">Naqd farqi</th>
            </tr></thead>
            <tbody>
              <tr v-for="k in d.avtolavka.kunlar" :key="k.sana" class="bos" @click="router.push(`/avtolavka?agent=${ag.id}&sana=${k.sana}`)">
                <td><b>{{ sanaQisqa(k.sana) }}</b></td>
                <td><span class="hs-belgi" :class="k.holat === 'yopiq' ? 'hs-belgi--ok' : k.holat === 'kamomad' ? 'hs-belgi--err' : 'hs-belgi--warn'">{{ k.holat_nomi }}</span></td>
                <td class="r">{{ fmt(k.yuklandi) }}</td>
                <td class="r">{{ fmt(k.sotildi) }}</td>
                <td class="r">{{ fmt(k.qaytdi) }}</td>
                <td v-if="k.bosqich < 3" class="r hs-mut" title="Kun hali yopilmagan — farq qabuldan keyin aniqlanadi">ochiq</td>
                <td v-else class="r" :class="{ 'hs-err': k.tovar_farq > 0 }">{{ k.tovar_farq ? fmt(k.tovar_farq) : '—' }}</td>
                <td class="r"><b>{{ fmt(k.sotuv) }}</b></td>
                <td class="r">{{ fmt(k.naqd_kerak) }}</td>
                <td class="r">{{ fmt(k.naqd_topshirildi) }}</td>
                <td v-if="k.bosqich < 3" class="r hs-mut" title="Kun hali yopilmagan — naqd kassaga topshirilgach solishtiriladi">ochiq</td>
                <td v-else class="r" :class="{ 'hs-err': k.naqd_farq > 0.5 }">{{ Math.abs(k.naqd_farq) > 0.5 ? fmt(k.naqd_farq) : '—' }}</td>
              </tr>
              <tr v-if="!d.avtolavka.kunlar.length"><td colspan="10"><div class="hs-bosh">Bu davrda agent yuk olmagan</div></td></tr>
            </tbody>
            <tfoot v-if="d.avtolavka.kunlar.length > 1"><tr>
              <td colspan="2"><b>Jami {{ d.avtolavka.kunlar.length }} kun</b></td>
              <td class="r"><b>{{ fmt(avtoJami.yuklandi) }}</b></td><td class="r"><b>{{ fmt(avtoJami.sotildi) }}</b></td>
              <td class="r"><b>{{ fmt(avtoJami.qaytdi) }}</b></td><td class="r"><b>{{ fmt(avtoJami.tovar_farq) }}</b></td>
              <td class="r"><b>{{ fmt(avtoJami.sotuv) }}</b></td><td class="r"><b>{{ fmt(avtoJami.naqd_kerak) }}</b></td>
              <td class="r"><b>{{ fmt(avtoJami.naqd_topshirildi) }}</b></td><td class="r"><b>{{ fmt(avtoJami.naqd_farq) }}</b></td>
            </tr></tfoot>
          </table>
        </div>
      </section>

      <!-- ═══ KUN YO'LI (bir kun tanlanganda) ═══ -->
      <section v-if="d.kun" class="hs-karta">
        <div class="hs-karta-hd">
          <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.soat"/></span>
          <div class="hs-kt"><h2>Kun yo'li · {{ sanaQisqa(d.kun.sana) }}</h2><p>{{ d.kun.holat_nomi || 'Tashrif va sotuvlar' }} · vaqt bo'yicha</p></div>
        </div>
        <div class="hs-karta-b">
          <div v-if="!d.kun.voqealar.length" class="hs-bosh">Bu kuni harakat yo'q</div>
          <ol v-else class="xh-yol">
            <li v-for="(e, i) in d.kun.voqealar" :key="i" :class="'t-' + voqeaTon(e)">
              <time>{{ vaqt(e.vaqt) }}</time>
              <i/>
              <span>{{ voqeaMatn(e) }}</span>
            </li>
          </ol>
          <table v-if="d.kun.tovarlar.length" class="hs-jadval xh-kt">
            <thead><tr><th>Tovar</th><th class="r">Berildi</th><th class="r">Sotildi</th><th class="r">Omborga qaytdi</th><th class="r">Brak</th><th class="r">Farq</th></tr></thead>
            <tbody><tr v-for="t in d.kun.tovarlar" :key="t.tovar_id">
              <td>{{ t.tovar_nomi }}</td><td class="r">{{ fmt(t.berildi) }}</td><td class="r">{{ fmt(t.sotildi) }}</td>
              <td class="r">{{ fmt(t.topshirildi) }}</td><td class="r">{{ fmt(t.brak) }}</td><td class="r" :class="{ 'hs-err': t.farq }">{{ t.farq ? fmt(t.farq) : '—' }}</td>
            </tr></tbody>
          </table>
        </div>
      </section>

      <!-- ═══ MIJOZLAR ═══ -->
      <section class="hs-karta">
        <div class="hs-karta-hd">
          <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.agent"/></span>
          <div class="hs-kt"><h2>Mijozlar</h2>
            <p>Qamrov: {{ d.qamrov.jami }} ta biriktirilgan mijozdan <b>{{ d.qamrov.xarid_qilgan }}</b> tasi xarid qildi, {{ d.qamrov.tashrif_qilingan }} tasiga borildi · qatorni bosing — oldi-berdi</p></div>
        </div>
        <div class="hs-karta-b hs-karta-b--0 hs-jw">
          <table class="hs-jadval">
            <thead><tr>
              <th>#</th><th>Mijoz</th><th class="r">Tashrif</th><th class="r">Buyurtma</th><th class="r">Sotuv</th><th class="r">Naqd</th>
              <th class="r">Qarzga</th><th class="r">Hozirgi qarz</th><th class="r">Oxirgi xarid</th>
            </tr></thead>
            <tbody>
              <tr v-for="(m, i) in d.mijozlar" :key="m.id ?? i" class="bos" @click="m.id && router.push(`/mijozlar/oldi-berdi?mijoz=${m.id}`)">
                <td class="m">{{ Number(i) + 1 }}</td>
                <td><div class="hs-nom"><b>{{ m.nomi }}</b></div></td>
                <td class="r">{{ m.tashrif || '—' }}</td>
                <td class="r">{{ m.buyurtma || '—' }}</td>
                <td class="r"><span class="hs-mini"><i :style="{ width: (m.tushum / maxMijoz * 100) + '%' }"/></span><b>{{ fmt(m.tushum) }}</b></td>
                <td class="r">{{ fmt(m.naqd) }}</td>
                <td class="r" :class="{ 'xh-warn': m.qarzga > 0 }">{{ m.qarzga ? fmt(m.qarzga) : '—' }}</td>
                <td class="r" :class="{ 'hs-err': m.muddati_otgan > 0 }">{{ m.qarz ? fmt(m.qarz) : '—' }}</td>
                <td class="r m">{{ m.oxirgi ? sanaQisqa(m.oxirgi) : '—' }}</td>
              </tr>
              <tr v-if="!d.mijozlar.length"><td colspan="9"><div class="hs-bosh">Bu davrda mijozlar bilan ish bo'lmagan</div></td></tr>
            </tbody>
          </table>
        </div>
        <div v-if="d.qamrov.xarid_qilmagan.length" class="hs-karta-b xh-qm">
          <p class="xh-sub">Bu davrda xarid qilmagan mijozlar ({{ d.qamrov.jami - d.qamrov.xarid_qilgan }})</p>
          <div class="xh-chips">
            <span v-for="m in d.qamrov.xarid_qilmagan" :key="m.id" class="xh-c" :title="m.kunlar ? 'Tashrif kunlari: ' + m.kunlar : ''">
              {{ m.nomi }}<small v-if="m.kunlar"> · {{ m.kunlar.split(',').map((k: string) => k.trim()).filter(Boolean).join(' ') }}</small>
            </span>
          </div>
        </div>
      </section>

      <div class="hs-grid hs-grid--2">
        <section class="hs-karta">
          <div class="hs-karta-hd">
            <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.qutilar"/></span>
            <div class="hs-kt"><h2>Ko'p sotgan tovarlari</h2><p>Tushum bo'yicha · kg va marja bilan</p></div>
          </div>
          <div class="hs-karta-b">
            <ReytingRoyxat v-if="d.tovarlar.length" :items="d.tovarlar.map((t: any) => ({ nom: t.nomi, qiymat: t.tushum, izoh: `${fmtMiqdor(t.dona)} kg · marja ${foizFmt(t.marja)}`, ong: qisqa(t.tushum) }))"/>
            <div v-else class="hs-bosh">Sotuv yo'q</div>
          </div>
        </section>
        <section class="hs-karta">
          <div class="hs-karta-hd">
            <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.hamyon"/></span>
            <div class="hs-kt"><h2>Qarzdor mijozlari</h2><p>Hozirgi holat · qarz yoshi FIFO bo'yicha</p></div>
          </div>
          <div class="hs-karta-b">
            <ReytingRoyxat v-if="d.qarz.rows.length" :items="d.qarz.rows.map((q: any) => ({ nom: q.nomi, qiymat: q.qarz, ong: qisqa(q.qarz), rang: q.muddati_otgan > 0 ? RANG.err : RANG.warn,
              izoh: q.muddati_otgan > 0 ? `muddati o'tgan ${qisqa(q.muddati_otgan)}` : q.oxirgi_tolov_sana ? `oxirgi to'lov ${sanaQisqa(q.oxirgi_tolov_sana)}` : 'to\'lov qilmagan' }))"/>
            <div v-else class="hs-bosh">Qarzdor mijoz yo'q</div>
          </div>
        </section>
      </div>
    </template>
  </HisobotSahifa>
</template>

<style scoped>
.xh-sel { min-width: 230px; }
.xh-kpi { grid-template-columns: repeat(auto-fit, minmax(172px, 1fr)) !important; }
.xh-profil { flex-direction: row; align-items: center; gap: 16px; padding: 18px 20px; display: flex; flex-wrap: wrap; }
.xh-av { width: 56px; height: 56px; border-radius: 16px; background: linear-gradient(135deg, var(--brand-600, #7c3aed), var(--brand-400, #a78bfa)); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; flex-shrink: 0; }
.xh-pt { flex: 1; min-width: 220px; display: flex; flex-direction: column; gap: 6px; }
.xh-pt h2 { margin: 0; font-size: 19px; font-weight: 800; color: var(--ink); }
.xh-chips { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.xh-c { font-size: 12px; padding: 3px 9px; border-radius: 999px; background: var(--hov); color: var(--ink2); }
.xh-c small { color: var(--sub); }
.xh-davr { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; }
.xh-davr small { font-size: 11.5px; color: var(--sub); }
.xh-davr b { font-size: 15px; color: var(--ink); }
.xh-tip { font-size: 12px; color: var(--mut); }
.xh-kv { display: flex; flex-direction: column; margin-top: 12px; }
.xh-kv > div { display: flex; justify-content: space-between; gap: 10px; padding: 7px 0; border-bottom: 1px solid var(--line); font-size: 13px; }
.xh-kv > div:last-child { border-bottom: none; }
.xh-kv span { color: var(--mut); }
.xh-kv b { font-variant-numeric: tabular-nums; color: var(--ink); }
.xh-kv-j span, .xh-kv-j b { font-weight: 700; color: var(--ink); }
.xh-ok { color: #059669 !important; }
.xh-warn { color: #d97706 !important; }
.xh-sub { font-size: 12px; font-weight: 700; color: var(--mut); text-transform: uppercase; letter-spacing: .04em; margin: 14px 0 8px; }
.xh-oq { margin: 12px 0 0; }
.xh-yol { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.xh-yol li { display: grid; grid-template-columns: 48px 16px 1fr; gap: 10px; align-items: start; padding: 6px 0; position: relative; font-size: 13.5px; color: var(--ink); }
.xh-yol time { font-variant-numeric: tabular-nums; color: var(--sub); font-size: 12.5px; padding-top: 1px; }
.xh-yol i { width: 10px; height: 10px; border-radius: 50%; margin: 4px auto 0; background: var(--brand-500, #8b5cf6); position: relative; }
.xh-yol li:not(:last-child) i::after { content: ''; position: absolute; left: 4px; top: 12px; width: 2px; height: calc(100% + 14px); background: var(--line); }
.xh-yol li.t-ok i { background: #059669; }
.xh-yol li.t-warn i { background: #d97706; }
.xh-kt { margin-top: 14px; }
.xh-qm { border-top: 1px solid var(--line); }
.bos { cursor: pointer; }
@media print {
  .xh-sel { display: none; }
}
</style>
