<script setup>
import { ref, reactive, computed } from 'vue'
import { api } from '../../api/api.js'

const filter = reactive({
  search:  '',
  ombor:   '',
  turkum:  '',
})

const loading = ref(false)
const rows    = ref([])

let debounceTimer = null
function loadData() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    loading.value = true
    const p = new URLSearchParams()
    if (filter.search) p.set('search', filter.search)
    if (filter.ombor)  p.set('ombor',  filter.ombor)
    if (filter.turkum) p.set('turkum', filter.turkum)
    try {
      rows.value = await api.get(`/hisobot/partiya-qoldiqlar?${p.toString()}`)
    } finally {
      loading.value = false
    }
  }, 300)
}

loadData()

// KPI
const totalPozitsiya = computed(() => rows.value.length)
const totalKirim     = computed(() => rows.value.reduce((s, r) => s + Number(r.kirim_dona  || 0), 0))
const totalQoldiq    = computed(() => rows.value.reduce((s, r) => s + Number(r.qoldiq_dona || 0), 0))
const totalSumma     = computed(() => rows.value.reduce((s, r) => s + Number(r.qoldiq_summa|| 0), 0))

function fmtSum(n) { return Number(n || 0).toLocaleString('uz-UZ') }
function fmtDate(d) {
  if (!d) return '—'
  const dt = new Date(d)
  return dt.toLocaleDateString('uz-UZ', { day:'2-digit', month:'2-digit', year:'numeric' })
}
function shortSum(n) {
  n = Number(n || 0)
  if (n >= 1e9) return (n / 1e9).toFixed(1) + ' mlrd'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + ' mln'
  if (n >= 1e3) return (n / 1e3).toFixed(0) + ' ming'
  return n.toString()
}

const COLORS = ['#4f46e5','#6366f1','#4338ca','#3730a3']
function colorAt(i) { return COLORS[i % COLORS.length] }
</script>

<template>
  <div class="pt">

    <!-- HEADER -->
    <div class="pt-header">
      <div class="pt-header-l">
        <div class="pt-icon">
          <svg viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z"/><path fill-rule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>
        </div>
        <div>
          <h1 class="pt-title">Partiya bo'yicha qoldiqlar</h1>
          <p class="pt-sub">Har bir prixod partiyasi bo'yicha qolgan tovar miqdori</p>
        </div>
      </div>

      <!-- Filters -->
      <div class="pt-filters">
        <div class="pt-fg">
          <label class="pt-flbl">Qidirish</label>
          <input type="text" v-model="filter.search" @input="loadData" placeholder="Tovar nomi..." class="pt-fin"/>
        </div>
        <div class="pt-fg">
          <label class="pt-flbl">Ombor</label>
          <select v-model="filter.ombor" @change="loadData" class="pt-fin pt-fsel">
            <option value="">Barcha omborlar</option>
            <option>Основной склад</option>
            <option>Запасной склад</option>
          </select>
        </div>
        <div class="pt-fg">
          <label class="pt-flbl">Turkum</label>
          <input type="text" v-model="filter.turkum" @input="loadData" placeholder="Turkum..." class="pt-fin" style="min-width:100px"/>
        </div>
        <button class="pt-refresh" @click="loadData()" :class="{ 'pt-refresh--spin': loading }">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/></svg>
        </button>
      </div>
    </div>

    <!-- KPI chips -->
    <div class="pt-kpis">
      <div class="pt-kpi pt-kpi--purple">
        <div class="pt-kpi-ic">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/></svg>
        </div>
        <div>
          <div class="pt-kpi-val">{{ fmtSum(totalPozitsiya) }}</div>
          <div class="pt-kpi-lbl">Partiya pozitsiyalari</div>
        </div>
      </div>
      <div class="pt-kpi pt-kpi--blue">
        <div class="pt-kpi-ic">
          <svg viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z"/><path fill-rule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>
        </div>
        <div>
          <div class="pt-kpi-val">{{ fmtSum(totalKirim) }}</div>
          <div class="pt-kpi-lbl">Jami kirim kg</div>
        </div>
      </div>
      <div class="pt-kpi pt-kpi--violet">
        <div class="pt-kpi-ic">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/></svg>
        </div>
        <div>
          <div class="pt-kpi-val">{{ fmtSum(totalQoldiq) }}</div>
          <div class="pt-kpi-lbl">Jami qoldiq kg</div>
        </div>
      </div>
      <div class="pt-kpi pt-kpi--green">
        <div class="pt-kpi-ic">
          <svg viewBox="0 0 20 20" fill="currentColor"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.077 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.077-2.354-1.253V5z" clip-rule="evenodd"/></svg>
        </div>
        <div>
          <div class="pt-kpi-val">{{ shortSum(totalSumma) }}</div>
          <div class="pt-kpi-lbl">Qoldiq qiymati (UZS)</div>
        </div>
      </div>
    </div>

    <!-- TABLE CARD -->
    <div class="pt-card">
      <div class="pt-card-head">
        <svg viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z"/><path fill-rule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>
        Partiya qoldiqlari ro'yxati
        <span class="pt-count-chip">{{ rows.length }} ta qator</span>
      </div>

      <div class="pt-tbl-wrap">
        <div v-if="loading" class="pt-loading">
          <span class="pt-spin"/>
          Yuklanmoqda...
        </div>
        <table v-else class="pt-tbl">
          <thead>
            <tr>
              <th class="pt-th pt-th--num">#</th>
              <th class="pt-th pt-th--av"></th>
              <th class="pt-th">Tovar nomi</th>
              <th class="pt-th">Turkum</th>
              <th class="pt-th">Ombor</th>
              <th class="pt-th">Prixod #</th>
              <th class="pt-th">Yetkazuvchi</th>
              <th class="pt-th">Sana</th>
              <th class="pt-th pt-th--r">Kirim kg</th>
              <th class="pt-th pt-th--r">Qoldiq kg</th>
              <th class="pt-th pt-th--r">Kirim narx</th>
              <th class="pt-th pt-th--r pt-th--sum">Qoldiq summa</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="rows.length === 0">
              <td colspan="12" class="pt-td-empty">Ma'lumot topilmadi</td>
            </tr>
            <tr v-for="(r, i) in rows" :key="`${r.prixod_id}_${r.tovar_id}_${i}`" class="pt-tr">
              <td class="pt-td pt-td--num">{{ i + 1 }}</td>
              <td class="pt-td pt-td--av">
                <div class="pt-av" :style="{ background: colorAt(i) + '22', color: colorAt(i) }">
                  {{ (r.tovar_nomi || '?').charAt(0).toUpperCase() }}
                </div>
              </td>
              <td class="pt-td pt-td--name">{{ r.tovar_nomi }}</td>
              <td class="pt-td">
                <span v-if="r.turkum" class="pt-chip">{{ r.turkum }}</span>
                <span v-else class="pt-muted">—</span>
              </td>
              <td class="pt-td">
                <span class="pt-ombor-tag">{{ r.ombor }}</span>
              </td>
              <td class="pt-td">
                <span class="pt-prixod-tag">{{ r.hujjat_raqam }}</span>
              </td>
              <td class="pt-td pt-td--yetk">{{ r.yetkazuvchi }}</td>
              <td class="pt-td pt-td--date">{{ fmtDate(r.prixod_sana) }}</td>
              <td class="pt-td pt-td--r pt-td--mono">{{ fmtSum(r.kirim_dona) }}</td>
              <td class="pt-td pt-td--r">
                <span class="pt-qoldiq" :class="r.qoldiq_dona > 0 ? 'pt-qoldiq--ok' : 'pt-qoldiq--zero'">
                  {{ fmtSum(r.qoldiq_dona) }}
                </span>
              </td>
              <td class="pt-td pt-td--r pt-td--mono">{{ fmtSum(r.kirim_narx) }}</td>
              <td class="pt-td pt-td--r pt-td--sum-cell">{{ fmtSum(r.qoldiq_summa) }}</td>
            </tr>
          </tbody>
          <tfoot v-if="rows.length > 0">
            <tr class="pt-tfoot">
              <td colspan="8" class="pt-tfoot-lbl">Jami</td>
              <td class="pt-tfoot-val">{{ fmtSum(totalKirim) }}</td>
              <td class="pt-tfoot-val">{{ fmtSum(totalQoldiq) }}</td>
              <td class="pt-tfoot-val"></td>
              <td class="pt-tfoot-val pt-tfoot-sum">{{ fmtSum(totalSumma) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

  </div>
</template>

<style scoped>
.pt { display:flex; flex-direction:column; gap:20px; min-height:100%; }

/* Header */
.pt-header { display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; }
.pt-header-l { display:flex; align-items:center; gap:14px; }
.pt-icon { width:44px; height:44px; border-radius:13px; background:linear-gradient(135deg,rgba(99,102,241,.15),rgba(99,102,241,.15)); border:1.5px solid rgba(99,102,241,.2); display:flex; align-items:center; justify-content:center; color:#6366f1; flex-shrink:0; }
.pt-icon svg { width:20px; height:20px; }
.pt-title { font-size:22px; font-weight:800; color:var(--title,#111827); margin:0; letter-spacing:-.3px; }
.pt-sub { font-size:12px; color:var(--muted,#9ca3af); margin:2px 0 0; }

/* Filters */
.pt-filters { display:flex; align-items:flex-end; gap:10px; flex-wrap:wrap; }
.pt-fg { display:flex; flex-direction:column; gap:4px; }
.pt-flbl { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--muted,#9ca3af); }
.pt-fin { height:36px; padding:0 10px; border-radius:9px; border:1.5px solid var(--card-border,#e5e7eb); background:var(--card-bg,#fff); color:var(--body,#374151); font-size:12.5px; outline:none; transition:.12s; font-family:inherit; min-width:130px; }
.pt-fin:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.1); }
.pt-fsel { padding-right:28px; cursor:pointer; }
.pt-refresh { width:36px; height:36px; border-radius:9px; border:1.5px solid var(--card-border,#e5e7eb); background:var(--card-bg,#fff); color:var(--muted,#9ca3af); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:.15s; }
.pt-refresh:hover { border-color:#6366f1; color:#6366f1; }
.pt-refresh svg { width:15px; height:15px; }
.pt-refresh--spin svg { animation:spin .7s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }

/* KPI chips */
.pt-kpis { display:flex; gap:12px; flex-wrap:wrap; }
.pt-kpi { display:flex; align-items:center; gap:10px; padding:12px 16px; border-radius:13px; border:1.5px solid; flex:1; min-width:160px; }
.pt-kpi--purple { background:rgba(99,102,241,.06); border-color:rgba(99,102,241,.2); }
.pt-kpi--blue   { background:rgba(99,102,241,.06);  border-color:rgba(99,102,241,.2);  }
.pt-kpi--violet { background:rgba(99,102,241,.06); border-color:rgba(99,102,241,.2); }
.pt-kpi--green  { background:rgba(16,185,129,.06); border-color:rgba(16,185,129,.2); }
.pt-kpi-ic { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.pt-kpi--purple .pt-kpi-ic { background:rgba(99,102,241,.12); color:#6366f1; }
.pt-kpi--blue   .pt-kpi-ic { background:rgba(99,102,241,.12);  color:#6366f1; }
.pt-kpi--violet .pt-kpi-ic { background:rgba(99,102,241,.12); color:#6366f1; }
.pt-kpi--green  .pt-kpi-ic { background:rgba(16,185,129,.12); color:#10b981; }
.pt-kpi-ic svg { width:16px; height:16px; }
.pt-kpi-val { font-size:18px; font-weight:800; color:var(--title,#111827); font-variant-numeric:tabular-nums; line-height:1.1; }
.pt-kpi--purple .pt-kpi-val { color:#6366f1; }
.pt-kpi--blue   .pt-kpi-val { color:#6366f1; }
.pt-kpi--violet .pt-kpi-val { color:#6366f1; }
.pt-kpi--green  .pt-kpi-val { color:#10b981; }
.pt-kpi-lbl { font-size:11px; font-weight:600; color:var(--muted,#9ca3af); margin-top:2px; }

/* Card */
.pt-card { background:var(--card-bg,#fff); border:1.5px solid var(--card-border,#e5e7eb); border-radius:16px; overflow:hidden; }
.pt-card-head { display:flex; align-items:center; gap:8px; padding:14px 18px 12px; font-size:11px; font-weight:700; color:var(--muted,#9ca3af); text-transform:uppercase; letter-spacing:.05em; border-bottom:1.5px solid var(--card-border,#e5e7eb); }
.pt-card-head svg { width:14px; height:14px; }
.pt-count-chip { margin-left:auto; padding:2px 9px; border-radius:99px; background:rgba(99,102,241,.08); border:1px solid rgba(99,102,241,.15); color:#6366f1; font-size:11px; font-weight:700; }

/* Table */
.pt-tbl-wrap { overflow-x:auto; }
.pt-loading { display:flex; align-items:center; justify-content:center; gap:10px; padding:48px; color:var(--muted,#9ca3af); font-size:13px; }
.pt-spin { display:inline-block; width:18px; height:18px; border:2px solid var(--card-border,#e5e7eb); border-top-color:#6366f1; border-radius:50%; animation:spin .7s linear infinite; }
.pt-tbl { width:100%; border-collapse:collapse; font-size:12.5px; min-width:1100px; }
.pt-th { padding:10px 14px; font-size:10px; font-weight:700; color:var(--muted,#9ca3af); text-transform:uppercase; letter-spacing:.05em; background:var(--mini-bg,#f8fafc); border-bottom:1.5px solid var(--card-border,#e5e7eb); white-space:nowrap; text-align:left; }
.pt-th--num { width:40px; text-align:center; }
.pt-th--av  { width:40px; }
.pt-th--r   { text-align:right; }
.pt-th--sum { color:#6366f1; }
.pt-tr { border-bottom:1px solid var(--card-border,#e5e7eb); transition:background .1s; }
.pt-tr:hover { background:rgba(99,102,241,.03); }
.pt-td { padding:9px 14px; color:var(--body,#374151); vertical-align:middle; }
.pt-td--num  { text-align:center; color:var(--muted,#9ca3af); font-size:12px; font-weight:600; }
.pt-td--av   { padding:7px 4px 7px 14px; }
.pt-td--name { font-weight:600; font-size:13px; min-width:150px; }
.pt-td--r    { text-align:right; }
.pt-td--mono { font-variant-numeric:tabular-nums; }
.pt-td--yetk { font-size:12px; color:var(--muted,#9ca3af); max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pt-td--date { font-size:12px; white-space:nowrap; }
.pt-td--sum-cell { font-weight:700; color:#6366f1; font-variant-numeric:tabular-nums; }
.pt-td-empty { text-align:center; padding:48px; color:var(--muted,#9ca3af); font-size:13px; }

.pt-av { width:30px; height:30px; border-radius:8px; font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.pt-chip { display:inline-flex; padding:1px 6px; border-radius:5px; font-size:10px; font-weight:600; background:rgba(79,70,229,.08); color:#4f46e5; border:1px solid rgba(79,70,229,.15); white-space:nowrap; }
.pt-muted { color:var(--muted,#9ca3af); font-size:12px; }
.pt-ombor-tag { padding:2px 8px; border-radius:5px; font-size:10.5px; font-weight:600; background:rgba(99,102,241,.08); color:#6366f1; border:1px solid rgba(99,102,241,.15); white-space:nowrap; }
.pt-prixod-tag { padding:2px 7px; border-radius:5px; font-size:10.5px; font-weight:600; background:rgba(99,102,241,.08); color:#6366f1; border:1px solid rgba(99,102,241,.15); white-space:nowrap; font-variant-numeric:tabular-nums; }

.pt-qoldiq { padding:2px 8px; border-radius:5px; font-size:12px; font-weight:700; font-variant-numeric:tabular-nums; }
.pt-qoldiq--ok   { background:rgba(16,185,129,.1); color:#10b981; border:1px solid rgba(16,185,129,.2); }
.pt-qoldiq--zero { background:rgba(156,163,175,.1); color:#9ca3af; border:1px solid rgba(156,163,175,.2); }

/* Tfoot */
.pt-tfoot { background:var(--mini-bg,#f8fafc); border-top:2px solid var(--card-border,#e5e7eb); }
.pt-tfoot-lbl { padding:10px 14px; font-size:11px; font-weight:800; color:var(--muted,#9ca3af); text-transform:uppercase; letter-spacing:.05em; }
.pt-tfoot-val { padding:10px 14px; font-size:13px; font-weight:700; color:var(--title,#111827); text-align:right; font-variant-numeric:tabular-nums; }
.pt-tfoot-sum { color:#6366f1; font-size:14px; }
</style>
