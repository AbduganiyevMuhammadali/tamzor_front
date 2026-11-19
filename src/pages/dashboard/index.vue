<script setup lang="ts">
/* BOSH SAHIFA — Won Sell (mashinadan savdo) boshqaruv markazi + asosiy pul.
   Ma'lumot manbalari:
     /avtolavka/doska      — bugungi mashinalar (jonli): yuk, naqd, kun bosqichi, so'rovlar, kamomad
     /avtolavka/sotuvlar   — davr yig'masi shu jurnaldan frontda hisoblanadi (wonsell): jami, oldingi davr,
                             dinamika, agentlar, tovarlar
     /dashboard            — kassa, qarzdorlar, ombor, ogohlantirishlar
   Optom rejimida mashina yo'q: sahifa skladdan sotuvlarni ko'rsatadi (yig'mada kanal=sklad ham bor). */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
// @ts-ignore — api.js tiplanmagan
import { api, dashboardApi } from '@/api/api'
import { authStore } from '@/stores/auth'
import { rejimStore } from '@/stores/rejim'
import { IK } from '@/layouts/nav'
import AnimNum from './components/AnimNum.vue'
import UstunGrafik from '@/pages/hisobot/kit/UstunGrafik.vue'
import HalqaGrafik from '@/pages/hisobot/kit/HalqaGrafik.vue'
import { fmtNum, fmtMiqdor, fmtShort, OYLAR, HAFTA } from './format'

const router = useRouter()
const optom = rejimStore.isOptom
const nom = computed(() => (optom.value ? 'Sotuv' : 'Won Sell'))
const sotuvYoli = computed(() => (optom.value ? '/sotuv/jurnal' : '/avtolavka/sotuvlar'))

/* ── Davr ─────────────────────────────────────────────── */
type Davr = 'bugun' | 'hafta' | 'oy' | 'yil'
const DAVRLAR: { k: Davr; nom: string; kun: number; izoh: string }[] = [
  { k: 'bugun', nom: 'Bugun', kun: 1,   izoh: 'bugun' },
  { k: 'hafta', nom: 'Hafta', kun: 7,   izoh: 'oxirgi 7 kun' },
  { k: 'oy',    nom: 'Oy',    kun: 30,  izoh: 'oxirgi 30 kun' },
  { k: 'yil',   nom: 'Yil',   kun: 365, izoh: 'oxirgi 12 oy' },
]
const DAVR_KEY = 'sellz_bosh_davr'
const saqlangan = (() => { try { return localStorage.getItem(DAVR_KEY) } catch { return null } })()
const davr = ref<Davr>(DAVRLAR.some(d => d.k === saqlangan) ? (saqlangan as Davr) : 'oy')
const davrI = computed(() => DAVRLAR.findIndex(d => d.k === davr.value))
const davrM = computed(() => DAVRLAR[davrI.value]!)
const davrDa = computed(() => (davr.value === 'bugun' ? 'bugun' : `${davrM.value.izoh}da`))          // "oxirgi 30 kunda"
const davrDagi = computed(() => (davr.value === 'bugun' ? 'bugungi' : `${davrM.value.izoh}dagi`))   // "oxirgi 30 kundagi"

const pad = (n: number) => String(n).padStart(2, '0')
const kunKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
function oraliq(kun: number) {
  const g = new Date(), d = new Date()
  d.setDate(d.getDate() - (kun - 1))
  return { dan: kunKey(d), gacha: kunKey(g) }
}

/* ── Ma'lumot ─────────────────────────────────────────── */
const doska = ref<any>(null)      // bugungi mashinalar
const bugunA = ref<any>(null)     // bugungi yig'ma
const agg = ref<any>(null)        // tanlangan davr yig'masi
const grafikA = ref<any>(null)    // "Bugun"da grafik uchun oxirgi 14 kun
const asos = ref<any>(null)       // kassa, qarz, ombor
const yuklanmoqda = ref(false)
const xato = ref('')
const yangilandi = ref<Date | null>(null)

/* Davr yig'masi — backend'dagi mavjud /avtolavka/sotuvlar jurnalidan frontda yig'iladi (alohida endpoint yo'q):
   jami va oldingi davr — jurnalning o'z "jami"si; dinamika, agentlar va tovarlar — cheklar sahifalab o'qilib hisoblanadi.
   30 sahifadan (3000 chek) ko'p bo'lsa dinamika va reytinglar shu 3000 ta eng yangi chek bo'yicha chiqadi. */
const sotuvlar = (dan: string, gacha: string, sahifa = 1) => api.get(`/avtolavka/sotuvlar?dan=${dan}&gacha=${gacha}&page=${sahifa}`)
async function wonsell(kun: number) {
  const { dan, gacha } = oraliq(kun)
  const o1 = new Date(); o1.setDate(o1.getDate() - (2 * kun - 1))
  const o2 = new Date(); o2.setDate(o2.getDate() - kun)
  const [b, old] = await Promise.all([sotuvlar(dan, gacha), sotuvlar(kunKey(o1), kunKey(o2)).catch(() => null)])
  let rows: any[] = b.rows || []
  const sah = Math.min(30, Math.ceil((b.jami?.soni || 0) / (b.limit || 100)))
  if (sah > 1) {
    const qolgan = await Promise.all(Array.from({ length: sah - 1 }, (_, i) => sotuvlar(dan, gacha, i + 2)))
    rows = rows.concat(...qolgan.map((x: any) => x.rows || []))
  }
  const guruh = kun <= 45 ? 'kun' : kun <= 210 ? 'hafta' : 'oy'
  const kalit = (d: Date) => {
    if (guruh === 'oy') return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
    const x = new Date(d); if (guruh === 'hafta') x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
    return kunKey(x)
  }
  const D = new Map<string, any>()
  { // bo'sh kunlar ham — grafik uzilmasin
    const d = new Date(`${dan}T00:00:00`), oxir = new Date(`${gacha}T23:59:59`)
    if (guruh === 'oy') d.setDate(1)
    while (d <= oxir) { const k = kalit(d); if (!D.has(k)) D.set(k, { k, soni: 0, summa: 0, naqd: 0, qarz: 0 }); if (guruh === 'oy') d.setMonth(d.getMonth() + 1); else d.setDate(d.getDate() + (guruh === 'hafta' ? 7 : 1)) }
  }
  const A = new Map<any, any>(), T = new Map<string, any>()
  for (const r of rows) {
    const x = D.get(kalit(new Date(r.vaqt)))
    if (x) { x.soni++; x.summa += r.summa; x.naqd += r.naqd; x.qarz += r.qarz }
    const id = r.agent_id || 'sklad'
    const a = A.get(id) || { id, fullname: r.agent_id ? r.agent_nomi : 'Sklad · xodimsiz', soni: 0, summa: 0, naqd: 0, qarz: 0, m: new Set() }
    a.soni++; a.summa += r.summa; a.naqd += r.naqd; a.qarz += r.qarz; a.m.add(r.mijoz_id); A.set(id, a)
    for (const n of r.tovarlar || []) { const t = T.get(n) || { nomi: n, cheklar: 0 }; t.cheklar++; T.set(n, t) }
  }
  const j = b.jami || {}
  return {
    dan, gacha, guruh,
    jami: { ...j, ortacha_chek: j.soni ? Math.round(j.summa / j.soni) : 0 },
    oldingi: old?.jami || {},
    dinamika: [...D.values()],
    agentlar: [...A.values()].map(a => ({ ...a, mijozlar: a.m.size })).sort((x, y) => y.summa - x.summa),
    top_tovarlar: [...T.values()].sort((x, y) => y.cheklar - x.cheklar).slice(0, 8),
  }
}

async function davrYukla() {
  const d = davrM.value
  const [a, g] = await Promise.all([wonsell(d.kun), d.kun < 7 ? wonsell(14) : null])
  agg.value = a
  grafikA.value = g
  if (d.k === 'bugun') bugunA.value = a
}
async function jonliYukla() {
  const [dk, bg] = await Promise.all([
    optom.value ? null : api.get('/avtolavka/doska').catch(() => null),
    davr.value === 'bugun' ? null : wonsell(1).catch(() => null),
  ])
  doska.value = dk
  if (bg) bugunA.value = bg
}
async function hammasi() {
  yuklanmoqda.value = true
  xato.value = ''
  try {
    await Promise.all([
      davrYukla(),
      jonliYukla(),
      dashboardApi.main('month').then((d: any) => { asos.value = d }).catch(() => null),
    ])
    yangilandi.value = new Date()
  } catch (e: any) {
    xato.value = e?.message || "Ma'lumot yuklanmadi"
  } finally {
    yuklanmoqda.value = false
  }
}
watch(davr, async v => {
  try { localStorage.setItem(DAVR_KEY, v) } catch { /* xotira yo'q */ }
  yuklanmoqda.value = true
  try { await davrYukla(); yangilandi.value = new Date() } catch (e: any) { xato.value = e?.message || '' } finally { yuklanmoqda.value = false }
})

// Jonli qism har daqiqada yangilanadi (tab ko'rinmasa — yo'q)
let taymer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  hammasi()
  taymer = setInterval(() => {
    if (document.hidden) return
    jonliYukla().then(() => { yangilandi.value = new Date() }).catch(() => null)
    if (davr.value === 'bugun') davrYukla().catch(() => null)
  }, 60000)
})
onUnmounted(() => { if (taymer) clearInterval(taymer) })

/* ── Formatlash ───────────────────────────────────────── */
const sonQism = (v: number) => { const a = Math.abs(v); return a >= 1e9 ? (v / 1e9).toFixed(1) : a >= 1e6 ? (v / 1e6).toFixed(1) : fmtNum(v) }
const birlik = (v: number) => { const a = Math.abs(v); return a >= 1e9 ? "mlrd so'm" : a >= 1e6 ? "mln so'm" : "so'm" }
const pulQ = (v: number) => `${fmtShort(v)} so'm`
const ulush = (q: number, j: number) => (j > 0 ? Math.round((q / j) * 100) : 0)
const osish = (h: number, o: number): number | null => (!o ? (h ? null : 0) : Math.round(((h - o) / o) * 100))
const initsial = (s: string) => (s || '?').split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase()
const ism = computed(() => (authStore.user.value?.fullname || '').split(' ')[0] || '')
const salom = computed(() => { const h = new Date().getHours(); return h < 5 ? 'Xayrli tun' : h < 11 ? 'Xayrli tong' : h < 18 ? 'Xayrli kun' : 'Xayrli kech' })
const bugunMatn = (() => { const d = new Date(); const h = HAFTA[d.getDay()] || ''; return `${h.charAt(0).toUpperCase() + h.slice(1)}, ${d.getDate()}-${OYLAR[d.getMonth()]}` })()
const vaqt = (d: Date | null) => (d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : '')

/* ── KPI (tanlangan davr) ─────────────────────────────── */
const J = computed<any>(() => agg.value?.jami || {})
const O = computed<any>(() => agg.value?.oldingi || {})
const kpilar = computed(() => {
  const j = J.value, o = O.value
  const oChek = o.soni ? o.summa / o.soni : 0
  return [
    { k: 'summa', nom: 'Sotuv',          v: j.summa || 0,        pul: true,  o: osish(j.summa, o.summa),        izoh: `${fmtNum(j.soni || 0)} ta chek`, ikon: IK.savat },
    { k: 'naqd',  nom: 'Naqd tushum',    v: j.naqd || 0,         pul: true,  o: osish(j.naqd, o.naqd),          izoh: `sotuvning ${ulush(j.naqd, j.summa)}%`, ikon: IK.pul },
    { k: 'qarz',  nom: 'Qarzga sotildi', v: j.qarz || 0,         pul: true,  o: osish(j.qarz, o.qarz),          izoh: `sotuvning ${ulush(j.qarz, j.summa)}%`, ikon: IK.almash, teskari: true },
    { k: 'chek',  nom: "O'rtacha chek",  v: j.ortacha_chek || 0, pul: true,  o: osish(j.ortacha_chek, oChek),   izoh: 'bir sotuv summasi', ikon: IK.chek },
    { k: 'mijoz', nom: 'Mijozlar',       v: j.mijozlar || 0,     pul: false, o: osish(j.mijozlar, o.mijozlar), izoh: `${fmtMiqdor(j.dona || 0)} kg sotildi`, ikon: IK.dokon },
  ]
})
const osishKlass = (k: { o: number | null; teskari?: boolean }) =>
  k.o === null ? 'yangi' : k.o === 0 ? 'teng' : (k.o > 0) !== !!k.teskari ? 'yaxshi' : 'yomon'

/* ── Mashinalar (bugun, jonli) ────────────────────────── */
const BOSQICH = [
  { nom: 'Chiqmagan',    rang: '#94a3b8' },
  { nom: 'Savdoda',      rang: '#7c3aed' },
  { nom: 'Topshirmoqda', rang: '#d97706' },
  { nom: 'Kun yopildi',  rang: '#059669' },
]
const KAMOMAD = '#dc2626'
const mashinalar = computed<any[]>(() =>
  [...(doska.value?.mashinalar || [])].sort((a, b) => (b.pul?.sotuv_jami || 0) - (a.pul?.sotuv_jami || 0)))
const DJ = computed<any>(() => doska.value?.jami || {})
const holatNom = (m: any) => (m.holat === 'kamomad' ? 'Kamomad' : BOSQICH[m.bosqich]?.nom || '')
const holatRang = (m: any) => (m.holat === 'kamomad' ? KAMOMAD : BOSQICH[m.bosqich]?.rang || '#94a3b8')
const bosqichlar = computed(() => BOSQICH.map((b, i) => ({ ...b, son: mashinalar.value.filter(m => m.bosqich === i).length })))
const yuklangan = (m: any) => (m.tovar?.kun_boshi?.summa || 0) + (m.tovar?.berildi?.summa || 0)
const sotildiFoiz = (m: any) => { const y = yuklangan(m); return y ? Math.min(100, Math.round(((m.tovar?.sotildi?.summa || 0) / y) * 100)) : 0 }
const keldi = (m: any) => !!m.kun_yopish && m.bosqich < 3
const mashinaOch = (m: any) => router.push({ path: '/avtolavka', query: { agent: m.agent?.id } })

/* ── Bugungi banner ───────────────────────────────────── */
const BJ = computed<any>(() => bugunA.value?.jami || {})

/* ── Diqqat talab ─────────────────────────────────────── */
const ogoh = computed(() => {
  const r: { ton: 'xato' | 'ogoh' | 'ish' | 'info'; matn: string; izoh: string; yol: string; ikon: string }[] = []
  const j = DJ.value
  if (j.kamomad_tovar > 0 || j.kamomad_pul > 0) {
    const q = [j.kamomad_tovar > 0 ? `${fmtMiqdor(j.kamomad_tovar)} kg tovar` : '', j.kamomad_pul > 0 ? pulQ(j.kamomad_pul) : ''].filter(Boolean)
    r.push({ ton: 'xato', matn: 'Kamomad bor', izoh: q.join(' · '), yol: '/avtolavka', ikon: IK.qalqon })
  }
  if (j.topshirishga_keldi) r.push({ ton: 'ish', matn: `${j.topshirishga_keldi} ta mashina topshirishga keldi`, izoh: 'qoldiq va pulni qabul qiling', yol: '/avtolavka', ikon: IK.mashina })
  if (j.sorov) r.push({ ton: 'ish', matn: `${j.sorov} ta yuklash so'rovi`, izoh: 'tasdiqlash kutmoqda', yol: '/avtolavka', ikon: IK.quti })
  if (j.yuklanmagan) r.push({ ton: 'info', matn: `${j.yuklanmagan} ta mashina hali chiqmagan`, izoh: 'bugun yuklash qilinmagan', yol: '/avtolavka', ikon: IK.mashina })
  const d = asos.value?.debitorlik
  if (d?.muddati_otgan > 0) r.push({ ton: 'xato', matn: "Muddati o'tgan qarz", izoh: `${pulQ(d.muddati_otgan)} · ${fmtNum(d.qarzdor_soni)} qarzdor`, yol: '/hisobot/qarzlar', ikon: IK.dokon })
  const oh = asos.value?.ombor_holati
  if (oh?.tugagan || oh?.kam) r.push({ ton: 'ogoh', matn: `${fmtNum(oh.tugagan || 0)} ta tovar tugagan, ${fmtNum(oh.kam || 0)} tasi kam`, izoh: 'omborni to\'ldirish kerak', yol: '/ombor/qoldiqlar', ikon: IK.qutilar })
  const my = asos.value?.ogohlantirishlar?.muddati_yaqin?.filter((x: any) => x.qolgan_kun <= 7) || []
  if (my.length) r.push({ ton: 'ogoh', matn: `${my.length} ta partiyaning muddati yaqin`, izoh: my.slice(0, 2).map((x: any) => `${x.tovar_nomi} — ${x.qolgan_kun} kun`).join(', '), yol: '/ombor/partiya', ikon: IK.yorliq })
  return r
})

/* ── Grafik va taqsimot ───────────────────────────────── */
const GA = computed<any>(() => (davr.value === 'bugun' ? grafikA.value : agg.value))
const grafikBosh = computed(() => !(GA.value?.dinamika || []).some((d: any) => d.summa > 0))
const grafikIzoh = computed(() => {
  const g = GA.value?.guruh
  const t = davr.value === 'bugun' ? 'oxirgi 14 kun' : davrM.value.izoh
  return `${t} · ${g === 'oy' ? 'oylar' : g === 'hafta' ? 'haftalar' : 'kunlar'} bo'yicha`
})
const SERIYA = [
  { k: 'summa', nom: 'Sotuv', rang: '#7c3aed' },
  { k: 'naqd',  nom: 'Naqd tushum', rang: '#059669', tur: 'chiziq' as const },
]
const taqsimot = computed(() => [
  { nom: 'Naqd',   qiymat: J.value.naqd || 0, rang: '#7c3aed' },
  { nom: 'Qarzga', qiymat: J.value.qarz || 0, rang: '#c4b5fd' },
])

/* ── Reytinglar ───────────────────────────────────────── */
const agentlar = computed<any[]>(() => agg.value?.agentlar || [])
const agentMaks = computed(() => Math.max(1, ...agentlar.value.map(a => a.summa)))
const tovarlar = computed<any[]>(() => (agg.value?.top_tovarlar || []).slice(0, 5))
const tovarMaks = computed(() => Math.max(1, ...tovarlar.value.map(t => t.cheklar)))
const agentOch = (a: any) => (a.id === 'sklad' || optom.value ? router.push(sotuvYoli.value) : router.push({ path: '/avtolavka', query: { agent: a.id } }))

/* ── Pul va ombor ─────────────────────────────────────── */
const kassa = computed<any>(() => asos.value?.moliya || {})
const qarz = computed<any>(() => asos.value?.debitorlik || {})
const qarzdorlar = computed<any[]>(() => (asos.value?.top_qarzdorlar || []).slice(0, 3))
const omborQ = computed(() => Number(asos.value?.kpi?.ombor_summa) || 0)
const omborKg = computed(() => Number(asos.value?.kpi?.ombor_dona) || 0)
const omborH = computed<any>(() => asos.value?.ombor_holati || {})

const birinchi = computed(() => !agg.value && yuklanmoqda.value)
</script>

<template>
  <div class="bs">

    <!-- ══════════ SARLAVHA ══════════ -->
    <header class="bs-hd">
      <div class="bs-hd-l">
        <span class="bs-salom">{{ salom }}{{ ism ? ', ' + ism : '' }}</span>
        <h1>Bosh sahifa</h1>
        <p>{{ nom }} · {{ davrM.izoh }}<template v-if="yangilandi"> · yangilandi {{ vaqt(yangilandi) }}</template></p>
      </div>
      <div class="bs-hd-r">
        <div class="bs-seg" role="group" aria-label="Davr">
          <span class="bs-seg-pill" :style="{ transform: `translateX(${davrI * 100}%)` }"/>
          <button v-for="d in DAVRLAR" :key="d.k" :class="{ on: davr === d.k }" :aria-pressed="davr === d.k" @click="davr = d.k">{{ d.nom }}</button>
        </div>
        <button class="bs-ib" :class="{ aylan: yuklanmoqda }" title="Yangilash" aria-label="Yangilash" @click="hammasi">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>
        </button>
      </div>
    </header>

    <div v-if="xato" class="bs-xato" role="alert">{{ xato }} <button @click="hammasi">Qayta urinish</button></div>

    <!-- ══════════ BUGUN: BANNER ══════════ -->
    <section class="hero" :class="{ 'hero--1': !mashinalar.length }">
      <div class="hero-l">
        <span class="hero-jonli"><i/>Bugun · {{ bugunMatn }}</span>
        <span class="hero-t">Bugungi {{ nom }} savdosi</span>
        <div class="hero-son">
          <AnimNum :value="BJ.summa || 0" :format="sonQism"/><small>{{ birlik(BJ.summa || 0) }}</small>
        </div>
        <div class="hero-mini">
          <span><b>{{ fmtNum(BJ.soni || 0) }}</b> ta chek</span>
          <span><b>{{ pulQ(BJ.naqd || 0) }}</b> naqd</span>
          <span><b>{{ pulQ(BJ.qarz || 0) }}</b> qarzga</span>
          <span><b>{{ fmtNum(BJ.mijozlar || 0) }}</b> mijoz</span>
        </div>
      </div>

      <div v-if="mashinalar.length" class="hero-r">
        <div class="hero-r-hd">
          <span>Mashinalar</span><b>{{ mashinalar.length }}</b>
        </div>
        <div class="hero-bar" role="img" :aria-label="bosqichlar.map(b => `${b.nom}: ${b.son}`).join(', ')">
          <i v-for="b in bosqichlar.filter(x => x.son)" :key="b.nom" :style="{ flex: b.son, background: b.rang }"/>
        </div>
        <ul class="hero-leg">
          <li v-for="b in bosqichlar" :key="b.nom" :class="{ nol: !b.son }"><i :style="{ background: b.rang }"/>{{ b.nom }}<b>{{ b.son }}</b></li>
        </ul>
        <div class="hero-r-ft">
          <span>Mashinalarda tovar<b>{{ pulQ(DJ.tovar_mashinada || 0) }}</b></span>
          <span>Xodimlar qo'lida naqd<b>{{ pulQ(DJ.naqd_qolda || 0) }}</b></span>
        </div>
      </div>
    </section>

    <!-- ══════════ KPI (davr) ══════════ -->
    <section class="kpis">
      <article v-for="k in kpilar" :key="k.k" class="kpi" :class="{ skel: birinchi }">
        <div class="kpi-hd">
          <span class="ik"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" v-html="k.ikon"/></span>
          <span class="kpi-n">{{ k.nom }}</span>
        </div>
        <div class="kpi-v">
          <template v-if="k.pul"><AnimNum :value="k.v" :format="sonQism"/><small>{{ birlik(k.v) }}</small></template>
          <AnimNum v-else :value="k.v" :format="fmtNum"/>
          <span v-if="k.o !== 0 && (k.v || k.o !== null)" class="kpi-o" :class="osishKlass(k)" :title="k.o === null ? 'Oldingi davrda yo\'q edi' : 'Oldingi teng davrga nisbatan'">
            <template v-if="k.o === null">yangi</template>
            <template v-else>{{ k.o > 0 ? '▲' : '▼' }} {{ Math.abs(k.o) }}%</template>
          </span>
        </div>
        <div class="kpi-iz">{{ k.izoh }}</div>
      </article>
    </section>

    <!-- ══════════ MASHINALAR + DIQQAT ══════════ -->
    <section class="qator" :class="{ 'qator--1': !mashinalar.length }">
      <article v-if="mashinalar.length" class="karta">
        <header class="k-hd">
          <span class="ik"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" v-html="IK.mashina"/></span>
          <div class="k-t"><b>Mashinalar</b><small>bugun · jonli, har daqiqada yangilanadi</small></div>
          <router-link to="/avtolavka" class="k-link">Won Sell markazi →</router-link>
        </header>
        <div class="mashinalar">
          <button v-for="m in mashinalar" :key="m.agent_id" class="mash" :style="{ '--h': holatRang(m) }" @click="mashinaOch(m)">
            <div class="mash-hd">
              <span class="av" :style="{ background: holatRang(m) }">{{ initsial(m.agent?.fullname) }}</span>
              <span class="mash-t"><b>{{ m.agent?.fullname }}</b><span v-if="m.agent?.mashina_raqam" class="raqam">{{ m.agent.mashina_raqam }}</span></span>
              <span class="holat"><i/>{{ holatNom(m) }}</span>
            </div>
            <div class="mash-son">
              <span>Bugun sotdi</span>
              <b>{{ pulQ(m.pul?.sotuv_jami || 0) }}</b>
              <small>naqd {{ fmtShort(m.pul?.naqd_sotuv || 0) }} · qarz {{ fmtShort(m.pul?.qarzga_sotuv || 0) }}</small>
            </div>
            <div class="mash-yuk">
              <div class="mash-yuk-t"><span>Yukdan sotildi</span><b>{{ sotildiFoiz(m) }}%</b></div>
              <div class="trek"><i :style="{ width: sotildiFoiz(m) + '%' }"/></div>
              <div class="mash-yuk-t mut"><span>Mashinada</span><span>{{ fmtMiqdor(m.mashina?.dona || 0) }} kg · {{ fmtShort(m.mashina?.summa || 0) }}</span></div>
            </div>
            <div v-if="m.sorovlar?.length || keldi(m) || m.holat === 'kamomad'" class="mash-flag">
              <span v-if="m.holat === 'kamomad'" class="f xato">Kamomad</span>
              <span v-if="keldi(m)" class="f ish">Topshirishga keldi</span>
              <span v-if="m.sorovlar?.length" class="f ish">{{ m.sorovlar.length }} ta so'rov</span>
            </div>
          </button>
        </div>
      </article>

      <article class="karta">
        <header class="k-hd">
          <span class="ik"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2.5 20h19z"/><path d="M12 10v4.5M12 17.5h.01"/></svg></span>
          <div class="k-t"><b>Diqqat talab</b><small>{{ ogoh.length ? `${ogoh.length} ta masala` : 'bugungi holat' }}</small></div>
        </header>
        <ul v-if="ogoh.length" class="og-l">
          <li v-for="(o, i) in ogoh" :key="i">
            <router-link :to="o.yol" class="og" :class="o.ton">
              <span class="og-ik"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" v-html="o.ikon"/></span>
              <span class="og-t"><b>{{ o.matn }}</b><small>{{ o.izoh }}</small></span>
              <svg class="og-ch" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg>
            </router-link>
          </li>
        </ul>
        <div v-else class="bosh-h">
          <span class="bosh-ik ok"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></span>
          <b>Hammasi joyida</b><small>Kamomad, kutilayotgan so'rov yoki muddati o'tgan qarz yo'q</small>
        </div>
      </article>
    </section>

    <!-- ══════════ DINAMIKA + TO'LOV ══════════ -->
    <section class="qator">
      <article class="karta">
        <header class="k-hd">
          <span class="ik"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" v-html="IK.osish"/></span>
          <div class="k-t"><b>Sotuv dinamikasi</b><small>{{ grafikIzoh }}</small></div>
          <router-link :to="sotuvYoli" class="k-link">Sotuvlar jurnali →</router-link>
        </header>
        <div class="grafik">
          <UstunGrafik v-if="GA?.dinamika && !grafikBosh" :data="GA.dinamika" :seriyalar="SERIYA" :guruh="GA.guruh" :balandlik="250"/>
          <div v-else-if="GA" class="grafik-bosh">
            <span class="bosh-ik"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" v-html="IK.grafik"/></span>
            <b>Bu davrda {{ nom }} sotuvi yo'q</b>
            <button v-if="davr !== 'yil'" @click="davr = 'yil'">Oxirgi 12 oyni ko'rish</button>
          </div>
        </div>
      </article>

      <article class="karta">
        <header class="k-hd">
          <span class="ik"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" v-html="IK.pirog"/></span>
          <div class="k-t"><b>Naqd va qarz</b><small>{{ davrDagi }} sotuv</small></div>
        </header>
        <div class="taqsimot">
          <HalqaGrafik :items="taqsimot" :markaz="J.summa ? ulush(J.naqd, J.summa) + '%' : '—'" markaz-izoh="naqd" :olcham="164"/>
        </div>
      </article>
    </section>

    <!-- ══════════ AGENTLAR + TOVARLAR ══════════ -->
    <section class="qator qator--teng">
      <article class="karta">
        <header class="k-hd">
          <span class="ik"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" v-html="IK.agent"/></span>
          <div class="k-t"><b>{{ optom ? 'Sotuvchilar' : 'Agentlar reytingi' }}</b><small>{{ davrM.izoh }} · sotuv bo'yicha</small></div>
        </header>
        <ol v-if="agentlar.length" class="reyting">
          <li v-for="(a, i) in agentlar" :key="a.id">
            <button class="ry" @click="agentOch(a)">
              <span class="ry-o" :class="'o' + (i + 1)">{{ i + 1 }}</span>
              <span class="av av--sm">{{ a.id === 'sklad' ? 'SK' : initsial(a.fullname) }}</span>
              <span class="ry-t">
                <span class="ry-r"><b>{{ a.fullname }}</b><b class="ry-v">{{ pulQ(a.summa) }}</b></span>
                <span class="trek trek--2" :title="`Naqd ${pulQ(a.naqd)} · qarz ${pulQ(a.qarz)}`">
                  <i :style="{ width: (a.naqd / agentMaks * 100) + '%' }"/><i class="q" :style="{ width: (a.qarz / agentMaks * 100) + '%' }"/>
                </span>
                <small>{{ fmtNum(a.soni) }} chek · {{ fmtNum(a.mijozlar) }} mijoz · ulushi {{ ulush(a.summa, J.summa) }}%</small>
              </span>
            </button>
          </li>
        </ol>
        <div v-else class="bosh-h"><b>Sotuv yo'q</b><small>{{ davrDa }} hech kim sotmagan</small></div>
        <div v-if="agentlar.length" class="leg"><span><i/>naqd</span><span><i class="q"/>qarzga</span></div>
      </article>

      <article class="karta">
        <header class="k-hd">
          <span class="ik"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" v-html="IK.yulduz"/></span>
          <div class="k-t"><b>Top tovarlar</b><small>{{ davrM.izoh }} · eng ko'p cheklarda uchragan</small></div>
          <router-link to="/hisobot/tovarlar" class="k-link">ABC tahlil →</router-link>
        </header>
        <ol v-if="tovarlar.length" class="reyting">
          <li v-for="(t, i) in tovarlar" :key="t.tovar_id ?? t.nomi" class="ry ry--tovar">
            <span class="ry-o" :class="'o' + (i + 1)">{{ i + 1 }}</span>
            <span class="ry-t">
              <span class="ry-r"><b>{{ t.nomi }}</b><b class="ry-v">{{ fmtNum(t.cheklar) }} chek</b></span>
              <span class="trek"><i :style="{ width: (t.cheklar / tovarMaks * 100) + '%' }"/></span>
            </span>
          </li>
        </ol>
        <div v-else class="bosh-h"><b>Sotuv yo'q</b><small>{{ davrDa }} tovar sotilmagan</small></div>
      </article>
    </section>

    <!-- ══════════ PUL VA OMBOR ══════════ -->
    <div class="bolim"><span>Pul va ombor</span><i/></div>
    <section class="pul">
      <router-link to="/moliya" class="karta pk">
        <div class="pk-hd"><span class="ik"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" v-html="IK.kassa"/></span><b>Kassa</b><small>hozirgi qoldiq</small></div>
        <div class="pk-v"><AnimNum :value="kassa.jami || 0" :format="sonQism"/><small>{{ birlik(kassa.jami || 0) }}</small></div>
        <div class="trek trek--2 pk-trek"><i :style="{ width: ulush(kassa.naqd, kassa.jami) + '%' }"/><i class="q" :style="{ width: ulush(kassa.bank, kassa.jami) + '%' }"/></div>
        <div class="pk-ft"><span><i class="n"/>Naqd <b>{{ pulQ(kassa.naqd || 0) }}</b></span><span><i class="q"/>Bank <b>{{ pulQ(kassa.bank || 0) }}</b></span></div>
      </router-link>

      <router-link to="/mijozlar/oldi-berdi" class="karta pk">
        <div class="pk-hd"><span class="ik"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" v-html="IK.dokon"/></span><b>Mijozlar qarzi</b><small>{{ fmtNum(qarz.qarzdor_soni || 0) }} qarzdor</small></div>
        <div class="pk-v"><AnimNum :value="qarz.jami_qarz || 0" :format="sonQism"/><small>{{ birlik(qarz.jami_qarz || 0) }}</small></div>
        <div v-if="qarz.muddati_otgan > 0" class="pk-xato">Muddati o'tgan: <b>{{ pulQ(qarz.muddati_otgan) }}</b></div>
        <ul class="pk-l">
          <li v-for="q in qarzdorlar" :key="q.id"><span>{{ q.nomi }}</span><b>{{ pulQ(q.qarz) }}</b></li>
        </ul>
      </router-link>

      <router-link to="/ombor/qoldiqlar" class="karta pk">
        <div class="pk-hd"><span class="ik"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" v-html="IK.ombor"/></span><b>Ombor</b><small>tannarxda</small></div>
        <div class="pk-v"><AnimNum :value="omborQ" :format="sonQism"/><small>{{ birlik(omborQ) }}</small></div>
        <div class="pk-sub">{{ fmtMiqdor(omborKg) }} kg · {{ fmtNum(omborH.jami || 0) }} xil tovar</div>
        <div class="pk-chips">
          <span class="ch ok"><i/>Yetarli {{ fmtNum(omborH.yetarli || 0) }}</span>
          <span class="ch ogoh"><i/>Kam {{ fmtNum(omborH.kam || 0) }}</span>
          <span class="ch xato"><i/>Tugagan {{ fmtNum(omborH.tugagan || 0) }}</span>
        </div>
      </router-link>
    </section>
  </div>
</template>

<style scoped>
.bs { display:flex; flex-direction:column; gap:18px; max-width:1480px; margin:0 auto; color:var(--ink); }

/* ── Sarlavha ── */
.bs-hd { display:flex; align-items:flex-end; justify-content:space-between; gap:16px; flex-wrap:wrap; }
.bs-salom { font-size:12.5px; font-weight:600; color:var(--acc); }
.bs-hd h1 { margin:2px 0 0; font-size:25px; font-weight:800; letter-spacing:-.02em; line-height:1.15; }
.bs-hd p { margin:3px 0 0; font-size:12.5px; color:var(--mut); }
.bs-hd-r { display:flex; align-items:center; gap:8px; }
.bs-seg { position:relative; display:grid; grid-template-columns:repeat(4, 1fr); padding:3px; border-radius:11px;
  background:var(--seg-track); box-shadow:inset 0 0 0 1px var(--seg-brd); }
.bs-seg-pill { position:absolute; top:3px; bottom:3px; left:3px; width:calc((100% - 6px) / 4); border-radius:8px;
  background:var(--seg-on-bg); box-shadow:var(--seg-on-sh); transition:transform .3s cubic-bezier(.2,.7,.2,1); }
.bs-seg button { position:relative; z-index:1; min-width:64px; height:32px; padding:0 14px; border:0; background:none; border-radius:8px;
  font:inherit; font-size:12.5px; font-weight:600; color:var(--seg-ink); cursor:pointer; transition:color .2s; }
.bs-seg button:hover { color:var(--seg-ink-h); }
.bs-seg button.on { color:var(--seg-on-ink); }
.bs-ib { width:38px; height:38px; border-radius:11px; border:1px solid var(--line); background:var(--surface); color:var(--mut);
  display:grid; place-items:center; cursor:pointer; transition:color .15s, border-color .15s; }
.bs-ib:hover { color:var(--acc); border-color:var(--brand-200); }
.bs-ib svg { width:18px; height:18px; }
.bs-ib.aylan svg { animation:aylan .9s linear infinite; }
@keyframes aylan { to { transform:rotate(360deg); } }
.bs-seg button:focus-visible, .bs-ib:focus-visible, .mash:focus-visible, .ry:focus-visible, .og:focus-visible, .pk:focus-visible {
  outline:2px solid var(--brand-400); outline-offset:2px; }
.bs-xato { padding:10px 14px; border-radius:12px; background:rgba(220,38,38,.08); border:1px solid rgba(220,38,38,.25); color:#b91c1c; font-size:13px; }
.bs-xato button { margin-left:8px; border:0; background:none; color:inherit; font:inherit; font-weight:700; text-decoration:underline; cursor:pointer; }

/* ── Banner: logo plitkasi kabi ── */
.hero { position:relative; overflow:hidden; isolation:isolate; display:grid; grid-template-columns:1.25fr 1fr; gap:28px;
  padding:26px 28px; border-radius:20px; color:#fff;
  background:radial-gradient(80% 140% at 0% 0%, rgba(139,92,246,.65), transparent 60%), linear-gradient(135deg, #6d28d9 0%, #5b21b6 55%, #4c1d95 100%);
  box-shadow:0 20px 44px -24px rgba(76,29,149,.8); }
.hero::after { content:''; position:absolute; z-index:-1; right:-36px; top:-46px; width:250px; height:305px; opacity:.1; pointer-events:none;
  background:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='100 80 344 420' fill='none' stroke='white' stroke-width='9' stroke-linecap='round' stroke-linejoin='round'><path d='M272 477C340.3 401.2 413 318 413 242A141 141 0 0 0 131 242C131 318 203.7 401.2 272 477Z'/><path d='M325 180H242A24 24 0 0 0 218 204V218.5A24 24 0 0 0 242 242.5H301A24 24 0 0 1 325 266.5V281.5A24 24 0 0 1 301 305.5H218'/></svg>") no-repeat center / contain; }
.hero--1 { grid-template-columns:1fr; }
.hero-l { display:flex; flex-direction:column; min-width:0; }
.hero-jonli { align-self:flex-start; display:inline-flex; align-items:center; gap:7px; padding:4px 10px; border-radius:99px;
  background:rgba(255,255,255,.14); box-shadow:inset 0 0 0 1px rgba(255,255,255,.18); font-size:11.5px; font-weight:600; }
.hero-jonli i { width:7px; height:7px; border-radius:50%; background:#4ade80; box-shadow:0 0 0 3px rgba(74,222,128,.25); animation:puls 2s ease-in-out infinite; }
@keyframes puls { 50% { box-shadow:0 0 0 6px rgba(74,222,128,0); } }
.hero-t { margin-top:16px; font-size:13.5px; font-weight:500; color:rgba(255,255,255,.8); }
.hero-son { display:flex; align-items:baseline; gap:8px; margin-top:4px; font-size:44px; font-weight:800; letter-spacing:-.03em; line-height:1.05; font-variant-numeric:tabular-nums; }
.hero-son small { font-size:15px; font-weight:600; letter-spacing:0; color:rgba(255,255,255,.75); }
.hero-mini { display:flex; flex-wrap:wrap; gap:8px; margin-top:18px; }
.hero-mini span { padding:6px 11px; border-radius:10px; background:rgba(255,255,255,.1); box-shadow:inset 0 0 0 1px rgba(255,255,255,.14);
  font-size:12px; color:rgba(255,255,255,.8); }
.hero-mini b { color:#fff; font-weight:700; font-variant-numeric:tabular-nums; }

.hero-r { align-self:stretch; display:flex; flex-direction:column; gap:12px; padding:16px 18px; border-radius:16px;
  background:rgba(255,255,255,.1); box-shadow:inset 0 0 0 1px rgba(255,255,255,.16); backdrop-filter:blur(6px); }
.hero-r-hd { display:flex; align-items:baseline; justify-content:space-between; font-size:12px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:rgba(255,255,255,.75); }
.hero-r-hd b { font-size:22px; letter-spacing:0; color:#fff; }
.hero-bar { display:flex; gap:3px; height:10px; border-radius:6px; overflow:hidden; background:rgba(255,255,255,.12); }
.hero-bar i { display:block; height:100%; border-radius:3px; box-shadow:inset 0 0 0 1px rgba(255,255,255,.25); }
.hero-leg { display:grid; grid-template-columns:1fr 1fr; gap:6px 14px; list-style:none; margin:0; padding:0; font-size:12.5px; color:rgba(255,255,255,.85); }
.hero-leg li { display:flex; align-items:center; gap:7px; }
.hero-leg li.nol { opacity:.55; }
.hero-leg i { width:9px; height:9px; border-radius:3px; box-shadow:0 0 0 1.5px rgba(255,255,255,.5); }
.hero-leg b { margin-left:auto; font-variant-numeric:tabular-nums; }
.hero-r-ft { margin-top:auto; display:grid; grid-template-columns:1fr 1fr; gap:10px; padding-top:12px; border-top:1px solid rgba(255,255,255,.16); }
.hero-r-ft span { display:flex; flex-direction:column; gap:2px; font-size:11.5px; color:rgba(255,255,255,.72); }
.hero-r-ft b { font-size:15px; color:#fff; font-variant-numeric:tabular-nums; }

/* ── Umumiy karta ── */
.karta { background:var(--surface); border:1px solid var(--line); border-radius:16px; padding:18px;
  box-shadow:0 1px 2px rgba(46,16,101,.04), 0 10px 28px -20px rgba(46,16,101,.18); min-width:0; }
.shell.dark .karta { box-shadow:none; }
.k-hd { display:flex; align-items:center; gap:11px; margin-bottom:14px; }
.ik { width:32px; height:32px; flex-shrink:0; border-radius:10px; display:grid; place-items:center; background:var(--acc-soft); color:var(--acc); }
.ik svg { width:17px; height:17px; }
.k-t { display:flex; flex-direction:column; min-width:0; line-height:1.25; }
.k-t b { font-size:14.5px; font-weight:700; }
.k-t small { font-size:12px; color:var(--mut); }
.k-link { margin-left:auto; flex-shrink:0; font-size:12.5px; font-weight:600; color:var(--acc); text-decoration:none; }
.k-link:hover { text-decoration:underline; }

/* ── KPI ── */
.kpis { display:grid; grid-template-columns:repeat(5, minmax(0, 1fr)); gap:12px; }
.kpi { background:var(--surface); border:1px solid var(--line); border-radius:16px; padding:15px 16px; min-width:0;
  box-shadow:0 1px 2px rgba(46,16,101,.04); }
.kpi-hd { display:flex; align-items:center; gap:9px; }
.kpi-hd .ik { width:30px; height:30px; border-radius:9px; }
.kpi-hd .ik svg { width:16px; height:16px; }
.kpi-n { font-size:12.5px; font-weight:600; color:var(--ink2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.kpi-o { margin-left:auto; align-self:center; flex-shrink:0; padding:2px 7px; border-radius:99px; font-size:11px; font-weight:700; letter-spacing:0; font-variant-numeric:tabular-nums; }
.kpi-o.yaxshi { background:rgba(5,150,105,.1); color:#047857; }
.kpi-o.yomon { background:rgba(220,38,38,.09); color:#b91c1c; }
.kpi-o.yangi { background:var(--acc-soft); color:var(--acc); }
.shell.dark .kpi-o.yaxshi { color:#34d399; } .shell.dark .kpi-o.yomon { color:#f87171; }
.kpi-v { display:flex; align-items:baseline; gap:6px; margin-top:12px; font-size:26px; font-weight:800; letter-spacing:-.02em; font-variant-numeric:tabular-nums; line-height:1.1; }
.kpi-v small { font-size:12px; font-weight:600; color:var(--mut); letter-spacing:0; }
.kpi-iz { margin-top:4px; font-size:12px; color:var(--mut); }
.kpi.skel .kpi-v, .kpi.skel .kpi-iz { color:transparent; background:linear-gradient(90deg, var(--hov), var(--act), var(--hov)); background-size:200% 100%; border-radius:6px; animation:skel 1.2s linear infinite; }
@keyframes skel { to { background-position:-200% 0; } }

/* ── Qatorlar ── */
.qator { display:grid; grid-template-columns:minmax(0, 2fr) minmax(0, 1fr); gap:14px; align-items:start; }
.qator--teng { grid-template-columns:repeat(2, minmax(0, 1fr)); }
.qator--1 { grid-template-columns:minmax(0, 1fr); }

/* ── Mashinalar ── */
.mashinalar { display:grid; grid-template-columns:repeat(auto-fill, minmax(230px, 1fr)); gap:12px; }
.mash { display:flex; flex-direction:column; gap:12px; padding:14px; border-radius:14px; text-align:left; cursor:pointer; font:inherit; color:inherit;
  background:var(--surface); border:1px solid var(--line); box-shadow:inset 3px 0 0 var(--h); transition:border-color .15s, transform .15s, box-shadow .15s; }
.mash:hover { border-color:color-mix(in srgb, var(--h) 45%, var(--line)); transform:translateY(-1px); box-shadow:inset 3px 0 0 var(--h), 0 10px 22px -16px rgba(46,16,101,.35); }
.mash-hd { display:flex; align-items:center; gap:10px; min-width:0; }
.av { width:34px; height:34px; flex-shrink:0; border-radius:50%; display:grid; place-items:center; color:#fff; font-size:12px; font-weight:700; background:var(--acc); }
.av--sm { width:30px; height:30px; font-size:11px; background:var(--acc-soft); color:var(--acc); }
.mash-t { display:flex; flex-direction:column; gap:3px; min-width:0; }
.mash-t b { font-size:13.5px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
/* davlat raqami — haqiqiy raqam lavhasi kabi */
.raqam { align-self:flex-start; padding:1px 6px; border-radius:4px; border:1.5px solid var(--ink2); background:var(--surface);
  font-size:10.5px; font-weight:800; letter-spacing:.06em; color:var(--ink); font-variant-numeric:tabular-nums; white-space:nowrap; }
.holat { margin-left:auto; flex-shrink:0; display:inline-flex; align-items:center; gap:5px; padding:3px 8px; border-radius:99px;
  font-size:11px; font-weight:700; color:var(--h); background:color-mix(in srgb, var(--h) 11%, transparent); }
.holat i { width:6px; height:6px; border-radius:50%; background:var(--h); }
.mash-son { display:flex; flex-direction:column; gap:1px; }
.mash-son span { font-size:11.5px; color:var(--mut); }
.mash-son b { font-size:19px; font-weight:800; letter-spacing:-.01em; font-variant-numeric:tabular-nums; }
.mash-son small { font-size:11.5px; color:var(--mut); }
.mash-yuk { display:flex; flex-direction:column; gap:6px; }
.mash-yuk-t { display:flex; justify-content:space-between; gap:8px; font-size:12px; color:var(--ink2); }
.mash-yuk-t b { font-variant-numeric:tabular-nums; }
.mash-yuk-t.mut { color:var(--mut); font-size:11.5px; }
.mash-flag { display:flex; flex-wrap:wrap; gap:6px; }
.f { padding:2px 8px; border-radius:6px; font-size:11px; font-weight:700; }
.f.xato { background:rgba(220,38,38,.1); color:#b91c1c; }
.f.ish { background:rgba(217,119,6,.12); color:#b45309; }

.trek { position:relative; display:flex; height:7px; border-radius:99px; overflow:hidden; background:var(--act); }
.trek i { display:block; height:100%; border-radius:99px; background:linear-gradient(90deg, var(--brand-500), var(--brand-600)); transition:width .6s cubic-bezier(.2,.7,.2,1); }
.trek--2 i { border-radius:0; }
.trek--2 i:first-child { border-radius:99px 0 0 99px; }
.trek i.q { background:var(--brand-200); }

/* ── Diqqat talab ── */
.og-l { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:8px; }
.og { --t:#7c3aed; display:flex; align-items:center; gap:11px; padding:11px 12px; border-radius:12px; text-decoration:none; color:inherit;
  background:color-mix(in srgb, var(--t) 6%, transparent); border:1px solid color-mix(in srgb, var(--t) 18%, transparent); transition:background .15s; }
.og:hover { background:color-mix(in srgb, var(--t) 11%, transparent); }
.og.xato { --t:#dc2626; } .og.ogoh { --t:#d97706; } .og.ish { --t:#7c3aed; } .og.info { --t:#64748b; }
.og-ik { width:32px; height:32px; flex-shrink:0; border-radius:9px; display:grid; place-items:center; color:var(--t); background:color-mix(in srgb, var(--t) 13%, transparent); }
.og-ik svg { width:16px; height:16px; }
.og-t { flex:1; display:flex; flex-direction:column; min-width:0; line-height:1.3; }
.og-t b { font-size:13px; font-weight:700; }
.og-t small { font-size:11.5px; color:var(--mut); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.og-ch { width:15px; height:15px; color:var(--sub); flex-shrink:0; }

.bosh-h { display:flex; flex-direction:column; align-items:center; gap:4px; padding:26px 12px; text-align:center; }
.bosh-h b { font-size:14px; }
.bosh-h small { font-size:12px; color:var(--mut); max-width:260px; }
.bosh-ik { width:44px; height:44px; border-radius:50%; display:grid; place-items:center; margin-bottom:6px; }
.bosh-ik.ok { background:rgba(5,150,105,.1); color:#059669; }
.bosh-ik svg { width:22px; height:22px; }

/* ── Grafik ── */
.grafik { position:relative; min-height:250px; }
.grafik-bosh { min-height:250px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px;
  border-radius:12px; text-align:center; background:repeating-linear-gradient(0deg, transparent 0 49px, var(--line2) 49px 50px); }
.grafik-bosh .bosh-ik { background:var(--acc-soft); color:var(--acc); margin-bottom:2px; }
.grafik-bosh b { font-size:14px; }
.grafik-bosh button { padding:7px 14px; border-radius:9px; border:1px solid var(--brand-200); background:var(--acc-soft); color:var(--acc);
  font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; }
.grafik-bosh button:hover { background:var(--brand-100); }
.taqsimot { display:flex; justify-content:center; padding-top:4px; }

/* ── Reytinglar ── */
.reyting { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:4px; }
.ry { width:100%; display:flex; align-items:center; gap:11px; padding:9px 8px; border-radius:11px; border:0; background:none;
  text-align:left; font:inherit; color:inherit; cursor:pointer; transition:background .15s; }
.ry:hover { background:var(--hov); }
.ry--tovar { cursor:default; }
.ry--tovar:hover { background:none; }
.ry-o { width:22px; flex-shrink:0; text-align:center; font-size:12px; font-weight:800; color:var(--sub); font-variant-numeric:tabular-nums; }
.ry-o.o1 { color:#d97706; } .ry-o.o2 { color:#64748b; } .ry-o.o3 { color:#b45309; }
.ry-t { flex:1; display:flex; flex-direction:column; gap:5px; min-width:0; }
.ry-r { display:flex; justify-content:space-between; gap:10px; min-width:0; }
.ry-r b { font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ry-r .ry-v { flex-shrink:0; font-weight:700; font-variant-numeric:tabular-nums; }
.ry-t small { font-size:11.5px; color:var(--mut); }
.leg { display:flex; gap:14px; margin-top:10px; padding-left:41px; font-size:11.5px; color:var(--mut); }
.leg span { display:inline-flex; align-items:center; gap:6px; }
.leg i { width:10px; height:6px; border-radius:3px; background:var(--brand-600); }
.leg i.q { background:var(--brand-200); }

/* ── Pul va ombor ── */
.bolim { display:flex; align-items:center; gap:12px; margin-top:6px; font-size:11px; font-weight:700; letter-spacing:.16em; text-transform:uppercase; color:var(--mut); }
.bolim i { flex:1; height:1px; background:var(--line); }
.pul { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:14px; }
.pk { display:flex; flex-direction:column; gap:10px; text-decoration:none; color:inherit; transition:border-color .15s, transform .15s; }
.pk:hover { border-color:var(--brand-200); transform:translateY(-1px); }
.pk-hd { display:flex; align-items:center; gap:10px; }
.pk-hd b { font-size:14px; font-weight:700; }
.pk-hd small { margin-left:auto; font-size:12px; color:var(--mut); }
.pk-v { display:flex; align-items:baseline; gap:6px; font-size:28px; font-weight:800; letter-spacing:-.02em; font-variant-numeric:tabular-nums; }
.pk-v small { font-size:12.5px; font-weight:600; color:var(--mut); letter-spacing:0; }
.pk-trek { margin-top:2px; }
.pk-ft { display:flex; justify-content:space-between; gap:10px; font-size:12px; color:var(--mut); }
.pk-ft span { display:inline-flex; align-items:center; gap:6px; }
.pk-ft b { color:var(--ink); font-variant-numeric:tabular-nums; }
.pk-ft i { width:8px; height:8px; border-radius:2px; background:var(--brand-600); }
.pk-ft i.q { background:var(--brand-200); }
.pk-xato { padding:6px 10px; border-radius:9px; background:rgba(220,38,38,.07); color:#b91c1c; font-size:12px; }
.shell.dark .pk-xato { color:#f87171; }
.pk-l { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:6px; }
.pk-l li { display:flex; justify-content:space-between; gap:10px; font-size:12.5px; }
.pk-l span { color:var(--ink2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.pk-l b { flex-shrink:0; font-variant-numeric:tabular-nums; }
.pk-sub { font-size:12.5px; color:var(--mut); }
.pk-chips { display:flex; flex-wrap:wrap; gap:6px; }
.ch { display:inline-flex; align-items:center; gap:6px; padding:4px 9px; border-radius:8px; font-size:12px; font-weight:600; background:var(--hov); color:var(--ink2); }
.ch i { width:7px; height:7px; border-radius:50%; }
.ch.ok i { background:#059669; } .ch.ogoh i { background:#d97706; } .ch.xato i { background:#dc2626; }

/* ── Moslashuv ── */
@media (max-width:1280px) {
  .kpis { grid-template-columns:repeat(3, minmax(0, 1fr)); }
}
@media (max-width:1100px) {
  .qator, .qator--teng { grid-template-columns:minmax(0, 1fr); }
  .hero { grid-template-columns:1fr; }
}
@media (max-width:760px) {
  .kpis { grid-template-columns:repeat(2, minmax(0, 1fr)); }
  .pul { grid-template-columns:minmax(0, 1fr); }
  .hero { padding:20px; }
  .hero-son { font-size:36px; }
  .bs-hd-r { width:100%; }
  .bs-seg { flex:1; }
  .bs-seg button { min-width:0; padding:0 8px; }
}
@media (max-width:420px) {
  .kpi { padding:12px; }
  .kpi-v { flex-wrap:wrap; gap:2px 5px; margin-top:10px; font-size:21px; }
  .kpi-v small { font-size:11px; }
  .kpi-o { margin-left:0; }
  .kpi-n { font-size:12px; }
}
@media (prefers-reduced-motion: reduce) {
  .bs-seg-pill, .trek i, .mash, .pk { transition:none; }
  .hero-jonli i, .bs-ib.aylan svg, .kpi.skel .kpi-v { animation:none; }
}
</style>
