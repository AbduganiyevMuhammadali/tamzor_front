<script setup lang="ts">
/* VAN SELL — SOTUV QILISH (web, xodim nomidan).
   Xodim ilovadan sota olmagan holat uchun: telefon buzilgan, internet yo'q, ilova ishlamadi.
   Omborchi yoki admin xodimni tanlaydi, uning mashinasidagi tovardan mijozga sotadi.
   Sotuv mobil ilovadagi sotuv bilan bir xil yo'ldan o'tadi (backend: createAriza):
   tovar xodim omboridan chiqadi, naqd xodimning kassasiga (Inkassatsiyada u topshiradi),
   qarz mijoz balansiga, bonus xodimga, sotuv xodimning kun hisobiga va hisobotlarga tushadi. */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import NumberInput from '@/components/NumberInput.vue'
import { useRoute, useRouter } from 'vue-router'
// @ts-ignore
import { api, avtolavkaApi, kassalarApi, faylniOch } from '@/api/api'
import { useSorovId } from '@/validation/useForma'
import { qiymatXato } from '@/validation/qoidalar'
import * as sx from '@/validation/sxemalar'

const route = useRoute()
const router = useRouter()

const pad = (v: number) => String(v).padStart(2, '0')
const kunKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const bugun = () => kunKey(new Date())
const kunOldin = (k: number) => { const d = new Date(); d.setDate(d.getDate() - k); return kunKey(d) }
const kunQosh = (s: string, k: number) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + k); return kunKey(d) }
const ORQAGA_KUN = 6                       // backend SOTUV_ORQAGA_KUN bilan bir xil
const minSana = kunOldin(ORQAGA_KUN)

const son = (s: any) => { const v = parseFloat(String(s ?? '').replace(/\s/g, '').replace(',', '.')); return isFinite(v) ? v : 0 }
const fmtSum = (v: number) => new Intl.NumberFormat('ru-RU').format(Math.round(Number(v) || 0))
const fmtDona = (v: number) => new Intl.NumberFormat('ru-RU').format(Math.round((Number(v) || 0) * 1000) / 1000)
const fmtMln = (v: number) => { const n = Number(v) || 0; return n >= 1e6 ? `${(n / 1e6).toFixed(1).replace('.', ',')} mln` : fmtSum(n) }
const OYLAR = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr']
const fmtKun = (s: string) => { const d = new Date(s + 'T00:00:00'); return isNaN(+d) ? s : `${d.getDate()}-${OYLAR[d.getMonth()]}` }
const bosh = (s: string) => String(s || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase()

/* ── Holat ── */
const agentlar = ref<any[]>([])
// 'sklad' — xodimsiz: admin to'g'ridan-to'g'ri asosiy skladdan sotadi
const agentId = ref<number | 'sklad' | null>(route.query.agent === 'sklad' ? 'sklad' : (Number(route.query.agent) || null))
const sana = ref(bugun())
const mijozlar = ref<any[]>([])
const mijozId = ref<number | null>(null)
const tayyor = ref<any>(null)
const yuklanmoqda = ref(false)
const xato = ref('')

const miqdor = ref<Record<number, string>>({})        // tovar_id → kiritilgan miqdor (matn)
const narx = ref<Record<number, string>>({})          // tovar_id → amaldagi narx (matn)
const narxQolda = ref<Record<number, boolean>>({})    // narx qo'lda o'zgartirilganmi
const tovarQidir = ref('')

const tolov = ref<'naqd' | 'qisman' | 'qarz'>('naqd')
/* To'lov usuli: naqd yoki plastik (backend §19). Plastik — faqat agent nomidan sotuvda: agent viloyatidagi
   plastik kassa tanlanadi, chek fayli majburiy; to'lov "kutilmoqda" bo'lib Moliya → Plastik to'lovlar navbatiga tushadi */
const usul = ref<'naqd' | 'plastik'>('naqd')
const plKassa = ref<number | ''>('')
const chek = ref<{ yol: string; nomi: string } | null>(null)
const chekIzoh = ref('')
const chekBand = ref(false)
const chekXato = ref('')
const plastikKassalar = computed<any[]>(() => (sklad.value ? [] : tayyor.value?.plastik_kassalar || []))
const plastik = computed(() => usul.value === 'plastik')
function plastikTozala() { usul.value = 'naqd'; plKassa.value = ''; chek.value = null; chekIzoh.value = ''; chekXato.value = '' }
async function chekTanla(e: Event) {
  const inp = e.target as HTMLInputElement, fayl = inp.files?.[0]
  inp.value = ''
  if (!fayl) return
  chekXato.value = ''
  if (fayl.size > 10 * 1024 * 1024) { chekXato.value = 'Fayl hajmi 10 MB dan oshmasin'; return }
  if (!/\.(jpe?g|png|webp|gif|heic|heif|pdf|docx?|xlsx?)$/i.test(fayl.name)) { chekXato.value = 'Faqat rasm yoki PDF, Word, Excel fayli'; return }
  chekBand.value = true
  try { const r = await kassalarApi.chekYuklash(fayl); chek.value = { yol: r.chekRasm, nomi: r.nomi || fayl.name } }
  catch (x: any) { chekXato.value = x?.message || 'Chek yuklanmadi' }
  finally { chekBand.value = false }
}
async function chekKor() { if (chek.value) { try { await faylniOch(chek.value.yol, 'chek') } catch (x: any) { chekXato.value = x?.message || 'Chek ochilmadi' } } }
const naqdMatn = ref('')
const tolovSana = ref('')
const izoh = ref('')
const tasdiq = ref(false)
const saqlanmoqda = ref(false)
const saqlashXato = ref('')
const natija = ref<any>(null)

const agent = computed(() => agentlar.value.find(a => a.id === agentId.value) || null)
const sklad = computed(() => agentId.value === 'sklad')
const mijoz = computed(() => (tayyor.value?.mijoz && tayyor.value.mijoz.id === mijozId.value ? tayyor.value.mijoz : null))
const tovarlar = computed<any[]>(() => tayyor.value?.tovarlar || [])
const korinadi = computed(() => {
  const q = tovarQidir.value.trim().toLowerCase()
  return q ? tovarlar.value.filter(t => `${t.tovar_nomi} ${t.turkum || ''} ${t.shtrix_kod || ''}`.toLowerCase().includes(q)) : tovarlar.value
})

/* ── Yuklash ── */
async function agentlarniYukla() {
  try {
    agentlar.value = await avtolavkaApi.agentlar()
    if (agentId.value && agentId.value !== 'sklad' && !agentlar.value.some(a => a.id === agentId.value)) agentId.value = null
    if (!agentId.value && agentlar.value.length === 1) agentId.value = agentlar.value[0].id
  } catch (e: any) { xato.value = e?.message || "Xodimlarni yuklab bo'lmadi" }
}
async function mijozlarniYukla() {
  try { mijozlar.value = await api.get('/mijozlar?faol=true&all=true') } catch { /* qidiruv bo'sh qoladi */ }
}

let soralgan = 0
async function tayyorYukla() {
  if (!agentId.value) { tayyor.value = null; return }
  const n = ++soralgan
  yuklanmoqda.value = true; xato.value = ''
  try {
    const d = await avtolavkaApi.sotuvTayyor({ agent_id: agentId.value, sana: sana.value, ...(mijozId.value ? { mijoz_id: mijozId.value } : {}) })
    if (n !== soralgan) return
    tayyor.value = d
    // Narx — mijozning narx ro'yxatidan; qo'lda o'zgartirilgani saqlanadi
    const bor = new Set<number>()
    for (const t of d.tovarlar) {
      bor.add(t.tovar_id)
      if (!narxQolda.value[t.tovar_id]) narx.value[t.tovar_id] = t.narx > 0 ? String(t.narx) : ''
    }
    for (const id of Object.keys(miqdor.value).map(Number)) if (!bor.has(id)) delete miqdor.value[id]
  } catch (e: any) {
    if (n === soralgan) xato.value = e?.message || "Ma'lumotni yuklab bo'lmadi"
  } finally {
    if (n === soralgan) yuklanmoqda.value = false
  }
}

function savatniTozala() { miqdor.value = {}; narx.value = {}; narxQolda.value = {}; tovarQidir.value = '' }

watch(agentId, (id) => {
  router.replace({ query: id ? { agent: String(id) } : {} })
  savatniTozala(); tayyorYukla()
})
watch([mijozId, sana], () => tayyorYukla())
// Qarz qismining to'lov sanasi: sotuv kuni + mijozning to'lov muddati
watch(() => [mijoz.value?.id, sana.value], () => {
  tolovSana.value = kunQosh(sana.value, Math.max(0, Number(mijoz.value?.tolov_muddati_kun ?? 7)))
})
watch(() => mijoz.value?.qarz_bloklangan, (b) => { if (b) tolov.value = 'naqd' })
// Plastikda "to'liq qarzga" bo'lmaydi; agent almashsa kassa ro'yxati ham almashadi
watch(usul, (u) => { if (u === 'plastik' && tolov.value === 'qarz') tolov.value = 'naqd' })
watch(agentId, plastikTozala)
watch(plastikKassalar, (k) => { if (plastik.value && !k.length) plastikTozala(); else if (k.length === 1 && plastik.value) plKassa.value = k[0].id })

onMounted(async () => {
  await Promise.all([agentlarniYukla(), mijozlarniYukla()])
  if (agentId.value) tayyorYukla()
})

/* ── Mijoz tanlash ── */
const mijozQidir = ref('')
const mijozOchiq = ref(false)
const mijozFaol = ref(0)
const mijozTopildi = computed(() => {
  const q = mijozQidir.value.trim().toLowerCase()
  const rows = mijozlar.value.filter(m => !q || `${m.nomi} ${m.telefon || ''} ${m.manzil || ''}`.toLowerCase().includes(q))
  // Tanlangan xodimning o'z mijozlari birinchi (ilovadagi kabi), keyin qolganlari
  rows.sort((a, b) => (Number(b.agent_id === agentId.value) - Number(a.agent_id === agentId.value)) || String(a.nomi).localeCompare(String(b.nomi)))
  return rows.slice(0, 40)
})
watch(mijozQidir, () => { mijozFaol.value = 0; mijozOchiq.value = true })
function mijozTanla(m: any) { mijozId.value = m.id; mijozQidir.value = ''; mijozOchiq.value = false }
function mijozKlav(e: KeyboardEvent) {
  const n = mijozTopildi.value.length
  if (e.key === 'ArrowDown') { e.preventDefault(); mijozOchiq.value = true; mijozFaol.value = Math.min(n - 1, mijozFaol.value + 1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); mijozFaol.value = Math.max(0, mijozFaol.value - 1) }
  else if (e.key === 'Enter' && mijozOchiq.value && mijozTopildi.value[mijozFaol.value]) { e.preventDefault(); mijozTanla(mijozTopildi.value[mijozFaol.value]) }
  else if (e.key === 'Escape') mijozOchiq.value = false
}
const mijozYop = () => setTimeout(() => { mijozOchiq.value = false }, 150)
const balansQisqa = (b: number) => (b < -0.5 ? `qarz ${fmtMln(-b)}` : b > 0.5 ? `haqdor ${fmtMln(b)}` : '')

/* ── Savat ── */
const qatorlar = computed(() => tovarlar.value
  .filter(t => son(miqdor.value[t.tovar_id]) > 0)
  .map(t => {
    const dona = +son(miqdor.value[t.tovar_id]).toFixed(3)
    const nx = son(narx.value[t.tovar_id])
    return { ...t, dona, narxi: nx, summa: Math.round(dona * nx), ortiq: dona > t.qoldiq + 0.0005, narxsiz: nx <= 0 }
  }))
const jami = computed(() => qatorlar.value.reduce((s, q) => s + q.summa, 0))
const naqd = computed(() => (tolov.value === 'naqd' ? jami.value : tolov.value === 'qarz' ? 0 : Math.min(jami.value, Math.max(0, Math.round(son(naqdMatn.value))))))
const qarz = computed(() => Math.max(0, jami.value - naqd.value))
const yangiBalans = computed(() => (mijoz.value ? mijoz.value.balans - qarz.value : 0))
const limitOshadi = computed(() => !!mijoz.value && mijoz.value.kredit_limit > 0 && qarz.value > 0.5 && mijoz.value.qarz + qarz.value > mijoz.value.kredit_limit)

const qatorSumma = (t: any) => Math.round(son(miqdor.value[t.tovar_id]) * son(narx.value[t.tovar_id]))
const ortiqmi = (t: any) => son(miqdor.value[t.tovar_id]) > t.qoldiq + 0.0005
function hammasi(t: any) { miqdor.value[t.tovar_id] = String(t.qoldiq) }
function narxOzgardi(t: any) { narxQolda.value[t.tovar_id] = son(narx.value[t.tovar_id]) !== t.narx }
function olib(t: any) { miqdor.value[t.tovar_id] = '' }

// Birinchi to'sqinlik — tugma ostida shu ko'rinadi
const muammo = computed(() => {
  if (!agentId.value) return 'Skladni yoki xodimni tanlang'
  if (sana.value < minSana || sana.value > bugun()) return `Sana bugundan ${ORQAGA_KUN} kungacha orqaga bo'lishi mumkin`
  if (!mijoz.value) return 'Mijozni tanlang'
  if (!qatorlar.value.length) return 'Kamida bitta tovar miqdorini kiriting'
  const o = qatorlar.value.find(q => q.ortiq)
  if (o) return `"${o.tovar_nomi}" ${sklad.value ? 'skladda' : 'agentda'} ${fmtDona(o.qoldiq)} ${o.olchov} bor`
  const nx = qatorlar.value.find(q => q.narxsiz)
  if (nx) return `"${nx.tovar_nomi}" uchun narx kiriting`
  if (tolov.value === 'qisman' && (naqd.value <= 0 || naqd.value >= jami.value)) return `${plastik.value ? 'Plastik' : 'Naqd'} summa 0 dan katta va ${fmtSum(jami.value)} dan kichik bo'lsin`
  if (plastik.value) {
    if (!plKassa.value) return 'Plastik kassani tanlang'
    if (chekBand.value) return 'Chek yuklanmoqda…'
    if (!chek.value) return "Plastik to'lov uchun chek faylini biriktiring"
  }
  if (qarz.value > 0.5) {
    if (mijoz.value.qarz_bloklangan) return 'Bu mijozga qarzga sotib bo\'lmaydi — faqat to\'liq naqd'
    if (limitOshadi.value) return `Kredit limiti ${fmtSum(mijoz.value.kredit_limit)} so'm — qarz limitdan oshadi`
    if (!tolovSana.value) return "Qarz uchun to'lov sanasini belgilang"
    if (tolovSana.value < sana.value) return "To'lov sanasi sotuv kunidan oldin bo'lmaydi"
  }
  return ''
})

/* ── Kun holati ── */
const HOLAT: Record<string, string> = { bosh: 'Yuklanmagan', ochiq: 'Savdo ochiq', topshirilmoqda: 'Topshirilmoqda', yopiq: 'Kun yopilgan', kamomad: 'Kamomad bilan yopilgan' }
const kunOgoh = computed(() => {
  const k = tayyor.value?.kun
  if (!k) return ''
  if (k.holat === 'yopiq' || k.holat === 'kamomad') return `${fmtKun(sana.value)} kuni yopilgan: tovar va pul topshirilgan. Sotuv baribir shu kunga yoziladi va kun solishtirmasida farq paydo bo'ladi.`
  if (k.holat === 'topshirilmoqda') return `Xodim ${fmtKun(sana.value)} kunini yopgan yoki topshirish boshlangan. Sotuv shu kun hisobiga qo'shiladi.`
  return ''
})

/* ── Sotish ── */
function sotishOch() { if (!muammo.value) { saqlashXato.value = ''; tasdiq.value = true } }
// So'rov kaliti — shu savat uchun bitta: qayta urinishda o'zgarmaydi (javob yo'qolgan bo'lsa backend
// o'sha sotuvni qaytaradi, ikkinchisi yaratilmaydi); muvaffaqiyatli sotuvdan keyin yangilanadi
const sorov = useSorovId()
async function sot() {
  if (muammo.value || saqlanmoqda.value) return
  const naqdXato = qiymatXato(sx.avtolavkaSotuv.naqd!, naqd.value)
  if (naqdXato) { saqlashXato.value = naqdXato; return }
  saqlanmoqda.value = true; saqlashXato.value = ''
  try {
    natija.value = await avtolavkaApi.sotuvCreate({
      sorov_id: sorov.id.value,
      agent_id: agentId.value, mijoz_id: mijozId.value, sana: sana.value,
      qatorlar: qatorlar.value.map(q => ({ tovar_id: q.tovar_id, dona: q.dona, narx: q.narxi })),
      tolov: tolov.value, naqd: naqd.value,
      tolov_sana: qarz.value > 0.5 ? tolovSana.value : null,
      izoh: izoh.value.trim() || null,
      // Plastik maydonlari faqat plastikda yuboriladi (naqd sotuv avvalgidek)
      ...(plastik.value ? { tolov_usuli: 'plastik', kassa_id: Number(plKassa.value), chek_rasm: chek.value!.yol, ...(chekIzoh.value.trim() ? { chek_izoh: chekIzoh.value.trim().slice(0, 255) } : {}) } : {}),
    })
    natija.value.qatorlar = qatorlar.value.map(q => ({ nomi: q.tovar_nomi, dona: q.dona, olchov: q.olchov, narx: q.narxi, summa: q.summa }))
    tasdiq.value = false
    sorov.yangila()
    agentlarniYukla()
  } catch (e: any) {
    saqlashXato.value = e?.message || "Sotuvni saqlab bo'lmadi"
    // Mashina qoldig'i boshqa joyda o'zgargan bo'lishi mumkin — yangilab qo'yamiz
    tayyorYukla()
  } finally {
    saqlanmoqda.value = false
  }
}
function yangiSotuv() {
  natija.value = null; mijozId.value = null; savatniTozala(); sorov.yangila()
  tolov.value = 'naqd'; naqdMatn.value = ''; izoh.value = ''; saqlashXato.value = ''
  plastikTozala()
  tayyorYukla()
}

const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && tasdiq.value && !saqlanmoqda.value) tasdiq.value = false }
onMounted(() => window.addEventListener('keydown', esc))
onUnmounted(() => window.removeEventListener('keydown', esc))

const IKON = {
  savat: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.6 12h12L22 7H6.2"/>',
  mashina: '<path d="M2 6h11v10H2z"/><path d="M13 9h4.2l3.8 4.2V16h-8"/><circle cx="6.5" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/>',
  sklad: '<path d="M3 21V8l9-5 9 5v13"/><path d="M3 21h18"/><path d="M7 21v-6h10v6"/><path d="M9 11h6"/>',
  qidir: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  ogoh: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  ok: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8L16.5 9.5"/>',
  yop: '<path d="M18 6 6 18M6 6l12 12"/>',
  dokon: '<path d="M3.5 9 5 4h14l1.5 5"/><path d="M3.5 9a2.8 2.8 0 0 0 5.6 0 2.8 2.8 0 0 0 5.8 0 2.8 2.8 0 0 0 5.6 0"/><path d="M5 12v8h14v-8"/><path d="M10 20v-5h4v5"/>',
  chek: '<path d="M6 2.5h12v19l-3-2-3 2-3-2-3 2z"/><path d="M9 7.5h6M9 11.5h6M9 15.5h3.5"/>',
}
</script>

<template>
  <div class="ws">
    <!-- ═══ SARLAVHA ═══ -->
    <header class="ws-head">
      <div class="ws-head-l">
        <span class="ws-head-ic"><svg viewBox="0 0 24 24" v-html="IKON.savat"/></span>
        <div>
          <h1 class="ws-h1">Sotuv qilish</h1>
          <p class="ws-sub">Skladdan — xodimsiz: tovar asosiy skladdan chiqadi, naqd kassaga, qarz mijoz balansiga. Xodim nomidan — ilova ishlamay qolganda: tovar agentdagi yukdan chiqadi, naqd uning hisobiga.</p>
        </div>
      </div>
      <RouterLink :to="{ path: '/avtolavka/sotuvlar', query: agentId ? { agent: String(agentId) } : {} }" class="ws-btn">Sotuvlar jurnali ›</RouterLink>
    </header>

    <!-- ═══ NATIJA ═══ -->
    <section v-if="natija" class="ws-card ws-done">
      <span class="ws-done-ic"><svg viewBox="0 0 24 24" v-html="IKON.ok"/></span>
      <h2>Sotuv yozildi · #{{ natija.raqam }}</h2>
      <p><b>{{ natija.agent ? natija.agent.fullname + ' nomidan' : 'Skladdan, xodimsiz' }}</b> — <b>{{ natija.mijoz.nomi }}</b> ga, {{ fmtKun(natija.sana) }}</p>
      <div class="ws-done-pul">
        <div><span>Summa</span><b>{{ fmtSum(natija.summa) }}</b></div>
        <div v-if="natija.tolov_usuli === 'plastik' && natija.plastik" class="warn"><span>Plastik · {{ natija.plastik.kassa_nomi }}</span><b>{{ fmtSum(natija.plastik.summa) }}</b><small>tasdiq kutilmoqda — <RouterLink to="/moliya/plastik">navbatda ko'rish</RouterLink></small></div>
        <div v-else class="ok"><span>{{ natija.agent ? 'Naqd · xodim kassasiga' : 'Naqd · kassaga tushdi' }}</span><b>{{ fmtSum(natija.naqd) }}</b></div>
        <div :class="{ warn: natija.qarz > 0.5 }"><span>Qarzga</span><b>{{ fmtSum(natija.qarz) }}</b><small v-if="natija.tolov_sana">{{ fmtKun(natija.tolov_sana) }} gacha</small></div>
      </div>
      <table class="ws-done-t">
        <tbody>
          <tr v-for="(q, i) in natija.qatorlar" :key="i"><td>{{ q.nomi }}</td><td class="r">{{ fmtDona(q.dona) }} {{ q.olchov }} × {{ fmtSum(q.narx) }}</td><td class="r"><b>{{ fmtSum(q.summa) }}</b></td></tr>
        </tbody>
      </table>
      <p class="ws-done-bal">Mijozning yangi balansi:
        <b :class="{ neg: natija.mijoz.balans < -0.5, pos: natija.mijoz.balans > 0.5 }">{{ natija.mijoz.balans < -0.5 ? `${fmtSum(-natija.mijoz.balans)} so'm qarz` : natija.mijoz.balans > 0.5 ? `${fmtSum(natija.mijoz.balans)} so'm haqdor` : '0' }}</b>
      </p>
      <div class="ws-done-ft">
        <button class="ws-btn pri" @click="yangiSotuv">Yangi sotuv</button>
        <RouterLink :to="{ path: '/avtolavka/sotuvlar', query: { agent: natija.agent ? String(natija.agent.id) : 'sklad', dan: natija.sana, gacha: natija.sana } }" class="ws-btn">Jurnalda ko'rish</RouterLink>
        <RouterLink v-if="natija.agent" :to="{ path: '/avtolavka', query: { agent: String(natija.agent.id), sana: natija.sana } }" class="ws-btn">Xodimning kuni ›</RouterLink>
      </div>
    </section>

    <template v-else>
      <!-- ═══ 1. XODIM ═══ -->
      <section class="ws-card">
        <div class="ws-sec">
          <span class="ws-n">1</span>
          <div class="ws-sec-t"><b>Qayerdan sotiladi</b><small>Skladdan (xodimsiz) yoki agent nomidan undagi yukdan</small></div>
          <div class="ws-sana">
            <div class="ws-seg">
              <button :class="{ on: sana === bugun() }" @click="sana = bugun()">Bugun</button>
              <button :class="{ on: sana === kunOldin(1) }" @click="sana = kunOldin(1)">Kecha</button>
            </div>
            <input type="date" v-model="sana" :min="minSana" :max="bugun()" aria-label="Sotuv sanasi" @change="!sana && (sana = bugun())"/>
          </div>
        </div>
        <div class="ws-agents">
          <!-- Skladdan — xodimsiz (admin): tovar asosiy skladdan, naqd kassaga -->
          <button class="ws-ag ws-ag--sklad" :class="{ on: sklad }" @click="agentId = 'sklad'">
            <span class="ws-av ws-av--sklad"><svg viewBox="0 0 24 24" v-html="IKON.sklad"/></span>
            <span class="ws-ag-b"><b>Skladdan · xodimsiz</b><small>Asosiy skladdan to'g'ridan-to'g'ri sotish — naqd kassaga tushadi</small></span>
          </button>
          <button v-for="a in agentlar" :key="a.id" class="ws-ag" :class="{ on: agentId === a.id }" @click="agentId = a.id">
            <span class="ws-av">{{ bosh(a.fullname) }}</span>
            <span class="ws-ag-b">
              <b>{{ a.fullname }}</b>
              <small>
                <template v-if="a.mashina_raqam">{{ a.mashina_raqam }} · </template>
                <template v-if="a.qoldiq.tovar_soni">agentda {{ a.qoldiq.tovar_soni }} xil, {{ fmtMln(a.qoldiq.summa) }} so'm</template>
                <template v-else>tovar yo'q</template>
              </small>
            </span>
          </button>
        </div>
        <div v-if="!agentlar.length" class="ws-mut" style="margin-top:8px">Van Sell rejimidagi xodim yo'q — xodim nomidan sotish uchun Agentlar bo'limida xodim kartasida "Van Sell" belgisini yoqing.</div>
        <div v-if="tayyor && tayyor.kun" class="ws-kun">
          <span class="ws-pill" :class="tayyor.kun.holat">{{ HOLAT[tayyor.kun.holat] || tayyor.kun.holat }}</span>
          <span>{{ fmtKun(sana) }} · {{ tayyor.kun.sotildi.hujjat_soni ? `${tayyor.kun.sotildi.hujjat_soni} ta sotuv, ${fmtSum(tayyor.kun.sotildi.summa)} so'm` : 'hali sotuv yo\'q' }} · naqd olingan {{ fmtSum(tayyor.kun.naqd) }} so'm</span>
          <span v-if="sana !== bugun()" class="ws-mut">O'tgan kun sotuvi o'sha kunning 12:00 vaqti bilan yoziladi</span>
        </div>
        <div v-if="kunOgoh" class="ws-ogoh"><svg viewBox="0 0 24 24" v-html="IKON.ogoh"/><span>{{ kunOgoh }}</span></div>
      </section>

      <div v-if="xato" class="ws-card ws-empty err">{{ xato }} <button class="ws-link" @click="tayyorYukla()">Qayta urinish</button></div>

      <div v-if="agentId && tayyor" class="ws-grid">
        <div class="ws-main">
          <!-- ═══ 2. MIJOZ ═══ -->
          <section class="ws-card">
            <div class="ws-sec">
              <span class="ws-n">2</span>
              <div class="ws-sec-t"><b>Mijoz</b><small>{{ agent ? `Barcha faol mijozlar · ${agent.fullname}ning mijozlari birinchi` : 'Barcha faol mijozlar' }}</small></div>
            </div>
            <div v-if="!mijozId" class="ws-mq">
              <label class="ws-q big">
                <svg viewBox="0 0 24 24" v-html="IKON.qidir"/>
                <input v-model="mijozQidir" placeholder="Mijoz nomi, telefon yoki manzil" autocomplete="off"
                       @focus="mijozOchiq = true" @blur="mijozYop" @keydown="mijozKlav"/>
              </label>
              <div v-if="mijozOchiq" class="ws-drop" role="listbox">
                <button v-for="(m, i) in mijozTopildi" :key="m.id" class="ws-drop-i" :class="{ on: i === mijozFaol }" role="option"
                        @mousedown.prevent="mijozTanla(m)" @mouseenter="mijozFaol = i">
                  <span class="ws-drop-n"><b>{{ m.nomi }}</b><small>{{ [m.telefon, m.manzil].filter(Boolean).join(' · ') || '—' }}</small></span>
                  <span class="ws-drop-r">
                    <span v-if="balansQisqa(Number(m.balans))" class="ws-chip" :class="Number(m.balans) < 0 ? 'warn' : 'ok'">{{ balansQisqa(Number(m.balans)) }}</span>
                    <small v-if="m.agent && m.agent_id !== agentId">{{ m.agent.fullname }}</small>
                  </span>
                </button>
                <div v-if="!mijozTopildi.length" class="ws-drop-0">Mijoz topilmadi</div>
              </div>
            </div>
            <div v-else-if="mijoz" class="ws-mijoz">
              <span class="ws-mijoz-ic"><svg viewBox="0 0 24 24" v-html="IKON.dokon"/></span>
              <div class="ws-mijoz-b">
                <b>{{ mijoz.nomi }}</b>
                <small>{{ [mijoz.telefon, mijoz.manzil].filter(Boolean).join(' · ') || 'telefon va manzil kiritilmagan' }}</small>
                <small>
                  Mas'ul: {{ mijoz.agent_nomi || 'biriktirilmagan' }}
                  · Narx: {{ tayyor.narx_ruyxat?.nomi || (mijoz.narx_turi === 'optom' ? 'optom' : 'chakana') }}
                  · To'lov muddati {{ mijoz.tolov_muddati_kun }} kun
                </small>
              </div>
              <div class="ws-mijoz-bal" :class="{ warn: mijoz.qarz > 0.5, ok: mijoz.haqdor > 0.5 }">
                <span>{{ mijoz.qarz > 0.5 ? 'Qarzi' : mijoz.haqdor > 0.5 ? 'Haqdor' : 'Balans' }}</span>
                <b>{{ fmtSum(mijoz.qarz > 0.5 ? mijoz.qarz : mijoz.haqdor) }}</b>
                <small v-if="mijoz.kredit_limit > 0">limit {{ fmtSum(mijoz.kredit_limit) }}</small>
                <small v-else>limitsiz</small>
              </div>
              <button class="ws-btn sm" @click="mijozId = null">O'zgartirish</button>
            </div>
            <div v-else class="ws-empty sm">Yuklanmoqda…</div>
            <div v-if="mijoz?.qarz_bloklangan" class="ws-ogoh bad"><svg viewBox="0 0 24 24" v-html="IKON.ogoh"/><span>{{ mijoz.qarz_bloklangan }} Bu mijozga faqat to'liq naqd sotish mumkin.</span></div>
          </section>

          <!-- ═══ 3. TOVARLAR ═══ -->
          <section class="ws-card">
            <div class="ws-sec">
              <span class="ws-n">3</span>
              <div class="ws-sec-t"><b>{{ sklad ? 'Skladdagi tovar' : 'Agentdagi tovar' }}</b><small>{{ tovarlar.length }} xil · {{ tayyor.ombor }}{{ sklad ? ' · boshqa zakazlarga band qilingani ayirilgan' : '' }}</small></div>
              <label v-if="tovarlar.length > 6" class="ws-q">
                <svg viewBox="0 0 24 24" v-html="IKON.qidir"/>
                <input v-model="tovarQidir" placeholder="Tovar qidirish"/>
              </label>
            </div>
            <div v-if="!tovarlar.length" class="ws-empty">
              <b>{{ sklad ? "Skladda sotiladigan tovar yo'q" : `${agent?.fullname}da tovar yo'q` }}</b>
              <span>{{ sklad ? "Ombor → Prixod bilan kirim qiling (yoki ochiq zakazlar hamma qoldiqni band qilgan)." : 'Avval Van Sell markazida agentga yuk bering, keyin sotish mumkin.' }}</span>
              <RouterLink :to="{ path: '/avtolavka', query: { agent: String(agentId) } }" class="ws-link">Van Sell markazi ›</RouterLink>
            </div>
            <div v-else class="ws-tw">
              <table class="ws-t">
                <thead><tr><th>Tovar</th><th class="r">{{ sklad ? 'Skladda' : 'Agentda' }}</th><th class="r">Narx</th><th class="r">Miqdor</th><th class="r">Summa</th></tr></thead>
                <tbody>
                  <tr v-for="t in korinadi" :key="t.tovar_id" :class="{ on: son(miqdor[t.tovar_id]) > 0, bad: ortiqmi(t) }">
                    <td class="nm"><b>{{ t.tovar_nomi }}</b><small v-if="t.turkum">{{ t.turkum }}</small></td>
                    <td class="r qd"><button class="ws-qd" title="Hammasini qo'yish" @click="hammasi(t)">{{ fmtDona(t.qoldiq) }} <small>{{ t.olchov }}</small></button></td>
                    <td class="r">
                      <NumberInput css-class="ws-in nx" :class="{ bad: son(narx[t.tovar_id]) <= 0 && son(miqdor[t.tovar_id]) > 0, edited: narxQolda[t.tovar_id] }"
                             v-model="narx[t.tovar_id]" :bosh="''" :placeholder="t.narx > 0 ? '' : 'narx'" :aria-label="`${t.tovar_nomi} narxi`" @input="narxOzgardi(t)"/>
                      <small v-if="narxQolda[t.tovar_id] && t.narx > 0" class="ws-asl">asl {{ fmtSum(t.narx) }}</small>
                      <small v-else-if="t.narx_manba === 'yoq'" class="ws-asl bad">narx yo'q</small>
                    </td>
                    <td class="r">
                      <input class="ws-in mq" :class="{ bad: ortiqmi(t) }" v-model="miqdor[t.tovar_id]" inputmode="decimal" placeholder="0" :aria-label="`${t.tovar_nomi} miqdori`"/>
                      <small v-if="ortiqmi(t)" class="ws-asl bad">ko'pi bilan {{ fmtDona(t.qoldiq) }}</small>
                    </td>
                    <td class="r sm">{{ son(miqdor[t.tovar_id]) > 0 ? fmtSum(qatorSumma(t)) : '—' }}</td>
                  </tr>
                  <tr v-if="!korinadi.length"><td colspan="5" class="ws-empty sm">"{{ tovarQidir }}" topilmadi</td></tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <!-- ═══ CHEK ═══ -->
        <aside class="ws-side">
          <section class="ws-card ws-chek">
            <div class="ws-chek-h">
              <svg viewBox="0 0 24 24" v-html="IKON.chek"/>
              <b>Chek</b>
              <span>{{ qatorlar.length }} xil</span>
            </div>
            <div v-if="!qatorlar.length" class="ws-chek-0">{{ sklad ? 'Skladdagi' : 'Agentdagi' }} tovarlardan miqdor kiriting</div>
            <ul v-else class="ws-chek-l">
              <li v-for="q in qatorlar" :key="q.tovar_id" :class="{ bad: q.ortiq || q.narxsiz }">
                <span class="ws-chek-n"><b>{{ q.tovar_nomi }}</b><small>{{ fmtDona(q.dona) }} {{ q.olchov }} × {{ fmtSum(q.narxi) }}</small></span>
                <b class="ws-chek-s">{{ fmtSum(q.summa) }}</b>
                <button class="ws-x" :aria-label="`${q.tovar_nomi} — olib tashlash`" @click="olib(q)"><svg viewBox="0 0 24 24" v-html="IKON.yop"/></button>
              </li>
            </ul>
            <div class="ws-jami"><span>Jami</span><b>{{ fmtSum(jami) }} <small>so'm</small></b></div>

            <div class="ws-tolov">
              <template v-if="plastikKassalar.length">
                <span class="ws-lbl">To'lov usuli</span>
                <div class="ws-seg full">
                  <button :class="{ on: usul === 'naqd' }" @click="usul = 'naqd'">Naqd</button>
                  <button :class="{ on: usul === 'plastik' }" @click="usul = 'plastik'">Plastik (karta)</button>
                </div>
              </template>
              <span class="ws-lbl">To'lov</span>
              <div class="ws-seg full">
                <button :class="{ on: tolov === 'naqd' }" @click="tolov = 'naqd'">{{ plastik ? "To'liq" : 'Naqd' }}</button>
                <button :class="{ on: tolov === 'qisman' }" :disabled="!!mijoz?.qarz_bloklangan" @click="tolov = 'qisman'">Qisman</button>
                <button :class="{ on: tolov === 'qarz' }" :disabled="!!mijoz?.qarz_bloklangan || plastik" :title="plastik ? 'Plastikda to\'liq qarzga sotib bo\'lmaydi' : ''" @click="tolov = 'qarz'">Qarzga</button>
              </div>
              <template v-if="plastik">
                <label class="ws-f">
                  <span>Plastik kassa</span>
                  <select class="ws-in" v-model="plKassa"><option value="">— Kassani tanlang —</option><option v-for="k in plastikKassalar" :key="k.id" :value="k.id">{{ k.nomi }}</option></select>
                </label>
                <div class="ws-f">
                  <span>Chek (rasm yoki PDF) — majburiy</span>
                  <div class="ws-chek">
                    <label class="ws-btn"><input type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" hidden @change="chekTanla"/>{{ chekBand ? 'Yuklanmoqda…' : chek ? 'Almashtirish' : 'Fayl tanlash' }}</label>
                    <button v-if="chek" type="button" class="pl-link" @click="chekKor">{{ chek.nomi }}</button>
                  </div>
                  <small v-if="chekXato" class="fx-xato">{{ chekXato }}</small>
                </div>
                <label class="ws-f">
                  <span>Chek izohi</span>
                  <input class="ws-in" v-model="chekIzoh" maxlength="255" placeholder="Ixtiyoriy"/>
                </label>
              </template>
              <label v-if="tolov === 'qisman'" class="ws-f">
                <span>{{ plastik ? 'Plastik summa' : 'Naqd olindi' }}</span>
                <NumberInput css-class="ws-in" v-model="naqdMatn" :bosh="''" placeholder="0"/>
              </label>
              <label v-if="qarz > 0.5" class="ws-f">
                <span>Qarzni to'lash sanasi</span>
                <input class="ws-in" type="date" v-model="tolovSana" :min="sana"/>
              </label>
            </div>

            <dl class="ws-pul">
              <div v-if="plastik" class="warn"><dt>Plastik · {{ plastikKassalar.find(k => k.id === plKassa)?.nomi || 'kassa' }} — tasdiq kutiladi</dt><dd>{{ fmtSum(naqd) }}</dd></div>
              <div v-else class="ok"><dt>Naqd · {{ agent?.fullname }} kassasiga</dt><dd>{{ fmtSum(naqd) }}</dd></div>
              <div :class="{ warn: qarz > 0.5 }"><dt>Qarzga · mijoz balansiga</dt><dd>{{ fmtSum(qarz) }}</dd></div>
              <div v-if="mijoz && qarz > 0.5"><dt>Mijoz qarzi bo'ladi</dt><dd :class="{ neg: limitOshadi }">{{ yangiBalans < -0.5 ? fmtSum(-yangiBalans) : '0' }}<small v-if="mijoz.kredit_limit > 0"> / {{ fmtSum(mijoz.kredit_limit) }}</small></dd></div>
            </dl>

            <label class="ws-f">
              <span>Izoh <small>(nima uchun webdan kiritildi)</small></span>
              <textarea class="ws-in" v-model="izoh" rows="2" maxlength="500" placeholder="Masalan: telefoni o'chib qoldi"/>
            </label>

            <button class="ws-btn pri full" :disabled="!!muammo" @click="sotishOch">Sotish · {{ fmtSum(jami) }} so'm</button>
            <p v-if="muammo && qatorlar.length" class="ws-muammo">{{ muammo }}</p>
            <p v-if="saqlashXato && !tasdiq" class="ws-muammo">{{ saqlashXato }}</p>
            <p v-if="sklad" class="ws-izoh">Sotuv <b>skladdan, xodimsiz</b> yoziladi: tovar asosiy skladdan chiqadi, naqd to'g'ridan-to'g'ri kassaga tushadi, qarz mijoz balansiga. Bonus hech kimga yozilmaydi.</p>
            <p v-else class="ws-izoh">Sotuv <b>{{ agent?.fullname }}</b> nomidan yoziladi: tovar undagi yukdan chiqadi, naqd uning qo'lida turadi (keyin topshiradi), bonus ham unga.</p>
          </section>
        </aside>
      </div>
      <div v-else-if="agentId && yuklanmoqda" class="ws-card ws-empty">Yuklanmoqda…</div>
    </template>

    <!-- ═══ TASDIQLASH ═══ -->
    <Transition name="ws-fade">
      <div v-if="tasdiq" class="ws-ov" @click.self="!saqlanmoqda && (tasdiq = false)">
        <div class="ws-modal" role="dialog" aria-label="Sotuvni tasdiqlash">
          <div class="ws-modal-h">
            <b>Sotuvni tasdiqlang</b>
            <button class="ws-x" aria-label="Yopish" :disabled="saqlanmoqda" @click="tasdiq = false"><svg viewBox="0 0 24 24" v-html="IKON.yop"/></button>
          </div>
          <dl class="ws-kv">
            <div><dt>{{ sklad ? 'Qayerdan' : 'Xodim' }}</dt><dd>{{ sklad ? 'Sklad · xodimsiz' : agent?.fullname }}</dd></div>
            <div><dt>Mijoz</dt><dd>{{ mijoz?.nomi }}</dd></div>
            <div><dt>Sana</dt><dd>{{ fmtKun(sana) }}{{ sana === bugun() ? ' (bugun)' : '' }}</dd></div>
            <div><dt>Tovar</dt><dd>{{ qatorlar.length }} xil · {{ fmtSum(jami) }} so'm</dd></div>
            <div><dt>Naqd</dt><dd class="pos">{{ fmtSum(naqd) }} so'm</dd></div>
            <div v-if="qarz > 0.5"><dt>Qarzga</dt><dd class="warn">{{ fmtSum(qarz) }} so'm · {{ fmtKun(tolovSana) }} gacha</dd></div>
          </dl>
          <p class="ws-modal-p">{{ sklad ? `Tovar asosiy skladdan chiqadi, naqd kassaga tushadi; sotuv ${fmtKun(sana)} kuniga yoziladi.` : `Tovar ${agent?.fullname}dagi yukdan chiqadi va sotuv uning ${fmtKun(sana)} kuniga yoziladi.` }} Yozilgan sotuv bekor qilinmaydi, xato faqat vozvrat (qaytarish) bilan to'g'rilanadi. Tovar va summani tekshirib oling.</p>
          <p v-if="saqlashXato" class="ws-muammo">{{ saqlashXato }}</p>
          <div class="ws-modal-ft">
            <button class="ws-btn" :disabled="saqlanmoqda" @click="tasdiq = false">Ortga</button>
            <button class="ws-btn pri" :disabled="saqlanmoqda" @click="sot">{{ saqlanmoqda ? 'Saqlanmoqda…' : 'Ha, sotish' }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Ranglar qobiq (MainLayout) tokenlaridan. Yashil — naqd, sariq — qarz, qizil — xato/to'sqinlik. */
.ws { display:flex; flex-direction:column; gap:16px; padding-bottom:40px; color:var(--ink); }
svg { fill:none; stroke:currentColor; stroke-width:1.75; stroke-linecap:round; stroke-linejoin:round; }

.ws-head { display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap; }
.ws-head-l { display:flex; align-items:center; gap:14px; min-width:0; flex:1 1 380px; }
.ws-head-ic { width:44px; height:44px; flex-shrink:0; border-radius:11px; background:var(--brand-600); color:#fff; display:flex; align-items:center; justify-content:center; box-shadow:0 6px 16px -6px rgba(124,58,237,.55); }
.ws-head-ic svg { width:22px; height:22px; }
.ws-h1 { font-size:22px; font-weight:600; letter-spacing:-.02em; margin:0; }
.ws-sub { font-size:13px; color:var(--mut); margin:4px 0 0; max-width:760px; }

.ws-btn { height:34px; display:inline-flex; align-items:center; justify-content:center; gap:6px; padding:0 14px; border:1px solid var(--line); border-radius:9px; background:var(--surface); color:var(--ink2); font:inherit; font-size:13px; font-weight:600; cursor:pointer; text-decoration:none; white-space:nowrap; }
.ws-btn:hover:not(:disabled) { border-color:var(--brand-300); color:var(--ink); }
.ws-btn.pri { background:var(--brand-600); border-color:var(--brand-600); color:#fff; }
.ws-btn.pri:hover:not(:disabled) { background:var(--brand-700); border-color:var(--brand-700); color:#fff; }
.ws-btn:disabled { opacity:.5; cursor:not-allowed; }
.ws-btn.sm { height:30px; padding:0 11px; font-size:12.5px; }
.ws-btn.full { width:100%; height:42px; font-size:14px; }
.ws-link { border:0; background:none; padding:0; color:var(--acc); font:inherit; font-weight:600; cursor:pointer; text-decoration:none; }

.ws-card { background:var(--surface); border:1px solid var(--line); border-radius:12px; }
.ws-sec { display:flex; align-items:center; gap:12px; padding:14px 16px; flex-wrap:wrap; }
.ws-n { width:26px; height:26px; flex-shrink:0; border-radius:50%; background:var(--acc-soft); color:var(--acc); font-size:12.5px; font-weight:700; display:flex; align-items:center; justify-content:center; }
.ws-sec-t { display:flex; flex-direction:column; gap:1px; flex:1; min-width:180px; }
.ws-sec-t b { font-size:14.5px; font-weight:600; }
.ws-sec-t small { font-size:12px; color:var(--mut); }

.ws-seg { display:inline-flex; background:var(--seg-track); box-shadow:inset 0 0 0 1px var(--seg-brd); border-radius:10px; padding:3px; gap:2px; }
.ws-seg button { height:30px; padding:0 12px; border:0; border-radius:8px; background:transparent; color:var(--seg-ink); font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; white-space:nowrap; transition:color .15s, background-color .15s; }
.ws-seg button:hover:not(:disabled) { color:var(--seg-ink-h); }
.ws-seg button.on { background:var(--seg-on-bg); color:var(--seg-on-ink); box-shadow:var(--seg-on-sh); }
.ws-seg button:disabled { opacity:.45; cursor:not-allowed; }
.ws-seg.full { display:flex; }
.ws-seg.full button { flex:1; height:34px; }
.ws-sana { display:flex; align-items:center; gap:8px; }
.ws-sana input { height:36px; padding:0 8px; border:1px solid var(--line); border-radius:9px; background:var(--surface); color:var(--ink); font:inherit; font-size:12.5px; }
.shell.dark .ws-sana input, .shell.dark .ws-in[type="date"] { color-scheme:dark; }

/* Xodimlar */
.ws-agents { display:grid; grid-template-columns:repeat(auto-fill, minmax(270px, 1fr)); gap:8px; padding:0 16px 14px; }
.ws-ag { display:flex; align-items:center; gap:10px; padding:10px 12px; border:1px solid var(--line); border-radius:10px; background:var(--surface); color:var(--ink); font:inherit; text-align:left; cursor:pointer; min-width:0; }
.ws-ag:hover { border-color:var(--brand-300); }
.ws-ag.on { border-color:var(--acc); background:var(--acc-soft); box-shadow:0 0 0 1px var(--acc) inset; }
.ws-av { width:36px; height:36px; flex-shrink:0; border-radius:50%; background:var(--brand-100); color:var(--brand-700); font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
.ws-ag.on .ws-av { background:var(--brand-600); color:#fff; }
.shell.dark .ws-av { background:color-mix(in srgb, var(--brand-400) 22%, transparent); color:var(--brand-200); }
.ws-ag-b { display:flex; flex-direction:column; gap:2px; min-width:0; }
.ws-ag-b b { font-size:13.5px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ws-ag-b small { font-size:11.5px; color:var(--mut); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

.ws-kun { display:flex; align-items:center; gap:10px; flex-wrap:wrap; padding:10px 16px; border-top:1px solid var(--line); font-size:12.5px; color:var(--ink2); }
.ws-mut { color:var(--sub); }
.ws-pill { padding:2px 9px; border-radius:20px; font-size:11.5px; font-weight:600; background:var(--hov); color:var(--mut); }
.ws-pill.ochiq { background:var(--acc-soft); color:var(--acc); }
.ws-pill.topshirilmoqda { background:color-mix(in srgb, #d97706 13%, transparent); color:#b45309; }
.ws-pill.yopiq { background:color-mix(in srgb, #059669 12%, transparent); color:#047857; }
.ws-pill.kamomad { background:color-mix(in srgb, #dc2626 11%, transparent); color:#b91c1c; }
.ws-ogoh { display:flex; gap:10px; align-items:flex-start; margin:0 16px 14px; padding:10px 12px; border-radius:9px; background:color-mix(in srgb, #d97706 10%, transparent); color:#92400e; font-size:12.5px; line-height:1.45; }
.ws-ogoh svg { width:17px; height:17px; flex-shrink:0; margin-top:1px; }
.ws-ogoh.bad { background:color-mix(in srgb, #dc2626 9%, transparent); color:#991b1b; }
.shell.dark .ws-ogoh { color:#fcd34d; }
.shell.dark .ws-ogoh.bad { color:#fca5a5; }

.ws-empty { display:flex; flex-direction:column; align-items:center; gap:6px; padding:36px 16px; text-align:center; color:var(--mut); font-size:13px; }
.ws-empty b { color:var(--ink); font-size:14px; font-weight:600; }
.ws-empty.sm { padding:18px 16px; }
.ws-empty.err { color:#dc2626; flex-direction:row; justify-content:center; }

/* Ikki ustun */
.ws-grid { display:grid; grid-template-columns:minmax(0, 1fr) 360px; gap:16px; align-items:start; }
.ws-main { display:flex; flex-direction:column; gap:16px; min-width:0; }
.ws-side { position:sticky; top:16px; }

/* Mijoz */
.ws-mq { position:relative; padding:0 16px 14px; }
.ws-q { display:flex; align-items:center; gap:6px; height:32px; padding:0 10px; border:1px solid var(--line); border-radius:8px; background:var(--surface); color:var(--sub); }
.ws-q.big { height:40px; border-radius:9px; }
.ws-q:focus-within { border-color:var(--acc); box-shadow:0 0 0 3px var(--acc-soft); }
.ws-q svg { width:15px; height:15px; flex-shrink:0; }
.ws-q input { flex:1; min-width:0; width:180px; border:0; outline:none; background:none; color:var(--ink); font:inherit; font-size:13px; }
.ws-drop { position:absolute; left:16px; right:16px; top:44px; z-index:20; max-height:340px; overflow:auto; background:var(--surface); border:1px solid var(--line); border-radius:10px; box-shadow:0 14px 34px -12px rgba(15,23,42,.28); padding:4px; }
.ws-drop-i { width:100%; display:flex; justify-content:space-between; align-items:center; gap:12px; padding:8px 10px; border:0; border-radius:7px; background:none; color:var(--ink); font:inherit; text-align:left; cursor:pointer; }
.ws-drop-i.on { background:var(--hov); }
.ws-drop-n { display:flex; flex-direction:column; gap:1px; min-width:0; }
.ws-drop-n b { font-size:13px; font-weight:600; }
.ws-drop-n small, .ws-drop-r small { font-size:11.5px; color:var(--sub); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ws-drop-r { display:flex; flex-direction:column; align-items:flex-end; gap:2px; flex-shrink:0; }
.ws-drop-0 { padding:14px; text-align:center; color:var(--mut); font-size:12.5px; }
.ws-chip { padding:1px 7px; border-radius:6px; font-size:11px; font-weight:600; white-space:nowrap; }
.ws-chip.warn { background:color-mix(in srgb, #d97706 12%, transparent); color:#b45309; }
.ws-chip.ok { background:color-mix(in srgb, #059669 11%, transparent); color:#047857; }

.ws-mijoz { display:flex; align-items:center; gap:12px; padding:0 16px 14px; flex-wrap:wrap; }
.ws-mijoz-ic { width:40px; height:40px; flex-shrink:0; border-radius:10px; background:var(--acc-soft); color:var(--acc); display:flex; align-items:center; justify-content:center; }
.ws-mijoz-ic svg { width:20px; height:20px; }
.ws-mijoz-b { display:flex; flex-direction:column; gap:2px; flex:1; min-width:200px; }
.ws-mijoz-b b { font-size:15px; font-weight:600; }
.ws-mijoz-b small { font-size:12px; color:var(--mut); }
.ws-mijoz-bal { display:flex; flex-direction:column; align-items:flex-end; gap:1px; padding:6px 12px; border-radius:9px; background:var(--hov); }
.ws-mijoz-bal span { font-size:11.5px; color:var(--mut); }
.ws-mijoz-bal b { font-size:16px; font-weight:600; font-variant-numeric:tabular-nums; }
.ws-mijoz-bal small { font-size:11px; color:var(--sub); }
.ws-mijoz-bal.warn { background:color-mix(in srgb, #d97706 10%, transparent); }
.ws-mijoz-bal.warn b { color:#b45309; }
.ws-mijoz-bal.ok { background:color-mix(in srgb, #059669 9%, transparent); }
.ws-mijoz-bal.ok b { color:#047857; }

/* Tovarlar */
.ws-tw { overflow-x:auto; border-top:1px solid var(--line); }
.ws-t { width:100%; border-collapse:collapse; font-size:13px; }
.ws-t th { padding:9px 12px; text-align:left; font-size:11.5px; font-weight:600; color:var(--sub); text-transform:uppercase; letter-spacing:.03em; border-bottom:1px solid var(--line); white-space:nowrap; }
.ws-t td { padding:8px 12px; border-bottom:1px solid var(--line); vertical-align:middle; }
.ws-t tbody tr:last-child td { border-bottom:0; }
.ws-t tbody tr.on { background:var(--acc-soft); }
.ws-t tbody tr.bad { background:color-mix(in srgb, #dc2626 7%, transparent); }
.ws-t .r { text-align:right; }
.ws-t .nm { min-width:180px; }
.ws-t .nm b { font-weight:600; }
.ws-t td small { display:block; font-size:11.5px; color:var(--sub); margin-top:2px; }
.ws-t .sm { font-weight:600; font-variant-numeric:tabular-nums; white-space:nowrap; min-width:90px; }
.ws-qd { border:0; background:none; padding:2px 4px; border-radius:5px; color:var(--ink2); font:inherit; font-variant-numeric:tabular-nums; cursor:pointer; white-space:nowrap; }
.ws-qd:hover { background:var(--hov); color:var(--acc); }
.ws-qd small { display:inline !important; color:var(--sub); }
.ws-in { height:34px; padding:0 9px; border:1px solid var(--line); border-radius:8px; background:var(--surface); color:var(--ink); font:inherit; font-size:13px; font-variant-numeric:tabular-nums; outline:none; }
.ws-in:focus { border-color:var(--acc); box-shadow:0 0 0 3px var(--acc-soft); }
.ws-in.bad { border-color:#dc2626; }
.ws-in.edited { border-color:var(--brand-400); }
.ws-in.nx { width:100px; text-align:right; }
.ws-in.mq { width:84px; text-align:right; font-weight:600; }
textarea.ws-in { height:auto; padding:8px 9px; resize:vertical; width:100%; }
.ws-asl { font-size:11px !important; }
.ws-asl.bad { color:#dc2626 !important; }

/* Chek */
.ws-chek { padding:14px 16px 16px; display:flex; flex-direction:column; gap:12px; }
.ws-chek-h { display:flex; align-items:center; gap:8px; }
.ws-chek-h svg { width:18px; height:18px; color:var(--acc); }
.ws-chek-h b { font-size:14.5px; font-weight:600; flex:1; }
.ws-chek-h span { font-size:12px; color:var(--mut); }
.ws-chek-0 { padding:18px 8px; text-align:center; color:var(--mut); font-size:12.5px; border:1px dashed var(--line); border-radius:9px; }
.ws-chek-l { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; max-height:300px; overflow:auto; }
.ws-chek-l li { display:flex; align-items:center; gap:8px; padding:7px 0; border-bottom:1px solid var(--line); }
.ws-chek-l li.bad .ws-chek-n b { color:#dc2626; }
.ws-chek-n { display:flex; flex-direction:column; gap:1px; flex:1; min-width:0; }
.ws-chek-n b { font-size:12.5px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ws-chek-n small { font-size:11.5px; color:var(--sub); font-variant-numeric:tabular-nums; }
.ws-chek-s { font-size:13px; font-weight:600; font-variant-numeric:tabular-nums; white-space:nowrap; }
.ws-x { width:26px; height:26px; flex-shrink:0; border:0; border-radius:6px; background:none; color:var(--sub); display:flex; align-items:center; justify-content:center; cursor:pointer; }
.ws-x:hover:not(:disabled) { background:var(--hov); color:var(--ink); }
.ws-x svg { width:15px; height:15px; }
.ws-jami { display:flex; justify-content:space-between; align-items:baseline; }
.ws-jami span { font-size:13px; color:var(--mut); }
.ws-jami b { font-size:24px; font-weight:600; letter-spacing:-.02em; font-variant-numeric:tabular-nums; }
.ws-jami small { font-size:12.5px; font-weight:500; color:var(--mut); }
.ws-tolov { display:flex; flex-direction:column; gap:10px; }
.ws-chek { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
.ws-lbl { font-size:12px; font-weight:600; color:var(--mut); }
.ws-f { display:flex; flex-direction:column; gap:5px; }
.ws-f > span { font-size:12px; font-weight:600; color:var(--mut); }
.ws-f > span small { font-weight:500; color:var(--sub); }
.ws-f .ws-in { width:100%; }
.ws-pul { margin:0; display:flex; flex-direction:column; gap:6px; padding:10px 12px; border-radius:9px; background:var(--hov); }
.ws-pul div { display:flex; justify-content:space-between; gap:10px; font-size:12.5px; }
.ws-pul dt { color:var(--mut); }
.ws-pul dd { margin:0; font-weight:600; font-variant-numeric:tabular-nums; white-space:nowrap; }
.ws-pul dd small { font-weight:500; color:var(--sub); }
.ws-pul .ok dd { color:#047857; }
.ws-pul .warn dd { color:#b45309; }
.ws-pul dd.neg { color:#dc2626; }
.shell.dark .ws-pul .ok dd { color:#34d399; }
.shell.dark .ws-pul .warn dd { color:#fbbf24; }
.ws-muammo { margin:-4px 0 0; font-size:12.5px; color:#dc2626; text-align:center; }
.ws-izoh { margin:0; font-size:11.5px; color:var(--sub); line-height:1.45; }

/* Natija */
.ws-done { display:flex; flex-direction:column; align-items:center; gap:10px; padding:32px 20px; text-align:center; }
.ws-done-ic { width:52px; height:52px; border-radius:50%; background:color-mix(in srgb, #059669 12%, transparent); color:#059669; display:flex; align-items:center; justify-content:center; }
.ws-done-ic svg { width:28px; height:28px; }
.ws-done h2 { margin:4px 0 0; font-size:19px; font-weight:600; }
.ws-done p { margin:0; font-size:13px; color:var(--mut); }
.ws-done-pul { display:flex; gap:10px; flex-wrap:wrap; justify-content:center; margin-top:6px; }
.ws-done-pul div { display:flex; flex-direction:column; gap:2px; min-width:150px; padding:10px 14px; border-radius:10px; background:var(--hov); }
.ws-done-pul span { font-size:11.5px; color:var(--mut); }
.ws-done-pul b { font-size:18px; font-weight:600; font-variant-numeric:tabular-nums; }
.ws-done-pul small { font-size:11px; color:var(--sub); }
.ws-done-pul .ok b { color:#047857; }
.ws-done-pul .warn b { color:#b45309; }
.ws-done-t { width:min(520px, 100%); border-collapse:collapse; font-size:12.5px; margin-top:4px; }
.ws-done-t td { padding:6px 4px; border-bottom:1px solid var(--line); text-align:left; }
.ws-done-t .r { text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; }
.ws-done-bal b.neg { color:#b45309; }
.ws-done-bal b.pos { color:#047857; }
.ws-done-ft { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; margin-top:8px; }

/* Tasdiqlash oynasi (sahifa ichida — qobiq ranglari ishlashi uchun) */
.ws-ov { position:fixed; inset:0; z-index:60; background:rgba(15,23,42,.42); display:flex; align-items:center; justify-content:center; padding:16px; }
.ws-modal { width:min(440px, 100%); background:var(--surface); color:var(--ink); border:1px solid var(--line); border-radius:14px; box-shadow:0 24px 60px -20px rgba(15,23,42,.45); padding:18px; display:flex; flex-direction:column; gap:12px; }
.ws-modal-h { display:flex; justify-content:space-between; align-items:center; }
.ws-modal-h b { font-size:16px; font-weight:600; }
.ws-kv { margin:0; display:flex; flex-direction:column; gap:7px; }
.ws-kv div { display:flex; justify-content:space-between; gap:12px; font-size:13px; }
.ws-kv dt { color:var(--mut); }
.ws-kv dd { margin:0; font-weight:600; text-align:right; }
.ws-kv dd.pos { color:#047857; }
.ws-kv dd.warn { color:#b45309; }
.ws-modal-p { margin:0; font-size:12.5px; color:var(--mut); line-height:1.45; }
.ws-modal-ft { display:flex; justify-content:flex-end; gap:8px; }
.ws-fade-enter-active, .ws-fade-leave-active { transition:opacity .15s; }
.ws-fade-enter-from, .ws-fade-leave-to { opacity:0; }

@media (max-width:1100px) {
  .ws-grid { grid-template-columns:1fr; }
  .ws-side { position:static; }
}
@media (max-width:560px) {
  .ws-sana { width:100%; }
  .ws-sana input { flex:1; }
  .ws-mijoz-bal { align-items:flex-start; }
  .ws-in.nx { width:84px; }
  .ws-in.mq { width:70px; }
}

/* Skladdan — xodimsiz plitkasi */
.ws-ag--sklad { border-style:dashed; }
.ws-ag--sklad.on { border-style:solid; }
.ws-av--sklad svg { width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:1.75; stroke-linecap:round; stroke-linejoin:round; }
</style>
