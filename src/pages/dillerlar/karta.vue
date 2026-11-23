<script setup>
/* DILLER KARTASI (backend §24): qarz, ombori, hujjatlar va uch amal — tovar berish, to'lov qabul qilish, qaytarish.
   Hujjatlar tahrirlanmaydi va bekor qilinmaydi — xato teskari hujjat bilan tuzatiladi (masalan, berish xato bo'lsa — qaytarish).
   Dillerning o'z sotuvlari va mijozlari faqat ko'rish uchun: ular kompaniya hisobotlariga kirmaydi.
   Ruxsat: tovar berish/qaytarish — avtolavka:create yoki ombor:edit; to'lov — moliya:create yoki moliya:approve. */
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { dillerApi, avtolavkaApi, xarajatApi, api } from '@/api/api'
import { authStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { useSorovId } from '@/validation/useForma'
import NumberInput from '@/components/NumberInput.vue'
import BuyumKorish from '@/components/BuyumKorish.vue'

const route = useRoute(), toast = useToast()
const id = computed(() => Number(route.params.id))
const tovarYozadi = computed(() => authStore.hasPerm('avtolavka', 'create') || authStore.hasPerm('ombor', 'edit'))
const pulYozadi = computed(() => authStore.hasPerm('moliya', 'create') || authStore.hasPerm('moliya', 'approve'))

const fmt = (v) => Math.round(Number(v) || 0).toLocaleString('ru-RU').replace(/,/g, ' ')
const miq = (v) => String(Math.round((Number(v) || 0) * 1000) / 1000).replace('.', ',')
const son = (v) => { const n = Number(String(v ?? '').replace(/\s/g, '').replace(',', '.')); return Number.isFinite(n) ? Math.round(n * 1000) / 1000 : 0 }
const vaqt = (s) => { if (!s) return '—'; const d = new Date(s); return isNaN(+d) ? String(s) : d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) }
const xatoMatn = (e) => (e?.message === 'session_expired' ? '' : e?.status === 403 ? "Ruxsat yo'q" : e?.message || 'Xatolik')
const TUR = { berish: ['Tovar berildi', 'pl-bg--pl'], tolov: ["To'lov", 'pl-bg--ok'], qaytarish: ['Qaytarish', 'pl-bg--kut'] }

const d = ref(null), yuklanmoqda = ref(false), xato = ref(''), band = ref(false)
const tab = ref('hujjatlar')
const hujjatlar = ref([]), hujjatJami = ref(0), hPage = ref(1), hTur = ref('')
const sotuvlar = ref(null), mijozlar = ref(null)
const omborSumma = computed(() => (d.value?.ombor || []).reduce((s, x) => s + x.dona * x.narx, 0))
const H_LIMIT = 50

async function yukla() {
  yuklanmoqda.value = true; xato.value = ''
  try { d.value = await dillerApi.karta(id.value); await hujjatYukla() }
  catch (e) { xato.value = e?.status === 404 ? 'Diller topilmadi' : xatoMatn(e) } finally { yuklanmoqda.value = false }
}
async function hujjatYukla() {
  const r = await dillerApi.hujjatlar(id.value, { page: hPage.value, limit: H_LIMIT, ...(hTur.value ? { tur: hTur.value } : {}) })
  hujjatlar.value = r?.data || []; hujjatJami.value = r?.jami?.soni || 0
}
watch(tab, async (t) => {
  try {
    if (t === 'sotuvlar' && !sotuvlar.value) sotuvlar.value = await dillerApi.sotuvlar(id.value, { limit: 100 })
    if (t === 'mijozlar' && !mijozlar.value) mijozlar.value = await dillerApi.mijozlar(id.value)
  } catch (e) { xato.value = xatoMatn(e) }
})

/* ── Hujjat tafsiloti ── */
const t = reactive({ ochiq: false, h: null })
async function hujjatOch(h) { t.h = h; t.ochiq = true; try { const x = await dillerApi.hujjat(h.id); if (t.h?.id === h.id) t.h = x } catch (e) { toast.error('Hujjat ochilmadi', xatoMatn(e)) } }

/* ── Umumiy: kassalar, so'rov kaliti ── */
const kassalar = ref([])
const sorov = useSorovId()
async function kassalarYukla() { try { kassalar.value = (await xarajatApi.kassalar())?.rows || [] } catch { kassalar.value = [] } }
function natija(h, matn) { toast.success(`${h.raqam} — ${matn}`, d.value?.diller?.fullname || ''); sotuvlar.value = null; hPage.value = 1; yukla() }
// Backend xabarida tovar nomi bo'ladi — xabar o'sha qator ustida ko'rsatiladi
function xatoQoy(e, m) { const x = xatoMatn(e); const r = x && m.qatorlar?.find(q => x.includes(`"${q.nomi}"`)); if (r) r.xato = x; else m.xato = x }

/* ── 1. Tovar berish ── */
const asosiy = ref([])                 // asosiy ombordagi tovarlar: qoldiq, band
const dillerNarx = ref(new Map())      // tovar_id → diller narxi (tovar kartasidan)
const bm = reactive({ ochiq: false, qatorlar: [], tolov: 'qarz', tolangan: null, kassa_id: '', izoh: '', xato: '', qosh: '', yuklanmoqda: false })
const mavjud = (tv) => Math.max(0, Math.round(((Number(tv.qoldiq) || 0) - (Number(tv.band) || 0)) * 1000) / 1000)
const asosiyBy = computed(() => new Map(asosiy.value.map(x => [x.id, x])))
const bQoshiladigan = computed(() => asosiy.value.filter(x => mavjud(x) > 0 && !bm.qatorlar.some(r => r.tovar_id === x.id)))
const bJami = computed(() => Math.round(bm.qatorlar.reduce((s, r) => s + son(r.dona) * (Number(r.narx) || 0), 0)))
const bTolangan = computed(() => (bm.tolov === 'toliq' ? bJami.value : bm.tolov === 'qarz' ? 0 : Math.round(Number(bm.tolangan) || 0)))
const bQatorXato = (r) => {
  const dn = son(r.dona), bor = mavjud(asosiyBy.value.get(r.tovar_id) || {})
  return dn <= 0 ? 'Miqdorni kiriting' : dn > bor + 0.0005 ? `Omborda ${miq(bor)}` : !(Number(r.narx) > 0) ? 'Narxni kiriting' : ''
}
const bMuammo = computed(() => {
  if (!bm.qatorlar.length) return "Kamida bitta tovar qo'shing"
  const x = bm.qatorlar.find(r => bQatorXato(r)); if (x) return `"${x.nomi}": ${bQatorXato(x)}`
  if (bm.tolov === 'qisman' && !(bTolangan.value > 0 && bTolangan.value < bJami.value)) return `Qisman to'lov 0 dan katta va ${fmt(bJami.value)} dan kichik bo'lsin`
  if (bTolangan.value > 0 && !bm.kassa_id) return "To'lov tushadigan kassani tanlang"
  if (bm.izoh.length > 500) return 'Izoh 500 belgidan oshmasin'
  return ''
})
async function berishOch() {
  sorov.yangila()
  Object.assign(bm, { ochiq: true, qatorlar: [], tolov: 'qarz', tolangan: null, kassa_id: '', izoh: '', xato: '', qosh: '', yuklanmoqda: true })
  try {
    const [tv, narx] = await Promise.all([avtolavkaApi.tovarlar(), api.get('/tovar?limit=1000').catch(() => null), kassalarYukla()])
    asosiy.value = Array.isArray(tv) ? tv : tv?.data || tv?.rows || []
    dillerNarx.value = new Map((narx?.data || []).map(x => [x.id, Number(x.diller_narx) || 0]))
  } catch (e) { bm.xato = xatoMatn(e) } finally { bm.yuklanmoqda = false }
}
function bTovarQosh() {
  const tv = asosiyBy.value.get(Number(bm.qosh)); bm.qosh = ''
  if (!tv || bm.qatorlar.some(r => r.tovar_id === tv.id)) return
  bm.qatorlar.push({ tovar_id: tv.id, nomi: tv.nomi, olchov: tv.olchov_birligi || '', dona: '', narx: dillerNarx.value.get(tv.id) || null, asl: dillerNarx.value.get(tv.id) || 0, xato: '' })
}
async function berishSaqla() {
  if (band.value || bMuammo.value) return
  band.value = true; bm.xato = ''; bm.qatorlar.forEach(r => { r.xato = '' })
  try {
    const h = await dillerApi.berish(id.value, {
      qatorlar: bm.qatorlar.map(r => ({ tovar_id: r.tovar_id, dona: son(r.dona), narx: Number(r.narx) })),
      tolangan: bTolangan.value, ...(bTolangan.value > 0 ? { kassa_id: Number(bm.kassa_id) } : {}), ...(bm.izoh.trim() ? { izoh: bm.izoh.trim() } : {}), sorov_id: sorov.id.value,
    })
    bm.ochiq = false; sorov.yangila()
    natija(h, `${fmt(h.jami)} so'm, to'landi ${fmt(h.tolangan)}, qarzga ${fmt(h.jami - h.tolangan)}`)
  } catch (e) { xatoQoy(e, bm) } finally { band.value = false }
}

/* ── 2. To'lov qabul qilish ── */
const tm = reactive({ ochiq: false, summa: null, kassa_id: '', izoh: '', xato: '' })
const tMuammo = computed(() => {
  const s = Number(tm.summa) || 0
  if (!(s > 0)) return 'Summani kiriting'
  if (s > (d.value?.qarz || 0) + 0.005) return `Summa qarzdan (${fmt(d.value?.qarz)}) oshmasin`
  if (!tm.kassa_id) return 'Kassani tanlang'
  return ''
})
function tolovOch() { sorov.yangila(); Object.assign(tm, { ochiq: true, summa: null, kassa_id: '', izoh: '', xato: '' }); kassalarYukla() }
async function tolovSaqla() {
  if (band.value || tMuammo.value) return
  band.value = true; tm.xato = ''
  try {
    const h = await dillerApi.tolov(id.value, { summa: Number(tm.summa), kassa_id: Number(tm.kassa_id), ...(tm.izoh.trim() ? { izoh: tm.izoh.trim() } : {}), sorov_id: sorov.id.value })
    tm.ochiq = false; sorov.yangila()
    natija(h, `to'lov ${fmt(h.jami)} so'm qabul qilindi`)
  } catch (e) { tm.xato = xatoMatn(e); if (e?.status === 400) yukla() } finally { band.value = false }
}

/* ── 3. Qaytarish (dillerdan kompaniyaga) ── */
const qm = reactive({ ochiq: false, qatorlar: [], izoh: '', xato: '', qosh: '' })
// Manba: dillerning sotiladigan ombori va brak ombori (brak qatorlar kompaniya brak omboriga tushadi)
const qManba = computed(() => [
  ...(d.value?.ombor || []).map(x => ({ kalit: `o${x.tovar_id}`, tovar_id: x.tovar_id, nomi: x.nomi, bor: x.dona, narx: x.narx, brak: false })),
  ...(d.value?.brak_ombor || []).map(x => ({ kalit: `b${x.tovar_id}`, tovar_id: x.tovar_id, nomi: x.nomi, bor: x.dona, narx: x.narx, brak: true })),
])
const qQoshiladigan = computed(() => qManba.value.filter(x => !qm.qatorlar.some(r => r.kalit === x.kalit)))
const qJami = computed(() => Math.round(qm.qatorlar.reduce((s, r) => s + son(r.dona) * (Number(r.narx) || 0), 0)))
const qQatorXato = (r) => { const dn = son(r.dona); return dn <= 0 ? 'Miqdorni kiriting' : dn > r.bor + 0.0005 ? `Dillerda ${miq(r.bor)}` : '' }
const qMuammo = computed(() => {
  if (!qm.qatorlar.length) return "Kamida bitta tovar qo'shing"
  const x = qm.qatorlar.find(r => qQatorXato(r)); if (x) return `"${x.nomi}": ${qQatorXato(x)}`
  if (qJami.value > (d.value?.qarz || 0) + 0.5) return `Qaytarish summasi (${fmt(qJami.value)}) diller qarzidan (${fmt(d.value?.qarz)}) oshmasin`
  if (qm.izoh.length > 500) return 'Izoh 500 belgidan oshmasin'
  return ''
})
function qaytarishOch() { sorov.yangila(); Object.assign(qm, { ochiq: true, qatorlar: [], izoh: '', xato: '', qosh: '' }) }
function qTovarQosh() { const x = qManba.value.find(y => y.kalit === qm.qosh); qm.qosh = ''; if (x && !qm.qatorlar.some(r => r.kalit === x.kalit)) qm.qatorlar.push({ ...x, dona: '', xato: '' }) }
async function qaytarishSaqla() {
  if (band.value || qMuammo.value) return
  band.value = true; qm.xato = ''; qm.qatorlar.forEach(r => { r.xato = '' })
  try {
    const h = await dillerApi.qaytarish(id.value, { qatorlar: qm.qatorlar.map(r => ({ tovar_id: r.tovar_id, dona: son(r.dona), ...(r.brak ? { brak: true } : {}) })), ...(qm.izoh.trim() ? { izoh: qm.izoh.trim() } : {}), sorov_id: sorov.id.value })
    qm.ochiq = false; sorov.yangila()
    natija(h, `qaytarildi, qarz ${fmt(h.jami)} so'mga kamaydi`)
  } catch (e) { xatoQoy(e, qm); if (e?.status === 400) yukla() } finally { band.value = false }
}

watch(id, () => { d.value = null; sotuvlar.value = null; mijozlar.value = null; tab.value = 'hujjatlar'; hPage.value = 1; yukla() })
onMounted(yukla)
</script>

<template>
  <div class="pl">
    <div class="pl-hd">
      <div>
        <h1><RouterLink to="/dillerlar" class="dk-orqa" title="Dillerlar ro'yxati">‹</RouterLink> {{ d?.diller?.fullname || 'Diller' }} <span v-if="d && !d.diller.faol" class="pl-bg" style="vertical-align:middle">Faolsiz</span></h1>
        <p v-if="d">{{ d.diller.territoriya?.nomi || 'Viloyat belgilanmagan' }}<template v-if="d.diller.telefon"> · {{ d.diller.telefon }}</template><template v-if="d.diller.izoh"> · {{ d.diller.izoh }}</template></p>
      </div>
      <div v-if="d" class="pl-hd-r">
        <button v-if="tovarYozadi" class="pl-btn pl-btn--p" @click="berishOch">Tovar berish</button>
        <button v-if="pulYozadi" class="pl-btn pl-btn--ok" :disabled="!(d.qarz > 0)" :title="d.qarz > 0 ? '' : 'Dillerning qarzi yo\'q'" @click="tolovOch">To'lov qabul qilish</button>
        <button v-if="tovarYozadi" class="pl-btn" :disabled="!qManba.length" :title="qManba.length ? '' : 'Diller omborida tovar yo\'q'" @click="qaytarishOch">Qaytarish</button>
      </div>
    </div>
    <p v-if="xato" class="pl-err">{{ xato }}</p>
    <div v-if="yuklanmoqda && !d" class="pl-bosh">Yuklanmoqda…</div>

    <template v-if="d">
      <div class="pl-kpi">
        <div class="pl-k dk-qarz" :class="{ 'pl-k--warn': d.qarz > 0 }"><small>Kompaniyaga qarzi</small><b>{{ fmt(d.qarz) }}</b><em>so'm{{ d.qarz > 0 ? '' : " · qarzi yo'q" }}</em></div>
        <div class="pl-k"><small>Omboridagi tovar</small><b>{{ fmt(omborSumma) }}</b><em>so'm · {{ d.ombor.length }} xil, olgan narxida</em></div>
        <div v-if="d.brak_ombor?.length" class="pl-k"><small>Brak omborida</small><b>{{ d.brak_ombor.length }}</b><em>xil tovar · sotilmaydi</em></div>
      </div>

      <div class="pl-tabs">
        <button v-for="x in [['hujjatlar', 'Hujjatlar'], ['ombor', 'Ombori'], ['brak', 'Brak ombori'], ['sotuvlar', 'Sotuvlari'], ['mijozlar', 'Mijozlari'], ['buyumlar', 'Buyumlar']]" :key="x[0]" class="pl-tab" :class="{ on: tab === x[0] }" @click="tab = x[0]">{{ x[1] }}</button>
      </div>

      <!-- Hujjatlar -->
      <template v-if="tab === 'hujjatlar'">
        <div class="pl-fil"><div class="pl-seg"><button v-for="x in [['', 'Hammasi'], ['berish', 'Berish'], ['tolov', 'To\'lov'], ['qaytarish', 'Qaytarish']]" :key="x[0]" :class="{ on: hTur === x[0] }" @click="hTur = x[0]; hPage = 1; hujjatYukla()">{{ x[1] }}</button></div></div>
        <div class="pl-card">
          <table class="pl-tbl">
            <thead><tr><th>Raqam</th><th>Sana</th><th>Tur</th><th class="r">Summa</th><th class="r">To'landi</th><th>Kassa</th><th>Izoh</th><th>Operator</th></tr></thead>
            <tbody>
              <tr v-for="h in hujjatlar" :key="h.id" class="bos" @click="hujjatOch(h)">
                <td><b>{{ h.raqam }}</b></td><td>{{ vaqt(h.sana) }}</td>
                <td><span class="pl-bg" :class="TUR[h.tur]?.[1]">{{ TUR[h.tur]?.[0] || h.tur }}</span></td>
                <td class="r m">{{ fmt(h.jami) }}</td>
                <td class="r">{{ h.tur === 'qaytarish' ? '—' : fmt(h.tolangan) }}</td>
                <td>{{ h.kassa_nomi || '—' }}</td><td style="max-width:200px">{{ h.izoh || '—' }}</td><td>{{ h.user_nomi || '—' }}</td>
              </tr>
            </tbody>
            <tfoot v-if="hujjatlar.length"><tr><td colspan="8">Jami: {{ hujjatJami }} ta hujjat</td></tr></tfoot>
          </table>
          <div v-if="!hujjatlar.length" class="pl-bosh"><b>Hujjat yo'q</b>{{ tovarYozadi ? '"Tovar berish" tugmasi bilan dillerga birinchi tovarni bering.' : '' }}</div>
        </div>
        <div v-if="hujjatJami > H_LIMIT" class="pl-sah">
          <button class="pl-btn sm" :disabled="hPage <= 1" @click="hPage--; hujjatYukla()">‹ Oldingi</button><span>{{ hPage }} / {{ Math.ceil(hujjatJami / H_LIMIT) }}</span><button class="pl-btn sm" :disabled="hPage * H_LIMIT >= hujjatJami" @click="hPage++; hujjatYukla()">Keyingi ›</button>
        </div>
      </template>

      <!-- Ombori / Brak ombori -->
      <div v-if="tab === 'ombor' || tab === 'brak'" class="pl-card">
        <table class="pl-tbl">
          <thead><tr><th>Tovar</th><th class="r">Dona</th><th class="r">Olgan narxi</th><th class="r">Summa</th></tr></thead>
          <tbody><tr v-for="x in (tab === 'ombor' ? d.ombor : d.brak_ombor || [])" :key="x.tovar_id"><td>{{ x.nomi }}</td><td class="r m">{{ miq(x.dona) }}</td><td class="r">{{ fmt(x.narx) }}</td><td class="r m">{{ fmt(x.dona * x.narx) }}</td></tr></tbody>
          <tfoot v-if="tab === 'ombor' && d.ombor.length"><tr><td colspan="3">Jami</td><td class="r m">{{ fmt(omborSumma) }}</td></tr></tfoot>
        </table>
        <div v-if="!(tab === 'ombor' ? d.ombor : d.brak_ombor || []).length" class="pl-bosh"><b>{{ tab === 'ombor' ? "Diller omborida tovar yo'q" : "Brak omborida tovar yo'q" }}</b>{{ tab === 'brak' ? "Mijozdan yaroqsiz qaytgan tovar shu yerga tushadi; uni kompaniyaga \"Qaytarish\" orqali topshirish mumkin." : '' }}</div>
      </div>

      <!-- Sotuvlari (faqat ko'rish) -->
      <template v-if="tab === 'sotuvlar'">
        <p class="pl-mut" style="margin:0;font-size:12.5px">Dillerning o'z mijozlariga sotgani — faqat ko'rish uchun. Kompaniya hisobotlari, reja va kassalariga kirmaydi.</p>
        <div class="pl-card">
          <table class="pl-tbl">
            <thead><tr><th>Chek</th><th>Sana</th><th>Mijoz</th><th class="r">Summa</th><th class="r">To'landi</th><th>To'lov</th></tr></thead>
            <tbody><tr v-for="s in sotuvlar?.data || []" :key="s.id"><td><b>{{ s.raqam }}</b><small v-if="s.qaytarish_bor" class="pl-neg">qaytarish bor</small></td><td>{{ vaqt(s.sana) }}</td><td>{{ s.mijoz?.nomi || '—' }}</td><td class="r m">{{ fmt(s.jami) }}</td><td class="r">{{ fmt(s.tolangan) }}</td><td>{{ s.tolov_usuli || '—' }}</td></tr></tbody>
            <tfoot v-if="sotuvlar?.data?.length"><tr><td colspan="3">Jami: {{ sotuvlar.jami.soni }} ta sotuv</td><td class="r m">{{ fmt(sotuvlar.jami.jami) }}</td><td class="r m">{{ fmt(sotuvlar.jami.tolangan) }}</td><td></td></tr></tfoot>
          </table>
          <div v-if="sotuvlar && !sotuvlar.data.length" class="pl-bosh"><b>Diller hali sotuv qilmagan</b></div>
          <div v-if="!sotuvlar" class="pl-bosh">Yuklanmoqda…</div>
        </div>
      </template>

      <!-- Mijozlari (faqat ko'rish) -->
      <template v-if="tab === 'mijozlar'">
        <p class="pl-mut" style="margin:0;font-size:12.5px">Dillerning o'z mijozlari va ularning dillerga qarzi — faqat ko'rish uchun. Kompaniya qarzdorlari ro'yxatiga kirmaydi.</p>
        <div class="pl-card">
          <table class="pl-tbl">
            <thead><tr><th>Mijoz</th><th>Telefon</th><th>Manzil</th><th class="r">Dillerga qarzi</th><th>Holat</th></tr></thead>
            <tbody><tr v-for="m in mijozlar?.data || []" :key="m.id"><td><b>{{ m.nomi }}</b></td><td>{{ m.telefon || '—' }}</td><td>{{ m.manzil || '—' }}</td><td class="r m" :class="{ 'pl-neg': m.qarz > 0 }">{{ fmt(m.qarz) }}</td><td><span class="pl-bg" :class="m.faol ? 'pl-bg--ok' : ''">{{ m.faol ? 'Faol' : 'Faolsiz' }}</span></td></tr></tbody>
            <tfoot v-if="mijozlar?.data?.length"><tr><td colspan="3">Jami: {{ mijozlar.jami.soni }} ta mijoz</td><td class="r m">{{ fmt(mijozlar.jami.qarz) }}</td><td></td></tr></tfoot>
          </table>
          <div v-if="mijozlar && !mijozlar.data.length" class="pl-bosh"><b>Dillerning mijozi yo'q</b>Diller mijozlarini ilovadan o'zi qo'shadi.</div>
          <div v-if="!mijozlar" class="pl-bosh">Yuklanmoqda…</div>
        </div>
      </template>

      <BuyumKorish v-if="tab === 'buyumlar'" :agent-id="id"/>
    </template>

    <!-- Hujjat tafsiloti -->
    <div v-if="t.ochiq && t.h" class="pl-ov" @mousedown.self="t.ochiq = false">
      <div class="pl-m pl-m--keng">
        <div class="pl-m-hd"><div><h3>{{ t.h.raqam }} — {{ TUR[t.h.tur]?.[0] || t.h.tur }}</h3><p>{{ vaqt(t.h.sana) }} · {{ t.h.user_nomi || '—' }}</p></div><button class="pl-m-x" @click="t.ochiq = false">×</button></div>
        <div class="pl-m-bd">
          <dl class="pl-kv">
            <dt>{{ t.h.tur === 'qaytarish' ? 'Qarz kamaydi' : 'Summa' }}</dt><dd>{{ fmt(t.h.jami) }} so'm</dd>
            <template v-if="t.h.tur === 'berish'"><dt>To'landi</dt><dd>{{ fmt(t.h.tolangan) }} so'm</dd><dt>Qarzga</dt><dd>{{ fmt(t.h.jami - t.h.tolangan) }} so'm</dd></template>
            <template v-if="t.h.kassa_nomi"><dt>Kassa</dt><dd>{{ t.h.kassa_nomi }}</dd></template>
            <template v-if="t.h.izoh"><dt>Izoh</dt><dd>{{ t.h.izoh }}</dd></template>
          </dl>
          <div v-if="t.h.qatorlar?.length" class="pl-card">
            <table class="pl-tbl">
              <thead><tr><th>Tovar</th><th class="r">Dona</th><th class="r">Narx</th><th class="r">Summa</th></tr></thead>
              <tbody><tr v-for="q in t.h.qatorlar" :key="q.id"><td>{{ q.tovar_nomi }} <span v-if="q.brak" class="pl-bg pl-bg--rad">brak</span></td><td class="r m">{{ miq(q.dona) }}</td><td class="r">{{ fmt(q.narx) }}</td><td class="r m">{{ fmt(q.summa) }}</td></tr></tbody>
            </table>
          </div>
          <div v-if="t.h.sotuv_kamaydi?.length" class="pl-f"><span>Qaysi berish hujjati kamaydi</span>
            <div class="pl-audit"><div v-for="(s, i) in t.h.sotuv_kamaydi" :key="i"><b>{{ s.ariza_raqam }}</b> · {{ miq(s.dona) }} dona · −{{ fmt(s.summa) }} so'm</div></div>
          </div>
          <p class="pl-mut" style="margin:0;font-size:12px">Diller hujjatlari tahrirlanmaydi va bekor qilinmaydi — xato bo'lsa teskari hujjat kiriting.</p>
        </div>
        <div class="pl-m-ft"><button class="pl-btn" @click="t.ochiq = false">Yopish</button></div>
      </div>
    </div>

    <!-- 1. Tovar berish -->
    <div v-if="bm.ochiq" class="pl-ov">
      <div class="pl-m pl-m--keng">
        <div class="pl-m-hd"><div><h3>Tovar berish — {{ d?.diller?.fullname }}</h3><p>Tovar asosiy ombordan dillerga o'tadi va kompaniya savdosi sifatida yoziladi. Hujjat keyin tahrirlanmaydi</p></div><button class="pl-m-x" @click="bm.ochiq = false">×</button></div>
        <div class="pl-m-bd">
          <div v-if="bm.yuklanmoqda" class="pl-bosh">Yuklanmoqda…</div>
          <template v-else>
            <div v-if="bm.qatorlar.length" class="pl-card">
              <table class="pl-tbl">
                <thead><tr><th>Tovar</th><th class="r">Omborda</th><th class="r">Dona</th><th class="r">Narx</th><th class="r">Summa</th><th></th></tr></thead>
                <tbody>
                  <tr v-for="(r, i) in bm.qatorlar" :key="r.tovar_id">
                    <td><b>{{ r.nomi }}</b><small v-if="r.xato" class="pl-neg">{{ r.xato }}</small><small v-else-if="!r.asl" class="dk-ogoh">Diller narxi belgilanmagan — narxni kiriting</small></td>
                    <td class="r">{{ miq(mavjud(asosiyBy.get(r.tovar_id) || {})) }} <small style="display:inline">{{ r.olchov }}</small></td>
                    <td class="r"><input v-model="r.dona" class="dk-in" :class="{ 'fx-bad': r.dona !== '' && son(r.dona) > mavjud(asosiyBy.get(r.tovar_id) || {}) }" inputmode="decimal" placeholder="0" :aria-label="`${r.nomi} miqdori`"/></td>
                    <td class="r"><NumberInput v-model="r.narx" :bosh="null" css-class="dk-in dk-in--n" placeholder="narx" :aria-label="`${r.nomi} narxi`"/><small v-if="r.asl && Number(r.narx) !== r.asl">diller narxi {{ fmt(r.asl) }}</small></td>
                    <td class="r m">{{ fmt(son(r.dona) * (Number(r.narx) || 0)) }}</td>
                    <td class="r"><button type="button" class="pl-btn sm pl-btn--x" @click="bm.qatorlar.splice(i, 1)">×</button></td>
                  </tr>
                </tbody>
                <tfoot><tr><td colspan="4">Jami: {{ bm.qatorlar.length }} xil</td><td class="r m">{{ fmt(bJami) }}</td><td></td></tr></tfoot>
              </table>
            </div>
            <div class="pl-fil">
              <select v-model="bm.qosh" style="min-width:300px" @change="bTovarQosh"><option value="">+ Tovar qo'shish…</option><option v-for="x in bQoshiladigan" :key="x.id" :value="x.id">{{ x.nomi }} — omborda {{ miq(mavjud(x)) }}{{ dillerNarx.get(x.id) ? ' · ' + fmt(dillerNarx.get(x.id)) : '' }}</option></select>
            </div>
            <div class="pl-f"><span>To'lov</span>
              <div class="pl-seg" style="align-self:flex-start">
                <button type="button" :class="{ on: bm.tolov === 'toliq' }" @click="bm.tolov = 'toliq'">To'liq to'landi</button>
                <button type="button" :class="{ on: bm.tolov === 'qisman' }" @click="bm.tolov = 'qisman'">Qisman</button>
                <button type="button" :class="{ on: bm.tolov === 'qarz' }" @click="bm.tolov = 'qarz'">Qarzga</button>
              </div>
            </div>
            <div class="dk-ikki">
              <label v-if="bm.tolov === 'qisman'" class="pl-f"><span>Hozir to'landi (so'm) <i>*</i></span><NumberInput v-model="bm.tolangan" :bosh="null" css-class="dk-full" placeholder="0"/></label>
              <label v-if="bm.tolov !== 'qarz'" class="pl-f"><span>Pul tushadigan kassa <i>*</i></span>
                <select v-model="bm.kassa_id"><option value="">— Kassani tanlang —</option><option v-for="k in kassalar" :key="k.id" :value="k.id">{{ k.nomi }} · {{ k.tur === 'plastik' ? 'plastik' : 'naqd' }}</option></select>
                <small v-if="!kassalar.length" class="pl-neg">Faol kassa yo'q — Moliya → Kassalar bo'limida qo'shing</small>
              </label>
            </div>
            <dl v-if="bJami > 0" class="pl-kv">
              <dt>Jami</dt><dd>{{ fmt(bJami) }} so'm</dd>
              <dt>To'landi</dt><dd>{{ fmt(bTolangan) }} so'm</dd>
              <dt>Qarzga yoziladi</dt><dd :class="{ 'pl-neg': bJami - bTolangan > 0 }">{{ fmt(Math.max(0, bJami - bTolangan)) }} so'm</dd>
              <dt>Dillerning qarzi bo'ladi</dt><dd>{{ fmt((d?.qarz || 0) + Math.max(0, bJami - bTolangan)) }} so'm</dd>
            </dl>
            <label class="pl-f"><span>Izoh</span><input v-model="bm.izoh" maxlength="500" placeholder="Ixtiyoriy"/></label>
            <p v-if="bm.xato" class="pl-err">{{ bm.xato }}</p>
          </template>
        </div>
        <div class="pl-m-ft">
          <span v-if="bMuammo && bm.qatorlar.length" class="pl-mut" style="font-size:12.5px;margin-right:auto">{{ bMuammo }}</span>
          <button class="pl-btn" @click="bm.ochiq = false">Bekor qilish</button>
          <button class="pl-btn pl-btn--p" :disabled="band || !!bMuammo" :title="bMuammo" @click="berishSaqla">{{ band ? 'Saqlanmoqda…' : 'Tovar berish' }}</button>
        </div>
      </div>
    </div>

    <!-- 2. To'lov qabul qilish -->
    <div v-if="tm.ochiq" class="pl-ov" @mousedown.self="tm.ochiq = false">
      <div class="pl-m">
        <div class="pl-m-hd"><div><h3>To'lov qabul qilish — {{ d?.diller?.fullname }}</h3><p>Diller tovar qarzini to'laydi — pul tanlangan kassaga tushadi</p></div><button class="pl-m-x" @click="tm.ochiq = false">×</button></div>
        <div class="pl-m-bd">
          <dl class="pl-kv"><dt>Hozirgi qarzi</dt><dd class="pl-neg">{{ fmt(d?.qarz) }} so'm</dd><template v-if="Number(tm.summa) > 0"><dt>To'lovdan keyin</dt><dd>{{ fmt(Math.max(0, (d?.qarz || 0) - Number(tm.summa))) }} so'm</dd></template></dl>
          <label class="pl-f"><span>Summa (so'm) <i>*</i></span><NumberInput v-model="tm.summa" :bosh="null" css-class="dk-full" placeholder="0"/><button type="button" class="pl-link" style="align-self:flex-start" @click="tm.summa = d?.qarz || 0">Butun qarzni kiritish</button></label>
          <label class="pl-f"><span>Kassa <i>*</i></span>
            <select v-model="tm.kassa_id"><option value="">— Kassani tanlang —</option><option v-for="k in kassalar" :key="k.id" :value="k.id">{{ k.nomi }} · {{ k.tur === 'plastik' ? 'plastik' : 'naqd' }} · {{ fmt(k.balans) }}</option></select>
            <small v-if="!kassalar.length" class="pl-neg">Faol kassa yo'q — Moliya → Kassalar bo'limida qo'shing</small>
          </label>
          <label class="pl-f"><span>Izoh</span><input v-model="tm.izoh" maxlength="500" placeholder="Ixtiyoriy"/></label>
          <p v-if="tm.xato" class="pl-err">{{ tm.xato }}</p>
        </div>
        <div class="pl-m-ft">
          <span v-if="tMuammo && Number(tm.summa) > 0" class="pl-mut" style="font-size:12.5px;margin-right:auto">{{ tMuammo }}</span>
          <button class="pl-btn" @click="tm.ochiq = false">Bekor qilish</button>
          <button class="pl-btn pl-btn--ok" :disabled="band || !!tMuammo" :title="tMuammo" @click="tolovSaqla">{{ band ? 'Saqlanmoqda…' : 'Qabul qilish' }}</button>
        </div>
      </div>
    </div>

    <!-- 3. Qaytarish -->
    <div v-if="qm.ochiq" class="pl-ov">
      <div class="pl-m pl-m--keng">
        <div class="pl-m-hd"><div><h3>Qaytarish — {{ d?.diller?.fullname }}</h3><p>Tovar dillerdan kompaniyaga qaytadi; qarzi u olgan narxda kamayadi</p></div><button class="pl-m-x" @click="qm.ochiq = false">×</button></div>
        <div class="pl-m-bd">
          <div v-if="qm.qatorlar.length" class="pl-card">
            <table class="pl-tbl">
              <thead><tr><th>Tovar</th><th class="r">Dillerda bor</th><th class="r">Qaytariladi</th><th class="r">Olgan narxi</th><th class="r">Summa</th><th></th></tr></thead>
              <tbody>
                <tr v-for="(r, i) in qm.qatorlar" :key="r.kalit">
                  <td><b>{{ r.nomi }}</b> <span v-if="r.brak" class="pl-bg pl-bg--rad" title="Dillerning brak omboridan — kompaniya brak omboriga tushadi">brak</span><small v-if="r.xato" class="pl-neg">{{ r.xato }}</small></td>
                  <td class="r"><button type="button" class="pl-link" title="Hammasini qaytarish" @click="r.dona = miq(r.bor)">{{ miq(r.bor) }}</button></td>
                  <td class="r"><input v-model="r.dona" class="dk-in" :class="{ 'fx-bad': r.dona !== '' && qQatorXato(r) }" inputmode="decimal" placeholder="0" :aria-label="`${r.nomi} miqdori`"/><small v-if="r.dona !== '' && qQatorXato(r)" class="pl-neg">{{ qQatorXato(r) }}</small></td>
                  <td class="r">{{ fmt(r.narx) }}</td>
                  <td class="r m">{{ fmt(son(r.dona) * r.narx) }}</td>
                  <td class="r"><button type="button" class="pl-btn sm pl-btn--x" @click="qm.qatorlar.splice(i, 1)">×</button></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="qQoshiladigan.length" class="pl-fil">
            <select v-model="qm.qosh" style="min-width:300px" @change="qTovarQosh"><option value="">+ Tovar qo'shish…</option><option v-for="x in qQoshiladigan" :key="x.kalit" :value="x.kalit">{{ x.nomi }}{{ x.brak ? ' (brak)' : '' }} — {{ miq(x.bor) }} bor</option></select>
          </div>
          <dl class="pl-kv">
            <dt>Qaytariladigan summa</dt><dd :class="{ 'pl-neg': qJami > (d?.qarz || 0) }">{{ fmt(qJami) }} so'm</dd>
            <dt>Hozirgi qarzi</dt><dd>{{ fmt(d?.qarz) }} so'm</dd>
            <dt>Qaytarishdan keyin (taxminan)</dt><dd>{{ fmt(Math.max(0, (d?.qarz || 0) - qJami)) }} so'm</dd>
          </dl>
          <p class="pl-mut" style="margin:0;font-size:12px">Aniq summani dastur hisoblaydi. Qaytarish summasi diller qarzidan oshmasligi kerak — oshsa, avval to'lovni tekshiring.</p>
          <label class="pl-f"><span>Izoh</span><input v-model="qm.izoh" maxlength="500" placeholder="Ixtiyoriy"/></label>
          <p v-if="qm.xato" class="pl-err">{{ qm.xato }}</p>
        </div>
        <div class="pl-m-ft">
          <span v-if="qMuammo && qm.qatorlar.length" class="pl-mut" style="font-size:12.5px;margin-right:auto">{{ qMuammo }}</span>
          <button class="pl-btn" @click="qm.ochiq = false">Bekor qilish</button>
          <button class="pl-btn pl-btn--p" :disabled="band || !!qMuammo" :title="qMuammo" @click="qaytarishSaqla">{{ band ? 'Saqlanmoqda…' : 'Qaytarish' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dk-orqa { text-decoration:none; color:var(--mut); margin-right:4px; }
.dk-qarz b { font-size:24px; }
.dk-ogoh { color:#b45309 !important; }
.dk-ikki { display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px; }
.dk-in, :deep(.dk-in) { width:100px; height:34px; padding:0 10px; border:1.5px solid var(--line); border-radius:8px; text-align:right; font-size:13.5px; font-variant-numeric:tabular-nums; background:var(--surface); color:var(--ink); outline:none; }
:deep(.dk-in--n) { width:120px; }
:deep(.dk-full) { height:36px; padding:0 10px; border:1.5px solid var(--line); border-radius:9px; font-size:14px; background:var(--surface); color:var(--ink); outline:none; }
.dk-in:focus, :deep(.dk-in:focus), :deep(.dk-full:focus) { border-color:var(--acc); }
</style>
