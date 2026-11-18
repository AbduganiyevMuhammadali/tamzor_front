<script setup>
/* Ombor → Kirim (prixod) ro'yxati.
   O'chirish: qoralama — oddiy tasdiq; tasdiqlangan — faqat Admin, o'chirish paroli bilan
   (Sozlamalar → Xavfsizlik, standart 123): ombordagi kirim, yetkazuvchi qarzi/to'lovi va
   kassa chiqimi bekor bo'ladi; tovari sotilgan bo'lsa server rad etadi (2026-11-03). */
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../../../api/api.js'
import { authStore } from '@/stores/auth'

const router = useRouter()
const admin = computed(() => authStore.isAdmin.value)

// ─── State ────────────────────────────────────────────────────────────────────
const rows        = ref([])
const loading     = ref(false)
const total       = ref(0)
const page        = ref(1)
const limit       = 20

const search      = ref('')
const filterHolat = ref('')
const dateFrom    = ref('')
const dateTo      = ref('')

// ─── Load ─────────────────────────────────────────────────────────────────────
async function load() {
  loading.value = true
  try {
    const p = new URLSearchParams({ page: page.value, limit })
    if (search.value)      p.set('search',    search.value)
    if (filterHolat.value) p.set('holat',     filterHolat.value)
    if (dateFrom.value)    p.set('date_from', dateFrom.value)
    if (dateTo.value)      p.set('date_to',   dateTo.value)
    const data = await api.get(`/prixod?${p}`)
    rows.value  = data.data  ?? []
    total.value = data.total ?? 0
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch([search, filterHolat, dateFrom, dateTo], () => { page.value = 1; load() })

// ─── O'chirish ────────────────────────────────────────────────────────────────
const ochir = ref(null)          // { row, parol, xato, band }
const xabar = ref('')
let xabarT = null
function xabarKorsat(m) { xabar.value = m; clearTimeout(xabarT); xabarT = setTimeout(() => { xabar.value = '' }, 7000) }

function ochirMumkin(row) { return row.holat !== 'tasdiqlangan' || admin.value }
function ochirOch(row) {
  if (!ochirMumkin(row)) return
  ochir.value = { row, parol: '', xato: '', band: false }
  setTimeout(() => document.getElementById('pr-parol')?.focus(), 60)
}
async function ochirTasdiqla() {
  const o = ochir.value
  if (!o || o.band) return
  const tasdiq = o.row.holat === 'tasdiqlangan'
  if (tasdiq && !o.parol) { o.xato = "O'chirish parolini kiriting"; return }
  o.band = true; o.xato = ''
  try {
    const r = await api.delete(`/prixod/${o.row.id}`, tasdiq ? { parol: o.parol } : undefined)
    ochir.value = null
    xabarKorsat(r?.message || "Hujjat o'chirildi")
    await load()
  } catch (e) {
    o.xato = e.message || "O'chirib bo'lmadi"
    o.band = false
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('uz-UZ', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }).replace(',', '')
}
function fmtSum(n) {
  if (!n && n !== 0) return '—'
  return Number(n).toLocaleString('uz-UZ') + ' UZS'
}
function fmtKg(n) {
  return Number(n || 0).toLocaleString('uz-UZ', { maximumFractionDigits: 3 })
}
const hujjatNomi = (row) => row.hujjat_raqam || ('d0_' + row.id)

const totalPages = computed(() => Math.ceil(total.value / limit))
</script>

<template>
  <div class="pr-page">

    <!-- Header -->
    <div class="pr-hd">
      <div class="pr-hd-left">
        <h2 class="pr-title">Kelib tushganlar ro'yxati</h2>
        <span class="pr-total-badge">{{ total }} ta hujjat</span>
      </div>
      <button class="pr-create-btn" @click="router.push('/ombor/prixod/yangi')">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
        Qo'shish
      </button>
    </div>

    <!-- Filters -->
    <div class="pr-filters">
      <div class="pr-srch">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/></svg>
        <input v-model="search" placeholder="Yetkazuvchi qidirish..." class="pr-srch-in"/>
      </div>
      <select v-model="filterHolat" class="pr-flt-sel">
        <option value="">Barcha holat</option>
        <option value="qoralama">Qoralama</option>
        <option value="tasdiqlangan">Tasdiqlangan</option>
      </select>
      <div class="pr-date-range">
        <input type="date" v-model="dateFrom" class="pr-date-in" placeholder="Dan"/>
        <span class="pr-date-sep">—</span>
        <input type="date" v-model="dateTo" class="pr-date-in" placeholder="Gacha"/>
      </div>
    </div>

    <div v-if="xabar" class="pr-xabar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
      <span>{{ xabar }}</span>
      <button class="pr-xabar-x" @click="xabar = ''">×</button>
    </div>

    <!-- Table -->
    <div class="pr-table-wrap">
      <div v-if="loading" class="pr-loading">
        <div class="pr-spinner"/>
        Yuklanmoqda...
      </div>
      <template v-else>
        <table class="pr-table" v-if="rows.length">
          <thead>
            <tr>
              <th class="pr-th">Hujjat</th>
              <th class="pr-th">Sana</th>
              <th class="pr-th">Yetkazuvchi</th>
              <th class="pr-th pr-col-ombor">Ombor</th>
              <th class="pr-th pr-th--right">Kg</th>
              <th class="pr-th pr-th--right">Summa</th>
              <th class="pr-th pr-col-izoh">Izoh</th>
              <th class="pr-th">Holat</th>
              <th class="pr-th pr-th--acts"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id" class="pr-tr" @click="router.push(`/ombor/prixod/${row.id}`)">
              <td class="pr-td">
                <div class="pr-doc-id">
                  <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/></svg>
                  <span class="pr-doc-id-txt">{{ hujjatNomi(row) }}</span>
                </div>
                <span v-if="row.tovar_soni" class="pr-tovar-cnt">{{ row.tovar_soni }} xil tovar</span>
              </td>
              <td class="pr-td pr-td--date">
                <div>{{ fmtDate(row.sana) }}</div>
                <div class="pr-sub" :title="'Yaratilgan: ' + fmtDate(row.createdAt)">kiritildi {{ fmtDate(row.createdAt) }}</div>
              </td>
              <td class="pr-td">
                <span v-if="row.yetkazuvchi" class="pr-supplier">{{ row.yetkazuvchi }}</span>
                <span v-else class="pr-muted">—</span>
              </td>
              <td class="pr-td pr-col-ombor"><span class="pr-warehouse">{{ row.ombor || '—' }}</span></td>
              <td class="pr-td pr-td--right pr-td--num">{{ row.jami_donada ? fmtKg(row.jami_donada) : '—' }}</td>
              <td class="pr-td pr-td--right"><span class="pr-summa">{{ fmtSum(row.jami_summa) }}</span></td>
              <td class="pr-td pr-td--muted pr-td--sm pr-col-izoh" :title="row.izoh || ''">{{ row.izoh || '—' }}</td>
              <td class="pr-td">
                <span :class="['pr-holat', row.holat === 'tasdiqlangan' ? 'pr-holat--ok' : 'pr-holat--draft']">
                  {{ row.holat === 'tasdiqlangan' ? 'Tasdiqlangan' : 'Qoralama' }}
                </span>
              </td>
              <td class="pr-td pr-td--acts" @click.stop>
                <button class="pr-act-btn pr-act-btn--edit" @click.stop="router.push(`/ombor/prixod/${row.id}`)" title="Ochish / tahrirlash">
                  <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
                </button>
                <button class="pr-act-btn pr-act-btn--del" :disabled="!ochirMumkin(row)"
                  @click.stop="ochirOch(row)"
                  :title="ochirMumkin(row) ? (row.holat === 'tasdiqlangan' ? 'O\'chirish (parol bilan)' : 'O\'chirish') : 'Tasdiqlangan hujjatni faqat Admin o\'chira oladi'">
                  <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty -->
        <div v-else class="pr-empty">
          <div class="pr-empty-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"/>
            </svg>
          </div>
          <p class="pr-empty-title">Hujjatlar topilmadi</p>
          <p class="pr-empty-sub">Yangi prixod yaratish uchun "Qo'shish" tugmasini bosing</p>
          <button class="pr-create-btn" @click="router.push('/ombor/prixod/yangi')">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
            Yangi prixod
          </button>
        </div>
      </template>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pr-pagination">
      <span class="pr-pag-info">{{ (page - 1) * limit + 1 }} – {{ Math.min(page * limit, total) }} / {{ total }}</span>
      <div class="pr-pag-btns">
        <button class="pr-pag-btn" :disabled="page <= 1" @click="page--; load()">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
        </button>
        <button v-for="p in totalPages" :key="p" class="pr-pag-btn" :class="p === page && 'pr-pag-btn--on'" @click="page = p; load()">{{ p }}</button>
        <button class="pr-pag-btn" :disabled="page >= totalPages" @click="page++; load()">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>
        </button>
      </div>
    </div>

    <!-- O'chirish oynasi -->
    <Teleport to="body">
      <div v-if="ochir" class="pr-modal-bg" @click.self="!ochir.band && (ochir = null)">
        <div class="pr-modal" role="dialog" aria-modal="true">
          <div class="pr-modal-hd">
            <div class="pr-modal-ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
            </div>
            <div>
              <div class="pr-modal-t">{{ ochir.row.holat === 'tasdiqlangan' ? 'Tasdiqlangan hujjatni o\'chirish' : 'Qoralamani o\'chirish' }}</div>
              <div class="pr-modal-s">{{ hujjatNomi(ochir.row) }} · {{ fmtDate(ochir.row.sana) }}</div>
            </div>
          </div>

          <div class="pr-modal-body">
            <div class="pr-mkv"><span>Yetkazuvchi</span><b>{{ ochir.row.yetkazuvchi || '—' }}</b></div>
            <div class="pr-mkv"><span>Tovar</span><b>{{ ochir.row.tovar_soni || 0 }} xil · {{ fmtKg(ochir.row.jami_donada) }} kg</b></div>
            <div class="pr-mkv"><span>Summa</span><b>{{ fmtSum(ochir.row.jami_summa) }}</b></div>

            <div v-if="ochir.row.holat === 'tasdiqlangan'" class="pr-mwarn">
              <b>Bu hujjat omborga kirgan.</b> O'chirilsa: {{ fmtKg(ochir.row.jami_donada) }} kg ombordan chiqariladi,
              {{ ochir.row.yetkazuvchi ? 'yetkazuvchi qarzi ' + fmtSum(ochir.row.jami_summa) + ' ga kamayadi' : 'yetkazuvchi yozuvi yo\'q' }},
              shu hujjat bo'yicha to'lov bo'lsa kassa chiqimi ham bekor bo'ladi. Tovari allaqachon sotilgan bo'lsa tizim o'chirishga yo'l qo'ymaydi.
            </div>
            <div v-else class="pr-mnote">Qoralama hali omborga kirmagan, o'chirish hech narsaga ta'sir qilmaydi.</div>

            <label v-if="ochir.row.holat === 'tasdiqlangan'" class="pr-mfield">
              <span>O'chirish paroli</span>
              <input id="pr-parol" v-model="ochir.parol" type="password" class="pr-min" autocomplete="off" placeholder="Parol"
                :disabled="ochir.band" @keydown.enter.prevent="ochirTasdiqla"/>
              <small>Foydalanuvchi parolidan farqli, Sozlamalar → Xavfsizlik bo'limida o'zgartiriladi</small>
            </label>

            <div v-if="ochir.xato" class="pr-merr">{{ ochir.xato }}</div>
          </div>

          <div class="pr-modal-ft">
            <button class="pr-mbtn pr-mbtn--ghost" :disabled="ochir.band" @click="ochir = null">Bekor qilish</button>
            <button class="pr-mbtn pr-mbtn--danger" :disabled="ochir.band || (ochir.row.holat === 'tasdiqlangan' && !ochir.parol)" @click="ochirTasdiqla">
              {{ ochir.band ? "O'chirilmoqda…" : "O'chirish" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<style scoped>
.pr-page { display:flex; flex-direction:column; gap:16px; }

/* Header */
.pr-hd { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.pr-hd-left { display:flex; align-items:center; gap:10px; }
.pr-title { font-size:20px; font-weight:700; color:var(--title); margin:0; }
.pr-total-badge { padding:3px 10px; border-radius:99px; background:var(--mini-bg); border:1px solid var(--card-border); font-size:12px; color:var(--muted); font-weight:600; }
.pr-create-btn { display:inline-flex; align-items:center; gap:6px; height:36px; padding:0 16px; border-radius:10px; border:none; background:linear-gradient(135deg,#a78bfa,#8b5cf6); color:#fff; font-size:13px; font-weight:600; cursor:pointer; box-shadow:0 2px 8px rgba(139,92,246,.3); transition:.12s; }
.pr-create-btn:hover { transform:translateY(-1px); box-shadow:0 4px 14px rgba(139,92,246,.4); }
.pr-create-btn svg { width:15px; height:15px; }

/* Filters */
.pr-filters { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.pr-srch { display:flex; align-items:center; gap:7px; height:36px; padding:0 12px; background:var(--card-bg); border:1px solid var(--card-border); border-radius:10px; min-width:220px; }
.pr-srch svg { width:14px; height:14px; color:var(--muted); flex-shrink:0; }
.pr-srch-in { border:none; background:transparent; outline:none; font-size:13px; color:var(--body); width:100%; }
.pr-srch-in::placeholder { color:var(--muted); }
.pr-flt-sel { height:36px; padding:0 10px; border-radius:10px; border:1px solid var(--card-border); background:var(--card-bg); color:var(--body); font-size:13px; outline:none; cursor:pointer; }
.pr-date-range { display:flex; align-items:center; gap:6px; }
.pr-date-in { height:36px; padding:0 10px; border-radius:10px; border:1px solid var(--card-border); background:var(--card-bg); color:var(--body); font-size:12px; outline:none; }
.pr-date-in:focus { border-color:#8b5cf6; }
.pr-date-sep { color:var(--muted); font-size:13px; }

/* Xabar */
.pr-xabar { display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:12px; background:rgba(16,185,129,.1); border:1px solid rgba(16,185,129,.3); color:#047857; font-size:13px; font-weight:600; }
.pr-xabar svg { width:16px; height:16px; flex-shrink:0; }
.pr-xabar span { flex:1; }
.pr-xabar-x { border:none; background:transparent; color:inherit; font-size:18px; cursor:pointer; line-height:1; padding:0 4px; }
.shell.dark .pr-xabar { color:#6ee7b7; }

/* Table */
.pr-table-wrap { background:var(--card-bg); border:1px solid var(--card-border); border-radius:14px; overflow:auto; }
.pr-table { width:100%; border-collapse:collapse; }
.pr-th { padding:10px 10px; font-size:11px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.05em; background:var(--mini-bg); border-bottom:1px solid var(--card-border); white-space:nowrap; text-align:left; }
.pr-th:first-child, .pr-td:first-child { padding-left:14px; }
.pr-th--right { text-align:right; }
.pr-th--acts { width:76px; }
.pr-tr { cursor:pointer; transition:background .1s; }
.pr-tr:hover { background:var(--mini-bg); }
.pr-tr:not(:last-child) { border-bottom:1px solid var(--card-border); }
.pr-td { padding:10px 10px; font-size:13px; color:var(--body); vertical-align:middle; }
/* Tor ekranda ikkinchi darajali ustunlar yashirinadi — Holat va tugmalar doim ko'rinsin */
@media (max-width: 1500px) { .pr-col-izoh { display:none; } }
@media (max-width: 1280px) { .pr-col-ombor { display:none; } .pr-sub { display:none; } }
.pr-td--date { white-space:nowrap; font-size:12.5px; }
.pr-sub { font-size:10.5px; color:var(--muted); margin-top:2px; }
.pr-td--muted { color:var(--muted); }
.pr-td--right { text-align:right; }
.pr-td--num { font-variant-numeric:tabular-nums; font-size:12.5px; white-space:nowrap; }
.pr-td--sm { font-size:11px; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pr-td--acts { white-space:nowrap; text-align:right; padding-left:6px; }

.pr-doc-id { display:inline-flex; align-items:center; gap:6px; color:#8b5cf6; font-weight:600; font-size:12px; white-space:nowrap; }
.pr-doc-id svg { width:14px; height:14px; flex-shrink:0; }
.pr-tovar-cnt { display:block; font-size:10.5px; color:var(--muted); margin-top:2px; margin-left:20px; white-space:nowrap; }
.pr-supplier { font-weight:500; }
.pr-warehouse { font-size:12px; color:var(--muted); white-space:nowrap; }
.pr-muted { color:var(--muted); font-size:12px; }
.pr-summa { font-weight:600; color:var(--title); font-size:12.5px; font-variant-numeric:tabular-nums; white-space:nowrap; }

.pr-holat { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:99px; font-size:10px; font-weight:700; white-space:nowrap; }
.pr-holat::before { content:''; width:5px; height:5px; border-radius:50%; background:currentColor; }
.pr-holat--ok    { background:rgba(16,185,129,.1); color:#10b981; border:1px solid rgba(16,185,129,.2); }
.pr-holat--draft { background:rgba(245,158,11,.1); color:#f59e0b; border:1px solid rgba(245,158,11,.2); }

.pr-act-btn { width:30px; height:30px; border-radius:8px; border:none; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:.1s; vertical-align:middle; }
.pr-act-btn svg { width:14px; height:14px; }
.pr-act-btn--edit { background:rgba(139,92,246,.08); color:#8b5cf6; }
.pr-act-btn--edit:hover { background:rgba(139,92,246,.18); }
.pr-act-btn--del  { background:rgba(239,68,68,.07); color:#ef4444; margin-left:4px; }
.pr-act-btn--del:hover:not(:disabled) { background:rgba(239,68,68,.16); }
.pr-act-btn--del:disabled { opacity:.3; cursor:not-allowed; }

/* Loading */
.pr-loading { display:flex; align-items:center; justify-content:center; gap:10px; padding:60px 20px; color:var(--muted); font-size:13px; }
.pr-spinner { width:20px; height:20px; border:2px solid var(--card-border); border-top-color:#8b5cf6; border-radius:50%; animation:spin .7s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }

/* Empty */
.pr-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; padding:64px 20px; }
.pr-empty-ic { width:64px; height:64px; border-radius:16px; background:var(--mini-bg); display:flex; align-items:center; justify-content:center; border:1px solid var(--card-border); }
.pr-empty-ic svg { width:32px; height:32px; color:var(--muted); opacity:.6; }
.pr-empty-title { font-size:15px; font-weight:600; color:var(--title); margin:0; }
.pr-empty-sub { font-size:13px; color:var(--muted); margin:0; }

/* Pagination */
.pr-pagination { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.pr-pag-info { font-size:12px; color:var(--muted); }
.pr-pag-btns { display:flex; gap:4px; }
.pr-pag-btn { width:32px; height:32px; border-radius:8px; border:1px solid var(--card-border); background:var(--card-bg); color:var(--body); font-size:12px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:.1s; }
.pr-pag-btn:hover:not(:disabled) { border-color:#8b5cf6; color:#8b5cf6; }
.pr-pag-btn--on { background:#8b5cf6; border-color:#8b5cf6; color:#fff; font-weight:700; }
.pr-pag-btn:disabled { opacity:.35; cursor:not-allowed; }
.pr-pag-btn svg { width:14px; height:14px; }

/* O'chirish oynasi */
.pr-modal-bg { position:fixed; inset:0; z-index:1000; background:rgba(15,23,42,.55); display:flex; align-items:center; justify-content:center; padding:16px; }
.pr-modal { width:min(460px, 100%); background:var(--surface,#fff); color:var(--ink,#0f172a); border-radius:18px; box-shadow:0 24px 60px rgba(0,0,0,.3); overflow:hidden; }
.pr-modal-hd { display:flex; align-items:center; gap:12px; padding:18px 20px 12px; }
.pr-modal-ic { width:42px; height:42px; border-radius:12px; background:rgba(239,68,68,.1); color:#dc2626; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.pr-modal-ic svg { width:22px; height:22px; }
.pr-modal-t { font-size:16px; font-weight:700; }
.pr-modal-s { font-size:12px; color:var(--mut,#64748b); margin-top:2px; }
.pr-modal-body { padding:4px 20px 16px; display:flex; flex-direction:column; gap:8px; }
.pr-mkv { display:flex; justify-content:space-between; gap:12px; font-size:13px; padding:6px 0; border-bottom:1px solid var(--line,#eef2f7); }
.pr-mkv span { color:var(--mut,#64748b); }
.pr-mkv b { font-weight:600; text-align:right; }
.pr-mwarn { margin-top:6px; padding:10px 12px; border-radius:10px; background:rgba(245,158,11,.1); border:1px solid rgba(245,158,11,.3); color:#92400e; font-size:12.5px; line-height:1.5; }
.shell.dark .pr-mwarn { color:#fcd34d; }
.pr-mnote { margin-top:6px; font-size:12.5px; color:var(--mut,#64748b); }
.pr-mfield { display:flex; flex-direction:column; gap:5px; margin-top:6px; }
.pr-mfield > span { font-size:12px; font-weight:600; color:var(--mut,#475569); }
.pr-mfield small { font-size:11px; color:var(--mut,#94a3b8); }
.pr-min { height:40px; padding:0 12px; border:1.5px solid var(--line,#e2e8f0); border-radius:10px; font-size:15px; letter-spacing:.2em; background:var(--surface,#fff); color:var(--ink,#0f172a); outline:none; }
.pr-min:focus { border-color:#8b5cf6; box-shadow:0 0 0 3px rgba(139,92,246,.15); }
.pr-merr { padding:9px 12px; border-radius:10px; background:rgba(239,68,68,.08); border:1px solid rgba(239,68,68,.3); color:#b91c1c; font-size:12.5px; line-height:1.5; }
.shell.dark .pr-merr { color:#fca5a5; }
.pr-modal-ft { display:flex; justify-content:flex-end; gap:8px; padding:12px 20px 18px; background:var(--hov,#f8fafc); }
.pr-mbtn { height:38px; padding:0 16px; border-radius:10px; font-size:13px; font-weight:600; cursor:pointer; border:1px solid transparent; }
.pr-mbtn:disabled { opacity:.5; cursor:not-allowed; }
.pr-mbtn--ghost { background:transparent; border-color:var(--line,#e2e8f0); color:var(--ink2,#334155); }
.pr-mbtn--danger { background:#dc2626; color:#fff; }
.pr-mbtn--danger:hover:not(:disabled) { background:#b91c1c; }
</style>
