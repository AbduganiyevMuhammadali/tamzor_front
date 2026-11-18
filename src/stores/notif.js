import { reactive, computed } from 'vue'

// ─── Ovoz (Web Audio API — tashqi fayl kerak emas) ───────────────────────────
function playNotifSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const master = ctx.createGain()
    master.gain.value = 0.5
    master.connect(ctx.destination)

    // Delay (echo) effekti
    const delay    = ctx.createDelay(0.5)
    const feedback = ctx.createGain()
    const wet      = ctx.createGain()
    delay.delayTime.value = 0.18
    feedback.gain.value   = 0.35
    wet.gain.value        = 0.25
    delay.connect(feedback)
    feedback.connect(delay)
    delay.connect(wet)
    wet.connect(master)

    // "Marimba-style" — 2 ta osc (fundamental + harmonik) birgalikda
    const chimes = [
      { freq: 1318.5, start: 0.00, dur: 0.55 }, // E6
      { freq: 1174.7, start: 0.14, dur: 0.55 }, // D6
      { freq: 880.0,  start: 0.28, dur: 0.55 }, // A5
      { freq: 1046.5, start: 0.42, dur: 0.90 }, // C6
    ]

    chimes.forEach(({ freq, start, dur }) => {
      // Asosiy ton
      const osc1  = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'sine'
      osc1.frequency.value = freq
      osc1.connect(gain1)
      gain1.connect(master)
      gain1.connect(delay)

      // Harmonik (8va yuqori, jimroq) — metallsimon rang beradi
      const osc2  = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'sine'
      osc2.frequency.value = freq * 2.756  // non-integer — xylophone efekti
      osc2.connect(gain2)
      gain2.connect(master)

      const t = ctx.currentTime + start
      // 1-osc: tez attack, marimba kabi tez so'nish
      gain1.gain.setValueAtTime(0, t)
      gain1.gain.linearRampToValueAtTime(0.55, t + 0.008)
      gain1.gain.exponentialRampToValueAtTime(0.001, t + dur)
      // 2-osc: juda qisqa — faqat zarba uchun
      gain2.gain.setValueAtTime(0, t)
      gain2.gain.linearRampToValueAtTime(0.15, t + 0.006)
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.06)

      osc1.start(t); osc1.stop(t + dur + 0.1)
      osc2.start(t); osc2.stop(t + 0.1)
    })

    setTimeout(() => ctx.close(), 3000)
  } catch { /* AudioContext qo'llab-quvvatlanmasa */ }
}

// ─── Store ────────────────────────────────────────────────────────────────────
let seq = 0

const state = reactive({
  // Ekranning yuqori o'ng burchagida ko'rinadigan yangi bildirishnomalar (8 s)
  popup: /** @type {Array<{ id: number, tur: string, sarlavha: string, matn: string, havola: string|null, rang: string }>} */([]),
  items: /** @type {Array<{
    id: number,
    tur: string,
    sarlavha: string,
    matn: string,
    sana: Date,
    oqilgan: boolean,
    havola: string|null,
    rang: string,
    // countdown uchun
    _timerId: any,
    countdown: number,   // qolgan soniyalar (0 = tayyor)
    tayyor: boolean,     // tasdiqlashga tayyor
  }>} */([]),
})

export const notifStore = {
  state,

  oqilmagan: computed(() => state.items.filter(i => !i.oqilgan).length),

  // Yangi bildirishnoma qo'shish (countdown = 0 bo'lsa — darhol)
  // sana — voqea sodir bo'lgan vaqt (berilmasa hozirgi vaqt)
  // jim = true — ovozsiz va popupsiz (sahifa ochilgandagi eski voqealar); kalit — takrorlanmasin
  add({ tur = 'info', sarlavha, matn, havola = null, rang = 'indigo', countdown = 0, sana = null, jim = false, oqilgan = false, kalit = null }) {
    if (kalit && state.items.some(i => i.kalit === kalit)) return 0
    const id = ++seq
    const item = reactive({
      id,
      tur,
      sarlavha,
      matn,
      sana: sana ? new Date(sana) : new Date(),
      oqilgan,
      kalit,
      havola,
      rang,
      _timerId: null,
      countdown,
      tayyor: countdown === 0,
    })

    state.items.unshift(item)
    if (state.items.length > 80) state.items.splice(80)

    if (countdown > 0) {
      // Har soniya countdown kamaytiradi
      item._timerId = setInterval(() => {
        item.countdown--
        if (item.countdown <= 0) {
          clearInterval(item._timerId)
          item.countdown = 0
          item.tayyor    = true
          item.oqilgan   = false   // yangi holat — e'tibor jalb qilsin
          playNotifSound()
        }
      }, 1000)
    } else if (!jim) {
      playNotifSound()
      const p = { id, tur, sarlavha, matn, havola, rang }
      state.popup.unshift(p)
      if (state.popup.length > 3) state.popup.splice(3)
      setTimeout(() => { const i = state.popup.findIndex(x => x.id === id); if (i >= 0) state.popup.splice(i, 1) }, 9000)
    }

    return id
  },

  popupYop(id) {
    const i = state.popup.findIndex(x => x.id === id)
    if (i >= 0) state.popup.splice(i, 1)
  },

  // Prixod keldi — 60 soniya countdown bilan
  prixodKeldi({ prixodId, yetkazuvchi, qatorSon, summa, ombor }) {
    const nom = yetkazuvchi || 'Noma\'lum yetkazuvchi'
    return this.add({
      tur:       'prixod',
      sarlavha:  `Kirim tasdiqlashni kutmoqda`,
      matn:      `${nom} — ${qatorSon} ta mahsulot · ${Number(summa||0).toLocaleString('uz-UZ')} UZS · ${ombor||'Ombor'}`,
      havola:    `/ombor/prixod/${prixodId}`,
      rang:      'violet',
      countdown: 10,
    })
  },

  // Yangi zakaz (ariza) tushdi — darhol ovoz + toast
  // sana = zakaz tushgan (ariza yaratilgan) vaqt
  yangiZakaz({ arizaId, raqam, mijoz, agent, summa, manba, sana }) {
    const manbaText = manba === 'mobil' ? '📱 Telefondan' : '💻 Web'
    return this.add({
      tur:      'zakaz',
      sarlavha: `Yangi zakaz — ${raqam || '#' + arizaId}`,
      matn:     `${manbaText} · ${agent || 'Agent'} · ${mijoz || 'Mijoz'} · ${Number(summa || 0).toLocaleString('uz-UZ')} UZS`,
      // Aniq zakazga olib boradi (arizalar sahifasi — ochib ko'rish + tasdiqlash)
      havola:   `/sotuvlar/arizalar?doc=${arizaId}`,
      rang:     manba === 'mobil' ? 'emerald' : 'indigo',
      countdown: 0,
      sana,
    })
  },

  oqish(id) {
    const item = state.items.find(i => i.id === id)
    if (item) item.oqilgan = true
  },

  barchasiOqish() {
    state.items.forEach(i => { i.oqilgan = true })
  },

  ochir(id) {
    const item = state.items.find(i => i.id === id)
    if (item?._timerId) clearInterval(item._timerId)
    state.items.splice(state.items.findIndex(i => i.id === id), 1)
  },

  hammasiniOchir() {
    state.items.forEach(i => { if (i._timerId) clearInterval(i._timerId) })
    state.items.splice(0)
  },
}
