<script setup lang="ts">
/* Bitta mashina, bitta kun — jarayonning hamma qadami shu panelda.
   Bosqichga qarab faqat KEYINGI qadam ko'rsatiladi:
     · agent mobildan yuklash so'rasa — avval o'sha so'rov (tasdiqlash / rad etish)
     0 · ertalab: tavsiya bo'yicha yuklash (bir bosish)
     1–2 · kechqurun: qoldiqni qabul qilish + pulni qabul qilish (har biri bir bosish,
           farq bo'lsagina tafsilot so'raladi)
     3 · kun yopildi: natija va hisobot; kerak bo'lsa "Yangi reys" — kun qayta ochiladi,
         yana yuklash → savdo → topshirish (solishtirma butun kun bo'yicha jami) */
import { ref, reactive, computed, watch, onMounted } from 'vue'
import NumberInput from '@/components/NumberInput.vue'
// @ts-ignore
import { avtolavkaApi, hisobotApi, kassalarApi } from '@/api/api'
import { useQidiruv } from '@/composables/useQidiruv'

const props = defineProps<{ agentId: number; sana: string }>()
const emit = defineEmits<{ (e: 'yop'): void; (e: 'ozgardi'): void }>()

const BOSQICH = [
  { nom: 'Yuk berish kutilmoqda', rang: '#94a3b8' },
  { nom: 'Savdoda', rang: '#7c3aed' },
  { nom: 'Topshirmoqda', rang: '#d97706' },
  { nom: 'Kun yopildi', rang: '#059669' },
]
const bugun = () => new Date().toISOString().slice(0, 10)

const r = ref<any>(null)
const yuklanmoqda = ref(true)
const band = ref<'' | 'yuklash' | 'qabul' | 'pul' | 'sorov' | 'och'>('')
const xabar = ref<{ matn: string; tur: string } | null>(null)
const tab = ref<'hikoya' | 'tovar' | 'mijoz'>('hikoya')

/* Yuklash (ertalab) */
const tavsiya = ref<any>(null)
const yuk = reactive<Record<number, number>>({})
const qoshimcha = ref<any[]>([])
const qidiruv = ref('')
const natijalar = ref<any[]>([])

/* Agentning mobil ilovadan yuborgan yuklash so'rovi */
const sorov = ref<any>(null)
const sorovYuk = reactive<Record<number, number>>({})

/* Qabul (kechqurun) */
const qoldiq = ref<any>(null)
const sanaldi = reactive<Record<number, number>>({})
const brak = reactive<Record<number, number>>({})
const tovarTafsilot = ref(false)
const pulKiritildi = ref<number | null>(null)
const izoh = ref('')

const bugunmi = computed(() => props.sana === bugun())
const bosqich = computed(() => r.value?.bosqich ?? 0)
const kamomad = computed(() => r.value?.holat === 'kamomad')
const rang = computed(() => (kamomad.value ? '#dc2626' : BOSQICH[bosqich.value]?.rang || '#94a3b8'))
const holatNomi = computed(() => (kamomad.value ? 'Kamomad' : BOSQICH[bosqich.value]?.nom || ''))

/* Qayta ochilgan kun — bir kunda yangi reys */
const qaytaOchish = computed(() => r.value?.qayta_ochish || null)
// Qayta ochilgandan keyin hali yuklanmagan va mashina bo'sh — yuklash formasi (ertalabkidek)
const yangiReysYuklash = computed(() => {
  const x = r.value, q = qaytaOchish.value
  if (!x || !q || !bugunmi.value || bosqich.value >= 3 || x.kun_yopish || x.tovar.kun_oxiri.dona > 0.001) return false
  return !(x.voqealar || []).some((v: any) => v.tur === 'yuklash' && new Date(v.vaqt) > new Date(q.vaqt))
})
// Oldingi reysda topshirilgan naqd — inkassatsiya kun bo'yicha jami, yangi reysda faqat qolgani qabul qilinadi
const oldinTopshirilgan = computed(() => (qaytaOchish.value && r.value?.pul?.inkassatsiya ? Number(r.value.pul.topshirildi || 0) : 0))
async function qaytaOch() {
  if (!confirm(`${r.value.agent.fullname}ning bugungi kuni qayta ochilsinmi?\n\nYangi reys: agentga yana yuk beriladi, sotuvlar shu kunga qo'shiladi, kun oxirida tovar va naqd yana topshiriladi.`)) return
  band.value = 'och'
  try {
    await avtolavkaApi.kunQaytaOch({ agent_id: props.agentId })
    korsat("Kun qayta ochildi — yangi reys uchun agentga yuk bering (yoki agent ilovadan so'raydi)")
    await yangila(); emit('ozgardi')
  } catch (e: any) { korsat(e?.message || "Kunni qayta ochib bo'lmadi", 'xato') }
  finally { band.value = '' }
}
const tolish = computed(() => {
  const t = r.value?.tovar
  if (!t) return 0
  const sigim = t.kun_boshi.dona + t.berildi.dona + t.qaytarildi.dona
  return sigim > 0 ? t.kun_oxiri.dona / sigim : 0
})

const fmtDona = (v: number) => (Number(v) || 0).toLocaleString('ru-RU', { maximumFractionDigits: 3 })   // kg, 3 xona — yaxlitlanmaydi
const fmtSum = (v: number) => new Intl.NumberFormat('ru-RU').format(Math.round(Number(v) || 0))
const fmtMln = (v: number) => { const n = Number(v) || 0; return Math.abs(n) >= 1e6 ? `${(n / 1e6).toFixed(1).replace('.', ',')} mln` : fmtSum(n) }
const fmtVaqt = (s: string) => { const d = new Date(s); return isNaN(+d) ? '' : d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) }
const HAFTA = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba']
const OYLAR = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr']
const fmtSanaUzun = (s: string) => { const d = new Date(s + 'T00:00:00'); return isNaN(+d) ? s : `${d.getDate()}-${OYLAR[d.getMonth()]}, ${HAFTA[d.getDay()]}` }
function korsat(matn: string, tur = 'ok') { xabar.value = { matn, tur }; setTimeout(() => { xabar.value = null }, 4200) }

/* ── Yuklash ── */
const yukQatorlar = computed(() => [...(tavsiya.value?.qatorlar || []), ...qoshimcha.value])
const yukJami = computed(() => yukQatorlar.value.reduce((s: any, q: any) => {
  const d = Number(yuk[q.tovar_id] || 0)
  return { dona: s.dona + d, summa: s.summa + d * Number(q.narx || 0), xil: s.xil + (d > 0 ? 1 : 0) }
}, { dona: 0, summa: 0, xil: 0 }))
function yukQadam(q: any, yon: number) {
  const bs = Number(q.blokdagi_soni) || 1
  const v = Math.max(0, Math.min(Number(q.omborda) || 0, Number(yuk[q.tovar_id] || 0) + yon * bs))
  yuk[q.tovar_id] = Math.floor(v / bs) * bs || (yon > 0 ? Math.min(bs, Number(q.omborda) || 0) : 0)
}
function tavsiyaniQoy() { (tavsiya.value?.qatorlar || []).forEach((q: any) => { yuk[q.tovar_id] = q.tavsiya }) }
// Tovar qo'shish (autocomplete) — bo'sh matnda ro'yxat yopiladi
const qidiruvQd = useQidiruv<any[]>({
  matn: qidiruv,
  yukla: s => (s ? avtolavkaApi.tovarlar({ search: s }) : Promise.resolve([])),
  qolla: r => { natijalar.value = (r || []).slice(0, 8) },
  xato: e => { natijalar.value = []; korsat(e?.message || 'Qidiruv xatosi', 'xato') },
})
function qosh(t: any) {
  if (!yukQatorlar.value.find((q: any) => q.tovar_id === t.id)) {
    const bs = Number(t.blokdagi_soni) || 1
    qoshimcha.value.push({ tovar_id: t.id, tovar_nomi: t.nomi, turkum: t.turkum, blokdagi_soni: bs,
      ortacha: 0, mashinada: 0, omborda: Number(t.qoldiq) || 0, narx: Number(t.chakana_narx) || 0, tavsiya: 0 })
    yuk[t.id] = Math.min(bs * 2, Number(t.qoldiq) || 0)
  }
  qidiruv.value = ''; natijalar.value = []
}
async function yukla() {
  const qatorlar = yukQatorlar.value
    .filter((q: any) => Number(yuk[q.tovar_id]) > 0)
    .map((q: any) => ({ tovar_id: q.tovar_id, dona: Number(yuk[q.tovar_id]), narx: q.narx }))
  if (!qatorlar.length) return korsat('Yuk berish uchun kamida bitta tovar tanlang', 'xato')
  band.value = 'yuklash'
  try {
    const h = await avtolavkaApi.yuklashCreate({ agent_id: props.agentId, sana: props.sana, tasdiqla: true, izoh: yangiReysYuklash.value ? 'Yangi reys yuklashi' : 'Ertalabki yuklash', qatorlar })
    korsat(`${h.raqam}: ${fmtDona(h.jami_dona)} kg agentga berildi — agent yo'lga chiqishi mumkin`)
    await yangila(); emit('ozgardi')
  } catch (e: any) { korsat(e?.message || 'Yuklashda xato', 'xato') }
  finally { band.value = '' }
}

/* ── Agent so'rovi ── */
const sorovJami = computed(() => (sorov.value?.qatorlar || []).reduce((s: any, q: any) => {
  const d = Number(sorovYuk[q.tovar_id] || 0)
  return { dona: s.dona + d, summa: s.summa + d * Number(q.narx || 0), xil: s.xil + (d > 0 ? 1 : 0) }
}, { dona: 0, summa: 0, xil: 0 }))
function sorovQadam(q: any, yon: number) {
  sorovYuk[q.tovar_id] = Math.max(0, Number(sorovYuk[q.tovar_id] || 0) + yon)
}
async function sorovTasdiqla() {
  const s = sorov.value
  const qatorlar = (s?.qatorlar || [])
    .filter((q: any) => Number(sorovYuk[q.tovar_id]) > 0)
    .map((q: any) => ({ tovar_id: q.tovar_id, dona: Number(sorovYuk[q.tovar_id]), narx: q.narx }))
  if (!qatorlar.length) return korsat('Kamida bitta tovar miqdori noldan katta bo\'lishi kerak', 'xato')
  band.value = 'sorov'
  try {
    // Omborchi miqdorni o'zgartirgan bo'lsa — avval so'rov yangilanadi
    const ozgardi = s.qatorlar.some((q: any) => Number(sorovYuk[q.tovar_id] || 0) !== Number(q.dona))
    if (ozgardi) await avtolavkaApi.yuklashUpdate(s.id, { qatorlar })
    const h = await avtolavkaApi.yuklashTasdiqla(s.id)
    korsat(`${h.raqam}: ${fmtDona(h.jami_dona)} kg agentga o'tdi — agent darhol sota oladi`)
    await yangila(); emit('ozgardi')
  } catch (e: any) { korsat(e?.message || 'Tasdiqlashda xato', 'xato') }
  finally { band.value = '' }
}
async function sorovRad() {
  const sabab = prompt("Rad etish sababi (agent ilovada ko'radi):", '')
  if (sabab === null) return
  band.value = 'sorov'
  try {
    await avtolavkaApi.yuklashRad(sorov.value.id, { sabab })
    korsat(`${sorov.value.raqam}: so'rov rad etildi`, 'ogoh')
    await yangila(); emit('ozgardi')
  } catch (e: any) { korsat(e?.message || 'Rad etishda xato', 'xato') }
  finally { band.value = '' }
}

/* Agent mobilda kunni yopgan: o'zi sanagan naqd va tizim kutgani */
const kunYopish = computed(() => r.value?.kun_yopish || null)
const elonFarq = computed(() => {
  const k = kunYopish.value
  if (!k || k.naqd_elon === null || k.naqd_elon === undefined) return null
  return Number(k.naqd_elon) - pulKerak.value
})
const fmtMasofa = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${m} m`)

/* ── Qabul ── */
const qabulQatorlar = computed(() => qoldiq.value?.tovarlar || [])
const qabulFarq = (t: any) => Math.max(0, Number(t.qoldiq) - Number(sanaldi[t.tovar_id] ?? t.qoldiq) - Number(brak[t.tovar_id] || 0))
const qabulJami = computed(() => qabulQatorlar.value.reduce((s: any, t: any) => ({
  kutilgan: s.kutilgan + Number(t.qoldiq),
  sanaldi: s.sanaldi + Number(sanaldi[t.tovar_id] ?? t.qoldiq),
  brak: s.brak + Number(brak[t.tovar_id] || 0),
  farq: s.farq + qabulFarq(t),
  farqSumma: s.farqSumma + qabulFarq(t) * Number(t.narx || 0),
}), { kutilgan: 0, sanaldi: 0, brak: 0, farq: 0, farqSumma: 0 }))
function sanaldiQadam(t: any, yon: number) {
  const v = Number(sanaldi[t.tovar_id] ?? t.qoldiq) + yon
  sanaldi[t.tovar_id] = Math.max(0, Math.min(Number(t.qoldiq) - Number(brak[t.tovar_id] || 0), v))
}
function brakQadam(t: any, yon: number) {
  const v = Math.max(0, Number(brak[t.tovar_id] || 0) + yon)
  brak[t.tovar_id] = Math.min(v, Number(t.qoldiq))
  if (Number(sanaldi[t.tovar_id] ?? t.qoldiq) + brak[t.tovar_id]! > Number(t.qoldiq)) sanaldi[t.tovar_id] = Number(t.qoldiq) - brak[t.tovar_id]!
}
async function qabulQil() {
  if (qabulJami.value.farq > 0 && !confirm(`${fmtDona(qabulJami.value.farq)} kg (${fmtSum(qabulJami.value.farqSumma)} so'm) yetishmayapti. Farq agent zimmasida qoladi. Davom etasizmi?`)) return
  band.value = 'qabul'
  try {
    const h = await avtolavkaApi.qabulCreate({
      agent_id: props.agentId, sana: props.sana, izoh: izoh.value || null,
      qatorlar: qabulQatorlar.value.map((t: any) => ({ tovar_id: t.tovar_id, qabul_dona: Number(sanaldi[t.tovar_id] ?? t.qoldiq), brak_dona: Number(brak[t.tovar_id] || 0) })),
    })
    korsat(h._bosh ? `${h.raqam}: agentda tovar qolmagan — qabul qilindi, kun yopildi` : h._farq?.farq_bor ? `${h.raqam}: qabul qilindi, ${fmtDona(h.farq_dona)} kg farq agentda qoldi` : `${h.raqam}: qoldiq to'liq skladga qaytdi`, h._farq?.farq_bor ? 'ogoh' : 'ok')
    izoh.value = ''; tovarTafsilot.value = false
    await yangila(); emit('ozgardi')
  } catch (e: any) { korsat(e?.message || 'Qabulda xato', 'xato') }
  finally { band.value = '' }
}

/* Agent hali yo'lda bo'lsa — topshirishdan oldin ogohlantirish */
const yoldaEslatma = computed(() => {
  if (!bugunmi.value || bosqich.value !== 1 || kunYopish.value) return ''
  const v = r.value?.voqealar || []
  const oxirgi = v[v.length - 1]
  if (!oxirgi) return ''
  if (oxirgi.tur === 'mijozda') return `hozir ${oxirgi.mijoz}da`
  const soat = new Date().getHours()
  return soat < 16 ? `oxirgi harakat ${fmtVaqt(oxirgi.vaqt)}${oxirgi.mijoz ? ', ' + oxirgi.mijoz : ''}` : ''
})

/* ── Pul ── */
// Agent qo'lidagi naqd (butun davr, topshiruvlar ayirilgan) — /kassalar/agentlar; ruxsat bo'lmasa null
const agentQolda = ref<number | null>(null)
function qoldaYukla() { kassalarApi.agentlar().then((a: any) => { const x = (Array.isArray(a) ? a : []).find((y: any) => y.id === props.agentId); agentQolda.value = x ? Number(x.pul?.qolda) : null }).catch(() => { agentQolda.value = null }) }
watch(() => props.agentId, qoldaYukla, { immediate: true })
const pulKerak = computed(() => Math.max(0, Number(r.value?.pul?.naqd_olindi || 0) - oldinTopshirilgan.value))
const pulFarq = computed(() => pulKerak.value - Number(pulKiritildi.value ?? pulKerak.value))
async function pulQabul() {
  const summa = Number(pulKiritildi.value ?? pulKerak.value)
  if (pulFarq.value > 0.5 && !confirm(`${fmtSum(pulFarq.value)} so'm kamomad qayd etiladi. Davom etasizmi?`)) return
  band.value = 'pul'
  try {
    // Inkassatsiya yozuvi kun bo'yicha bitta — jami topshirilgan (oldingi reys + hozirgi) yoziladi
    await hisobotApi.inkassatsiyaTopshir({ agent_id: props.agentId, sana: props.sana, topshirilgan_summa: oldinTopshirilgan.value + summa, izoh: pulFarq.value > 0.5 ? 'Van Sell: kamomad bilan qabul' : 'Van Sell: to\'liq' })
    korsat(pulFarq.value > 0.5 ? `Kassaga ${fmtSum(summa)} so'm qabul qilindi, kamomad ${fmtSum(pulFarq.value)}` : `Kassaga ${fmtSum(summa)} so'm to'liq qabul qilindi`, pulFarq.value > 0.5 ? 'ogoh' : 'ok')
    pulKiritildi.value = null
    await yangila(); emit('ozgardi')
  } catch (e: any) { korsat(e?.message || 'Pulni qabul qilishda xato', 'xato') }
  finally { band.value = '' }
}

/* ── Oqimlar (tovar va pul qayerga ketdi) ── */
const tovarOqim = computed(() => {
  const t = r.value?.tovar; if (!t) return { jami: 0, qismlar: [] as any[] }
  const jami = t.kun_boshi.dona + t.berildi.dona + t.qaytarildi.dona
  const topsh = r.value.topshirish.tovar
  const qismlar = [
    { k: 'sotildi', nom: 'Sotildi', v: t.sotildi.dona, c: '#059669' },
    { k: 'skladga', nom: 'Skladga qaytdi', v: t.topshirildi.dona, c: 'var(--ink2)' },
    { k: 'brak', nom: 'Brak', v: t.brak.dona, c: '#d97706' },
    topsh ? { k: 'farq', nom: 'Farq — agentda', v: Math.max(0, t.farq.dona), c: '#dc2626' }
          : { k: 'mashina', nom: 'Hali agentda', v: t.kun_oxiri.dona, c: '#94a3b8' },
  ].filter(q => q.v > 0.001)
  return { jami, qismlar }
})
const pulOqim = computed(() => {
  const p = r.value?.pul; if (!p) return { jami: 0, qismlar: [] as any[] }
  const jami = p.naqd_olindi
  const qismlar = p.inkassatsiya
    ? [{ k: 'kassa', nom: 'Kassaga topshirildi', v: Math.min(p.topshirildi, jami), c: '#059669' },
       // Yangi reysda topshirilmagan naqd hali agent qo'lida — kamomad faqat pul topshirilgach
       r.value.topshirish.pul
         ? { k: 'kamomad', nom: 'Kamomad', v: Math.max(0, p.farq), c: '#dc2626' }
         : { k: 'agentda', nom: "Agent qo'lida", v: Math.max(0, p.farq), c: '#d97706' }]
    : [{ k: 'agentda', nom: "Agent qo'lida", v: jami, c: '#d97706' }]
  return { jami, qismlar: qismlar.filter(q => q.v > 0.5) }
})

/* ── Kun hikoyasi ── */
const VOQEA_RANG: Record<string, string> = {
  yuklash: 'var(--ink2)', sotuv: '#059669', sotmaslik: '#94a3b8', mijozda: '#7c3aed', tolov: '#d97706', qabul: 'var(--ink2)', kassa: 'var(--ink2)',
  sorov: '#7c3aed', agent_qabul: '#059669', kun_yopish: '#d97706', kun_ochildi: '#7c3aed',
}
const SOROV_HOLAT: Record<string, string> = { qoralama: 'omborchida', tasdiqlangan: 'tasdiqlandi', bekor: 'bekor' }
function voqeaMatn(v: any) {
  switch (v.tur) {
    case 'yuklash': return { t: `Yuk berildi · ${v.raqam}`, s: `${fmtDona(v.dona)} kg · ${fmtMln(v.summa)} so'm` }
    case 'sotuv': return { t: v.mijoz, s: `${v.naqd ? 'Naqd' : 'Qarzga'} sotuv · ${fmtDona(v.dona)} kg · ${fmtSum(v.summa)} so'm${v.uzoq ? ` · mijoz nuqtasidan ${fmtMasofa(v.masofa)} uzoqda` : ''}` }
    case 'sorov': return { t: `Agent so'rovi · ${v.raqam}`, s: `${fmtDona(v.dona)} kg · ${fmtMln(v.summa)} so'm · ${SOROV_HOLAT[v.holat] || v.holat}${v.sabab ? ' — ' + v.sabab : ''}` }
    case 'agent_qabul': return { t: 'Agent yukni qabul qildi', s: `${v.raqam} · ${fmtDona(v.dona)} kg — ilovada tasdiqladi` }
    case 'kun_yopish': return { t: 'Agent kunni yopdi', s: v.naqd !== null && v.naqd !== undefined ? `O'zi sanagan naqd: ${fmtSum(v.naqd)} so'm · topshirishga keldi` : 'Topshirishga keldi' }
    case 'sotmaslik': return { t: v.mijoz, s: `Savdo bo'lmadi${v.sabab ? ' — ' + v.sabab : ''}` }
    case 'mijozda': return { t: v.mijoz, s: 'Agent hozir shu mijozda' }
    case 'tolov': return { t: v.mijoz, s: `Qarz to'lovi · ${fmtSum(v.summa)} so'm naqd` }
    case 'qabul': return { t: `Qoldiq skladga · ${v.raqam}`, s: `${fmtDona(v.dona)} kg${v.brak ? ` · brak ${fmtDona(v.brak)}` : ''}${v.farq ? ` · farq ${fmtDona(v.farq)}` : ' · farqsiz'}` }
    case 'kun_ochildi': return { t: 'Kun qayta ochildi', s: `${(v.soni || 1) + 1}-reys — yana yuk berish, savdo va topshirish` }
    case 'kassa': return { t: 'Pul kassaga', s: `${fmtSum(v.summa)} so'm${v.kutilgan - v.summa > 0.5 ? ` · kamomad ${fmtSum(v.kutilgan - v.summa)}` : ' · to\'liq'}` }
  }
  return { t: v.tur, s: '' }
}

/* ── Bosqich yo'li ── */
const stansiyalar = computed(() => {
  const x = r.value; if (!x) return []
  const y = x.voqealar || []
  const vaqtOf = (tur: string) => { const v = [...y].reverse().find((e: any) => e.tur === tur); return v ? fmtVaqt(v.vaqt) : '' }
  const birinchiSotuv = y.find((e: any) => e.tur === 'sotuv')
  return [
    { nom: 'Yuk berish', izoh: yuklashIzoh(x, vaqtOf('yuklash')), tayyor: x.tovar.berildi.dona > 0 },
    { nom: 'Savdo', izoh: (x.kun.tashrif ? `${x.kun.tashrif} tashrif · ${x.kun.savdo} savdo` : (birinchiSotuv ? fmtVaqt(birinchiSotuv.vaqt) : '—'))
        + (x.kun.uzoq_sotuv ? ` · ${x.kun.uzoq_sotuv} uzoqdan` : ''), tayyor: x.bosqich >= 2 || (x.bosqich === 1 && x.tovar.sotildi.dona > 0) },
    { nom: 'Qoldiqni qaytarish', izoh: x.topshirish.tovar ? 'tovar qabul qilindi ✓' : 'ixtiyoriy', tayyor: x.topshirish.tovar },
    { nom: kamomad.value ? 'Kamomad' : 'Yopiq', izoh: x.bosqich === 3 ? (kamomad.value ? 'qaror kerak' : 'farqsiz') : '', tayyor: x.bosqich === 3 },
  ]
})

/* Yuklash bekati izohi: vaqt, agent so'rovi va agent qabul qilgani */
function yuklashIzoh(x: any, vaqt: string) {
  if (x.sorovlar?.length) return "agent so'radi"
  if (!x.tovar.berildi.dona) return 'kutilmoqda'
  const aq = x.kun.agent_qabul
  if (!aq?.yuklash) return vaqt
  return `${vaqt} · ${aq.qabul >= aq.yuklash ? 'agent ilovada ko\'rdi ✓' : 'berildi'}`
}

/* ── Yuklash ma'lumotlari ── */
async function yangila() {
  yuklanmoqda.value = true
  try {
    r.value = await avtolavkaApi.solishtirma({ agent_id: props.agentId, sana: props.sana })
    tavsiya.value = null; qoldiq.value = null; sorov.value = null
    if (bugunmi.value && r.value.sorovlar?.length) {
      sorov.value = await avtolavkaApi.hujjat(r.value.sorovlar[0].id)
      Object.keys(sorovYuk).forEach(k => delete sorovYuk[Number(k)])
      ;(sorov.value?.qatorlar || []).forEach((q: any) => { sorovYuk[q.tovar_id] = Number(q.dona) })
    }
    if (bugunmi.value && (r.value.bosqich === 0 || yangiReysYuklash.value) && !sorov.value) {
      tavsiya.value = await avtolavkaApi.tavsiya({ agent_id: props.agentId })
      qoshimcha.value = []
      Object.keys(yuk).forEach(k => delete yuk[Number(k)])
      tavsiyaniQoy()
    }
    if (bugunmi.value && (r.value.bosqich === 1 || r.value.bosqich === 2) && !r.value.topshirish.tovar) {
      qoldiq.value = await avtolavkaApi.qoldiq(props.agentId)
      Object.keys(sanaldi).forEach(k => delete sanaldi[Number(k)])
      Object.keys(brak).forEach(k => delete brak[Number(k)])
    }
  } catch (e: any) { korsat(e?.message || 'Yuklashda xato', 'xato') }
  finally { yuklanmoqda.value = false }
}
watch(() => [props.agentId, props.sana], yangila)
onMounted(yangila)
</script>

<template>
  <div class="kp" :style="{ '--holat': rang }">
    <div v-if="yuklanmoqda && !r" class="kp-load"><span class="kp-spin"/> Yuklanmoqda…</div>

    <template v-else-if="r">
      <!-- ═══ BOSH QISM ═══ -->
      <header class="kp-hd">
        <div class="kp-hd-n">
          <div class="kp-hd-top">
            <span v-if="r.agent.mashina_raqam" class="kp-plate">{{ r.agent.mashina_raqam }}</span>
            <span class="kp-st-b"><i/>{{ holatNomi }}</span>
            <span v-if="qaytaOchish" class="kp-cap">{{ qaytaOchish.soni + 1 }}-reys</span>
            <span v-if="bosqich === 1 || bosqich === 2" class="kp-cap">agentda {{ Math.round(tolish * 100) }}% yuk</span>
          </div>
          <h2 class="kp-name">{{ r.agent.fullname }}</h2>
          <div class="kp-date">{{ fmtSanaUzun(sana) }}<template v-if="bugunmi"> · bugun</template>
            · <router-link class="kp-hl" :to="{ path: '/avtolavka/sotuvlar', query: { dan: sana, gacha: sana, agent: String(agentId) } }">Kun cheklari →</router-link>
            · <router-link class="kp-hl" :to="`/hisobot/xodim?agent=${agentId}`">Xodim hisoboti →</router-link></div>
        </div>
        <button class="kp-x" title="Yopish (Esc)" @click="emit('yop')">
          <svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </header>

      <!-- ═══ BOSQICH YO'LI ═══ -->
      <div class="kp-track">
        <div class="kp-road"><div class="kp-road-on" :style="{ width: `${Math.min(100, bosqich / 3 * 100)}%` }"/></div>
        <div v-for="(s, i) in stansiyalar" :key="s.nom" class="kp-st" :class="{ on: i === bosqich, ok: s.tayyor }">
          <span class="kp-st-dot">{{ s.tayyor ? '✓' : i + 1 }}</span>
          <span class="kp-st-nom">{{ s.nom }}</span>
          <span class="kp-st-iz">{{ s.izoh }}</span>
        </div>
      </div>

      <!-- ═══ AGENT SO'ROVI (mobil ilovadan) ═══ -->
      <section v-if="bugunmi && sorov" class="kp-act kp-act--sorov">
        <div class="kp-act-hd">
          <div>
            <div class="kp-act-k"><span class="kp-act-ic"><svg class="kp-bi" viewBox="0 0 24 24"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></svg></span>Agent so'rovi · mobil ilovadan</div>
            <h3 class="kp-act-t">{{ sorov.raqam }} — agentga yuk berish</h3>
            <p class="kp-act-s">{{ fmtVaqt(sorov.createdAt) }} da yuborilgan<template v-if="sorov.izoh"> · «{{ sorov.izoh }}»</template>.
              Miqdorni o'zgartirish mumkin. Tasdiqlansa tovar asosiy ombordan agent hisobiga o'tadi va u darhol sota oladi. Agent ilovada qabul qilganini tasdiqlaydi.</p>
          </div>
          <div class="kp-act-big"><b>{{ fmtDona(sorovJami.dona) }}</b><span>kg · {{ sorovJami.xil }} xil</span><span>{{ fmtMln(sorovJami.summa) }} so'm</span></div>
        </div>
        <div class="kp-rows">
          <div v-for="q in sorov.qatorlar" :key="q.tovar_id" class="kp-row" :class="{ nol: !Number(sorovYuk[q.tovar_id]) }">
            <div class="kp-row-n">
              <b>{{ q.tovar_nomi }}</b>
              <span>agent so'radi {{ fmtDona(q.dona) }}<template v-if="Number(sorovYuk[q.tovar_id] || 0) !== Number(q.dona)"> → beriladi {{ fmtDona(sorovYuk[q.tovar_id] || 0) }}</template></span>
            </div>
            <div class="kp-step">
              <button @click="sorovQadam(q, -1)" :disabled="!Number(sorovYuk[q.tovar_id])">−</button>
              <input type="number" min="0" v-model.number="sorovYuk[q.tovar_id]"/>
              <button @click="sorovQadam(q, 1)">+</button>
            </div>
            <div class="kp-row-s">{{ fmtSum(Number(sorovYuk[q.tovar_id] || 0) * q.narx) }}</div>
          </div>
        </div>
        <div class="kp-act-ft">
          <button class="kp-ghost kp-ghost--rad" :disabled="band === 'sorov'" @click="sorovRad">Rad etish</button>
          <button class="kp-go" :disabled="band === 'sorov' || !sorovJami.dona" @click="sorovTasdiqla">
            <span v-if="band === 'sorov'" class="kp-spin kp-spin--w"/><svg class="kp-bi" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>
            Tasdiqlash va yuk berish
          </button>
        </div>
      </section>

      <!-- ═══ KEYINGI QADAM ═══ -->
      <section v-if="bugunmi && !sorov && (bosqich === 0 || yangiReysYuklash)" class="kp-act">
        <div class="kp-act-hd">
          <div>
            <div class="kp-act-k"><span class="kp-act-ic"><svg class="kp-bi" viewBox="0 0 24 24"><path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg></span>Keyingi qadam</div>
            <h3 class="kp-act-t">{{ yangiReysYuklash ? 'Yangi reys: yuk berish' : 'Ertalabki yuk berish' }}</h3>
            <p class="kp-act-s" v-if="yangiReysYuklash">Kun {{ fmtVaqt(qaytaOchish.vaqt) }} da qayta ochildi. Agentga yuk bering yoki agent ilovadan so'rasin.
              Chiqish bekor bo'lsa — <button class="kp-link" :disabled="band === 'qabul'" @click="qabulQil">kunni yana yopish</button>.</p>
            <p class="kp-act-s" v-if="tavsiya?.manba === 'ortacha'">Tavsiya: oxirgi {{ tavsiya.ish_kunlari }} ish kunidagi o'rtacha sotuv + 20% zaxira − agentdagi qoldiq, blokka yaxlitlangan</p>
            <p class="kp-act-s" v-else-if="tavsiya?.manba === 'oxirgi'">Sotuv tarixi yo'q — oxirgi berilgan yuk ({{ tavsiya.oxirgi?.raqam }}) asosida</p>
            <p class="kp-act-s" v-else>Tarix yo'q — tovarlarni qidirib qo'shing</p>
          </div>
          <div class="kp-act-big"><b>{{ fmtDona(yukJami.dona) }}</b><span>kg · {{ yukJami.xil }} xil</span><span>{{ fmtMln(yukJami.summa) }} so'm</span></div>
        </div>

        <div class="kp-rows">
          <div v-for="q in yukQatorlar" :key="q.tovar_id" class="kp-row" :class="{ nol: !Number(yuk[q.tovar_id]) }">
            <div class="kp-row-n">
              <b>{{ q.tovar_nomi }}</b>
              <span>{{ q.ortacha ? `kuniga ~${fmtDona(q.ortacha)}` : 'qo\'shimcha' }}<template v-if="q.mashinada"> · agentda {{ fmtDona(q.mashinada) }}</template> · omborda {{ fmtDona(q.omborda) }}</span>
            </div>
            <div class="kp-step">
              <button @click="yukQadam(q, -1)" :disabled="!Number(yuk[q.tovar_id])">−</button>
              <input type="number" min="0" :max="q.omborda" v-model.number="yuk[q.tovar_id]"/>
              <button @click="yukQadam(q, 1)" :disabled="Number(yuk[q.tovar_id]) >= q.omborda">+</button>
            </div>
            <div class="kp-row-s">{{ fmtSum(Number(yuk[q.tovar_id] || 0) * q.narx) }}</div>
          </div>
          <div v-if="!yukQatorlar.length" class="kp-bos">Tavsiya bo'sh — pastdan tovar qo'shing</div>
        </div>

        <div class="kp-search">
          <input v-model="qidiruv" maxlength="100" placeholder="Tovar qo'shish — nomini yozing" @keydown.enter="qidiruvQd.darhol()"/>
          <div v-if="natijalar.length" class="kp-dd">
            <button v-for="t in natijalar" :key="t.id" @click="qosh(t)"><b>{{ t.nomi }}</b><span>omborda {{ fmtDona(t.qoldiq) }} · {{ fmtSum(t.chakana_narx) }} so'm</span></button>
          </div>
        </div>

        <div class="kp-act-ft">
          <button class="kp-ghost" @click="tavsiyaniQoy">Tavsiyaga qaytarish</button>
          <button class="kp-go" :disabled="band === 'yuklash' || !yukJami.dona" @click="yukla">
            <span v-if="band === 'yuklash'" class="kp-spin kp-spin--w"/><svg class="kp-bi" viewBox="0 0 24 24"><path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>
            Yuk berish va tasdiqlash
          </button>
        </div>
      </section>

      <section v-else-if="bugunmi && (bosqich === 1 || bosqich === 2)" class="kp-act">
        <div class="kp-act-hd">
          <div>
            <div class="kp-act-k"><span class="kp-act-ic"><svg class="kp-bi" viewBox="0 0 24 24"><path d="M3 13h5l2 3h4l2-3h5M5.5 5h13L21 13v6H3v-6z"/></svg></span>Keyingi qadam</div>
            <h3 class="kp-act-t">Kun oxiri: topshirish</h3>
            <p class="kp-act-s">Tizim kutayotgan son tayyor. Hammasi mos kelsa — bir bosish. Farq bo'lsa, faqat o'sha qatorni o'zgartiring.</p>
          </div>
        </div>

        <div v-if="kunYopish" class="kp-note kp-note--keldi">
          <svg class="kp-note-ic" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          <span>Agent {{ fmtVaqt(kunYopish.vaqt) }} da ilovada kunni yopdi — topshirishga keldi.<template v-if="kunYopish.izoh"> «{{ kunYopish.izoh }}»</template></span>
        </div>
        <div v-if="yoldaEslatma" class="kp-note">
          <svg class="kp-note-ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
          <span>Agent hali yo'lda — {{ yoldaEslatma }}. Topshirish odatda agent qaytgach, kun oxirida qilinadi.</span>
        </div>

        <div class="kp-two">
          <!-- TOVAR -->
          <div class="kp-half" :class="{ done: r.topshirish.tovar }">
            <div class="kp-half-k">Tovar → sklad</div>
            <template v-if="r.topshirish.tovar">
              <div class="kp-done">Qabul qilindi</div>
              <div class="kp-half-s">{{ fmtDona(r.tovar.topshirildi.dona) }} kg skladda<template v-if="r.tovar.farq.dona > 0"> · farq {{ fmtDona(r.tovar.farq.dona) }}</template></div>
            </template>
            <template v-else>
              <div class="kp-half-v">{{ fmtDona(qabulJami.kutilgan) }} <small>kg</small></div>
              <!-- Mashina bo'sh (hammasi sotilgan) bo'lsa ham qabul qilinadi — shu hujjat kunni yopadi -->
              <div class="kp-half-s">{{ qabulQatorlar.length ? `agentda bo'lishi kerak · ${qabulQatorlar.length} xil` : "agentda tovar qolmagan — hammasi sotilgan, qabul kunni yopadi" }}</div>
              <button v-if="!tovarTafsilot" class="kp-go kp-go--w" :disabled="band === 'qabul'" @click="qabulQil">
                <span v-if="band === 'qabul'" class="kp-spin kp-spin--w"/><svg class="kp-bi" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>{{ qabulQatorlar.length ? 'Hammasi joyida — qabul qilish' : "Qoldiqsiz qabul qilish" }}
              </button>
              <button v-if="qabulQatorlar.length" class="kp-link" @click="tovarTafsilot = !tovarTafsilot">{{ tovarTafsilot ? 'Yig\'ish' : 'Farq bor — sanab kiritish' }}</button>
            </template>
          </div>
          <!-- PUL -->
          <div class="kp-half" :class="{ done: r.topshirish.pul }">
            <div class="kp-half-k">Naqd → kassa</div>
            <template v-if="r.topshirish.pul">
              <div class="kp-done">Kassaga topshirildi</div>
              <div class="kp-half-s">{{ r.pul.inkassatsiya ? fmtSum(r.pul.topshirildi) + ' so\'m' : 'naqd yig\'ilmagan' }}<template v-if="r.pul.farq > 0.5"> · kamomad {{ fmtSum(r.pul.farq) }}</template></div>
            </template>
            <template v-else>
              <!-- Naqd pul endi shu yerda qabul qilinmaydi: agent ilovadan topshiradi (naqd yoki karta), kassir Moliya → Topshiruvlarda tasdiqlaydi -->
              <div class="kp-half-v" :class="{ 'kp-half-v--m': !((agentQolda ?? 0) > 0) }" :style="(agentQolda ?? 0) < 0 ? 'color:#dc2626' : ''">{{ fmtSum(agentQolda ?? pulKerak) }} <small>so'm</small></div>
              <div class="kp-half-s">{{ agentQolda != null ? "agent qo'lida · jami, topshirganlari ayirilgan" : `bugun yig'ilgan naqd · ${r.pul.tolov_soni} ta tushum` }}</div>
              <div class="kp-half-s">Agent pulni ilovadan topshiradi (naqd yoki karta) — tasdiqlash Topshiruvlar sahifasida.</div>
              <RouterLink :to="{ path: '/moliya/topshiruvlar' }" class="kp-go kp-go--w" style="text-decoration:none;justify-content:center">Topshiruvlarga o'tish</RouterLink>
            </template>
          </div>
        </div>

        <!-- Sanab kiritish: faqat farq bo'lsa -->
        <div v-if="tovarTafsilot && !r.topshirish.tovar" class="kp-count">
          <div class="kp-count-hd"><span>Tovar</span><span>Kutilgan</span><span>Sanaldi</span><span>Brak</span><span>Farq</span></div>
          <div v-for="t in qabulQatorlar" :key="t.tovar_id" class="kp-count-r" :class="{ farq: qabulFarq(t) > 0 }">
            <span class="kp-count-n">{{ t.tovar_nomi }}</span>
            <span class="kp-count-k">{{ fmtDona(t.qoldiq) }}</span>
            <span class="kp-step kp-step--s"><button @click="sanaldiQadam(t, -1)">−</button><input type="number" min="0" :max="t.qoldiq" :value="sanaldi[t.tovar_id] ?? t.qoldiq" @input="sanaldi[t.tovar_id] = Math.max(0, Math.min(t.qoldiq, Number(($event.target as HTMLInputElement).value)))"/><button @click="sanaldiQadam(t, 1)">+</button></span>
            <span class="kp-step kp-step--s kp-step--b"><button @click="brakQadam(t, -1)">−</button><input type="number" min="0" :value="brak[t.tovar_id] || 0" readonly/><button @click="brakQadam(t, 1)">+</button></span>
            <span class="kp-count-f">{{ qabulFarq(t) > 0 ? '−' + fmtDona(qabulFarq(t)) : '✓' }}</span>
          </div>
          <div class="kp-count-ft">
            <input v-model="izoh" class="kp-izoh" placeholder="Izoh: farq sababi, kim sanadi…"/>
            <span v-if="qabulJami.farq > 0" class="kp-count-sum">Farq {{ fmtDona(qabulJami.farq) }} kg · {{ fmtSum(qabulJami.farqSumma) }} so'm</span>
            <button class="kp-go" :disabled="band === 'qabul'" @click="qabulQil"><span v-if="band === 'qabul'" class="kp-spin kp-spin--w"/>Qabul qilish</button>
          </div>
        </div>
      </section>

      <section v-else-if="bosqich === 3" class="kp-verdict" :class="{ bad: kamomad }">
        <svg class="kp-verdict-ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path v-if="kamomad" d="M12 8v5m0 3h.01"/><path v-else d="m8.5 12.5 2.5 2.5 5-5.5"/></svg>
        <div>
          <div class="kp-verdict-t">{{ kamomad ? 'Kun kamomad bilan yopildi' : 'Kun yopildi — hammasi joyida' }}</div>
          <div class="kp-verdict-s">
            <template v-if="kamomad">
              <span v-if="r.tovar.farq.dona > 0">Tovar: {{ fmtDona(r.tovar.farq.dona) }} kg agentda qoldi. </span>
              <span v-if="r.pul.farq > 0.5">Pul: {{ fmtSum(r.pul.farq) }} so'm topshirilmadi. </span>
              Farq agent hisobiga yoziladi.
            </template>
            <template v-else>Berilgan tovar va yig'ilgan naqd to'liq qaytdi.</template>
          </div>
          <button v-if="bugunmi" class="kp-ghost kp-reys" :disabled="band === 'och'" @click="qaytaOch">
            <span v-if="band === 'och'" class="kp-spin"/>Yangi reys — kunni qayta ochish
          </button>
        </div>
      </section>

      <section v-else-if="!bugunmi && bosqich < 3" class="kp-verdict warn">
        <svg class="kp-verdict-ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
        <div>
          <div class="kp-verdict-t">{{ bosqich === 0 ? 'Bu kuni agent yuk olmagan' : 'Kun yopilmagan' }}</div>
          <div class="kp-verdict-s" v-if="bosqich > 0">{{ !r.topshirish.tovar ? 'Qoldiq skladga topshirilmagan. ' : '' }}{{ !r.topshirish.pul ? 'Naqd kassaga topshirilmagan.' : '' }}</div>
        </div>
      </section>

      <!-- ═══ OQIMLAR ═══ -->
      <section v-if="bosqich > 0" class="kp-flows">
        <div class="kp-flow">
          <div class="kp-flow-hd"><span>Tovar qayerga ketdi</span><b>{{ fmtDona(tovarOqim.jami) }} kg</b></div>
          <div class="kp-bar">
            <i v-for="q in tovarOqim.qismlar" :key="q.k" :style="{ flex: q.v, background: q.c }" :title="`${q.nom}: ${fmtDona(q.v)}`"/>
          </div>
          <div class="kp-leg"><span v-for="q in tovarOqim.qismlar" :key="q.k"><i :style="{ background: q.c }"/>{{ q.nom }} <b>{{ fmtDona(q.v) }}</b></span></div>
        </div>
        <div class="kp-flow">
          <div class="kp-flow-hd"><span>Naqd qayerda</span><b>{{ fmtSum(pulOqim.jami) }} so'm</b></div>
          <div class="kp-bar">
            <i v-for="q in pulOqim.qismlar" :key="q.k" :style="{ flex: q.v, background: q.c }"/>
            <i v-if="!pulOqim.qismlar.length" style="flex:1" class="bosh"/>
          </div>
          <div class="kp-leg">
            <span v-for="q in pulOqim.qismlar" :key="q.k"><i :style="{ background: q.c }"/>{{ q.nom }} <b>{{ fmtSum(q.v) }}</b></span>
            <span class="kp-leg-q">Qarzga sotildi <b>{{ fmtSum(r.pul.qarzga_sotuv) }}</b></span>
          </div>
        </div>
      </section>

      <!-- ═══ TAFSILOT ═══ -->
      <nav v-if="bosqich > 0" class="kp-tabs">
        <button :class="{ on: tab === 'hikoya' }" @click="tab = 'hikoya'">Kun hikoyasi <i>{{ r.voqealar.length }}</i></button>
        <button :class="{ on: tab === 'tovar' }" @click="tab = 'tovar'">Tovarlar <i>{{ r.tovarlar.length }}</i></button>
        <button :class="{ on: tab === 'mijoz' }" @click="tab = 'mijoz'">Mijozlar <i>{{ r.mijozlar.length }}</i></button>
      </nav>

      <ol v-if="bosqich > 0 && tab === 'hikoya'" class="kp-story">
        <li v-for="(v, i) in r.voqealar" :key="i" :class="[v.tur, { uzoq: v.uzoq }]">
          <time>{{ fmtVaqt(v.vaqt) }}</time>
          <span class="kp-story-ic" :style="{ background: VOQEA_RANG[v.tur] || '#94a3b8' }"/>
          <div><b>{{ voqeaMatn(v).t }}</b><span>{{ voqeaMatn(v).s }}</span></div>
        </li>
      </ol>

      <div v-else-if="bosqich > 0 && tab === 'tovar'" class="kp-tbl">
        <table>
          <thead><tr><th>Tovar</th><th>Boshi</th><th>Berildi</th><th>Sotildi</th><th>Qaytdi</th><th>Skladga</th><th>Brak</th><th>Agentda</th></tr></thead>
          <tbody>
            <tr v-for="t in r.tovarlar" :key="t.tovar_id" :class="{ farq: r.topshirish.tovar && t.farq > 0.001 }">
              <td><b>{{ t.tovar_nomi }}</b></td><td class="m">{{ t.kun_boshi ? fmtDona(t.kun_boshi) : '' }}</td><td>{{ fmtDona(t.berildi) }}</td><td>{{ fmtDona(t.sotildi) }}</td>
              <td>{{ t.qaytdi ? fmtDona(t.qaytdi) : '' }}</td><td>{{ t.topshirildi ? fmtDona(t.topshirildi) : '' }}</td><td>{{ t.brak ? fmtDona(t.brak) : '' }}</td>
              <td><b>{{ t.farq ? fmtDona(t.farq) : '0' }}</b></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else-if="bosqich > 0 && tab === 'mijoz'" class="kp-tbl">
        <table>
          <thead><tr><th>Mijoz</th><th>Sotuv</th><th>Naqd olindi</th><th>Qarz o'zgarishi</th></tr></thead>
          <tbody>
            <tr v-for="m in r.mijozlar" :key="m.mijoz_id">
              <td><b>{{ m.mijoz_nomi }}</b></td><td>{{ fmtSum(m.sotuv) }}</td><td>{{ fmtSum(m.naqd) }}</td>
              <td :class="m.qarz_ozgarishi > 0 ? 'up' : m.qarz_ozgarishi < 0 ? 'down' : ''">{{ m.qarz_ozgarishi > 0 ? '+' : '' }}{{ fmtSum(m.qarz_ozgarishi) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <Transition name="kp-fade"><div v-if="xabar" class="kp-toast" :class="xabar.tur">{{ xabar.matn }}</div></Transition>
  </div>
</template>

<style scoped>
/* Ranglar qobiq (MainLayout) tokenlaridan; --holat — kun holati rangi */
.kp { display:flex; flex-direction:column; gap:20px; padding:22px 24px 40px; color:var(--ink); background:var(--surface); min-height:100%; }
.kp-load { padding:60px; text-align:center; color:var(--mut); font-size:13px; }
.kp-spin { width:14px; height:14px; border:2px solid var(--line); border-top-color:var(--acc); border-radius:50%; display:inline-block; animation:kp-rot .8s linear infinite; vertical-align:-2px; margin-right:6px; }
.kp-spin--w { border-color:rgba(255,255,255,.35); border-top-color:#fff; width:12px; height:12px; }
@keyframes kp-rot { to { transform:rotate(360deg) } }

/* sarlavha */
.kp-hd { display:flex; align-items:flex-start; gap:16px; padding-bottom:18px; border-bottom:1px solid var(--line); }
.kp-hd-n { flex:1; min-width:0; }
.kp-hd-top { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
.kp-plate { font:600 11.5px/1 ui-monospace, 'SF Mono', Menlo, monospace; letter-spacing:.06em; padding:4px 6px; border:1px solid var(--line); border-radius:4px; color:var(--ink2); }
.kp-st-b { display:inline-flex; align-items:center; gap:6px; font-size:12.5px; color:var(--ink2); }
.kp-st-b i { width:7px; height:7px; border-radius:50%; background:var(--holat); }
.kp-cap { font-size:12px; color:var(--mut); }
.kp-name { font-size:20px; font-weight:600; letter-spacing:-.015em; margin:10px 0 2px; }
.kp-date { font-size:13px; color:var(--mut); }
.kp-hl { color:var(--acc, #7c3aed); font-weight:600; text-decoration:none; }
.kp-hl:hover { text-decoration:underline; }
.kp-x { width:32px; height:32px; flex-shrink:0; border-radius:8px; border:1px solid var(--line); background:var(--surface); color:var(--mut); cursor:pointer; display:flex; align-items:center; justify-content:center; }
.kp-x:hover { background:var(--hov); color:var(--ink); }
.kp-x svg { width:16px; height:16px; fill:none; stroke:currentColor; stroke-width:1.75; stroke-linecap:round; }

/* bosqichlar */
.kp-track { position:relative; display:grid; grid-template-columns:repeat(4,1fr); }
.kp-road { position:absolute; left:12.5%; right:12.5%; top:11px; height:2px; background:var(--line); }
.kp-road-on { height:100%; background:var(--acc); transition:width .4s; }
.kp-st { position:relative; display:flex; flex-direction:column; align-items:center; gap:3px; text-align:center; }
.kp-st-dot { width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11.5px; font-weight:600; background:var(--surface); border:1.5px solid var(--line); color:var(--sub); margin-bottom:4px; }
.kp-st.ok .kp-st-dot { background:var(--acc); border-color:var(--acc); color:#fff; }
.kp-st.on .kp-st-dot { border-color:var(--acc); color:var(--acc); box-shadow:0 0 0 3px color-mix(in srgb, var(--acc) 15%, transparent); }
.kp-st-nom { font-size:12.5px; font-weight:500; color:var(--ink); }
.kp-st:not(.ok):not(.on) .kp-st-nom { color:var(--mut); }
.kp-st-iz { font-size:11.5px; color:var(--sub); min-height:14px; }

/* keyingi qadam */
.kp-act { border:1px solid color-mix(in srgb, var(--acc) 30%, var(--line)); border-radius:12px; padding:18px; background:linear-gradient(180deg, var(--acc-soft), var(--surface) 120px); display:flex; flex-direction:column; gap:14px; }
.kp-act-hd { display:flex; gap:16px; align-items:flex-start; }
.kp-act-hd > div:first-child { flex:1; }
.kp-act-k { display:flex; align-items:center; gap:8px; font-size:12px; font-weight:600; color:var(--acc); }
.kp-act-ic { width:26px; height:26px; border-radius:7px; background:var(--acc-soft); display:flex; align-items:center; justify-content:center; }
.kp-act-ic .kp-bi { width:15px; height:15px; margin:0; }
.kp-bi { width:16px; height:16px; flex-shrink:0; margin-right:7px; fill:none; stroke:currentColor; stroke-width:1.9; stroke-linecap:round; stroke-linejoin:round; }
.kp-act-t { font-size:16px; font-weight:600; margin:2px 0 4px; }
.kp-act-s { font-size:12.5px; color:var(--mut); margin:0; line-height:1.5; }
.kp-act-big { text-align:right; display:flex; flex-direction:column; }
.kp-act-big b { font-size:24px; font-weight:600; letter-spacing:-.02em; line-height:1.1; font-variant-numeric:tabular-nums; }
.kp-act-big span { font-size:12px; color:var(--mut); }
.kp-rows { display:flex; flex-direction:column; max-height:340px; overflow:auto; border:1px solid var(--line); border-radius:8px; }
.kp-row { display:grid; grid-template-columns:1fr auto 104px; align-items:center; gap:12px; padding:8px 12px; }
.kp-row + .kp-row { border-top:1px solid var(--line); }
.kp-row.nol .kp-row-n, .kp-row.nol .kp-row-s { opacity:.5; }
.kp-row-n { display:flex; flex-direction:column; min-width:0; }
.kp-row-n b { font-size:13px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.kp-row-n span { font-size:11.5px; color:var(--mut); }
.kp-row-s { text-align:right; font-size:12.5px; color:var(--ink2); font-variant-numeric:tabular-nums; }
.kp-step { display:inline-flex; align-items:center; border:1px solid var(--line); border-radius:6px; overflow:hidden; background:var(--surface); }
.kp-step button { width:28px; height:30px; border:none; background:none; color:var(--mut); font-size:15px; cursor:pointer; }
.kp-step button:hover:not(:disabled) { background:var(--hov); color:var(--ink); }
.kp-step button:disabled { opacity:.3; cursor:default; }
.kp-step input { width:56px; height:30px; border:none; border-left:1px solid var(--line); border-right:1px solid var(--line); text-align:center; font-family:inherit; font-size:13px; font-weight:500; color:var(--ink); background:transparent; font-variant-numeric:tabular-nums; -moz-appearance:textfield; }
.kp-step input::-webkit-inner-spin-button { display:none; }
.kp-step--s button { width:22px; height:26px; font-size:13px; }
.kp-step--s input { width:42px; height:26px; font-size:12.5px; }
.kp-step--b input { color:#b45309; }
.kp-bos { padding:16px; text-align:center; color:var(--mut); font-size:12.5px; }
.kp-search { position:relative; }
.kp-search input { width:100%; height:36px; border:1px solid var(--line); border-radius:8px; padding:0 12px; background:var(--surface); color:var(--ink); font-family:inherit; font-size:13px; }
.kp-search input:focus { outline:none; border-color:var(--acc); box-shadow:0 0 0 3px color-mix(in srgb, var(--acc) 15%, transparent); }
.kp-search input::placeholder { color:var(--sub); }
.kp-dd { position:absolute; left:0; right:0; top:40px; z-index:5; background:var(--surface); border:1px solid var(--line); border-radius:8px; box-shadow:0 12px 32px rgba(0,0,0,.12); overflow:hidden; padding:4px; }
.kp-dd button { display:flex; flex-direction:column; align-items:flex-start; width:100%; padding:7px 10px; border:none; border-radius:6px; background:none; color:var(--ink); cursor:pointer; text-align:left; font-family:inherit; font-size:13px; }
.kp-dd button b { font-weight:500; }
.kp-dd button:hover { background:var(--hov); }
.kp-dd span { font-size:11.5px; color:var(--mut); }
.kp-act-ft { display:flex; justify-content:space-between; gap:10px; }
.kp-ghost { height:36px; padding:0 14px; border:1px solid var(--line); border-radius:8px; background:var(--surface); color:var(--ink); font-family:inherit; font-weight:500; font-size:13px; cursor:pointer; }
.kp-ghost:hover { background:var(--hov); }
.kp-ghost--rad { color:#dc2626; }
.kp-ghost--rad:hover:not(:disabled) { background:color-mix(in srgb, #dc2626 8%, transparent); border-color:color-mix(in srgb, #dc2626 35%, var(--line)); }
.kp-act--sorov { border-color:color-mix(in srgb, #7c3aed 40%, var(--line)); background:linear-gradient(180deg, color-mix(in srgb, #7c3aed 7%, var(--surface)), var(--surface) 120px); }
.kp-act--sorov .kp-act-k { color:#7c3aed; }
.kp-act--sorov .kp-act-ic { background:color-mix(in srgb, #7c3aed 12%, transparent); }
.kp-go { height:38px; padding:0 16px; border:1px solid var(--brand); border-radius:9px; background:var(--brand); color:#fff; box-shadow:0 4px 12px -4px rgba(124,58,237,.5); font-family:inherit; font-weight:500; font-size:13px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:background .12s; }
.kp-go:hover:not(:disabled) { background:var(--brand-hover); }
.kp-go:disabled { opacity:.45; cursor:not-allowed; }
.kp-go--w { width:100%; }
.kp-link { align-self:flex-start; border:none; background:none; color:var(--mut); font-family:inherit; font-size:12.5px; text-decoration:underline; text-underline-offset:3px; cursor:pointer; padding:2px 0; }
.kp-link:hover { color:var(--ink); }

.kp-two { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.kp-half { background:var(--surface); border:1px solid var(--line); border-radius:8px; padding:14px; display:flex; flex-direction:column; gap:8px; }
.kp-half-k { font-size:12px; color:var(--mut); }
.kp-half-v { font-size:22px; font-weight:600; letter-spacing:-.02em; font-variant-numeric:tabular-nums; line-height:1.15; }
.kp-half-v small { font-size:12.5px; color:var(--mut); font-weight:400; }
.kp-half-s { font-size:12px; color:var(--mut); line-height:1.45; }
.kp-done { display:flex; align-items:center; gap:8px; font-size:15px; font-weight:600; color:#059669; }
.kp-done::before { content:''; width:8px; height:8px; border-radius:50%; background:#059669; }
.kp-half-v--m { color:var(--mut); }
.kp-note { display:flex; gap:10px; align-items:center; padding:10px 12px; border-radius:8px; background:var(--hov); font-size:12.5px; color:var(--ink2); }
.kp-note-ic { width:16px; height:16px; flex-shrink:0; fill:none; stroke:var(--mut); stroke-width:1.75; stroke-linecap:round; stroke-linejoin:round; }
.kp-note--keldi { background:color-mix(in srgb, #d97706 10%, var(--surface)); color:var(--ink); }
.kp-note--keldi .kp-note-ic { stroke:#d97706; }
.kp-elon b { color:var(--ink); font-weight:600; font-variant-numeric:tabular-nums; }
.kp-elon.farq { color:#b45309; }
.kp-money { display:flex; align-items:center; gap:8px; }
.kp-money input { flex:1; height:36px; border:1px solid var(--line); border-radius:8px; padding:0 12px; font-family:inherit; font-size:14px; font-weight:500; color:var(--ink); background:var(--surface); font-variant-numeric:tabular-nums; }
.kp-money input:focus { outline:none; border-color:var(--acc); box-shadow:0 0 0 3px color-mix(in srgb, var(--acc) 15%, transparent); }
.kp-money-f { font-weight:600; color:#dc2626; font-size:13px; font-variant-numeric:tabular-nums; }

.kp-count { border:1px solid var(--line); border-radius:8px; overflow:hidden; }
.kp-count-hd, .kp-count-r { display:grid; grid-template-columns:1fr 64px 116px 96px 52px; align-items:center; gap:8px; padding:7px 12px; }
.kp-count-hd { font-size:11.5px; font-weight:500; color:var(--mut); background:var(--bg); }
.kp-count-r { border-top:1px solid var(--line); font-size:12.5px; }
.kp-count-r.farq { background:color-mix(in srgb, #dc2626 6%, transparent); }
.kp-count-n { font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.kp-count-k { font-variant-numeric:tabular-nums; color:var(--mut); text-align:right; }
.kp-count-f { text-align:right; font-weight:600; color:#dc2626; font-variant-numeric:tabular-nums; }
.kp-count-r:not(.farq) .kp-count-f { color:#059669; }
.kp-count-ft { display:flex; align-items:center; gap:10px; padding:10px 12px; border-top:1px solid var(--line); background:var(--bg); }
.kp-izoh { flex:1; height:34px; border:1px solid var(--line); border-radius:8px; padding:0 12px; background:var(--surface); color:var(--ink); font-family:inherit; font-size:12.5px; }
.kp-count-sum { font-size:12.5px; font-weight:500; color:#dc2626; white-space:nowrap; }

.kp-verdict { display:flex; gap:12px; align-items:flex-start; padding:14px 16px; border-radius:8px; border:1px solid var(--line); background:var(--surface); }
.kp-verdict-ic { width:20px; height:20px; flex-shrink:0; margin-top:1px; fill:none; stroke:#059669; stroke-width:1.75; stroke-linecap:round; stroke-linejoin:round; }
.kp-verdict.bad { border-color:color-mix(in srgb, #dc2626 35%, var(--line)); background:color-mix(in srgb, #dc2626 4%, var(--surface)); }
.kp-verdict.bad .kp-verdict-ic { stroke:#dc2626; }
.kp-verdict.warn .kp-verdict-ic { stroke:var(--mut); }
.kp-reys { margin-top:10px; display:inline-flex; align-items:center; gap:6px; }
.kp-verdict-t { font-weight:600; font-size:14px; }
.kp-verdict-s { font-size:12.5px; color:var(--mut); margin-top:2px; line-height:1.45; }

/* oqimlar */
.kp-flows { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
.kp-flow { display:flex; flex-direction:column; gap:8px; }
.kp-flow-hd { display:flex; justify-content:space-between; font-size:12.5px; color:var(--mut); }
.kp-flow-hd b { color:var(--ink); font-weight:600; font-variant-numeric:tabular-nums; }
.kp-bar { display:flex; height:8px; border-radius:4px; overflow:hidden; gap:2px; background:var(--act); }
.kp-bar i { display:block; min-width:3px; }
.kp-bar i.bosh { background:var(--act); }
.kp-leg { display:flex; flex-wrap:wrap; gap:4px 14px; font-size:12px; color:var(--mut); }
.kp-leg span { display:inline-flex; align-items:center; gap:6px; }
.kp-leg i { width:8px; height:8px; border-radius:2px; display:inline-block; }
.kp-leg b { color:var(--ink); font-weight:500; font-variant-numeric:tabular-nums; }
.kp-leg-q { padding-left:12px; border-left:1px solid var(--line); }

/* tablar va kun hikoyasi */
.kp-tabs { display:flex; gap:4px; border-bottom:1px solid var(--line); }
.kp-tabs button { border:none; background:none; padding:9px 10px; font-family:inherit; font-weight:500; font-size:13px; color:var(--seg-ink); cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-1px; transition:color .15s; }
.kp-tabs button:hover { color:var(--seg-ink-h); }
.kp-tabs button.on { color:var(--tab-on-ink); border-bottom-color:var(--tab-line); font-weight:600; }
.kp-tabs i { font-style:normal; font-size:11.5px; color:var(--sub); margin-left:4px; font-variant-numeric:tabular-nums; }
.kp-story { list-style:none; margin:0; padding:0; position:relative; }
.kp-story::before { content:''; position:absolute; left:63px; top:12px; bottom:12px; width:1px; background:var(--line); }
.kp-story li { display:grid; grid-template-columns:44px 20px 1fr; gap:0 10px; align-items:start; padding:6px 0; position:relative; }
.kp-story time { font-size:12px; line-height:20px; color:var(--mut); text-align:right; font-variant-numeric:tabular-nums; }
.kp-story-ic { width:9px; height:9px; border-radius:50%; margin:6px 0 0 5.5px; box-shadow:0 0 0 3px var(--surface); z-index:1; }
.kp-story li > div { display:flex; flex-direction:column; }
.kp-story b { font-size:13px; font-weight:500; line-height:20px; }
.kp-story li > div span { font-size:12px; color:var(--mut); }
.kp-story li.yuklash b, .kp-story li.qabul b, .kp-story li.kassa b { font-weight:600; }
.kp-story li.sotmaslik b { color:var(--mut); font-weight:400; }
.kp-story li.uzoq > div span { color:#b45309; }
.kp-story li.uzoq .kp-story-ic { box-shadow:0 0 0 3px var(--surface), 0 0 0 5px color-mix(in srgb, #d97706 45%, transparent); }

.kp-tbl { overflow-x:auto; border:1px solid var(--line); border-radius:8px; }
.kp-tbl table { width:100%; border-collapse:collapse; font-size:12.5px; }
.kp-tbl th { font-size:11.5px; font-weight:500; color:var(--mut); text-align:right; padding:8px 10px; background:var(--bg); white-space:nowrap; }
.kp-tbl th:first-child, .kp-tbl td:first-child { text-align:left; }
.kp-tbl td { padding:7px 10px; border-top:1px solid var(--line); text-align:right; font-variant-numeric:tabular-nums; }
.kp-tbl td b { font-weight:500; }
.kp-tbl td.m { color:var(--mut); }
.kp-tbl tr.farq td { background:color-mix(in srgb, #dc2626 6%, transparent); }
.kp-tbl td.up { color:#dc2626; font-weight:500; }
.kp-tbl td.down { color:#059669; font-weight:500; }

.kp-toast { position:fixed; bottom:24px; right:24px; z-index:90; max-width:420px; padding:11px 14px; border-radius:8px; background:var(--ink); color:var(--surface); font-size:13px; font-weight:500; box-shadow:0 12px 32px rgba(0,0,0,.22); }
.kp-toast.xato { background:#dc2626; color:#fff; }
.kp-toast.ogoh { background:#b45309; color:#fff; }
.kp-fade-enter-active, .kp-fade-leave-active { transition:opacity .2s, transform .2s; }
.kp-fade-enter-from, .kp-fade-leave-to { opacity:0; transform:translateY(6px); }

@media (max-width:700px) {
  .kp { padding:16px; }
  .kp-two, .kp-flows { grid-template-columns:1fr; }
  .kp-count-hd, .kp-count-r { grid-template-columns:1fr 50px 100px 88px 40px; gap:4px; }
}
</style>
