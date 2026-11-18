<script setup lang="ts">
/* Sozlamalar → Xavfsizlik: o'chirish paroli.
   Tasdiqlangan kirim (prixod) hujjatini o'chirishda so'raladi — foydalanuvchi parolidan alohida,
   standart qiymati 123 (foydalanuvchi so'rovi 2026-11-03). Faqat Admin ko'radi va o'zgartiradi. */
import { ref, onMounted } from 'vue'
// @ts-ignore
import { sozlamaApi } from '@/api/api'
// @ts-ignore
import { useToast } from '@/composables/useToast'

const toast = useToast()
const joriy = ref('')
const korsat = ref(false)
const yangi = ref('')
const takror = ref('')
const loading = ref(false)
const saving = ref(false)
const updatedAt = ref<string | null>(null)

async function load() {
  loading.value = true
  try {
    const r = await sozlamaApi.getXavfsizlik()
    joriy.value = r.ochirish_parol || ''
    updatedAt.value = r.updatedAt || null
  } catch (e: any) { toast.error('Yuklash xatosi', e.message) }
  finally { loading.value = false }
}
async function save() {
  if (yangi.value.trim().length < 3) { toast.error('Xatolik', 'Parol kamida 3 ta belgi bo\'lsin'); return }
  if (yangi.value !== takror.value) { toast.error('Xatolik', 'Takror kiritilgan parol mos emas'); return }
  saving.value = true
  try {
    const r = await sozlamaApi.updateXavfsizlik({ ochirish_parol: yangi.value.trim() })
    joriy.value = r.ochirish_parol; updatedAt.value = r.updatedAt
    yangi.value = ''; takror.value = ''
    toast.success('Saqlandi', 'O\'chirish paroli yangilandi')
  } catch (e: any) { toast.error('Saqlash xatosi', e.message) }
  finally { saving.value = false }
}
function fmt(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
onMounted(load)
</script>

<template>
  <div class="xv-page">
    <div class="xv-hd">
      <div class="xv-hd-ic">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      </div>
      <div>
        <h2 class="xv-title">Xavfsizlik</h2>
        <p class="xv-sub">Xavfli amallar uchun alohida parol. Hozircha: Ombor → Kirim ro'yxatida tasdiqlangan hujjatni o'chirish.</p>
      </div>
    </div>

    <div class="xv-grid">
      <div class="xv-card">
        <div class="xv-card-t">O'chirish paroli</div>
        <div class="xv-row">
          <span class="xv-lbl">Joriy parol</span>
          <span class="xv-val">
            <b class="xv-parol">{{ loading ? '…' : (korsat ? joriy : '•'.repeat(Math.max(3, joriy.length))) }}</b>
            <button class="xv-link" @click="korsat = !korsat">{{ korsat ? 'Yashirish' : 'Ko\'rsatish' }}</button>
          </span>
        </div>
        <div class="xv-row"><span class="xv-lbl">Oxirgi o'zgartirilgan</span><span class="xv-val">{{ fmt(updatedAt) }}</span></div>

        <div class="xv-card-t" style="margin-top:18px">Yangi parol</div>
        <div class="xv-field"><label>Yangi parol</label><input v-model="yangi" type="password" class="xv-in" autocomplete="new-password" placeholder="Kamida 3 ta belgi" :disabled="saving"/></div>
        <div class="xv-field"><label>Takror</label><input v-model="takror" type="password" class="xv-in" autocomplete="new-password" placeholder="Yana bir marta" :disabled="saving" @keydown.enter="save"/></div>
        <div class="xv-actions"><button class="xv-btn" :disabled="saving || loading || !yangi" @click="save">{{ saving ? 'Saqlanmoqda…' : 'Saqlash' }}</button></div>
      </div>

      <div class="xv-card xv-card--info">
        <div class="xv-card-t">Qanday ishlaydi</div>
        <ul class="xv-list">
          <li>Qoralama hujjat parolsiz o'chadi: u hali omborga kirmagan.</li>
          <li>Tasdiqlangan hujjatni faqat Admin o'chira oladi va shu parolni kiritadi.</li>
          <li>O'chirilganda ombordagi kirim, yetkazuvchi qarzi/to'lovi va shu hujjatning kassa chiqimi bekor bo'ladi.</li>
          <li>Hujjat tovari allaqachon sotilgan bo'lsa tizim o'chirishga yo'l qo'ymaydi va qaysi tovar qancha yetishmasligini aytadi.</li>
          <li>O'chirilgan hujjat bazada belgilangan holda qoladi (izohida kim va qachon o'chirgani yoziladi).</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.xv-page { display:flex; flex-direction:column; gap:14px; }
.xv-hd { display:flex; align-items:center; gap:12px; }
.xv-hd-ic { width:40px; height:40px; border-radius:11px; background:rgba(139,92,246,.12); color:#8b5cf6; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.xv-title { margin:0; font-size:17px; font-weight:700; color:var(--ink,#0f172a); }
.xv-sub { margin:2px 0 0; font-size:12px; color:var(--mut,#64748b); }
.xv-grid { display:grid; grid-template-columns:minmax(0,420px) 1fr; gap:14px; align-items:start; }
@media (max-width: 900px) { .xv-grid { grid-template-columns:1fr; } }
.xv-card { border:1px solid var(--line,#e2e8f0); border-radius:12px; background:var(--surface,#fff); padding:16px; }
.xv-card--info { background:var(--hov,#f8fafc); }
.xv-card-t { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--mut,#94a3b8); margin-bottom:10px; }
.xv-row { display:flex; justify-content:space-between; gap:12px; padding:7px 0; border-bottom:1px solid var(--line,#eef2f7); font-size:13px; }
.xv-lbl { color:var(--mut,#64748b); }
.xv-val { display:flex; align-items:center; gap:10px; color:var(--ink,#0f172a); }
.xv-parol { font-size:15px; letter-spacing:.15em; font-variant-numeric:tabular-nums; }
.xv-link { border:none; background:transparent; color:#7c3aed; font-size:12px; font-weight:600; cursor:pointer; padding:0; }
.xv-field { display:flex; flex-direction:column; gap:5px; margin-bottom:10px; }
.xv-field label { font-size:12px; font-weight:600; color:var(--mut,#475569); }
.xv-in { height:38px; padding:0 11px; border:1px solid var(--line,#e2e8f0); border-radius:9px; font-size:14px; letter-spacing:.15em; background:var(--surface,#fff); color:var(--ink,#0f172a); outline:none; }
.xv-in:focus { border-color:#8b5cf6; box-shadow:0 0 0 3px rgba(139,92,246,.15); }
.xv-actions { display:flex; justify-content:flex-end; }
.xv-btn { padding:9px 16px; border-radius:9px; border:none; background:#7c3aed; color:#fff; font-size:13px; font-weight:600; cursor:pointer; }
.xv-btn:hover:not(:disabled) { background:#6d28d9; } .xv-btn:disabled { opacity:.55; cursor:default; }
.xv-list { margin:0; padding-left:18px; font-size:12.5px; color:var(--ink2,#334155); line-height:1.7; }
</style>
