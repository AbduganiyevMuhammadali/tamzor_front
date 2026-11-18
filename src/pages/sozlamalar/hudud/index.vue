<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { api } from '@/api/api'
import { useToast } from '@/composables/useToast'

const toast = useToast()

// ── Types ─────────────────────────────────────────────────
interface Hudud { id: number; nomi: string; izoh: string | null; createdAt?: string }

// ── State ──────────────────────────────────────────────────
const rows    = ref<Hudud[]>([])
const loading = ref(false)
const saving  = ref(false)
const search  = ref('')

type Mode = 'add' | 'edit' | null
const mode   = ref<Mode>(null)
const editId = ref<number | null>(null)
const form   = reactive({ nomi: '', izoh: '' })
const formErr = ref('')

// ── API ────────────────────────────────────────────────────
async function load() {
  loading.value = true
  try {
    const data = await api.get('/mijozlar/spravochnik')
    rows.value = data?.territoriyalar ?? []
  } catch (e: any) {
    toast.error('Yuklash xatosi', e.message)
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!form.nomi.trim()) { formErr.value = 'Nomi majburiy'; return }
  formErr.value = ''
  saving.value = true
  try {
    if (editId.value) {
      await api.patch(`/mijozlar/territoriya/${editId.value}`, { nomi: form.nomi.trim(), izoh: form.izoh || null })
      toast.success('Yangilandi', `"${form.nomi}" muvaffaqiyatli yangilandi`)
    } else {
      await api.post('/mijozlar/territoriya', { nomi: form.nomi.trim(), izoh: form.izoh || null })
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

async function remove(row: Hudud) {
  if (!confirm(`"${row.nomi}" hududni o'chirishni tasdiqlaysizmi?`)) return
  try {
    await api.delete(`/mijozlar/territoriya/${row.id}`)
    toast.success("O'chirildi", `"${row.nomi}" o'chirildi`)
    await load()
  } catch (e: any) {
    toast.error("O'chirish xatosi", e.message)
  }
}

function openAdd() {
  Object.assign(form, { nomi: '', izoh: '' })
  editId.value = null
  formErr.value = ''
  mode.value = 'add'
}

function openEdit(row: Hudud) {
  Object.assign(form, { nomi: row.nomi, izoh: row.izoh ?? '' })
  editId.value = row.id
  formErr.value = ''
  mode.value = 'edit'
}

// ── Computed ───────────────────────────────────────────────
const filtered = computed(() => {
  if (!search.value.trim()) return rows.value
  const q = search.value.toLowerCase()
  return rows.value.filter(r => r.nomi.toLowerCase().includes(q))
})

onMounted(load)
</script>

<template>
  <div class="hz-page">

    <!-- Header -->
    <div class="hz-hd">
      <div class="hz-hd-left">
        <div class="hz-hd-ic">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
        <div>
          <h2 class="hz-title">Hududlar (Territoriyalar)</h2>
          <p class="hz-sub">Savdo hududlarini boshqarish</p>
        </div>
      </div>
      <button class="hz-add-btn" @click="openAdd">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Hudud qo'shish
      </button>
    </div>

    <!-- Toolbar -->
    <div class="hz-toolbar">
      <div class="hz-search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="search" class="hz-search-in" placeholder="Hudud qidirish..."/>
      </div>
      <div class="hz-count">
        <span class="hz-count-badge">{{ filtered.length }}</span>
        ta hudud
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="hz-skels">
      <div class="hz-skel" v-for="i in 4" :key="i"/>
    </div>

    <!-- Empty -->
    <div v-else-if="!filtered.length" class="hz-empty">
      <div class="hz-empty-ic">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
      <div class="hz-empty-title">{{ search ? 'Hudud topilmadi' : 'Hududlar yo\'q' }}</div>
      <div class="hz-empty-sub">{{ search ? 'Qidiruvni o\'zgartiring' : 'Birinchi hududni qo\'shing' }}</div>
      <button v-if="!search" class="hz-add-btn hz-add-btn--sm" @click="openAdd">+ Hudud qo'shish</button>
    </div>

    <!-- Cards grid -->
    <div v-else class="hz-grid">
      <div v-for="(row, i) in filtered" :key="row.id" class="hz-card">
        <div class="hz-card-top">
          <div class="hz-card-av" :style="{ background: `hsl(${(row.id * 47) % 360}, 65%, 55%)` }">
            {{ row.nomi.charAt(0).toUpperCase() }}
          </div>
          <div class="hz-card-info">
            <div class="hz-card-name">{{ row.nomi }}</div>
            <div class="hz-card-meta" v-if="row.izoh">{{ row.izoh }}</div>
            <div class="hz-card-meta hz-card-meta--empty" v-else>Izoh yo'q</div>
          </div>
          <span class="hz-card-num">#{{ i + 1 }}</span>
        </div>
        <div class="hz-card-foot">
          <div class="hz-card-id">ID: {{ row.id }}</div>
          <div class="hz-card-acts">
            <button class="hz-act hz-act--edit" @click="openEdit(row)" title="Tahrirlash">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="hz-act hz-act--del" @click="remove(row)" title="O'chirish">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <Transition name="hz-modal">
        <div v-if="mode" class="hz-overlay" @click.self="mode = null">
          <div class="hz-modal">
            <div class="hz-modal-hd">
              <div class="hz-modal-title">
                <div class="hz-modal-ic" :style="mode==='add' ? {background:'rgba(16,185,129,.12)',color:'#10b981'} : {background:'rgba(139,92,246,.12)',color:'#8b5cf6'}">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                {{ mode === 'add' ? "Hudud qo'shish" : 'Hududni tahrirlash' }}
              </div>
              <button class="hz-modal-x" @click="mode = null">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <transition name="hz-err">
              <div v-if="formErr" class="hz-form-err">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {{ formErr }}
              </div>
            </transition>

            <div class="hz-modal-body">
              <div class="hz-field">
                <label class="hz-lbl">Hudud nomi <span class="hz-req">*</span></label>
                <div class="hz-input-wrap">
                  <svg class="hz-input-ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  <input v-model="form.nomi" class="hz-input" placeholder="Masalan: Yunusobod tumani" @keyup.enter="save"/>
                </div>
              </div>
              <div class="hz-field">
                <label class="hz-lbl">Izoh (ixtiyoriy)</label>
                <textarea v-model="form.izoh" class="hz-textarea" rows="3" placeholder="Hudud haqida qo'shimcha ma'lumot..."/>
              </div>
            </div>

            <div class="hz-modal-ft">
              <button class="hz-btn-cancel" @click="mode = null">Bekor qilish</button>
              <button class="hz-btn-save" :disabled="saving" @click="save">
                <span v-if="saving" class="hz-spin"/>
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
.hz-page { display:flex; flex-direction:column; gap:18px; }

/* Header */
.hz-hd { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.hz-hd-left { display:flex; align-items:center; gap:13px; }
.hz-hd-ic { width:42px; height:42px; border-radius:12px; background:linear-gradient(135deg,rgba(16,185,129,.15),rgba(5,150,105,.15)); color:#10b981; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.hz-title { font-size:18px; font-weight:800; color:#1e293b; margin:0 0 3px; }
.hz-sub { font-size:12.5px; color:#94a3b8; margin:0; }

.hz-add-btn { display:inline-flex; align-items:center; gap:7px; height:38px; padding:0 18px; border-radius:11px; border:none; background:linear-gradient(135deg,#10b981,#059669); color:#fff; font-size:13px; font-weight:700; cursor:pointer; box-shadow:0 4px 14px rgba(16,185,129,.3); transition:.15s; white-space:nowrap; }
.hz-add-btn:hover { transform:translateY(-1px); box-shadow:0 6px 18px rgba(16,185,129,.4); }
.hz-add-btn--sm { background:linear-gradient(135deg,#8b5cf6,#8b5cf6); box-shadow:0 4px 14px rgba(139,92,246,.3); margin-top:8px; }

/* Toolbar */
.hz-toolbar { display:flex; align-items:center; gap:10px; }
.hz-search { display:flex; align-items:center; gap:8px; background:#fff; border:1.5px solid #e2e8f0; border-radius:10px; padding:0 12px; height:38px; flex:1; max-width:320px; transition:.15s; }
.hz-search:focus-within { border-color:#10b981; }
.hz-search svg { color:#94a3b8; flex-shrink:0; }
.hz-search-in { flex:1; border:none; outline:none; font-size:13.5px; color:#1e293b; background:transparent; }
.hz-search-in::placeholder { color:#cbd5e1; }
.hz-count { display:flex; align-items:center; gap:6px; font-size:13px; color:#64748b; }
.hz-count-badge { background:#f1f5f9; color:#475569; font-size:12px; font-weight:700; padding:3px 10px; border-radius:20px; }

/* Skeleton */
.hz-skels { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:14px; }
.hz-skel { height:120px; border-radius:16px; background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size:200% 100%; animation:hz-shim 1.4s ease infinite; }
@keyframes hz-shim { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

/* Empty */
.hz-empty { display:flex; flex-direction:column; align-items:center; gap:10px; padding:60px 20px; color:#94a3b8; }
.hz-empty-ic { width:64px; height:64px; border-radius:18px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; color:#cbd5e1; }
.hz-empty-title { font-size:15px; font-weight:700; color:#64748b; }
.hz-empty-sub { font-size:13px; color:#94a3b8; }

/* Grid + Cards */
.hz-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:14px; }
.hz-card { background:#fff; border:1.5px solid #e8ecf8; border-radius:16px; overflow:hidden; transition:.18s; }
.hz-card:hover { border-color:#a7f3d0; box-shadow:0 6px 22px rgba(16,185,129,.1); transform:translateY(-2px); }

.hz-card-top { display:flex; align-items:flex-start; gap:12px; padding:16px 16px 12px; }
.hz-card-av { width:42px; height:42px; border-radius:12px; color:#fff; font-size:18px; font-weight:900; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.hz-card-info { flex:1; min-width:0; }
.hz-card-name { font-size:14px; font-weight:800; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.hz-card-meta { font-size:12px; color:#64748b; margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.hz-card-meta--empty { color:#cbd5e1; font-style:italic; }
.hz-card-num { font-size:11px; font-weight:700; color:#cbd5e1; flex-shrink:0; }

.hz-card-foot { display:flex; align-items:center; justify-content:space-between; padding:10px 16px; border-top:1px solid #f1f5f9; background:#f8fafc; }
.hz-card-id { font-size:11px; color:#94a3b8; }
.hz-card-acts { display:flex; gap:5px; }
.hz-act { width:28px; height:28px; border-radius:8px; border:1.5px solid; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:.13s; background:transparent; }
.hz-act--edit { border-color:#ede9fe; color:#8b5cf6; }
.hz-act--edit:hover { background:#ede9fe; border-color:#ddd6fe; }
.hz-act--del { border-color:#fee2e2; color:#ef4444; }
.hz-act--del:hover { background:#fef2f2; border-color:#fecaca; }

/* Modal */
.hz-overlay { position:fixed; inset:0; background:rgba(15,23,42,.5); backdrop-filter:blur(5px); z-index:999; display:flex; align-items:center; justify-content:center; padding:16px; }
.hz-modal { background:#fff; border-radius:20px; width:100%; max-width:460px; box-shadow:0 24px 60px rgba(0,0,0,.2); overflow:hidden; }
.hz-modal-hd { display:flex; align-items:center; justify-content:space-between; padding:20px 24px 16px; border-bottom:1px solid #f1f5f9; }
.hz-modal-title { display:flex; align-items:center; gap:10px; font-size:16px; font-weight:800; color:#1e293b; }
.hz-modal-ic { width:34px; height:34px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.hz-modal-x { width:32px; height:32px; border-radius:8px; border:1.5px solid #e2e8f0; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#64748b; transition:.13s; }
.hz-modal-x:hover { background:#fef2f2; color:#ef4444; border-color:#fecaca; }

.hz-form-err { display:flex; align-items:center; gap:8px; margin:10px 24px 0; padding:10px 14px; background:#fef2f2; border:1px solid #fecaca; border-radius:10px; font-size:13px; color:#dc2626; }
.hz-err-enter-active,.hz-err-leave-active { transition:.18s; }
.hz-err-enter-from,.hz-err-leave-to { opacity:0; transform:translateY(-4px); }

.hz-modal-body { padding:20px 24px; display:flex; flex-direction:column; gap:16px; }
.hz-field { display:flex; flex-direction:column; gap:6px; }
.hz-lbl { font-size:12.5px; font-weight:700; color:#374151; }
.hz-req { color:#ef4444; }
.hz-input-wrap { position:relative; display:flex; align-items:center; }
.hz-input-ic { position:absolute; left:12px; color:#94a3b8; flex-shrink:0; pointer-events:none; }
.hz-input { width:100%; height:42px; padding:0 12px 0 36px; border:1.5px solid #e2e8f0; border-radius:11px; background:#fff; font-size:13.5px; color:#1e293b; outline:none; transition:.15s; box-sizing:border-box; }
.hz-input:focus { border-color:#10b981; box-shadow:0 0 0 3px rgba(16,185,129,.12); }
.hz-textarea { width:100%; padding:11px 14px; border:1.5px solid #e2e8f0; border-radius:11px; background:#fff; font-size:13.5px; color:#1e293b; outline:none; resize:vertical; font-family:inherit; line-height:1.5; transition:.15s; box-sizing:border-box; }
.hz-textarea:focus { border-color:#10b981; box-shadow:0 0 0 3px rgba(16,185,129,.12); }

.hz-modal-ft { display:flex; align-items:center; justify-content:flex-end; gap:8px; padding:16px 24px; border-top:1px solid #f1f5f9; }
.hz-btn-cancel { height:38px; padding:0 16px; border-radius:10px; border:1.5px solid #e2e8f0; background:#fff; font-size:13.5px; font-weight:600; color:#64748b; cursor:pointer; transition:.13s; }
.hz-btn-cancel:hover { border-color:#ddd6fe; color:#8b5cf6; }
.hz-btn-save { display:inline-flex; align-items:center; gap:7px; height:38px; padding:0 20px; border-radius:10px; border:none; background:linear-gradient(135deg,#10b981,#059669); color:#fff; font-size:13.5px; font-weight:700; cursor:pointer; box-shadow:0 4px 14px rgba(16,185,129,.3); transition:.15s; }
.hz-btn-save:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 18px rgba(16,185,129,.4); }
.hz-btn-save:disabled { opacity:.6; cursor:not-allowed; }
.hz-spin { width:14px; height:14px; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%; animation:hz-rot .6s linear infinite; flex-shrink:0; }
@keyframes hz-rot { to{transform:rotate(360deg)} }

.hz-modal-enter-active,.hz-modal-leave-active { transition:.22s; }
.hz-modal-enter-from,.hz-modal-leave-to { opacity:0; }
.hz-modal-enter-from .hz-modal,.hz-modal-leave-to .hz-modal { transform:scale(.95) translateY(10px); }

@media(max-width:600px) { .hz-grid{grid-template-columns:1fr} }
</style>
