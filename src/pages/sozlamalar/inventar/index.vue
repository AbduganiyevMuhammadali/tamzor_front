<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import SozDataTable from '../components/SozDataTable.vue'
import SozModal from '../components/SozModal.vue'
import type { InventarTuri } from '../types'
import type { Column } from '../types'

const rows = ref<InventarTuri[]>([
  { id: 'it1', nomi: 'Hisoblash', tavsif: 'Tovarni hisoblash inventarizatsiyasi' },
  { id: 'it2', nomi: 'Tekshirish', tavsif: 'Sifat tekshiruvi' },
  { id: 'it3', nomi: "Tuzatish", tavsif: "Qoldiq tuzatish" },
])

const cols: Column<InventarTuri>[] = [
  { key: 'id', label: 'ID', width: '80px' },
  { key: 'nomi', label: 'Nomi', sortable: true },
  { key: 'tavsif', label: 'Tavsif' },
]

type ModalMode = 'add' | 'edit' | null
const modalMode = ref<ModalMode>(null)
const editId = ref<string | null>(null)
const form = reactive<Partial<InventarTuri>>({ nomi: '', tavsif: '' })
const search = ref('')

const filtered = computed(() =>
  rows.value.filter(r => !search.value || r.nomi.toLowerCase().includes(search.value.toLowerCase()))
)

function save() {
  if (!form.nomi?.trim()) return
  if (editId.value) {
    const idx = rows.value.findIndex(r => r.id === editId.value)
    if (idx !== -1) rows.value[idx] = { ...form, id: editId.value! } as InventarTuri
  } else {
    rows.value.push({ ...form, id: `it${Date.now()}` } as InventarTuri)
  }
  modalMode.value = null
}
</script>

<template>
  <div class="page">
    <div class="page-hd">
      <h2 class="page-title">Inventar turi</h2>
    </div>
    <div class="toolbar">
      <button class="add-btn" @click="() => { Object.assign(form,{nomi:'',tavsif:''}); editId=null; modalMode='add' }">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
        Tur qo'shish
      </button>
      <div class="srch-box">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/></svg>
        <input v-model="search" placeholder="Qidirish..." class="srch-in"/>
      </div>
    </div>
    <div class="row-count">{{ filtered.length }} ta hisobot</div>
    <SozDataTable :columns="cols" :rows="filtered" row-key="id"
      @edit="(r) => { Object.assign(form, r); editId=r.id; modalMode='edit' }"
      @delete="(r) => rows = rows.filter(x => x.id !== r.id)"
      @view="() => {}"/>

    <SozModal :show="modalMode!==null" :title="modalMode==='add' ? 'Inventar turi qo\'shish' : 'Tahrirlash'" @close="modalMode=null">
      <div class="fm-body">
        <div class="fm-field">
          <label class="fm-lbl">Nomi <span class="req">*</span></label>
          <input v-model="form.nomi" class="fm-in" placeholder="Inventar turi nomi"/>
        </div>
        <div class="fm-field">
          <label class="fm-lbl">Tavsif</label>
          <textarea v-model="form.tavsif" class="fm-ta" rows="3" placeholder="Qisqacha tavsif..."/>
        </div>
      </div>
      <template #footer>
        <button class="fm-btn-cancel" @click="modalMode=null">Bekor qilish</button>
        <button class="fm-btn-save" @click="save">Saqlash</button>
      </template>
    </SozModal>
  </div>
</template>

<style scoped>
.page { display:flex; flex-direction:column; gap:14px; }
.page-hd { display:flex; align-items:center; }
.page-title { font-size:20px; font-weight:700; color:var(--title); margin:0; }
.toolbar { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.add-btn { display:inline-flex; align-items:center; gap:6px; height:34px; padding:0 14px; border-radius:9px; border:none; background:linear-gradient(135deg,#818cf8,#6366f1); color:#fff; font-size:12px; font-weight:600; cursor:pointer; box-shadow:0 2px 8px rgba(99,102,241,.28); }
.add-btn svg { width:14px; height:14px; }
.srch-box { display:flex; align-items:center; gap:7px; height:34px; padding:0 11px; background:var(--card-bg); border:1px solid var(--card-border); border-radius:9px; min-width:180px; }
.srch-box svg { width:14px; height:14px; color:var(--muted); flex-shrink:0; }
.srch-in { border:none; background:transparent; outline:none; font-size:12px; color:var(--body); width:100%; }
.srch-in::placeholder { color:var(--muted); }
.row-count { font-size:12px; color:var(--muted); }
.fm-body { display:flex; flex-direction:column; gap:14px; }
.fm-field { display:flex; flex-direction:column; gap:5px; }
.fm-lbl { font-size:12px; font-weight:600; color:var(--muted); }
.req { color:#ef4444; }
.fm-in { height:38px; padding:0 12px; border-radius:9px; border:1px solid var(--card-border); background:var(--card-bg); color:var(--body); font-size:13px; outline:none; transition:.15s; width:100%; }
.fm-in:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.12); }
.fm-ta { padding:10px 12px; border-radius:9px; border:1px solid var(--card-border); background:var(--card-bg); color:var(--body); font-size:13px; outline:none; transition:.15s; width:100%; resize:vertical; font-family:inherit; }
.fm-ta:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.12); }
.fm-btn-cancel { height:36px; padding:0 16px; border-radius:9px; border:1px solid var(--card-border); background:transparent; color:var(--muted); font-size:13px; cursor:pointer; }
.fm-btn-save { height:36px; padding:0 18px; border-radius:9px; border:none; background:linear-gradient(135deg,#818cf8,#6366f1); color:#fff; font-size:13px; font-weight:600; cursor:pointer; box-shadow:0 2px 8px rgba(99,102,241,.3); }
</style>
