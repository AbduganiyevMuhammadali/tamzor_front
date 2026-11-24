<script setup lang="ts">
/* AVTOLAVKA MARKAZI — butun jarayon bitta ekranda.
   Har mashina = bir qator: holat, kun chizig'i (07:00 → 20:00) — yuklash, har
   tashrif, qabul, kassa shu chiziqda belgi bo'lib turadi — va keyingi amal.
   Kartaga bosilsa — o'sha kun paneli: faqat keyingi qadam, bir bosishda. */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import KunPanel from './KunPanel.vue'
import YukBerish from '@/components/YukBerish.vue'
// @ts-ignore
import { avtolavkaApi, kassalarApi } from '@/api/api'

const route = useRoute()
const router = useRouter()

const BOSQICH = [
  { nom: 'Yuk berish kutilmoqda', rang: '#94a3b8' },
  { nom: 'Savdoda', rang: '#7c3aed' },
  { nom: 'Topshirmoqda', rang: '#d97706' },
  { nom: 'Kun yopildi', rang: '#059669' },
]
const KAMOMAD = '#dc2626'
const HOLAT_RANG: Record<string, string> = { ochiq: '#7c3aed', topshirilmoqda: '#d97706', yopiq: '#059669', kamomad: KAMOMAD }
const HOLAT_NOM: Record<string, string> = { bosh: 'Yuk olmagan', ochiq: 'Savdoda', topshirilmoqda: 'Topshirilmoqda', yopiq: 'Yopiq', kamomad: 'Kamomad' }

const bugun = () => new Date().toISOString().slice(0, 10)
const sana = ref<string>(typeof route.query.sana === 'string' ? route.query.sana : bugun())
const doska = ref<any>(null)
const kalendar = ref<any>(null)
const yuklanmoqda = ref(false)
/* Yuk berish — oddiy oyna: istalgan payt, istalgan agentga (tavsiya va kun bosqichiga bog'liq emas) */
const yukOyna = ref<{ ochiq: boolean; agentId: number | null }>({ ochiq: false, agentId: null })
const panelKalit = ref(0)
function yukOch(agentId: number | null = null) { yukOyna.value = { ochiq: true, agentId } }
function yukBerildi() { panelKalit.value++; yukla(true) }
const tanlangan = ref<number | null>(route.query.agent ? Number(route.query.agent) : null)
const hozir = ref(new Date())
let taymer: ReturnType<typeof setInterval> | null = null
let soat: ReturnType<typeof setInterval> | null = null

const bugunmi = computed(() => sana.value === bugun())
const mashinalar = computed<any[]>(() => doska.value?.mashinalar || [])
const jami = computed(() => doska.value?.jami || {})
const pulMap = ref<Map<number, any> | null>(null)
const qolda = (m: any) => pulMap.value?.get(m.agent.id)?.qolda
const qoldaJami = computed(() => (pulMap.value ? mashinalar.value.reduce((s: number, m: any) => s + (Number(qolda(m)) || 0), 0) : null))

// Miqdor kg'da, 3 xonagacha — yaxlitlanmaydi (1,234 kg)
const fmtDona = (v: number) => (Number(v) || 0).toLocaleString('ru-RU', { maximumFractionDigits: 3 })
const fmtSum = (v: number) => new Intl.NumberFormat('ru-RU').format(Math.round(Number(v) || 0))
const fmtMln = (v: number) => { const n = Number(v) || 0; return n >= 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(Math.round(n)) }
const fmtMlnU = (v: number) => (Number(v) || 0) >= 1e6 ? 'mln so\'m' : 'so\'m'
const fmtVaqt = (s: string | Date) => { const d = new Date(s); return isNaN(+d) ? '' : d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) }
const HAFTA = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba']
const OYLAR = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr']
const fmtSanaUzun = (s: string) => { const d = new Date(s + 'T00:00:00'); return isNaN(+d) ? s : `${d.getDate()}-${OYLAR[d.getMonth()]}, ${HAFTA[d.getDay()]}` }
const kunHarf = (s: string) => ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'][new Date(s + 'T00:00:00').getDay()]

const rangOf = (m: any) => (m.holat === 'kamomad' ? KAMOMAD : BOSQICH[m.bosqich]?.rang || '#94a3b8')
const holatNom = (m: any) => (m.holat === 'kamomad' ? 'Kamomad' : QISQA[m.bosqich] || '')

/* Jadval: yuk berilgan agentlar tepada, keyin ism bo'yicha */
const berildi = (m: any) => Number(m.tovar?.berildi?.dona) || 0
const naqd = (m: any) => { const q = qolda(m); return q != null ? Number(q) || 0 : (m.pul.inkassatsiya ? 0 : Number(m.pul.naqd_olindi) || 0) }
const tartibli = computed<any[]>(() => [...mashinalar.value].sort((a, b) =>
  (Number(b.bosqich > 0) - Number(a.bosqich > 0)) || String(a.agent.fullname).localeCompare(String(b.agent.fullname))))
const yukOlganSoni = computed(() => mashinalar.value.filter(m => m.bosqich > 0).length)
const jamiQator = computed(() => mashinalar.value.reduce((s, m) => ({
  berildi: s.berildi + berildi(m), sotildi: s.sotildi + (Number(m.tovar.sotildi.dona) || 0), agentda: s.agentda + (Number(m.mashina.dona) || 0),
  naqd: s.naqd + naqd(m), qarz: s.qarz + (Number(m.pul.qarzga_sotuv) || 0),
}), { berildi: 0, sotildi: 0, agentda: 0, naqd: 0, qarz: 0 }))
/* Ikonlar (24×24, chiziqli) — nav.ts dagi IK bilan bir uslubda */
const IKON = {
  mashina: '<path d="M2 6h11v10H2z"/><path d="M13 9h4.2l3.8 4.2V16h-8"/><circle cx="6.5" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/>',
  quti: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  hamyon: '<path d="M18 9V6a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V7"/><circle cx="16.5" cy="14.5" r="1.2"/>',
  osish: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  ogoh: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  kalendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  yukla: '<path d="M12 3v12m0 0-4-4m4 4 4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
  tasdiq: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 5-5.5"/>',
  qabul: '<path d="M3 13h5l2 3h4l2-3h5"/><path d="M5.5 5h13L21 13v6H3v-6z"/>',
  hujjat: '<path d="M14 2.5H6.5A2 2 0 0 0 4.5 4.5v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8z"/><path d="M14 2.5V8h5.5M8.5 13h7M8.5 17h4.5"/>',
  koz: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
}
/* Qatordagi ikkinchi tugma — qisqa matn */
function korish(m: any) {
  if (!bugunmi.value) return 'Ko\'rish'
  if (m.sorovlar?.length) return 'So\'rov'
  if ((m.kun_yopish && m.bosqich < 3 && !m.topshirish.tovar) || m.bosqich === 2) return 'Qabul qilish'
  return m.bosqich === 3 ? 'Hisobot' : 'Ko\'rish'
}
const QISQA = ['Yuk olmagan', 'Savdoda', 'Topshirmoqda', 'Kun yopildi']

const agentQabulKutmoqda = (m: any) => (m.kun?.agent_qabul?.yuklash || 0) > (m.kun?.agent_qabul?.qabul || 0)

/* Sarlavha ostidagi bir jumlalik holat */
const sarlavha = computed(() => {
  const j = jami.value
  if (!j.mashina) return 'Van Sell agenti yo\'q'
  if (!bugunmi.value) return `${j.mashina} agent · ${j.yopiq} tasi yopilgan`
  const q: string[] = []
  if (j.sorov) q.push(`${j.sorov} ta so'rov kutmoqda`)
  if (j.topshirishga_keldi) q.push(`${j.topshirishga_keldi} tasi topshirishga keldi`)
  if (j.yolda) q.push(`${j.yolda} tasi yo'lda`)
  if (j.yuklanmagan) q.push(`${j.yuklanmagan} tasi yuk olmagan`)
  if (j.yopiq) q.push(`${j.yopiq} tasi yopildi`)
  return `${j.mashina} agent · ${q.join(' · ')}`
})

async function yukla(jimgina = false) {
  if (!jimgina) yuklanmoqda.value = true
  try {
    const [d, k] = await Promise.all([avtolavkaApi.doska({ sana: sana.value }), avtolavkaApi.kalendar({ kun: 14 })])
    doska.value = d; kalendar.value = k
    // Agent qo'lidagi naqd: naqd oldi − qaytardi − tasdiqlangan topshiruvlar (butun davr). Ruxsat yoki backend bo'lmasa — eski kunlik raqam
    kassalarApi.agentlar().then((a: any) => { pulMap.value = new Map((Array.isArray(a) ? a : []).map((x: any) => [x.id, x.pul])) }).catch(() => { pulMap.value = null })
  } catch (e) { console.error('Van Sell yuklanmadi', e) }
  finally { yuklanmoqda.value = false }
}
function kunSur(n: number) {
  const d = new Date(sana.value + 'T00:00:00'); d.setDate(d.getDate() + n)
  const s = d.toISOString().slice(0, 10)
  if (s <= bugun()) sana.value = s
}
function och(agentId: number, kun?: string) {
  if (kun) sana.value = kun
  tanlangan.value = agentId
}
watch(sana, () => { yukla(); router.replace({ query: { ...route.query, sana: sana.value === bugun() ? undefined : sana.value } }) })
watch(tanlangan, (v) => router.replace({ query: { ...route.query, agent: v ? String(v) : undefined } }))
function esc(e: KeyboardEvent) { if (e.key === 'Escape') tanlangan.value = null }

onMounted(() => {
  yukla()
  taymer = setInterval(() => { if (bugunmi.value && !tanlangan.value) yukla(true) }, 60000)
  soat = setInterval(() => { hozir.value = new Date() }, 20000)
  window.addEventListener('keydown', esc)
})
onUnmounted(() => { if (taymer) clearInterval(taymer); if (soat) clearInterval(soat); window.removeEventListener('keydown', esc) })
</script>

<template>
  <div class="al">
    <!-- ═══ SARLAVHA ═══ -->
    <header class="al-head">
      <div class="al-head-l">
        <span class="al-head-ic"><svg viewBox="0 0 24 24" v-html="IKON.mashina"/></span>
        <div>
        <h1 class="al-h1">Van Sell</h1>
        <p class="al-sub">
          {{ fmtSanaUzun(sana) }}<template v-if="bugunmi">, {{ fmtVaqt(hozir) }} holatiga</template>
          <span class="al-sep">·</span>{{ sarlavha }}
        </p>
        </div>
      </div>
      <button v-if="bugunmi" class="pl-btn sm pl-btn--p" style="margin-left:auto;margin-right:8px" @click="yukOch()">+ Yuk berish</button>
      <RouterLink to="/avtolavka/kochirish" class="pl-btn sm" style="margin-right:8px" title="Bir agentdagi tovarni boshqa agentga o'tkazish">Ko'chirishlar</RouterLink>
      <div class="al-date">
        <button class="al-date-b" title="Oldingi kun" @click="kunSur(-1)">
          <svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <input type="date" class="al-date-i" :max="bugun()" v-model="sana"/>
        <button class="al-date-b" title="Keyingi kun" :disabled="bugunmi" @click="kunSur(1)">
          <svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>
        </button>
        <button class="al-date-t" :disabled="bugunmi" @click="sana = bugun()">Bugun</button>
      </div>
    </header>

    <!-- ═══ KO'RSATKICHLAR ═══ -->
    <section class="al-kpi">
      <div class="al-k">
        <span class="al-k-ic"><svg viewBox="0 0 24 24" v-html="IKON.quti"/></span>
        <div class="al-k-b">
          <span class="al-k-l">Agentlardagi tovar</span>
          <b class="al-k-v">{{ fmtMln(jami.tovar_mashinada) }}<small>{{ fmtMlnU(jami.tovar_mashinada) }}</small></b>
          <span class="al-k-s">sotuv narxida, hali topshirilmagan</span>
        </div>
      </div>
      <div class="al-k">
        <span class="al-k-ic"><svg viewBox="0 0 24 24" v-html="IKON.hamyon"/></span>
        <div class="al-k-b">
          <span class="al-k-l">Agentlar qo'lidagi naqd</span>
          <b class="al-k-v">{{ fmtMln(qoldaJami ?? jami.naqd_qolda) }}<small>{{ fmtMlnU(qoldaJami ?? jami.naqd_qolda) }}</small></b>
          <span class="al-k-s">{{ qoldaJami != null ? 'hali topshirilmagan · Moliya → Topshiruvlar' : 'kassaga topshirilishi kerak' }}</span>
        </div>
      </div>
      <div class="al-k">
        <span class="al-k-ic"><svg viewBox="0 0 24 24" v-html="IKON.osish"/></span>
        <div class="al-k-b">
          <span class="al-k-l">{{ bugunmi ? 'Bugungi savdo' : 'Kunlik savdo' }}</span>
          <b class="al-k-v">{{ fmtMln(jami.sotuv) }}<small>{{ fmtMlnU(jami.sotuv) }}</small></b>
          <span class="al-k-s">naqd va qarzga</span>
        </div>
      </div>
      <div class="al-k" :class="{ bad: jami.kamomad_tovar > 0 || jami.kamomad_pul > 0 }">
        <span class="al-k-ic"><svg viewBox="0 0 24 24" v-html="IKON.ogoh"/></span>
        <div class="al-k-b">
          <span class="al-k-l">Kamomad</span>
          <b class="al-k-v">
            <template v-if="jami.kamomad_tovar > 0 || jami.kamomad_pul > 0">{{ jami.kamomad_tovar ? fmtDona(jami.kamomad_tovar) + ' kg' : '' }}{{ jami.kamomad_tovar && jami.kamomad_pul ? ' · ' : '' }}{{ jami.kamomad_pul ? fmtSum(jami.kamomad_pul) : '' }}</template>
            <template v-else>0</template>
          </b>
          <span class="al-k-s">yopilgan kunlar bo'yicha</span>
        </div>
      </div>
    </section>

    <!-- ═══ MASHINALAR ═══ -->
    <section class="al-card">
      <div class="al-card-hd">
        <h2><span class="al-h2-ic"><svg viewBox="0 0 24 24" v-html="IKON.mashina"/></span>Agentlar</h2>
        <span v-if="mashinalar.length" class="al-card-n">{{ yukOlganSoni }} / {{ mashinalar.length }} agentga yuk berilgan</span>
      </div>

      <div v-if="yuklanmoqda && !doska" class="al-empty">Yuklanmoqda…</div>
      <div v-else-if="!mashinalar.length" class="al-empty">
        <b>Van Sell rejimidagi agent yo'q</b>
        <span>Agentlar → ro'yxat → agentni tahrirlash → "Van Sell (ko'chma savdo)" belgisini yoqing</span>
      </div>

      <div v-else class="al-tw">
        <table class="al-t">
          <thead>
            <tr>
              <th>№</th>
              <th>Agent</th>
              <th>Holat</th>
              <th class="r">{{ bugunmi ? 'Bugun berildi' : 'Berildi' }}</th>
              <th class="r">Sotildi</th>
              <th class="r">Agentda qoldi</th>
              <th class="r">Qo'lida naqd</th>
              <th class="r">Qarzga</th>
              <th/>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(m, i) in tartibli" :key="m.agent.id" class="al-row" :class="{ on: tanlangan === m.agent.id }"
              :style="{ '--holat': rangOf(m) }" tabindex="0" title="Kun tafsilotini ochish" @click="och(m.agent.id)" @keydown.enter="och(m.agent.id)">
              <td class="al-n">{{ i + 1 }}</td>
              <td>
                <span class="al-name">{{ m.agent.fullname }}</span><span v-if="m.agent.mashina_raqam" class="al-plate">{{ m.agent.mashina_raqam }}</span>
                <div v-if="bugunmi && (m.sorovlar?.length || (m.kun_yopish && m.bosqich < 3) || m.kun.uzoq_sotuv || agentQabulKutmoqda(m)) || m.holat === 'kamomad'" class="al-flags">
                  <span v-if="bugunmi && m.sorovlar?.length" class="al-flag sorov" :title="`Agent ilovadan ${fmtDona(m.sorovlar[0].dona)} kg so'radi`">So'rov · {{ fmtDona(m.sorovlar[0].dona) }} kg</span>
                  <span v-if="bugunmi && m.kun_yopish && m.bosqich < 3" class="al-flag keldi">Topshirishga keldi</span>
                  <span v-if="bugunmi && agentQabulKutmoqda(m)" class="al-flag">Agent qabul qilmagan</span>
                  <span v-if="bugunmi && m.kun.uzoq_sotuv" class="al-flag uzoq" title="Mijoz nuqtasidan uzoqda qilingan sotuvlar">{{ m.kun.uzoq_sotuv }} uzoqdan sotuv</span>
                  <span v-if="m.holat === 'kamomad'" class="al-flag bad">{{ m.tovar.farq.dona > 0 ? fmtDona(m.tovar.farq.dona) + ' kg' : '' }}{{ m.tovar.farq.dona > 0 && m.pul.farq > 0.5 ? ' · ' : '' }}{{ m.pul.farq > 0.5 ? fmtSum(m.pul.farq) + ' so\'m' : '' }} farq</span>
                </div>
              </td>
              <td><span class="al-st"><i/>{{ holatNom(m) }}</span></td>
              <td class="r" :class="{ nol: !berildi(m) }"><b>{{ fmtDona(berildi(m)) }} kg</b><small v-if="berildi(m)">{{ fmtSum(m.tovar.berildi.summa) }} so'm</small></td>
              <td class="r" :class="{ nol: !m.tovar.sotildi.dona }"><b>{{ fmtDona(m.tovar.sotildi.dona) }} kg</b><small v-if="m.tovar.sotildi.dona">{{ fmtSum(m.pul.sotuv_jami) }} so'm</small></td>
              <td class="r" :class="{ nol: !m.mashina.dona }"><b>{{ fmtDona(m.mashina.dona) }} kg</b><small v-if="m.mashina.dona">{{ fmtSum(m.mashina.summa) }} so'm</small></td>
              <td class="r" :class="{ nol: !naqd(m), o: naqd(m) > 0, qizil: naqd(m) < 0 }"><b>{{ fmtSum(naqd(m)) }}</b></td>
              <td class="r" :class="{ nol: !m.pul.qarzga_sotuv }"><b>{{ fmtSum(m.pul.qarzga_sotuv) }}</b></td>
              <td>
                <div class="al-act">
                  <button v-if="bugunmi" class="al-btn" :class="m.bosqich === 0 ? 'p' : 's'" @click.stop="yukOch(m.agent.id)">Yuk berish</button>
                  <button v-if="!bugunmi || m.bosqich > 0 || m.sorovlar?.length" class="al-btn s" @click.stop="och(m.agent.id)">{{ korish(m) }}</button>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot v-if="tartibli.length > 1">
            <tr>
              <td/><td>Jami</td><td/>
              <td class="r">{{ fmtDona(jamiQator.berildi) }} kg</td>
              <td class="r">{{ fmtDona(jamiQator.sotildi) }} kg</td>
              <td class="r">{{ fmtDona(jamiQator.agentda) }} kg</td>
              <td class="r">{{ fmtSum(jamiQator.naqd) }}</td>
              <td class="r">{{ fmtSum(jamiQator.qarz) }}</td>
              <td/>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>

    <!-- ═══ 14 KUNLIK JADVAL ═══ -->
    <section v-if="kalendar?.agentlar?.length" class="al-card al-mx">
      <div class="al-card-hd">
        <div>
          <h2><span class="al-h2-ic"><svg viewBox="0 0 24 24" v-html="IKON.kalendar"/></span>So'nggi 14 kun</h2>
          <p>Har katak — bir agentning bir kuni. Kunni ochish uchun katakni bosing.</p>
        </div>
        <div class="al-leg">
          <span v-for="(c, k) in HOLAT_RANG" :key="k"><i class="sq" :style="{ background: c }"/>{{ HOLAT_NOM[k] }}</span>
          <span><i class="sq bosh"/>Yuk olmagan</span>
        </div>
      </div>
      <div class="al-mx-grid" :style="{ gridTemplateColumns: `180px repeat(${kalendar.kunlar.length}, 1fr)` }">
        <div/>
        <div v-for="k in [...kalendar.kunlar].reverse()" :key="k" class="al-mx-day" :class="{ sel: k === sana, dam: kunHarf(k) === 'Ya' }">
          <span>{{ kunHarf(k) }}</span><b>{{ Number(k.slice(8)) }}</b>
        </div>
        <template v-for="a in kalendar.agentlar" :key="a.id">
          <div class="al-mx-name">{{ a.fullname }}</div>
          <button v-for="c in [...a.kunlar].reverse()" :key="c.sana" class="al-mx-c"
            :class="[c.holat, { sel: c.sana === sana }]"
            :style="c.holat !== 'bosh' ? { background: HOLAT_RANG[c.holat] } : {}"
            :disabled="c.holat === 'bosh'"
            :title="`${a.fullname} · ${c.sana} · ${HOLAT_NOM[c.holat]}${c.sotuv ? ' · savdo ' + fmtSum(c.sotuv) : ''}`"
            @click="och(a.id, c.sana)">
            <i v-if="c.holat === 'kamomad'">!</i>
          </button>
        </template>
      </div>
    </section>

    <!-- ═══ KUN PANELI ═══ -->
    <!-- Yuk berish oynasi (Transition ichida emas — unda faqat bitta element bo'lishi kerak) -->
    <YukBerish :ochiq="yukOyna.ochiq" :agent-id="yukOyna.agentId" @yop="yukOyna.ochiq = false" @berildi="yukBerildi"/>
    <Transition name="al-drawer">
      <div v-if="tanlangan" class="al-ov" @click.self="tanlangan = null">
        <aside class="al-drawer">
          <KunPanel :key="panelKalit" :agent-id="tanlangan" :sana="sana" @yop="tanlangan = null" @ozgardi="yukla(true)" @yuk="yukOch(tanlangan)"/>
        </aside>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Ranglar qobiq (MainLayout) tokenlaridan: --bg, --surface, --line, --ink, --mut, --sub, --hov, --acc */
.al { display:flex; flex-direction:column; gap:16px; padding-bottom:40px; color:var(--ink); }

/* ═══ SARLAVHA ═══ */
.al-head { display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap; }
.al-head-l { display:flex; align-items:center; gap:14px; min-width:0; }
.al-head-ic { width:44px; height:44px; flex-shrink:0; border-radius:11px; background:var(--brand-600); color:#fff; display:flex; align-items:center; justify-content:center;
  box-shadow:0 6px 16px -6px rgba(124,58,237,.55); }
.al-head-ic svg, .al-k-ic svg, .al-h2-ic svg, .al-btn svg { fill:none; stroke:currentColor; stroke-width:1.75; stroke-linecap:round; stroke-linejoin:round; }
.al-head-ic svg { width:22px; height:22px; }
.al-h1 { font-size:22px; font-weight:600; letter-spacing:-.02em; margin:0; color:var(--ink); }
.al-sub { font-size:13px; color:var(--mut); margin:4px 0 0; }
.al-sep { margin:0 8px; color:var(--sub); }
.al-date { display:flex; align-items:center; height:36px; border:1px solid var(--line); border-radius:8px; background:var(--surface); overflow:hidden; }
.al-date-b { width:34px; height:100%; border:none; background:none; color:var(--mut); cursor:pointer; display:flex; align-items:center; justify-content:center; }
.al-date-b svg { width:16px; height:16px; fill:none; stroke:currentColor; stroke-width:1.75; stroke-linecap:round; stroke-linejoin:round; }
.al-date-b:hover:not(:disabled) { background:var(--hov); color:var(--ink); }
.al-date-b:disabled { opacity:.35; cursor:default; }
.al-date-i { height:100%; border:none; border-left:1px solid var(--line); border-right:1px solid var(--line); background:none; color:var(--ink); font-family:inherit; font-size:13px; padding:0 10px; }
:root[data-theme="dark"] .al-date-i, .shell.dark .al-date-i { color-scheme:dark; }
.al-date-t { height:100%; padding:0 14px; border:none; border-left:1px solid var(--line); background:none; color:var(--acc); font-family:inherit; font-size:13px; font-weight:600; cursor:pointer; }
.al-date-t:hover:not(:disabled) { background:var(--acc-soft); }
.al-date-t:disabled { color:var(--sub); cursor:default; }

/* ═══ KO'RSATKICHLAR ═══ */
.al-kpi { display:grid; grid-template-columns:repeat(4, 1fr); gap:12px; }
.al-k { display:flex; align-items:flex-start; gap:14px; padding:16px 18px; background:var(--surface); border:1px solid var(--line); border-radius:12px; }
.al-k-ic { width:40px; height:40px; flex-shrink:0; border-radius:10px; background:var(--acc-soft); color:var(--acc); display:flex; align-items:center; justify-content:center; }
.al-k-ic svg { width:20px; height:20px; }
.al-k.bad .al-k-ic { background:color-mix(in srgb, #dc2626 10%, transparent); color:#dc2626; }
.al-k-b { display:flex; flex-direction:column; gap:3px; min-width:0; }
.al-k-l { font-size:12.5px; color:var(--mut); }
.al-k-v { font-size:24px; font-weight:600; letter-spacing:-.02em; color:var(--ink); font-variant-numeric:tabular-nums; line-height:1.2; }
.al-k-v small { font-size:12.5px; font-weight:500; color:var(--mut); margin-left:5px; letter-spacing:0; }
.al-k-s { font-size:12px; color:var(--sub); }
.al-k.bad .al-k-v { color:#dc2626; }

/* ═══ KARTA ═══ */
.al-card { background:var(--surface); border:1px solid var(--line); border-radius:12px; overflow:hidden; }
.al-card-hd { display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap; padding:14px 18px; border-bottom:1px solid var(--line); }
.al-card-hd h2 { display:flex; align-items:center; gap:10px; font-size:14px; font-weight:600; margin:0; color:var(--ink); }
.al-h2-ic { width:28px; height:28px; border-radius:8px; background:var(--acc-soft); color:var(--acc); display:flex; align-items:center; justify-content:center; }
.al-h2-ic svg { width:16px; height:16px; }
.al-card-hd p { font-size:12.5px; color:var(--mut); margin:2px 0 0; }
.al-leg { display:flex; gap:14px; flex-wrap:wrap; font-size:12px; color:var(--mut); }
.al-leg span { display:inline-flex; align-items:center; gap:6px; }
.lg { display:inline-block; width:8px; height:8px; border-radius:50%; }
.lg.sotuv { background:#059669; }
.lg.qarz { border:1.5px solid #059669; }
.lg.sotmaslik { width:6px; height:6px; background:var(--sub); }
.lg.tolov { width:7px; height:7px; border-radius:1px; background:#d97706; transform:rotate(45deg); }
.lg.op { width:9px; height:9px; border-radius:2px; background:var(--ink2); }
.sq { display:inline-block; width:10px; height:10px; border-radius:2px; }
.sq.bosh { border:1px dashed var(--sub); }
.al-empty { padding:40px; text-align:center; color:var(--mut); display:flex; flex-direction:column; gap:6px; font-size:13px; }
.al-empty b { color:var(--ink); font-weight:600; }

/* ═══ AGENTLAR JADVALI ═══ */
.al-tw { overflow-x:auto; }
.al-t { width:100%; border-collapse:collapse; font-size:13.5px; }
.al-t th { text-align:left; font-size:11.5px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; color:var(--mut); padding:10px 10px; border-bottom:1px solid var(--line); white-space:nowrap; background:var(--hov); }
.al-t td { padding:11px 10px; border-bottom:1px solid var(--line); vertical-align:middle; color:var(--ink); white-space:nowrap; }
.al-t tbody tr:last-child td { border-bottom:none; }
.al-t th.r, .al-t td.r { text-align:right; font-variant-numeric:tabular-nums; }
.al-t td.r b { font-weight:600; }
.al-t td.r small { display:block; font-size:11.5px; font-weight:400; color:var(--sub); }
.al-t td.nol b, .al-t td.nol { color:var(--sub); font-weight:400; }
.al-t td.o b { color:#b45309; }
.al-t td.qizil b { color:#dc2626; }
.al-row { --holat:#94a3b8; cursor:pointer; outline:none; transition:background .12s; }
.al-row:hover, .al-row:focus-visible { background:var(--hov); }
.al-row.on { background:var(--acc-soft); box-shadow:inset 3px 0 0 var(--acc); }
.al-n { color:var(--sub); width:28px; }
.al-t th:first-child, .al-t td:first-child { padding-left:18px; }
.al-t th:last-child, .al-t td:last-child { padding-right:18px; }
.al-name { font-weight:600; color:var(--ink); }
.al-plate { margin-left:8px; font:600 11px/1 ui-monospace, 'SF Mono', Menlo, monospace; letter-spacing:.06em; padding:3px 5px; border:1px solid var(--line); border-radius:4px; color:var(--ink2); }
.al-st { display:inline-flex; align-items:center; gap:6px; font-size:12.5px; color:var(--ink2); }
.al-st i { width:7px; height:7px; border-radius:50%; background:var(--holat); }
.al-flags { display:flex; flex-wrap:wrap; gap:4px; margin-top:5px; }
.al-flag { font-size:11px; font-weight:500; padding:2px 7px; border-radius:5px; background:var(--hov); color:var(--ink2); white-space:nowrap; }
.al-flag.sorov { background:color-mix(in srgb, #7c3aed 12%, transparent); color:#6d28d9; }
.al-flag.keldi { background:color-mix(in srgb, #d97706 14%, transparent); color:#b45309; }
.al-flag.uzoq  { background:color-mix(in srgb, #dc2626 10%, transparent); color:#b91c1c; }
.al-flag.bad   { background:color-mix(in srgb, #dc2626 10%, transparent); color:#b91c1c; }
:root[data-theme="dark"] .al-flag.sorov, .shell.dark .al-flag.sorov { color:#c4b5fd; }
:root[data-theme="dark"] .al-flag.keldi, .shell.dark .al-flag.keldi { color:#fcd34d; }
:root[data-theme="dark"] .al-flag.uzoq,  .shell.dark .al-flag.uzoq, :root[data-theme="dark"] .al-flag.bad, .shell.dark .al-flag.bad { color:#fca5a5; }
.al-act { display:flex; justify-content:flex-end; gap:6px; }
.al-btn { height:30px; padding:0 10px; border-radius:8px; font-family:inherit; font-size:12.5px; font-weight:500; cursor:pointer; white-space:nowrap; display:inline-flex; align-items:center; justify-content:center; gap:6px; }
.al-btn svg { width:15px; height:15px; flex-shrink:0; }
.al-btn.p { border:1px solid var(--brand); background:var(--brand); color:#fff; }
.al-btn.p:hover { background:var(--brand-hover); }
.al-btn.s { border:1px solid var(--line); background:var(--surface); color:var(--ink); }
.al-btn.s:hover { background:var(--hov); border-color:var(--brand-300); color:var(--acc); }
.al-t tfoot td { border-top:1px solid var(--line); border-bottom:none; background:var(--hov); font-weight:600; }
.al-card-n { font-size:12.5px; color:var(--mut); }

/* ═══ 14 KUNLIK JADVAL ═══ */
.al-mx-grid { display:grid; gap:4px; align-items:center; padding:14px 18px 18px; }
.al-mx-day { display:flex; flex-direction:column; align-items:center; font-size:10.5px; color:var(--sub); padding:4px 0; border-radius:6px; }
.al-mx-day b { font-size:12.5px; font-weight:500; color:var(--ink2); font-variant-numeric:tabular-nums; }
.al-mx-day.dam { opacity:.5; }
.al-mx-day.sel { background:var(--act); }
.al-mx-day.sel b { color:var(--ink); font-weight:600; }
.al-mx-name { font-size:13px; color:var(--ink2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding-right:8px; }
.al-mx-c { height:26px; border-radius:3px; border:none; cursor:pointer; position:relative; color:#fff; font-size:12px; font-weight:600; font-family:inherit; }
.al-mx-c:hover:not(:disabled) { filter:brightness(1.08); box-shadow:0 0 0 1px var(--surface), 0 0 0 2px var(--sub); }
.al-mx-c.bosh { background:transparent; border:1px dashed var(--line); cursor:default; }
.al-mx-c.ochiq { opacity:.6; }
.al-mx-c.sel { box-shadow:0 0 0 2px var(--surface), 0 0 0 3.5px var(--ink); }
.al-mx-c i { font-style:normal; }

/* ═══ PANEL ═══ */
.al-ov { position:fixed; inset:0; z-index:80; background:rgba(0,0,0,.32); display:flex; justify-content:flex-end; }
.al-drawer { width:min(760px, 100vw); height:100%; overflow-y:auto; background:var(--surface); border-left:1px solid var(--line); box-shadow:-12px 0 40px rgba(0,0,0,.12); }
.al-drawer-enter-active, .al-drawer-leave-active { transition:opacity .2s; }
.al-drawer-enter-active .al-drawer, .al-drawer-leave-active .al-drawer { transition:transform .24s cubic-bezier(.2,.8,.2,1); }
.al-drawer-enter-from, .al-drawer-leave-to { opacity:0; }
.al-drawer-enter-from .al-drawer, .al-drawer-leave-to .al-drawer { transform:translateX(24px); }

@media (max-width:1180px) {
  .al-kpi { grid-template-columns:1fr 1fr; }
}
@media (max-width:760px) {
  .al-kpi { grid-template-columns:1fr 1fr; gap:8px; }
  .al-k { padding:12px; gap:10px; }
  .al-k-ic { width:34px; height:34px; }
  .al-mx-grid { grid-template-columns:110px repeat(14, 1fr) !important; gap:3px; }
}
</style>
