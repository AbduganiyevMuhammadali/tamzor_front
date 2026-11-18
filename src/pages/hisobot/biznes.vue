<script setup lang="ts">
/* BIZNES HOLATI — biznes sog'lommi:
   1) qancha ishladik (sof tushum → yalpi foyda → xarajatlar → sof foyda),
   2) biznesda nima bor (kassa, tovar, mijozlar qarzi − yetkazuvchilarga qarz = sof qiymat),
   3) salomatlik ko'rsatkichlari — har biri baho, izoh va tavsiya bilan,
   4) so'nggi 6 oy. */
import { computed } from 'vue'
// @ts-ignore
import { tahlilApi } from '@/api/api'
import HisobotSahifa from './kit/HisobotSahifa.vue'
import KpiKarta from './kit/KpiKarta.vue'
import UstunGrafik from './kit/UstunGrafik.vue'
import { davr, useYuklash, qisqa, fmt, foizFmt, ozgarish, IKON, RANG } from './kit/hisobot'

const { data: d, yuklanmoqda } = useYuklash(() => tahlilApi.biznes({ dan: davr.dan.value, gacha: davr.gacha.value }))

const IZOH = [
  { nom: 'Sof foyda', matn: "Yalpi foyda (sof tushum − tannarx) − operatsion xarajatlar (ish haqi, ijara, kommunal, transport va boshqa kassa chiqimlari) + boshqa daromad. Yetkazuvchiga to'lov xarajat emas — u tovar tannarxida hisoblangan." },
  { nom: 'Biznes qiymati (sof qiymat)', matn: "Kassadagi pul + ombordagi va mashinalardagi tovar (tannarxda) + mijozlar qarzi − yetkazuvchilarga qarzimiz. Biznes hozir sotilsa va hamma qarzlar yopilsa, egasida qoladigan qiymat." },
  { nom: 'Qarz qaytish muddati', matn: 'Mijozlar qarzi ÷ kunlik o\'rtacha sotuv. Pul mijozda o\'rtacha necha kun turishini ko\'rsatadi.' },
  { nom: 'Zaxira yetadi', matn: 'Ombor + mashinalardagi tovar ÷ kunlik sotuv tannarxi. 7–45 kun — me\'yor.' },
  { nom: "Pul aylanish sikli", matn: "Zaxira kunlari + qarz qaytish kunlari − yetkazuvchiga to'lash kunlari: tovarga tikilgan pul necha kunda qaytadi." },
  { nom: "To'lov qobiliyati", matn: "(Kassa + mijozlar qarzi) ÷ yetkazuvchilarga qarz. 1,5 dan yuqori — xotirjam, 1 dan past — qarzni yopishga pul yetmaydi." },
  { nom: "Muddati o'tgan qarz", matn: "Mijoz qarzining to'lov sanasidan o'tgan qismi. To'lov sanasi — agent qarzga sotuvda kalendardan belgilagan sana, bo'lmasa sotuv + mijozning to'lov muddati." },
  { nom: 'Umumiy baho', matn: "Har ko'rsatkich: yaxshi = 100, e'tibor = 55, xavf = 15 ball; o'rtachasi. 75+ — yaxshi holat, 50–74 — e'tibor talab qiladi, 50 dan past — xavfli." },
]

const HOLAT: Record<string, { nom: string; ton: string; ikon: string }> = {
  yaxshi: { nom: 'Yaxshi holatda', ton: 'ok', ikon: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>' },
  orta: { nom: "E'tibor talab qiladi", ton: 'warn', ikon: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01"/>' },
  xavf: { nom: 'Xavfli holat', ton: 'err', ikon: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>' },
  nomalum: { nom: "Ma'lumot yetarli emas", ton: 'neytral', ikon: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5h.01"/>' },
}
const BAHO: Record<string, { nom: string; cls: string }> = {
  yaxshi: { nom: 'Yaxshi', cls: 'hs-belgi--ok' }, orta: { nom: "E'tibor", cls: 'hs-belgi--warn' },
  xavf: { nom: 'Xavf', cls: 'hs-belgi--err' }, info: { nom: "Ma'lumot", cls: 'hs-belgi--B' }, nomalum: { nom: '—', cls: 'hs-belgi--n' },
}

const p = computed(() => d.value?.pnl || {})
const o = computed(() => d.value?.oldingi || {})
const b = computed(() => d.value?.balans || {})
const x = computed(() => d.value?.xulosa || {})

/* Oddiy tilda xulosa */
const matn = computed(() => {
  if (!d.value) return ''
  const q: string[] = []
  const pp = p.value
  q.push(pp.sof_foyda >= 0
    ? `Tanlangan davrda <b>${qisqa(pp.sof_foyda)} so'm sof foyda</b> qoldi — har 100 so'm savdodan <b>${Math.round(pp.sof_marja)} so'm</b>.`
    : `Tanlangan davrda biznes <b>${qisqa(-pp.sof_foyda)} so'm zarar</b> ko'rdi — xarajatlar yalpi foydadan ko'p.`)
  q.push(`Biznesning sof qiymati <b>${qisqa(b.value.sof_qiymat)} so'm</b>.`)
  if (x.value.xavf?.length) q.push(`Asosiy xavf: <b>${x.value.xavf.join(', ').toLowerCase()}</b>.`)
  else if (x.value.orta?.length) q.push(`E'tibor bering: ${x.value.orta.join(', ').toLowerCase()}.`)
  else q.push('Barcha ko\'rsatkichlar me\'yorida.')
  return q.join(' ')
})

/* Sof tushumdan sof foydagacha — sharshara qatorlari */
const sharshara = computed(() => {
  const pp = p.value
  if (!d.value) return []
  const r: { nom: string; summa: number; tur: 'jami' | 'minus' | 'plus' | 'natija'; izoh?: string; old?: number }[] = [
    { nom: 'Sof tushum', summa: pp.tushum, tur: 'jami', izoh: 'yetkazilgan savdo, qaytarishlarsiz', old: o.value.tushum },
    { nom: 'Tannarx', summa: -pp.tannarx, tur: 'minus', izoh: 'sotilgan tovarning kirim narxi' },
    { nom: 'Yalpi foyda', summa: pp.yalpi, tur: 'natija', izoh: `marja ${foizFmt(pp.yalpi_marja)}`, old: o.value.yalpi },
    ...(pp.xarajatlar || []).map((t: any) => ({ nom: t.nom, summa: -t.summa, tur: 'minus' as const, izoh: `${t.son} ta chiqim` })),
    ...(pp.boshqa_daromad ? [{ nom: 'Boshqa daromad', summa: pp.boshqa_daromad, tur: 'plus' as const }] : []),
    { nom: 'Sof foyda', summa: pp.sof_foyda, tur: 'natija', izoh: `marja ${foizFmt(pp.sof_marja)}`, old: o.value.sof_foyda },
  ]
  return r
})
const sharKatta = computed(() => Math.max(1, ...sharshara.value.map(r => Math.abs(r.summa))))

const aktivRang: Record<string, string> = { kassa: RANG.ok, ombor: RANG.brand, mashina: RANG.brand2, debitorka: RANG.warn, avans: RANG.brand3, berilgan_qarz: '#a5b4fc' }
const ballRang = computed(() => (x.value.holat === 'yaxshi' ? '#059669' : x.value.holat === 'orta' ? '#d97706' : x.value.holat === 'xavf' ? '#dc2626' : '#94a3b8'))
const ballYoy = computed(() => {
  const v = Math.max(0, Math.min(100, x.value.ball ?? 0)) / 100
  const a = Math.PI * (1 - v)
  return `M 10 60 A 50 50 0 0 1 ${(60 + 50 * Math.cos(a)).toFixed(2)} ${(60 - 50 * Math.sin(a)).toFixed(2)}`
})
const korsatkichQiymat = (k: any) => k.qiymat === null || k.qiymat === undefined ? '—'
  : k.birlik === '%' ? foizFmt(k.qiymat) : k.birlik === 'x' ? `${String(k.qiymat).replace('.', ',')} ×` : `${fmt(k.qiymat)} kun`
</script>

<template>
  <HisobotSahifa :ikon="IKON.puls" nom="Biznes holati" savol="Biznes sog'lommi: qancha ishladik, nimamiz bor va qayerda xavf bor"
    :izohlar="IZOH" :yuklanmoqda="yuklanmoqda">

    <template v-if="!d">
      <div class="hs-skelet" style="height:150px"/>
      <div class="hs-grid hs-grid--kpi"><div v-for="i in 5" :key="i" class="hs-skelet" style="height:104px"/></div>
    </template>

    <template v-else>
      <!-- ═══ XULOSA ═══ -->
      <section class="bz-xulosa" :class="`bz-xulosa--${x.holat}`">
        <div class="bz-gauge">
          <svg viewBox="0 0 120 70">
            <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="var(--act)" stroke-width="11" stroke-linecap="round"/>
            <path v-if="x.ball" :d="ballYoy" fill="none" :stroke="ballRang" stroke-width="11" stroke-linecap="round"/>
          </svg>
          <div class="bz-gauge-v"><b>{{ x.ball ?? '—' }}</b><span>/ 100</span></div>
        </div>
        <div class="bz-xulosa-t">
          <div class="bz-holat"><svg viewBox="0 0 24 24" v-html="HOLAT[x.holat]?.ikon"/>{{ HOLAT[x.holat]?.nom }}</div>
          <p v-html="matn"/>
          <div class="bz-chip">
            <span v-for="n in x.xavf" :key="n" class="hs-belgi hs-belgi--err">{{ n }}</span>
            <span v-for="n in x.orta" :key="n" class="hs-belgi hs-belgi--warn">{{ n }}</span>
          </div>
        </div>
      </section>

      <div class="hs-grid hs-grid--kpi">
        <KpiKarta nom="Sof foyda" :ikon="IKON.osish" :qiymat="p.sof_foyda" birlik="so'm" :ton="p.sof_foyda >= 0 ? 'ok' : 'err'"
          :delta="ozgarish(p.sof_foyda, o.sof_foyda)" :izoh="`Marja ${foizFmt(p.sof_marja)} · oldingi davrda ${qisqa(o.sof_foyda)}`"/>
        <KpiKarta nom="Sof tushum" :ikon="IKON.savat" :qiymat="p.tushum" birlik="so'm" :delta="ozgarish(p.tushum, o.tushum)" to="/hisobot/sotuv"/>
        <KpiKarta nom="Operatsion xarajatlar" :ikon="IKON.kassa" :qiymat="p.xarajat" birlik="so'm" :delta="ozgarish(p.xarajat, o.xarajat)" yaxshi="past"
          :izoh="p.yalpi ? `Yalpi foydaning ${foizFmt(p.xarajat / p.yalpi * 100)} ini yeydi` : ''"/>
        <KpiKarta nom="Biznes qiymati" :ikon="IKON.hamyon" :qiymat="b.sof_qiymat" birlik="so'm" izoh="Aktivlar − yetkazuvchilarga qarz"/>
        <KpiKarta nom="Yetkazuvchilarga qarz" :ikon="IKON.zavod" :qiymat="b.majburiyat" birlik="so'm" ton="warn" to="/hisobot/yetkazuvchilar"/>
      </div>

      <div class="hs-grid hs-grid--2">
        <!-- ═══ QANCHA ISHLADIK ═══ -->
        <section class="hs-karta">
          <div class="hs-karta-hd">
            <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.osish"/></span>
            <div class="hs-kt"><h2>Qancha ishladik</h2><p>Sof tushumdan sof foydagacha — har qadamda nima ayirildi</p></div>
          </div>
          <div class="hs-karta-b">
            <div v-for="r in sharshara" :key="r.nom" class="bz-sh" :class="`bz-sh--${r.tur}`">
              <div class="bz-sh-t">
                <span class="bz-sh-n">{{ r.tur === 'minus' ? '−' : r.tur === 'plus' ? '+' : '' }} {{ r.nom }}</span>
                <small v-if="r.izoh">{{ r.izoh }}</small>
              </div>
              <div class="bz-sh-bar"><i :style="{ width: Math.max(1.5, Math.abs(r.summa) / sharKatta * 100) + '%' }"/></div>
              <b class="bz-sh-v" :class="{ 'hs-err': r.tur === 'natija' && r.summa < 0 }">{{ fmt(r.summa) }}</b>
            </div>
          </div>
        </section>

        <!-- ═══ NIMAMIZ BOR ═══ -->
        <section class="hs-karta">
          <div class="hs-karta-hd">
            <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.ombor"/></span>
            <div class="hs-kt"><h2>Biznesda nima bor</h2><p>Hozirgi holat — davrga bog'liq emas</p></div>
          </div>
          <div class="hs-karta-b">
            <div class="bz-tarkib">
              <i v-for="a in b.aktivlar" :key="a.k" :style="{ flex: Math.max(0.0001, a.summa), background: aktivRang[a.k] }" :title="`${a.nom}: ${fmt(a.summa)}`"/>
            </div>
            <div v-for="a in b.aktivlar" :key="a.k" class="bz-q">
              <span class="bz-dot" :style="{ background: aktivRang[a.k] }"/>
              <div class="bz-q-t"><b>{{ a.nom }}</b><small>{{ a.izoh }}</small></div>
              <span class="bz-q-v">{{ fmt(a.summa) }}</span>
            </div>
            <div class="bz-q bz-q--jami"><div class="bz-q-t"><b>Jami aktivlar</b></div><span class="bz-q-v">{{ fmt(b.aktiv) }}</span></div>
            <div v-for="m in b.majburiyatlar" :key="m.k" class="bz-q bz-q--minus">
              <span class="bz-dot" style="background:#dc2626"/>
              <div class="bz-q-t"><b>− {{ m.nom }}</b><small>{{ m.izoh }}</small></div>
              <span class="bz-q-v">{{ fmt(m.summa) }}</span>
            </div>
            <div class="bz-sof">
              <span>Sof qiymat (o'z kapitali)</span>
              <b>{{ fmt(b.sof_qiymat) }} <small>so'm</small></b>
            </div>
          </div>
        </section>
      </div>

      <!-- ═══ SALOMATLIK ═══ -->
      <section class="hs-karta">
        <div class="hs-karta-hd">
          <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.puls"/></span>
          <div class="hs-kt"><h2>Salomatlik ko'rsatkichlari</h2><p>Har biri me'yor bilan solishtirilgan; xavf yoki e'tibor bo'lsa — nima qilish kerakligi yozilgan</p></div>
        </div>
        <div class="hs-karta-b bz-kor">
          <div v-for="k in d.korsatkich" :key="k.k" class="bz-k" :class="`bz-k--${k.baho}`">
            <div class="bz-k-hd">
              <span class="bz-k-n">{{ k.nom }}</span>
              <span class="hs-belgi" :class="BAHO[k.baho]?.cls">{{ BAHO[k.baho]?.nom }}</span>
            </div>
            <b class="bz-k-v">{{ korsatkichQiymat(k) }}</b>
            <p class="bz-k-iz">{{ k.izoh }}</p>
            <p v-if="k.baho === 'xavf' || k.baho === 'orta'" class="bz-k-t">
              <svg viewBox="0 0 24 24" v-html="IKON.info"/>{{ k.tavsiya }}
            </p>
          </div>
        </div>
      </section>

      <!-- ═══ 6 OY ═══ -->
      <section class="hs-karta">
        <div class="hs-karta-hd">
          <span class="hs-karta-ic"><svg viewBox="0 0 24 24" v-html="IKON.grafik"/></span>
          <div class="hs-kt"><h2>So'nggi 6 oy</h2><p>Yalpi foyda va xarajatlar — chiziq sof foydani ko'rsatadi (0 dan past — zarar)</p></div>
        </div>
        <div class="hs-karta-b">
          <UstunGrafik :data="d.oylik" guruh="oy" :balandlik="250" :seriyalar="[
            { k: 'yalpi', nom: 'Yalpi foyda', rang: RANG.brand },
            { k: 'xarajat', nom: 'Xarajatlar', rang: RANG.brand3 },
            { k: 'sof_foyda', nom: 'Sof foyda', rang: RANG.ok, tur: 'chiziq' },
          ]"/>
        </div>
      </section>
    </template>
  </HisobotSahifa>
</template>

<style scoped>
.bz-xulosa { display:flex; align-items:center; gap:22px; padding:18px 22px; border-radius:14px; background:var(--surface); border:1px solid var(--line); flex-wrap:wrap; }
.bz-xulosa--yaxshi { border-color:color-mix(in srgb, #059669 35%, var(--line)); background:linear-gradient(110deg, color-mix(in srgb, #059669 7%, var(--surface)), var(--surface) 60%); }
.bz-xulosa--orta { border-color:color-mix(in srgb, #d97706 35%, var(--line)); background:linear-gradient(110deg, color-mix(in srgb, #d97706 8%, var(--surface)), var(--surface) 60%); }
.bz-xulosa--xavf { border-color:color-mix(in srgb, #dc2626 35%, var(--line)); background:linear-gradient(110deg, color-mix(in srgb, #dc2626 7%, var(--surface)), var(--surface) 60%); }
.bz-gauge { position:relative; width:170px; flex-shrink:0; }
.bz-gauge svg { width:100%; display:block; }
.bz-gauge-v { position:absolute; left:0; right:0; bottom:2px; text-align:center; display:flex; align-items:baseline; justify-content:center; gap:3px; }
.bz-gauge-v b { font-size:34px; font-weight:700; letter-spacing:-.03em; font-variant-numeric:tabular-nums; }
.bz-gauge-v span { font-size:13px; color:var(--mut); }
.bz-xulosa-t { flex:1; min-width:260px; display:flex; flex-direction:column; gap:8px; }
.bz-holat { display:flex; align-items:center; gap:8px; font-size:18px; font-weight:650; }
.bz-holat svg { width:22px; height:22px; fill:none; stroke:currentColor; stroke-width:1.9; stroke-linecap:round; stroke-linejoin:round; }
.bz-xulosa--yaxshi .bz-holat { color:#059669; } .bz-xulosa--orta .bz-holat { color:#b45309; } .bz-xulosa--xavf .bz-holat { color:#dc2626; }
.bz-xulosa-t p { margin:0; font-size:14px; line-height:1.6; color:var(--ink2); }
.bz-xulosa-t p :deep(b) { color:var(--ink); font-weight:650; }
.bz-chip { display:flex; gap:6px; flex-wrap:wrap; }

.bz-sh { display:grid; grid-template-columns:minmax(150px, 1.1fr) 1fr auto; align-items:center; gap:12px; padding:8px 0; border-bottom:1px solid var(--line2); }
.bz-sh:last-child { border-bottom:none; }
.bz-sh-t { display:flex; flex-direction:column; min-width:0; }
.bz-sh-n { font-size:13px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.bz-sh-t small { font-size:11.5px; color:var(--sub); }
.bz-sh-bar { height:10px; border-radius:5px; background:var(--act); overflow:hidden; }
.bz-sh-bar i { display:block; height:100%; border-radius:5px; background:var(--brand-500); }
.bz-sh--minus .bz-sh-bar i { background:var(--brand-200); }
.bz-sh--plus .bz-sh-bar i { background:#34d399; }
.bz-sh--natija { background:var(--acc-soft); margin:2px -10px; padding:10px; border-radius:8px; border-bottom:none; }
.bz-sh--natija .bz-sh-n { font-weight:650; }
.bz-sh--natija .bz-sh-bar i { background:#059669; }
.bz-sh-v { font-size:13.5px; font-weight:650; font-variant-numeric:tabular-nums; min-width:110px; text-align:right; }
.bz-sh--minus .bz-sh-v { color:var(--mut); font-weight:500; }

.bz-tarkib { display:flex; height:14px; border-radius:7px; overflow:hidden; gap:2px; margin-bottom:10px; background:var(--act); }
.bz-tarkib i { display:block; }
.bz-q { display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid var(--line2); }
.bz-dot { width:10px; height:10px; border-radius:3px; flex-shrink:0; }
.bz-q-t { flex:1; min-width:0; display:flex; flex-direction:column; }
.bz-q-t b { font-size:13px; font-weight:500; }
.bz-q-t small { font-size:11.5px; color:var(--sub); }
.bz-q-v { font-size:13.5px; font-weight:600; font-variant-numeric:tabular-nums; }
.bz-q--jami .bz-q-t b, .bz-q--jami .bz-q-v { font-weight:700; }
.bz-q--minus .bz-q-v { color:#dc2626; }
.bz-sof { display:flex; align-items:baseline; justify-content:space-between; gap:10px; margin-top:12px; padding:14px 16px; border-radius:10px; background:var(--brand-600); color:#fff; }
.bz-sof span { font-size:13px; opacity:.9; }
.bz-sof b { font-size:22px; font-weight:700; letter-spacing:-.02em; font-variant-numeric:tabular-nums; }
.bz-sof small { font-size:12px; font-weight:500; opacity:.85; }

.bz-kor { display:grid; grid-template-columns:repeat(auto-fill, minmax(250px, 1fr)); gap:10px; }
.bz-k { display:flex; flex-direction:column; gap:6px; padding:14px; border-radius:11px; border:1px solid var(--line); background:var(--bg); }
.bz-k--xavf { border-color:color-mix(in srgb, #dc2626 40%, var(--line)); background:color-mix(in srgb, #dc2626 4%, var(--surface)); }
.bz-k--orta { border-color:color-mix(in srgb, #d97706 40%, var(--line)); background:color-mix(in srgb, #d97706 4%, var(--surface)); }
.bz-k-hd { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.bz-k-n { font-size:12.5px; color:var(--mut); font-weight:500; }
.bz-k-v { font-size:24px; font-weight:650; letter-spacing:-.02em; font-variant-numeric:tabular-nums; }
.bz-k-iz { margin:0; font-size:12px; color:var(--ink2); line-height:1.45; }
.bz-k-t { margin:2px 0 0; display:flex; gap:7px; font-size:12px; line-height:1.45; color:var(--ink); padding-top:8px; border-top:1px dashed var(--line); }
.bz-k-t svg { width:15px; height:15px; flex-shrink:0; margin-top:1px; fill:none; stroke:var(--acc); stroke-width:1.75; stroke-linecap:round; }
@media (max-width:760px) { .bz-sh { grid-template-columns:1fr auto; } .bz-sh-bar { grid-column:1 / -1; order:3; } .bz-gauge { width:140px; } }
</style>
