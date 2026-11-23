<script setup>
/* BUYUMLAR — sotilmaydigan jihozlar hisobi: muzlatgich, vitrina, stend, banner… (backend §23).
   Faqat soni yuritiladi (narx, seriya raqami yo'q). Uch joyda turadi: kompaniyada, agentda, mijozda (do'konda).
   Web'dan: kirim (kompaniyaga), agentga berish, agentdan qaytarish, agentdan agentga. Mijozga berish/olish — faqat agent ilovasidan.
   Harakat tahrirlanmaydi va bekor qilinmaydi — xato teskari harakat bilan tuzatiladi.
   Uch yorliq (alohida manzil): /buyumlar — ro'yxat, /buyumlar/harakatlar — tarix, /buyumlar/hisobot — hisobotlar.
   Ruxsat: ko'rish — avtolavka:view/create yoki ombor:view/edit; harakat — avtolavka:create yoki ombor:edit; ma'lumotnoma — ombor:edit. */
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { buyumApi, agentApi, faylniOch } from '@/api/api'
import { authStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { useSorovId } from '@/validation/useForma'

const route = useRoute(), router = useRouter(), toast = useToast()
const tab = computed(() => route.meta.tab || 'royxat')
const harakatQiladi = computed(() => authStore.hasPerm('avtolavka', 'create') || authStore.hasPerm('ombor', 'edit'))
const katalogYozadi = computed(() => authStore.hasPerm('ombor', 'edit'))

const vaqt = (s) => { if (!s) return '—'; const d = new Date(s); return isNaN(+d) ? String(s) : d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) }
const kun = (d) => { const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` }
const xatoMatn = (e) => (e?.message === 'session_expired' ? '' : e?.status === 403 ? "Ruxsat yo'q" : e?.message || 'Xatolik')
const toza = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null))

const TUR = {
  kirim: ['Kirim', 'pl-bg--ok'], agentga: ['Agentga berildi', 'pl-bg--pl'], agentdan: ['Agentdan qaytdi', 'pl-bg--kut'],
  agentdan_agentga: ['Agentdan agentga', 'pl-bg--pl'], mijozga: ['Mijozga berildi', ''], mijozdan: ['Mijozdan olindi', ''],
}
// Kimdan → Kimga: turga qarab kompaniya / agent / mijoz
const yol = (h) => ({
  kirim: ['Ta\'minot', 'Kompaniya'], agentga: ['Kompaniya', h.ga_agent?.nomi], agentdan: [h.dan_agent?.nomi, 'Kompaniya'],
  agentdan_agentga: [h.dan_agent?.nomi, h.ga_agent?.nomi], mijozga: [h.agent?.nomi, h.mijoz?.nomi], mijozdan: [h.mijoz?.nomi, h.agent?.nomi],
}[h.tur] || ['—', '—'])

const yuklanmoqda = ref(false), xato = ref(''), band = ref(false)
const katalog = ref([]), agentlar = ref([]), viloyatlar = ref([])
const jamiK = computed(() => katalog.value.reduce((s, b) => ({ k: s.k + b.kompaniyada, a: s.a + b.agentlarda, m: s.m + b.mijozlarda, j: s.j + b.jami }), { k: 0, a: 0, m: 0, j: 0 }))

async function katalogYukla() { katalog.value = await buyumApi.katalog() || [] }

/* ── 2. Tarix ── */
const bugun = new Date()
const hf = reactive({ dan: kun(new Date(bugun.getFullYear(), bugun.getMonth(), 1)), gacha: kun(bugun), tur: '', agent_id: route.query.agent_id ? String(route.query.agent_id) : '', mijoz_id: route.query.mijoz_id ? String(route.query.mijoz_id) : '', buyum_id: '', page: 1 })
const LIMIT = 50
const harakatlar = ref([]), harakatJami = ref(0)
/* ── 3. Hisobot ── */
const hs = reactive({ tur: 'agentlar', agent_id: '', territoriya_id: '', buyum_id: '', faqatBor: true, page: 1 })
const hAgentlar = ref([]), hMijozlar = ref([]), hMijozJami = ref(0), hBuyumlar = ref([])
// Agentlar hisoboti viloyat bo'yicha guruhlanadi; buyumi yo'q agentlar ham keladi ("Buyum yo'q")
const agentGuruhlar = computed(() => {
  const m = new Map()
  for (const r of hAgentlar.value) {
    if (hs.faqatBor && !r.buyumlar.length) continue
    const k = r.territoriya?.id || 0
    if (!m.has(k)) m.set(k, { nom: r.territoriya?.nomi || 'Viloyat belgilanmagan', agentlar: [], qolda: 0, mijozlarda: 0 })
    const g = m.get(k); g.agentlar.push(r)
    for (const b of r.buyumlar) { g.qolda += b.qolda; g.mijozlarda += b.mijozlarda }
  }
  return [...m.values()]
})

async function yukla() {
  yuklanmoqda.value = true; xato.value = ''
  try {
    if (tab.value === 'harakatlar') {
      if (hf.dan && hf.gacha && hf.dan > hf.gacha) throw new Error("Boshlanish sanasi tugash sanasidan keyin bo'lmasin")
      const d = await buyumApi.harakatlar({ ...toza(hf), limit: LIMIT })
      harakatlar.value = d?.data || []; harakatJami.value = d?.jami || 0
    } else if (tab.value === 'hisobot') {
      if (hs.tur === 'agentlar') hAgentlar.value = await buyumApi.hisobotAgentlar(toza({ agent_id: hs.agent_id, territoriya_id: hs.territoriya_id })) || []
      else if (hs.tur === 'mijozlar') { const d = await buyumApi.hisobotMijozlar(toza({ agent_id: hs.agent_id, buyum_id: hs.buyum_id, page: hs.page, limit: 100 })); hMijozlar.value = d?.data || []; hMijozJami.value = d?.jami || 0 }
      else hBuyumlar.value = await buyumApi.hisobotBuyumlar() || []
    }
    await katalogYukla()
  } catch (e) { xato.value = e?.status === 404 ? "Buyumlar bo'limi serverda hali yo'q — backend yangilanishi kerak" : xatoMatn(e) } finally { yuklanmoqda.value = false }
}
const tarixFiltr = () => { hf.page = 1; yukla() }
const hisobotFiltr = () => { hs.page = 1; yukla() }
function tarixTozala() { hf.agent_id = ''; hf.mijoz_id = ''; router.replace({ query: {} }); tarixFiltr() }
async function rasmOch(y) { try { await faylniOch(y, 'buyum') } catch (e) { const x = xatoMatn(e); if (x) toast.error('Rasm ochilmadi', x) } }

/* ── Ma'lumotnoma formasi ── */
const km = reactive({ ochiq: false, id: null, nomi: '', birlik: 'dona', izoh: '', xato: '' })
function katalogOch(b) { Object.assign(km, b ? { ochiq: true, id: b.id, nomi: b.nomi, birlik: b.birlik || 'dona', izoh: b.izoh || '', xato: '' } : { ochiq: true, id: null, nomi: '', birlik: 'dona', izoh: '', xato: '' }) }
async function katalogSaqla() {
  const nomi = km.nomi.trim(), birlik = km.birlik.trim() || 'dona'
  if (!nomi) { km.xato = 'Buyum nomini yozing'; return }
  if (nomi.length > 120) { km.xato = 'Nomi 120 belgidan oshmasin'; return }
  if (birlik.length > 20) { km.xato = 'Birlik 20 belgidan oshmasin'; return }
  if (katalog.value.some(b => b.id !== km.id && b.nomi.trim().toLowerCase() === nomi.toLowerCase())) { km.xato = `"${nomi}" nomli buyum allaqachon bor`; return }
  band.value = true; km.xato = ''
  try {
    const body = { nomi, birlik, izoh: km.izoh.trim() || null }
    km.id ? await buyumApi.tahrir(km.id, body) : await buyumApi.yarat(body)
    km.ochiq = false; toast.success(km.id ? 'Buyum saqlandi' : "Buyum qo'shildi", nomi)
    await katalogYukla()
  } catch (e) { km.xato = xatoMatn(e) } finally { band.value = false }
}
async function faolBos(b) {
  try { await buyumApi.tahrir(b.id, { faol: !b.faol }); await katalogYukla() } catch (e) { toast.error("O'zgartirilmadi", xatoMatn(e)) }
}
async function ochir(b) {
  if (!confirm(`"${b.nomi}" o'chirilsinmi?`)) return
  try { await buyumApi.ochir(b.id); toast.success("Buyum o'chirildi", b.nomi); await katalogYukla() }
  catch (e) {
    // Harakati bor buyum o'chirilmaydi — faolsizlantirish taklif qilinadi
    if (e?.status === 400 && b.faol && confirm(`${e.message}\n\n"${b.nomi}" faolsiz qilinsinmi? U yangi harakatlarda tanlanmaydi (faqat kompaniyaga qaytarish mumkin), tarixi saqlanadi.`)) return faolBos(b)
    toast.error("O'chirilmadi", xatoMatn(e))
  }
}

/* ── Harakat formasi ── */
const sorov = useSorovId()
const HTUR = [
  { k: 'kirim', nom: 'Kirim', izoh: 'Kompaniyaga yangi buyum keldi' },
  { k: 'agentga', nom: 'Agentga berish', izoh: 'Kompaniyadan agentga' },
  { k: 'agentdan', nom: 'Agentdan qaytarish', izoh: 'Agentdan kompaniyaga' },
  { k: 'agentdan_agentga', nom: 'Agentdan agentga', izoh: 'Bir agentdan boshqasiga' },
]
const hm = reactive({ ochiq: false, tur: 'kirim', dan: '', ga: '', qatorlar: [], izoh: '', xato: '', qosh: '', yuklanmoqda: false })
const agentQolda = ref([])            // "Kimdan" agentdagi buyumlar
const kerakDan = computed(() => hm.tur === 'agentdan' || hm.tur === 'agentdan_agentga')
const kerakGa = computed(() => hm.tur === 'agentga' || hm.tur === 'agentdan_agentga')
const gaTanlov = computed(() => agentlar.value.filter(a => a.faol !== false && String(a.id) !== String(hm.dan)))
// Manbadagi mavjud son: kirim — cheklovsiz; agentga — kompaniyada; agentdan/agentdan_agentga — "Kimdan" agentda
const manba = computed(() => {
  if (hm.tur === 'kirim') return katalog.value.filter(b => b.faol).map(b => ({ id: b.id, nomi: b.nomi, birlik: b.birlik, bor: null }))
  if (hm.tur === 'agentga') return katalog.value.filter(b => b.faol && b.kompaniyada > 0).map(b => ({ id: b.id, nomi: b.nomi, birlik: b.birlik, bor: b.kompaniyada }))
  const faol = new Map(katalog.value.map(b => [b.id, b]))
  // Faolsizlantirilgan buyumni faqat kompaniyaga qaytarish mumkin
  return agentQolda.value.filter(q => hm.tur === 'agentdan' || faol.get(q.buyum_id)?.faol !== false).map(q => ({ id: q.buyum_id, nomi: q.nomi, birlik: faol.get(q.buyum_id)?.birlik || 'dona', bor: q.dona }))
})
const manbaBy = computed(() => new Map(manba.value.map(b => [b.id, b])))
const qoshiladigan = computed(() => manba.value.filter(b => !hm.qatorlar.some(r => r.buyum_id === b.id)))
const butun = (v) => { const s = String(v ?? '').replace(/\s/g, ''); return /^\d+$/.test(s) ? Number(s) : NaN }
const qatorXato = (r) => {
  const d = butun(r.dona), bor = manbaBy.value.get(r.buyum_id)?.bor
  return !(d > 0) ? 'Butun son kiriting' : d > 1000000 ? 'Juda katta' : bor != null && d > bor ? `Ko'pi bilan ${bor}` : ''
}
const muammo = computed(() => {
  if (kerakDan.value && !hm.dan) return 'Kimdan olinishini tanlang'
  if (kerakGa.value && !hm.ga) return 'Kimga berilishini tanlang'
  if (kerakDan.value && kerakGa.value && String(hm.dan) === String(hm.ga)) return 'Beruvchi va oluvchi agent bir xil bo\'lmasin'
  if (!hm.qatorlar.length) return 'Kamida bitta buyum qo\'shing'
  const x = hm.qatorlar.find(r => qatorXato(r))
  if (x) return `"${x.nomi}": ${qatorXato(x)}`
  if (hm.izoh.length > 500) return 'Izoh 500 belgidan oshmasin'
  return ''
})
async function agentQoldaYukla() {
  agentQolda.value = []
  if (!kerakDan.value || !hm.dan) return
  hm.yuklanmoqda = true
  try { agentQolda.value = (await buyumApi.agent(hm.dan))?.qolda || [] } catch (e) { hm.xato = xatoMatn(e) } finally { hm.yuklanmoqda = false }
}
function harakatOch(tur = 'kirim', agentId = '') {
  sorov.yangila()
  Object.assign(hm, { ochiq: true, tur, dan: tur === 'agentdan' || tur === 'agentdan_agentga' ? agentId : '', ga: tur === 'agentga' ? agentId : '', qatorlar: [], izoh: '', xato: '', qosh: '' })
  agentQoldaYukla()
}
function turTanla(k) { hm.tur = k; hm.dan = ''; hm.ga = ''; hm.qatorlar = []; hm.xato = ''; agentQolda.value = [] }
function danOzgardi() { hm.qatorlar = []; hm.xato = ''; if (String(hm.ga) === String(hm.dan)) hm.ga = ''; agentQoldaYukla() }
function buyumQosh() {
  const b = manbaBy.value.get(Number(hm.qosh)); hm.qosh = ''
  if (!b || hm.qatorlar.some(r => r.buyum_id === b.id)) return
  hm.qatorlar.push({ buyum_id: b.id, nomi: b.nomi, birlik: b.birlik, dona: '', xato: '' })
}
async function harakatSaqla() {
  if (band.value || muammo.value) return
  band.value = true; hm.xato = ''; hm.qatorlar.forEach(r => { r.xato = '' })
  try {
    const d = await buyumApi.harakat({
      tur: hm.tur, ...(kerakDan.value ? { dan_agent_id: Number(hm.dan) } : {}), ...(kerakGa.value ? { ga_agent_id: Number(hm.ga) } : {}),
      qatorlar: hm.qatorlar.map(r => ({ buyum_id: r.buyum_id, dona: butun(r.dona) })), ...(hm.izoh.trim() ? { izoh: hm.izoh.trim() } : {}), sorov_id: sorov.id.value,
    })
    hm.ochiq = false; sorov.yangila()
    toast.success(`${d.raqam} — ${TUR[d.tur]?.[0] || d.tur}`, d.qatorlar.map(q => `${q.buyum_nomi} × ${q.dona}`).join(', '))
    await yukla()
  } catch (e) {
    const x = xatoMatn(e)
    const r = x && hm.qatorlar.find(q => x.includes(`"${q.nomi}"`))
    if (r) r.xato = x; else hm.xato = x
    if (e?.status === 400) { await katalogYukla().catch(() => {}); agentQoldaYukla() }   // qoldiq boshqa joyda o'zgargan bo'lishi mumkin
  } finally { band.value = false }
}

/* ── Harakat tafsiloti ── */
const t = reactive({ ochiq: false, h: null })
function tafsilot(h) { t.h = h; t.ochiq = true; buyumApi.harakatBitta(h.id).then(d => { if (t.h?.id === h.id) t.h = d }).catch(() => {}) }

watch(tab, () => { xato.value = ''; yukla() })
onMounted(() => {
  agentApi.getAll().then(d => { agentlar.value = Array.isArray(d) ? d : d?.rows || d?.data || [] }).catch(() => {})
  agentApi.spravochnik().then(d => { viloyatlar.value = d?.territoriyalar || [] }).catch(() => {})
  yukla()
})
</script>

<template>
  <div class="pl">
    <div class="pl-hd">
      <div><h1>Buyumlar</h1><p>Sotilmaydigan jihozlar: muzlatgich, vitrina, stend, banner. Faqat soni yuritiladi — kompaniyada, agentlarda va mijozlarda</p></div>
      <div class="pl-hd-r">
        <button class="pl-btn" :disabled="yuklanmoqda" @click="yukla">Yangilash</button>
        <button v-if="tab === 'royxat' && katalogYozadi" class="pl-btn" @click="katalogOch(null)">+ Buyum qo'shish</button>
        <button v-if="harakatQiladi" class="pl-btn pl-btn--p" @click="harakatOch()">Harakat qilish</button>
      </div>
    </div>

    <div class="pl-kpi">
      <div class="pl-k"><small>Kompaniyada</small><b>{{ jamiK.k }}</b><em>dona · omborda turibdi</em></div>
      <div class="pl-k"><small>Agentlarda</small><b>{{ jamiK.a }}</b><em>dona · agentlar qo'lida</em></div>
      <div class="pl-k"><small>Mijozlarda</small><b>{{ jamiK.m }}</b><em>dona · do'konlarga berilgan</em></div>
      <div class="pl-k"><small>Jami</small><b>{{ jamiK.j }}</b><em>dona · {{ katalog.length }} xil buyum</em></div>
    </div>

    <div class="pl-tabs">
      <RouterLink to="/buyumlar" class="pl-tab" :class="{ on: tab === 'royxat' }">Buyumlar ro'yxati</RouterLink>
      <RouterLink to="/buyumlar/harakatlar" class="pl-tab" :class="{ on: tab === 'harakatlar' }">Harakatlar tarixi</RouterLink>
      <RouterLink to="/buyumlar/hisobot" class="pl-tab" :class="{ on: tab === 'hisobot' }">Hisobotlar</RouterLink>
    </div>
    <p v-if="xato" class="pl-err">{{ xato }}</p>

    <!-- ══ 1. Ro'yxat ══ -->
    <div v-if="tab === 'royxat'" class="pl-card">
      <table class="pl-tbl">
        <thead><tr><th>Nomi</th><th>Birlik</th><th class="r">Kompaniyada</th><th class="r">Agentlarda</th><th class="r">Mijozlarda</th><th class="r">Jami</th><th>Faol</th><th></th></tr></thead>
        <tbody>
          <tr v-for="b in katalog" :key="b.id" :class="{ 'by-nofaol': !b.faol }">
            <td style="white-space:nowrap"><b>{{ b.nomi }}</b><small v-if="b.izoh">{{ b.izoh }}</small></td>
            <td>{{ b.birlik }}</td>
            <td class="r m">{{ b.kompaniyada }}</td><td class="r m">{{ b.agentlarda }}</td><td class="r m">{{ b.mijozlarda }}</td><td class="r m">{{ b.jami }}</td>
            <td>
              <button v-if="katalogYozadi" class="pl-btn sm" :class="b.faol ? 'pl-btn--ok' : ''" :title="b.faol ? 'Faolsiz qilish' : 'Faol qilish'" @click="faolBos(b)">{{ b.faol ? 'Faol' : 'Faolsiz' }}</button>
              <span v-else class="pl-bg" :class="b.faol ? 'pl-bg--ok' : ''">{{ b.faol ? 'Faol' : 'Faolsiz' }}</span>
            </td>
            <td>
              <div class="pl-amal">
                <button class="pl-btn sm" @click="router.push({ path: '/buyumlar/harakatlar' }); hf.buyum_id = b.id; hf.agent_id = ''; hf.mijoz_id = ''">Tarix</button>
                <template v-if="katalogYozadi"><button class="pl-btn sm" @click="katalogOch(b)">Tahrirlash</button><button class="pl-btn sm pl-btn--x" @click="ochir(b)">O'chirish</button></template>
              </div>
            </td>
          </tr>
        </tbody>
        <tfoot v-if="katalog.length"><tr><td colspan="2">Jami: {{ katalog.length }} xil</td><td class="r m">{{ jamiK.k }}</td><td class="r m">{{ jamiK.a }}</td><td class="r m">{{ jamiK.m }}</td><td class="r m">{{ jamiK.j }}</td><td colspan="2"></td></tr></tfoot>
      </table>
      <div v-if="!katalog.length && !yuklanmoqda && !xato" class="pl-bosh"><b>Hali buyum yo'q</b>Avval buyum qo'shing (masalan, "Muzlatgich"), keyin "Harakat qilish" → Kirim bilan sonini kiriting.</div>
      <div v-if="yuklanmoqda && !katalog.length" class="pl-bosh">Yuklanmoqda…</div>
    </div>

    <!-- ══ 2. Tarix ══ -->
    <template v-if="tab === 'harakatlar'">
      <div class="pl-fil">
        <input v-model="hf.dan" type="date" :max="hf.gacha || undefined" @change="tarixFiltr"/><span class="pl-mut">—</span><input v-model="hf.gacha" type="date" :min="hf.dan || undefined" @change="tarixFiltr"/>
        <select v-model="hf.tur" @change="tarixFiltr"><option value="">Barcha turlar</option><option v-for="(v, k) in TUR" :key="k" :value="k">{{ v[0] }}</option></select>
        <select v-model="hf.agent_id" @change="tarixFiltr"><option value="">Barcha agentlar</option><option v-for="a in agentlar" :key="a.id" :value="a.id">{{ a.fullname }}</option></select>
        <select v-model="hf.buyum_id" @change="tarixFiltr"><option value="">Barcha buyumlar</option><option v-for="b in katalog" :key="b.id" :value="b.id">{{ b.nomi }}</option></select>
        <button v-if="hf.mijoz_id" class="pl-btn sm" @click="tarixTozala">Mijoz filtri ×</button>
      </div>
      <div class="pl-card">
        <table class="pl-tbl">
          <thead><tr><th>Raqam</th><th>Sana</th><th>Tur</th><th>Kimdan → Kimga</th><th>Buyumlar</th><th>Izoh</th><th>Rasm</th><th>Manba</th><th>Operator</th></tr></thead>
          <tbody>
            <tr v-for="h in harakatlar" :key="h.id" class="bos" @click="tafsilot(h)">
              <td><b>{{ h.raqam }}</b></td>
              <td>{{ vaqt(h.sana) }}</td>
              <td><span class="pl-bg" :class="TUR[h.tur]?.[1]">{{ TUR[h.tur]?.[0] || h.tur }}</span></td>
              <td>{{ yol(h)[0] || '—' }} → {{ yol(h)[1] || '—' }}</td>
              <td>{{ h.qatorlar.map(q => `${q.buyum_nomi} × ${q.dona}`).join(', ') }}</td>
              <td style="max-width:180px">{{ h.izoh || '—' }}</td>
              <td @click.stop><button v-if="h.rasm" class="pl-link" @click="rasmOch(h.rasm)">Rasm</button><span v-else class="pl-mut">—</span></td>
              <td><span class="pl-bg" :class="h.manba === 'mobil' ? 'pl-bg--kut' : ''">{{ h.manba === 'mobil' ? 'Mobil' : 'Web' }}</span></td>
              <td>{{ h.user_nomi || '—' }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="!harakatlar.length && !yuklanmoqda && !xato" class="pl-bosh"><b>Bu davrda harakat yo'q</b></div>
        <div v-if="yuklanmoqda && !harakatlar.length" class="pl-bosh">Yuklanmoqda…</div>
      </div>
      <div v-if="harakatJami > LIMIT" class="pl-sah">
        <button class="pl-btn sm" :disabled="hf.page <= 1" @click="hf.page--; yukla()">‹ Oldingi</button><span>{{ hf.page }} / {{ Math.ceil(harakatJami / LIMIT) }}</span><button class="pl-btn sm" :disabled="hf.page * LIMIT >= harakatJami" @click="hf.page++; yukla()">Keyingi ›</button>
      </div>
    </template>

    <!-- ══ 3. Hisobotlar ══ -->
    <template v-if="tab === 'hisobot'">
      <div class="pl-fil">
        <div class="pl-seg">
          <button v-for="x in [['agentlar', 'Agentlar bo\'yicha'], ['mijozlar', 'Mijozlar bo\'yicha'], ['buyumlar', 'Buyum bo\'yicha jami']]" :key="x[0]" :class="{ on: hs.tur === x[0] }" @click="hs.tur = x[0]; hisobotFiltr()">{{ x[1] }}</button>
        </div>
        <template v-if="hs.tur !== 'buyumlar'"><select v-model="hs.agent_id" @change="hisobotFiltr"><option value="">Barcha agentlar</option><option v-for="a in agentlar" :key="a.id" :value="a.id">{{ a.fullname }}</option></select></template>
        <template v-if="hs.tur === 'agentlar'">
          <select v-model="hs.territoriya_id" @change="hisobotFiltr"><option value="">Barcha viloyatlar</option><option v-for="v in viloyatlar" :key="v.id" :value="v.id">{{ v.nomi }}</option></select>
          <label style="display:inline-flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input v-model="hs.faqatBor" type="checkbox"/> Faqat buyumi borlar</label>
        </template>
        <select v-if="hs.tur === 'mijozlar'" v-model="hs.buyum_id" @change="hisobotFiltr"><option value="">Barcha buyumlar</option><option v-for="b in katalog" :key="b.id" :value="b.id">{{ b.nomi }}</option></select>
      </div>

      <div v-if="hs.tur === 'agentlar'" class="pl-card">
        <table class="pl-tbl">
          <thead><tr><th>Agent</th><th>Buyum</th><th class="r">Qo'lida</th><th class="r">Mijozlarida</th><th class="r">Jami</th></tr></thead>
          <tbody>
            <template v-for="g in agentGuruhlar" :key="g.nom">
              <tr class="by-guruh"><td colspan="2"><b>{{ g.nom }}</b> <small style="display:inline">{{ g.agentlar.length }} ta agent</small></td><td class="r m">{{ g.qolda }}</td><td class="r m">{{ g.mijozlarda }}</td><td class="r m">{{ g.qolda + g.mijozlarda }}</td></tr>
              <template v-for="r in g.agentlar" :key="r.agent.id">
                <tr v-if="!r.buyumlar.length"><td>{{ r.agent.nomi }}</td><td colspan="4" class="pl-mut">Buyum yo'q</td></tr>
                <tr v-for="(b, i) in r.buyumlar" :key="b.buyum_id">
                  <td><template v-if="i === 0"><RouterLink :to="{ path: '/buyumlar/harakatlar', query: { agent_id: r.agent.id } }" class="pl-link" title="Shu agent harakatlari tarixi">{{ r.agent.nomi }}</RouterLink></template></td>
                  <td>{{ b.nomi }}</td><td class="r m">{{ b.qolda }}</td><td class="r m">{{ b.mijozlarda }}</td><td class="r m">{{ b.qolda + b.mijozlarda }}</td>
                </tr>
              </template>
            </template>
          </tbody>
        </table>
        <div v-if="!agentGuruhlar.length && !yuklanmoqda && !xato" class="pl-bosh"><b>{{ hs.faqatBor ? 'Buyumi bor agent yo\'q' : 'Agent topilmadi' }}</b></div>
      </div>

      <template v-if="hs.tur === 'mijozlar'">
        <div class="pl-card">
          <table class="pl-tbl">
            <thead><tr><th>Mijoz</th><th>Agent</th><th>Buyum</th><th class="r">Soni</th><th>Oxirgi berilgan</th></tr></thead>
            <tbody>
              <template v-for="r in hMijozlar" :key="r.mijoz.id">
                <tr v-for="(b, i) in r.buyumlar" :key="b.buyum_id">
                  <td><template v-if="i === 0"><RouterLink :to="{ path: '/buyumlar/harakatlar', query: { mijoz_id: r.mijoz.id } }" class="pl-link">{{ r.mijoz.nomi }}</RouterLink><small>{{ r.mijoz.manzil || '' }}</small></template></td>
                  <td>{{ i === 0 ? r.agent?.nomi || '—' : '' }}</td>
                  <td>{{ b.nomi }}</td><td class="r m">{{ b.dona }}</td><td>{{ vaqt(b.oxirgi_sana) }}</td>
                </tr>
              </template>
            </tbody>
          </table>
          <div v-if="!hMijozlar.length && !yuklanmoqda && !xato" class="pl-bosh"><b>Mijozlarda buyum yo'q</b>Agent ilovadan do'konga buyum berganda shu yerda chiqadi.</div>
        </div>
        <div v-if="hMijozJami > 100" class="pl-sah">
          <button class="pl-btn sm" :disabled="hs.page <= 1" @click="hs.page--; yukla()">‹ Oldingi</button><span>{{ hs.page }} / {{ Math.ceil(hMijozJami / 100) }}</span><button class="pl-btn sm" :disabled="hs.page * 100 >= hMijozJami" @click="hs.page++; yukla()">Keyingi ›</button>
        </div>
      </template>

      <div v-if="hs.tur === 'buyumlar'" class="pl-card">
        <table class="pl-tbl">
          <thead><tr><th>Buyum</th><th class="r">Kompaniyada</th><th class="r">Agentlarda</th><th class="r">Mijozlarda</th><th class="r">Jami</th></tr></thead>
          <tbody><tr v-for="b in hBuyumlar" :key="b.buyum_id"><td><b>{{ b.nomi }}</b></td><td class="r m">{{ b.kompaniyada }}</td><td class="r m">{{ b.agentlarda }}</td><td class="r m">{{ b.mijozlarda }}</td><td class="r m">{{ b.jami }}</td></tr></tbody>
          <tfoot v-if="hBuyumlar.length"><tr><td>Jami</td><td class="r m">{{ hBuyumlar.reduce((s, b) => s + b.kompaniyada, 0) }}</td><td class="r m">{{ hBuyumlar.reduce((s, b) => s + b.agentlarda, 0) }}</td><td class="r m">{{ hBuyumlar.reduce((s, b) => s + b.mijozlarda, 0) }}</td><td class="r m">{{ hBuyumlar.reduce((s, b) => s + b.jami, 0) }}</td></tr></tfoot>
        </table>
        <div v-if="!hBuyumlar.length && !yuklanmoqda && !xato" class="pl-bosh"><b>Buyum yo'q</b></div>
      </div>
    </template>

    <!-- Ma'lumotnoma formasi -->
    <div v-if="km.ochiq" class="pl-ov" @mousedown.self="km.ochiq = false">
      <div class="pl-m">
        <div class="pl-m-hd"><div><h3>{{ km.id ? 'Buyumni tahrirlash' : "Buyum qo'shish" }}</h3><p>Sotilmaydigan jihoz: narxi yo'q, faqat soni yuritiladi</p></div><button class="pl-m-x" @click="km.ochiq = false">×</button></div>
        <div class="pl-m-bd">
          <label class="pl-f"><span>Nomi <i>*</i></span><input v-model="km.nomi" maxlength="120" placeholder="Masalan: Muzlatgich" @keydown.enter="katalogSaqla"/></label>
          <label class="pl-f"><span>Birlik</span><input v-model="km.birlik" maxlength="20" placeholder="dona"/></label>
          <label class="pl-f"><span>Izoh</span><input v-model="km.izoh" maxlength="500" placeholder="Ixtiyoriy"/></label>
          <p v-if="km.xato" class="pl-err">{{ km.xato }}</p>
        </div>
        <div class="pl-m-ft"><button class="pl-btn" @click="km.ochiq = false">Bekor qilish</button><button class="pl-btn pl-btn--p" :disabled="band" @click="katalogSaqla">{{ band ? 'Saqlanmoqda…' : 'Saqlash' }}</button></div>
      </div>
    </div>

    <!-- Harakat formasi -->
    <div v-if="hm.ochiq" class="pl-ov">
      <div class="pl-m pl-m--keng">
        <div class="pl-m-hd"><div><h3>Buyum harakati</h3><p>Saqlangach tahrirlanmaydi va bekor qilinmaydi — xato bo'lsa teskari harakat qiling</p></div><button class="pl-m-x" @click="hm.ochiq = false">×</button></div>
        <div class="pl-m-bd">
          <div class="by-tur">
            <button v-for="x in HTUR" :key="x.k" type="button" :class="{ on: hm.tur === x.k }" @click="turTanla(x.k)"><b>{{ x.nom }}</b><small>{{ x.izoh }}</small></button>
          </div>
          <div v-if="kerakDan || kerakGa" class="by-ikki">
            <label v-if="kerakDan" class="pl-f"><span>Kimdan <i>*</i></span>
              <select v-model="hm.dan" @change="danOzgardi"><option value="">— Agentni tanlang —</option><option v-for="a in agentlar" :key="a.id" :value="a.id">{{ a.fullname }}{{ a.faol === false ? ' (faolsiz)' : '' }}</option></select>
            </label>
            <label v-if="kerakGa" class="pl-f"><span>Kimga <i>*</i></span>
              <select v-model="hm.ga"><option value="">— Agentni tanlang —</option><option v-for="a in gaTanlov" :key="a.id" :value="a.id">{{ a.fullname }}</option></select>
            </label>
          </div>
          <div v-if="!kerakDan || hm.dan" class="pl-f"><span>Buyumlar <i>*</i></span>
            <div v-if="hm.yuklanmoqda" class="pl-mut" style="font-size:12.5px">Yuklanmoqda…</div>
            <div v-else-if="!manba.length && !hm.qatorlar.length" class="pl-bosh" style="padding:16px"><b>{{ hm.tur === 'kirim' ? "Faol buyum yo'q — avval buyum qo'shing" : hm.tur === 'agentga' ? "Kompaniyada buyum yo'q — avval kirim qiling" : "Bu agentda buyum yo'q" }}</b></div>
            <div v-if="hm.qatorlar.length" class="pl-card">
              <table class="pl-tbl">
                <thead><tr><th>Buyum</th><th class="r">{{ hm.tur === 'kirim' ? '' : hm.tur === 'agentga' ? 'Kompaniyada bor' : 'Agentda bor' }}</th><th class="r">Soni</th><th></th></tr></thead>
                <tbody>
                  <tr v-for="(r, i) in hm.qatorlar" :key="r.buyum_id">
                    <td><b>{{ r.nomi }}</b><small v-if="r.xato" class="pl-neg">{{ r.xato }}</small></td>
                    <td class="r"><button v-if="manbaBy.get(r.buyum_id)?.bor != null" type="button" class="pl-link" title="Hammasini qo'yish" @click="r.dona = String(manbaBy.get(r.buyum_id).bor)">{{ manbaBy.get(r.buyum_id).bor }}</button></td>
                    <td class="r"><input v-model="r.dona" class="by-in" :class="{ 'fx-bad': r.dona !== '' && qatorXato(r) }" inputmode="numeric" placeholder="0" :aria-label="`${r.nomi} soni`"/> <span class="pl-mut">{{ r.birlik }}</span><small v-if="r.dona !== '' && qatorXato(r)" class="pl-neg">{{ qatorXato(r) }}</small></td>
                    <td class="r"><button type="button" class="pl-btn sm pl-btn--x" title="Qatorni olib tashlash" @click="hm.qatorlar.splice(i, 1)">×</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="qoshiladigan.length" class="pl-fil">
              <select v-model="hm.qosh" style="min-width:260px" @change="buyumQosh"><option value="">+ Buyum qo'shish…</option><option v-for="b in qoshiladigan" :key="b.id" :value="b.id">{{ b.nomi }}{{ b.bor != null ? ` — ${b.bor} bor` : '' }}</option></select>
            </div>
          </div>
          <label class="pl-f"><span>Izoh</span><input v-model="hm.izoh" maxlength="500" placeholder="Ixtiyoriy"/></label>
          <p v-if="hm.xato" class="pl-err">{{ hm.xato }}</p>
        </div>
        <div class="pl-m-ft">
          <span v-if="muammo && hm.qatorlar.length" class="pl-mut" style="font-size:12.5px;margin-right:auto">{{ muammo }}</span>
          <button class="pl-btn" @click="hm.ochiq = false">Bekor qilish</button>
          <button class="pl-btn pl-btn--p" :disabled="band || !!muammo" :title="muammo" @click="harakatSaqla">{{ band ? 'Saqlanmoqda…' : 'Saqlash' }}</button>
        </div>
      </div>
    </div>

    <!-- Harakat tafsiloti -->
    <div v-if="t.ochiq && t.h" class="pl-ov" @mousedown.self="t.ochiq = false">
      <div class="pl-m">
        <div class="pl-m-hd"><div><h3>{{ t.h.raqam }} — {{ TUR[t.h.tur]?.[0] || t.h.tur }}</h3><p>{{ vaqt(t.h.sana) }} · {{ t.h.manba === 'mobil' ? 'Mobil ilovadan' : 'Web paneldan' }} · {{ t.h.user_nomi || '—' }}</p></div><button class="pl-m-x" @click="t.ochiq = false">×</button></div>
        <div class="pl-m-bd">
          <dl class="pl-kv">
            <dt>Kimdan</dt><dd>{{ yol(t.h)[0] || '—' }}</dd>
            <dt>Kimga</dt><dd>{{ yol(t.h)[1] || '—' }}</dd>
            <template v-if="t.h.izoh"><dt>Izoh</dt><dd>{{ t.h.izoh }}</dd></template>
            <dt>Rasm</dt><dd><button v-if="t.h.rasm" class="pl-link" @click="rasmOch(t.h.rasm)">Rasmni ochish</button><span v-else class="pl-mut">yo'q</span></dd>
          </dl>
          <div class="pl-card"><table class="pl-tbl"><thead><tr><th>Buyum</th><th class="r">Soni</th></tr></thead><tbody><tr v-for="q in t.h.qatorlar" :key="q.buyum_id"><td>{{ q.buyum_nomi }}</td><td class="r m">{{ q.dona }}</td></tr></tbody></table></div>
        </div>
        <div class="pl-m-ft"><button class="pl-btn" @click="t.ochiq = false">Yopish</button></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.by-nofaol td { color:var(--sub); }
.by-guruh td { background:var(--acc-soft); border-top:2px solid var(--line); }
.by-tur { display:grid; grid-template-columns:repeat(auto-fit, minmax(170px, 1fr)); gap:8px; }
.by-tur button { text-align:left; padding:10px 12px; border:1.5px solid var(--line); border-radius:11px; background:var(--surface); cursor:pointer; display:flex; flex-direction:column; gap:2px; color:var(--ink); }
.by-tur button.on { border-color:var(--acc); background:var(--acc-soft); }
.by-tur b { font-size:13.5px; } .by-tur small { font-size:11.5px; color:var(--mut); }
.by-ikki { display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px; }
.by-in { width:100px; height:34px; padding:0 10px; border:1.5px solid var(--line); border-radius:8px; text-align:right; font-size:13.5px; font-variant-numeric:tabular-nums; background:var(--surface); color:var(--ink); outline:none; }
.by-in:focus { border-color:var(--acc); }
</style>
