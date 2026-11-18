<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { authStore } from '@/stores/auth'
import { rejimStore } from '@/stores/rejim'
import { IK } from '@/layouts/nav'
import SellzLogo from '@/components/SellzLogo.vue'

const router = useRouter()

const login    = ref('')
const parol    = ref('')
const korinsin = ref(false)   // parol ochiq ko'rinadimi
const capsLock = ref(false)
const silkin   = ref(false)   // xato bo'lganda panel silkinadi
const tayyor   = ref(false)   // kirish animatsiyasi
const mahalliy = ref('')      // forma tekshiruvi xatosi (server xatosidan alohida)

const loginInp = ref<HTMLInputElement | null>(null)
const parolInp = ref<HTMLInputElement | null>(null)
const panel    = ref<HTMLElement | null>(null)

const optom       = rejimStore.isOptom
const yil         = new Date().getFullYear()
const yuklanmoqda = computed(() => authStore.state.loading)
const xabar       = computed(() => mahalliy.value || authStore.state.error)

/* Chap paneldagi modullar — menyudagi nom va ikonlar bilan bir xil */
const modullar = computed(() => optom.value
  ? [
      { ikon: IK.savat,  nom: 'Sotuv',   izoh: 'Skladdan sotish: naqd, qisman, qarzga' },
      { ikon: IK.ombor,  nom: 'Ombor',   izoh: 'Kirim, qoldiq va partiyalar' },
      { ikon: IK.hamyon, nom: 'Moliya',  izoh: 'Kassa, xarajat va qarzlar' },
      { ikon: IK.grafik, nom: 'Hisobot', izoh: 'Sotuv, foyda va qarz tahlili' },
    ]
  : [
      { ikon: IK.chek,   nom: 'Sotuvlar', izoh: 'Buyurtmadan yetkazishgacha' },
      { ikon: IK.agent,  nom: 'Agentlar', izoh: 'Tashrif, marshrut va reja' },
      { ikon: IK.ombor,  nom: 'Ombor',    izoh: "Kirim, qoldiq va yig'ish" },
      { ikon: IK.hamyon, nom: 'Moliya',   izoh: 'Kassa, xarajat va qarzlar' },
    ])

const tavsif = computed(() => optom.value
  ? "Skladdan sotuv, ombor qoldig'i, mijoz qarzlari va kassa bir-biriga bog'langan — har bir raqam bitta manbadan keladi."
  : "Agent buyurtmasi, ombor qoldig'i, yetkazish va kassa bir-biriga bog'langan — har bir raqam bitta manbadan keladi.")

// Foydalanuvchi yozishni boshlasa eski xato yo'qoladi
watch([login, parol], () => {
  mahalliy.value = ''
  if (authStore.state.error) authStore.state.error = ''
})

onMounted(() => {
  if (authStore.isLoggedIn.value) { router.replace('/dashboard'); return }
  authStore.state.error = ''
  requestAnimationFrame(() => (tayyor.value = true))
})

async function silkit() {
  silkin.value = false
  await nextTick()
  silkin.value = true
  setTimeout(() => (silkin.value = false), 600)
}

async function kirish() {
  if (yuklanmoqda.value) return
  // Chrome autofill qiymatni v-model'ga bermasligi mumkin — DOM'dan ham o'qiymiz
  const l = (loginInp.value?.value || login.value).trim()
  const p = (parolInp.value?.value || parol.value).trim()

  if (!l || !p) {
    mahalliy.value = !l && !p ? 'Login va parolni kiriting' : !l ? 'Loginni kiriting' : 'Parolni kiriting'
    silkit()
    ;(!l ? loginInp : parolInp).value?.focus()
    return
  }

  try {
    await authStore.login(l, p)
    router.replace('/dashboard')
  } catch {
    silkit()
    parolInp.value?.focus()
    parolInp.value?.select()
  }
}

function capsTekshir(e: KeyboardEvent) {
  capsLock.value = !!e.getModifierState?.('CapsLock')
}

/* Sichqoncha ortidan yuruvchi yorug'lik — faqat sichqonchada */
let raf = 0
function nur(e: PointerEvent) {
  const el = panel.value
  if (e.pointerType !== 'mouse' || !el) return
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(() => {
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - r.left}px`)
    el.style.setProperty('--my', `${e.clientY - r.top}px`)
  })
}
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <div class="lg">

    <!-- Fon: indigo aurora + to'r + don -->
    <div class="fon" aria-hidden="true">
      <span class="aur a1"/><span class="aur a2"/><span class="aur a3"/>
      <div class="tor"/>
      <div class="don"/>
    </div>

    <main ref="panel" class="panel"
      :class="{ 'panel--in': tayyor, 'panel--silkin': silkin }"
      @pointermove="nur">

      <!-- ── Chap: brend va tizim haqida ── -->
      <section class="intro">
        <div class="brand">
          <SellzLogo class="brand-mark" :size="42"/>
          <span class="brand-t"><b>Sellz</b><small>{{ optom ? 'Optom' : 'Distributor' }}</small></span>
        </div>

        <div class="intro-pas">
          <h2 class="intro-h">Butun savdo —<br>bitta oynada</h2>
          <p class="intro-p">{{ tavsif }}</p>

          <ul class="modullar">
            <li v-for="(m, i) in modullar" :key="m.nom" class="modul" :style="{ '--i': i }">
              <span class="modul-ik">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" v-html="m.ikon"/>
              </span>
              <span class="modul-t"><b>{{ m.nom }}</b><span>{{ m.izoh }}</span></span>
            </li>
          </ul>
        </div>

        <!-- Bezak: logodagi pin va "S" — katta, shaffof chiziqlar -->
        <svg class="intro-belgi" aria-hidden="true" viewBox="100 80 344 420" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M272 477C340.3 401.2 413 318 413 242A141 141 0 0 0 131 242C131 318 203.7 401.2 272 477Z"/>
          <path d="M325 180H242A24 24 0 0 0 218 204V218.5A24 24 0 0 0 242 242.5H301A24 24 0 0 1 325 266.5V281.5A24 24 0 0 1 301 305.5H218"/>
        </svg>
      </section>

      <!-- ── O'ng: kirish formasi ── -->
      <section class="kirish">
        <div class="brand brand--mobil">
          <SellzLogo class="brand-mark" :size="42"/>
          <span class="brand-t"><b>Sellz</b><small>{{ optom ? 'Optom' : 'Distributor' }}</small></span>
        </div>

        <h1 class="k-h">Tizimga kirish</h1>
        <p class="k-p">Login va parolingizni kiriting</p>

        <transition name="xato">
          <div v-if="xabar" class="xato" role="alert">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5M12 16h.01"/></svg>
            <span>{{ xabar }}</span>
          </div>
        </transition>

        <form class="forma" novalidate @submit.prevent="kirish">
          <div class="maydon">
            <label for="lg-login">Login</label>
            <div class="kiritma" :class="{ 'kiritma--xato': !!xabar && !login }">
              <svg class="k-ik" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
              <input id="lg-login" ref="loginInp" v-model="login" class="inp"
                name="username" type="text" placeholder="Foydalanuvchi nomi"
                autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false"
                enterkeyhint="next" :aria-invalid="!!xabar" autofocus>
            </div>
          </div>

          <div class="maydon">
            <label for="lg-parol">Parol</label>
            <div class="kiritma" :class="{ 'kiritma--xato': !!xabar }">
              <svg class="k-ik" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2.2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>
              <input id="lg-parol" ref="parolInp" v-model="parol" class="inp inp--parol"
                name="password" :type="korinsin ? 'text' : 'password'" placeholder="••••••••"
                autocomplete="current-password" enterkeyhint="go" :aria-invalid="!!xabar"
                aria-describedby="lg-caps"
                @keydown="capsTekshir" @keyup="capsTekshir" @blur="capsLock = false">
              <button class="koz" type="button"
                :aria-label="korinsin ? 'Parolni yashirish' : 'Parolni ko\'rsatish'"
                :aria-pressed="korinsin" @click="korinsin = !korinsin">
                <svg v-if="!korinsin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m3 3 18 18"/><path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6A17.4 17.4 0 0 0 2 12s3.6 7 10 7a9.9 9.9 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>
              </button>
            </div>
            <p id="lg-caps" class="caps" :class="{ 'caps--on': capsLock }" aria-live="polite">
              <template v-if="capsLock">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4 4 12h4.5v7h7v-7H20z"/></svg>
                Caps Lock yoqilgan
              </template>
            </p>
          </div>

          <button class="tugma" type="submit" :disabled="yuklanmoqda" :aria-busy="yuklanmoqda">
            <template v-if="yuklanmoqda">
              <span class="aylana" aria-hidden="true"/>
              Kirilmoqda…
            </template>
            <template v-else>
              Kirish
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </template>
          </button>
        </form>

        <p class="eslatma">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" v-html="IK.qalqon"/>
          <span>Login va parolni kompaniya administratori beradi. Parolni unutgan bo'lsangiz, administratorga murojaat qiling.</span>
        </p>
      </section>
    </main>

    <footer class="lg-foot">
      <span>© {{ yil }} Sellz</span>
      <span aria-hidden="true">·</span>
      <a href="/maxfiylik.html" target="_blank" rel="noopener">Maxfiylik siyosati</a>
    </footer>
  </div>
</template>

<style scoped>
/* ── Tokenlar: faqat indigo shkalasi; qizil — xato, sariq — ogohlantirish ── */
.lg {
  --g-ink:   #ffffff;
  --g-ink2:  rgba(245, 243, 255, .76);
  --g-mut:   rgba(237, 233, 254, .60);
  --g-line:  rgba(255, 255, 255, .13);
  --g-fill:  rgba(255, 255, 255, .06);

  position: relative; isolation: isolate; overflow: hidden;
  min-height: 100vh; min-height: 100dvh;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 22px; padding: 32px 16px 22px;
  background: radial-gradient(120% 90% at 50% 0%, #2e1065 0%, #1c0d2e 48%, #0f061a 100%);
  color: var(--g-ink);
}

/* ── FON ── */
.fon { position: absolute; inset: 0; z-index: -1; overflow: hidden; pointer-events: none; }
.aur { position: absolute; border-radius: 50%; filter: blur(72px); opacity: .55; will-change: transform; }
.a1 { width: 46vmax; height: 46vmax; left: -12vmax; top: -16vmax;
      background: radial-gradient(circle at 40% 40%, #8b5cf6, transparent 68%);
      animation: suz1 26s ease-in-out infinite alternate; }
.a2 { width: 42vmax; height: 42vmax; right: -12vmax; bottom: -18vmax;
      background: radial-gradient(circle, #6d28d9, transparent 70%);
      animation: suz2 30s ease-in-out infinite alternate; }
.a3 { width: 26vmax; height: 26vmax; left: 50%; top: 36%; opacity: .32;
      background: radial-gradient(circle, #a78bfa, transparent 70%);
      animation: suz3 22s ease-in-out infinite alternate; }
@keyframes suz1 { to { transform: translate(8vmax, 6vmax) scale(1.08); } }
@keyframes suz2 { to { transform: translate(-7vmax, -5vmax) scale(1.12); } }
@keyframes suz3 { to { transform: translate(-14vmax, 5vmax) scale(.9); } }

.tor {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
  background-size: 56px 56px;
  -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 45%, #000 25%, transparent 75%);
          mask-image: radial-gradient(ellipse 70% 60% at 50% 45%, #000 25%, transparent 75%);
}
.don {
  position: absolute; inset: 0; opacity: .08; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
}

/* ── SHISHA PANEL ── */
.panel {
  --mx: 50%; --my: 0%;
  position: relative; overflow: hidden;
  width: 100%; max-width: 980px; min-height: 600px;
  display: grid; grid-template-columns: 1.08fr 1fr;
  border-radius: 28px;
  background: linear-gradient(145deg, rgba(255,255,255,.10) 0%, rgba(255,255,255,.04) 55%, rgba(255,255,255,.06) 100%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
          backdrop-filter: blur(28px) saturate(160%);
  box-shadow:
    0 40px 100px -30px rgba(8, 2, 15, .85),
    0 12px 32px -12px rgba(8, 2, 15, .6),
    inset 0 1px 0 rgba(255,255,255,.16);
  opacity: 0; transform: translateY(18px) scale(.985);
  transition: opacity .6s cubic-bezier(.2,.7,.2,1), transform .6s cubic-bezier(.2,.7,.2,1);
}
.panel--in { opacity: 1; transform: none; }
.panel--silkin { animation: silkin .55s cubic-bezier(.36,.07,.19,.97); }
@keyframes silkin {
  15% { transform: translateX(-9px); }  30% { transform: translateX(8px); }
  45% { transform: translateX(-6px); }  60% { transform: translateX(5px); }
  75% { transform: translateX(-2px); }  90% { transform: translateX(1px); }
}

/* Yorug'lik tushgan shisha qirrasi */
.panel::before {
  content: ''; position: absolute; inset: 0; z-index: 3; pointer-events: none;
  border-radius: inherit; padding: 1px;
  background: linear-gradient(150deg, rgba(255,255,255,.40), rgba(255,255,255,.07) 35%, rgba(255,255,255,.04) 65%, rgba(196,181,253,.38));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
          mask-composite: exclude;
}
/* Sichqoncha ortidan yuruvchi yaltirash */
.panel::after {
  content: ''; position: absolute; inset: 0; z-index: 0; pointer-events: none;
  opacity: 0; transition: opacity .4s;
  background: radial-gradient(520px circle at var(--mx) var(--my), rgba(196,181,253,.13), transparent 45%);
}
.panel:hover::after { opacity: 1; }

/* ── BREND ── */
.brand { display: flex; align-items: center; gap: 12px; }
/* Logo (components/SellzLogo.vue) o'z binafsha plitkasi bilan; yozuv logodagidek — keng harflar */
.brand-mark { border-radius: 11px; box-shadow: 0 10px 24px -8px rgba(124,58,237,.8); }
.brand-t { display: flex; flex-direction: column; }
.brand-t b { font-size: 17px; font-weight: 700; letter-spacing: .22em; margin-right: -.22em; text-transform: uppercase; line-height: 1.1; }
.brand-t small { margin-top: 4px; font-size: 10px; font-weight: 700; letter-spacing: .24em; text-transform: uppercase; color: #c4b5fd; }

/* ── CHAP QISM ── */
.intro {
  position: relative; z-index: 1; overflow: hidden;
  display: flex; flex-direction: column;
  padding: 44px 44px 40px;
  border-right: 1px solid rgba(255,255,255,.08);
  background: linear-gradient(160deg, rgba(139,92,246,.18), rgba(139,92,246,0) 62%);
}
.intro-pas { margin-top: auto; padding-top: 48px; position: relative; z-index: 1; }
.intro-h {
  font-size: 36px; line-height: 1.1; font-weight: 800; letter-spacing: -.028em;
  background: linear-gradient(180deg, #ffffff 35%, #ddd6fe);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.intro-p { margin-top: 14px; max-width: 410px; font-size: 14.5px; line-height: 1.6; color: var(--g-ink2); }

.modullar { margin-top: 28px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; list-style: none; padding: 0; }
.modul {
  display: flex; align-items: flex-start; gap: 11px;
  padding: 12px; border-radius: 14px;
  background: rgba(255,255,255,.045);
  border: 1px solid rgba(255,255,255,.085);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.05);
}
.panel--in .modul { animation: chiq .55s cubic-bezier(.2,.7,.2,1) both; animation-delay: calc(.25s + var(--i) * 70ms); }
@keyframes chiq { from { opacity: 0; transform: translateY(10px); } }
.modul-ik {
  width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0;
  display: grid; place-items: center; color: #ddd6fe;
  background: rgba(167,139,250,.18);
  box-shadow: inset 0 0 0 1px rgba(196,181,253,.2);
}
.modul-ik svg { width: 17px; height: 17px; }
.modul-t b { display: block; font-size: 13px; font-weight: 700; }
.modul-t span { display: block; margin-top: 2px; font-size: 11.5px; line-height: 1.4; color: var(--g-mut); }

.intro-belgi {
  position: absolute; right: -60px; top: -50px; width: 300px; height: 366px;
  color: rgba(255,255,255,.08); pointer-events: none;
}

/* ── O'NG QISM: FORMA ── */
.kirish {
  position: relative; z-index: 1;
  display: flex; flex-direction: column; justify-content: center;
  padding: 48px 46px 40px;
  background: rgba(15, 7, 26, .22);
}
.brand--mobil { display: none; margin-bottom: 30px; }

.k-h { font-size: 27px; font-weight: 800; letter-spacing: -.022em; line-height: 1.2; }
.k-p { margin-top: 6px; font-size: 14px; color: var(--g-ink2); }

.xato {
  display: flex; align-items: flex-start; gap: 10px;
  margin-top: 20px; padding: 11px 13px; border-radius: 12px;
  background: rgba(248,113,113,.12);
  border: 1px solid rgba(248,113,113,.32);
  color: #fecaca; font-size: 13px; line-height: 1.45;
}
.xato svg { width: 17px; height: 17px; flex-shrink: 0; margin-top: 1px; color: #f87171; }
.xato-enter-active, .xato-leave-active { transition: opacity .2s, transform .2s; }
.xato-enter-from, .xato-leave-to { opacity: 0; transform: translateY(-4px); }

.forma { margin-top: 24px; display: flex; flex-direction: column; gap: 16px; }
.maydon label { display: block; margin-bottom: 7px; font-size: 12.5px; font-weight: 600; color: rgba(245,243,255,.84); }

.kiritma {
  position: relative; display: flex; align-items: center;
  height: 50px; border-radius: 14px;
  background: var(--g-fill);
  border: 1px solid var(--g-line);
  box-shadow: inset 0 1px 2px rgba(0,0,0,.25);
  transition: border-color .18s, background-color .18s, box-shadow .18s;
}
.kiritma:hover { border-color: rgba(255,255,255,.2); }
.kiritma:focus-within {
  border-color: #a78bfa; background: rgba(255,255,255,.09);
  box-shadow: 0 0 0 4px rgba(167,139,250,.22), inset 0 1px 2px rgba(0,0,0,.2);
}
.kiritma--xato, .kiritma--xato:hover { border-color: rgba(248,113,113,.55); }
.kiritma--xato:focus-within { border-color: #f87171; box-shadow: 0 0 0 4px rgba(248,113,113,.18); }

.k-ik { position: absolute; left: 15px; width: 18px; height: 18px; color: rgba(237,233,254,.5); pointer-events: none; transition: color .18s; }
.kiritma:focus-within .k-ik { color: #ddd6fe; }

.inp {
  width: 100%; height: 100%;
  padding: 0 16px 0 45px;
  border: 0; outline: 0; border-radius: inherit;
  background: transparent; color: #fff; caret-color: #c4b5fd;
  font: inherit; font-size: 15px;
}
.inp--parol { padding-right: 54px; }
.inp::placeholder { color: rgba(237,233,254,.38); }
/* Brauzer autofill fonini shishaga moslash */
.inp:-webkit-autofill,
.inp:-webkit-autofill:hover,
.inp:-webkit-autofill:focus {
  -webkit-text-fill-color: #fff;
  caret-color: #c4b5fd;
  transition: background-color 600000s 0s, color 600000s 0s;
}

.koz {
  position: absolute; right: 6px;
  width: 38px; height: 38px; border-radius: 10px; border: 0;
  display: grid; place-items: center;
  background: transparent; color: rgba(237,233,254,.6); cursor: pointer;
  transition: color .15s, background-color .15s;
}
.koz:hover { color: #fff; background: rgba(255,255,255,.08); }
.koz:focus-visible { outline: 2px solid #c4b5fd; outline-offset: -2px; }
.koz svg { width: 19px; height: 19px; }

.caps { display: none; align-items: center; gap: 6px; margin-top: 8px; font-size: 12px; font-weight: 500; color: #fcd34d; }
.caps--on { display: flex; }
.caps svg { width: 14px; height: 14px; }

.tugma {
  position: relative; overflow: hidden;
  margin-top: 6px; height: 52px; border: 0; border-radius: 14px;
  display: flex; align-items: center; justify-content: center; gap: 9px;
  font: inherit; font-size: 15px; font-weight: 700; color: #fff; cursor: pointer;
  background: linear-gradient(180deg, #9e6df5 0%, #7c3aed 100%);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.28),
    inset 0 -1px 0 rgba(0,0,0,.15),
    0 10px 28px -8px rgba(139,92,246,.75);
  transition: transform .18s, box-shadow .18s, filter .18s;
}
.tugma::after {
  content: ''; position: absolute; top: 0; bottom: 0; left: -60%; width: 50%;
  transform: skewX(-20deg);
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.28), transparent);
  transition: left .7s cubic-bezier(.2,.7,.2,1);
}
.tugma:hover:not(:disabled) {
  transform: translateY(-1px); filter: brightness(1.06);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.28), inset 0 -1px 0 rgba(0,0,0,.15), 0 14px 34px -8px rgba(139,92,246,.9);
}
.tugma:hover:not(:disabled)::after { left: 120%; }
.tugma:active:not(:disabled) { transform: translateY(0); filter: brightness(.97); }
.tugma:focus-visible { outline: 2px solid #ddd6fe; outline-offset: 3px; }
.tugma:disabled { cursor: progress; filter: saturate(.85) brightness(.95); }
.tugma svg { width: 18px; height: 18px; transition: transform .18s; }
.tugma:hover:not(:disabled) svg { transform: translateX(3px); }

.aylana {
  width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0;
  border: 2px solid rgba(255,255,255,.3); border-top-color: #fff;
  animation: aylan .7s linear infinite;
}
@keyframes aylan { to { transform: rotate(360deg); } }

.eslatma {
  display: flex; align-items: flex-start; gap: 10px;
  margin-top: 24px; padding-top: 18px;
  border-top: 1px solid rgba(255,255,255,.08);
  font-size: 12.5px; line-height: 1.5; color: var(--g-mut);
}
.eslatma svg { width: 18px; height: 18px; flex-shrink: 0; color: #c4b5fd; }

/* ── FOOTER ── */
.lg-foot { display: flex; align-items: center; gap: 8px; font-size: 12px; color: rgba(237,233,254,.48); }
.lg-foot a {
  color: rgba(237,233,254,.7);
  text-decoration: underline; text-underline-offset: 3px; text-decoration-color: rgba(237,233,254,.25);
  transition: color .15s;
}
.lg-foot a:hover { color: #fff; }

/* ── MOSLASHUV ── */
@media (max-width: 1000px) {
  .intro { padding: 40px 34px 34px; }
  .kirish { padding: 44px 36px 36px; }
  .intro-h { font-size: 31px; }
}
@media (max-width: 860px) {
  .panel { grid-template-columns: 1fr; max-width: 440px; min-height: 0; border-radius: 24px; }
  .intro { display: none; }
  .kirish { padding: 34px 28px 28px; background: rgba(15,7,26,.16); }
  .brand--mobil { display: flex; }
  .inp { font-size: 16px; } /* iOS fokusda kattalashtirmasin */
}
@media (max-width: 420px) {
  .lg { padding-top: 20px; }
  .kirish { padding: 28px 20px 24px; }
  .k-h { font-size: 24px; }
}

/* backdrop-filter yo'q brauzerlarda shisha o'rniga to'q panel */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .panel { background: rgba(38, 21, 60, .94); }
}

@media (prefers-reduced-motion: reduce) {
  .aur { animation: none; }
  .panel { transition: opacity .2s; transform: none; }
  .panel--silkin, .panel--in .modul { animation: none; }
  .tugma::after { display: none; }
}
</style>
