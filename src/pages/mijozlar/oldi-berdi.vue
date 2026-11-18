<template>
  <div class="ob">

    <!-- ═══ HEADER ═══ -->
    <div class="ob-hd">
      <button class="ob-back" @click="$router.push('/mijozlar')" aria-label="Orqaga">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      </button>
      <div>
        <h1 class="ob-title">Oldi-berdi</h1>
        <p class="ob-sub">Mijozning savdo va to'lovlar tarixi</p>
      </div>

      <div class="ob-hd-r">
        <div class="ob-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          <input v-model="qidiruv" placeholder="Mijoz qidirish..." @focus="royxatOchiq = true">
        </div>
        <input type="date" v-model="f.dan"   class="ob-date" @change="yukla">
        <input type="date" v-model="f.gacha" class="ob-date" @change="yukla">
        <button v-if="f.dan || f.gacha" class="ob-clear" @click="davrniTozala">Tozalash</button>
      </div>
    </div>

    <!-- ═══ MIJOZ TANLASH ═══ -->
    <div v-if="royxatOchiq || !tanlangan" class="ob-picker">
      <div v-if="mijozYuklanmoqda" class="ob-loading"><span class="ob-spin"/> Yuklanmoqda...</div>
      <template v-else>
        <button v-for="m in filtrlangan.slice(0, 40)" :key="m.id"
          class="ob-pick" :class="{ on: tanlangan === m.id }" @click="mijozTanla(m.id)">
          <span class="ob-pick-av" :style="{ background: rang(m.id) }">{{ (m.nomi || '?')[0] }}</span>
          <span class="ob-pick-b">
            <span class="ob-pick-n">{{ m.nomi }}</span>
            <span class="ob-pick-s">{{ m.telefon || '—' }}</span>
          </span>
          <span v-if="m.balans < 0" class="ob-pick-q" title="Mijoz qarzdor">{{ qisqa(-m.balans) }}</span>
          <span v-else-if="m.balans > 0" class="ob-pick-h" title="Mijoz haqdor — biz qarzdormiz">+{{ qisqa(m.balans) }}</span>
        </button>
        <div v-if="!filtrlangan.length" class="ob-empty-sm">Mijoz topilmadi</div>
      </template>
    </div>

    <template v-if="tanlangan && d">
      <!-- ═══ MIJOZ KARTASI ═══ -->
      <div class="ob-card ob-info">
        <div class="ob-info-l">
          <span class="ob-av" :style="{ background: rang(d.mijoz.id) }">{{ (d.mijoz.nomi || '?')[0] }}</span>
          <div>
            <div class="ob-info-n">
              {{ d.mijoz.nomi }}
              <span v-if="d.mijoz.sinf" class="ob-sinf">{{ d.mijoz.sinf }}</span>
            </div>
            <div class="ob-info-s">
              {{ d.mijoz.telefon || '—' }}
              <template v-if="d.mijoz.agent"> · Agent: {{ d.mijoz.agent }}</template>
              <template v-if="d.mijoz.territoriya"> · {{ d.mijoz.territoriya }}</template>
            </div>
          </div>
        </div>
        <div class="ob-info-r">
          <div class="ob-meta">
            <span>To'lov muddati</span>
            <b>{{ d.mijoz.tolov_muddati_kun || '—' }} kun</b>
          </div>
          <div class="ob-meta">
            <span>Kredit limiti</span>
            <b>{{ d.mijoz.kredit_limit ? qisqa(d.mijoz.kredit_limit) : '—' }}</b>
          </div>
        </div>
      </div>

      <!-- ═══ XULOSA KARTALAR ═══ -->
      <div class="ob-sum">
        <div class="ob-s ob-s--oldi">
          <span class="ob-s-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 01-8 0"/></svg>
          </span>
          <div>
            <div class="ob-s-v">{{ toliq(d.jami.oldi) }}</div>
            <div class="ob-s-l">Oldi · {{ d.jami.savdo_soni }} ta savdo</div>
          </div>
        </div>

        <div class="ob-s ob-s--berdi">
          <span class="ob-s-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
          </span>
          <div>
            <div class="ob-s-v">{{ toliq(d.jami.berdi) }}</div>
            <div class="ob-s-l">Berdi · {{ d.jami.tolov_soni }} ta to'lov</div>
          </div>
        </div>

        <div class="ob-s" :class="qoldiqKlass">
          <span class="ob-s-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
          </span>
          <div>
            <div class="ob-s-v">{{ toliq(Math.abs(d.jami.qoldiq)) }}</div>
            <div class="ob-s-l">{{ qoldiqMatn }}</div>
          </div>
        </div>

        <div class="ob-s ob-s--kun">
          <span class="ob-s-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
          </span>
          <div>
            <div class="ob-s-v">{{ d.jami.oxirgi_tolovdan_kun ?? '—' }}</div>
            <div class="ob-s-l">Oxirgi to'lovdan (kun)</div>
          </div>
        </div>
      </div>

      <!-- Ogohlantirishlar -->
      <div v-if="d.jami.limit_oshdi" class="ob-warn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>
        Qarz kredit limitidan oshib ketgan ({{ qisqa(d.mijoz.kredit_limit) }})
      </div>
      <div v-if="balansFarqi" class="ob-note">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>
        Harakatlardan hisoblangan qoldiq mijoz kartasidagi balansdan
        <b>{{ qisqa(Math.abs(balansFarqi)) }}</b> farq qiladi
        (karta: {{ qisqa(d.mijoz.rasmiy_balans) }})
      </div>

      <!-- ═══ JADVAL ═══ -->
      <div class="ob-card">
        <div class="ob-t-hd">
          <h2 class="ob-t-title">Harakatlar tarixi</h2>
          <div class="ob-chips">
            <button v-for="t in TURLAR" :key="t.key" class="ob-chip"
              :class="{ on: turFiltr === t.key }" @click="turFiltr = (t.key as 'bari'|'oldi'|'berdi')">{{ t.label }}</button>
          </div>
          <span class="ob-cnt">{{ qatorlar.length }} ta</span>
        </div>

        <div v-if="yuklanmoqda" class="ob-loading"><span class="ob-spin"/> Yuklanmoqda...</div>
        <div v-else-if="!qatorlar.length" class="ob-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          <p>Bu davrda harakat yo'q</p>
        </div>

        <div v-else class="ob-tbl-wrap">
          <table class="ob-tbl">
            <thead>
              <tr>
                <th>Sana / vaqt</th><th>Hujjat</th><th>Izoh</th>
                <th class="r">Oldi</th><th class="r">Berdi</th><th class="r">Qoldiq</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(q, i) in qatorlar" :key="q.tur + q.manba_id" :class="'is-' + q.tur"
                :style="{ animationDelay: Math.min(i, 18) * 22 + 'ms' }">
                <td class="nw">
                  <div class="ob-d">{{ sana(q.sana) }}</div>
                  <div class="ob-tm">{{ vaqt(q.sana) }}</div>
                </td>
                <td class="nw">
                  <span class="ob-tag" :class="q.tur === 'oldi' ? 'is-oldi' : q.tur === 'boshlangich' ? 'is-bosh' : 'is-berdi'">
                    {{ q.tur === 'oldi' ? 'Savdo' : q.tur === 'boshlangich' ? "Boshlang'ich" : "To'lov" }}
                  </span>
                  <span class="ob-hj">{{ q.hujjat }}</span>
                </td>
                <td class="ob-iz">
                  {{ q.izoh }}
                  <span v-if="q.tolov_usul" class="ob-usul">{{ usul(q.tolov_usul) }}</span>
                </td>
                <td class="r ob-oldi">{{ q.oldi ? toliq(q.oldi) : '—' }}</td>
                <td class="r ob-berdi">{{ q.berdi ? toliq(q.berdi) : '—' }}</td>
                <td class="r ob-qold" :class="q.qoldiq > 0 ? 'minus' : 'plus'">{{ toliq(q.qoldiq) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3">Jami</td>
                <td class="r ob-oldi">{{ toliq(jamiKorinayotgan.oldi) }}</td>
                <td class="r ob-berdi">{{ toliq(jamiKorinayotgan.berdi) }}</td>
                <td class="r ob-qold" :class="d.jami.qoldiq > 0 ? 'minus' : 'plus'">
                  {{ toliq(d.jami.qoldiq) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </template>

    <div v-else-if="!royxatOchiq" class="ob-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
      <p>Tarixni ko'rish uchun mijoz tanlang</p>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
// @ts-ignore
import { api } from '@/api/api'

const route = useRoute()
const router = useRouter()

const TURLAR = [
  { key: 'bari',  label: 'Barchasi' },
  { key: 'oldi',  label: 'Oldi' },
  { key: 'berdi', label: 'Berdi' },
]
const RANGLAR = ['#4f46e5','#6366f1','#4338ca','#3730a3']
const rang = (id: number) => RANGLAR[id % RANGLAR.length]

interface Qator {
  tur: 'oldi' | 'berdi' | 'boshlangich'; sana: string; hujjat: string; izoh: string
  tolov_usul: string | null; oldi: number; berdi: number; qoldiq: number; manba_id: number
}
interface Javob {
  mijoz: { id: number; nomi: string; telefon: string; manzil: string; sinf: string
           agent: string | null; territoriya: string | null
           kredit_limit: number; tolov_muddati_kun: number; rasmiy_balans: number
           boshlangich_balans?: number; boshlangich_sana?: string | null; boshlangich_izoh?: string | null }
  jami: { oldi: number; berdi: number; qoldiq: number; savdo_soni: number; tolov_soni: number
          oxirgi_tolov: string | null; oxirgi_tolovdan_kun: number | null; limit_oshdi: boolean }
  qatorlar: Qator[]
}

const d = ref<Javob | null>(null)
const mijozlar = ref<any[]>([])
const tanlangan = ref<number | null>(null)
const qidiruv = ref('')
const turFiltr = ref<'bari'|'oldi'|'berdi'>('bari')
const royxatOchiq = ref(false)
const yuklanmoqda = ref(false)
const mijozYuklanmoqda = ref(true)
const f = ref({ dan: '', gacha: '' })

/* ── Formatlash ── */
function toliq(v: number) {
  return new Intl.NumberFormat('uz-UZ').format(Math.round(v || 0))
}
function qisqa(v: number) {
  const n = Math.abs(Number(v) || 0), z = (Number(v) || 0) < 0 ? '−' : ''
  if (n >= 1e9) return z + (n / 1e9).toFixed(1) + ' mlrd'
  if (n >= 1e6) return z + (n / 1e6).toFixed(1) + ' mln'
  if (n >= 1e3) return z + Math.round(n / 1e3) + ' ming'
  return z + Math.round(n)
}
function sana(s: string | null | undefined) {
  if (!s) return '—'
  const dt = new Date(s)
  // Brauzer lokalidan mustaqil: 01.10.2026 (ba'zi brauzerlar uz-UZ oylarini "M10" deb chiqaradi)
  return isNaN(+dt) ? String(s).slice(0, 10) : `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()}`
}
function vaqt(s: string) {
  const dt = new Date(s)
  return isNaN(+dt) ? '' : dt.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
}
const USUL: Record<string, string> = { naqt: 'Naqd', karta: 'Karta', bank: 'Bank' }
function usul(u: string) { return USUL[u] || u }

/* ── Filtrlar ── */
const filtrlangan = computed(() => {
  const q = qidiruv.value.trim().toLowerCase()
  if (!q) return mijozlar.value
  return mijozlar.value.filter(m =>
    (m.nomi || '').toLowerCase().includes(q) || (m.telefon || '').includes(q))
})

const qatorlar = computed(() => {
  if (!d.value) return []
  if (turFiltr.value === 'bari') return d.value.qatorlar
  return d.value.qatorlar.filter(q => q.tur === turFiltr.value)
})

/* Filtrlanganda ustun yig'indisi ham o'zgaradi */
const jamiKorinayotgan = computed(() => ({
  oldi:  qatorlar.value.reduce((s, q) => s + q.oldi, 0),
  berdi: qatorlar.value.reduce((s, q) => s + q.berdi, 0),
}))

/* Qoldiq musbat = mijoz qarzdor; manfiy = avans to'lagan */
const qoldiqKlass = computed(() => {
  if (!d.value) return ''
  return d.value.jami.qoldiq > 0 ? 'ob-s--qarz' : 'ob-s--avans'
})
const qoldiqMatn = computed(() => {
  if (!d.value) return ''
  const q = d.value.jami.qoldiq
  if (q > 0) return 'Mijoz qarzdor'
  if (q < 0) return 'Mijoz haqdor — biz qarzdormiz'
  return 'Hisob teng'
})

/* Ikki manba farqi — buxgalteriya uchun signal */
const balansFarqi = computed(() => {
  if (!d.value) return 0
  const farq = d.value.jami.qoldiq + d.value.mijoz.rasmiy_balans   // qoldiq: musbat = qarz; karta balansi: manfiy = qarz
  return Math.abs(farq) > 1 ? farq : 0
})

/* ── Yuklash ── */
async function mijozlarniYukla() {
  mijozYuklanmoqda.value = true
  try {
    const r = await api.get('/mijozlar?all=true')
    mijozlar.value = Array.isArray(r) ? r : (r.rows || [])
  } catch (e) {
    console.error('Mijozlar yuklanmadi:', e)
  } finally {
    mijozYuklanmoqda.value = false
  }
}

async function yukla() {
  if (!tanlangan.value) return
  yuklanmoqda.value = true
  try {
    const p = new URLSearchParams()
    if (f.value.dan)   p.append('dan', f.value.dan)
    if (f.value.gacha) p.append('gacha', f.value.gacha)
    const q = p.toString()
    d.value = await api.get(`/mijozlar/${tanlangan.value}/oldi-berdi${q ? '?' + q : ''}`)
  } catch (e) {
    console.error('Oldi-berdi yuklanmadi:', e)
    d.value = null
  } finally {
    yuklanmoqda.value = false
  }
}

function mijozTanla(id: number) {
  tanlangan.value = id
  royxatOchiq.value = false
  qidiruv.value = ''
  // Manzilda saqlaymiz — sahifa yangilansa ham mijoz qoladi
  router.replace({ query: { ...route.query, mijoz: String(id) } })
  yukla()
}

function davrniTozala() {
  f.value = { dan: '', gacha: '' }
  yukla()
}

watch(() => route.query.mijoz, (v) => {
  const id = Number(v)
  if (id && id !== tanlangan.value) { tanlangan.value = id; yukla() }
})

onMounted(async () => {
  await mijozlarniYukla()
  const id = Number(route.query.mijoz)
  if (id) { tanlangan.value = id; await yukla() }
  else royxatOchiq.value = true
})
</script>

<style scoped>
.ob {
  --surface:#fff; --sunken:#f8fafc; --border:rgba(15,23,42,.09);
  --shadow:0 1px 2px rgba(15,23,42,.04), 0 2px 8px rgba(15,23,42,.05);
  --ink:#0f172a; --ink2:#334155; --muted:#5d6b7f;
  --accent:#4338ca; --accent-wash:rgba(15,118,110,.08);
  --oldi:#b45309; --berdi:#047857; --qarz:#be123c; --avans:#4338ca;
  display:flex; flex-direction:column; gap:12px; padding:2px 0 40px; color:var(--ink);
}
:global(:root[data-theme="dark"]) .ob,
:global(.shell.dark) .ob {
  --surface:#212836; --sunken:#181e29; --border:rgba(255,255,255,.09);
  --shadow:0 1px 2px rgba(0,0,0,.24), 0 2px 8px rgba(0,0,0,.28);
  --ink:#e8eaf0; --ink2:#a8b0c0; --muted:#8b93a7;
  --accent:#818cf8; --accent-wash:rgba(129,140,248,.14);
  --oldi:#fbbf24; --berdi:#34d399; --qarz:#fb7185; --avans:#818cf8;
}

/* ── HEADER ── */
.ob-hd { display:flex; align-items:flex-start; gap:12px; flex-wrap:wrap; }
.ob-back { width:34px; height:34px; border-radius:10px; border:1px solid var(--border);
           background:var(--surface); color:var(--ink2); cursor:pointer; flex-shrink:0;
           display:flex; align-items:center; justify-content:center; }
.ob-back svg { width:17px; height:17px; }
.ob-back:hover { border-color:var(--accent); color:var(--accent); }
.ob-title { font-size:19px; font-weight:800; margin:0; letter-spacing:-.02em; }
.ob-sub { font-size:12px; color:var(--muted); margin:2px 0 0; }
.ob-hd-r { margin-left:auto; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }

.ob-search { position:relative; display:flex; align-items:center; }
.ob-search svg { position:absolute; left:10px; width:15px; height:15px; color:var(--muted); }
.ob-search input { padding:8px 12px 8px 32px; border:1px solid var(--border); border-radius:9px;
                   background:var(--surface); color:var(--ink); font-size:12.5px;
                   outline:none; width:200px; }
.ob-search input:focus { border-color:var(--accent); }
.ob-date { padding:7px 10px; border:1px solid var(--border); border-radius:9px;
           background:var(--surface); color:var(--ink); font-size:12px; outline:none; }
.ob-clear { padding:7px 12px; border:1px solid var(--border); border-radius:9px;
            background:var(--surface); color:var(--accent); font-size:12px;
            font-weight:600; cursor:pointer; }
.ob-clear:hover { background:var(--accent-wash); }

/* ── MIJOZ TANLASH ── */
.ob-picker { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:8px;
             max-height:290px; overflow-y:auto; padding:2px; }
.ob-pick { display:flex; align-items:center; gap:10px; padding:10px 12px;
           border:1px solid var(--border); border-radius:11px; background:var(--surface);
           cursor:pointer; font:inherit; text-align:left; transition:.15s; }
.ob-pick:hover { border-color:var(--accent); transform:translateY(-2px); box-shadow:var(--shadow); }
.ob-pick.on { border-color:var(--accent); background:var(--accent-wash); }
.ob-pick-av { width:32px; height:32px; border-radius:10px; color:#fff; font-size:13px;
              font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.ob-pick-b { flex:1; min-width:0; display:block; }
.ob-pick-n { display:block; font-size:12.5px; font-weight:700;
             overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ob-pick-s { display:block; font-size:10.5px; color:var(--muted); margin-top:1px; }
.ob-pick-q { font-size:11px; font-weight:800; color:var(--qarz); white-space:nowrap; }
.ob-pick-h { font-size:11px; font-weight:800; color:var(--berdi); white-space:nowrap; }

/* ── MIJOZ KARTASI ── */
.ob-card { background:var(--surface); border:1px solid var(--border); border-radius:12px;
           padding:15px; box-shadow:var(--shadow); }
.ob-info { display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
.ob-info-l { display:flex; align-items:center; gap:12px; flex:1; min-width:0; }
.ob-av { width:44px; height:44px; border-radius:13px; color:#fff; font-size:18px;
         font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.ob-info-n { display:flex; align-items:center; gap:8px; font-size:15px; font-weight:800; }
.ob-sinf { font-size:10px; font-weight:800; padding:2px 7px; border-radius:6px;
           background:var(--accent-wash); color:var(--accent); }
.ob-info-s { font-size:11.5px; color:var(--muted); margin-top:2px; }
.ob-info-r { display:flex; gap:20px; }
.ob-meta { text-align:right; }
.ob-meta span { display:block; font-size:10.5px; color:var(--muted); }
.ob-meta b { display:block; font-size:13px; margin-top:2px; }

/* ── XULOSA ── */
.ob-sum { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:10px; }
.ob-s { display:flex; align-items:center; gap:11px; padding:14px;
        border:1px solid var(--border); border-radius:12px; background:var(--surface);
        box-shadow:var(--shadow); position:relative; overflow:hidden; --c:var(--accent);
        animation:ob-up .4s cubic-bezier(.22,1,.36,1) both; }
.ob-s::before { content:''; position:absolute; left:0; top:0; bottom:0; width:3px; background:var(--c); }
.ob-s--oldi  { --c:var(--oldi); }
.ob-s--berdi { --c:var(--berdi); }
.ob-s--qarz  { --c:var(--qarz); }
.ob-s--avans { --c:var(--avans); }
.ob-s--kun   { --c:var(--muted); }
.ob-s-ic { width:36px; height:36px; border-radius:11px; flex-shrink:0; display:flex;
           align-items:center; justify-content:center;
           background:color-mix(in oklab, var(--c) 13%, transparent); color:var(--c); }
.ob-s-ic svg { width:17px; height:17px; }
.ob-s-v { font-size:19px; font-weight:800; line-height:1.1; letter-spacing:-.02em;
          font-variant-numeric:tabular-nums; }
.ob-s-l { font-size:10.5px; color:var(--muted); margin-top:2px; }
@keyframes ob-up { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:none } }

.ob-warn, .ob-note { display:flex; align-items:center; gap:9px; padding:11px 14px;
                     border-radius:10px; font-size:12px; }
.ob-warn svg, .ob-note svg { width:16px; height:16px; flex-shrink:0; }
.ob-warn { background:color-mix(in oklab,var(--qarz) 9%,transparent); color:var(--qarz);
           border:1px solid color-mix(in oklab,var(--qarz) 26%,transparent); font-weight:600; }
.ob-note { background:var(--sunken); color:var(--muted); border:1px solid var(--border); }
.ob-note b { color:var(--ink); }

/* ── JADVAL ── */
.ob-t-hd { display:flex; align-items:center; gap:10px; margin-bottom:12px; flex-wrap:wrap; }
.ob-t-title { font-size:13.5px; font-weight:800; margin:0; }
.ob-chips { display:flex; gap:3px; background:var(--sunken); border-radius:8px; padding:2px; }
.ob-chip { padding:5px 12px; border:none; background:none; border-radius:6px; font-size:11.5px;
           font-weight:600; color:var(--muted); cursor:pointer; }
.ob-chip.on { background:var(--surface); color:var(--accent); box-shadow:var(--shadow); }
.ob-cnt { margin-left:auto; font-size:11.5px; color:var(--muted); }

.ob-tbl-wrap { overflow-x:auto; }
.ob-tbl { width:100%; border-collapse:collapse; font-size:12.5px; min-width:660px; }
.ob-tbl th { text-align:left; padding:9px 10px; font-size:10.5px; font-weight:700;
             color:var(--muted); text-transform:uppercase; letter-spacing:.03em;
             border-bottom:1px solid var(--border); white-space:nowrap; }
.ob-tbl td { padding:10px; border-bottom:1px solid var(--border); }
.ob-tbl tbody tr { animation:ob-fade .3s ease both; }
.ob-tbl tbody tr:hover { background:var(--sunken); }
.ob-tbl tfoot td { padding:11px 10px; font-weight:800; border-top:2px solid var(--border);
                   font-size:13px; }
@keyframes ob-fade { from { opacity:0 } to { opacity:1 } }
.r { text-align:right; font-variant-numeric:tabular-nums; }
.nw { white-space:nowrap; }

.ob-d { font-weight:600; }
.ob-tm { font-size:10.5px; color:var(--muted); margin-top:1px; }
.ob-tag { display:inline-block; font-size:10px; font-weight:800; padding:2px 7px;
          border-radius:6px; margin-right:7px; }
.ob-tag.is-oldi  { background:color-mix(in oklab,var(--oldi) 14%,transparent);  color:var(--oldi); }
.ob-tag.is-berdi { background:color-mix(in oklab,var(--berdi) 14%,transparent); color:var(--berdi); }
.ob-tag.is-bosh  { background:#eef2ff; color:#4338ca; }
.ob-hj { font-size:11px; color:var(--muted); }
.ob-iz { color:var(--ink2); }
.ob-usul { display:inline-block; font-size:10px; padding:1px 6px; border-radius:5px;
           background:var(--sunken); color:var(--muted); margin-left:6px; }
.ob-oldi  { color:var(--oldi);  font-weight:600; }
.ob-berdi { color:var(--berdi); font-weight:600; }
.ob-qold  { font-weight:800; }
.ob-qold.minus { color:var(--qarz); }
.ob-qold.plus  { color:var(--avans); }

.ob-empty, .ob-empty-sm, .ob-loading {
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:10px; padding:44px 20px; color:var(--muted); font-size:13px; text-align:center; }
.ob-empty svg { width:32px; height:32px; opacity:.5; }
.ob-empty p, .ob-empty-sm { margin:0; }
.ob-empty-sm { padding:24px; font-size:12.5px; grid-column:1/-1; }
.ob-loading { flex-direction:row; padding:30px; }
.ob-spin { width:17px; height:17px; border:2.5px solid var(--border);
           border-top-color:var(--accent); border-radius:50%;
           animation:ob-rot .7s linear infinite; }
@keyframes ob-rot { to { transform:rotate(360deg) } }

@media (max-width:700px) {
  .ob-hd-r { width:100%; }
  .ob-search input { width:100%; }
  .ob-info-r { width:100%; justify-content:space-between; }
}
@media (prefers-reduced-motion: reduce) {
  .ob-s, .ob-tbl tbody tr { animation:none; }
  .ob-pick:hover { transform:none; }
}
</style>
