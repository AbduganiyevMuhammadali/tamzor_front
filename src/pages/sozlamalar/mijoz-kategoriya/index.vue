<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { api } from '@/api/api'
import { useToast } from '@/composables/useToast'

const toast = useToast()

// ── Types ─────────────────────────────────────────────────
interface MijozKat { id: number; nomi: string; izoh: string | null; narx_ruyxat_id: number | null }
interface NarxRuyxat { id: number; nomi: string; tur: string; standart: boolean; faol: boolean }

// ── State ──────────────────────────────────────────────────
const rows    = ref<MijozKat[]>([])
const narxRuyxatlar = ref<NarxRuyxat[]>([])
const loading = ref(false)
const saving  = ref(false)
const search  = ref('')

type Mode = 'add' | 'edit' | null
const mode    = ref<Mode>(null)
const editId  = ref<number | null>(null)
const form    = reactive({ nomi: '', izoh: '', narx_ruyxat_id: '' as number | '' })
const formErr = ref('')

// Har bir kategoriyaga rang
const KAT_COLORS = ['#7c3aed','#059669','#d97706','#dc2626','#8b5cf6','#6d28d9','#a78bfa','#5b21b6','#047857','#b45309']
function katColor(id: number) { return KAT_COLORS[id % KAT_COLORS.length] }

// ── API ────────────────────────────────────────────────────
async function load() {
  loading.value = true
  try {
    const [data, nr] = await Promise.all([api.get('/mijozlar/spravochnik'), api.get('/narx-ruyxatlar')])
    rows.value = data?.kategoriyalar ?? []
    narxRuyxatlar.value = Array.isArray(nr) ? nr.filter((r: NarxRuyxat) => r.faol) : []
  } catch (e: any) {
    toast.error('Yuklash xatosi', e.message)
  } finally {
    loading.value = false
  }
}

function narxId(): number | null { return form.narx_ruyxat_id === '' ? null : Number(form.narx_ruyxat_id) }
function ruyxatNomi(id: number | null) { return narxRuyxatlar.value.find(r => r.id === id)?.nomi || null }

async function save() {
  if (!form.nomi.trim()) { formErr.value = 'Nomi majburiy'; return }
  formErr.value = ''
  saving.value = true
  try {
    if (editId.value) {
      await api.patch(`/mijozlar/kategoriya/${editId.value}`, { nomi: form.nomi.trim(), izoh: form.izoh || null, narx_ruyxat_id: narxId() })
      toast.success('Yangilandi', `"${form.nomi}" muvaffaqiyatli yangilandi`)
    } else {
      await api.post('/mijozlar/kategoriya', { nomi: form.nomi.trim(), izoh: form.izoh || null, narx_ruyxat_id: narxId() })
      toast.success("Qo'shildi", `"${form.nomi}" ro'yxatga kiritildi`)
    }
    await load()
    mode.value = null
  } catch (e: any) {
    toast.error('Saqlash xatosi', e.message)
    formErr.value = e.message
  } finally {
    saving.value = false
  }
}

async function remove(row: MijozKat) {
  if (!confirm(`"${row.nomi}" kategoriyani o'chirishni tasdiqlaysizmi?`)) return
  try {
    await api.delete(`/mijozlar/kategoriya/${row.id}`)
    toast.success("O'chirildi", `"${row.nomi}" o'chirildi`)
    await load()
  } catch (e: any) {
    toast.error("O'chirish xatosi", e.message)
  }
}

function openAdd() {
  Object.assign(form, { nomi: '', izoh: '', narx_ruyxat_id: '' })
  editId.value = null
  formErr.value = ''
  mode.value = 'add'
}

function openEdit(row: MijozKat) {
  Object.assign(form, { nomi: row.nomi, izoh: row.izoh ?? '', narx_ruyxat_id: row.narx_ruyxat_id ?? '' })
  editId.value = row.id
  formErr.value = ''
  mode.value = 'edit'
}

const filtered = computed(() => {
  if (!search.value.trim()) return rows.value
  const q = search.value.toLowerCase()
  return rows.value.filter(r => r.nomi.toLowerCase().includes(q))
})

onMounted(load)
</script>

<template>
  <div class="mk-page">

    <!-- Header -->
    <div class="mk-hd">
      <div class="mk-hd-left">
        <div class="mk-hd-ic">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
        </div>
        <div>
          <h2 class="mk-title">Mijoz kategoriyasi</h2>
          <p class="mk-sub">Mijozlarni guruhlash uchun kategoriyalar</p>
        </div>
      </div>
      <button class="mk-add-btn" @click="openAdd">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Kategoriya qo'shish
      </button>
    </div>

    <!-- Toolbar -->
    <div class="mk-toolbar">
      <div class="mk-search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="search" class="mk-search-in" placeholder="Kategoriya qidirish..."/>
      </div>
      <div class="mk-count">
        <span class="mk-count-badge">{{ filtered.length }}</span>
        ta kategoriya
      </div>
    </div>

    <!-- Skeleton -->
    <div v-if="loading" class="mk-skels">
      <div class="mk-skel" v-for="i in 4" :key="i"/>
    </div>

    <!-- Empty -->
    <div v-else-if="!filtered.length" class="mk-empty">
      <div class="mk-empty-ic">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
      </div>
      <div class="mk-empty-title">{{ search ? 'Kategoriya topilmadi' : 'Kategoriyalar yo\'q' }}</div>
      <div class="mk-empty-sub">{{ search ? 'Qidiruvni o\'zgartiring' : 'Birinchi kategoriyani qo\'shing' }}</div>
      <button v-if="!search" class="mk-add-btn mk-add-btn--sm" @click="openAdd">+ Kategoriya qo'shish</button>
    </div>

    <!-- Table -->
    <div v-else class="mk-table-wrap">
      <table class="mk-table">
        <thead>
          <tr>
            <th style="width:48px">#</th>
            <th>Kategoriya nomi</th>
            <th>Narx ro'yxati</th>
            <th>Izoh</th>
            <th style="width:100px;text-align:center">Amallar</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in filtered" :key="row.id" class="mk-row">
            <td class="mk-td-idx">{{ i + 1 }}</td>
            <td>
              <div class="mk-name-cell">
                <div class="mk-kat-dot" :style="{ background: katColor(row.id) }"/>
                <div class="mk-kat-badge" :style="{ background: katColor(row.id)+'15', color: katColor(row.id), borderColor: katColor(row.id)+'35' }">
                  {{ row.nomi }}
                </div>
              </div>
            </td>
            <td>
              <span v-if="ruyxatNomi(row.narx_ruyxat_id)" class="mk-ruyxat">{{ ruyxatNomi(row.narx_ruyxat_id) }}</span>
              <span v-else class="mk-ruyxat mk-ruyxat--std">Standart (mijoz turi bo'yicha)</span>
            </td>
            <td class="mk-td-izoh">{{ row.izoh || '—' }}</td>
            <td>
              <div class="mk-acts">
                <button class="mk-act mk-act--edit" @click="openEdit(row)" title="Tahrirlash">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="mk-act mk-act--del" @click="remove(row)" title="O'chirish">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <Transition name="mk-modal">
        <div v-if="mode" class="mk-overlay" @click.self="mode = null">
          <div class="mk-modal">
            <div class="mk-modal-hd">
              <div class="mk-modal-title">
                <div class="mk-modal-ic" :style="mode==='add' ? {background:'rgba(139,92,246,.12)',color:'#8b5cf6'} : {background:'rgba(245,158,11,.12)',color:'#f59e0b'}">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                </div>
                {{ mode === 'add' ? "Kategoriya qo'shish" : 'Kategoriyani tahrirlash' }}
              </div>
              <button class="mk-modal-x" @click="mode = null">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <transition name="mk-err">
              <div v-if="formErr" class="mk-form-err">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {{ formErr }}
              </div>
            </transition>

            <div class="mk-modal-body">
              <!-- Preview -->
              <div class="mk-preview" v-if="form.nomi">
                <span class="mk-prev-lbl">Ko'rinishi:</span>
                <span class="mk-prev-badge" :style="{ background: '#8b5cf615', color: '#8b5cf6', borderColor: '#8b5cf635' }">
                  {{ form.nomi }}
                </span>
              </div>

              <div class="mk-field">
                <label class="mk-lbl">Kategoriya nomi <span class="mk-req">*</span></label>
                <div class="mk-input-wrap">
                  <svg class="mk-input-ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                  <input v-model="form.nomi" class="mk-input" placeholder="Masalan: A - Premium" @keyup.enter="save"/>
                </div>
              </div>

              <div class="mk-field">
                <label class="mk-lbl">Narx ro'yxati</label>
                <select v-model="form.narx_ruyxat_id" class="mk-input" style="padding-left:12px">
                  <option value="">Standart — mijoz narx turi bo'yicha</option>
                  <option v-for="r in narxRuyxatlar" :key="r.id" :value="r.id">{{ r.nomi }}{{ r.standart ? ' (standart)' : '' }}</option>
                </select>
                <div class="mk-hint">Bu toifadagi mijozlar uchun tovar narxlari shu ro'yxatdan olinadi. Ro'yxatda yo'q tovar — standart narx.</div>
              </div>

              <div class="mk-field">
                <label class="mk-lbl">Izoh (ixtiyoriy)</label>
                <textarea v-model="form.izoh" class="mk-textarea" rows="3" placeholder="Kategoriya haqida qo'shimcha ma'lumot..."/>
              </div>
            </div>

            <div class="mk-modal-ft">
              <button class="mk-btn-cancel" @click="mode = null">Bekor qilish</button>
              <button class="mk-btn-save" :disabled="saving" @click="save">
                <span v-if="saving" class="mk-spin"/>
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                {{ saving ? 'Saqlanmoqda...' : 'Saqlash' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<style scoped>
.mk-page { display:flex; flex-direction:column; gap:18px; }
.mk-ruyxat { display:inline-block; padding:3px 10px; border-radius:999px; font-size:12px; font-weight:600; background:rgba(139,92,246,.12); color:#7c3aed; }
.mk-ruyxat--std { background:rgba(100,116,139,.12); color:#64748b; font-weight:500; }
.mk-hint { font-size:12px; color:#64748b; margin-top:6px; line-height:1.4; }

/* Header */
.mk-hd { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.mk-hd-left { display:flex; align-items:center; gap:13px; }
.mk-hd-ic { width:42px; height:42px; border-radius:12px; background:linear-gradient(135deg,rgba(139,92,246,.15),rgba(139,92,246,.15)); color:#8b5cf6; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.mk-title { font-size:18px; font-weight:800; color:#1e293b; margin:0 0 3px; }
.mk-sub { font-size:12.5px; color:#94a3b8; margin:0; }

.mk-add-btn { display:inline-flex; align-items:center; gap:7px; height:38px; padding:0 18px; border-radius:11px; border:none; background:linear-gradient(135deg,#8b5cf6,#8b5cf6); color:#fff; font-size:13px; font-weight:700; cursor:pointer; box-shadow:0 4px 14px rgba(139,92,246,.3); transition:.15s; white-space:nowrap; }
.mk-add-btn:hover { transform:translateY(-1px); box-shadow:0 6px 18px rgba(139,92,246,.4); }
.mk-add-btn--sm { margin-top:8px; }

/* Toolbar */
.mk-toolbar { display:flex; align-items:center; gap:10px; }
.mk-search { display:flex; align-items:center; gap:8px; background:#fff; border:1.5px solid #e2e8f0; border-radius:10px; padding:0 12px; height:38px; flex:1; max-width:320px; transition:.15s; }
.mk-search:focus-within { border-color:#8b5cf6; }
.mk-search svg { color:#94a3b8; flex-shrink:0; }
.mk-search-in { flex:1; border:none; outline:none; font-size:13.5px; color:#1e293b; background:transparent; }
.mk-search-in::placeholder { color:#cbd5e1; }
.mk-count { display:flex; align-items:center; gap:6px; font-size:13px; color:#64748b; }
.mk-count-badge { background:#f1f5f9; color:#475569; font-size:12px; font-weight:700; padding:3px 10px; border-radius:20px; }

/* Skeleton */
.mk-skels { display:flex; flex-direction:column; gap:10px; }
.mk-skel { height:60px; border-radius:12px; background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size:200% 100%; animation:mk-shim 1.4s ease infinite; }
@keyframes mk-shim { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

/* Empty */
.mk-empty { display:flex; flex-direction:column; align-items:center; gap:10px; padding:60px 20px; color:#94a3b8; }
.mk-empty-ic { width:64px; height:64px; border-radius:18px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; color:#cbd5e1; }
.mk-empty-title { font-size:15px; font-weight:700; color:#64748b; }
.mk-empty-sub { font-size:13px; color:#94a3b8; }

/* Table */
.mk-table-wrap { border:1.5px solid #e8ecf8; border-radius:16px; overflow:hidden; background:#fff; }
.mk-table { width:100%; border-collapse:collapse; font-size:13.5px; }
.mk-table thead tr { background:#f8fafc; border-bottom:1.5px solid #e2e8f0; }
.mk-table th { padding:11px 16px; text-align:left; font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:.05em; }
.mk-row { border-bottom:1px solid #f1f5f9; transition:background .1s; }
.mk-row:last-child { border-bottom:none; }
.mk-row:hover { background:#f8fafc; }
.mk-row td { padding:0 16px; height:54px; vertical-align:middle; }
.mk-td-idx { font-size:12px; color:#cbd5e1; width:48px; }
.mk-td-izoh { font-size:12.5px; color:#94a3b8; }

.mk-name-cell { display:flex; align-items:center; gap:10px; }
.mk-kat-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.mk-kat-badge { display:inline-flex; align-items:center; padding:5px 12px; border-radius:20px; font-size:13px; font-weight:700; border:1.5px solid; }

.mk-acts { display:flex; align-items:center; justify-content:center; gap:5px; }
.mk-act { width:28px; height:28px; border-radius:8px; border:1.5px solid; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:.13s; background:transparent; }
.mk-act--edit { border-color:#ede9fe; color:#8b5cf6; }
.mk-act--edit:hover { background:#ede9fe; border-color:#ddd6fe; }
.mk-act--del { border-color:#fee2e2; color:#ef4444; }
.mk-act--del:hover { background:#fef2f2; border-color:#fecaca; }

/* Modal */
.mk-overlay { position:fixed; inset:0; background:rgba(15,23,42,.5); backdrop-filter:blur(5px); z-index:999; display:flex; align-items:center; justify-content:center; padding:16px; }
.mk-modal { background:#fff; border-radius:20px; width:100%; max-width:460px; box-shadow:0 24px 60px rgba(0,0,0,.2); overflow:hidden; }
.mk-modal-hd { display:flex; align-items:center; justify-content:space-between; padding:20px 24px 16px; border-bottom:1px solid #f1f5f9; }
.mk-modal-title { display:flex; align-items:center; gap:10px; font-size:16px; font-weight:800; color:#1e293b; }
.mk-modal-ic { width:34px; height:34px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.mk-modal-x { width:32px; height:32px; border-radius:8px; border:1.5px solid #e2e8f0; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#64748b; transition:.13s; }
.mk-modal-x:hover { background:#fef2f2; color:#ef4444; border-color:#fecaca; }

.mk-form-err { display:flex; align-items:center; gap:8px; margin:10px 24px 0; padding:10px 14px; background:#fef2f2; border:1px solid #fecaca; border-radius:10px; font-size:13px; color:#dc2626; }
.mk-err-enter-active,.mk-err-leave-active { transition:.18s; }
.mk-err-enter-from,.mk-err-leave-to { opacity:0; transform:translateY(-4px); }

.mk-modal-body { padding:20px 24px; display:flex; flex-direction:column; gap:16px; }

.mk-preview { display:flex; align-items:center; gap:10px; padding:12px 16px; background:#f8fafc; border:1px solid #e8ecf8; border-radius:12px; }
.mk-prev-lbl { font-size:12px; color:#94a3b8; font-weight:600; white-space:nowrap; }
.mk-prev-badge { display:inline-flex; align-items:center; padding:5px 14px; border-radius:20px; font-size:13px; font-weight:700; border:1.5px solid; }

.mk-field { display:flex; flex-direction:column; gap:6px; }
.mk-lbl { font-size:12.5px; font-weight:700; color:#374151; }
.mk-req { color:#ef4444; }
.mk-input-wrap { position:relative; display:flex; align-items:center; }
.mk-input-ic { position:absolute; left:12px; color:#94a3b8; flex-shrink:0; pointer-events:none; }
.mk-input { width:100%; height:42px; padding:0 12px 0 36px; border:1.5px solid #e2e8f0; border-radius:11px; background:#fff; font-size:13.5px; color:#1e293b; outline:none; transition:.15s; box-sizing:border-box; }
.mk-input:focus { border-color:#8b5cf6; box-shadow:0 0 0 3px rgba(139,92,246,.12); }
.mk-textarea { width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:11px; background:#fff; font-size:13.5px; color:#1e293b; outline:none; resize:vertical; font-family:inherit; line-height:1.5; transition:.15s; box-sizing:border-box; }
.mk-textarea:focus { border-color:#8b5cf6; box-shadow:0 0 0 3px rgba(139,92,246,.12); }

.mk-modal-ft { display:flex; align-items:center; justify-content:flex-end; gap:8px; padding:16px 24px; border-top:1px solid #f1f5f9; }
.mk-btn-cancel { height:38px; padding:0 16px; border-radius:10px; border:1.5px solid #e2e8f0; background:#fff; font-size:13.5px; font-weight:600; color:#64748b; cursor:pointer; transition:.13s; }
.mk-btn-cancel:hover { border-color:#ddd6fe; color:#8b5cf6; }
.mk-btn-save { display:inline-flex; align-items:center; gap:7px; height:38px; padding:0 20px; border-radius:10px; border:none; background:linear-gradient(135deg,#8b5cf6,#8b5cf6); color:#fff; font-size:13.5px; font-weight:700; cursor:pointer; box-shadow:0 4px 14px rgba(139,92,246,.3); transition:.15s; }
.mk-btn-save:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 18px rgba(139,92,246,.4); }
.mk-btn-save:disabled { opacity:.6; cursor:not-allowed; }
.mk-spin { width:14px; height:14px; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%; animation:mk-rot .6s linear infinite; flex-shrink:0; }
@keyframes mk-rot { to{transform:rotate(360deg)} }

.mk-modal-enter-active,.mk-modal-leave-active { transition:.22s; }
.mk-modal-enter-from,.mk-modal-leave-to { opacity:0; }
.mk-modal-enter-from .mk-modal,.mk-modal-leave-to .mk-modal { transform:scale(.95) translateY(10px); }
</style>
