<script setup lang="ts">
/* ASOSIY QOBIQ — bitta brend rangi (indigo, main.css --brand-*) atrofida.
   Chapda to'q indigo sidebar: bo'limlar biznes jarayoni tartibida guruhlangan,
   ichki sahifalar o'z ikonlari bilan akkordeonda. Raqamlar /navbat dan keladigan
   haqiqiy "bajarilishi kerak" sonlari. Yuqorida — sahifa ikoni va nomi,
   qidiruv (⌘K), vazifalar, bildirishnomalar, profil (mavzu shu yerda). */
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authStore } from '@/stores/auth'
import { rejimStore } from '@/stores/rejim'
import { notifStore } from '@/stores/notif'
// @ts-ignore
import { arizaApi, api } from '@/api/api'
import { MODULLAR, sahifaMos, type Modul, type Sahifa, type Buyruq } from './nav'
import CommandPalette from './CommandPalette.vue'

const route  = useRoute()
const router = useRouter()

/* ── Holat ──────────────────────────────────────────────── */
const oqi = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
const yoz = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* yashirin rejim */ } }

const dark      = ref(oqi('sellz_theme') === 'dark')
const yigiq     = ref(oqi('sellz_nav_yigiq') === '1')
const mobil     = ref(false)
const cpOchiq   = ref(false)
const notifOpen = ref(false)
const ishOpen   = ref(false)
const userOpen  = ref(false)
const navbat    = ref<any>({})
const ochiq     = reactive<Record<string, boolean>>({})

watch(dark, v => {
  document.documentElement.setAttribute('data-theme', v ? 'dark' : 'light')
  yoz('sellz_theme', v ? 'dark' : 'light')
}, { immediate: true })
watch(yigiq, v => yoz('sellz_nav_yigiq', v ? '1' : '0'))

/* Kichik ekranda menyu — chiqib keluvchi panel, u yerda "yig'ilgan" holat ishlamaydi */
const torMq = window.matchMedia('(max-width: 900px)')
const tor   = ref(torMq.matches)
const torYangila = (e: MediaQueryListEvent) => { tor.value = e.matches }
const yig   = computed(() => yigiq.value && !tor.value)

const noSidebar   = computed(() => route.name === 'PrixodForm')
const optom       = rejimStore.isOptom
const currentUser = authStore.user
function logout() { authStore.logout(); router.replace('/login') }
const initsial = (name: string) => name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

/* ── Navigatsiya ────────────────────────────────────────── */
const modullar = computed<Modul[]>(() => MODULLAR
  .filter(m => rejimStore.mos(m.faqat) && authStore.canView(m.perm))
  .map(m => ({ ...m, sahifalar: m.sahifalar.filter(s => rejimStore.mos(s.faqat) && authStore.canView(s.perm || m.perm)) }))
  .filter(m => m.sahifalar.length))
const guruhlar = computed(() => [
  { nom: 'Asosiy',         items: modullar.value.filter(m => m.key === 'dashboard') },
  { nom: 'Savdo jarayoni', items: modullar.value.filter(m => m.zanjir) },
  { nom: 'Tahlil',         items: modullar.value.filter(m => !m.zanjir && !m.tizim && m.key !== 'dashboard') },
  { nom: 'Tizim',          items: modullar.value.filter(m => m.tizim) },
].filter(g => g.items.length))

const joriy = computed<{ m: Modul | null; s: Sahifa | null }>(() => {
  let eng = { m: null as Modul | null, s: null as Sahifa | null, ball: -1 }
  for (const m of modullar.value) for (const s of m.sahifalar) {
    const b = sahifaMos(s, route.path)
    if (b > eng.ball) eng = { m, s, ball: b }
  }
  return { m: eng.m, s: eng.s }
})
const bitta = (m: Modul) => m.sahifalar.length === 1
const joriyIkon = computed(() => joriy.value.s?.ikon || joriy.value.m?.ikon || '')
watch(() => joriy.value.m?.key, k => { if (k) ochiq[k] = true }, { immediate: true })

function modulBos(m: Modul) {
  if (bitta(m) || yig.value) { router.push(m.sahifalar[0]!.yol); mobil.value = false; return }
  ochiq[m.key] = !ochiq[m.key]
}
watch(() => route.fullPath, () => { mobil.value = false; userOpen.value = false; ishOpen.value = false })

/* ── Yig'ilgan menyu: modul ustiga kelganda ichki sahifalar suzuvchi panelda ── */
const fly = ref<{ m: Modul; top: number } | null>(null)
let flyT: ReturnType<typeof setTimeout> | null = null
function flyOch(m: Modul, e: Event) {
  if (!yig.value) return
  if (flyT) clearTimeout(flyT)
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const boy = 52 + (bitta(m) ? 0 : m.sahifalar.length * 32 + 10)   // panelning taxminiy balandligi
  fly.value = { m, top: Math.max(10, Math.min(r.top - 6, window.innerHeight - boy - 10)) }
}
function flyYop() { if (flyT) clearTimeout(flyT); flyT = setTimeout(() => (fly.value = null), 160) }
function flyQol() { if (flyT) clearTimeout(flyT) }
watch([yig, () => route.fullPath], () => { fly.value = null })

/* Faol sahifa menyuning pastida qolib ketmasin */
function faolniKorsat() {
  nextTick(() => document.querySelector('.sb .si.on, .sb .ni.on, .sb .ni.act')?.scrollIntoView({ block: 'nearest' }))
}

/* ── Haqiqiy sonlar (/navbat) ───────────────────────────── */
const qiymat = (k: string) => k.split('.').reduce((o: any, p) => (o == null ? undefined : o[p]), navbat.value) as number | undefined
const fmtSum = (v: number) => new Intl.NumberFormat('ru-RU').format(Math.round(Number(v) || 0))
const NAVBAT_MATN: Record<string, () => string> = {
  'sotuvlar.yangi':        () => 'Tasdiqlanmagan buyurtmalar',
  'ombor.yigish':          () => "Yig'ish navbatidagi buyurtmalar",
  'ombor.qaytarish':       () => 'Qabul kutayotgan qaytarishlar',
  'ombor.prixod':          () => 'Tasdiqlanmagan prixodlar',
  'avtolavka.yuklanmagan': () => 'Yuklanmagan mashinalar',
  'moliya.inkassatsiya':   () => `Topshirilmagan naqd · ${fmtSum(navbat.value?.moliya?.inkassatsiya_summa)} so'm`,
}
const ishlar = computed(() => {
  const r: { k: string; son: number; matn: string; yol: string; ikon: string; modul: string }[] = []
  for (const m of modullar.value) for (const s of m.sahifalar) {
    if (s.badge?.ton !== 'ish') continue
    const son = qiymat(s.badge.k) || 0
    if (son > 0) r.push({ k: s.badge.k, son, matn: NAVBAT_MATN[s.badge.k]?.() || s.nom, yol: s.yol, ikon: s.ikon, modul: m.nom })
  }
  return r
})
const ishJami = computed(() => ishlar.value.reduce((s, x) => s + x.son, 0))
const modulSon = (m: Modul) => m.sahifalar.reduce((s, x) => s + (x.badge?.ton === 'ish' ? (qiymat(x.badge.k) || 0) : 0), 0)
function sahifaSon(s: Sahifa) {
  if (!s.badge) return null
  const son = qiymat(s.badge.k)
  if (!son) return null
  if (s.badge.k === 'agentlar.online') return { matn: `${son}/${navbat.value?.agentlar?.jami ?? '–'}`, ish: false }
  return { matn: son > 999 ? '999+' : String(son), ish: s.badge.ton === 'ish' }
}

let navbatTaymer: ReturnType<typeof setInterval> | null = null
async function navbatYukla() { try { navbat.value = await api.get('/navbat') } catch { /* keyingi tsiklda */ } }
let navbatKechik: ReturnType<typeof setTimeout> | null = null
watch(() => route.fullPath, () => { if (navbatKechik) clearTimeout(navbatKechik); navbatKechik = setTimeout(navbatYukla, 1500) })

/* ── Oxirgi ochilganlar (⌘K uchun) ──────────────────────── */
const oxirgi = ref<string[]>((() => { try { return JSON.parse(oqi('sellz_oxirgi') || '[]') } catch { return [] } })())
watch(() => joriy.value.s?.yol, y => {
  if (!y) return
  oxirgi.value = [y, ...oxirgi.value.filter(x => x !== y)].slice(0, 6)
  yoz('sellz_oxirgi', JSON.stringify(oxirgi.value))
}, { immediate: true })

/* ── Buyruq oynasi ──────────────────────────────────────── */
const buyruqlar = computed<Buyruq[]>(() => {
  const r: Buyruq[] = []
  const topish = (y: string) => { for (const m of modullar.value) { const s = m.sahifalar.find(x => x.yol === y); if (s) return { m, s } } return null }
  oxirgi.value.filter(y => y !== joriy.value.s?.yol).slice(0, 4).forEach(y => {
    const t = topish(y); if (t) r.push({ id: 'o' + y, guruh: 'Oxirgi ochilganlar', nom: t.s.nom, izoh: t.m.nom, ikon: t.s.ikon, bajar: () => router.push(y) })
  })
  ishlar.value.forEach(x => r.push({ id: 'i' + x.k, guruh: 'Bajarilishi kerak', nom: x.matn, izoh: x.modul, ikon: x.ikon, son: x.son, bajar: () => router.push(x.yol) }))
  modullar.value.forEach(m => m.sahifalar.forEach(s => r.push({
    id: 'p' + s.yol, guruh: 'Sahifalar', nom: s.nom, izoh: `${m.nom} · ${s.izoh}`, ikon: s.ikon,
    kalit: `${m.nom} ${s.kalit || ''}`, bajar: () => router.push(s.yol),
  })))
  r.push(
    { id: 'a-tema', guruh: 'Amallar', nom: dark.value ? "Yorug' mavzu" : "Qorong'i mavzu", ikon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>', kalit: 'tema dark light rejim', bajar: () => { dark.value = !dark.value } },
    { id: 'a-nav', guruh: 'Amallar', nom: yigiq.value ? 'Menyuni kengaytirish' : "Menyuni yig'ish", ikon: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>', kalit: 'sidebar', bajar: () => { yigiq.value = !yigiq.value } },
    { id: 'a-chiq', guruh: 'Amallar', nom: 'Tizimdan chiqish', ikon: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5M5 12h11"/>', kalit: 'logout', bajar: logout },
  )
  return r
})

/* ── Bildirishnomalar ───────────────────────────────────── */
function onNotifClick(item: { id: number; havola: string | null; kalit?: string | null }) {
  notifStore.oqish(item.id)
  oqildiSaqla([item.kalit])
  notifOpen.value = false
  if (item.havola) router.push(item.havola)
}
const vTashqari = {
  mounted(el: any, b: any) { el.__t = (e: Event) => { if (!el.contains(e.target)) b.value() }; document.addEventListener('mousedown', el.__t) },
  unmounted(el: any) { document.removeEventListener('mousedown', el.__t) },
}
const vaqtOldin = (d: any) => {
  const daq = Math.round((Date.now() - new Date(d).getTime()) / 60000)
  return daq < 1 ? 'hozir' : daq < 60 ? `${daq} daq oldin` : daq < 1440 ? `${Math.floor(daq / 60)} soat oldin` : `${Math.floor(daq / 1440)} kun oldin`
}

/* ── Sessiya ────────────────────────────────────────────── */
const sessionToast = ref(false)
function handleSessionExpired() {
  if (sessionToast.value) return
  sessionToast.value = true
  authStore.logout()
  setTimeout(() => { sessionToast.value = false; router.replace('/login') }, 2800)
}

/* ── Yangi zakaz polling (har 15s) ──────────────────────── */
let zakazPollId: ReturnType<typeof setInterval> | null = null
let lastZakazId = 0
let zakazPollInited = false
async function pollYangiZakaz() {
  try {
    const data = await arizaApi.getAll({ holat: 'yangi', all: 'true' })
    const list = Array.isArray(data) ? data : (data.rows || [])
    if (!list.length) return
    const maxId = Math.max(...list.map((a: any) => Number(a.id) || 0))
    if (!zakazPollInited) { lastZakazId = maxId; zakazPollInited = true; return }
    list.filter((a: any) => Number(a.id) > lastZakazId)
      .sort((a: any, b: any) => Number(a.id) - Number(b.id))
      .forEach((a: any) => notifStore.yangiZakaz({
        arizaId: a.id, raqam: a.raqam, mijoz: a.mijoz_nomi || a.mijoz?.nomi, agent: a.agent_nomi || a.agent?.fullname,
        summa: a.jami_summa, manba: a.manba, sana: a.createdAt,
      }))
    lastZakazId = maxId
  } catch { /* keyingi tsiklda */ }
}

function tugma(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); cpOchiq.value = !cpOchiq.value }
  else if ((e.metaKey || e.ctrlKey) && e.key === '\\') { e.preventDefault(); yigiq.value = !yigiq.value }
  else if (e.key === 'Escape') { notifOpen.value = false; userOpen.value = false; ishOpen.value = false; mobil.value = false }
}

/* ── Server bildirishnomalari: avtolavka so'rovlari, yuk qabuli, kun yopilishi, reys yakuni (har 15 s) ── */
const NOTIF_IKON: Record<string, string> = {
  yuklash_sorov: '<path d="M12 3v12m0 0-4-4m4 4 4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
  yuk_qabul: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>',
  kun_yopildi: '<path d="M4 22V4a1 1 0 0 1 1-1h11l-1.5 4L16 11H5"/>',
  reys_yakunlandi: '<path d="M2 6h11v10H2z"/><path d="M13 9h4.2l3.8 4.2V16h-8"/><circle cx="6.5" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/>',
  zakaz: '<path d="M6 2.5h12v19l-3-2-3 2-3-2-3 2z"/><path d="M9 7.5h6M9 11.5h6M9 15.5h3.5"/>',
}
const notifIkon = (tur: string) => NOTIF_IKON[tur] || NOTIF_IKON.zakaz
const OQILGAN_KEY = 'sellz_bildirishnoma_oqilgan'
function oqilganlar(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(OQILGAN_KEY) || '[]')) } catch { return new Set() }
}
function oqildiSaqla(kalitlar: (string | null | undefined)[]) {
  const s = oqilganlar(); kalitlar.forEach(k => { if (k) s.add(k) })
  try { localStorage.setItem(OQILGAN_KEY, JSON.stringify([...s].slice(-300))) } catch { /* joy yo'q */ }
}
function hammasiOqildi() {
  oqildiSaqla(notifStore.state.items.map(i => i.kalit))
  notifStore.barchasiOqish()
}
let bildKursor: string | null = null
let bildPollId: ReturnType<typeof setInterval> | null = null
async function pollBildirishnoma() {
  try {
    const birinchi = bildKursor === null
    const d = await api.get(`/bildirishnoma${bildKursor ? `?keyin=${encodeURIComponent(bildKursor)}` : ''}`)
    bildKursor = d.serverVaqt
    const oq = oqilganlar()
    const yangilar: any[] = []
    ;(d.items || []).filter((x: any) => authStore.canView(x.modul)).reverse().forEach((x: any) => {
      const id = notifStore.add({
        tur: x.tur, sarlavha: x.sarlavha, matn: x.matn, havola: x.havola, rang: x.rang, sana: x.vaqt, kalit: x.kalit,
        // Sahifa ochilganda eski voqealar ovozsiz qo'shiladi; hal bo'lgan yoki o'qilganlari — o'qilgan
        jim: birinchi, oqilgan: birinchi && (x.hal || oq.has(x.kalit)),
      })
      if (id && !birinchi) yangilar.push(x)
    })
    if (yangilar.length) { sarlavhaMiltilla(yangilar.length); tizimBildirishnomasi(yangilar[yangilar.length - 1]) }
  } catch { /* keyingi tsiklda */ }
}
/* Tab fonda bo'lsa sarlavha miltillaydi — qaytganda to'xtaydi */
let miltillaId: ReturnType<typeof setInterval> | null = null
let aslSarlavha = ''
function sarlavhaMiltilla(n: number) {
  if (!document.hidden) return
  if (!miltillaId) aslSarlavha = document.title
  else clearInterval(miltillaId)
  let on = false
  miltillaId = setInterval(() => { on = !on; document.title = on ? `(${n}) Yangi bildirishnoma` : aslSarlavha }, 1000)
}
function miltillaToxtat() {
  if (!document.hidden && miltillaId) { clearInterval(miltillaId); miltillaId = null; document.title = aslSarlavha }
}
/* Operatsion tizim bildirishnomasi — faqat HTTPS'da ishlaydi (brauzer cheklovi) */
function tizimBildirishnomasi(x: any) {
  try {
    if (!('Notification' in window) || !window.isSecureContext || Notification.permission !== 'granted' || !document.hidden) return
    const n = new Notification(x.sarlavha, { body: x.matn, tag: x.kalit })
    n.onclick = () => { window.focus(); if (x.havola) router.push(x.havola); n.close() }
  } catch { /* qo'llab-quvvatlanmaydi */ }
}
function bildirishnomaRuxsati() {
  try { if ('Notification' in window && window.isSecureContext && Notification.permission === 'default') Notification.requestPermission() } catch { /* yo'q */ }
}
function popupOch(p: { id: number; havola: string | null }) {
  const it = notifStore.state.items.find(i => i.id === p.id)
  if (it) { notifStore.oqish(it.id); oqildiSaqla([it.kalit]) }
  notifStore.popupYop(p.id)
  if (p.havola) router.push(p.havola)
}

onMounted(() => {
  window.addEventListener('sellz:session-expired', handleSessionExpired)
  document.addEventListener('visibilitychange', miltillaToxtat)
  pollBildirishnoma(); bildPollId = setInterval(pollBildirishnoma, 15000)
  window.addEventListener('keydown', tugma)
  torMq.addEventListener('change', torYangila)
  faolniKorsat()
  navbatYukla()
  navbatTaymer = setInterval(navbatYukla, 60000)
  // Optomda agent buyurtmasi yo'q — sotuv shu zahoti yetkazilgan bo'ladi, kuzatadigan "yangi zakaz" yo'q
  if (!optom.value && authStore.canView('sotuvlar')) { pollYangiZakaz(); zakazPollId = setInterval(pollYangiZakaz, 15000) }
})
onUnmounted(() => {
  window.removeEventListener('sellz:session-expired', handleSessionExpired)
  window.removeEventListener('keydown', tugma)
  torMq.removeEventListener('change', torYangila)
  document.removeEventListener('visibilitychange', miltillaToxtat)
  ;[navbatTaymer, zakazPollId, bildPollId, miltillaId].forEach(t => { if (t) clearInterval(t) })
  if (flyT) clearTimeout(flyT)
})
</script>

<template>
  <div class="shell" :class="{ dark }">

    <!-- ══════════ SIDEBAR ══════════ -->
    <template v-if="!noSidebar">
      <transition name="sb-ov"><div v-if="mobil" class="sb-ov" @click="mobil = false"/></transition>
      <aside class="sb" :class="{ 'sb--yigiq': yig, 'sb--mobil': mobil }" aria-label="Asosiy menyu">
        <div class="sb-hd">
          <router-link to="/dashboard" class="brand" :aria-label="optom ? 'Sellz Optom — bosh sahifa' : 'Sellz Distributor — bosh sahifa'">
            <span class="brand-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.8 20 7.3v9.4l-8 4.5-8-4.5V7.3z"/><path d="m4.4 7.5 7.6 4.3 7.6-4.3M12 11.8v9.2"/></svg>
            </span>
            <span v-if="!yig" class="brand-t"><b>Sellz</b><small>{{ optom ? 'Optom' : 'Distributor' }}</small></span>
          </router-link>
          <button v-if="!yig" class="sb-ib sb-ib--hd" title="Menyuni yig'ish (Ctrl+\)" aria-label="Menyuni yig'ish" @click="yigiq = true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 10l-2 2 2 2"/></svg>
          </button>
          <button class="sb-ib sb-x" aria-label="Menyuni yopish" @click="mobil = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <nav class="sb-nav">
          <section v-for="g in guruhlar" :key="g.nom" class="sb-g">
            <div v-if="!yig" class="sb-gt">{{ g.nom }}</div>
            <div v-else class="sb-gl"/>

            <template v-for="m in g.items" :key="m.key">
              <!-- bitta sahifali modul -->
              <router-link v-if="bitta(m)" :to="m.sahifalar[0]!.yol" class="ni"
                :class="{ on: joriy.m?.key === m.key }" :aria-label="yig ? m.nom : undefined"
                @mouseenter="flyOch(m, $event)" @mouseleave="flyYop" @focus="flyOch(m, $event)" @blur="flyYop">
                <span class="ni-tl"><svg class="ni-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" v-html="m.ikon"/></span>
                <span v-if="!yig" class="ni-t">{{ m.nom }}</span>
                <span v-if="modulSon(m)" class="ni-n" :class="{ dot: yig }">{{ yig ? '' : modulSon(m) }}</span>
              </router-link>

              <!-- ichki sahifali modul -->
              <template v-else>
                <button class="ni" :class="{ act: joriy.m?.key === m.key, on: yig && joriy.m?.key === m.key }"
                  :aria-label="yig ? m.nom : undefined" :aria-expanded="yig ? undefined : !!ochiq[m.key]" @click="modulBos(m)"
                  @mouseenter="flyOch(m, $event)" @mouseleave="flyYop" @focus="flyOch(m, $event)" @blur="flyYop">
                  <span class="ni-tl"><svg class="ni-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" v-html="m.ikon"/></span>
                  <span v-if="!yig" class="ni-t">{{ m.nom }}</span>
                  <span v-if="modulSon(m) && (!ochiq[m.key] || yig)" class="ni-n" :class="{ dot: yig }">{{ yig ? '' : modulSon(m) }}</span>
                  <svg v-if="!yig" class="ni-ch" :class="{ up: ochiq[m.key] }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg>
                </button>
                <div v-if="!yig" class="sub" :class="{ open: ochiq[m.key] }">
                  <div class="sub-in" :inert="!ochiq[m.key] || undefined">
                    <div class="sub-l">
                      <router-link v-for="s in m.sahifalar" :key="s.yol" :to="s.yol" class="si" :class="{ on: joriy.s?.yol === s.yol }">
                        <span class="si-t">{{ s.nom }}</span>
                        <span v-if="sahifaSon(s)" class="si-n" :class="{ ish: sahifaSon(s)?.ish }">{{ sahifaSon(s)?.matn }}</span>
                      </router-link>
                    </div>
                  </div>
                </div>
              </template>
            </template>
          </section>
        </nav>

        <div class="sb-ft">
          <button v-if="yig" class="sb-ib sb-ib--w" title="Menyuni kengaytirish (Ctrl+\)" aria-label="Menyuni kengaytirish" @click="yigiq = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M13 10l2 2-2 2"/></svg>
          </button>
          <div v-else class="sb-me">
            <span class="av av--sb">{{ currentUser ? initsial(currentUser.fullname) : '?' }}</span>
            <span class="sb-me-t"><b>{{ currentUser?.fullname ?? '—' }}</b><small>{{ currentUser?.role ?? '—' }}</small></span>
            <button class="sb-ib" :title="dark ? 'Yorug\' mavzu' : 'Qorong\'i mavzu'" :aria-label="dark ? 'Yorug\' mavzuga o\'tish' : 'Qorong\'i mavzuga o\'tish'" @click="dark = !dark">
              <svg v-if="dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/></svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/></svg>
            </button>
            <button class="sb-ib sb-ib--x" title="Tizimdan chiqish" aria-label="Tizimdan chiqish" @click="logout">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3"/><path d="m16 17 5-5-5-5M21 12H9"/></svg>
            </button>
          </div>
        </div>
      </aside>

      <!-- Yig'ilgan menyu: modul ustida suzuvchi panel (nom + ichki sahifalar) -->
      <transition name="fly">
        <div v-if="yig && fly" class="fly" :style="{ top: fly.top + 'px' }" @mouseenter="flyQol" @mouseleave="flyYop">
          <router-link :to="fly.m.sahifalar[0]!.yol" class="fly-hd" tabindex="-1">
            <b>{{ fly.m.nom }}</b><small>{{ fly.m.izoh }}</small>
          </router-link>
          <div v-if="!bitta(fly.m)" class="fly-l">
            <router-link v-for="s in fly.m.sahifalar" :key="s.yol" :to="s.yol" class="fs" :class="{ on: joriy.s?.yol === s.yol }" tabindex="-1">
              <span class="fs-t">{{ s.nom }}</span>
              <span v-if="sahifaSon(s)" class="si-n" :class="{ ish: sahifaSon(s)?.ish }">{{ sahifaSon(s)?.matn }}</span>
            </router-link>
          </div>
        </div>
      </transition>
    </template>

    <!-- ══════════ ASOSIY QISM ══════════ -->
    <div class="main">
      <header class="top">
        <button class="tb tb--menu" aria-label="Menyu" @click="mobil = true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
        </button>

        <div class="crumb">
          <span v-if="joriyIkon" class="crumb-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" v-html="joriyIkon"/>
          </span>
          <span class="crumb-t">
            <small v-if="joriy.m && joriy.s && joriy.s.nom !== joriy.m.nom">{{ joriy.m.nom }}</small>
            <b>{{ joriy.s?.nom || joriy.m?.nom || 'Bosh sahifa' }}</b>
          </span>
        </div>

        <div class="top-r">
          <button class="search" @click="cpOchiq = true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <span>Sahifa yoki amalni qidirish</span>
            <kbd>⌘K</kbd>
          </button>

          <!-- Vazifalar -->
          <div class="dd-wrap" v-tashqari="() => ishOpen = false">
            <button class="tb tb--txt" :class="{ on: ishOpen }" @click="ishOpen = !ishOpen">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/></svg>
              <span>Vazifalar</span>
              <span v-if="ishJami" class="tb-n">{{ ishJami }}</span>
            </button>
            <transition name="dd">
              <div v-if="ishOpen" class="dd dd--ish">
                <div class="dd-hd"><b>Bajarilishi kerak</b><small>har daqiqada yangilanadi</small></div>
                <div v-if="!ishlar.length" class="dd-bos">Hozircha kutilayotgan vazifa yo'q</div>
                <router-link v-for="x in ishlar" :key="x.k" :to="x.yol" class="ish">
                  <span class="ish-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" v-html="x.ikon"/></span>
                  <span class="ish-t"><b>{{ x.matn }}</b><small>{{ x.modul }}</small></span>
                  <span class="ish-n">{{ x.son }}</span>
                </router-link>
              </div>
            </transition>
          </div>

          <!-- Bildirishnomalar -->
          <div class="dd-wrap" v-tashqari="() => notifOpen = false">
            <button class="tb" :class="{ on: notifOpen }" title="Bildirishnomalar" @click="notifOpen = !notifOpen; bildirishnomaRuxsati()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              <span v-if="notifStore.oqilmagan.value > 0" class="tb-son">{{ notifStore.oqilmagan.value > 9 ? '9+' : notifStore.oqilmagan.value }}</span>
            </button>
            <transition name="dd">
              <div v-if="notifOpen" class="dd dd--n">
                <div class="dd-hd dd-hd--row">
                  <b>Bildirishnomalar</b>
                  <button v-if="notifStore.state.items.length" class="dd-link" @click="hammasiOqildi()">Hammasini o'qilgan qilish</button>
                </div>
                <div class="nlist">
                  <div v-if="!notifStore.state.items.length" class="dd-bos">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                    Yangi bildirishnoma yo'q
                  </div>
                  <div v-for="item in notifStore.state.items" :key="item.id" class="nr" :class="{ yangi: !item.oqilgan }" @click="onNotifClick(item)">
                    <span class="nr-ic" :class="'r-' + item.rang"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" v-html="notifIkon(item.tur)"/></span>
                    <div class="nr-t">
                      <b>{{ item.sarlavha }}</b>
                      <span>{{ item.matn }}</span>
                      <small v-if="!item.tayyor">Tasdiqlashga {{ item.countdown }} soniya qoldi</small>
                      <small v-else>{{ vaqtOldin(item.sana) }}</small>
                    </div>
                    <button class="nr-x" title="O'chirish" @click.stop="notifStore.ochir(item.id)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                </div>
                <div v-if="notifStore.state.items.length" class="dd-ft"><button class="dd-link" @click="notifStore.hammasiniOchir()">Hammasini tozalash</button></div>
              </div>
            </transition>
          </div>

          <!-- Profil -->
          <div class="dd-wrap" v-tashqari="() => userOpen = false">
            <button class="me" :class="{ on: userOpen }" title="Profil" @click="userOpen = !userOpen">
              <span class="av">{{ currentUser ? initsial(currentUser.fullname) : '?' }}</span>
            </button>
            <transition name="dd">
              <div v-if="userOpen" class="dd dd--me">
                <div class="dd-me">
                  <span class="av av--lg">{{ currentUser ? initsial(currentUser.fullname) : '?' }}</span>
                  <span><b>{{ currentUser?.fullname ?? '—' }}</b><small>{{ currentUser?.role ?? '—' }}</small></span>
                </div>
                <button class="dd-i" @click="dark = !dark; userOpen = false">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/></svg>
                  <span>{{ dark ? "Yorug' mavzu" : "Qorong'i mavzu" }}</span>
                </button>
                <button class="dd-i" @click="cpOchiq = true; userOpen = false">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                  <span>Qidiruv va buyruqlar</span><kbd>⌘K</kbd>
                </button>
                <div class="dd-sep"/>
                <button class="dd-i dd-i--x" @click="logout">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3"/><path d="m16 17 5-5-5-5M21 12H9"/></svg>
                  <span>Tizimdan chiqish</span>
                </button>
              </div>
            </transition>
          </div>
        </div>
      </header>

      <main :class="['page', route.path.startsWith('/sozlamalar') && 'page--full']">
        <router-view/>
      </main>
    </div>

    <CommandPalette :ochiq="cpOchiq" :buyruqlar="buyruqlar" @yop="cpOchiq = false"/>

    <!-- Yangi bildirishnomalar: yuqori o'ng burchakda 9 soniya -->
    <transition-group name="bp" tag="div" class="bp-wrap">
      <div v-for="p in notifStore.state.popup" :key="p.id" class="bp" :class="'r-' + p.rang" @click="popupOch(p)">
        <span class="bp-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" v-html="notifIkon(p.tur)"/></span>
        <div class="bp-t">
          <b>{{ p.sarlavha }}</b>
          <span>{{ p.matn }}</span>
          <em v-if="p.havola">Ochish →</em>
        </div>
        <button class="bp-x" title="Yopish" @click.stop="notifStore.popupYop(p.id)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
    </transition-group>

    <transition name="sexp">
      <div v-if="sessionToast" class="sexp">
        <b>Sessiya muddati tugadi</b>
        <span>Iltimos, qayta tizimga kiring</span>
      </div>
    </transition>
  </div>
</template>

<style scoped>
/* ═══ TOKENLAR ═══
   Brend — main.css dagi --brand-* (indigo). Neytrallar — sovuq "slate",
   brend bilan uyg'un va sahifalardagi kulranglar bilan bir xil.
   Sahifalar shu nomlarni meros oladi: --bg --surface --line --ink --ink2 --mut --sub --hov --act --acc. */
.shell {
  --bg:#f5f6fa; --surface:#ffffff; --line:#e3e6ee; --line2:#eef0f5;
  --ink:#0f172a; --ink2:#334155; --mut:#64748b; --sub:#94a3b8;
  --hov:#f1f3f9; --act:#e8ebf5; --acc:var(--brand-600); --acc-soft:var(--brand-50); --acc-ink:var(--brand-700);
  /* sidebar — to'q indigo; t: asosiy matn, t2: ichki sahifalar, t3: yorliqlar, ic: ikonlar */
  --sb-g1:#1c1a46; --sb-g2:#171540; --sb-edge:transparent;
  --sb-line:rgba(255,255,255,.07); --sb-line2:rgba(255,255,255,.11);
  --sb-t:#d3d6f3; --sb-t2:#b0b4e3; --sb-t3:#8d92d0; --sb-ic:#9da2dc;
  --sb-hov:rgba(255,255,255,.055); --sb-sel:rgba(255,255,255,.1);
  --main-bg:var(--bg); --page-bg:var(--bg); --page-scroll:#cfd4e1;
  --sb-w:248px; --sb-wy:60px;
  display:flex; height:100vh; width:100vw; overflow:hidden; background:var(--bg); color:var(--ink);
  -webkit-font-smoothing:antialiased;
}
.shell.dark {
  --bg:#0e1118; --surface:#141925; --line:#242b3b; --line2:#1c2230;
  --ink:#e8eaf0; --ink2:#c3c9d6; --mut:#8b93a7; --sub:#5f6a7e;
  --hov:#1a2030; --act:#20283a; --acc:var(--brand-400); --acc-soft:rgba(99,102,241,.16); --acc-ink:var(--brand-300);
  --sb-g1:#15143a; --sb-g2:#111030; --sb-edge:rgba(255,255,255,.06);
  --page-scroll:#2e3648;
}

/* ═══ SIDEBAR ═══
   Tinch va zich: to'q indigo, oddiy chiziqli ikonlar, faollik — yumshoq fon.
   Ichki sahifalar matni ota modul matni bilan bir chiziqda; chapda
   yo'naltiruvchi chiziq, faol sahifada shu chiziq ustida indigo belgi. */
.sb {
  width:var(--sb-w); flex-shrink:0; height:100vh;
  display:flex; flex-direction:column; position:relative; z-index:40;
  background:linear-gradient(180deg, var(--sb-g1), var(--sb-g2));
  color:var(--sb-t);
  box-shadow:inset -1px 0 0 var(--sb-edge);
  transition:width .2s cubic-bezier(.2,.7,.2,1);
}
.sb--yigiq { width:var(--sb-wy); }

/* Bosh qism — topbar bilan bir balandlikda */
.sb-hd { height:60px; flex-shrink:0; display:flex; align-items:center; gap:8px; padding:0 10px 0 16px; border-bottom:1px solid var(--sb-line); }
.sb--yigiq .sb-hd { justify-content:center; padding:0; }
.brand { display:flex; align-items:center; gap:10px; min-width:0; text-decoration:none; color:#fff; border-radius:8px; }
.brand-mark { width:28px; height:28px; flex-shrink:0; border-radius:8px; display:grid; place-items:center; color:#fff;
  background:var(--brand-500); box-shadow:inset 0 1px 0 rgba(255,255,255,.22), 0 1px 2px rgba(0,0,0,.35); }
.brand-mark svg { width:16px; height:16px; }
.brand-t { display:flex; flex-direction:column; min-width:0; line-height:1.2; }
.brand-t b { font-size:14px; font-weight:650; letter-spacing:-.005em; color:#fff; }
.brand-t small { font-size:11.5px; color:var(--sb-t3); }
.sb-ib--hd { margin-left:auto; }
.sb .sb-x { display:none; margin-left:auto; }

.sb-ib { width:28px; height:28px; flex-shrink:0; border:none; border-radius:7px; background:none; color:var(--sb-t3); cursor:pointer;
  display:grid; place-items:center; transition:background .12s, color .12s; }
.sb-ib:hover { background:var(--sb-hov); color:#fff; }
.sb-ib svg { width:17px; height:17px; }
.sb-ib--w { width:36px; height:36px; border-radius:8px; }
.sb-ib--x:hover { color:#fca5a5; }
.brand:focus-visible, .sb-ib:focus-visible, .ni:focus-visible, .si:focus-visible { outline:2px solid var(--brand-400); outline-offset:-2px; }

/* Ro'yxat */
.sb-nav { flex:1; min-height:0; overflow-y:auto; overflow-x:hidden; padding:8px 10px 16px;
  scrollbar-width:thin; scrollbar-color:transparent transparent; }
.sb-nav:hover { scrollbar-color:rgba(255,255,255,.16) transparent; }
.sb-g + .sb-g { margin-top:12px; }
.sb-gt { height:28px; display:flex; align-items:center; padding:0 10px; font-size:11.5px; font-weight:500; color:var(--sb-t3); }
.sb-gl { height:1px; margin:6px 12px; background:var(--sb-line); }

/* Modul qatori */
.ni { width:100%; height:34px; display:flex; align-items:center; gap:10px; padding:0 8px 0 10px; margin:1px 0; border:none; border-radius:7px;
  background:none; color:var(--sb-t); font:inherit; font-size:13px; font-weight:500; text-decoration:none; text-align:left; cursor:pointer;
  position:relative; transition:background .12s, color .12s; }
.ni:hover { background:var(--sb-hov); color:#fff; }
.ni-tl { display:grid; place-items:center; flex-shrink:0; color:var(--sb-ic); transition:color .12s; }
.ni-ic { width:16px; height:16px; }
.ni:hover .ni-tl, .ni.act .ni-tl { color:#fff; }
.ni.act { color:#fff; }
.ni.on { background:var(--sb-sel); color:#fff; box-shadow:inset 0 0 0 1px rgba(255,255,255,.05); }
.ni.on .ni-tl { color:var(--brand-300); }
.ni-t { flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ni-n, .si-n.ish { min-width:20px; height:18px; padding:0 6px; border-radius:9px; background:rgba(129,140,248,.22); color:#e0e4ff;
  font-size:11px; font-weight:600; line-height:18px; text-align:center; font-variant-numeric:tabular-nums; }
.ni-n.dot { position:absolute; top:7px; right:7px; min-width:0; width:7px; height:7px; padding:0; border-radius:50%;
  background:var(--brand-400); box-shadow:0 0 0 2px var(--sb-g1); }
.ni-ch { width:14px; height:14px; flex-shrink:0; color:var(--sb-t3); transition:transform .18s cubic-bezier(.2,.7,.2,1), color .12s; }
.ni:hover .ni-ch { color:var(--sb-t); }
.ni-ch.up { transform:rotate(90deg); }
.sb--yigiq .ni { justify-content:center; width:40px; height:40px; margin:2px auto; padding:0; border-radius:9px; }
.sb--yigiq .ni-ic { width:18px; height:18px; }

/* Ichki sahifalar — silliq ochiladi (grid 0fr → 1fr), yopiqda inert */
.sub { display:grid; grid-template-rows:0fr; transition:grid-template-rows .2s cubic-bezier(.2,.7,.2,1); }
.sub.open { grid-template-rows:1fr; }
.sub-in { min-height:0; overflow:hidden; visibility:hidden; transition:visibility 0s .2s; }
.sub.open .sub-in { visibility:visible; transition:visibility 0s; }
.sub-l { position:relative; padding:1px 0 6px; }
.sub-l::before { content:''; position:absolute; left:17.5px; top:2px; bottom:7px; width:1px; background:var(--sb-line2); }
.si { height:30px; display:flex; align-items:center; gap:8px; margin:1px 0 1px 26px; padding:0 8px 0 10px; border-radius:7px;
  color:var(--sb-t2); font-size:13px; text-decoration:none; position:relative; transition:background .12s, color .12s; }
.si:hover { background:var(--sb-hov); color:#fff; }
.si.on { background:var(--sb-sel); color:#fff; font-weight:500; }
.si.on::before { content:''; position:absolute; left:-9.5px; top:7px; bottom:7px; width:2px; border-radius:1px; background:var(--brand-400); }
.si-t { flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.si-n { font-size:11.5px; color:var(--sb-t3); font-variant-numeric:tabular-nums; }

/* Pastki qism: foydalanuvchi */
.sb-ft { flex-shrink:0; padding:8px 10px 10px; border-top:1px solid var(--sb-line); display:flex; justify-content:center; }
.sb-me { width:100%; display:flex; align-items:center; gap:10px; padding:6px 2px 6px 6px; border-radius:8px; }
.sb-me-t { flex:1; display:flex; flex-direction:column; min-width:0; line-height:1.25; }
.sb-me-t b { font-size:13px; font-weight:600; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sb-me-t small { font-size:11.5px; color:var(--sb-t3); }
.av { width:32px; height:32px; flex-shrink:0; border-radius:50%; background:var(--brand-600); color:#fff; display:flex; align-items:center; justify-content:center;
  font-size:12px; font-weight:600; letter-spacing:.02em; }
.av--sb { width:28px; height:28px; font-size:11px; background:var(--brand-500); box-shadow:inset 0 0 0 1px rgba(255,255,255,.14); }
.av--lg { width:40px; height:40px; font-size:14px; }

/* Yig'ilgan menyuning suzuvchi paneli */
.fly { position:fixed; z-index:60; left:calc(var(--sb-wy) + 6px); min-width:210px; max-width:280px; padding:4px; border-radius:10px;
  color:var(--sb-t); background:var(--sb-g1); border:1px solid rgba(255,255,255,.08);
  box-shadow:0 12px 32px -8px rgba(10,9,30,.55), 0 2px 6px rgba(10,9,30,.3); }
.fly-hd { display:flex; flex-direction:column; gap:1px; padding:7px 10px 8px; border-radius:7px; text-decoration:none; }
.fly-hd b { font-size:13px; font-weight:600; color:#fff; }
.fly-hd small { font-size:11.5px; line-height:1.35; color:var(--sb-t3); }
.fly-hd:hover { background:var(--sb-hov); }
.fly-l { margin-top:2px; padding-top:4px; border-top:1px solid var(--sb-line); }
.fs { height:30px; display:flex; align-items:center; gap:8px; padding:0 10px; border-radius:7px; color:var(--sb-t2); font-size:13px; text-decoration:none;
  transition:background .12s, color .12s; }
.fs:hover { background:var(--sb-hov); color:#fff; }
.fs.on { background:var(--sb-sel); color:#fff; font-weight:500; }
.fs-t { flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.fly-enter-active, .fly-leave-active { transition:opacity .12s, transform .12s; }
.fly-enter-from, .fly-leave-to { opacity:0; transform:translateX(-4px); }

@media (prefers-reduced-motion: reduce) {
  .sb, .sub, .ni-ch { transition:none; }
}

/* ═══ YUQORI PANEL ═══ */
.main { flex:1; min-width:0; display:flex; flex-direction:column; height:100vh; }
.top { height:60px; flex-shrink:0; display:flex; align-items:center; gap:12px; padding:0 20px 0 24px; background:var(--surface); border-bottom:1px solid var(--line); position:relative; z-index:30; }
.crumb { display:flex; align-items:center; gap:12px; min-width:0; }
.crumb-ic { width:36px; height:36px; flex-shrink:0; border-radius:9px; background:var(--acc-soft); color:var(--acc); display:flex; align-items:center; justify-content:center; }
.crumb-ic svg { width:19px; height:19px; }
.crumb-t { display:flex; flex-direction:column; min-width:0; line-height:1.2; }
.crumb-t small { font-size:11.5px; color:var(--mut); white-space:nowrap; }
.crumb-t b { font-size:15px; font-weight:600; color:var(--ink); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.top-r { margin-left:auto; display:flex; align-items:center; gap:4px; }

.search { display:flex; align-items:center; gap:8px; height:36px; width:260px; padding:0 6px 0 11px; border:1px solid var(--line); border-radius:9px;
  background:var(--bg); color:var(--sub); font:inherit; font-size:13px; cursor:pointer; margin-right:8px; transition:border-color .12s, box-shadow .12s; }
.search:hover { border-color:var(--brand-300); box-shadow:0 0 0 3px var(--acc-soft); color:var(--mut); }
.search svg { width:16px; height:16px; flex-shrink:0; }
.search span { flex:1; text-align:left; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
kbd { font:500 11px/1 ui-sans-serif, system-ui, sans-serif; padding:3px 5px; border-radius:5px; border:1px solid var(--line); color:var(--mut); background:var(--surface); }

.tb { position:relative; height:36px; min-width:36px; padding:0 9px; display:flex; align-items:center; justify-content:center; gap:7px; border:none; border-radius:9px;
  background:none; color:var(--mut); font:inherit; font-size:13px; font-weight:500; cursor:pointer; transition:background .12s, color .12s; }
.tb:hover, .tb.on { background:var(--acc-soft); color:var(--acc); }
.tb svg { width:19px; height:19px; }
.tb--menu { display:none; }
.tb-n { min-width:20px; height:20px; padding:0 6px; border-radius:10px; background:var(--acc); color:#fff; font-size:11px; font-weight:600; line-height:20px; font-variant-numeric:tabular-nums; }
.shell.dark .tb-n { color:var(--brand-950); }
.tb-dot { position:absolute; top:7px; right:8px; width:8px; height:8px; border-radius:50%; background:#ef4444; box-shadow:0 0 0 2px var(--surface); }
.tb-son { position:absolute; top:3px; right:3px; min-width:17px; height:17px; padding:0 4px; border-radius:9px; background:#ef4444; color:#fff; font-size:10px; font-weight:700; line-height:17px; text-align:center; box-shadow:0 0 0 2px var(--surface); animation:tbPuls 2s ease-in-out 3; }
@keyframes tbPuls { 50% { transform:scale(1.18); } }
/* Bildirishnoma ranglari — ma'no bo'yicha: amber kutish, yashil bajarildi, indigo brend */
.r-amber   { --c:#d97706; } .r-green, .r-emerald { --c:#059669; } .r-indigo, .r-violet, .r-blue { --c:#4f46e5; } .r-rose { --c:#dc2626; }
.nr-ic[class*='r-'] { background:color-mix(in srgb, var(--c) 12%, transparent); color:var(--c); }
.bp-wrap { position:fixed; top:68px; right:18px; z-index:200; display:flex; flex-direction:column; gap:10px; width:360px; max-width:calc(100vw - 32px); pointer-events:none; }
.bp { pointer-events:auto; display:flex; gap:12px; align-items:flex-start; padding:14px 14px 14px 16px; background:var(--surface); border:1px solid var(--line); border-left:4px solid var(--c, #4f46e5); border-radius:14px; box-shadow:0 18px 40px -12px rgba(15,23,42,.35); cursor:pointer; }
.bp:hover { transform:translateY(-1px); }
.bp-ic { width:36px; height:36px; flex-shrink:0; border-radius:10px; display:flex; align-items:center; justify-content:center; background:color-mix(in srgb, var(--c, #4f46e5) 13%, transparent); color:var(--c, #4f46e5); }
.bp-ic svg { width:19px; height:19px; }
.bp-t { flex:1; min-width:0; display:flex; flex-direction:column; gap:3px; }
.bp-t b { font-size:13.5px; font-weight:700; color:var(--ink); }
.bp-t span { font-size:12.5px; color:var(--ink2); line-height:1.4; }
.bp-t em { font-style:normal; font-size:12px; font-weight:600; color:var(--c, #4f46e5); margin-top:2px; }
.bp-x { width:26px; height:26px; border:none; background:none; color:var(--sub); border-radius:7px; cursor:pointer; display:flex; align-items:center; justify-content:center; }
.bp-x:hover { background:var(--hov); color:var(--ink); }
.bp-x svg { width:14px; height:14px; }
.bp-enter-active { transition:all .35s cubic-bezier(.22,1,.36,1); }
.bp-leave-active { transition:all .25s ease; }
.bp-enter-from { opacity:0; transform:translateX(40px) scale(.97); }
.bp-leave-to { opacity:0; transform:translateX(30px); }
.me { width:38px; height:38px; border:none; background:none; border-radius:50%; padding:0; cursor:pointer; margin-left:6px; display:flex; align-items:center; justify-content:center; }
.me .av { transition:box-shadow .12s; }
.me.on .av, .me:hover .av { box-shadow:0 0 0 3px var(--acc-soft), 0 0 0 4px var(--brand-300); }

/* Ochiluvchi menyular */
.dd-wrap { position:relative; }
.dd { position:absolute; right:0; top:calc(100% + 10px); background:var(--surface); border:1px solid var(--line); border-radius:12px;
  box-shadow:0 1px 2px rgba(15,23,42,.04), 0 16px 40px rgba(15,23,42,.12); overflow:hidden; color:var(--ink); }
.shell.dark .dd { box-shadow:0 16px 40px rgba(0,0,0,.55); }
.dd-hd { padding:13px 16px; border-bottom:1px solid var(--line2); display:flex; flex-direction:column; gap:2px; }
.dd-hd b { font-size:13.5px; font-weight:600; }
.dd-hd small { font-size:12px; color:var(--mut); }
.dd-hd--row { flex-direction:row; align-items:center; justify-content:space-between; }
.dd-link { border:none; background:none; color:var(--acc); font:inherit; font-size:12px; font-weight:500; cursor:pointer; padding:0; }
.dd-link:hover { text-decoration:underline; }
.dd-bos { padding:30px 16px; text-align:center; color:var(--mut); font-size:13px; display:flex; flex-direction:column; align-items:center; gap:10px; }
.dd-bos svg { width:28px; height:28px; color:var(--sub); }
.dd-ft { padding:10px 14px; border-top:1px solid var(--line2); text-align:center; }
.dd-sep { height:1px; background:var(--line2); margin:4px 0; }
.dd-me { display:flex; align-items:center; gap:12px; padding:14px 16px; border-bottom:1px solid var(--line2); }
.dd-me > span:last-child { display:flex; flex-direction:column; min-width:0; line-height:1.3; }
.dd-me b { font-size:13.5px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.dd-me small { font-size:12px; color:var(--mut); }
.dd-i { width:100%; height:38px; display:flex; align-items:center; gap:10px; padding:0 16px; border:none; background:none; color:var(--ink2);
  font:inherit; font-size:13px; cursor:pointer; text-align:left; }
.dd-i svg { width:17px; height:17px; color:var(--mut); flex-shrink:0; }
.dd-i span { flex:1; }
.dd-i:hover { background:var(--hov); color:var(--ink); }
.dd-i:hover svg { color:var(--acc); }
.dd-i--x, .dd-i--x svg, .dd-i--x:hover svg { color:#dc2626; }
.dd--me { width:250px; padding-bottom:4px; }
.dd--ish { width:360px; }
.ish { display:flex; align-items:center; gap:12px; padding:11px 16px; text-decoration:none; color:var(--ink); border-bottom:1px solid var(--line2); }
.ish:last-child { border-bottom:none; }
.ish:hover { background:var(--hov); }
.ish-ic { width:34px; height:34px; flex-shrink:0; border-radius:9px; background:var(--acc-soft); color:var(--acc); display:flex; align-items:center; justify-content:center; }
.ish-ic svg { width:18px; height:18px; }
.ish-t { flex:1; min-width:0; display:flex; flex-direction:column; line-height:1.3; }
.ish-t b { font-size:13px; font-weight:500; }
.ish-t small { font-size:11.5px; color:var(--mut); }
.ish-n { min-width:26px; height:22px; padding:0 8px; border-radius:11px; background:var(--acc); color:#fff; font-size:12px; font-weight:600; line-height:22px; text-align:center; font-variant-numeric:tabular-nums; }
.shell.dark .ish-n { color:var(--brand-950); }
.dd--n { width:380px; }
.nlist { max-height:420px; overflow-y:auto; }
.nr { display:flex; gap:12px; padding:12px 16px; border-bottom:1px solid var(--line2); cursor:pointer; position:relative; }
.nr:last-child { border-bottom:none; }
.nr:hover { background:var(--hov); }
.nr-ic { width:32px; height:32px; flex-shrink:0; border-radius:9px; background:var(--hov); color:var(--mut); display:flex; align-items:center; justify-content:center; }
.nr-ic svg { width:17px; height:17px; }
.nr.yangi .nr-ic { background:var(--acc-soft); color:var(--acc); }
.nr.yangi::before { content:''; position:absolute; left:6px; top:50%; width:5px; height:5px; margin-top:-2.5px; border-radius:50%; background:var(--acc); }
.nr-t { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
.nr-t b { font-size:13px; font-weight:600; }
.nr-t span { font-size:12.5px; color:var(--ink2); line-height:1.4; }
.nr-t small { font-size:11.5px; color:var(--sub); }
.nr-x { width:24px; height:24px; border:none; background:none; color:var(--sub); border-radius:6px; cursor:pointer; opacity:0; display:flex; align-items:center; justify-content:center; }
.nr-x svg { width:13px; height:13px; }
.nr:hover .nr-x { opacity:1; }
.nr-x:hover { background:var(--act); color:var(--ink); }
.dd-enter-active, .dd-leave-active { transition:opacity .12s, transform .12s; }
.dd-enter-from, .dd-leave-to { opacity:0; transform:translateY(-4px); }

/* ═══ SAHIFA ═══ */
.page { flex:1; overflow-y:auto; padding:24px 28px; background:var(--page-bg); }
.page--full { padding:0; overflow:hidden; }
.page::-webkit-scrollbar { width:8px; }
.page::-webkit-scrollbar-thumb { background:var(--page-scroll); border-radius:4px; border:2px solid var(--page-bg); }

.sexp { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); z-index:300; display:flex; flex-direction:column; gap:2px; padding:12px 18px;
  border-radius:10px; background:var(--brand-950); color:#fff; box-shadow:0 12px 32px rgba(15,23,42,.3); }
.sexp b { font-size:13.5px; font-weight:600; }
.sexp span { font-size:12.5px; opacity:.75; }
.sexp-enter-active, .sexp-leave-active { transition:opacity .2s, transform .2s; }
.sexp-enter-from, .sexp-leave-to { opacity:0; transform:translateX(-50%) translateY(8px); }

/* ═══ MOSLASHUV ═══ */
@media (max-width:1180px) { .search { width:200px; } }
@media (max-width:1040px) { .tb--txt span:not(.tb-n) { display:none; } .search { width:auto; } .search span, .search kbd { display:none; } }
@media (max-width:900px) {
  .sb { position:fixed; inset:0 auto 0 0; height:100%; width:min(280px, calc(100vw - 56px));
    transform:translateX(-100%); transition:transform .24s cubic-bezier(.2,.7,.2,1); }
  .sb--mobil { transform:none; box-shadow:0 0 48px rgba(0,0,0,.4); }
  .sb .sb-ib--hd { display:none; }
  .sb .sb-x { display:grid; }
  .sb-ov { position:fixed; inset:0; z-index:39; background:rgba(15,23,42,.42); -webkit-backdrop-filter:blur(3px); backdrop-filter:blur(3px); }
  .sb-ov-enter-active, .sb-ov-leave-active { transition:opacity .25s; }
  .sb-ov-enter-from, .sb-ov-leave-to { opacity:0; }
  .tb--menu { display:flex; }
  .top { padding:0 12px; }
  .crumb-ic { display:none; }
  .page { padding:16px; }
}
</style>
