<script setup lang="ts">
/* ISHLAB CHIQARISH — partiyalar ro'yxati: jarayon qanday ishlashi, shu oy natijalari, har partiya
   holati, chiqish foizi va 1 birlik tannarxi. Partiya ustiga bosilsa — hujjat (form.vue). */
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
// @ts-ignore
import { ishlabApi } from '@/api/api'
import KpiKarta from '../hisobot/kit/KpiKarta.vue'
import { HOLAT, BOSQICHLAR } from './hisob'
import '../hisobot/kit/hisobot.css'

const router = useRouter()
const d = ref<any>(null)
const yuklanmoqda = ref(true)
const holat = ref('')
const q = ref('')
const page = ref(1)

async function yukla() {
  yuklanmoqda.value = true
  try { d.value = await ishlabApi.getAll({ holat: holat.value, search: q.value.trim(), page: page.value, limit: 30 }) }
  finally { yuklanmoqda.value = false }
}
onMounted(yukla)
let t: ReturnType<typeof setTimeout>
const qidir = () => { clearTimeout(t); t = setTimeout(() => { page.value = 1; yukla() }, 300) }
const filtr = (k: string) => { holat.value = k; page.value = 1; yukla() }

const fmt = (v: unknown, dd = 0) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: dd }).format(Number(v) || 0)
const sana = (s: string) => new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
const s = computed(() => d.value?.stat || { oy: {}, qoralama: 0, jarayonda: 0 })
const FILTR = [{ k: '', nom: 'Hammasi' }, { k: 'qoralama', nom: 'Qoralama' }, { k: 'jarayonda', nom: 'Jarayonda' }, { k: 'yakunlandi', nom: 'Skladda' }, { k: 'bekor', nom: 'Bekor' }]
const xomOmborYol = computed(() => `/ombor/qoldiqlar?ombor=${encodeURIComponent(s.value.xom_ombor?.nomi || 'Xom ashyo ombori')}`)
const band = ref(false)
/* Noto'g'ri omborda turgan qoldiq (asosiy skladdagi xom ashyo) — turi omboriga o'tkazish */
async function tartibla() {
  band.value = true
  try { await ishlabApi.tartibla(); await yukla() } finally { band.value = false }
}
const IK = {
  zavod: '<path d="M3 21V10l6 4v-4l6 4V6l6 3v12z"/><path d="M7 17.5h2M12 17.5h2M17 17.5h2"/>',
  qosh: '<path d="M12 5v14M5 12h14"/>',
  qidir: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  qiymat: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
  foiz: '<path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
  partiya: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  jarayon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  strelka: '<path d="m9 6 6 6-6 6"/>',
  ombor: '<path d="M3 21V8l9-5 9 5v13"/><path d="M7 21v-8h10v8M7 17h10"/>',
  ogoh: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
}
</script>

<template>
  <div class="il">
    <div class="il-hd">
      <span class="il-hd-ic"><svg viewBox="0 0 24 24" v-html="IK.zavod" /></span>
      <div class="il-hd-t">
        <h1>Ishlab chiqarish</h1>
        <p>Xom ashyodan sof mahsulot: nima sarflandi, nima chiqdi, 1 birlik necha pulga tushdi</p>
      </div>
      <button class="hs-btn hs-btn--p" @click="router.push('/ishlab/yangi')"><svg viewBox="0 0 24 24" v-html="IK.qosh" />Yangi partiya</button>
    </div>

    <!-- Jarayon qanday ishlaydi -->
    <div class="il-yol">
      <template v-for="(b, i) in BOSQICHLAR" :key="b.k">
        <div class="il-yol-q">
          <span class="il-yol-i"><svg viewBox="0 0 24 24" v-html="b.ikon" /></span>
          <span><b>{{ i + 1 }}. {{ b.nom }}</b><small>{{ b.izoh }}</small></span>
        </div>
        <svg v-if="i < BOSQICHLAR.length - 1" class="il-yol-s" viewBox="0 0 24 24" v-html="IK.strelka" />
      </template>
    </div>

    <div class="hs-grid hs-grid--kpi">
      <KpiKarta nom="Shu oy partiyalar" :ikon="IK.partiya" :qiymat="`${s.oy.soni ?? 0} ta`" :izoh="`${s.jarayonda} jarayonda · ${s.qoralama} qoralama`" />
      <KpiKarta nom="Ishlab chiqarildi (tannarxda)" :ikon="IK.qiymat" :qiymat="s.oy.qiymat" birlik="so'm" :izoh="`xarajatlar ${fmt(s.oy.xarajat)} so'm`" />
      <KpiKarta nom="O'rtacha chiqish foizi" :ikon="IK.foiz" :qiymat="s.oy.chiqish_foiz != null ? `${s.oy.chiqish_foiz}%` : '—'"
        :izoh="s.oy.xom_ashyo ? `${fmt(s.oy.xom_ashyo, 1)} → ${fmt(s.oy.mahsulot, 1)} (bir xil birlikdagi partiyalar)` : 'sof mahsulot ÷ xom ashyo'" />
      <KpiKarta nom="Yo'qotish" :ikon="IK.jarayon" :qiymat="fmt(s.oy.yoqotish, 1)" ton="warn" izoh="chiqindi, bug'lanish — tannarxga singgan" />
      <KpiKarta nom="Xom ashyo omborida" :ikon="IK.ombor" :qiymat="s.xom_ombor?.qiymat ?? 0" birlik="so'm" :to="xomOmborYol"
        :izoh="`${s.xom_ombor?.tovar_soni ?? 0} xil xom ashyo · tannarxda, sotilmaydi`" />
    </div>

    <div v-if="s.tartibsiz?.length" class="il-tartib">
      <svg viewBox="0 0 24 24" v-html="IK.ogoh" />
      <span>Noto'g'ri omborda turibdi:
        <b v-for="(x, i) in s.tartibsiz" :key="x.tovar_id + x.dan_nomi">{{ i ? ', ' : '' }}{{ x.nomi }} {{ fmt(x.dona, 3) }} {{ x.olchov }} ({{ x.dan_nomi }})</b>.
        Xom ashyo savdo skladida turmasligi, savdo tovari esa xom ashyo omborida turmasligi kerak.</span>
      <button class="hs-btn hs-btn--s" :disabled="band" @click="tartibla">Turi omboriga o'tkazish</button>
    </div>

    <section class="hs-karta">
      <div class="il-bar">
        <div class="il-chips">
          <button v-for="f in FILTR" :key="f.k" class="il-chip" :class="{ on: holat === f.k }" @click="filtr(f.k)">{{ f.nom }}
            <i v-if="f.k === 'jarayonda' && s.jarayonda">{{ s.jarayonda }}</i><i v-if="f.k === 'qoralama' && s.qoralama">{{ s.qoralama }}</i></button>
        </div>
        <div class="il-qidir"><svg viewBox="0 0 24 24" v-html="IK.qidir" /><input v-model="q" placeholder="Raqam yoki tovar…" @input="qidir" /></div>
      </div>
      <div class="hs-karta-b hs-karta-b--0">
        <div v-if="yuklanmoqda && !d" class="il-bos"><div class="hs-skelet" style="height:180px" /></div>
        <div v-else-if="!d?.rows?.length" class="il-bos">
          <svg viewBox="0 0 24 24" v-html="IK.zavod" />
          <b>{{ holat || q ? 'Partiya topilmadi' : "Hali ishlab chiqarish yo'q" }}</b>
          <p v-if="!holat && !q">Masalan: 1 tonna xom ashyo keldi (Ombor → Kirim, u Xom ashyo omboriga tushadi) → yangi partiya: 1 000 kg sarflandi, 900 kg sof mahsulot chiqdi — tannarxi va skladga kirimi avtomatik.</p>
          <button v-if="!holat && !q" class="hs-btn hs-btn--p" @click="router.push('/ishlab/yangi')">Birinchi partiya</button>
        </div>
        <div v-else class="hs-jw">
          <table class="hs-jadval">
            <thead><tr>
              <th>Partiya</th><th>Mahsulot</th><th>Xom ashyo</th><th class="r">Chiqish</th><th class="r">1 birlik tannarxi</th><th class="r">Partiya tannarxi</th><th>Holat</th>
            </tr></thead>
            <tbody>
              <tr v-for="r in d.rows" :key="r.id" class="bos" @click="router.push(`/ishlab/${r.id}`)">
                <td><b>{{ r.raqam }}</b><div class="m">{{ sana(r.sana) }}{{ r.user_nomi ? ` · ${r.user_nomi}` : '' }}</div></td>
                <td>
                  <div v-for="(m, i) in r.mahsulotlar" :key="i"><b>{{ m.tovar_nomi }}</b> <span class="m">{{ fmt(m.miqdor, 3) }} {{ m.olchov }}</span></div>
                  <span v-if="!r.mahsulotlar.length" class="m">—</span>
                </td>
                <td><div v-for="(x, i) in r.xom_ashyo" :key="i" class="m">{{ x.tovar_nomi }} · {{ fmt(x.miqdor, 3) }} {{ x.olchov }}</div></td>
                <td class="r"><template v-if="r.chiqish_foiz != null"><b>{{ r.chiqish_foiz }}%</b><div class="m">yo'qotish {{ fmt(r.yoqotish_miqdor, 3) }}</div></template><span v-else class="m">—</span></td>
                <td class="r"><b v-if="r.birlik_tannarx">{{ fmt(r.birlik_tannarx, 2) }}</b>
                  <template v-else-if="r.holat === 'yakunlandi'"><div v-for="(m, i) in r.mahsulotlar" :key="i" class="m">{{ fmt(m.narx, 2) }}</div></template>
                  <span v-else class="m">—</span></td>
                <td class="r"><b v-if="r.tannarx_jami">{{ fmt(r.tannarx_jami) }}</b><span v-else class="m">—</span></td>
                <td><span class="hs-belgi" :class="HOLAT[r.holat]?.cls">{{ HOLAT[r.holat]?.nom }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="d?.pages > 1" class="il-pg">
          <button class="hs-btn hs-btn--s" :disabled="page <= 1" @click="page--; yukla()">‹</button>
          <span>{{ page }} / {{ d.pages }}</span>
          <button class="hs-btn hs-btn--s" :disabled="page >= d.pages" @click="page++; yukla()">›</button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.il { padding:24px 28px 40px; display:flex; flex-direction:column; gap:16px; max-width:1360px; }
.il svg { width:16px; height:16px; fill:none; stroke:currentColor; stroke-width:1.75; stroke-linecap:round; stroke-linejoin:round; }
.il-hd { display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
.il-hd-ic { width:42px; height:42px; border-radius:11px; background:var(--brand); color:#fff; display:flex; align-items:center; justify-content:center; }
.il-hd-ic svg { width:20px; height:20px; }
.il-hd-t { flex:1; min-width:240px; }
.il-hd-t h1 { margin:0; font-size:22px; font-weight:700; letter-spacing:-.02em; }
.il-hd-t p { margin:3px 0 0; color:var(--mut); font-size:13px; }

.il-tartib { display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:12px; background:rgba(245,158,11,.1); color:#92400e; font-size:12.5px; line-height:1.5; }
.il-tartib svg { width:16px; height:16px; flex-shrink:0; fill:none; stroke:currentColor; stroke-width:1.75; stroke-linecap:round; stroke-linejoin:round; }
.il-tartib span { flex:1; }
.il-tartib .hs-btn { flex-shrink:0; }
.shell.dark .il-tartib { color:#fcd34d; }
.il-yol { display:flex; align-items:center; gap:8px; padding:12px 14px; border-radius:12px; background:var(--surface); border:1px solid var(--line); }
.il-yol-q { flex:1; display:flex; gap:10px; align-items:flex-start; min-width:0; }
.il-yol-q > span:last-child { display:flex; flex-direction:column; gap:2px; min-width:0; }
.il-yol-q b { font-size:13px; font-weight:650; }
.il-yol-q small { font-size:11.5px; color:var(--mut); line-height:1.4; }
.il-yol-i { width:32px; height:32px; flex-shrink:0; border-radius:9px; background:var(--acc-soft); color:var(--acc); display:flex; align-items:center; justify-content:center; }
.il-yol-s { flex-shrink:0; color:var(--sub); }
@media (max-width:900px) { .il-yol { flex-direction:column; align-items:stretch; } .il-yol-s { transform:rotate(90deg); align-self:center; } }

.il-bar { display:flex; align-items:center; gap:10px; padding:12px 14px; border-bottom:1px solid var(--line2); flex-wrap:wrap; }
.il-chips { display:flex; gap:5px; flex-wrap:wrap; flex:1; }
.il-chip { height:32px; padding:0 12px; border-radius:16px; border:1px solid var(--line); background:var(--surface); color:var(--ink2); font:inherit; font-size:12.5px; font-weight:500; cursor:pointer; display:inline-flex; align-items:center; gap:6px; }
.il-chip i { font-style:normal; font-size:10.5px; font-weight:700; background:#f59e0b; color:#fff; border-radius:8px; padding:0 6px; line-height:16px; }
.il-chip.on { border-color:var(--brand-300); background:var(--acc-soft); color:var(--acc); font-weight:650; }
.il-qidir { display:flex; align-items:center; gap:7px; height:34px; padding:0 10px; border:1px solid var(--line); border-radius:9px; background:var(--surface); color:var(--sub); }
.il-qidir input { border:0; background:transparent; color:var(--ink); font:inherit; font-size:13px; outline:none; width:200px; }
.il-bos { padding:40px 20px; text-align:center; display:flex; flex-direction:column; align-items:center; gap:10px; color:var(--mut); }
.il-bos > svg { width:34px; height:34px; color:var(--sub); }
.il-bos b { color:var(--ink); font-size:15px; }
.il-bos p { max-width:520px; margin:0; font-size:13px; line-height:1.55; }
.il-pg { display:flex; align-items:center; justify-content:center; gap:10px; padding:12px; font-size:13px; color:var(--mut); }
</style>
