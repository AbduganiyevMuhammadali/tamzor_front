<template>
  <div class="qq">

    <!-- ═══ HEADER ═══ -->
    <div class="qq-hd">
      <div>
        <h1 class="qq-title">Qaytarishni qabul qilish</h1>
        <p class="qq-sub">Agent qaytargan tovarni tekshirib asosiy omborga o'tkazish</p>
      </div>
      <div class="qq-hd-r">
        <div class="qq-tabs">
          <button class="qq-tab" :class="{ on: tab === 'kutish' }" @click="tab = 'kutish'">
            Qabul kutilmoqda
            <span v-if="royxat.length" class="qq-badge">{{ royxat.length }}</span>
          </button>
          <button class="qq-tab" :class="{ on: tab === 'qoldiq' }" @click="tab = 'qoldiq'">
            Agent omborlari
            <span v-if="qoldiq.jami.dona" class="qq-badge qq-badge--warn">{{ qoldiq.omborlar.length }}</span>
          </button>
        </div>
        <button class="qq-ib" :disabled="yuklanmoqda" title="Yangilash" @click="yukla">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="{ 'qq-spin': yuklanmoqda }"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
        </button>
      </div>
    </div>

    <!-- ═══ QABUL KUTILMOQDA ═══ -->
    <template v-if="tab === 'kutish'">
      <div v-if="yuklanmoqda && !royxat.length" class="qq-load"><span class="qq-spin2"/> Yuklanmoqda...</div>

      <div v-else-if="!royxat.length" class="qq-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M22 11.1V12a10 10 0 11-5.9-9.1"/><polyline points="22 4 12 14 9 11"/></svg>
        <p>Qabul kutayotgan qaytarish yo'q</p>
      </div>

      <div v-else class="qq-list">
        <article v-for="a in royxat" :key="a.id" class="qq-card"
          :class="{ 'is-eski': a.kutgan_kun >= 3 }">

          <div class="qq-card-hd">
            <span class="qq-av" :style="{ background: rang(a.agent_id || 0) }">
              {{ (a.agent_nomi || '?')[0] }}
            </span>
            <div class="qq-card-n">
              <div class="qq-card-t">{{ a.agent_nomi || 'Agent noma\'lum' }}</div>
              <div class="qq-card-s">
                {{ a.raqam }} · {{ fmtSana(a.createdAt) }}
                <template v-if="a.mijoz_nomi"> · {{ a.mijoz_nomi }}</template>
              </div>
            </div>
            <span v-if="a.kutgan_kun >= 1" class="qq-kun" :class="{ eski: a.kutgan_kun >= 3 }">
              {{ a.kutgan_kun }} kun kutmoqda
            </span>
          </div>

          <div class="qq-tbl-wrap">
            <table class="qq-tbl">
              <thead>
                <tr>
                  <th>Tovar</th>
                  <th class="r">Agent aytdi</th>
                  <th class="r qq-th-in">Qabul qilinadi</th>
                  <th class="r">Farq</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="q in a.qatorlar" :key="q.id">
                  <td>
                    <div class="qq-tn">{{ q.tovar_nomi }}</div>
                    <div class="qq-tk">{{ q.turkum || '—' }}</div>
                  </td>
                  <td class="r qq-aytdi">{{ fmtDona(q.jami_dona) }}</td>
                  <td class="r">
                    <input type="number" class="qq-in" min="0" :max="q.jami_dona" step="0.001"
                      v-model.number="kirit[q.id]"
                      @input="tuzat(q)">
                  </td>
                  <td class="r">
                    <span v-if="farq(q) > 0" class="qq-farq">−{{ fmtDona(farq(q)) }}</span>
                    <span v-else class="qq-ok">✓</span>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td>Jami</td>
                  <td class="r">{{ fmtDona(jamiAytdi(a)) }}</td>
                  <td class="r"><b>{{ fmtDona(jamiQabul(a)) }}</b></td>
                  <td class="r">
                    <span v-if="jamiFarq(a) > 0" class="qq-farq">−{{ fmtDona(jamiFarq(a)) }}</span>
                    <span v-else class="qq-ok">✓</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div v-if="jamiFarq(a) > 0" class="qq-warn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>
            {{ fmtDona(jamiFarq(a)) }} kg yetishmayapti — agent omborida qoladi
          </div>

          <div class="qq-card-ft">
            <input v-model="izoh[a.id]" class="qq-izoh" placeholder="Izoh (ixtiyoriy)...">
            <button class="qq-btn-ok" :disabled="saqlanmoqda === a.id" @click="qabulQil(a)">
              <span v-if="saqlanmoqda === a.id" class="qq-spin2 qq-spin2--sm"/>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="20 6 9 17 4 12"/></svg>
              Qabul qilish
            </button>
          </div>
        </article>
      </div>
    </template>

    <!-- ═══ AGENT OMBORLARI ═══ -->
    <template v-else>
      <div v-if="!qoldiq.omborlar.length" class="qq-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M22 11.1V12a10 10 0 11-5.9-9.1"/><polyline points="22 4 12 14 9 11"/></svg>
        <p>Agent omborlarida qoldiq yo'q</p>
      </div>

      <template v-else>
        <div class="qq-sum">
          <div class="qq-s">
            <div class="qq-s-v">{{ qoldiq.omborlar.length }}</div>
            <div class="qq-s-l">Ombor</div>
          </div>
          <div class="qq-s qq-s--warn">
            <div class="qq-s-v">{{ fmtDona(qoldiq.jami.dona) }}</div>
            <div class="qq-s-l">Tushuntirilmagan kg</div>
          </div>
          <div class="qq-s qq-s--warn">
            <div class="qq-s-v">{{ fmtSum(qoldiq.jami.summa) }}</div>
            <div class="qq-s-l">Summa</div>
          </div>
        </div>

        <div class="qq-list">
          <article v-for="o in qoldiq.omborlar" :key="o.ombor" class="qq-card">
            <div class="qq-card-hd">
              <span class="qq-av" :style="{ background: rangNom(o.agent || o.ombor) }">
                {{ (o.agent || '?')[0] }}
              </span>
              <div class="qq-card-n">
                <div class="qq-card-t">{{ o.agent || o.ombor }}</div>
                <div class="qq-card-s">{{ o.tovarlar.length }} xil tovar</div>
              </div>
              <span class="qq-kun eski">{{ fmtDona(o.jami_dona) }} kg · {{ fmtSum(o.jami_summa) }}</span>
            </div>

            <div class="qq-tbl-wrap">
              <table class="qq-tbl">
                <thead>
                  <tr><th>Tovar</th><th>Turkum</th><th class="r">Qoldiq</th><th class="r">Oxirgi harakat</th></tr>
                </thead>
                <tbody>
                  <tr v-for="t in o.tovarlar" :key="t.tovar_id">
                    <td class="qq-tn">{{ t.tovar_nomi }}</td>
                    <td class="qq-tk">{{ t.turkum || '—' }}</td>
                    <td class="r qq-farq">{{ fmtDona(t.qoldiq) }}</td>
                    <td class="r qq-tk">{{ fmtSana(t.oxirgi) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>
        </div>
      </template>
    </template>

    <!-- Xabar -->
    <Transition name="qq-fade">
      <div v-if="xabar" class="qq-toast" :class="xabar.tur">{{ xabar.matn }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
// @ts-ignore
import { api } from '@/api/api'

interface Qator {
  id: number; tovar_id: number; tovar_nomi: string; turkum: string | null
  jami_dona: number; qabul_dona: number | null; narx: number
}
interface Ariza {
  id: number; raqam: string; agent_id: number | null; agent_nomi: string | null
  mijoz_nomi: string | null; createdAt: string; kutgan_kun: number
  jami_dona: number; qatorlar: Qator[]
}
interface OmborQoldiq {
  ombor: string; agent: string | null; jami_dona: number; jami_summa: number
  tovarlar: { tovar_id: number; tovar_nomi: string; turkum: string | null
              qoldiq: number; summa: number; oxirgi: string }[]
}

const RANGLAR = ['#7c3aed','#8b5cf6','#6d28d9','#5b21b6']
const rang = (id: number) => RANGLAR[id % RANGLAR.length]
const rangNom = (s: string) => RANGLAR[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % RANGLAR.length]

const tab = ref<'kutish' | 'qoldiq'>('kutish')
const royxat = ref<Ariza[]>([])
const qoldiq = ref<{ omborlar: OmborQoldiq[]; jami: { ombor_soni: number; dona: number; summa: number } }>(
  { omborlar: [], jami: { ombor_soni: 0, dona: 0, summa: 0 } })
const yuklanmoqda = ref(false)
const saqlanmoqda = ref<number | null>(null)
const kirit = reactive<Record<number, number>>({})
const izoh  = reactive<Record<number, string>>({})
const xabar = ref<{ matn: string; tur: string } | null>(null)

function fmtDona(v: number) {
  const n = Number(v || 0)
  return Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/\.?0+$/, '')
}
function fmtSum(v: number) { return new Intl.NumberFormat('uz-UZ').format(Math.round(v || 0)) }
function fmtSana(s: string) {
  const d = new Date(s)
  return isNaN(+d) ? String(s).slice(0, 10)
    : d.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/* Kiritilgan qiymat chegaradan chiqmasin — agent aytganidan ko'p
   qabul qilib bo'lmaydi (backend ham tekshiradi) */
function tuzat(q: Qator) {
  let v = Number(kirit[q.id])
  if (isNaN(v) || v < 0) v = 0
  if (v > q.jami_dona) v = q.jami_dona
  kirit[q.id] = v
}
const qabulQiymat = (q: Qator) => Number(kirit[q.id] ?? q.jami_dona)
const farq = (q: Qator) => Math.max(0, Number(q.jami_dona) - qabulQiymat(q))
const jamiAytdi = (a: Ariza) => a.qatorlar.reduce((s, q) => s + Number(q.jami_dona || 0), 0)
const jamiQabul = (a: Ariza) => a.qatorlar.reduce((s, q) => s + qabulQiymat(q), 0)
const jamiFarq  = (a: Ariza) => Math.max(0, jamiAytdi(a) - jamiQabul(a))

function korsat(matn: string, tur = 'ok') {
  xabar.value = { matn, tur }
  setTimeout(() => { xabar.value = null }, 3500)
}

async function yukla() {
  yuklanmoqda.value = true
  try {
    const [r, q] = await Promise.all([
      api.get('/arizalar/qabul-kutilmoqda'),
      api.get('/arizalar/agent-ombor-qoldiq'),
    ])
    royxat.value = Array.isArray(r) ? r : []
    qoldiq.value = q || qoldiq.value
    // Kiritish maydonlarini agent aytgan miqdor bilan to'ldiramiz
    royxat.value.forEach(a => a.qatorlar.forEach(q2 => {
      if (kirit[q2.id] === undefined) kirit[q2.id] = Number(q2.jami_dona)
    }))
  } catch (e: any) {
    console.error('Qaytarish qabuli yuklanmadi:', e)
    korsat(e?.message || 'Yuklashda xato', 'xato')
  } finally {
    yuklanmoqda.value = false
  }
}

async function qabulQil(a: Ariza) {
  saqlanmoqda.value = a.id
  try {
    const r = await api.patch(`/arizalar/${a.id}/qabul`, {
      qatorlar: a.qatorlar.map(q => ({ id: q.id, qabul_dona: qabulQiymat(q) })),
      izoh: izoh[a.id] || undefined,
    })
    const f = r?._qabul?.jami_farq || 0
    korsat(f > 0
      ? `Qabul qilindi. ${fmtDona(f)} kg agent omborida qoldi.`
      : 'To\'liq qabul qilindi.', f > 0 ? 'ogoh' : 'ok')
    await yukla()
  } catch (e: any) {
    korsat(e?.message || 'Qabul qilishda xato', 'xato')
  } finally {
    saqlanmoqda.value = null
  }
}

onMounted(yukla)
</script>

<style scoped>
.qq {
  --surface:#fff; --sunken:#f8fafc; --border:rgba(15,23,42,.09);
  --shadow:0 1px 2px rgba(15,23,42,.04), 0 2px 8px rgba(15,23,42,.05);
  --ink:#0f172a; --ink2:#334155; --muted:#5d6b7f;
  --accent:#6d28d9; --accent-wash:rgba(15,118,110,.08);
  --good:#047857; --warning:#b45309; --critical:#be123c;
  display:flex; flex-direction:column; gap:14px; padding:2px 0 40px; color:var(--ink);
}
:global(:root[data-theme="dark"]) .qq,
:global(.shell.dark) .qq {
  --surface:#212836; --sunken:#181e29; --border:rgba(255,255,255,.09);
  --shadow:0 1px 2px rgba(0,0,0,.24), 0 2px 8px rgba(0,0,0,.28);
  --ink:#e8eaf0; --ink2:#a8b0c0; --muted:#8b93a7;
  --accent:#a78bfa; --accent-wash:rgba(167,139,250,.14);
  --good:#34d399; --warning:#fbbf24; --critical:#fb7185;
}

/* HEADER */
.qq-hd { display:flex; align-items:flex-start; gap:14px; flex-wrap:wrap; }
.qq-title { font-size:19px; font-weight:800; margin:0; letter-spacing:-.02em; }
.qq-sub { font-size:12px; color:var(--muted); margin:3px 0 0; }
.qq-hd-r { margin-left:auto; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.qq-tabs { display:flex; background:var(--seg-track); box-shadow:inset 0 0 0 1px var(--seg-brd); border-radius:10px; padding:3px; gap:2px; }
.qq-tab { display:flex; align-items:center; gap:7px; padding:7px 14px; border:none;
          background:none; border-radius:7px; font-size:12.5px; font-weight:600;
          color:var(--seg-ink); cursor:pointer; font-family:inherit; transition:color .15s; }
.qq-tab:hover:not(.on) { color:var(--seg-ink-h); }
.qq-tab.on { background:var(--seg-on-bg); color:var(--seg-on-ink); box-shadow:var(--seg-on-sh); }
.qq-badge { font-size:10px; font-weight:800; background:var(--accent); color:#fff;
            border-radius:9px; padding:1px 7px; }
.qq-badge--warn { background:var(--warning); }
.qq-ib { width:34px; height:34px; border-radius:10px; border:1px solid var(--border);
         background:var(--surface); color:var(--ink2); cursor:pointer;
         display:flex; align-items:center; justify-content:center; }
.qq-ib svg { width:16px; height:16px; }
.qq-ib:hover:not(:disabled) { border-color:var(--accent); color:var(--accent); }
.qq-spin { animation:qq-rot 1s linear infinite; }
@keyframes qq-rot { to { transform:rotate(360deg) } }

/* XULOSA */
.qq-sum { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:10px; }
.qq-s { background:var(--surface); border:1px solid var(--border); border-radius:12px;
        padding:13px 15px; box-shadow:var(--shadow); position:relative; overflow:hidden; }
.qq-s::before { content:''; position:absolute; left:0; top:0; bottom:0; width:3px; background:var(--accent); }
.qq-s--warn::before { background:var(--warning); }
.qq-s-v { font-size:20px; font-weight:800; line-height:1.1; font-variant-numeric:tabular-nums; }
.qq-s--warn .qq-s-v { color:var(--warning); }
.qq-s-l { font-size:10.5px; color:var(--muted); margin-top:2px; }

/* KARTA */
.qq-list { display:flex; flex-direction:column; gap:12px; }
.qq-card { background:var(--surface); border:1px solid var(--border); border-radius:14px;
           padding:15px; box-shadow:var(--shadow); }
.qq-card.is-eski { border-color:color-mix(in oklab,var(--warning) 34%,var(--border)); }
.qq-card-hd { display:flex; align-items:center; gap:11px; margin-bottom:12px; }
.qq-av { width:38px; height:38px; border-radius:12px; color:#fff; font-size:15px;
         font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.qq-card-n { flex:1; min-width:0; }
.qq-card-t { font-size:14px; font-weight:800; }
.qq-card-s { font-size:11px; color:var(--muted); margin-top:1px; }
.qq-kun { font-size:10.5px; font-weight:700; padding:3px 9px; border-radius:20px;
          background:var(--sunken); color:var(--muted); white-space:nowrap; }
.qq-kun.eski { background:color-mix(in oklab,var(--warning) 13%,transparent); color:var(--warning); }

/* JADVAL */
.qq-tbl-wrap { overflow-x:auto; }
.qq-tbl { width:100%; border-collapse:collapse; font-size:12.5px; min-width:480px; }
.qq-tbl th { text-align:left; padding:8px 10px; font-size:10.5px; font-weight:700;
             color:var(--muted); text-transform:uppercase; letter-spacing:.03em;
             border-bottom:1px solid var(--border); white-space:nowrap; }
.qq-th-in { color:var(--accent); }
.qq-tbl td { padding:9px 10px; border-bottom:1px solid var(--border); }
.qq-tbl tfoot td { border-top:2px solid var(--border); border-bottom:none;
                   font-weight:800; padding-top:11px; }
.r { text-align:right; font-variant-numeric:tabular-nums; }
.qq-tn { font-weight:600; }
.qq-tk { font-size:10.5px; color:var(--muted); }
.qq-aytdi { color:var(--ink2); }
.qq-in { width:88px; padding:6px 9px; border:1.5px solid var(--border); border-radius:8px;
         background:var(--surface); color:var(--ink); font-size:12.5px; font-weight:700;
         text-align:right; outline:none; font-variant-numeric:tabular-nums; font-family:inherit; }
.qq-in:focus { border-color:var(--accent); }
.qq-farq { color:var(--critical); font-weight:800; }
.qq-ok { color:var(--good); font-weight:800; }

.qq-warn { display:flex; align-items:center; gap:8px; margin-top:11px; padding:9px 13px;
           border-radius:10px; font-size:12px; font-weight:600;
           background:color-mix(in oklab,var(--warning) 9%,transparent); color:var(--warning);
           border:1px solid color-mix(in oklab,var(--warning) 26%,transparent); }
.qq-warn svg { width:15px; height:15px; flex-shrink:0; }

.qq-card-ft { display:flex; align-items:center; gap:10px; margin-top:12px;
              padding-top:12px; border-top:1px solid var(--border); flex-wrap:wrap; }
.qq-izoh { flex:1; min-width:180px; padding:8px 12px; border:1px solid var(--border);
           border-radius:9px; background:var(--surface); color:var(--ink);
           font-size:12.5px; outline:none; font-family:inherit; }
.qq-izoh:focus { border-color:var(--accent); }
.qq-btn-ok { display:flex; align-items:center; gap:7px; padding:9px 20px; border:none;
             border-radius:9px; background:var(--accent); color:#fff; font-size:13px;
             font-weight:700; cursor:pointer; font-family:inherit; white-space:nowrap; }
.qq-btn-ok svg { width:15px; height:15px; }
.qq-btn-ok:hover:not(:disabled) { filter:brightness(1.08); }
.qq-btn-ok:disabled { opacity:.6; cursor:not-allowed; }

/* HOLAT */
.qq-empty, .qq-load { display:flex; flex-direction:column; align-items:center; justify-content:center;
                      gap:11px; padding:56px 20px; color:var(--muted); font-size:13px; text-align:center; }
.qq-empty svg { width:34px; height:34px; opacity:.5; color:var(--good); }
.qq-empty p { margin:0; }
.qq-load { flex-direction:row; }
.qq-spin2 { width:17px; height:17px; border:2.5px solid var(--border);
            border-top-color:var(--accent); border-radius:50%;
            animation:qq-rot .7s linear infinite; flex-shrink:0; }
.qq-spin2--sm { width:14px; height:14px; border-width:2px;
                border-color:rgba(255,255,255,.35); border-top-color:#fff; }

/* XABAR */
.qq-toast { position:fixed; right:22px; bottom:22px; z-index:900;
            padding:12px 18px; border-radius:11px; font-size:13px; font-weight:600;
            box-shadow:0 12px 30px rgba(15,23,42,.18); background:var(--surface);
            border:1px solid var(--border); color:var(--ink); max-width:340px; }
.qq-toast.ok    { border-color:color-mix(in oklab,var(--good) 40%,var(--border)); color:var(--good); }
.qq-toast.ogoh  { border-color:color-mix(in oklab,var(--warning) 40%,var(--border)); color:var(--warning); }
.qq-toast.xato  { border-color:color-mix(in oklab,var(--critical) 40%,var(--border)); color:var(--critical); }
.qq-fade-enter-active, .qq-fade-leave-active { transition:opacity .25s, transform .25s; }
.qq-fade-enter-from, .qq-fade-leave-to { opacity:0; transform:translateY(10px); }

@media (max-width:700px) {
  .qq-hd-r { width:100%; }
  .qq-tabs { flex:1; }
  .qq-tab { flex:1; justify-content:center; }
}
@media (prefers-reduced-motion: reduce) { .qq-spin, .qq-spin2 { animation:none } }
</style>
