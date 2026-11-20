<script setup lang="ts">
/* AVTOLAVKA SOTUVLARI — mashinadan joyida sotilgan cheklar jurnali.
   Faqat avtolavka: tovar agent omboridan ("Agent: <ism>") chiqqan, darhol yetkazilgan sotuvlar.
   Distributsiya buyurtmalari (agent zakazi → tasdiq → yig'ish → dostavchik) bu yerga kirmaydi —
   ular Sotuvlar → Arizalar'da. Naqd/qarz qoidasi Avtolavka markazidagi kun hisobi bilan bir xil. */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
// @ts-ignore
import { avtolavkaApi, arizaApi } from '@/api/api'
import { authStore } from '@/stores/auth'
import { useQidiruv } from '@/composables/useQidiruv'

const route = useRoute()
const router = useRouter()
const admin = computed(() => authStore.isAdmin.value)   // sotuvni bekor qilish faqat Admin/Programmer

const pad = (v: number) => String(v).padStart(2, '0')
const kunKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const bugun = () => kunKey(new Date())
const kunOldin = (k: number) => { const d = new Date(); d.setDate(d.getDate() - k); return kunKey(d) }
const oyBoshi = () => { const d = new Date(); d.setDate(1); return kunKey(d) }
const KUN_RE = /^\d{4}-\d{2}-\d{2}$/
const q = (k: string) => (typeof route.query[k] === 'string' ? (route.query[k] as string) : '')

const dan = ref(KUN_RE.test(q('dan')) ? q('dan') : bugun())
const gacha = ref(KUN_RE.test(q('gacha')) ? q('gacha') : bugun())
const agentId = ref<number | 'sklad' | null>(q('agent') === 'sklad' ? 'sklad' : q('agent') ? Number(q('agent')) : null)   // 'sklad' — xodimsiz sotuvlar
const tolov = ref<'' | 'naqd' | 'qarz'>((['naqd', 'qarz'].includes(q('tolov')) ? q('tolov') : '') as any)
/* takror — takror chek ehtimoli bo'lganlar (shu mijoz, shu summa, 2 soat ichida yana chek); bekor — bekor qilinganlar */
const korinish = ref<'' | 'takror' | 'bekor'>((['takror', 'bekor'].includes(q('korinish')) ? q('korinish') : '') as any)
const search = ref('')

const data = ref<any>(null)
const rows = ref<any[]>([])
const sahifa = ref(1)
const yuklanmoqda = ref(false)
const xato = ref('')

const jami = computed(() => data.value?.jami || { soni: 0, summa: 0, naqd: 0, qarz: 0, dona: 0, uzoq: 0, mijozlar: 0, mashinalar: 0 })
const agentlar = computed<any[]>(() => data.value?.agentlar || [])
const radius = computed(() => data.value?.radius || 300)
const yanaBor = computed(() => rows.value.length < jami.value.soni)
const birKun = computed(() => dan.value === gacha.value)

const DAVRLAR = [
  { k: 'bugun', nom: 'Bugun', d: () => [bugun(), bugun()] },
  { k: 'kecha', nom: 'Kecha', d: () => [kunOldin(1), kunOldin(1)] },
  { k: '7', nom: '7 kun', d: () => [kunOldin(6), bugun()] },
  { k: 'oy', nom: 'Shu oy', d: () => [oyBoshi(), bugun()] },
]
const faolDavr = computed(() => DAVRLAR.find(p => { const [a, b] = p.d(); return a === dan.value && b === gacha.value })?.k || '')
function davrTanla(p: typeof DAVRLAR[number]) { const [a, b] = p.d(); dan.value = a; gacha.value = b }

const fmtSum = (v: number) => new Intl.NumberFormat('ru-RU').format(Math.round(Number(v) || 0))
const fmtMln = (v: number) => { const n = Number(v) || 0; return n >= 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(Math.round(n)) }
const fmtMlnU = (v: number) => ((Number(v) || 0) >= 1e6 ? "mln so'm" : "so'm")
const fmtDona = (v: number) => new Intl.NumberFormat('ru-RU').format(Math.round((Number(v) || 0) * 1000) / 1000)
const fmtVaqt = (s: string) => { const d = new Date(s); return isNaN(+d) ? '' : d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) }
const OYLAR = ['yan', 'fev', 'mar', 'apr', 'may', 'iyun', 'iyul', 'avg', 'sen', 'okt', 'noy', 'dek']
const fmtKun = (s: string) => { const d = new Date(s); return isNaN(+d) ? '' : `${d.getDate()}-${OYLAR[d.getMonth()]}` }
const fmtMasofa = (m: number) => (m >= 100000 ? `${new Intl.NumberFormat('ru-RU').format(Math.round(m / 1000))} km` : m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${Math.round(m)} m`)
const foiz = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0)
const sarlavhaDavr = computed(() => {
  const f = (k: string) => { const d = new Date(k + 'T00:00:00'); return `${d.getDate()}-${OYLAR[d.getMonth()]}` }
  if (birKun.value) return dan.value === bugun() ? 'Bugun' : dan.value === kunOldin(1) ? 'Kecha' : f(dan.value)
  return `${f(dan.value)} — ${f(gacha.value)}`
})

function paramsYasa(matn: string, page: number) {
  const params: Record<string, any> = { dan: dan.value, gacha: gacha.value, page }
  if (agentId.value === 'sklad') params.kanal = 'sklad'
  else if (agentId.value) params.agent_id = agentId.value
  if (tolov.value) params.tolov = tolov.value
  if (korinish.value === 'takror') params.takror = 1
  if (korinish.value === 'bekor') params.holat = 'bekor'
  if (matn) params.search = matn
  return params
}
const qd = useQidiruv<any>({
  matn: search, yuklanmoqda,
  kalit: () => [dan.value, gacha.value, agentId.value, tolov.value, korinish.value],
  yukla: m => { xato.value = ''; return avtolavkaApi.sotuvlar(paramsYasa(m, 1)) },
  qolla: d => { data.value = d; sahifa.value = d.sahifa; rows.value = d.rows },
  xato: e => { xato.value = e?.message || 'Yuklab bo\'lmadi' },
})
/* qoshish — "Yana ko'rsatish": keyingi sahifa mavjud ro'yxatga qo'shiladi.
   Kutish paytida qidiruv/filtr o'zgarsa (ro'yxat almashsa) kechikkan javob tashlanadi. */
async function yukla(qoshish = false) {
  if (!qoshish) return qd.qayta()
  const asos = rows.value
  const eskirdi = () => rows.value !== asos
  yuklanmoqda.value = true
  try {
    const d = await avtolavkaApi.sotuvlar(paramsYasa(qd.amal.value, sahifa.value + 1))
    if (eskirdi()) return
    data.value = d
    sahifa.value = d.sahifa
    rows.value = [...asos, ...d.rows]
    yuklanmoqda.value = false
  } catch (e: any) {
    if (eskirdi()) return
    xato.value = e?.message || 'Yuklab bo\'lmadi'
    yuklanmoqda.value = false
  }
}

/* Filtrlar URL'da — havola bilan ulashish va Avtolavka markazidan kelish uchun */
watch([dan, gacha, agentId, tolov, korinish], () => {
  if (gacha.value < dan.value) gacha.value = dan.value
  router.replace({ query: { ...(dan.value !== bugun() || gacha.value !== bugun() ? { dan: dan.value, gacha: gacha.value } : {}), ...(agentId.value ? { agent: String(agentId.value) } : {}), ...(tolov.value ? { tolov: tolov.value } : {}), ...(korinish.value ? { korinish: korinish.value } : {}) } })
  yukla()
})
onMounted(() => yukla())

/* ── Chek tafsiloti ── */
const tanlangan = ref<any>(null)
const tafsilot = ref<any>(null)
async function och(r: any) {
  tanlangan.value = r; tafsilot.value = null
  bekorOchiq.value = false; bekorSabab.value = ''; bekorXato.value = ''; bekorNatija.value = null
  try { const d = await arizaApi.getById(r.id); if (tanlangan.value?.id === r.id) tafsilot.value = d } catch { /* qatorlar ko'rinmaydi, asosiy ma'lumot bor */ }
}
const yop = () => { tanlangan.value = null }

/* ── Sotuvni bekor qilish (Admin) — takror / xato chek ──
   POST /avtolavka/sotuv/:id/bekor: tovar mashina (yoki sklad) omboriga, naqd kassadan, qarz mijoz
   balansidan, bonus agent registridan teskari yoziladi; chek "bekor" bo'lib hisobotlardan chiqadi. */
const bekorOchiq = ref(false)
const bekorSabab = ref('')
const bekorXato = ref('')
const bekorYuborilmoqda = ref(false)
const bekorNatija = ref<any>(null)
const SABABLAR = ['Takror yozilgan chek', 'Xato mijoz tanlangan', 'Xato summa yoki tovar']
const qaytishJoyi = (r: any) => (r?.kanal === 'sklad' ? 'asosiy skladga' : `${r?.agent_nomi || 'agent'} hisobiga`)
async function sotuvniBekorQil() {
  const r = tanlangan.value
  if (!r || bekorYuborilmoqda.value) return
  if (bekorSabab.value.trim().length < 3) { bekorXato.value = 'Sababni yozing (kamida 3 ta belgi)'; return }
  bekorYuborilmoqda.value = true; bekorXato.value = ''
  try {
    const d = await avtolavkaApi.sotuvBekor(r.id, { sabab: bekorSabab.value.trim() })
    bekorNatija.value = d
    bekorOchiq.value = false
    tanlangan.value = { ...r, holat: 'bekor', bekor_sababi: d.bekor_sababi, takror: false }
    yukla()   // jurnal, KPI va mashinalar qatori yangilanadi
  } catch (e: any) {
    bekorXato.value = e?.message || 'Bekor qilib bo\'lmadi'
  } finally { bekorYuborilmoqda.value = false }
}
const escYop = (e: KeyboardEvent) => { if (e.key === 'Escape' && tanlangan.value) yop() }
onMounted(() => window.addEventListener('keydown', escYop))
onUnmounted(() => window.removeEventListener('keydown', escYop))
const kunPaneli = (r: any) => r.agent_id ? { path: '/avtolavka', query: { sana: kunKey(new Date(r.vaqt)), agent: String(r.agent_id) } } : { path: '/avtolavka/sotuv', query: { agent: 'sklad' } }

const IKON = {
  chek: '<path d="M6 2.5h12v19l-3-2-3 2-3-2-3 2z"/><path d="M9 7.5h6M9 11.5h6M9 15.5h3.5"/>',
  osish: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  hamyon: '<path d="M18 9V6a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V7"/><circle cx="16.5" cy="14.5" r="1.2"/>',
  soat: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  mijoz: '<path d="M3 21v-1.5a5.5 5.5 0 0 1 11 0V21"/><circle cx="8.5" cy="8" r="3.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M21 21v-1.5a5.5 5.5 0 0 0-3.5-5.1"/>',
  mashina: '<path d="M2 6h11v10H2z"/><path d="M13 9h4.2l3.8 4.2V16h-8"/><circle cx="6.5" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/>',
  sklad: '<path d="M3 21V8l9-5 9 5v13"/><path d="M3 21h18"/><path d="M7 21v-6h10v6"/><path d="M9 11h6"/>',
  qidir: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  joy: '<path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  yop: '<path d="M18 6 6 18M6 6l12 12"/>',
  ogoh: '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 2.6 17.2a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  bekor: '<circle cx="12" cy="12" r="9"/><path d="m8.5 8.5 7 7M15.5 8.5l-7 7"/>',
  ok: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
}
</script>

<template>
  <div class="as">
    <!-- ═══ SARLAVHA ═══ -->
    <header class="as-head">
      <div class="as-head-l">
        <span class="as-head-ic"><svg viewBox="0 0 24 24" v-html="IKON.chek"/></span>
        <div>
          <h1 class="as-h1">Van Sell sotuvlari</h1>
          <p class="as-sub">Agentlar mijozga joyida sotgan cheklar.</p>
        </div>
      </div>
      <div class="as-davr">
        <div class="as-seg">
          <button v-for="p in DAVRLAR" :key="p.k" :class="{ on: faolDavr === p.k }" @click="davrTanla(p)">{{ p.nom }}</button>
        </div>
        <div class="as-sana">
          <input type="date" v-model="dan" :max="bugun()" aria-label="Boshlanish sanasi"/>
          <span>—</span>
          <input type="date" v-model="gacha" :min="dan" :max="bugun()" aria-label="Tugash sanasi"/>
        </div>
        <RouterLink :to="{ path: '/avtolavka/sotuv', query: agentId ? { agent: String(agentId) } : {} }" class="as-btn pri" title="Xodim ilovadan sota olmasa — uning nomidan webdan sotish">+ Sotuv qilish</RouterLink>
      </div>
    </header>

    <!-- ═══ KO'RSATKICHLAR ═══ -->
    <section class="as-kpi">
      <div class="as-k">
        <span class="as-k-ic"><svg viewBox="0 0 24 24" v-html="IKON.osish"/></span>
        <div class="as-k-b">
          <span class="as-k-l">Savdo · {{ sarlavhaDavr }}</span>
          <b class="as-k-v">{{ fmtMln(jami.summa) }}<small>{{ fmtMlnU(jami.summa) }}</small></b>
          <span class="as-k-s">{{ jami.soni }} ta chek · {{ fmtDona(jami.dona) }} kg</span>
        </div>
      </div>
      <div class="as-k ok">
        <span class="as-k-ic"><svg viewBox="0 0 24 24" v-html="IKON.hamyon"/></span>
        <div class="as-k-b">
          <span class="as-k-l">Naqd olindi</span>
          <b class="as-k-v">{{ fmtMln(jami.naqd) }}<small>{{ fmtMlnU(jami.naqd) }}</small></b>
          <span class="as-k-s">savdoning {{ foiz(jami.naqd, jami.summa) }}% · agent kassaga topshiradi</span>
        </div>
      </div>
      <div class="as-k warn">
        <span class="as-k-ic"><svg viewBox="0 0 24 24" v-html="IKON.soat"/></span>
        <div class="as-k-b">
          <span class="as-k-l">Qarzga berildi</span>
          <b class="as-k-v">{{ fmtMln(jami.qarz) }}<small>{{ fmtMlnU(jami.qarz) }}</small></b>
          <span class="as-k-s">mijozlar balansiga yozildi</span>
        </div>
      </div>
      <div class="as-k" :class="{ bad: jami.uzoq > 0 }">
        <span class="as-k-ic"><svg viewBox="0 0 24 24" v-html="jami.uzoq > 0 ? IKON.joy : IKON.mijoz"/></span>
        <div class="as-k-b">
          <span class="as-k-l">{{ jami.uzoq > 0 ? 'Mijozdan uzoqda sotilgan' : 'Mijozlar' }}</span>
          <b class="as-k-v">{{ jami.uzoq > 0 ? jami.uzoq : jami.mijozlar }}<small>{{ jami.uzoq > 0 ? 'ta chek' : 'ta' }}</small></b>
          <span class="as-k-s">{{ jami.uzoq > 0 ? `${radius} m dan uzoq · ${jami.mijozlar} ta mijoz` : `${jami.mashinalar} ta agentdan` }}</span>
        </div>
      </div>
    </section>

    <!-- ═══ JURNAL ═══ -->
    <section class="as-card">
      <div class="as-bar">
        <div class="as-mash" role="group" aria-label="Agent">
          <button :class="{ on: !agentId }" @click="agentId = null">Hammasi</button>
          <button v-for="a in agentlar" :key="a.id" :class="{ on: agentId === a.id, sklad: a.id === 'sklad' }" @click="agentId = agentId === a.id ? null : a.id" :title="`${a.soni} ta chek · ${fmtSum(a.summa)} so'm`">
            <svg viewBox="0 0 24 24" v-html="a.id === 'sklad' ? IKON.sklad : IKON.mashina"/>{{ a.fullname }}<span>{{ fmtMln(a.summa) }}</span>
          </button>
        </div>
        <div class="as-bar-r">
          <label class="as-q">
            <svg viewBox="0 0 24 24" v-html="IKON.qidir"/>
            <input v-model="search" maxlength="100" placeholder="Mijoz yoki chek raqami" @keydown.enter="qd.darhol()"/>
          </label>
          <div class="as-seg sm">
            <button :class="{ on: tolov === '' }" @click="tolov = ''">Hammasi</button>
            <button :class="{ on: tolov === 'naqd' }" @click="tolov = 'naqd'">Naqd</button>
            <button :class="{ on: tolov === 'qarz' }" @click="tolov = 'qarz'">Qarzga</button>
          </div>
          <button class="as-chip warn" :class="{ on: korinish === 'takror' }" @click="korinish = korinish === 'takror' ? '' : 'takror'"
            title="Shu mijozga, shu agentdan, aynan shu summaga 2 soat ichida yana chek bor — xodim ikki marta bosgan bo'lishi mumkin">
            <svg viewBox="0 0 24 24" v-html="IKON.ogoh"/>Takror ehtimoli<span v-if="korinish !== 'bekor' && jami.takror">{{ jami.takror }}</span>
          </button>
          <button class="as-chip" :class="{ on: korinish === 'bekor' }" @click="korinish = korinish === 'bekor' ? '' : 'bekor'" title="Admin bekor qilgan cheklar (sabab bilan)">
            <svg viewBox="0 0 24 24" v-html="IKON.bekor"/>Bekor qilinganlar
          </button>
        </div>
      </div>

      <div v-if="xato" class="as-empty err">{{ xato }} <button class="as-link" @click="yukla()">Qayta urinish</button></div>
      <div v-else-if="yuklanmoqda && !rows.length" class="as-empty">Yuklanmoqda…</div>
      <div v-else-if="!rows.length && korinish === 'bekor'" class="as-empty"><b>Bu davrda bekor qilingan chek yo'q</b><span>Takror yoki xato chekni ochib, "Sotuvni bekor qilish" bosilsa shu yerda sabab bilan ko'rinadi.</span></div>
      <div v-else-if="!rows.length && korinish === 'takror'" class="as-empty"><b>Takror chek ehtimoli topilmadi</b><span>Bitta mijozga, bitta agentdan, aynan bir xil summaga 2 soat ichida ikki chek bo'lsa shu yerda chiqadi.</span></div>
      <div v-else-if="!rows.length" class="as-empty">
        <b>Bu davrda Van Sell sotuvi yo'q</b>
        <span>Sotuvlar xodim telefonidagi ilovadan tushadi. Davrni o'zgartirib ko'ring yoki <RouterLink :to="{ path: '/avtolavka/sotuv', query: agentId ? { agent: String(agentId) } : {} }" class="as-link">xodim nomidan webdan soting</RouterLink>.</span>
      </div>

      <div v-else class="as-tw">
        <table class="as-t">
          <thead>
            <tr>
              <th>Vaqt</th><th>Mijoz</th><th>Agent</th><th>Tovar</th>
              <th class="r">Summa</th><th class="r">Naqd</th><th class="r">Qarz</th><th>Joy</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.id" :class="{ on: tanlangan?.id === r.id, bk: r.holat === 'bekor' }" tabindex="0" @click="och(r)" @keydown.enter="och(r)">
              <td class="vq">
                <b>{{ fmtVaqt(r.vaqt) }}</b>
                <small v-if="!birKun">{{ fmtKun(r.vaqt) }}</small>
              </td>
              <td class="mj">
                <b>{{ r.mijoz_nomi || '—' }}</b>
                <small>#{{ r.raqam }}<span v-if="r.oflayn" class="as-tag" title="Internetsiz qilingan, keyin yuborilgan">oflayn</span><span v-if="r.manba === 'web'" class="as-tag web" title="Xodim nomidan webdan kiritilgan (Sotuv qilish)">web</span><span v-if="r.holat === 'bekor'" class="as-tag bad" :title="r.bekor_sababi || ''">bekor</span><span v-else-if="r.takror" class="as-tag bad" title="Takror chek ehtimoli: shu mijozga, shu summaga 2 soat ichida yana chek bor">takror?</span></small>
              </td>
              <td class="ag"><span v-if="r.kanal === 'sklad'" class="as-sklad">Sklad · xodimsiz</span><template v-else>{{ r.agent_nomi || '—' }}</template></td>
              <td class="tv">
                <span class="tv-n">{{ r.tovarlar.join(', ') }}<template v-if="r.tovar_soni > r.tovarlar.length"> +{{ r.tovar_soni - r.tovarlar.length }}</template></span>
                <small>{{ fmtDona(r.dona) }} kg</small>
              </td>
              <td class="r sm">{{ fmtSum(r.summa) }}</td>
              <td class="r nq">{{ r.naqd > 0 ? fmtSum(r.naqd) : '—' }}</td>
              <td class="r qz">
                <template v-if="r.qarz > 0.5">{{ fmtSum(r.qarz) }}<small v-if="r.tolov_sana">{{ r.tolov_sana.slice(5).split('-').reverse().join('.') }} gacha</small></template>
                <template v-else>—</template>
              </td>
              <td>
                <span v-if="r.manba === 'web'" class="as-joy n" title="Webdan kiritilgan — joylashuv yo'q">webdan</span>
                <span v-else-if="r.masofa_m === null" class="as-joy n" title="Sotuv vaqtida GPS olinmagan">GPS yo'q</span>
                <span v-else-if="r.uzoq" class="as-joy bad" :title="`Mijoz nuqtasidan ${fmtMasofa(r.masofa_m)} uzoqda sotilgan`">{{ fmtMasofa(r.masofa_m) }}</span>
                <span v-else class="as-joy ok" :title="`Mijoz nuqtasidan ${fmtMasofa(r.masofa_m)}`">joyida</span>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="as-more">
          <span>{{ rows.length }} / {{ jami.soni }} chek</span>
          <button v-if="yanaBor" class="as-btn" :disabled="yuklanmoqda" @click="yukla(true)">{{ yuklanmoqda ? 'Yuklanmoqda…' : 'Yana ko\'rsatish' }}</button>
        </div>
      </div>
    </section>

    <!-- ═══ CHEK ═══ -->
    <Transition name="as-drawer">
      <div v-if="tanlangan" class="as-ov" @click.self="yop">
        <aside class="as-drawer" role="dialog" aria-label="Chek">
          <div class="as-d-hd">
            <span class="as-head-ic sm"><svg viewBox="0 0 24 24" v-html="IKON.chek"/></span>
            <div class="as-d-t">
              <b>{{ tanlangan.mijoz_nomi || '—' }}</b>
              <span>#{{ tanlangan.raqam }} · {{ fmtKun(tanlangan.vaqt) }}, {{ fmtVaqt(tanlangan.vaqt) }}</span>
            </div>
            <button class="as-x" aria-label="Yopish" @click="yop"><svg viewBox="0 0 24 24" v-html="IKON.yop"/></button>
          </div>

          <div class="as-d-flow">
            <svg viewBox="0 0 24 24" v-html="IKON.mashina"/>
            <span v-if="tanlangan.kanal === 'sklad'">Van Sell: <b>skladdan, xodimsiz</b> — admin webdan sotgan. Tovar asosiy skladdan chiqqan, naqd to'g'ridan-to'g'ri kassada (inkassatsiya shart emas).</span>
            <span v-else-if="tanlangan.manba === 'web'">Van Sell: <b>{{ tanlangan.agent_nomi }}</b> nomidan <b>webdan</b> kiritilgan — tovar undagi yukdan chiqqan, naqd uning hisobida.</span>
            <span v-else>Van Sell: <b>{{ tanlangan.agent_nomi }}</b> o'zidagi yukdan joyida sotgan va shu zahoti topshirgan.</span>
          </div>

          <div v-if="tanlangan.holat === 'bekor'" class="as-d-note bad">
            <svg viewBox="0 0 24 24" v-html="IKON.bekor"/>
            <span><b>Bekor qilingan.</b> {{ tanlangan.bekor_sababi || 'Sabab yozilmagan' }}. Tovar omborga qaytgan, naqd kassadan, qarz mijoz balansidan olib tashlangan — hisobotlarda yo'q.</span>
          </div>
          <div v-else-if="tanlangan.takror" class="as-d-note warn">
            <svg viewBox="0 0 24 24" v-html="IKON.ogoh"/>
            <span><b>Takror chek ehtimoli.</b> Shu mijozga, shu agentdan, aynan {{ fmtSum(tanlangan.summa) }} so'mga 2 soat ichida yana chek bor. Ikkalasini solishtiring: mijoz tovarni bir marta olgan bo'lsa, ortiqchasini bekor qiling.</span>
          </div>

          <div v-if="bekorNatija" class="as-d-note ok">
            <svg viewBox="0 0 24 24" v-html="IKON.ok"/>
            <div class="as-d-note-b">
              <b>Chek bekor qilindi — hammasi teskari yozildi</b>
              <ul>
                <li v-for="t in bekorNatija.tovar" :key="t.ombor">{{ fmtDona(t.dona) }} kg tovar «{{ t.ombor }}» omboriga qaytdi</li>
                <li v-if="bekorNatija.naqd > 0">{{ fmtSum(bekorNatija.naqd) }} so'm naqd kassadan olib tashlandi</li>
                <li v-if="bekorNatija.qarz > 0">{{ fmtSum(bekorNatija.qarz) }} so'm qarz mijoz balansidan olib tashlandi<template v-if="bekorNatija.mijoz_balans !== null"> (hozirgi balans {{ fmtSum(bekorNatija.mijoz_balans) }})</template></li>
                <li v-if="bekorNatija.bonus > 0">{{ fmtSum(bekorNatija.bonus) }} so'm agent bonusi olib tashlandi</li>
              </ul>
              <p v-for="(o, i) in bekorNatija.ogohlantirishlar" :key="i" class="as-d-ogoh">{{ o }}</p>
            </div>
          </div>

          <div class="as-d-pul">
            <div><span>Summa</span><b>{{ fmtSum(tanlangan.summa) }}</b></div>
            <div class="ok"><span>Naqd olindi</span><b>{{ fmtSum(tanlangan.naqd) }}</b></div>
            <div :class="{ warn: tanlangan.qarz > 0.5 }"><span>Qarzga</span><b>{{ fmtSum(tanlangan.qarz) }}</b><small v-if="tanlangan.qarz > 0.5 && tanlangan.tolov_sana">to'lov sanasi {{ tanlangan.tolov_sana }}</small></div>
          </div>

          <div class="as-d-sec">
            <h3>Tovarlar <span>{{ tanlangan.tovar_soni }}</span></h3>
            <div v-if="!tafsilot" class="as-d-yuk">Yuklanmoqda…</div>
            <table v-else class="as-d-t2">
              <thead><tr><th>Nomi</th><th class="r">Miqdor</th><th class="r">Narx</th><th class="r">Summa</th></tr></thead>
              <tbody>
                <tr v-for="x in tafsilot.qatorlar" :key="x.id">
                  <td><b>{{ x.tovar_nomi }}</b><small v-if="x.turkum">{{ x.turkum }}</small></td>
                  <td class="r">{{ fmtDona(x.jami_dona) }}</td>
                  <td class="r">{{ fmtSum(x.narx) }}</td>
                  <td class="r"><b>{{ fmtSum(x.summa) }}</b></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="as-d-sec">
            <h3>Mijoz va joy</h3>
            <dl class="as-d-kv">
              <div><dt>Mijoz</dt><dd>{{ tanlangan.mijoz_nomi || '—' }}</dd></div>
              <div><dt>Telefon</dt><dd>{{ tanlangan.mijoz_telefon || '—' }}</dd></div>
              <div v-if="tafsilot?.mijoz"><dt>Joriy balans</dt><dd :class="Number(tafsilot.mijoz.balans) < 0 ? 'neg' : ''">{{ fmtSum(tafsilot.mijoz.balans) }} so'm</dd></div>
              <div><dt>Sotuv joyi</dt><dd>
                <template v-if="tanlangan.manba === 'web'">webdan kiritilgan, joylashuv yo'q</template>
                <template v-else-if="tanlangan.masofa_m === null">GPS olinmagan</template>
                <template v-else>mijoz nuqtasidan {{ fmtMasofa(tanlangan.masofa_m) }}<b v-if="tanlangan.uzoq" class="neg"> · {{ radius }} m chegaradan uzoq</b></template>
              </dd></div>
              <div v-if="tanlangan.oflayn"><dt>Yuborilgan</dt><dd>internetsiz qilingan, keyin yuborilgan</dd></div>
              <div v-if="tanlangan.izoh"><dt>Izoh</dt><dd>{{ tanlangan.izoh }}</dd></div>
            </dl>
          </div>

          <div v-if="bekorOchiq" class="as-bk">
            <h3><svg viewBox="0 0 24 24" v-html="IKON.ogoh"/>Sotuvni bekor qilish — admin amali</h3>
            <p>Chek #{{ tanlangan.raqam }} butunlay teskari yoziladi (qaytarish emas — bo'lmagan sotuv):</p>
            <ul>
              <li><b>{{ fmtDona(tanlangan.dona) }} kg</b> tovar {{ qaytishJoyi(tanlangan) }} qaytadi</li>
              <li v-if="tanlangan.naqd > 0"><b>{{ fmtSum(tanlangan.naqd) }}</b> so'm naqd kassadan (xodim yig'gan puldan) olib tashlanadi</li>
              <li v-if="tanlangan.qarz > 0.5"><b>{{ fmtSum(tanlangan.qarz) }}</b> so'm qarz mijoz balansidan olib tashlanadi</li>
              <li v-if="tanlangan.agent_id">xodimning savdo rejasi va bonusidan chiqadi</li>
              <li>hisobotlar, kun paneli va ilovadagi "Bugun" ro'yxatidan yo'qoladi; chek "bekor qilinganlar"da sabab bilan qoladi</li>
            </ul>
            <div class="as-bk-chips">
              <button v-for="s in SABABLAR" :key="s" :class="{ on: bekorSabab === s }" @click="bekorSabab = s">{{ s }}</button>
            </div>
            <textarea v-model="bekorSabab" class="as-ta" rows="2" placeholder="Sabab (majburiy) — masalan: takror yozilgan, mijoz tovarni bir marta olgan"/>
            <p v-if="bekorXato" class="as-bk-err">{{ bekorXato }}</p>
            <div class="as-bk-ft">
              <button class="as-btn" :disabled="bekorYuborilmoqda" @click="bekorOchiq = false">Orqaga</button>
              <button class="as-btn danger" :disabled="bekorYuborilmoqda || bekorSabab.trim().length < 3" @click="sotuvniBekorQil">{{ bekorYuborilmoqda ? 'Bekor qilinmoqda…' : 'Ha, sotuvni bekor qilish' }}</button>
            </div>
          </div>

          <div class="as-d-ft">
            <button v-if="admin && tanlangan.holat !== 'bekor' && !bekorOchiq" class="as-btn danger ghost" @click="bekorOchiq = true" title="Takror yoki xato yozilgan chek — ombor, kassa, mijoz qarzi, bonus teskari yoziladi">
              <svg viewBox="0 0 24 24" v-html="IKON.bekor"/>Sotuvni bekor qilish
            </button>
            <RouterLink :to="kunPaneli(tanlangan)" class="as-btn">Agentning shu kuni ›</RouterLink>
          </div>
        </aside>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Ranglar qobiq (MainLayout) tokenlaridan. Yashil — naqd, sariq — qarz, qizil — uzoqdan sotuv. */
.as { display:flex; flex-direction:column; gap:16px; padding-bottom:40px; color:var(--ink); }
svg { fill:none; stroke:currentColor; stroke-width:1.75; stroke-linecap:round; stroke-linejoin:round; }

/* ═══ SARLAVHA ═══ */
.as-head { display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap; }
.as-head-l { display:flex; align-items:center; gap:14px; min-width:0; flex:1 1 380px; }
.as-head-ic { width:44px; height:44px; flex-shrink:0; border-radius:11px; background:var(--brand-600); color:#fff; display:flex; align-items:center; justify-content:center; box-shadow:0 6px 16px -6px rgba(124,58,237,.55); }
.as-head-ic svg { width:22px; height:22px; }
.as-head-ic.sm { width:36px; height:36px; border-radius:9px; box-shadow:none; }
.as-head-ic.sm svg { width:18px; height:18px; }
.as-h1 { font-size:22px; font-weight:600; letter-spacing:-.02em; margin:0; }
.as-sub { font-size:13px; color:var(--mut); margin:4px 0 0; }
.as-davr { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.as-seg { display:inline-flex; background:var(--seg-track); box-shadow:inset 0 0 0 1px var(--seg-brd); border-radius:10px; padding:3px; gap:2px; }
.as-seg button { height:30px; padding:0 12px; border:0; border-radius:8px; background:transparent; color:var(--seg-ink); font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; white-space:nowrap; transition:color .15s, background-color .15s; }
.as-seg button:hover { color:var(--seg-ink-h); }
.as-seg button.on { background:var(--seg-on-bg); color:var(--seg-on-ink); box-shadow:var(--seg-on-sh); }
.as-seg.sm button { height:28px; padding:0 10px; }
.as-sana { display:flex; align-items:center; gap:4px; height:36px; padding:0 4px; border:1px solid var(--line); border-radius:9px; background:var(--surface); color:var(--sub); }
.as-sana input { height:100%; border:0; background:none; color:var(--ink); font:inherit; font-size:12.5px; padding:0 4px; }
.shell.dark .as-sana input { color-scheme:dark; }

/* ═══ KO'RSATKICHLAR ═══ */
.as-kpi { display:grid; grid-template-columns:repeat(4, 1fr); gap:12px; }
.as-k { display:flex; align-items:flex-start; gap:14px; padding:16px 18px; background:var(--surface); border:1px solid var(--line); border-radius:12px; min-width:0; }
.as-k-ic { width:40px; height:40px; flex-shrink:0; border-radius:10px; background:var(--acc-soft); color:var(--acc); display:flex; align-items:center; justify-content:center; }
.as-k-ic svg { width:20px; height:20px; }
.as-k.ok .as-k-ic { background:color-mix(in srgb, #059669 11%, transparent); color:#059669; }
.as-k.warn .as-k-ic { background:color-mix(in srgb, #d97706 12%, transparent); color:#d97706; }
.as-k.bad .as-k-ic { background:color-mix(in srgb, #dc2626 10%, transparent); color:#dc2626; }
.as-k.bad .as-k-v { color:#dc2626; }
.as-k-b { display:flex; flex-direction:column; gap:3px; min-width:0; }
.as-k-l { font-size:12.5px; color:var(--mut); }
.as-k-v { font-size:24px; font-weight:600; letter-spacing:-.02em; font-variant-numeric:tabular-nums; line-height:1.2; }
.as-k-v small { font-size:12.5px; font-weight:500; color:var(--mut); margin-left:5px; letter-spacing:0; }
.as-k-s { font-size:12px; color:var(--sub); }

/* ═══ JURNAL ═══ */
.as-card { background:var(--surface); border:1px solid var(--line); border-radius:12px; overflow:hidden; }
.as-bar { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; padding:12px 16px; border-bottom:1px solid var(--line); }
.as-mash { display:flex; gap:6px; flex-wrap:wrap; min-width:0; }
.as-mash button { height:30px; display:inline-flex; align-items:center; gap:6px; padding:0 11px; border:1px solid var(--line); border-radius:8px; background:var(--surface); color:var(--ink2); font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; white-space:nowrap; }
.as-mash button svg { width:15px; height:15px; color:var(--sub); }
.as-mash button span { font-size:11.5px; font-weight:600; color:var(--sub); font-variant-numeric:tabular-nums; }
.as-mash button:hover { border-color:var(--brand-300); }
.as-mash button.on { border-color:var(--acc); background:var(--acc-soft); color:var(--acc); }
.as-mash button.on svg, .as-mash button.on span { color:var(--acc); }
.as-bar-r { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.as-q { display:flex; align-items:center; gap:6px; height:32px; padding:0 10px; border:1px solid var(--line); border-radius:8px; background:var(--surface); color:var(--sub); }
.as-q:focus-within { border-color:var(--acc); box-shadow:0 0 0 3px var(--acc-soft); }
.as-q svg { width:14px; height:14px; flex-shrink:0; }
.as-q input { width:190px; border:0; outline:none; background:none; color:var(--ink); font:inherit; font-size:12.5px; }

.as-empty { display:flex; flex-direction:column; align-items:center; gap:6px; padding:48px 16px; text-align:center; color:var(--mut); font-size:13px; }
.as-empty b { color:var(--ink); font-size:14px; font-weight:600; }
.as-empty.err { color:#dc2626; flex-direction:row; justify-content:center; }
.as-link { border:0; background:none; color:var(--acc); font:inherit; font-weight:600; cursor:pointer; }

.as-tw { overflow-x:auto; }
.as-t { width:100%; border-collapse:collapse; font-size:13px; }
.as-t th { padding:9px 12px; text-align:left; font-size:11.5px; font-weight:600; color:var(--sub); text-transform:uppercase; letter-spacing:.03em; border-bottom:1px solid var(--line); white-space:nowrap; background:var(--surface); }
.as-t td { padding:10px 12px; border-bottom:1px solid var(--line); vertical-align:middle; }
.as-t tbody tr { cursor:pointer; }
.as-t tbody tr:hover { background:var(--hov); }
.as-t tbody tr.on { background:var(--acc-soft); }
.as-t tbody tr:focus-visible { outline:2px solid var(--acc); outline-offset:-2px; }
.as-t .r { text-align:right; }
.as-t td b { font-weight:600; }
.as-t td small { display:block; font-size:11.5px; color:var(--sub); margin-top:2px; white-space:nowrap; }
.as-t .vq { white-space:nowrap; font-variant-numeric:tabular-nums; }
.as-t .mj { min-width:160px; }
.as-t .ag { color:var(--ink2); white-space:nowrap; }
.as-t .tv { max-width:260px; }
.as-t .tv-n { display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:var(--ink2); }
.as-t .sm { font-weight:600; font-variant-numeric:tabular-nums; white-space:nowrap; }
.as-t .nq { color:#059669; font-variant-numeric:tabular-nums; white-space:nowrap; }
.as-t .qz { color:#b45309; font-variant-numeric:tabular-nums; white-space:nowrap; }
.as-tag { margin-left:6px; padding:0 5px; border-radius:5px; background:var(--hov); color:var(--mut); font-size:10.5px; font-weight:600; }
.as-tag.web { background:var(--acc-soft); color:var(--acc); }
.as-joy { display:inline-block; padding:2px 7px; border-radius:6px; font-size:11.5px; font-weight:600; white-space:nowrap; }
.as-joy.ok { color:#047857; background:color-mix(in srgb, #059669 10%, transparent); }
.as-joy.bad { color:#b91c1c; background:color-mix(in srgb, #dc2626 10%, transparent); }
.as-joy.n { color:var(--sub); background:var(--hov); }
.shell.dark .as-t .nq, .shell.dark .as-joy.ok { color:#34d399; }
.shell.dark .as-t .qz { color:#fbbf24; }
.shell.dark .as-joy.bad { color:#fca5a5; }

.as-more { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:10px 16px; font-size:12.5px; color:var(--mut); }
.as-btn { display:inline-flex; align-items:center; height:32px; padding:0 14px; border:1px solid var(--line); border-radius:8px; background:var(--surface); color:var(--acc); font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; text-decoration:none; }
.as-btn:hover:not(:disabled) { background:var(--acc-soft); border-color:var(--acc); }
.as-btn:disabled { opacity:.5; cursor:default; }
.as-btn.pri { height:36px; background:var(--brand-600); border-color:var(--brand-600); color:#fff; }
.as-btn.pri:hover { background:var(--brand-700); border-color:var(--brand-700); color:#fff; }

/* ═══ CHEK (o'ng panel) ═══ */
.as-ov { position:fixed; inset:0; z-index:80; background:rgba(0,0,0,.32); display:flex; justify-content:flex-end; }
.as-drawer { width:min(520px, 100vw); height:100%; overflow-y:auto; background:var(--surface); border-left:1px solid var(--line); box-shadow:-12px 0 40px rgba(0,0,0,.12); display:flex; flex-direction:column; }
.as-drawer-enter-active, .as-drawer-leave-active { transition:opacity .2s; }
.as-drawer-enter-active .as-drawer, .as-drawer-leave-active .as-drawer { transition:transform .24s cubic-bezier(.2,.8,.2,1); }
.as-drawer-enter-from, .as-drawer-leave-to { opacity:0; }
.as-drawer-enter-from .as-drawer, .as-drawer-leave-to .as-drawer { transform:translateX(24px); }
.as-d-hd { display:flex; align-items:center; gap:12px; padding:16px 18px; border-bottom:1px solid var(--line); }
.as-d-t { display:flex; flex-direction:column; gap:2px; min-width:0; flex:1; }
.as-d-t b { font-size:16px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.as-d-t span { font-size:12.5px; color:var(--mut); }
.as-x { width:32px; height:32px; border:0; border-radius:8px; background:none; color:var(--mut); cursor:pointer; display:flex; align-items:center; justify-content:center; }
.as-x:hover { background:var(--hov); color:var(--ink); }
.as-x svg { width:16px; height:16px; }
.as-d-flow { display:flex; gap:10px; align-items:flex-start; margin:14px 18px 0; padding:10px 12px; border-radius:10px; background:var(--acc-soft); color:var(--ink2); font-size:12.5px; line-height:1.5; }
.as-d-flow svg { width:18px; height:18px; flex-shrink:0; color:var(--acc); margin-top:1px; }
.as-d-pul { display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; padding:14px 18px 0; }
.as-d-pul div { display:flex; flex-direction:column; gap:2px; padding:10px 12px; border:1px solid var(--line); border-radius:10px; min-width:0; }
.as-d-pul span { font-size:11.5px; color:var(--mut); }
.as-d-pul b { font-size:16px; font-weight:600; font-variant-numeric:tabular-nums; }
.as-d-pul small { font-size:11px; color:var(--sub); }
.as-d-pul .ok b { color:#059669; }
.as-d-pul .warn b { color:#b45309; }
.shell.dark .as-d-pul .ok b { color:#34d399; }
.shell.dark .as-d-pul .warn b { color:#fbbf24; }
.as-d-sec { padding:16px 18px 0; }
.as-d-sec h3 { display:flex; align-items:center; gap:6px; margin:0 0 8px; font-size:12px; font-weight:600; color:var(--sub); text-transform:uppercase; letter-spacing:.04em; }
.as-d-sec h3 span { padding:0 6px; border-radius:6px; background:var(--hov); color:var(--mut); font-size:11px; }
.as-d-yuk { font-size:12.5px; color:var(--mut); padding:8px 0; }
.as-d-t2 { width:100%; border-collapse:collapse; font-size:13px; }
.as-d-t2 th { padding:6px 0; font-size:11px; font-weight:600; color:var(--sub); text-align:left; border-bottom:1px solid var(--line); }
.as-d-t2 td { padding:8px 0; border-bottom:1px solid var(--line); vertical-align:top; font-variant-numeric:tabular-nums; }
.as-d-t2 .r { text-align:right; padding-left:10px; white-space:nowrap; }
.as-d-t2 td b { font-weight:600; }
.as-d-t2 td small { display:block; font-size:11.5px; color:var(--sub); }
.as-d-kv { margin:0; display:flex; flex-direction:column; }
.as-d-kv div { display:flex; justify-content:space-between; gap:16px; padding:7px 0; border-bottom:1px solid var(--line); font-size:13px; }
.as-d-kv dt { color:var(--mut); flex-shrink:0; }
.as-d-kv dd { margin:0; text-align:right; font-weight:500; }
.as-d-kv .neg { color:#dc2626; }
.as-d-ft { margin-top:auto; padding:16px 18px; display:flex; justify-content:flex-end; }

@media (max-width:1180px) { .as-kpi { grid-template-columns:repeat(2, 1fr); } }
@media (max-width:640px) {
  .as-kpi { grid-template-columns:1fr; }
  .as-q input { width:140px; }
  .as-d-pul { grid-template-columns:1fr; }
}

/* Takror / bekor ko'rinishlari va admin bekor qilish paneli */
.as-chip { height:30px; display:inline-flex; align-items:center; gap:6px; padding:0 11px; border:1px solid var(--line); border-radius:8px; background:var(--surface); color:var(--ink2); font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; white-space:nowrap; }
.as-chip svg { width:14px; height:14px; color:var(--sub); }
.as-chip span { padding:0 6px; border-radius:6px; background:color-mix(in srgb, #d97706 14%, transparent); color:#b45309; font-size:11px; }
.as-chip:hover { border-color:var(--brand-300); }
.as-chip.on { border-color:var(--acc); background:var(--acc-soft); color:var(--acc); }
.as-chip.on svg { color:var(--acc); }
.as-chip.warn.on { border-color:#d97706; background:color-mix(in srgb, #d97706 10%, transparent); color:#b45309; }
.as-chip.warn.on svg { color:#d97706; }
.as-tag.bad { background:color-mix(in srgb, #dc2626 12%, transparent); color:#b91c1c; }
.shell.dark .as-tag.bad { color:#fca5a5; }
.as-t tbody tr.bk td { color:var(--mut); }
.as-t tbody tr.bk .sm, .as-t tbody tr.bk .nq, .as-t tbody tr.bk .qz { text-decoration:line-through; color:var(--mut); }
.as-d-note { display:flex; gap:10px; align-items:flex-start; margin:14px 18px 0; padding:10px 12px; border-radius:10px; font-size:12.5px; line-height:1.5; color:var(--ink2); }
.as-d-note svg { width:18px; height:18px; flex-shrink:0; margin-top:1px; }
.as-d-note.bad { background:color-mix(in srgb, #dc2626 9%, transparent); } .as-d-note.bad svg { color:#dc2626; }
.as-d-note.warn { background:color-mix(in srgb, #d97706 11%, transparent); } .as-d-note.warn svg { color:#d97706; }
.as-d-note.ok { background:color-mix(in srgb, #059669 10%, transparent); } .as-d-note.ok svg { color:#059669; }
.as-d-note-b { display:flex; flex-direction:column; gap:4px; min-width:0; }
.as-d-note-b ul { margin:0; padding-left:16px; }
.as-d-ogoh { margin:4px 0 0; padding:7px 9px; border-radius:8px; background:color-mix(in srgb, #d97706 12%, transparent); color:#92400e; font-size:12px; }
.shell.dark .as-d-ogoh { color:#fcd34d; }
.as-bk { margin:16px 18px 0; padding:14px; border:1px solid color-mix(in srgb, #dc2626 35%, transparent); border-radius:12px; background:color-mix(in srgb, #dc2626 5%, transparent); font-size:12.5px; line-height:1.5; }
.as-bk h3 { display:flex; align-items:center; gap:7px; margin:0 0 6px; font-size:13.5px; font-weight:600; color:#b91c1c; }
.as-bk h3 svg { width:17px; height:17px; }
.as-bk p { margin:0 0 6px; color:var(--ink2); }
.as-bk ul { margin:0 0 10px; padding-left:16px; color:var(--ink2); }
.as-bk ul b { color:var(--ink); }
.as-bk-chips { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px; }
.as-bk-chips button { height:26px; padding:0 10px; border:1px solid var(--line); border-radius:7px; background:var(--surface); color:var(--ink2); font:inherit; font-size:12px; cursor:pointer; }
.as-bk-chips button.on { border-color:#dc2626; color:#b91c1c; background:color-mix(in srgb, #dc2626 8%, transparent); }
.as-ta { width:100%; box-sizing:border-box; padding:8px 10px; border:1px solid var(--line); border-radius:8px; background:var(--surface); color:var(--ink); font:inherit; font-size:12.5px; resize:vertical; outline:none; }
.as-ta:focus { border-color:#dc2626; box-shadow:0 0 0 3px color-mix(in srgb, #dc2626 14%, transparent); }
.as-bk-err { margin:6px 0 0; color:#b91c1c; font-size:12px; }
.as-bk-ft { display:flex; justify-content:flex-end; gap:8px; margin-top:10px; }
.as-btn.danger { background:#dc2626; border-color:#dc2626; color:#fff; }
.as-btn.danger:hover:not(:disabled) { background:#b91c1c; border-color:#b91c1c; }
.as-btn.danger.ghost { background:transparent; color:#b91c1c; border-color:color-mix(in srgb, #dc2626 40%, transparent); gap:6px; margin-right:auto; }
.as-btn.danger.ghost:hover:not(:disabled) { background:color-mix(in srgb, #dc2626 8%, transparent); border-color:#dc2626; }
.as-btn.danger.ghost svg { width:15px; height:15px; }
.shell.dark .as-bk h3, .shell.dark .as-bk-err, .shell.dark .as-btn.danger.ghost { color:#fca5a5; }

/* Skladdan (xodimsiz) sotuvlar */
.as-mash button.sklad svg { color:var(--brand-600, #7c3aed); }
.as-sklad { display:inline-block; padding:2px 8px; border-radius:6px; font-size:11.5px; font-weight:700; color:var(--brand-700, #6d28d9); background:rgba(139,92,246,.12); white-space:nowrap; }
</style>
