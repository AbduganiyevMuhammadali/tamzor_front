<script setup>
/* KASSALAR — pul turadigan joylar va agentdan keladigan pul (backend §17–19).
   Uch yorliq, har biri alohida manzil:
     /moliya/kassalar      — kassalar (naqd / plastik), balans, CRUD
     /moliya/plastik       — plastik to'lovlar navbati: tasdiqlash / rad / tahrir (sabab bilan, audit)
     /moliya/topshiruvlar  — agent topshiruvlari (naqd yoki karta): tasdiqlash / rad
   Ruxsat: ko'rish — moliya:view; kassa CRUD — moliya:create; tasdiq/rad/tahrir — moliya:approve. */
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { kassalarApi, agentApi, faylniOch, faylTuri } from '@/api/api'
import { authStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

const route = useRoute(), router = useRouter(), toast = useToast()
const tab = computed(() => route.meta.tab || 'kassalar')
const yaratadi = computed(() => authStore.hasPerm('moliya', 'create'))
const tasdiqlaydi = computed(() => authStore.hasPerm('moliya', 'approve'))

const fmt = (v) => Math.round(Number(v) || 0).toLocaleString('ru-RU').replace(/,/g, ' ')
const vaqt = (s) => { if (!s) return '—'; const d = new Date(s); return isNaN(+d) ? String(s) : d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) }
const HOLAT = { kutilmoqda: ['Kutilmoqda', 'pl-bg--kut'], tasdiqlangan: ['Tasdiqlangan', 'pl-bg--ok'], rad_etildi: ['Rad etildi', 'pl-bg--rad'] }
const xatoMatn = (e) => (e?.message === 'session_expired' ? '' : e?.status === 403 ? "Ruxsat yo'q" : e?.status === 404 ? "Bu bo'lim serverda hali yo'q — backend yangilanishi kerak" : e?.message || 'Xatolik')
const chekNomi = (y) => { const t = faylTuri(y); return t ? `Chek (${t})` : 'Chek' }
async function chekOch(y) { try { await faylniOch(y, 'chek') } catch (e) { const m = xatoMatn(e); if (m) toast.error('Chek ochilmadi', m) } }

const yuklanmoqda = ref(false), xato = ref(''), band = ref(false)

/* ── Ma'lumotnomalar ── */
const agentlar = ref([]), viloyatlar = ref([]), kassalar = ref([]), jami = ref({})
const naqdKassalar = computed(() => kassalar.value.filter(k => k.tur === 'naqd' && k.faol))
const plastikKassalar = computed(() => kassalar.value.filter(k => k.tur === 'plastik' && k.faol))
const kutPlastik = computed(() => kassalar.value.reduce((s, k) => s + (Number(k.kutilmoqda_soni) || 0), 0))
const kutTopshiruv = ref(0)

async function kassalarYukla() {
  const d = await kassalarApi.list()
  kassalar.value = d?.kassalar || []
  jami.value = d?.jami || {}
}
async function asosYukla() {
  agentApi.spravochnik().then(d => { agentlar.value = d?.agentlar || [] }).catch(() => {})
  kassalarApi.viloyatlar().then(d => { viloyatlar.value = Array.isArray(d) ? d : d?.viloyatlar || [] }).catch(() => {})
  kassalarApi.topshiruv.list({ holat: 'kutilmoqda', limit: 1 }).then(d => { kutTopshiruv.value = d?.jami?.soni || 0 }).catch(() => {})
}

/* ── 1. Kassalar ── */
const km = reactive({ ochiq: false, id: null, nomi: '', tur: 'naqd', viloyat_idlar: [], izoh: '', faol: true, xato: '' })
function kassaOch(k) {
  Object.assign(km, k
    ? { ochiq: true, id: k.id, nomi: k.nomi, tur: k.tur, viloyat_idlar: (k.viloyatlar || []).map(v => v.id), izoh: k.izoh || '', faol: !!k.faol, xato: '' }
    : { ochiq: true, id: null, nomi: '', tur: 'naqd', viloyat_idlar: [], izoh: '', faol: true, xato: '' })
}
const viloyatBos = (id) => { const i = km.viloyat_idlar.indexOf(id); i >= 0 ? km.viloyat_idlar.splice(i, 1) : km.viloyat_idlar.push(id) }
async function kassaSaqla() {
  const nomi = km.nomi.trim()
  if (!nomi) { km.xato = 'Kassa nomini yozing'; return }
  if (nomi.length > 100) { km.xato = 'Nomi 100 belgidan oshmasin'; return }
  if (km.tur === 'plastik' && !km.viloyat_idlar.length) { km.xato = 'Plastik kassa uchun kamida bitta viloyat tanlang'; return }
  band.value = true; km.xato = ''
  try {
    // Plastik kassa viloyatlarga biriktiriladi; naqd kassa viloyatga bog'lanmaydi
    const body = { nomi, tur: km.tur, izoh: km.izoh.trim() || null, faol: km.faol, viloyat_idlar: km.tur === 'plastik' ? km.viloyat_idlar : [] }
    km.id ? await kassalarApi.update(km.id, body) : await kassalarApi.create(body)
    km.ochiq = false
    toast.success(km.id ? 'Kassa saqlandi' : "Kassa qo'shildi", nomi)
    await kassalarYukla()
  } catch (e) { km.xato = xatoMatn(e) } finally { band.value = false }
}
async function kassaFaol(k) {
  try { const r = await kassalarApi.faol(k.id, !k.faol); k.faol = r?.faol ?? !k.faol }
  catch (e) { toast.error("O'zgartirilmadi", xatoMatn(e)) }
}
async function kassaOchir(k) {
  if (!confirm(`"${k.nomi}" kassasi o'chirilsinmi?`)) return
  try { await kassalarApi.remove(k.id); toast.success("Kassa o'chirildi", k.nomi); await kassalarYukla() }
  catch (e) {
    // Harakati bor kassa o'chirilmaydi — faolsizlantirish taklif qilinadi
    if (e?.status === 400 && k.faol && confirm(`${e.message}\n\nKassani faolsiz qilaymi? U yangi to'lovlar uchun tanlanmaydi, tarixi saqlanadi.`)) return kassaFaol(k)
    toast.error("O'chirilmadi", xatoMatn(e))
  }
}

/* ── 2. Plastik to'lovlar ── */
const pf = reactive({ holat: 'kutilmoqda', tur: '', agent_id: '', kassa_id: '', dan: '', gacha: '', page: 1 })
const plastik = ref([]), plastikJami = ref({ soni: 0, summa: 0 })
/* ── 3. Topshiruvlar ── */
const tf = reactive({ holat: 'kutilmoqda', usul: '', agent_id: '', dan: '', gacha: '', page: 1 })
const topshiruv = ref([]), topshiruvJami = ref({ soni: 0, summa: 0 })
const LIMIT = 100
const toza = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null))

async function yukla() {
  yuklanmoqda.value = true; xato.value = ''
  try {
    if (tab.value === 'plastik') {
      if (pf.dan && pf.gacha && pf.dan > pf.gacha) throw new Error("Boshlanish sanasi tugash sanasidan keyin bo'lmasin")
      const d = await kassalarApi.plastik.list({ ...toza(pf), limit: LIMIT })
      plastik.value = d?.data || []; plastikJami.value = d?.jami || { soni: 0, summa: 0 }
    } else if (tab.value === 'topshiruvlar') {
      if (tf.dan && tf.gacha && tf.dan > tf.gacha) throw new Error("Boshlanish sanasi tugash sanasidan keyin bo'lmasin")
      const d = await kassalarApi.topshiruv.list({ ...toza(tf), limit: LIMIT })
      topshiruv.value = d?.data || []; topshiruvJami.value = d?.jami || { soni: 0, summa: 0 }
      if (tf.holat === 'kutilmoqda' && !tf.usul && !tf.agent_id) kutTopshiruv.value = topshiruvJami.value.soni || 0
    }
    await kassalarYukla()
  } catch (e) { xato.value = xatoMatn(e) } finally { yuklanmoqda.value = false }
}
const filtr = (f) => { f.page = 1; yukla() }

/* ── Amal oynasi: tasdiqlash / rad / tahrir (plastik va topshiruv uchun bitta) ── */
const am = reactive({ ochiq: false, nav: '', amal: '', r: null, sabab: '', izoh: '', kassa_id: '', summa: null, xato: '', audit: [] })
async function amalOch(nav, amal, r) {
  Object.assign(am, { ochiq: true, nav, amal, r, sabab: '', izoh: '', kassa_id: amal === 'tahrir' ? r.kassa_id || '' : '', summa: amal === 'tahrir' ? Number(r.summa) : null, xato: '', audit: [] })
  if (amal === 'korish') {
    try { const d = await (nav === 'plastik' ? kassalarApi.plastik : kassalarApi.topshiruv).getById(r.id); am.r = { ...r, ...d }; am.audit = d?.audit || [] }
    catch (e) { am.xato = xatoMatn(e) }
  }
}
const naqdTopshiruv = computed(() => am.nav === 'topshiruv' && (am.r?.usul || 'naqd') === 'naqd')
async function amalBajar() {
  const r = am.r, api = am.nav === 'plastik' ? kassalarApi.plastik : kassalarApi.topshiruv
  am.xato = ''
  const sabab = am.sabab.trim()
  let body = {}
  if (am.amal === 'rad' || am.amal === 'tahrir') {
    if (sabab.length < 3) { am.xato = 'Sababni yozing (kamida 3 ta belgi)'; return }
    if (sabab.length > 500) { am.xato = 'Sabab 500 belgidan oshmasin'; return }
  }
  if (am.amal === 'tasdiqla') {
    // Naqd topshiruvda pul tushadigan naqd kassa majburiy; karta topshiruvida kassani agent tanlagan
    if (naqdTopshiruv.value) { if (!am.kassa_id) { am.xato = 'Naqd kassani tanlang'; return } body.kassa_id = Number(am.kassa_id) }
    if (am.izoh.trim()) body.izoh = am.izoh.trim().slice(0, 255)
  } else if (am.amal === 'rad') body = { sabab }
  else if (am.amal === 'tahrir') {
    body = { sabab }
    if (!(Number(am.summa) > 0)) { am.xato = "Summa 0 dan katta bo'lsin"; return }
    if (Number(am.summa) !== Number(r.summa)) body.summa = Number(am.summa)
    if (am.kassa_id && Number(am.kassa_id) !== Number(r.kassa_id)) body.kassa_id = Number(am.kassa_id)
    if (body.summa == null && body.kassa_id == null) { am.xato = "Hech narsa o'zgarmadi — summa yoki kassani o'zgartiring"; return }
  }
  band.value = true
  try {
    am.amal === 'tasdiqla' ? await api.tasdiqla(r.id, body) : am.amal === 'rad' ? await api.rad(r.id, body) : await api.update(r.id, body)
    am.ochiq = false
    toast.success({ tasdiqla: 'Tasdiqlandi', rad: 'Rad etildi', tahrir: 'Saqlandi' }[am.amal], `${r.agent_nomi || ''} · ${fmt(body.summa ?? r.summa)} so'm`)
    await yukla()
  } catch (e) {
    am.xato = xatoMatn(e)
    // Boshqa oynada allaqachon tasdiqlangan/rad etilgan bo'lishi mumkin — ro'yxat yangilanadi
    if (e?.status === 400) yukla()
  } finally { band.value = false }
}
const AMAL_NOM = { tasdiqla: 'Tasdiqlash', rad: 'Rad etish', tahrir: 'Tahrirlash', korish: 'Tafsilot' }
const AUDIT_NOM = { yaratildi: 'Yaratildi', tahrirlandi: 'Tahrirlandi', tasdiqlandi: 'Tasdiqlandi', rad_etildi: 'Rad etildi' }
const auditFarq = (a) => {
  const q = [], e = a.eski || {}, y = a.yangi || {}
  if (e.summa != null && y.summa != null && Number(e.summa) !== Number(y.summa)) q.push(`summa ${fmt(e.summa)} → ${fmt(y.summa)}`)
  if (e.kassa_id != null && y.kassa_id != null && e.kassa_id !== y.kassa_id) q.push(`kassa ${kassaNomi(e.kassa_id)} → ${kassaNomi(y.kassa_id)}`)
  if (e.holat && y.holat && e.holat !== y.holat) q.push(`${HOLAT[e.holat]?.[0] || e.holat} → ${HOLAT[y.holat]?.[0] || y.holat}`)
  return q.join(' · ')
}
const kassaNomi = (id) => kassalar.value.find(k => k.id === id)?.nomi || `#${id}`

watch(tab, () => { xato.value = ''; yukla() })
watch(() => route.query.kassa_id, (v) => { if (tab.value === 'plastik' && v) { pf.kassa_id = String(v); yukla() } })
onMounted(() => { if (route.query.kassa_id && tab.value === 'plastik') pf.kassa_id = String(route.query.kassa_id); asosYukla(); yukla() })
</script>

<template>
  <div class="pl">
    <div class="pl-hd">
      <div>
        <h1>Kassalar</h1>
        <p>Pul turadigan joylar, agentlardan kelgan plastik to'lovlar va naqd topshiruvlar</p>
      </div>
      <div class="pl-hd-r">
        <button class="pl-btn" :disabled="yuklanmoqda" @click="yukla">Yangilash</button>
        <button v-if="tab === 'kassalar' && yaratadi" class="pl-btn pl-btn--p" @click="kassaOch(null)">+ Kassa qo'shish</button>
      </div>
    </div>

    <div class="pl-kpi">
      <div class="pl-k"><small>Kassalarda</small><b>{{ fmt(jami.kassalarda) }}</b><em>so'm · barcha kassalar balansi</em></div>
      <div class="pl-k"><small>Agentlar qo'lida</small><b :class="{ 'pl-neg': jami.agentlar_qolida < 0 }">{{ fmt(jami.agentlar_qolida) }}</b><em>so'm · hali topshirilmagan naqd</em></div>
      <div class="pl-k" :class="{ 'pl-k--warn': jami.kutilmoqda_topshiruv > 0 }"><small>Tasdiq kutilayotgan topshiruv</small><b>{{ fmt(jami.kutilmoqda_topshiruv) }}</b><em>so'm{{ kutTopshiruv ? ` · ${kutTopshiruv} ta` : '' }}</em></div>
      <div class="pl-k" :class="{ 'pl-k--warn': jami.kutilmoqda_plastik > 0 }"><small>Tasdiq kutilayotgan plastik</small><b>{{ fmt(jami.kutilmoqda_plastik) }}</b><em>so'm{{ kutPlastik ? ` · ${kutPlastik} ta` : '' }}</em></div>
      <div v-if="jami.taqsimlanmagan" class="pl-k"><small>Taqsimlanmagan (eski)</small><b>{{ fmt(jami.taqsimlanmagan) }}</b><em>so'm · kassaga bog'lanmagan eski yozuvlar</em></div>
    </div>

    <div class="pl-tabs">
      <RouterLink to="/moliya/kassalar" class="pl-tab" :class="{ on: tab === 'kassalar' }">Kassalar</RouterLink>
      <RouterLink to="/moliya/plastik" class="pl-tab" :class="{ on: tab === 'plastik' }">Plastik to'lovlar<i v-if="kutPlastik">{{ kutPlastik }}</i></RouterLink>
      <RouterLink to="/moliya/topshiruvlar" class="pl-tab" :class="{ on: tab === 'topshiruvlar' }">Topshiruvlar<i v-if="kutTopshiruv">{{ kutTopshiruv }}</i></RouterLink>
    </div>

    <p v-if="xato" class="pl-err">{{ xato }}</p>

    <!-- ══ 1. Kassalar ══ -->
    <div v-if="tab === 'kassalar'" class="pl-card">
      <table class="pl-tbl">
        <thead><tr><th>Nomi</th><th>Tur</th><th>Viloyatlar</th><th class="r">Balans</th><th class="r">Kutilayotgan plastik</th><th>Faol</th><th></th></tr></thead>
        <tbody>
          <tr v-for="k in kassalar" :key="k.id">
            <td><b>{{ k.nomi }}</b><small v-if="k.izoh">{{ k.izoh }}</small></td>
            <td><span class="pl-bg" :class="k.tur === 'plastik' ? 'pl-bg--pl' : 'pl-bg--ok'">{{ k.tur === 'plastik' ? 'Plastik' : 'Naqd' }}</span></td>
            <td>
              <template v-if="k.tur === 'plastik'"><span v-for="v in k.viloyatlar || []" :key="v.id" class="pl-bg" style="margin:1px 3px 1px 0">{{ v.nomi }}</span><span v-if="!(k.viloyatlar || []).length" class="pl-neg">viloyat biriktirilmagan</span></template>
              <span v-else class="pl-mut">—</span>
            </td>
            <td class="r m" :class="{ 'pl-neg': k.balans < 0 }">{{ fmt(k.balans) }}<small>kirim {{ fmt(k.kirim) }} · chiqim {{ fmt(k.chiqim) }}<template v-if="Number(k.topshiruv_kirim)"> · topshiruv {{ fmt(k.topshiruv_kirim) }}</template></small></td>
            <td class="r">
              <RouterLink v-if="Number(k.kutilmoqda_soni)" :to="{ path: '/moliya/plastik', query: { kassa_id: k.id } }" class="pl-link">{{ fmt(k.kutilmoqda_plastik) }} · {{ k.kutilmoqda_soni }} ta</RouterLink>
              <span v-else class="pl-mut">—</span>
            </td>
            <td>
              <button v-if="yaratadi" class="pl-btn sm" :class="k.faol ? 'pl-btn--ok' : ''" :title="k.faol ? 'Faolsiz qilish' : 'Faol qilish'" @click="kassaFaol(k)">{{ k.faol ? 'Faol' : 'Faolsiz' }}</button>
              <span v-else class="pl-bg" :class="k.faol ? 'pl-bg--ok' : ''">{{ k.faol ? 'Faol' : 'Faolsiz' }}</span>
            </td>
            <td>
              <div class="pl-amal">
                <button class="pl-btn sm" @click="router.push({ path: '/moliya', query: { kassa_id: k.id } })">Harakatlar</button>
                <template v-if="yaratadi">
                  <button class="pl-btn sm" @click="kassaOch(k)">Tahrirlash</button>
                  <button class="pl-btn sm pl-btn--x" @click="kassaOchir(k)">O'chirish</button>
                </template>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!kassalar.length && !yuklanmoqda && !xato" class="pl-bosh"><b>Hali kassa yo'q</b>Avval naqd kassa, keyin har viloyat uchun plastik kassa qo'shing — agentlar plastik to'lovni shu kassalarga qabul qiladi.</div>
      <div v-if="yuklanmoqda && !kassalar.length" class="pl-bosh">Yuklanmoqda…</div>
    </div>

    <!-- ══ 2. Plastik to'lovlar ══ -->
    <template v-if="tab === 'plastik'">
      <div class="pl-fil">
        <div class="pl-seg">
          <button v-for="h in [['kutilmoqda', 'Kutilmoqda'], ['tasdiqlangan', 'Tasdiqlangan'], ['rad_etildi', 'Rad etilgan'], ['', 'Hammasi']]" :key="h[0]" :class="{ on: pf.holat === h[0] }" @click="pf.holat = h[0]; filtr(pf)">{{ h[1] }}</button>
        </div>
        <select v-model="pf.tur" @change="filtr(pf)"><option value="">Barcha turlar</option><option value="qarz_tolov">Qarz to'lovi</option><option value="sotuv">Sotuv</option></select>
        <select v-model="pf.agent_id" @change="filtr(pf)"><option value="">Barcha agentlar</option><option v-for="a in agentlar" :key="a.id" :value="a.id">{{ a.fullname }}</option></select>
        <select v-model="pf.kassa_id" @change="filtr(pf)"><option value="">Barcha kassalar</option><option v-for="k in kassalar.filter(x => x.tur === 'plastik')" :key="k.id" :value="k.id">{{ k.nomi }}</option></select>
        <input v-model="pf.dan" type="date" :max="pf.gacha || undefined" @change="filtr(pf)"/><span class="pl-mut">—</span><input v-model="pf.gacha" type="date" :min="pf.dan || undefined" @change="filtr(pf)"/>
      </div>
      <div class="pl-card">
        <table class="pl-tbl">
          <thead><tr><th>Sana</th><th>Agent</th><th>Mijoz</th><th>Tur</th><th>Kassa</th><th class="r">Summa</th><th>Chek</th><th>Holat</th><th></th></tr></thead>
          <tbody>
            <tr v-for="r in plastik" :key="r.id" class="bos" @click="amalOch('plastik', 'korish', r)">
              <td>{{ vaqt(r.sana) }}</td>
              <td>{{ r.agent_nomi }}<small>{{ r.territoriya_nomi || '' }}</small></td>
              <td>{{ r.mijoz_nomi || '—' }}</td>
              <td>
                <template v-if="r.tur === 'sotuv'">Sotuv<small>{{ r.ariza_raqam || '' }}</small></template>
                <template v-else>Qarz to'lovi</template>
              </td>
              <td>{{ r.kassa_nomi || '—' }}</td>
              <td class="r m">{{ fmt(r.summa) }}<small v-if="r.izoh">{{ r.izoh }}</small></td>
              <td @click.stop><button v-if="r.chek_rasm" class="pl-link" @click="chekOch(r.chek_rasm)">{{ chekNomi(r.chek_rasm) }}</button><span v-else class="pl-mut">Chek yo'q</span></td>
              <td>
                <span class="pl-bg" :class="HOLAT[r.holat]?.[1]">{{ HOLAT[r.holat]?.[0] || r.holat }}</span>
                <small v-if="r.tasdiqlagan_nomi">{{ r.tasdiqlagan_nomi }} · {{ vaqt(r.tasdiq_vaqt) }}</small>
                <small v-if="r.rad_sababi" class="pl-neg">{{ r.rad_sababi }}</small>
              </td>
              <td @click.stop>
                <div v-if="r.holat === 'kutilmoqda' && tasdiqlaydi" class="pl-amal">
                  <button class="pl-btn sm pl-btn--ok" @click="amalOch('plastik', 'tasdiqla', r)">Tasdiqlash</button>
                  <button class="pl-btn sm" @click="amalOch('plastik', 'tahrir', r)">Tahrirlash</button>
                  <button class="pl-btn sm pl-btn--x" @click="amalOch('plastik', 'rad', r)">Rad etish</button>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot v-if="plastik.length"><tr><td colspan="5">Jami: {{ plastikJami.soni }} ta</td><td class="r m">{{ fmt(plastikJami.summa) }}</td><td colspan="3"></td></tr></tfoot>
        </table>
        <div v-if="!plastik.length && !yuklanmoqda && !xato" class="pl-bosh"><b>{{ pf.holat === 'kutilmoqda' ? "Tasdiq kutayotgan plastik to'lov yo'q" : "Bu filtr bo'yicha to'lov yo'q" }}</b>Agent ilovadan plastik to'lov qabul qilganda shu yerda chiqadi.</div>
        <div v-if="yuklanmoqda && !plastik.length" class="pl-bosh">Yuklanmoqda…</div>
      </div>
      <div v-if="plastik.length >= LIMIT || pf.page > 1" class="pl-sah">
        <button class="pl-btn sm" :disabled="pf.page <= 1" @click="pf.page--; yukla()">‹ Oldingi</button><span>{{ pf.page }}-sahifa</span><button class="pl-btn sm" :disabled="plastik.length < LIMIT" @click="pf.page++; yukla()">Keyingi ›</button>
      </div>
    </template>

    <!-- ══ 3. Topshiruvlar ══ -->
    <template v-if="tab === 'topshiruvlar'">
      <div class="pl-fil">
        <div class="pl-seg">
          <button v-for="h in [['kutilmoqda', 'Kutilmoqda'], ['tasdiqlangan', 'Tasdiqlangan'], ['rad_etildi', 'Rad etilgan'], ['', 'Hammasi']]" :key="h[0]" :class="{ on: tf.holat === h[0] }" @click="tf.holat = h[0]; filtr(tf)">{{ h[1] }}</button>
        </div>
        <div class="pl-seg">
          <button v-for="u in [['', 'Hammasi'], ['naqd', 'Naqd'], ['karta', 'Karta']]" :key="u[0]" :class="{ on: tf.usul === u[0] }" @click="tf.usul = u[0]; filtr(tf)">{{ u[1] }}</button>
        </div>
        <select v-model="tf.agent_id" @change="filtr(tf)"><option value="">Barcha agentlar</option><option v-for="a in agentlar" :key="a.id" :value="a.id">{{ a.fullname }}</option></select>
        <input v-model="tf.dan" type="date" :max="tf.gacha || undefined" @change="filtr(tf)"/><span class="pl-mut">—</span><input v-model="tf.gacha" type="date" :min="tf.dan || undefined" @change="filtr(tf)"/>
      </div>
      <div class="pl-card">
        <table class="pl-tbl">
          <thead><tr><th>Sana</th><th>Agent</th><th>Usul</th><th class="r">Summa</th><th class="r">Agent qo'lida</th><th>Kassa</th><th>Chek</th><th>Holat</th><th></th></tr></thead>
          <tbody>
            <tr v-for="r in topshiruv" :key="r.id" class="bos" @click="amalOch('topshiruv', 'korish', r)">
              <td>{{ vaqt(r.sana) }}</td>
              <td>{{ r.agent_nomi }}</td>
              <td><span class="pl-bg" :class="r.usul === 'karta' ? 'pl-bg--pl' : 'pl-bg--ok'">{{ r.usul === 'karta' ? 'Karta' : 'Naqd' }}</span></td>
              <td class="r m">{{ fmt(r.summa) }}<small v-if="r.izoh">{{ r.izoh }}</small></td>
              <td class="r m" :class="{ 'pl-neg': r.agent_qolda < Number(r.summa) && r.holat === 'kutilmoqda' }" :title="r.agent_qolda < Number(r.summa) && r.holat === 'kutilmoqda' ? 'Agent qo\'lidagi naqd topshiruv summasidan kam — tasdiqlab bo\'lmaydi' : ''">{{ r.agent_qolda == null ? '—' : fmt(r.agent_qolda) }}</td>
              <td>{{ r.kassa_nomi || '—' }}</td>
              <td @click.stop><button v-if="r.chek_rasm" class="pl-link" @click="chekOch(r.chek_rasm)">{{ chekNomi(r.chek_rasm) }}</button><span v-else class="pl-mut">{{ r.usul === 'karta' ? "Chek yo'q" : '—' }}</span></td>
              <td>
                <span class="pl-bg" :class="HOLAT[r.holat]?.[1]">{{ HOLAT[r.holat]?.[0] || r.holat }}</span>
                <small v-if="r.tasdiqlagan_nomi">{{ r.tasdiqlagan_nomi }} · {{ vaqt(r.tasdiq_vaqt) }}</small>
                <small v-if="r.rad_sababi" class="pl-neg">{{ r.rad_sababi }}</small>
              </td>
              <td @click.stop>
                <div v-if="r.holat === 'kutilmoqda' && tasdiqlaydi" class="pl-amal">
                  <button class="pl-btn sm pl-btn--ok" @click="amalOch('topshiruv', 'tasdiqla', r)">Tasdiqlash</button>
                  <button class="pl-btn sm pl-btn--x" @click="amalOch('topshiruv', 'rad', r)">Rad etish</button>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot v-if="topshiruv.length"><tr><td colspan="3">Jami: {{ topshiruvJami.soni }} ta</td><td class="r m">{{ fmt(topshiruvJami.summa) }}</td><td colspan="5"></td></tr></tfoot>
        </table>
        <div v-if="!topshiruv.length && !yuklanmoqda && !xato" class="pl-bosh"><b>{{ tf.holat === 'kutilmoqda' ? "Tasdiq kutayotgan topshiruv yo'q" : "Bu filtr bo'yicha topshiruv yo'q" }}</b>Agent ilovadan naqd yoki karta orqali pul topshirganda shu yerda chiqadi.</div>
        <div v-if="yuklanmoqda && !topshiruv.length" class="pl-bosh">Yuklanmoqda…</div>
      </div>
      <div v-if="topshiruv.length >= LIMIT || tf.page > 1" class="pl-sah">
        <button class="pl-btn sm" :disabled="tf.page <= 1" @click="tf.page--; yukla()">‹ Oldingi</button><span>{{ tf.page }}-sahifa</span><button class="pl-btn sm" :disabled="topshiruv.length < LIMIT" @click="tf.page++; yukla()">Keyingi ›</button>
      </div>
    </template>

    <!-- Kassa formasi -->
    <div v-if="km.ochiq" class="pl-ov" @mousedown.self="km.ochiq = false">
      <div class="pl-m">
        <div class="pl-m-hd"><div><h3>{{ km.id ? 'Kassani tahrirlash' : "Kassa qo'shish" }}</h3><p>Kassa nomi agent ilovasida to'lov turi sifatida ko'rinadi</p></div><button class="pl-m-x" @click="km.ochiq = false">×</button></div>
        <div class="pl-m-bd">
          <label class="pl-f"><span>Nomi <i>*</i></span><input v-model="km.nomi" maxlength="100" placeholder="Masalan: Uzcard 8600 (Farg'ona)" @keydown.enter="kassaSaqla"/></label>
          <div class="pl-f"><span>Tur <i>*</i></span>
            <div class="pl-seg" style="align-self:flex-start">
              <button type="button" :class="{ on: km.tur === 'naqd' }" :disabled="!!km.id && km.tur !== 'naqd'" @click="km.tur = 'naqd'">Naqd</button>
              <button type="button" :class="{ on: km.tur === 'plastik' }" :disabled="!!km.id && km.tur !== 'plastik'" @click="km.tur = 'plastik'">Plastik (karta)</button>
            </div>
          </div>
          <div v-if="km.tur === 'plastik'" class="pl-f"><span>Viloyatlar <i>*</i></span>
            <div class="pl-chk">
              <label v-for="v in viloyatlar" :key="v.id" :class="{ on: km.viloyat_idlar.includes(v.id) }"><input type="checkbox" :checked="km.viloyat_idlar.includes(v.id)" @change="viloyatBos(v.id)"/>{{ v.nomi }}</label>
              <span v-if="!viloyatlar.length" class="pl-mut">Viloyatlar yo'q — Sozlamalar → Hudud bo'limida qo'shing</span>
            </div>
            <small class="pl-mut">Shu viloyatlardagi agentlar bu kassani ilovada ko'radi</small>
          </div>
          <label class="pl-f"><span>Izoh</span><input v-model="km.izoh" maxlength="255" placeholder="Ixtiyoriy"/></label>
          <p v-if="km.xato" class="pl-err">{{ km.xato }}</p>
        </div>
        <div class="pl-m-ft"><button class="pl-btn" @click="km.ochiq = false">Bekor qilish</button><button class="pl-btn pl-btn--p" :disabled="band" @click="kassaSaqla">{{ band ? 'Saqlanmoqda…' : 'Saqlash' }}</button></div>
      </div>
    </div>

    <!-- Tasdiqlash / rad / tahrir / tafsilot -->
    <div v-if="am.ochiq" class="pl-ov" @mousedown.self="am.ochiq = false">
      <div class="pl-m">
        <div class="pl-m-hd">
          <div><h3>{{ am.nav === 'plastik' ? "Plastik to'lov" : 'Topshiruv' }} — {{ AMAL_NOM[am.amal] }}</h3><p>{{ am.r.agent_nomi }} · {{ vaqt(am.r.sana) }}</p></div>
          <button class="pl-m-x" @click="am.ochiq = false">×</button>
        </div>
        <div class="pl-m-bd">
          <dl class="pl-kv">
            <dt>Summa</dt><dd>{{ fmt(am.r.summa) }} so'm</dd>
            <template v-if="am.nav === 'plastik'">
              <dt>Mijoz</dt><dd>{{ am.r.mijoz_nomi || '—' }}</dd>
              <dt>Tur</dt><dd>{{ am.r.tur === 'sotuv' ? `Sotuv ${am.r.ariza_raqam || ''}` : "Qarz to'lovi" }}</dd>
              <dt>Kassa</dt><dd>{{ am.r.kassa_nomi || '—' }}</dd>
            </template>
            <template v-else>
              <dt>Usul</dt><dd>{{ am.r.usul === 'karta' ? 'Karta' : 'Naqd' }}</dd>
              <dt>Agent qo'lidagi naqd</dt><dd :class="{ 'pl-neg': am.r.agent_qolda < 0 }">{{ am.r.agent_qolda == null ? '—' : fmt(am.r.agent_qolda) + " so'm" }}</dd>
              <template v-if="am.r.usul === 'karta' || am.r.kassa_nomi"><dt>Kassa</dt><dd>{{ am.r.kassa_nomi || '—' }}</dd></template>
            </template>
            <template v-if="am.r.izoh"><dt>Izoh</dt><dd>{{ am.r.izoh }}</dd></template>
            <dt>Chek</dt><dd><button v-if="am.r.chek_rasm" class="pl-link" @click="chekOch(am.r.chek_rasm)">Chekni ochish</button><span v-else class="pl-mut">Chek yo'q</span></dd>
            <dt>Holat</dt><dd><span class="pl-bg" :class="HOLAT[am.r.holat]?.[1]">{{ HOLAT[am.r.holat]?.[0] || am.r.holat }}</span></dd>
            <template v-if="am.r.rad_sababi"><dt>Rad sababi</dt><dd class="pl-neg">{{ am.r.rad_sababi }}</dd></template>
          </dl>

          <template v-if="am.amal === 'tasdiqla'">
            <p v-if="am.nav === 'plastik'" class="pl-mut" style="margin:0;font-size:12.5px">Tasdiqlansa: mijoz qarzi shu summaga kamayadi, pul "{{ am.r.kassa_nomi }}" kassasiga tushadi. Chekdagi summa va kartani solishtiring.</p>
            <label v-if="naqdTopshiruv" class="pl-f"><span>Pul qaysi naqd kassaga tushadi <i>*</i></span>
              <select v-model="am.kassa_id"><option value="">— Naqd kassani tanlang —</option><option v-for="k in naqdKassalar" :key="k.id" :value="k.id">{{ k.nomi }} · {{ fmt(k.balans) }} so'm</option></select>
              <small v-if="!naqdKassalar.length" class="pl-neg">Faol naqd kassa yo'q — avval Kassalar yorlig'ida qo'shing</small>
            </label>
            <p v-else-if="am.nav === 'topshiruv'" class="pl-mut" style="margin:0;font-size:12.5px">Karta topshiruvi: pul agent tanlagan "{{ am.r.kassa_nomi }}" kassasiga tushadi. Chekni tekshiring.</p>
            <label class="pl-f"><span>Izoh</span><input v-model="am.izoh" maxlength="255" placeholder="Ixtiyoriy"/></label>
          </template>

          <template v-if="am.amal === 'tahrir'">
            <label class="pl-f"><span>Summa</span><input v-model.number="am.summa" type="number" min="1" step="1"/></label>
            <label class="pl-f"><span>Plastik kassa</span>
              <select v-model="am.kassa_id"><option v-for="k in plastikKassalar" :key="k.id" :value="k.id">{{ k.nomi }}</option></select>
            </label>
          </template>

          <label v-if="am.amal === 'rad' || am.amal === 'tahrir'" class="pl-f"><span>Sabab <i>*</i></span>
            <textarea v-model="am.sabab" rows="2" maxlength="500" :placeholder="am.amal === 'rad' ? 'Nima uchun rad etilyapti — agent ko\'radi' : 'Nima uchun o\'zgartirilyapti — tarixda saqlanadi'"/>
          </label>

          <div v-if="am.audit.length" class="pl-f"><span>Tarix</span>
            <div class="pl-audit">
              <div v-for="a in am.audit" :key="a.id"><b>{{ AUDIT_NOM[a.amal] || a.amal }}</b> · {{ a.user_nomi || '—' }} <small>· {{ vaqt(a.vaqt) }}</small><template v-if="auditFarq(a)"><br/>{{ auditFarq(a) }}</template><template v-if="a.sabab"><br/><small>Sabab: {{ a.sabab }}</small></template></div>
            </div>
          </div>
          <p v-if="am.xato" class="pl-err">{{ am.xato }}</p>
        </div>
        <div class="pl-m-ft">
          <button class="pl-btn" @click="am.ochiq = false">{{ am.amal === 'korish' ? 'Yopish' : 'Bekor qilish' }}</button>
          <button v-if="am.amal === 'tasdiqla'" class="pl-btn pl-btn--ok" :disabled="band" @click="amalBajar">{{ band ? 'Bajarilmoqda…' : 'Tasdiqlash' }}</button>
          <button v-if="am.amal === 'rad'" class="pl-btn pl-btn--x" :disabled="band" @click="amalBajar">{{ band ? 'Bajarilmoqda…' : 'Rad etish' }}</button>
          <button v-if="am.amal === 'tahrir'" class="pl-btn pl-btn--p" :disabled="band" @click="amalBajar">{{ band ? 'Saqlanmoqda…' : 'Saqlash' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
