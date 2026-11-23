<script setup>
/* QAYTARISHLAR — agent mijozdan qaytarib olgan tovarlar tarixi (backend §19, GET /avtolavka/qaytarishlar).
   Qaytarish aniq bir sotuvga bog'langan: sotuv summasi qaytarilgan qismga kamayadi.
   To'lov: 'qarz' — mijoz balansiga (qarzdan ayirildi), 'naqd' — agent mijozga naqd qaytardi. */
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { avtolavkaApi, agentApi } from '@/api/api'

const route = useRoute()
const fmt = (v) => Math.round(Number(v) || 0).toLocaleString('ru-RU').replace(/,/g, ' ')
const miq = (v) => { const n = Number(v) || 0; return Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/0+$/, '') }
const vaqt = (s) => { if (!s) return '—'; const d = new Date(s); return isNaN(+d) ? String(s) : d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) }
const kun = (d) => { const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` }
const xatoMatn = (e) => (e?.message === 'session_expired' ? '' : e?.status === 403 ? "Ruxsat yo'q" : e?.status === 404 ? "Bu bo'lim serverda hali yo'q — backend yangilanishi kerak" : e?.message || 'Xatolik')

const bugun = new Date(), oyBoshi = new Date(bugun.getFullYear(), bugun.getMonth(), 1)
const f = reactive({ dan: kun(oyBoshi), gacha: kun(bugun), agent_id: route.query.agent ? String(route.query.agent) : '', mijoz_id: route.query.mijoz ? String(route.query.mijoz) : '', viloyat_id: '', page: 1 })
const LIMIT = 50
const rows = ref([]), jami = ref({ soni: 0, summa: 0, naqd: 0, balansga: 0 })
const agentlar = ref([]), viloyatlar = ref([])
const yuklanmoqda = ref(false), xato = ref('')

async function yukla() {
  if (f.dan && f.gacha && f.dan > f.gacha) { xato.value = "Boshlanish sanasi tugash sanasidan keyin bo'lmasin"; return }
  yuklanmoqda.value = true; xato.value = ''
  try {
    const p = Object.fromEntries(Object.entries({ ...f, limit: LIMIT }).filter(([, v]) => v !== '' && v != null))
    const d = await avtolavkaApi.qaytarishlar(p)
    rows.value = d?.data || []; jami.value = d?.jami || { soni: 0, summa: 0, naqd: 0, balansga: 0 }
  } catch (e) { xato.value = xatoMatn(e); rows.value = [] } finally { yuklanmoqda.value = false }
}
const filtr = () => { f.page = 1; yukla() }
// Sotuv qaytarishdan oldin bo'lgan — jurnal 90 kun orqadan qidiradi
const sotuvYol = (r) => { const g = new Date(r.sana), d = new Date(g); d.setDate(d.getDate() - 90); return { path: '/avtolavka/sotuvlar', query: { q: r.sotuv.raqam, dan: kun(d), gacha: kun(g) } } }

const t = reactive({ ochiq: false, r: null, qatorlar: [], yuklanmoqda: false, xato: '' })
async function och(r) {
  Object.assign(t, { ochiq: true, r, qatorlar: [], yuklanmoqda: true, xato: '' })
  try { const d = await avtolavkaApi.qaytarish(r.id); t.r = { ...r, ...d }; t.qatorlar = d?.qatorlar || [] }
  catch (e) { t.xato = xatoMatn(e) } finally { t.yuklanmoqda = false }
}

onMounted(() => {
  agentApi.spravochnik().then(d => { agentlar.value = d?.agentlar || []; viloyatlar.value = d?.territoriyalar || [] }).catch(() => {})
  yukla()
})
</script>

<template>
  <div class="pl">
    <div class="pl-hd">
      <div><h1>Qaytarishlar</h1><p>Agent mijozdan qaytarib olgan tovarlar. Har qaytarish o'z sotuviga bog'langan — sotuv summasi shu qismga kamaygan</p></div>
      <div class="pl-hd-r"><button class="pl-btn" :disabled="yuklanmoqda" @click="yukla">Yangilash</button></div>
    </div>

    <div class="pl-kpi">
      <div class="pl-k"><small>Qaytarishlar</small><b>{{ jami.soni || 0 }}</b><em>ta · tanlangan davrda</em></div>
      <div class="pl-k"><small>Jami summa</small><b>{{ fmt(jami.summa) }}</b><em>so'm</em></div>
      <div class="pl-k"><small>Balansga</small><b>{{ fmt(jami.balansga) }}</b><em>so'm · mijoz qarzidan ayirildi</em></div>
      <div class="pl-k"><small>Naqd qaytarildi</small><b>{{ fmt(jami.naqd) }}</b><em>so'm · agent mijozga berdi</em></div>
    </div>

    <div class="pl-fil">
      <input v-model="f.dan" type="date" :max="f.gacha || undefined" @change="filtr"/><span class="pl-mut">—</span><input v-model="f.gacha" type="date" :min="f.dan || undefined" @change="filtr"/>
      <select v-model="f.agent_id" @change="filtr"><option value="">Barcha agentlar</option><option v-for="a in agentlar" :key="a.id" :value="a.id">{{ a.fullname }}</option></select>
      <select v-model="f.viloyat_id" @change="filtr"><option value="">Barcha viloyatlar</option><option v-for="v in viloyatlar" :key="v.id" :value="v.id">{{ v.nomi }}</option></select>
      <button v-if="f.mijoz_id" class="pl-btn sm" @click="f.mijoz_id = ''; filtr()">Mijoz filtri × </button>
    </div>

    <p v-if="xato" class="pl-err">{{ xato }}</p>

    <div class="pl-card">
      <table class="pl-tbl">
        <thead><tr><th>Sana</th><th>Agent</th><th>Mijoz</th><th>Viloyat</th><th>Sotuv</th><th class="r">Summa</th><th>Qayerga</th><th class="r">Qator</th></tr></thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id" class="bos" @click="och(r)">
            <td>{{ vaqt(r.sana) }}</td>
            <td>{{ r.agent?.nomi || '—' }}</td>
            <td>{{ r.mijoz?.nomi || '—' }}</td>
            <td>{{ r.viloyat?.nomi || '—' }}</td>
            <td @click.stop><RouterLink v-if="r.sotuv?.raqam" :to="sotuvYol(r)" class="pl-link" title="Sotuv chekini ochish">{{ r.sotuv.raqam }}</RouterLink><span v-else>—</span></td>
            <td class="r m">{{ fmt(r.summa) }}<small v-if="Number(r.yaroqsiz_summa)">yaroqsiz {{ fmt(r.yaroqsiz_summa) }}</small></td>
            <td><span class="pl-bg" :class="r.tolov === 'naqd' ? 'pl-bg--kut' : 'pl-bg--ok'" :title="r.tolov_nomi || ''">{{ r.tolov === 'naqd' ? 'Naqd' : 'Balansga' }}</span></td>
            <td class="r">{{ r.qator_soni ?? '—' }}</td>
          </tr>
        </tbody>
        <tfoot v-if="rows.length"><tr><td colspan="5">Jami: {{ jami.soni }} ta · balansga {{ fmt(jami.balansga) }} · naqd {{ fmt(jami.naqd) }}</td><td class="r m">{{ fmt(jami.summa) }}</td><td colspan="2"></td></tr></tfoot>
      </table>
      <div v-if="!rows.length && !yuklanmoqda && !xato" class="pl-bosh"><b>Bu davrda qaytarish yo'q</b>Agent ilovada sotuvni ochib qaytarish qilganda shu yerda chiqadi.</div>
      <div v-if="yuklanmoqda && !rows.length" class="pl-bosh">Yuklanmoqda…</div>
    </div>
    <div v-if="rows.length >= LIMIT || f.page > 1" class="pl-sah">
      <button class="pl-btn sm" :disabled="f.page <= 1" @click="f.page--; yukla()">‹ Oldingi</button><span>{{ f.page }}-sahifa</span><button class="pl-btn sm" :disabled="rows.length < LIMIT" @click="f.page++; yukla()">Keyingi ›</button>
    </div>

    <div v-if="t.ochiq" class="pl-ov" @mousedown.self="t.ochiq = false">
      <div class="pl-m pl-m--keng">
        <div class="pl-m-hd"><div><h3>Qaytarish — {{ t.r.sotuv?.raqam || '#' + t.r.id }}</h3><p>{{ t.r.agent?.nomi }} · {{ t.r.mijoz?.nomi }} · {{ vaqt(t.r.sana) }}</p></div><button class="pl-m-x" @click="t.ochiq = false">×</button></div>
        <div class="pl-m-bd">
          <dl class="pl-kv">
            <dt>Qaytarilgan summa</dt><dd>{{ fmt(t.r.summa) }} so'm</dd>
            <dt>Sotuv summasi</dt><dd>{{ fmt(t.r.eski_jami) }} → {{ fmt(t.r.yangi_jami) }} so'm</dd>
            <dt>Pul</dt><dd>{{ t.r.tolov_nomi || (t.r.tolov === 'naqd' ? 'Naqd qaytarildi' : 'Balansga') }}</dd>
            <dt>Yaroqli / yaroqsiz</dt><dd>{{ fmt(t.r.yaroqli_summa) }} / {{ fmt(t.r.yaroqsiz_summa) }} so'm</dd>
            <template v-if="t.r.izoh"><dt>Izoh</dt><dd>{{ t.r.izoh }}</dd></template>
          </dl>
          <p v-if="t.xato" class="pl-err">{{ t.xato }}</p>
          <div v-if="t.yuklanmoqda" class="pl-bosh">Yuklanmoqda…</div>
          <div v-else-if="t.qatorlar.length" class="pl-card">
            <table class="pl-tbl">
              <thead><tr><th>Tovar</th><th class="r">Miqdor</th><th class="r">Narx</th><th class="r">Summa</th><th>Holat</th><th>Sabab</th></tr></thead>
              <tbody>
                <tr v-for="q in t.qatorlar" :key="q.id">
                  <td>{{ q.tovar_nomi }}<small v-if="q.ombor">{{ q.ombor }}</small></td>
                  <td class="r m">{{ miq(q.miqdor) }}</td>
                  <td class="r">{{ fmt(q.narx) }}</td>
                  <td class="r m">{{ fmt(q.summa) }}</td>
                  <td><span class="pl-bg" :class="q.holat === 'yaroqsiz' ? 'pl-bg--rad' : 'pl-bg--ok'">{{ q.holat === 'yaroqsiz' ? 'Yaroqsiz (brak)' : 'Yaroqli' }}</span></td>
                  <td>{{ q.sabab || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="pl-m-ft"><button class="pl-btn" @click="t.ochiq = false">Yopish</button></div>
      </div>
    </div>
  </div>
</template>
