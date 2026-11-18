<script setup lang="ts" generic="T extends Record<string, unknown>">
import { computed, ref } from 'vue'
import type { Column, SortState } from '../types'

const props = defineProps<{
  columns: Column<T>[]
  rows: T[]
  loading?: boolean
  selectable?: boolean
  rowKey?: keyof T & string
}>()

const emit = defineEmits<{
  sort: [key: string]
  edit: [row: T]
  delete: [row: T]
  view: [row: T]
}>()

const selected = ref<Set<unknown>>(new Set())
const sort = ref<SortState>({ key: '', dir: null })

const allSelected = computed(() =>
  props.rows.length > 0 && props.rows.every(r => selected.value.has(r[props.rowKey ?? 'id']))
)

function toggleAll() {
  if (allSelected.value) selected.value.clear()
  else props.rows.forEach(r => selected.value.add(r[props.rowKey ?? 'id']))
}

function toggleRow(row: T) {
  const key = row[props.rowKey ?? 'id']
  if (selected.value.has(key)) selected.value.delete(key)
  else selected.value.add(key)
}

function handleSort(col: Column<T>) {
  if (!col.sortable) return
  if (sort.value.key === col.key) {
    sort.value.dir = sort.value.dir === 'asc' ? 'desc' : sort.value.dir === 'desc' ? null : 'asc'
    if (sort.value.dir === null) sort.value.key = ''
  } else {
    sort.value.key = col.key
    sort.value.dir = 'asc'
  }
  emit('sort', sort.value.key)
}

defineExpose({ selected })
</script>

<template>
  <div class="sdt-wrap">
    <!-- Loading skeleton -->
    <div v-if="loading" class="sdt-loading">
      <div class="sdt-skel-head"/>
      <div v-for="i in 4" :key="i" class="sdt-skel-row">
        <div class="sdt-skel-cell" v-for="j in columns.length + 2" :key="j" :style="{width: j===1?'20px':'', animationDelay: `${i*80}ms`}"/>
      </div>
    </div>

    <table v-else class="sdt">
      <thead class="sdt-head">
        <tr>
          <th v-if="selectable" class="sdt-th sdt-th-cb">
            <label class="sdt-cb">
              <input type="checkbox" :checked="allSelected" @change="toggleAll"/>
              <span class="sdt-cb-box">
                <svg v-if="allSelected" viewBox="0 0 12 10" fill="none">
                  <path d="M1 5l3.5 3.5L11 1" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
            </label>
          </th>
          <th
            v-for="col in columns" :key="col.key"
            :style="col.width ? {width: col.width} : {}"
            :class="['sdt-th', col.sortable && 'sdt-th--sort', sort.key===col.key && 'sdt-th--active']"
            @click="handleSort(col)"
          >
            <span class="sdt-th-inner">
              <span class="sdt-th-txt">{{ col.label }}</span>
              <span v-if="col.sortable" class="sdt-sort-ic" :class="sort.key===col.key && 'sdt-sort-ic--on'">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path v-if="sort.key===col.key && sort.dir==='asc'"
                    d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zm0 4a1 1 0 000 2h7a1 1 0 100-2H3zm0 4a1 1 0 100 2h4a1 1 0 100-2H3z"/>
                  <path v-else-if="sort.key===col.key && sort.dir==='desc'"
                    d="M3 3a1 1 0 000 2h4a1 1 0 100-2H3zm0 4a1 1 0 000 2h7a1 1 0 100-2H3zm0 4a1 1 0 100 2h11a1 1 0 100-2H3z"/>
                  <path v-else fill-rule="evenodd"
                    d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h11.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z"
                    clip-rule="evenodd" opacity=".35"/>
                </svg>
              </span>
            </span>
          </th>
          <th class="sdt-th sdt-th-acts">
            <span class="sdt-th-inner">Amallar</span>
          </th>
        </tr>
      </thead>

      <tbody class="sdt-body">
        <!-- Empty state -->
        <tr v-if="rows.length === 0">
          <td :colspan="columns.length + (selectable ? 2 : 1)" class="sdt-empty">
            <div class="sdt-empty-inner">
              <div class="sdt-empty-ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"/>
                </svg>
              </div>
              <p class="sdt-empty-title">Ma'lumot topilmadi</p>
              <p class="sdt-empty-sub">Qidiruv yoki filterlarni o'zgartiring</p>
            </div>
          </td>
        </tr>

        <!-- Data rows -->
        <tr
          v-for="(row, ri) in rows" :key="String(row[rowKey ?? 'id'])"
          :class="['sdt-row', selectable && selected.has(row[rowKey ?? 'id']) && 'sdt-row--sel']"
          :style="{ '--ri': ri }"
        >
          <td v-if="selectable" class="sdt-td sdt-td-cb">
            <label class="sdt-cb">
              <input type="checkbox"
                :checked="selected.has(row[rowKey ?? 'id'])"
                @change="toggleRow(row)"/>
              <span class="sdt-cb-box">
                <svg v-if="selected.has(row[rowKey ?? 'id'])" viewBox="0 0 12 10" fill="none">
                  <path d="M1 5l3.5 3.5L11 1" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
            </label>
          </td>

          <td v-for="col in columns" :key="col.key" class="sdt-td">
            <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
              <span class="sdt-cell-txt">{{ row[col.key] ?? '—' }}</span>
            </slot>
          </td>

          <!-- Action buttons -->
          <td class="sdt-td sdt-td-acts">
            <div class="sdt-acts">
              <button class="sdt-btn sdt-btn--view" title="Ko'rish" @click="emit('view', row)">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                  <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
                </svg>
              </button>
              <button class="sdt-btn sdt-btn--edit" title="Tahrirlash" @click="emit('edit', row)">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                </svg>
              </button>
              <button class="sdt-btn sdt-btn--del" title="O'chirish" @click="emit('delete', row)">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
/* ── Wrapper ──────────────────────────────────────────────────────────────── */
.sdt-wrap {
  overflow-x: auto;
  border-radius: 14px;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  box-shadow: 0 1px 4px rgba(0,0,0,.04), 0 4px 16px rgba(0,0,0,.03);
}

/* ── Loading skeleton ─────────────────────────────────────────────────────── */
.sdt-loading { padding: 0; }
.sdt-skel-head {
  height: 42px;
  background: linear-gradient(90deg, var(--mini-bg) 25%, var(--card-border) 50%, var(--mini-bg) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-bottom: 1px solid var(--card-border);
}
.sdt-skel-row {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--card-border);
}
.sdt-skel-row:last-child { border-bottom: none; }
.sdt-skel-cell {
  flex: 1;
  height: 14px;
  border-radius: 99px;
  background: linear-gradient(90deg, var(--mini-bg) 25%, var(--card-border) 50%, var(--mini-bg) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer { to { background-position: -200% 0; } }

/* ── Table base ───────────────────────────────────────────────────────────── */
.sdt { width: 100%; border-collapse: collapse; font-size: 13px; }

/* ── Header ───────────────────────────────────────────────────────────────── */
.sdt-head { position: sticky; top: 0; z-index: 2; }
.sdt-head tr {
  background: var(--mini-bg);
}

.sdt-th {
  padding: 0 16px;
  height: 42px;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .06em;
  border-bottom: 1.5px solid var(--card-border);
  white-space: nowrap;
  user-select: none;
}
.sdt-th:first-child { border-radius: 14px 0 0 0; }
.sdt-th:last-child  { border-radius: 0 14px 0 0; }

.sdt-th--sort { cursor: pointer; transition: .12s; }
.sdt-th--sort:hover { color: #6366f1; background: rgba(99,102,241,.04); }
.sdt-th--active { color: #6366f1; }

.sdt-th-inner { display: inline-flex; align-items: center; gap: 6px; }
.sdt-th-txt   { line-height: 1; }
.sdt-sort-ic  { display: inline-flex; color: var(--muted); opacity: .35; transition: .15s; }
.sdt-sort-ic--on { opacity: 1; color: #6366f1; }
.sdt-sort-ic svg { width: 13px; height: 13px; }
.sdt-th--sort:hover .sdt-sort-ic { opacity: .7; }

.sdt-th-cb   { width: 48px; text-align: center; }
.sdt-th-acts { text-align: center; width: 110px; }

/* ── Body rows ────────────────────────────────────────────────────────────── */
.sdt-row {
  border-bottom: 1px solid var(--card-border);
  transition: background .1s, transform .1s;
  position: relative;
}
.sdt-row:last-child { border-bottom: none; }

.sdt-row::after {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: #6366f1;
  border-radius: 0 2px 2px 0;
  opacity: 0;
  transition: opacity .15s;
}

.sdt-row:hover { background: rgba(99,102,241,.03); }
.sdt-row:hover::after { opacity: 1; }
.sdt-row--sel { background: rgba(99,102,241,.05); }
.sdt-row--sel::after { opacity: 1; }

/* ── Cells ────────────────────────────────────────────────────────────────── */
.sdt-td {
  padding: 0 16px;
  height: 52px;
  color: var(--body);
  vertical-align: middle;
  font-size: 13px;
}
.sdt-td-cb { text-align: center; }
.sdt-cell-txt { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 280px; }

/* ── Action buttons cell ──────────────────────────────────────────────────── */
.sdt-td-acts { text-align: center; }
.sdt-acts {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transform: translateX(4px);
  transition: opacity .15s, transform .15s;
}
.sdt-row:hover .sdt-acts { opacity: 1; transform: translateX(0); }

.sdt-btn {
  width: 30px; height: 30px;
  border-radius: 8px;
  border: 1.5px solid transparent;
  background: transparent;
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: all .14s;
  flex-shrink: 0;
}
.sdt-btn svg { width: 14px; height: 14px; }

.sdt-btn--view {
  color: #6366f1;
  border-color: rgba(99,102,241,.2);
  background: rgba(99,102,241,.06);
}
.sdt-btn--view:hover {
  background: rgba(99,102,241,.14);
  border-color: rgba(99,102,241,.4);
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(99,102,241,.2);
}

.sdt-btn--edit {
  color: #f59e0b;
  border-color: rgba(245,158,11,.2);
  background: rgba(245,158,11,.06);
}
.sdt-btn--edit:hover {
  background: rgba(245,158,11,.14);
  border-color: rgba(245,158,11,.4);
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(245,158,11,.2);
}

.sdt-btn--del {
  color: #ef4444;
  border-color: rgba(239,68,68,.18);
  background: rgba(239,68,68,.05);
}
.sdt-btn--del:hover {
  background: rgba(239,68,68,.12);
  border-color: rgba(239,68,68,.35);
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(239,68,68,.18);
}

/* ── Empty state ──────────────────────────────────────────────────────────── */
.sdt-empty { padding: 0; }
.sdt-empty-inner {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 56px 20px; gap: 8px;
}
.sdt-empty-ic {
  width: 56px; height: 56px;
  background: var(--mini-bg);
  border: 1.5px solid var(--card-border);
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 4px;
}
.sdt-empty-ic svg { width: 26px; height: 26px; color: var(--muted); opacity: .6; }
.sdt-empty-title { font-size: 14px; font-weight: 600; color: var(--title); margin: 0; }
.sdt-empty-sub { font-size: 12px; color: var(--muted); margin: 0; }

/* ── Checkbox ─────────────────────────────────────────────────────────────── */
.sdt-cb { display: inline-flex; cursor: pointer; }
.sdt-cb input { display: none; }
.sdt-cb-box {
  width: 17px; height: 17px;
  border-radius: 5px;
  border: 1.5px solid var(--card-border);
  background: var(--card-bg);
  display: flex; align-items: center; justify-content: center;
  transition: all .14s;
}
.sdt-cb:hover .sdt-cb-box { border-color: #818cf8; }
.sdt-cb input:checked + .sdt-cb-box {
  background: linear-gradient(135deg, #818cf8, #6366f1);
  border-color: #6366f1;
  box-shadow: 0 2px 6px rgba(99,102,241,.3);
}
.sdt-cb-box svg { width: 10px; height: 8px; }
</style>
