<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import NumberInput from '@/components/NumberInput.vue'
import SozDataTable from '../components/SozDataTable.vue'
import SozModal from '../components/SozModal.vue'
import type { BonusTuri } from '../types'
import type { Column } from '../types'

const rows = ref<BonusTuri[]>([
  { id: 'bn1', nomi: 'Haftalik bonus', hisoblash: 'foiz', qiymat: 2, faol: true },
  { id: 'bn2', nomi: 'Oylik bonus', hisoblash: 'summa', qiymat: 500000, faol: true },
  { id: 'bn3', nomi: 'Mahsulot bonusi', hisoblash: 'mahsulot', qiymat: 1, faol: false },
])

const cols: Column<BonusTuri>[] = [
  { key: 'id', label: 'ID', width: '80px' },
  { key: 'nomi', label: 'Nomi', sortable: true },
  { key: 'hisoblash', label: 'Hisoblash usuli', width: '140px' },
  { key: 'qiymat', label: 'Qiymat', width: '100px' },
  { key: 'faol', label: 'Holat', width: '100px' },
]

type ModalMode = 'add' | 'edit' | null
const modalMode = ref<ModalMode>(null)
const editId = ref<string | null>(null)
const form = reactive<Partial<BonusTuri>>({ nomi: '', hisoblash: 'foiz', qiymat: 0, faol: true })
const search = ref('')

const filtered = computed(() =>
  rows.value.filter(r => !search.value || r.nomi.toLowerCase().includes(search.value.toLowerCase()))
)

function save() {
  if (!form.nomi?.trim()) return
  if (editId.value) {
    const idx = rows.value.findIndex(r => r.id === editId.value)
    if (idx !== -1) rows.value[idx] = { ...form, id: editId.value! } as BonusTuri
  } else {
    rows.value.push({ ...form, id: `bn${Date.now()}` } as BonusTuri)
  }
  modalMode.value = null
}

const hisoblashLabels = { foiz: 'Foiz (%)', summa: 'Summa (UZS)', mahsulot: 'Mahsulot (kg)' }
</script>

<template>
  <div class="page">
    <div class="page-hd">
      <h2 class="page-title">Bonuslar va chegirmalar</h2>
    </div>
    <div class="toolbar">
      <button class="add-btn" @click="() => { Object.assign(form,{nomi:'',hisoblash:'foiz',qiymat:0,faol:true}); editId=null; modalMode='add' }">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
        Bonus qo'shish
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
      @view="() => {}">
      <template #cell-hisoblash="{ value }">
        <span :class="['h-badge', `h-badge--${String(value)}`]">{{ hisoblashLabels[value as keyof typeof hisoblashLabels] }}</span>
      </template>
      <template #cell-qiymat="{ row, value }">
        <span>{{ row.hisoblash==='foiz' ? `${value}%` : row.hisoblash==='summa' ? `${Number(value).toLocaleString()} UZS` : `${value} kg` }}</span>
      </template>
      <template #cell-faol="{ value }">
        <span :class="['badge', value ? 'badge--green' : 'badge--gray']">{{ value ? 'Faol' : 'Faol emas' }}</span>
      </template>
    </SozDataTable>

    <SozModal :show="modalMode!==null" :title="modalMode==='add' ? 'Bonus qo\'shish' : 'Tahrirlash'" @close="modalMode=null">
      <div class="fm-body">
        <div class="fm-field">
          <label class="fm-lbl">Nomi <span class="req">*</span></label>
          <input v-model="form.nomi" class="fm-in" placeholder="Bonus nomi"/>
        </div>
        <div class="fm-row">
          <div class="fm-field">
            <label class="fm-lbl">Hisoblash usuli</label>
            <select v-model="form.hisoblash" class="fm-sel">
              <option value="foiz">Foiz (%)</option>
              <option value="summa">Summa (UZS)</option>
              <option value="mahsulot">Mahsulot (kg)</option>
            </select>
          </div>
          <div class="fm-field">
            <label class="fm-lbl">Qiymat</label>
            <NumberInput v-model="form.qiymat" css-class="fm-in" placeholder="0"/>
          </div>
        </div>
        <label class="fm-toggle">
          <input type="checkbox" v-model="form.faol"/>
          <span class="fm-toggle-t"><span class="fm-toggle-th"/></span>
          <span class="fm-toggle-lbl">Faol</span>
        </label>
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
.h-badge { display:inline-flex; padding:2px 9px; border-radius:99px; font-size:11px; font-weight:600; }
.h-badge--foiz { background:rgba(99,102,241,.1); color:#6366f1; }
.h-badge--summa { background:rgba(16,185,129,.1); color:#10b981; }
.h-badge--mahsulot { background:rgba(245,158,11,.1); color:#f59e0b; }
.badge { display:inline-flex; padding:2px 9px; border-radius:99px; font-size:11px; font-weight:600; }
.badge--green { background:rgba(16,185,129,.1); color:#10b981; }
.badge--gray { background:var(--mini-bg); color:var(--muted); }
.fm-body { display:flex; flex-direction:column; gap:14px; }
.fm-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.fm-field { display:flex; flex-direction:column; gap:5px; }
.fm-lbl { font-size:12px; font-weight:600; color:var(--muted); }
.req { color:#ef4444; }
.fm-in,.fm-sel { height:38px; padding:0 12px; border-radius:9px; border:1px solid var(--card-border); background:var(--card-bg); color:var(--body); font-size:13px; outline:none; transition:.15s; width:100%; }
.fm-in:focus,.fm-sel:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.12); }
.fm-toggle { display:inline-flex; align-items:center; gap:10px; cursor:pointer; }
.fm-toggle input { display:none; }
.fm-toggle-t { display:block; width:40px; height:22px; background:var(--card-border); border-radius:99px; position:relative; transition:.2s; }
.fm-toggle input:checked + .fm-toggle-t { background:#6366f1; }
.fm-toggle-th { position:absolute; top:2px; left:2px; width:18px; height:18px; background:#fff; border-radius:50%; transition:.2s; }
.fm-toggle input:checked + .fm-toggle-t .fm-toggle-th { left:20px; }
.fm-toggle-lbl { font-size:13px; color:var(--body); }
.fm-btn-cancel { height:36px; padding:0 16px; border-radius:9px; border:1px solid var(--card-border); background:transparent; color:var(--muted); font-size:13px; cursor:pointer; }
.fm-btn-save { height:36px; padding:0 18px; border-radius:9px; border:none; background:linear-gradient(135deg,#818cf8,#6366f1); color:#fff; font-size:13px; font-weight:600; cursor:pointer; box-shadow:0 2px 8px rgba(99,102,241,.3); }
</style>
