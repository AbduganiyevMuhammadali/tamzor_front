<script setup>
/* YUK BERISH — agentga asosiy ombordan tovar berishning oddiy oynasi.
   Uch qadam: agentni tanlang → kerakli tovarlar qatoriga miqdor yozing → "Yuk berish".
   Tavsiya va kun bosqichlariga bog'liq emas: istalgan payt, istalgan agentga, necha marta bo'lsa ham berish mumkin.
   Tovar darhol agent hisobiga o'tadi va agent uni shu zahoti sota oladi (POST /avtolavka/yuklash, tasdiqla: true). */
import { ref, reactive, computed, watch } from 'vue'
import { avtolavkaApi, agentApi } from '@/api/api'
import { useToast } from '@/composables/useToast'

const props = defineProps({ ochiq: { type: Boolean, default: false }, agentId: { type: [Number, String], default: null } })
const emit = defineEmits(['yop', 'berildi'])
const toast = useToast()

const fmt = (v) => Math.round(Number(v) || 0).toLocaleString('ru-RU').replace(/,/g, ' ')
const miq = (v) => String(Math.round((Number(v) || 0) * 1000) / 1000).replace('.', ',')
const son = (v) => { const n = Number(String(v ?? '').replace(/\s/g, '').replace(',', '.')); return Number.isFinite(n) && n > 0 ? Math.round(n * 1000) / 1000 : 0 }
const xatoMatn = (e) => (e?.message === 'session_expired' ? '' : e?.status === 403 ? "Ruxsat yo'q" : e?.message || 'Xatolik')
const bugun = () => { const d = new Date(), p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` }

const agentlar = ref([]), tovarlar = ref([]), agentda = ref(new Map())
const agent = ref(''), qidiruv = ref(''), turkum = ref(''), faqatTanlangan = ref(false), izoh = ref('')
const miqdor = reactive({})                // tovar_id → kiritilgan matn
const yuklanmoqda = ref(false), band = ref(false), xato = ref('')
const qidiruvInp = ref(null)

// Omborda berish mumkin bo'lgan miqdor: qoldiq − boshqa hujjatlarga band qilingani
const mavjud = (t) => Math.max(0, Math.round(((Number(t.qoldiq) || 0) - (Number(t.band) || 0)) * 1000) / 1000)
const turkumlar = computed(() => [...new Set(tovarlar.value.map(t => t.turkum).filter(Boolean))].sort())
const korinadi = computed(() => {
  const q = qidiruv.value.trim().toLowerCase()
  return tovarlar.value.filter(t => (!q || t.nomi.toLowerCase().includes(q)) && (!turkum.value || t.turkum === turkum.value) && (!faqatTanlangan.value || son(miqdor[t.id]) > 0))
})
const tanlangan = computed(() => tovarlar.value.filter(t => son(miqdor[t.id]) > 0))
const jami = computed(() => tanlangan.value.reduce((s, t) => ({ dona: s.dona + son(miqdor[t.id]), summa: s.summa + son(miqdor[t.id]) * (Number(t.chakana_narx) || 0) }), { dona: 0, summa: 0 }))
const ortiq = (t) => son(miqdor[t.id]) > mavjud(t) + 0.0005
const muammo = computed(() => {
  if (!agent.value) return 'Agentni tanlang'
  if (!tanlangan.value.length) return 'Kamida bitta tovarga miqdor yozing'
  const x = tanlangan.value.find(ortiq)
  if (x) return `"${x.nomi}": omborda ${miq(mavjud(x))} bor`
  return ''
})

async function agentdaYukla() {
  agentda.value = new Map()
  if (!agent.value) return
  try { agentda.value = new Map((await avtolavkaApi.agentQoldiq(agent.value) || []).map(q => [q.tovar_id, q.dona])) } catch { /* ustun bo'sh qoladi */ }
}
async function och() {
  Object.keys(miqdor).forEach(k => delete miqdor[k])
  agent.value = props.agentId ? Number(props.agentId) : ''; qidiruv.value = ''; turkum.value = ''; faqatTanlangan.value = false; izoh.value = ''; xato.value = ''
  yuklanmoqda.value = true
  try {
    const [tv, ag] = await Promise.all([avtolavkaApi.tovarlar(), agentApi.getAll()])
    tovarlar.value = (Array.isArray(tv) ? tv : tv?.data || tv?.rows || []).slice().sort((a, b) => String(a.nomi).localeCompare(String(b.nomi)))
    // Dillerga tovar "Dillerlar" bo'limidan beriladi (diller narxida, hujjat bilan)
    agentlar.value = (Array.isArray(ag) ? ag : ag?.rows || ag?.data || []).filter(a => a.faol !== false && !a.diller)
    await agentdaYukla()
  } catch (e) { xato.value = xatoMatn(e) } finally { yuklanmoqda.value = false; setTimeout(() => qidiruvInp.value?.focus(), 50) }
}
function hammasi(t) { miqdor[t.id] = miq(mavjud(t)) }
function blok(t, yon) {
  const b = Number(t.blokdagi_soni) > 1 ? Number(t.blokdagi_soni) : 1
  const v = Math.max(0, Math.min(mavjud(t), son(miqdor[t.id]) + yon * b))
  miqdor[t.id] = v ? miq(v) : ''
}
async function ber() {
  if (band.value || muammo.value) return
  band.value = true; xato.value = ''
  try {
    const qatorlar = tanlangan.value.map(t => ({ tovar_id: t.id, dona: son(miqdor[t.id]), narx: Number(t.chakana_narx) || 0 }))
    const h = await avtolavkaApi.yuklashCreate({ agent_id: Number(agent.value), sana: bugun(), tasdiqla: true, izoh: izoh.value.trim() || 'Yuk berildi', qatorlar })
    const ism = agentlar.value.find(a => a.id === Number(agent.value))?.fullname || ''
    toast.success(`${h?.raqam || 'Yuk'} — ${ism}ga berildi`, `${qatorlar.length} xil tovar · ${miq(jami.value.dona)} · agent darhol sota oladi`)
    emit('berildi', h); emit('yop')
  } catch (e) { xato.value = xatoMatn(e); och0() } finally { band.value = false }
}
// Xatodan keyin ombor qoldig'i yangilanadi (boshqa joyda o'zgargan bo'lishi mumkin), kiritilgan miqdorlar saqlanadi
async function och0() { try { const tv = await avtolavkaApi.tovarlar(); tovarlar.value = (Array.isArray(tv) ? tv : tv?.data || tv?.rows || []).slice().sort((a, b) => String(a.nomi).localeCompare(String(b.nomi))) } catch { /* eski ro'yxat qoladi */ } }

watch(() => props.ochiq, (v) => { if (v) och() })
watch(agent, agentdaYukla)
</script>

<template>
  <div v-if="ochiq" class="pl-ov yb">
    <div class="pl-m yb-m">
      <div class="pl-m-hd">
        <div><h3>Yuk berish</h3><p>Agentni tanlang, kerakli tovarlarga miqdor yozing. Tovar darhol agentga o'tadi — u shu zahoti sota oladi</p></div>
        <button class="pl-m-x" @click="emit('yop')">×</button>
      </div>
      <div class="pl-m-bd">
        <div class="yb-top">
          <label class="pl-f yb-agent"><span>Kimga <i>*</i></span>
            <select v-model="agent"><option value="">— Agentni tanlang —</option><option v-for="a in agentlar" :key="a.id" :value="a.id">{{ a.fullname }}{{ a.territoriya?.nomi ? ' · ' + a.territoriya.nomi : '' }}</option></select>
          </label>
          <label class="pl-f yb-qidir"><span>Tovar qidirish</span><input ref="qidiruvInp" v-model="qidiruv" maxlength="100" placeholder="Nomini yozing…"/></label>
          <label v-if="turkumlar.length > 1" class="pl-f"><span>Turkum</span><select v-model="turkum"><option value="">Hammasi</option><option v-for="t in turkumlar" :key="t" :value="t">{{ t }}</option></select></label>
        </div>

        <p v-if="xato" class="pl-err">{{ xato }}</p>
        <div v-if="yuklanmoqda" class="pl-bosh">Yuklanmoqda…</div>
        <div v-else class="pl-card yb-jadval">
          <table class="pl-tbl">
            <thead><tr><th>Tovar</th><th class="r">Omborda</th><th class="r">Agentda</th><th class="r yb-th-m">Beriladi</th><th class="r">Summa</th></tr></thead>
            <tbody>
              <tr v-for="t in korinadi" :key="t.id" :class="{ 'yb-on': son(miqdor[t.id]) > 0, 'yb-yoq': !mavjud(t) }">
                <td><b>{{ t.nomi }}</b><small>{{ t.turkum || '' }}</small></td>
                <td class="r"><button v-if="mavjud(t)" type="button" class="pl-link" title="Hammasini berish" @click="hammasi(t)">{{ miq(mavjud(t)) }}</button><span v-else class="pl-mut">yo'q</span> <small v-if="mavjud(t)" style="display:inline">{{ t.olchov_birligi || '' }}</small></td>
                <td class="r">{{ agentda.get(t.id) ? miq(agentda.get(t.id)) : '—' }}</td>
                <td class="r">
                  <span class="yb-step">
                    <button type="button" :disabled="!son(miqdor[t.id])" :title="Number(t.blokdagi_soni) > 1 ? `− ${t.blokdagi_soni} (bir blok)` : '− 1'" @click="blok(t, -1)">−</button>
                    <input v-model="miqdor[t.id]" :class="{ 'fx-bad': ortiq(t) }" inputmode="decimal" placeholder="0" :disabled="!mavjud(t)" :aria-label="`${t.nomi} miqdori`"/>
                    <button type="button" :disabled="!mavjud(t) || son(miqdor[t.id]) >= mavjud(t)" :title="Number(t.blokdagi_soni) > 1 ? `+ ${t.blokdagi_soni} (bir blok)` : '+ 1'" @click="blok(t, 1)">+</button>
                  </span>
                  <small v-if="ortiq(t)" class="pl-neg">omborda {{ miq(mavjud(t)) }}</small>
                </td>
                <td class="r m">{{ son(miqdor[t.id]) ? fmt(son(miqdor[t.id]) * (Number(t.chakana_narx) || 0)) : '—' }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="!korinadi.length" class="pl-bosh"><b>{{ faqatTanlangan ? 'Hali tovar tanlanmagan' : qidiruv ? `"${qidiruv}" topilmadi` : "Omborda tovar yo'q" }}</b></div>
        </div>
        <label class="pl-f"><span>Izoh</span><input v-model="izoh" maxlength="255" placeholder="Ixtiyoriy"/></label>
      </div>
      <div class="pl-m-ft">
        <label class="yb-chk"><input v-model="faqatTanlangan" type="checkbox"/> Faqat tanlanganlar</label>
        <span class="yb-jami"><b>{{ tanlangan.length }}</b> xil · <b>{{ miq(jami.dona) }}</b> · <b>{{ fmt(jami.summa) }}</b> so'm</span>
        <button class="pl-btn" @click="emit('yop')">Bekor qilish</button>
        <button class="pl-btn pl-btn--p" :disabled="band || !!muammo" :title="muammo" @click="ber">{{ band ? 'Berilmoqda…' : 'Yuk berish' }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Oyna sahifa qobig'idan tashqarida ham to'g'ri ko'rinishi uchun ranglar shu yerda */
.yb { z-index:1200; --surface:#ffffff; --line:#e6e3ef; --line2:#f0eef6; --ink:#0f172a; --ink2:#334155; --mut:#64748b; --sub:#94a3b8; --hov:#f3f1f9;
  --acc:var(--brand-600, #7c3aed); --acc-soft:var(--brand-50, #f5f3ff); --acc-ink:var(--brand-700, #6d28d9); }
.yb-m { max-width:920px; }
.yb-top { display:grid; grid-template-columns:minmax(220px, 1.2fr) minmax(200px, 1.4fr) minmax(140px, .8fr); gap:12px; }
.yb-jadval { max-height:48vh; overflow:auto; }
.yb-jadval thead th { position:sticky; top:0; background:var(--surface); z-index:1; }
.yb-th-m { min-width:170px; }
.yb-on td { background:rgba(124,58,237,.06); }
.yb-yoq td { opacity:.5; }
.yb-step { display:inline-flex; align-items:center; gap:4px; }
.yb-step button { width:30px; height:34px; border:1.5px solid var(--line); border-radius:8px; background:var(--surface); font-size:16px; cursor:pointer; color:var(--ink2); }
.yb-step button:disabled { opacity:.35; cursor:default; }
.yb-step input { width:86px; height:34px; padding:0 8px; border:1.5px solid var(--line); border-radius:8px; text-align:right; font-size:14px; font-weight:600; font-variant-numeric:tabular-nums; background:var(--surface); color:var(--ink); outline:none; }
.yb-step input:focus { border-color:var(--acc); }
.yb-chk { display:inline-flex; align-items:center; gap:6px; font-size:13px; cursor:pointer; margin-right:auto; }
.yb-jami { font-size:13px; color:var(--mut); margin-right:8px; } .yb-jami b { color:var(--ink); }
@media (max-width:760px) { .yb-top { grid-template-columns:1fr; } }
</style>
