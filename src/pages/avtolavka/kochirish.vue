<script setup>
/* KO'CHIRISHLAR — bir agent omboridagi sotiladigan tovarni boshqa agentga o'tkazish (backend §21).
   Darhol kuchga kiradi (agent tasdig'i yo'q); sotuv emas — pul, reja va KPIga ta'sir qilmaydi, faqat qoldiq o'zgaradi.
   Keyin tahrirlash va bekor qilish mumkin; qabul qilgan agent tovarni sotib yuborgan bo'lsa backend rad etadi.
   Diller agentlar qatnashmaydi. Asosiy ombor ↔ agent harakati bu yerda emas — "Yuk berish va qabul"da.
   Ruxsat: ko'rish — avtolavka:view/create yoki ombor:view/edit; yozish — avtolavka:create yoki ombor:edit. */
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { avtolavkaApi, agentApi } from '@/api/api'
import { authStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { useSorovId } from '@/validation/useForma'

const route = useRoute(), router = useRouter(), toast = useToast()
const yozadi = computed(() => authStore.hasPerm('avtolavka', 'create') || authStore.hasPerm('ombor', 'edit'))

const fmt = (v) => Math.round(Number(v) || 0).toLocaleString('ru-RU').replace(/,/g, ' ')
const miq = (v) => { const n = Math.round((Number(v) || 0) * 1000) / 1000; return String(n).replace('.', ',') }
const son = (v) => { const n = Number(String(v ?? '').replace(/\s/g, '').replace(',', '.')); return Number.isFinite(n) ? Math.round(n * 1000) / 1000 : 0 }
const vaqt = (s) => { if (!s) return '—'; const d = new Date(s); return isNaN(+d) ? String(s) : d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) }
const kun = (d) => { const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` }
const xatoMatn = (e) => (e?.message === 'session_expired' ? '' : e?.status === 403 ? "Ruxsat yo'q" : e?.message || 'Xatolik')

/* ── Ro'yxat ── */
const bugun = new Date()
const f = reactive({
  dan: kun(new Date(bugun.getFullYear(), bugun.getMonth(), 1)), gacha: kun(bugun),
  agent_id: route.query.agent_id ? String(route.query.agent_id) : '', dan_agent_id: '', ga_agent_id: '', holat: '', page: 1,
})
const LIMIT = 50
const rows = ref([]), jami = ref({ soni: 0, jami_dona: 0, jami_summa: 0 })
const agentlar = ref([])
const yuklanmoqda = ref(false), xato = ref(''), band = ref(false)
// Diller agentlar ko'chirishda qatnashmaydi (backend rad etadi)
const tanlov = computed(() => agentlar.value.filter(a => !a.diller))
const sahifalar = computed(() => Math.max(1, Math.ceil((jami.value.soni || 0) / LIMIT)))

async function yukla() {
  if (f.dan && f.gacha && f.dan > f.gacha) { xato.value = "Boshlanish sanasi tugash sanasidan keyin bo'lmasin"; return }
  yuklanmoqda.value = true; xato.value = ''
  try {
    const p = Object.fromEntries(Object.entries({ ...f, limit: LIMIT }).filter(([, v]) => v !== '' && v != null))
    const d = await avtolavkaApi.kochirishlar(p)
    rows.value = d?.data || []; jami.value = d?.jami || { soni: 0, jami_dona: 0, jami_summa: 0 }
  } catch (e) { xato.value = xatoMatn(e); rows.value = [] } finally { yuklanmoqda.value = false }
}
const filtr = () => { f.page = 1; yukla() }
function agentFiltrOl() { f.agent_id = ''; router.replace({ query: { ...route.query, agent_id: undefined } }); filtr() }

/* ── Tafsilot ── */
const t = reactive({ ochiq: false, d: null, yuklanmoqda: false, xato: '' })
async function och(id) {
  Object.assign(t, { ochiq: true, d: rows.value.find(r => r.id === id) || null, yuklanmoqda: true, xato: '' })
  try { t.d = await avtolavkaApi.kochirish(id) } catch (e) { t.xato = xatoMatn(e) } finally { t.yuklanmoqda = false }
}
const AMAL = { yaratildi: 'Yaratildi', tahrirlandi: 'Tahrirlandi', bekor_qilindi: 'Bekor qilindi' }
// Audit yozuvidagi eski → yangi farq: tovar miqdorlari, izoh, sabab
function auditFarq(a) {
  const q = [], e = a.eski || {}, y = a.yangi || {}
  if (a.amal === 'yaratildi') return (y.qatorlar || []).map(x => `${x.tovar_nomi}: ${miq(x.dona)}`)
  if (e.qatorlar || y.qatorlar) {
    const em = new Map((e.qatorlar || []).map(x => [x.tovar_id, x])), ym = new Map((y.qatorlar || []).map(x => [x.tovar_id, x]))
    for (const id of new Set([...em.keys(), ...ym.keys()])) {
      const a1 = em.get(id), b1 = ym.get(id), nom = (b1 || a1).tovar_nomi
      if (!a1) q.push(`${nom}: qo'shildi ${miq(b1.dona)}`)
      else if (!b1) q.push(`${nom}: olib tashlandi (${miq(a1.dona)} edi)`)
      else if (Math.abs(a1.dona - b1.dona) > 0.0005) q.push(`${nom}: ${miq(a1.dona)} → ${miq(b1.dona)}`)
    }
  }
  if ('izoh' in e || 'izoh' in y) q.push(`Izoh: ${e.izoh || '—'} → ${y.izoh || '—'}`)
  if ('sabab' in e || 'sabab' in y) q.push(`Sabab: ${e.sabab || '—'} → ${y.sabab || '—'}`)
  return q
}

/* ── Forma: yangi ko'chirish va tahrirlash ── */
const sorov = useSorovId()
const m = reactive({ ochiq: false, id: null, raqam: '', dan: '', ga: '', gaNomi: '', danNomi: '', qatorlar: [], izoh: '', sabab: '', tahrirSababi: '', xato: '', qoldiqYuklanmoqda: false, qoshTovar: '' })
const qoldiq = ref([])               // "Kimdan" agentdagi hozirgi sotiladigan qoldiq
let asl = new Map()                  // tahrirda: hujjatdagi asl miqdorlar (tovar_id → dona)
const gaTanlov = computed(() => tanlov.value.filter(a => a.faol !== false && String(a.id) !== String(m.dan)))
const qoldiqBy = computed(() => new Map(qoldiq.value.map(q => [q.tovar_id, q])))
// Ruxsat etilgan eng ko'p miqdor: agentdagi qoldiq + (tahrirda) shu hujjatda allaqachon ko'chirilgani
const maks = (id) => Math.round(((qoldiqBy.value.get(id)?.dona || 0) + (asl.get(id) || 0)) * 1000) / 1000
const qoshiladigan = computed(() => qoldiq.value.filter(q => !m.qatorlar.some(r => r.tovar_id === q.tovar_id)))
const jamiForma = computed(() => m.qatorlar.reduce((s, r) => ({ dona: s.dona + son(r.dona), summa: s.summa + son(r.dona) * (r.tannarx || 0) }), { dona: 0, summa: 0 }))
const qatorXato = (r) => { const d = son(r.dona); return d <= 0 ? 'Miqdorni kiriting' : d > maks(r.tovar_id) + 0.0005 ? `Ko'pi bilan ${miq(maks(r.tovar_id))}` : '' }
const muammo = computed(() => {
  if (!m.dan) return 'Kimdan ko\'chirilishini tanlang'
  if (!m.ga) return 'Kimga ko\'chirilishini tanlang'
  if (String(m.dan) === String(m.ga)) return 'Bir agentning o\'ziga ko\'chirib bo\'lmaydi'
  if (!m.qatorlar.length) return 'Kamida bitta tovar qo\'shing'
  if (m.qatorlar.length > 500) return 'Bir hujjatda ko\'pi bilan 500 ta tovar'
  const x = m.qatorlar.find(r => qatorXato(r))
  if (x) return `"${x.nomi}": ${qatorXato(x)}`
  if (m.izoh.length > 500 || m.sabab.length > 500 || m.tahrirSababi.length > 500) return 'Izoh va sabab 500 belgidan oshmasin'
  return ''
})

async function qoldiqYukla() {
  qoldiq.value = []
  if (!m.dan) return
  m.qoldiqYuklanmoqda = true
  try { qoldiq.value = await avtolavkaApi.agentQoldiq(m.dan) || [] } catch (e) { m.xato = xatoMatn(e) } finally { m.qoldiqYuklanmoqda = false }
}
function yangiOch() {
  asl = new Map(); sorov.yangila()
  Object.assign(m, { ochiq: true, id: null, raqam: '', dan: f.agent_id || '', ga: '', gaNomi: '', danNomi: '', qatorlar: [], izoh: '', sabab: '', tahrirSababi: '', xato: '', qoshTovar: '' })
  qoldiqYukla()
}
function danOzgardi() { m.qatorlar = []; m.xato = ''; if (String(m.ga) === String(m.dan)) m.ga = ''; qoldiqYukla() }
async function tahrirOch(d) {
  asl = new Map((d.qatorlar || []).map(q => [q.tovar_id, q.dona]))
  Object.assign(m, { ochiq: true, id: d.id, raqam: d.raqam, dan: d.dan_agent.id, ga: d.ga_agent.id, danNomi: d.dan_agent.nomi, gaNomi: d.ga_agent.nomi, izoh: d.izoh || '', sabab: d.sabab || '', tahrirSababi: '', xato: '', qoshTovar: '',
    qatorlar: (d.qatorlar || []).map(q => ({ tovar_id: q.tovar_id, nomi: q.tovar_nomi, dona: miq(q.dona), tannarx: q.tannarx, xato: '' })) })
  t.ochiq = false
  await qoldiqYukla()
}
function tovarQosh() {
  const q = qoldiqBy.value.get(Number(m.qoshTovar))
  m.qoshTovar = ''
  if (!q || m.qatorlar.some(r => r.tovar_id === q.tovar_id)) return
  m.qatorlar.push({ tovar_id: q.tovar_id, nomi: q.nomi, dona: '', tannarx: q.tannarx, xato: '' })
}
function hammasiniQosh() { for (const q of qoshiladigan.value) m.qatorlar.push({ tovar_id: q.tovar_id, nomi: q.nomi, dona: miq(q.dona), tannarx: q.tannarx, xato: '' }) }

async function saqla() {
  if (band.value || muammo.value) return
  band.value = true; m.xato = ''; m.qatorlar.forEach(r => { r.xato = '' })
  const qatorlar = m.qatorlar.map(r => ({ tovar_id: r.tovar_id, dona: son(r.dona) }))
  const matn = (v) => (v.trim() ? v.trim() : null)
  try {
    const d = m.id
      ? await avtolavkaApi.kochirishTahrir(m.id, { qatorlar, izoh: matn(m.izoh), sabab: matn(m.sabab), ...(m.tahrirSababi.trim() ? { tahrir_sababi: m.tahrirSababi.trim() } : {}) })
      : await avtolavkaApi.kochirishYarat({ dan_agent_id: Number(m.dan), ga_agent_id: Number(m.ga), qatorlar, ...(m.izoh.trim() ? { izoh: m.izoh.trim() } : {}), ...(m.sabab.trim() ? { sabab: m.sabab.trim() } : {}), sorov_id: sorov.id.value })
    m.ochiq = false
    toast.success(m.id ? `${d.raqam} saqlandi` : `${d.raqam} ko'chirildi`, `${d.dan_agent?.nomi} → ${d.ga_agent?.nomi} · ${miq(d.jami_dona)} dona`)
    sorov.yangila()
    await yukla()
    Object.assign(t, { ochiq: true, d, yuklanmoqda: false, xato: '' })
  } catch (e) {
    const x = xatoMatn(e)
    // Backend xabarida tovar nomi bo'ladi ("Non" …) — xabar o'sha qator ustida ko'rsatiladi
    const r = x && m.qatorlar.find(q => x.includes(`"${q.nomi}"`) || x.includes(q.nomi))
    if (r) r.xato = x; else m.xato = x
    // Qoldiq boshqa joyda o'zgargan bo'lishi mumkin — yangilab qo'yamiz
    if (e?.status === 400) qoldiqYukla()
  } finally { band.value = false }
}

/* ── Bekor qilish ── */
const b = reactive({ ochiq: false, d: null, sabab: '', xato: '' })
function bekorOch(d) { Object.assign(b, { ochiq: true, d, sabab: '', xato: '' }) }
async function bekorQil() {
  if (band.value) return
  if (b.sabab.length > 500) { b.xato = 'Sabab 500 belgidan oshmasin'; return }
  band.value = true; b.xato = ''
  try {
    const d = await avtolavkaApi.kochirishBekor(b.d.id, b.sabab.trim() ? { sabab: b.sabab.trim() } : {})
    b.ochiq = false
    toast.success(`${b.d.raqam} bekor qilindi`, 'Tovar avvalgi agentga qaytdi')
    await yukla()
    if (t.ochiq) t.d = d?.id ? d : await avtolavkaApi.kochirish(b.d.id)
  } catch (e) { b.xato = xatoMatn(e) } finally { band.value = false }
}

onMounted(async () => {
  agentApi.getAll().then(d => { agentlar.value = Array.isArray(d) ? d : d?.rows || d?.data || d?.agentlar || [] }).catch(() => {})
  await yukla()
  if (route.query.yangi && yozadi.value) yangiOch()
})
</script>

<template>
  <div class="pl ko">
    <div class="pl-hd">
      <div><h1>Ko'chirishlar</h1><p>Bir agentdagi tovarni boshqa agentga o'tkazish. Sotuv emas — pul va rejaga ta'sir qilmaydi, faqat qoldiq o'zgaradi</p></div>
      <div class="pl-hd-r">
        <button class="pl-btn" :disabled="yuklanmoqda" @click="yukla">Yangilash</button>
        <button v-if="yozadi" class="pl-btn pl-btn--p" @click="yangiOch">+ Yangi ko'chirish</button>
      </div>
    </div>

    <div class="pl-fil">
      <input v-model="f.dan" type="date" :max="f.gacha || undefined" @change="filtr"/><span class="pl-mut">—</span><input v-model="f.gacha" type="date" :min="f.dan || undefined" @change="filtr"/>
      <select v-model="f.agent_id" title="Agent — ko'chirishning istalgan tomonida" @change="filtr"><option value="">Agent (har ikki tomon)</option><option v-for="a in agentlar" :key="a.id" :value="a.id">{{ a.fullname }}</option></select>
      <select v-model="f.dan_agent_id" @change="filtr"><option value="">Kimdan — hammasi</option><option v-for="a in agentlar" :key="a.id" :value="a.id">{{ a.fullname }}</option></select>
      <select v-model="f.ga_agent_id" @change="filtr"><option value="">Kimga — hammasi</option><option v-for="a in agentlar" :key="a.id" :value="a.id">{{ a.fullname }}</option></select>
      <div class="pl-seg">
        <button v-for="h in [['', 'Hammasi'], ['faol', 'Faol'], ['bekor', 'Bekor qilingan']]" :key="h[0]" :class="{ on: f.holat === h[0] }" @click="f.holat = h[0]; filtr()">{{ h[1] }}</button>
      </div>
      <button v-if="route.query.agent_id && f.agent_id" class="pl-btn sm" @click="agentFiltrOl">Agent filtri ×</button>
    </div>

    <p v-if="xato" class="pl-err">{{ xato }}</p>

    <div class="pl-card">
      <table class="pl-tbl">
        <thead><tr><th>Raqam</th><th>Sana</th><th>Kimdan</th><th>Kimga</th><th class="r">Tovar</th><th class="r">Jami dona</th><th class="r">Summa (tannarx)</th><th>Izoh / sabab</th><th>Holat</th><th>Operator</th></tr></thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id" class="bos" :class="{ 'ko-bekor': r.holat === 'bekor' }" @click="och(r.id)">
            <td><b>{{ r.raqam }}</b><small v-if="r.tahrirlangan" class="ko-tahrir">tahrirlangan</small></td>
            <td>{{ vaqt(r.sana) }}</td>
            <td>{{ r.dan_agent?.nomi }}</td>
            <td>{{ r.ga_agent?.nomi }}</td>
            <td class="r">{{ r.tovar_soni }}</td>
            <td class="r m">{{ miq(r.jami_dona) }}</td>
            <td class="r m">{{ fmt(r.jami_summa) }}</td>
            <td class="ko-izoh">{{ [r.izoh, r.sabab].filter(Boolean).join(' · ') || '—' }}</td>
            <td><span class="pl-bg" :class="r.holat === 'bekor' ? '' : 'pl-bg--ok'">{{ r.holat === 'bekor' ? 'Bekor qilingan' : 'Faol' }}</span></td>
            <td>{{ r.user_nomi || '—' }}</td>
          </tr>
        </tbody>
        <tfoot v-if="rows.length"><tr><td colspan="5">Jami: {{ jami.soni }} ta hujjat <span class="pl-mut" style="font-weight:400">(dona va summa — faqat faol hujjatlar)</span></td><td class="r m">{{ miq(jami.jami_dona) }}</td><td class="r m">{{ fmt(jami.jami_summa) }}</td><td colspan="3"></td></tr></tfoot>
      </table>
      <div v-if="!rows.length && !yuklanmoqda && !xato" class="pl-bosh"><b>Bu davrda ko'chirish yo'q</b>{{ yozadi ? '"Yangi ko\'chirish" tugmasi bilan bir agentdagi tovarni boshqasiga o\'tkazing.' : '' }}</div>
      <div v-if="yuklanmoqda && !rows.length" class="pl-bosh">Yuklanmoqda…</div>
    </div>
    <div v-if="sahifalar > 1" class="pl-sah">
      <button class="pl-btn sm" :disabled="f.page <= 1" @click="f.page--; yukla()">‹ Oldingi</button><span>{{ f.page }} / {{ sahifalar }}</span><button class="pl-btn sm" :disabled="f.page >= sahifalar" @click="f.page++; yukla()">Keyingi ›</button>
    </div>

    <!-- Tafsilot -->
    <div v-if="t.ochiq && t.d" class="pl-ov" @mousedown.self="t.ochiq = false">
      <div class="pl-m pl-m--keng">
        <div class="pl-m-hd">
          <div><h3>{{ t.d.raqam }} <span class="pl-bg" :class="t.d.holat === 'bekor' ? '' : 'pl-bg--ok'" style="vertical-align:middle">{{ t.d.holat === 'bekor' ? 'Bekor qilingan' : 'Faol' }}</span></h3><p>{{ t.d.dan_agent?.nomi }} → {{ t.d.ga_agent?.nomi }} · {{ vaqt(t.d.sana) }} · {{ t.d.user_nomi || '—' }}</p></div>
          <button class="pl-m-x" @click="t.ochiq = false">×</button>
        </div>
        <div class="pl-m-bd">
          <p v-if="t.xato" class="pl-err">{{ t.xato }}</p>
          <dl v-if="t.d.izoh || t.d.sabab" class="pl-kv">
            <template v-if="t.d.izoh"><dt>Izoh</dt><dd>{{ t.d.izoh }}</dd></template>
            <template v-if="t.d.sabab"><dt>Sabab</dt><dd>{{ t.d.sabab }}</dd></template>
          </dl>
          <div v-if="t.yuklanmoqda && !t.d.qatorlar" class="pl-bosh">Yuklanmoqda…</div>
          <div v-else-if="t.d.qatorlar" class="pl-card">
            <table class="pl-tbl" :class="{ 'ko-bekor': t.d.holat === 'bekor' }">
              <thead><tr><th>Tovar</th><th class="r">Dona</th><th class="r">Tannarx</th><th class="r">Summa</th></tr></thead>
              <tbody><tr v-for="q in t.d.qatorlar" :key="q.id"><td>{{ q.tovar_nomi }}</td><td class="r m">{{ miq(q.dona) }}</td><td class="r">{{ fmt(q.tannarx) }}</td><td class="r m">{{ fmt(q.summa) }}</td></tr></tbody>
              <tfoot><tr><td>Jami: {{ t.d.tovar_soni }} xil</td><td class="r m">{{ miq(t.d.jami_dona) }}</td><td></td><td class="r m">{{ fmt(t.d.jami_summa) }}</td></tr></tfoot>
            </table>
          </div>
          <div v-if="t.d.audit?.length" class="pl-f"><span>Tarix</span>
            <div class="pl-audit">
              <div v-for="(a, i) in t.d.audit" :key="i"><b>{{ AMAL[a.amal] || a.amal }}</b> · {{ a.user_nomi || '—' }} <small>· {{ vaqt(a.vaqt) }}</small>
                <template v-for="(x, k) in auditFarq(a)" :key="k"><br/>{{ x }}</template>
                <template v-if="a.sabab"><br/><small>Sabab: {{ a.sabab }}</small></template>
              </div>
            </div>
          </div>
        </div>
        <div class="pl-m-ft">
          <button class="pl-btn" @click="t.ochiq = false">Yopish</button>
          <template v-if="yozadi && t.d.holat === 'faol' && t.d.qatorlar">
            <button class="pl-btn pl-btn--x" @click="bekorOch(t.d)">Bekor qilish</button>
            <button class="pl-btn pl-btn--p" @click="tahrirOch(t.d)">Tahrirlash</button>
          </template>
        </div>
      </div>
    </div>

    <!-- Forma -->
    <div v-if="m.ochiq" class="pl-ov">
      <div class="pl-m pl-m--keng">
        <div class="pl-m-hd"><div><h3>{{ m.id ? `${m.raqam} — tahrirlash` : "Yangi ko'chirish" }}</h3><p>Saqlangan zahoti kuchga kiradi: tovar bir agentdan ikkinchisiga o'tadi</p></div><button class="pl-m-x" @click="m.ochiq = false">×</button></div>
        <div class="pl-m-bd">
          <p class="ogoh-tasma" style="margin:0">Ko'chirishdan oldin agent bilan kelishing: u internetsiz sotgan tovar ko'chirilsa, uning sotuvi qabul qilinmaydi.</p>
          <div class="ko-ikki">
            <label class="pl-f"><span>Kimdan <i>*</i></span>
              <input v-if="m.id" :value="m.danNomi" disabled/>
              <select v-else v-model="m.dan" @change="danOzgardi"><option value="">— Agentni tanlang —</option><option v-for="a in tanlov" :key="a.id" :value="a.id">{{ a.fullname }}{{ a.faol === false ? ' (faolsiz)' : '' }}</option></select>
            </label>
            <label class="pl-f"><span>Kimga <i>*</i></span>
              <input v-if="m.id" :value="m.gaNomi" disabled/>
              <select v-else v-model="m.ga" :disabled="!m.dan"><option value="">— Agentni tanlang —</option><option v-for="a in gaTanlov" :key="a.id" :value="a.id">{{ a.fullname }}</option></select>
            </label>
          </div>

          <div v-if="m.dan" class="pl-f"><span>Tovarlar <i>*</i></span>
            <div v-if="m.qoldiqYuklanmoqda" class="pl-mut" style="font-size:12.5px">Qoldiq yuklanmoqda…</div>
            <div v-else-if="!qoldiq.length && !m.qatorlar.length" class="pl-bosh" style="padding:18px"><b>Bu agentda ko'chiriladigan tovar yo'q</b></div>
            <div v-if="m.qatorlar.length" class="pl-card">
              <table class="pl-tbl">
                <thead><tr><th>Tovar</th><th class="r">Agentda bor</th><th class="r">Ko'chiriladi</th><th class="r">Summa</th><th></th></tr></thead>
                <tbody>
                  <tr v-for="(r, i) in m.qatorlar" :key="r.tovar_id">
                    <td><b>{{ r.nomi }}</b><small v-if="r.xato" class="pl-neg">{{ r.xato }}</small></td>
                    <td class="r">
                      <button type="button" class="pl-link" title="Hammasini ko'chirish" @click="r.dona = miq(maks(r.tovar_id))">{{ miq(maks(r.tovar_id)) }}</button>
                      <small v-if="m.id && asl.get(r.tovar_id)">shundan {{ miq(asl.get(r.tovar_id)) }} shu hujjatda</small>
                    </td>
                    <td class="r"><input v-model="r.dona" class="ko-in" :class="{ 'fx-bad': r.dona !== '' && qatorXato(r) }" inputmode="decimal" placeholder="0" :aria-label="`${r.nomi} miqdori`"/><small v-if="r.dona !== '' && qatorXato(r)" class="pl-neg">{{ qatorXato(r) }}</small></td>
                    <td class="r m">{{ fmt(son(r.dona) * (r.tannarx || 0)) }}</td>
                    <td class="r"><button type="button" class="pl-btn sm pl-btn--x" title="Qatorni olib tashlash" @click="m.qatorlar.splice(i, 1)">×</button></td>
                  </tr>
                </tbody>
                <tfoot><tr><td colspan="2">Jami: {{ m.qatorlar.length }} xil</td><td class="r m">{{ miq(jamiForma.dona) }}</td><td class="r m">{{ fmt(jamiForma.summa) }}</td><td></td></tr></tfoot>
              </table>
            </div>
            <div v-if="qoshiladigan.length" class="pl-fil">
              <select v-model="m.qoshTovar" style="min-width:260px" @change="tovarQosh"><option value="">+ Tovar qo'shish…</option><option v-for="q in qoshiladigan" :key="q.tovar_id" :value="q.tovar_id">{{ q.nomi }} — {{ miq(q.dona) }} bor</option></select>
              <button v-if="!m.id" type="button" class="pl-btn sm" title="Agentdagi hamma tovarni to'liq ko'chirish (omborini bo'shatish)" @click="hammasiniQosh">Hammasini qo'shish</button>
            </div>
          </div>

          <div class="ko-ikki">
            <label class="pl-f"><span>Izoh</span><input v-model="m.izoh" maxlength="500" placeholder="Ixtiyoriy"/></label>
            <label class="pl-f"><span>Sabab</span><input v-model="m.sabab" maxlength="500" placeholder="Ixtiyoriy: nima uchun ko'chirilyapti"/></label>
          </div>
          <label v-if="m.id" class="pl-f"><span>Tahrir sababi</span><input v-model="m.tahrirSababi" maxlength="500" placeholder="Ixtiyoriy: nima o'zgartirildi — tarixda saqlanadi"/></label>
          <p v-if="m.xato" class="pl-err">{{ m.xato }}</p>
        </div>
        <div class="pl-m-ft">
          <span v-if="muammo && m.qatorlar.length" class="pl-mut" style="font-size:12.5px;margin-right:auto">{{ muammo }}</span>
          <button class="pl-btn" @click="m.ochiq = false">Bekor qilish</button>
          <button class="pl-btn pl-btn--p" :disabled="band || !!muammo" :title="muammo" @click="saqla">{{ band ? 'Saqlanmoqda…' : m.id ? 'Saqlash' : "Ko'chirish" }}</button>
        </div>
      </div>
    </div>

    <!-- Bekor qilish tasdig'i -->
    <div v-if="b.ochiq" class="pl-ov" style="z-index:530" @mousedown.self="b.ochiq = false">
      <div class="pl-m">
        <div class="pl-m-hd"><div><h3>{{ b.d.raqam }} bekor qilinsinmi?</h3><p>Tovar {{ b.d.ga_agent?.nomi }}dan {{ b.d.dan_agent?.nomi }}ga qaytadi</p></div><button class="pl-m-x" @click="b.ochiq = false">×</button></div>
        <div class="pl-m-bd">
          <p class="pl-mut" style="margin:0;font-size:12.5px">Qabul qilgan agent tovarni sotib yuborgan bo'lsa, bekor qilib bo'lmaydi — dastur qaysi tovar yetmayotganini aytadi.</p>
          <label class="pl-f"><span>Sabab</span><textarea v-model="b.sabab" rows="2" maxlength="500" placeholder="Ixtiyoriy"/></label>
          <p v-if="b.xato" class="pl-err">{{ b.xato }}</p>
        </div>
        <div class="pl-m-ft"><button class="pl-btn" @click="b.ochiq = false">Yo'q</button><button class="pl-btn pl-btn--x" :disabled="band" @click="bekorQil">{{ band ? 'Bajarilmoqda…' : 'Ha, bekor qilish' }}</button></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ko-bekor td { color:var(--sub); text-decoration:line-through; }
.ko-bekor td .pl-bg, .ko-bekor td small { text-decoration:none; }
.ko-tahrir { color:#b45309 !important; font-weight:600; text-decoration:none; }
.ko-izoh { max-width:220px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ko-ikki { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.ko-in { width:110px; height:34px; padding:0 10px; border:1.5px solid var(--line); border-radius:8px; text-align:right; font-size:13.5px; font-variant-numeric:tabular-nums; background:var(--surface); color:var(--ink); outline:none; }
.ko-in:focus { border-color:var(--acc); }
@media (max-width:700px) { .ko-ikki { grid-template-columns:1fr; } }
</style>
